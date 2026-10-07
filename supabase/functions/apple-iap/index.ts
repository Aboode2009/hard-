// apple-iap: the iOS app reports App Store purchases here right after buying,
// on restore, and again later for any it couldn't deliver (offline).
//
// POST { transactions: string[] }   — StoreKit 2 jwsRepresentation values
// Authorization: Bearer <Supabase session>
//
// Each transaction is verified against Apple's signature, checked to be ours
// (bundle ID) and for this account, then applied by apple_apply_transaction,
// which is idempotent — reporting the same purchase twice grants it once.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { AppleJwsError, BUNDLE_ID, applyArgs, verifyAppleJws, type AppleTransaction } from "../_shared/apple-jws.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !auth?.user) return json({ error: "unauthorized" }, 401);
  const userId = auth.user.id;

  let body: { transactions?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const list = Array.isArray(body.transactions) ? body.transactions.slice(0, 50) : [];
  if (list.length === 0) return json({ error: "no_transactions" }, 400);

  const results: { transactionId?: string; productId?: string; result: string }[] = [];
  for (const jws of list) {
    try {
      const t = await verifyAppleJws<AppleTransaction>(String(jws));
      if (t.bundleId !== BUNDLE_ID) {
        results.push({ transactionId: t.transactionId, result: "wrong_app" });
        continue;
      }
      // The app passes the account's id as appAccountToken when it is a UUID;
      // a purchase made for another account is not this one's to claim.
      if (t.appAccountToken && UUID.test(userId) && t.appAccountToken.toLowerCase() !== userId.toLowerCase()) {
        results.push({ transactionId: t.transactionId, productId: t.productId, result: "other_account" });
        continue;
      }
      const { data, error } = await admin.rpc("apple_apply_transaction", applyArgs(userId, t));
      if (error) throw error;
      results.push({ transactionId: String(t.transactionId), productId: t.productId, result: String(data) });
    } catch (err) {
      console.error("apple-iap:", err);
      results.push({ result: err instanceof AppleJwsError ? "invalid" : "error" });
    }
  }
  return json({ results });
});

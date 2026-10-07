// apple-iap-notify: App Store Server Notifications V2.
// Set this URL in App Store Connect → App Information → App Store Server
// Notifications (both Production and Sandbox):
//   https://<project>.supabase.co/functions/v1/apple-iap-notify
//
// Apple POSTs { signedPayload } for renewals, refunds, revocations, expiries.
// verify_jwt is off because Apple isn't a Supabase user — the payload's Apple
// signature is what's checked instead.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { BUNDLE_ID, applyArgs, verifyAppleJws, type AppleTransaction } from "../_shared/apple-jws.ts";

interface Notification {
  notificationType: string;
  subtype?: string;
  data?: { bundleId?: string; signedTransactionInfo?: string };
}

/** Types after which the transaction no longer entitles its owner. */
const REVOKING = new Set(["REFUND", "REVOKE"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  let note: Notification;
  try {
    const { signedPayload } = await req.json();
    note = await verifyAppleJws<Notification>(signedPayload);
  } catch (err) {
    console.error("apple-iap-notify: rejected payload:", err);
    return new Response("invalid", { status: 400 });
  }

  if (note.notificationType === "TEST") return new Response("ok");
  if (note.data?.bundleId !== BUNDLE_ID || !note.data.signedTransactionInfo) {
    return new Response("ignored");
  }

  let t: AppleTransaction;
  try {
    t = await verifyAppleJws<AppleTransaction>(note.data.signedTransactionInfo);
  } catch (err) {
    console.error("apple-iap-notify: bad transaction:", err);
    return new Response("invalid", { status: 400 });
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Whose purchase is it? Known once the app has reported it; otherwise the
  // account id the app passed to StoreKit as appAccountToken.
  const { data: owner } = await admin
    .from("apple_owners")
    .select("user_id")
    .eq("original_transaction_id", String(t.originalTransactionId))
    .maybeSingle();
  let userId = owner?.user_id as string | undefined;
  if (!userId && t.appAccountToken && UUID.test(t.appAccountToken)) {
    const { data: profile } = await admin.from("profiles").select("id").eq("id", t.appAccountToken).maybeSingle();
    userId = profile?.id;
  }
  // Unknown owner: the app will report this purchase itself on next launch.
  if (!userId) return new Response("no owner yet");

  const { data, error } = await admin.rpc(
    "apple_apply_transaction",
    applyArgs(userId, t, REVOKING.has(note.notificationType)),
  );
  if (error) {
    console.error("apple-iap-notify: apply failed:", error);
    // A 5xx makes Apple retry the notification later.
    return new Response("error", { status: 500 });
  }
  console.log(`apple-iap-notify: ${note.notificationType}/${note.subtype ?? "-"} ${t.productId} → ${data}`);
  return new Response("ok");
});

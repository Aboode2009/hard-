import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE, type Product } from "@capgo/native-purchases";
import { supabase } from "@/integrations/supabase/client";

/**
 * App Store in-app purchases — the iOS app's only way to sell. Android keeps
 * WAYL (lib/premium.ts); Apple's rules (guideline 3.1.1) don't allow it here.
 *
 * Flow: StoreKit sells, the plugin hands back the transaction as a JWS signed
 * by Apple, and the `apple-iap` Edge Function verifies it and grants the
 * purchase. Nothing here grants anything itself.
 *
 * StoreKit has already taken the money by the time we report the purchase, so
 * no report may be lost: each JWS is queued on the device first and only
 * dropped once the server has given a final answer for it. The queue is
 * retried on every launch and resume (EntitlementsRefresher).
 *
 * The products must exist in App Store Connect with exactly these IDs.
 */

export const isAppleStore = Capacitor.getPlatform() === "ios";

export const APPLE_PRODUCT = {
  premium: "com.hardchallenge.app.premium.monthly",
  lifetime: "com.hardchallenge.app.premium.lifetime",
  /** Keyed by the number of 100-point packs the UI offers (PointPacks). */
  coins: {
    1: "com.hardchallenge.app.gems.100",
    5: "com.hardchallenge.app.gems.500",
    10: "com.hardchallenge.app.gems.1000",
  } as Record<number, string>,
} as const;

const ALL_PRODUCT_IDS = [
  APPLE_PRODUCT.premium,
  APPLE_PRODUCT.lifetime,
  ...Object.values(APPLE_PRODUCT.coins),
];

export type AppleKind = "premium" | "lifetime" | "coins";

export function appleProductId(kind: AppleKind, packs?: number): string | undefined {
  if (kind === "coins") return packs ? APPLE_PRODUCT.coins[packs] : undefined;
  return APPLE_PRODUCT[kind];
}

/** Why an App Store purchase didn't complete. */
export type AppleFailure = "cancelled" | "pending" | "unavailable" | "other_account" | "undelivered" | "store";

export class ApplePurchaseError extends Error {
  constructor(
    public reason: AppleFailure,
    message: string,
  ) {
    super(message);
    this.name = "ApplePurchaseError";
  }
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

let productsCache: Promise<Record<string, Product>> | null = null;

/**
 * The App Store's own products, with prices in the buyer's currency. The UI
 * must show these, not the dinar prices WAYL charges.
 */
export function loadAppleProducts(): Promise<Record<string, Product>> {
  if (!isAppleStore) return Promise.resolve({});
  if (!productsCache) {
    productsCache = NativePurchases.getProducts({ productIdentifiers: ALL_PRODUCT_IDS })
      .then(({ products }) => Object.fromEntries(products.map((p) => [p.identifier, p])))
      .catch((err) => {
        console.warn("[iap] loading products failed:", err);
        productsCache = null; // try again next time
        return {};
      });
  }
  return productsCache;
}

// ---------------------------------------------------------------------------
// Delivery queue
// ---------------------------------------------------------------------------

const QUEUE_KEY = "apple-iap-undelivered";

const readQueue = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};
const writeQueue = (list: string[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* storage full or blocked: delivery still runs from memory this time */
  }
};
const enqueue = (jws: string[]) => writeQueue([...new Set([...readQueue(), ...jws])]);

/** Server answers that are final; anything else ("error", no answer) is retried. */
const FINAL = new Set(["granted", "duplicate", "revoked", "other_account", "unknown_product", "wrong_app", "invalid"]);

export interface DeliveryResult {
  jws: string;
  productId?: string;
  result: string;
}

let delivering: Promise<DeliveryResult[]> | null = null;

/**
 * Sends every queued purchase to the server and drops the ones it settled.
 * Concurrent callers share one request.
 */
export function deliverAppleTransactions(): Promise<DeliveryResult[]> {
  if (!isAppleStore) return Promise.resolve([]);
  if (delivering) return delivering;

  delivering = (async () => {
    const queue = readQueue();
    if (queue.length === 0) return [];
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return []; // delivered after the next sign-in

    const { data, error } = await supabase.functions.invoke<{
      results: { productId?: string; result: string }[];
    }>("apple-iap", { body: { transactions: queue } });
    if (error || !data?.results) {
      console.warn("[iap] delivery failed, will retry:", error);
      return [];
    }

    const results = queue.map((jws, i) => ({ jws, ...(data.results[i] ?? { result: "error" }) }));
    const settled = new Set(results.filter((r) => FINAL.has(r.result)).map((r) => r.jws));
    writeQueue(readQueue().filter((jws) => !settled.has(jws)));
    return results;
  })().finally(() => {
    delivering = null;
  });

  return delivering;
}

// ---------------------------------------------------------------------------
// Buying
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shows Apple's purchase sheet and waits until the server has granted the
 * purchase. Resolves with the server's result ("granted" or "duplicate");
 * throws ApplePurchaseError otherwise.
 */
export async function buyWithApple(kind: AppleKind, packs?: number): Promise<string> {
  const productId = appleProductId(kind, packs);
  if (!productId) throw new ApplePurchaseError("unavailable", `No App Store product for ${kind}/${packs}`);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ApplePurchaseError("store", "Not signed in");

  let jws: string | undefined;
  try {
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
      productType: kind === "premium" ? PURCHASE_TYPE.SUBS : PURCHASE_TYPE.INAPP,
      // Ties the purchase to this account inside Apple's own records, so a
      // renewal notification can find its owner (apple-iap-notify).
      ...(UUID.test(session.user.id) ? { appAccountToken: session.user.id } : {}),
    });
    jws = transaction.jwsRepresentation;
  } catch (err) {
    const raw = String((err as Error)?.message ?? err);
    console.warn("[iap] purchase did not complete:", raw);
    if (/cancel/i.test(raw)) throw new ApplePurchaseError("cancelled", raw);
    if (/pending|deferred|approval/i.test(raw)) throw new ApplePurchaseError("pending", raw);
    if (/not found|invalid product|unavailable/i.test(raw)) throw new ApplePurchaseError("unavailable", raw);
    throw new ApplePurchaseError("store", raw);
  }
  if (!jws) throw new ApplePurchaseError("store", "StoreKit returned no signed transaction");

  enqueue([jws]);
  const results = await deliverAppleTransactions();
  const mine = results.find((r) => r.jws === jws);
  if (mine?.result === "granted" || mine?.result === "duplicate") return mine.result;
  if (mine?.result === "other_account") {
    throw new ApplePurchaseError("other_account", "This App Store purchase belongs to another account");
  }
  // Paid but not confirmed yet (offline, server hiccup): it stays queued and
  // is delivered on the next launch or resume.
  throw new ApplePurchaseError("undelivered", mine?.result ?? "no answer");
}

/**
 * "Restore purchases" — required by App Review for subscriptions and the
 * lifetime unlock. Re-sends everything this Apple ID owns to the server.
 * Resolves with how many purchases the server newly granted.
 */
export async function restoreApplePurchases(): Promise<number> {
  await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases();
  const jws = purchases.map((p) => p.jwsRepresentation).filter((x): x is string => !!x);
  if (jws.length === 0) return 0;
  enqueue(jws);
  const results = await deliverAppleTransactions();
  return results.filter((r) => r.result === "granted").length;
}

/** Opens the App Store's own page for managing (or cancelling) the subscription. */
export function manageAppleSubscription(): Promise<void> {
  return NativePurchases.manageSubscriptions();
}

/**
 * Renewals and purchases that finish while the app runs (Ask to Buy approved
 * later, a purchase interrupted by a crash) arrive here. Returns a cleanup.
 */
export function listenForAppleTransactions(onDelivered: (results: DeliveryResult[]) => void): () => void {
  if (!isAppleStore) return () => {};
  const handle = NativePurchases.addListener("transactionUpdated", (t) => {
    if (!t.jwsRepresentation) return;
    enqueue([t.jwsRepresentation]);
    void deliverAppleTransactions().then(onDelivered);
  });
  return () => void handle.then((h) => h.remove());
}

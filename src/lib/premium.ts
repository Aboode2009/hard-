import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { invalidateProgress } from "@/lib/query-client";
import { supabase } from "@/integrations/supabase/client";
import { ApplePurchaseError, buyWithApple, isAppleStore } from "@/lib/apple-iap";

/**
 * Premium subscription, balance, and checkout: WAYL on Android and the web,
 * App Store in-app purchase on iOS (lib/apple-iap.ts).
 *
 * Every entitlement decision is the server's: this module only *reads*
 * `is_premium_active` / `can_advance_to_next_path` / the point balance, and
 * hands the user off to a payment page. Activation happens in the WAYL
 * webhook — nothing here ever grants premium or credit.
 *
 * There is exactly ONE currency in the app: `challenge_progress.total_points`.
 * (An earlier `profiles.coins` column was a mistake, has been dropped from the
 * database, and every read of it is gone from the client.)
 */

/** Checkout kinds accepted by the create-payment Edge Function. */
export type PaymentKind = "premium" | "lifetime" | "coins";

/**
 * One pack = 100 points for 1000 IQD. Display only — the server prices the
 * order and credits `total_points` from the webhook.
 */
export const UNITS_PER_PACK = 100;
export const IQD_PER_PACK = 1000;

/** Monthly subscription price in Iraqi dinars. Display only. */
export const PREMIUM_PRICE_IQD = 5000;

/** One-time lifetime price in Iraqi dinars. Display only. */
export const LIFETIME_PRICE_IQD = 20000;

/**
 * Derived from VITE_SUPABASE_URL so dev/staging/prod each hit their own
 * function rather than a hardcoded project ref.
 */
const CREATE_PAYMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`;

// ---------------------------------------------------------------------------
// Cached premium flag
// ---------------------------------------------------------------------------

/**
 * Ad code checks premium before every single ad, so the result is cached to
 * keep that off the network. The TTL is short and `refreshPremium()` clears it
 * outright whenever the user returns from checkout.
 */
const CACHE_TTL_MS = 60_000;

let cache: { value: boolean; at: number } | null = null;
let inFlight: Promise<boolean> | null = null;

const listeners = new Set<(isPremium: boolean) => void>();

/** Subscribe to premium changes. Returns an unsubscribe function. */
export function onPremiumChange(cb: (isPremium: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const setCache = (value: boolean) => {
  const changed = cache?.value !== value;
  cache = { value, at: Date.now() };
  if (changed) listeners.forEach((cb) => cb(value));
};

/**
 * Whether the current user has an active subscription.
 *
 * Fails closed (`false`) on any error: a failed check must never hand out
 * premium, and for ads it simply means the user sees an ad as before.
 */
export async function isPremiumActive(): Promise<boolean> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc("is_premium_active");
      if (error) throw error;
      const value = data === true;
      setCache(value);
      return value;
    } catch (err) {
      console.warn("is_premium_active failed; treating as not premium:", err);
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Drop the cache and re-read. Call after the user returns from checkout. */
export async function refreshPremium(): Promise<boolean> {
  cache = null;
  return isPremiumActive();
}

/**
 * Last known premium value without touching the network — `null` when nothing
 * has been read yet. Used for first paint so gated UI doesn't flash.
 */
export function peekPremium(): boolean | null {
  return cache?.value ?? null;
}

// ---------------------------------------------------------------------------
// Subscription details (lifetime / expiry)
// ---------------------------------------------------------------------------

/**
 * What kind of subscription the user has, for display only — access checks
 * still go through `is_premium_active`.
 *
 * A lifetime subscriber has `is_lifetime = true` and `premium_until = NULL`,
 * so the expiry must never be formatted without checking `isLifetime` first:
 * `new Date(null)` is the epoch and `new Date(undefined)` is Invalid Date.
 */
export interface SubscriptionDetails {
  isLifetime: boolean;
  /** ISO timestamp of a monthly subscription's end; null for lifetime or none. */
  premiumUntil: string | null;
}

const NO_SUBSCRIPTION: SubscriptionDetails = { isLifetime: false, premiumUntil: null };

let detailsCache: SubscriptionDetails | null = null;
const detailsListeners = new Set<(details: SubscriptionDetails) => void>();

/** Subscribe to subscription-detail changes. Returns an unsubscribe function. */
export function onSubscriptionDetailsChange(
  cb: (details: SubscriptionDetails) => void,
): () => void {
  detailsListeners.add(cb);
  return () => detailsListeners.delete(cb);
}

/** Last known details without touching the network; `null` before first read. */
export function peekSubscriptionDetails(): SubscriptionDetails | null {
  return detailsCache;
}

/**
 * Reads `is_lifetime` and `premium_until` from the user's own profile row.
 *
 * On any error this reports "no lifetime, no date": the worst case is that a
 * lifetime subscriber briefly sees the plain "active" state, never a wrong
 * date and never a purchase button that the server would refuse anyway.
 */
export async function fetchSubscriptionDetails(): Promise<SubscriptionDetails> {
  let details = NO_SUBSCRIPTION;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_lifetime, premium_until")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      const isLifetime = data?.is_lifetime === true;
      details = {
        isLifetime,
        premiumUntil: isLifetime ? null : (data?.premium_until ?? null),
      };
    }
  } catch (err) {
    console.warn("Reading subscription details failed:", err);
    return detailsCache ?? NO_SUBSCRIPTION;
  }

  const changed =
    detailsCache?.isLifetime !== details.isLifetime ||
    detailsCache?.premiumUntil !== details.premiumUntil;
  detailsCache = details;
  if (changed) detailsListeners.forEach((cb) => cb(details));
  return details;
}

/**
 * The text to show wherever a subscription's end date appears.
 *
 * Lifetime → "مدى الحياة". A monthly subscription → its localized date. No
 * date, or one that doesn't parse → null, so callers show nothing rather
 * than "Invalid Date" or 1970.
 */
export function formatPremiumExpiry(
  details: SubscriptionDetails,
  lang: string,
  lifetimeLabel: string,
): string | null {
  if (details.isLifetime) return lifetimeLabel;
  if (!details.premiumUntil) return null;
  const date = new Date(details.premiumUntil);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(lang.startsWith("ar") ? "ar-IQ-u-nu-latn" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Whether the user may move past the current path. The first path is free;
 * anything beyond it needs a subscription. Fails closed.
 */
export async function canAdvanceToNextPath(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("can_advance_to_next_path");
    if (error) throw error;
    return data === true;
  } catch (err) {
    console.warn("can_advance_to_next_path failed; blocking advance:", err);
    return false;
  }
}

let balanceCache: number | null = null;
let balanceInFlight: Promise<number> | null = null;
const balanceListeners = new Set<(points: number) => void>();

/** Subscribe to balance changes. Returns an unsubscribe function. */
export function onBalanceChange(cb: (points: number) => void): () => void {
  balanceListeners.add(cb);
  return () => balanceListeners.delete(cb);
}

/** Last known balance without touching the network; `null` before first read. */
export function peekBalance(): number | null {
  return balanceCache;
}

/**
 * The user's point balance — the app's single currency.
 *
 * Concurrent callers share one request: a page and its rewarded-ad hook can
 * both ask at once, and this would otherwise fire the same query twice.
 */
export async function fetchBalance(): Promise<number> {
  if (balanceInFlight) return balanceInFlight;

  balanceInFlight = (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await supabase
        .from("challenge_progress")
        .select("total_points")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      const points = data?.total_points ?? 0;

      if (balanceCache !== points) {
        const hadBalance = balanceCache !== null;
        balanceCache = points;
        balanceListeners.forEach((cb) => cb(points));
        // A purchase credited server-side changes the progress row too. The
        // very first read is not a change, so it leaves the cache alone.
        if (hadBalance) invalidateProgress();
      }
      return points;
    } catch (err) {
      console.warn("Reading the point balance failed:", err);
      return balanceCache ?? 0;
    } finally {
      balanceInFlight = null;
    }
  })();

  return balanceInFlight;
}

/**
 * Re-read everything a purchase could have changed. Called when the user
 * returns from the WAYL page — the webhook has (probably) already run, so this
 * is what makes the new subscription or credit show up in the UI.
 */
export async function refreshEntitlements(): Promise<void> {
  await Promise.all([refreshPremium(), fetchBalance(), fetchSubscriptionDetails()]);
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/**
 * Why a checkout attempt failed, so callers can show the right Arabic text.
 * `already_lifetime` is the server's 409 for a lifetime purchase by someone
 * who already has one.
 */
export type CheckoutErrorReason =
  | "auth"
  | "network"
  | "server"
  | "launch"
  | "already_lifetime"
  // App Store only:
  | "cancelled" // the user closed Apple's sheet
  | "pending" // waiting for approval (Ask to Buy)
  | "unavailable" // product missing in App Store Connect
  | "other_account" // this Apple purchase is tied to another Hard 21 account
  | "undelivered"; // paid, but the server hasn't confirmed yet — retried automatically

export class CheckoutError extends Error {
  constructor(
    public reason: CheckoutErrorReason,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

/**
 * Ask the Edge Function for a WAYL checkout URL and open it.
 *
 * On the phone it opens in an in-app browser (a Custom Tab) over the app, and
 * the app watches for the purchase to land (`watchCheckout`): the moment the
 * WAYL webhook has activated it, the tab closes itself and the user is back
 * in the app with a confirmation. It used to open the system browser, where
 * WAYL then redirected to its default page and left people stranded there.
 *
 * On the web the popup is claimed synchronously, before any `await`: browsers
 * block `window.open` once a promise has resolved in between. So callers MUST
 * invoke this directly from a click handler with nothing awaited first.
 *
 * Throws `CheckoutError` so the caller can show a specific message and a
 * retry button. Never grants anything — the webhook activates the purchase.
 */
export async function startCheckout(kind: PaymentKind, packs?: number): Promise<void> {
  if (isAppleStore) return startAppleCheckout(kind, packs);

  const native = Capacitor.isNativePlatform();

  // Claim the popup while still inside the user gesture.
  const popup = native ? null : window.open("", "_blank");

  try {
    let token: string | null | undefined;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
    } catch (err) {
      throw new CheckoutError("auth", `Could not read the Supabase session: ${err}`);
    }
    if (!token) throw new CheckoutError("auth", "No Supabase session token");

    // "premium" is the monthly plan; "lifetime" is the one-time purchase.
    const body: { kind: PaymentKind; packs?: number } = { kind };
    if (kind === "coins") body.packs = packs;

    let res: Response;
    try {
      res = await fetch(CREATE_PAYMENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new CheckoutError("network", `create-payment unreachable: ${err}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 409 && text.includes("already_lifetime")) {
        throw new CheckoutError("already_lifetime", "create-payment: already_lifetime");
      }
      throw new CheckoutError("server", `create-payment returned ${res.status}: ${text}`);
    }

    let url: string | undefined;
    try {
      ({ url } = (await res.json()) as { url?: string });
    } catch (err) {
      throw new CheckoutError("server", `create-payment sent invalid JSON: ${err}`);
    }
    if (!url) throw new CheckoutError("server", "create-payment returned no url");

    if (native) {
      // What the account looks like before paying, to recognise the purchase.
      const before = await readEntitlements();
      try {
        await Browser.open({ url, toolbarColor: "#1CB0F6" });
      } catch (err) {
        throw new CheckoutError("launch", `The in-app browser did not open: ${err}`);
      }
      watchCheckout(kind, before);
    } else if (popup && !popup.closed) {
      popup.location.href = url;
    } else {
      // Popup blocked — a same-tab redirect always works, and WAYL sends the
      // user back here when they are done.
      window.location.href = url;
    }
  } catch (err) {
    popup?.close();
    if (err instanceof CheckoutError) throw err;
    throw new CheckoutError("server", String(err));
  }
}

/**
 * iOS: Apple's own purchase sheet. By the time it resolves the server has
 * already verified and granted the purchase, so the UI just re-reads.
 */
async function startAppleCheckout(kind: PaymentKind, packs?: number): Promise<void> {
  const before = kind === "coins" ? await fetchBalance() : 0;
  try {
    await buyWithApple(kind, packs);
  } catch (err) {
    if (err instanceof ApplePurchaseError) {
      // A StoreKit failure reads to the user like any other checkout failure.
      throw new CheckoutError(err.reason === "store" ? "server" : err.reason, err.message);
    }
    throw new CheckoutError("server", String(err));
  }
  await refreshEntitlements();
  invalidateProgress();
  const confirmation: PaymentConfirmation = { kind };
  if (kind === "coins") confirmation.points = Math.max(0, (peekBalance() ?? before) - before);
  paymentListeners.forEach((cb) => cb(confirmation));
}

// ---------------------------------------------------------------------------
// Coming back from the payment page
// ---------------------------------------------------------------------------

interface EntitlementSnapshot {
  premium: boolean;
  isLifetime: boolean;
  premiumUntil: string | null;
  balance: number;
}

async function readEntitlements(): Promise<EntitlementSnapshot> {
  const [premium, balance, details] = await Promise.all([
    refreshPremium(),
    fetchBalance(),
    fetchSubscriptionDetails(),
  ]);
  return { premium, balance, isLifetime: details.isLifetime, premiumUntil: details.premiumUntil };
}

export interface PaymentConfirmation {
  kind: PaymentKind;
  /** Points credited, for a points pack. */
  points?: number;
}

const paymentListeners = new Set<(p: PaymentConfirmation) => void>();

/** Called once per purchase the moment the server has activated it. */
export function onPaymentConfirmed(cb: (p: PaymentConfirmation) => void): () => void {
  paymentListeners.add(cb);
  return () => paymentListeners.delete(cb);
}

/** How often to look, how long while the page is open, and how long after it is closed. */
const WATCH_EVERY_MS = 3_000;
const WATCH_OPEN_MS = 15 * 60_000;
const WATCH_AFTER_CLOSE_MS = 60_000;

let stopActiveWatch: (() => void) | null = null;

/**
 * Polls the account while the WAYL page is open. The webhook — not this app —
 * activates the purchase, usually seconds after the user pays; when it shows
 * up here the in-app browser is closed and listeners are told. Closing the
 * page early keeps the watch going for a minute, for a webhook that lands
 * just after.
 */
function watchCheckout(kind: PaymentKind, before: EntitlementSnapshot) {
  stopActiveWatch?.();

  let stopped = false;
  let checking = false;
  let deadline = Date.now() + WATCH_OPEN_MS;

  const landed = (now: EntitlementSnapshot) =>
    kind === "coins"
      ? now.balance > before.balance
      : (now.isLifetime && !before.isLifetime) ||
        (now.premium && !before.premium) ||
        (now.premiumUntil !== null && now.premiumUntil !== before.premiumUntil);

  const check = async () => {
    if (stopped || checking) return;
    checking = true;
    try {
      const now = await readEntitlements();
      if (stopped) return;
      if (landed(now)) {
        stop();
        void Browser.close().catch(() => undefined);
        const confirmation: PaymentConfirmation = { kind };
        if (kind === "coins") confirmation.points = now.balance - before.balance;
        paymentListeners.forEach((cb) => cb(confirmation));
      } else if (Date.now() > deadline) {
        stop();
      }
    } finally {
      checking = false;
    }
  };

  const timer = setInterval(() => void check(), WATCH_EVERY_MS);
  const finished = Browser.addListener("browserFinished", () => {
    deadline = Math.min(deadline, Date.now() + WATCH_AFTER_CLOSE_MS);
    void check();
  });

  const stop = () => {
    stopped = true;
    clearInterval(timer);
    void finished.then((h) => h.remove());
    if (stopActiveWatch === stop) stopActiveWatch = null;
  };
  stopActiveWatch = stop;
}

/**
 * True when the server refused a write because the user is not a subscriber.
 * Adding tasks raises `premium_required` from a trigger on custom_tasks
 * (migration 20261004140000_custom_tasks_premium_only).
 */
export function isPremiumRequiredError(err: unknown): boolean {
  const message = (err as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.includes("premium_required");
}

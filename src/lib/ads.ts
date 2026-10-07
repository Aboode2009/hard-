import { Capacitor } from "@capacitor/core";
import {
  AdMob,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from "@capacitor-community/admob";
import { ADS_ENABLED, AD_IDS, INTERSTITIAL_MIN_GAP_MS } from "@/config/ads";
import { isPremiumActive } from "@/lib/premium";

/**
 * AdMob wrapper. Every export is a safe no-op on the web (the plugin has no
 * browser implementation), so local development never breaks and the UI can
 * simply hide ad buttons via `adsAvailable`.
 *
 * Design rules, all of them load-bearing for app responsiveness:
 *
 * 1. Ads are ALWAYS preloaded in the background and only ever *shown* from a
 *    ready state. Nothing calls prepare-then-show back to back, because
 *    preparing fetches an ad over the network and that delay used to land
 *    right where the user expected the UI to respond.
 * 2. Showing is fire-and-forget for callers: `showInterstitial()` returns
 *    immediately when no ad is ready instead of waiting for one.
 * 3. Every plugin call is wrapped in try/catch *and* a timeout, so a hung
 *    native promise can never leave the UI stuck.
 *
 * Nothing here ever grants points: rewarded ads only report that the user
 * genuinely earned the reward, and the caller asks the server to grant it.
 *
 * Premium subscribers never see an ad. The check lives here rather than at the
 * call sites so every placement — including any added later — is covered.
 */

/**
 * The one gate every export below checks first.
 *
 * With ADS_ENABLED false this is false everywhere, so `initAds`,
 * `preloadInterstitial`, `preloadRewarded`, `showInterstitial`,
 * `showRewardedAd` and `warmUpAds` all return immediately — no SDK init, no
 * network, no native call, and no waiting. The UI reads the same flag to hide
 * its ad buttons, so a disabled ad leaves no trace on screen.
 */
export const adsAvailable = ADS_ENABLED && Capacitor.isNativePlatform();

const isIOS = Capacitor.getPlatform() === "ios";
const interstitialId = isIOS ? AD_IDS.iosInterstitial : AD_IDS.androidInterstitial;
const rewardedId = isIOS ? AD_IDS.iosRewarded : AD_IDS.androidRewarded;

/** Nothing from the plugin is trusted to settle; this bounds every call. */
const CALL_TIMEOUT_MS = 15_000;

/** Wait this long at most for a rewarded ad the user explicitly asked for. */
const REWARDED_WAIT_MS = 8_000;

type LoadState = "idle" | "loading" | "ready";

let initialized = false;
let initPromise: Promise<void> | null = null;
let listenersAttached = false;

// Explicitly widened: AdMob's event listeners write these from outside the
// functions that read them, so TypeScript's control-flow narrowing would
// otherwise decide a "ready" check can never be true and flag it as dead.
let interstitialState = "idle" as LoadState;
let rewardedState = "idle" as LoadState;

/** Shared across both interstitial placements so they cannot stack up. */
let lastInterstitialAt = 0;

/** Rejects rather than hanging forever if a native call never settles. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Attach the lifecycle listeners that drive the preload state machine.
 * Load failures are logged and reset state — they never surface to the user.
 */
async function attachListeners(): Promise<void> {
  if (listenersAttached) return;
  listenersAttached = true;

  try {
    await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
      interstitialState = "ready";
    });
    await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (e) => {
      console.warn("Interstitial failed to load:", e);
      interstitialState = "idle";
    });
    await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (e) => {
      console.warn("Interstitial failed to show:", e);
      interstitialState = "idle";
      void preloadInterstitial();
    });
    await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      // One prepared ad can only be shown once — line up the next one.
      interstitialState = "idle";
      void preloadInterstitial();
    });

    await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
      rewardedState = "ready";
    });
    await AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (e) => {
      console.warn("Rewarded failed to load:", e);
      rewardedState = "idle";
    });
    await AdMob.addListener(RewardAdPluginEvents.FailedToShow, (e) => {
      console.warn("Rewarded failed to show:", e);
      rewardedState = "idle";
    });
    await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      rewardedState = "idle";
    });
  } catch (err) {
    console.warn("Could not attach AdMob listeners:", err);
  }
}

/** Initialize the SDK once. Safe to call repeatedly and on the web. */
export async function initAds(): Promise<void> {
  if (!adsAvailable || initialized) return;
  if (initPromise) return initPromise;

  initPromise = withTimeout(
    AdMob.initialize({
      // Test ads are selected by the sample ad unit IDs in config/ads.ts;
      // this list additionally marks THIS device as a test device.
      initializeForTesting: false,
    }),
    CALL_TIMEOUT_MS,
    "AdMob.initialize",
  )
    .then(async () => {
      initialized = true;
      await attachListeners();
    })
    .catch((err) => {
      console.warn("AdMob init failed; ads disabled this session:", err);
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

/**
 * Fetch an interstitial in the background so a later `showInterstitial()` is
 * instant. Never throws and never blocks anything the user is doing.
 */
export async function preloadInterstitial(): Promise<void> {
  if (!adsAvailable || interstitialState !== "idle") return;
  if (await isPremiumActive()) return;

  interstitialState = "loading";
  try {
    await initAds();
    if (!initialized) {
      interstitialState = "idle";
      return;
    }
    await withTimeout(
      AdMob.prepareInterstitial({ adId: interstitialId }),
      CALL_TIMEOUT_MS,
      "prepareInterstitial",
    );
    // The Loaded listener flips this to "ready"; set it here too in case the
    // event fired before the listener was attached.
    if (interstitialState === "loading") interstitialState = "ready";
  } catch (err) {
    console.warn("Interstitial preload failed:", err);
    interstitialState = "idle";
  }
}

/** Preload a rewarded ad in the background. Never throws. */
export async function preloadRewarded(): Promise<void> {
  if (!adsAvailable || rewardedState !== "idle") return;
  if (await isPremiumActive()) return;

  rewardedState = "loading";
  try {
    await initAds();
    if (!initialized) {
      rewardedState = "idle";
      return;
    }
    await withTimeout(
      AdMob.prepareRewardVideoAd({ adId: rewardedId }),
      CALL_TIMEOUT_MS,
      "prepareRewardVideoAd",
    );
    if (rewardedState === "loading") rewardedState = "ready";
  } catch (err) {
    console.warn("Rewarded preload failed:", err);
    rewardedState = "idle";
  }
}

/**
 * Show an interstitial **only if one is already loaded**.
 *
 * Returns immediately (false) when nothing is ready, kicking off a preload for
 * next time — so a placement never waits on the network and never delays the
 * screen it fired from. Resolves true once the ad has been dismissed.
 */
export async function showInterstitial(): Promise<boolean> {
  if (!adsAvailable) return false;

  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return false;

  // Ad-free is the headline benefit of a subscription.
  if (await isPremiumActive()) return false;

  if (interstitialState !== "ready") {
    // Nothing to show right now — warm one up for the next opportunity and
    // let the caller carry on immediately.
    void preloadInterstitial();
    return false;
  }

  // Claim the cooldown before showing so two rapid calls cannot both pass.
  lastInterstitialAt = Date.now();

  try {
    await withTimeout(AdMob.showInterstitial(), CALL_TIMEOUT_MS, "showInterstitial");
    return true;
  } catch (err) {
    console.warn("Interstitial failed to show:", err);
    interstitialState = "idle";
    void preloadInterstitial();
    return false;
  }
}

/**
 * A flat string rather than a discriminated union: this project compiles with
 * `strict: false`, where TypeScript will not narrow a union by its boolean
 * discriminant, so callers could not read `reason` off a narrowed member.
 */
export type RewardOutcome = "earned" | "unavailable" | "dismissed" | "failed";

/**
 * Show a rewarded ad and resolve with whether the user actually earned it.
 *
 * `earned` is driven by AdMob's Rewarded event, NOT by the ad closing — the
 * caller must only ask the server for a reward when `earned` is true.
 *
 * Unlike interstitials this is a deliberate user action, so it will briefly
 * wait for a preload to finish — but never longer than REWARDED_WAIT_MS.
 */
export async function showRewardedAd(): Promise<RewardOutcome> {
  if (!adsAvailable) return "unavailable";

  // Subscribers are ad-free, so there is no rewarded ad to offer them either.
  // The UI hides the button as well; this is the backstop.
  if (await isPremiumActive()) return "unavailable";

  let rewardedListener: { remove: () => Promise<void> } | undefined;
  let earned = false;

  try {
    await initAds();
    if (!initialized) return "unavailable";

    // Read through a getter: an AdMob listener flips this while we await, but
    // TypeScript narrows on the last assignment it can see and would otherwise
    // call the "ready" checks below dead code.
    const readyState = () => rewardedState;

    if (readyState() !== "ready") {
      void preloadRewarded();

      // Poll briefly rather than blocking forever on a slow network.
      const deadline = Date.now() + REWARDED_WAIT_MS;
      while (readyState() !== "ready" && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
      }
      if (readyState() !== "ready") return "unavailable";
    }

    rewardedListener = await AdMob.addListener(
      RewardAdPluginEvents.Rewarded,
      (_item: AdMobRewardItem) => {
        earned = true;
      },
    );

    // Resolves when the ad is dismissed; the listener above has fired by then
    // if the user watched long enough to earn the reward. The generous bound
    // only guards against a promise that never settles at all — a rewarded
    // video legitimately runs for a while.
    await withTimeout(AdMob.showRewardVideoAd(), 120_000, "showRewardVideoAd");

    rewardedState = "idle";
    void preloadRewarded();

    return earned ? "earned" : "dismissed";
  } catch (err) {
    console.warn("Rewarded ad unavailable:", err);
    rewardedState = "idle";
    return "failed";
  } finally {
    await rewardedListener?.remove().catch(() => {});
  }
}

/**
 * Warm up the SDK and queue the first ads. Call once, well after first paint —
 * initializing AdMob competes with the app's own startup work.
 */
export async function warmUpAds(): Promise<void> {
  if (!adsAvailable) return;
  try {
    await initAds();
    if (!initialized) return;
    await Promise.all([preloadInterstitial(), preloadRewarded()]);
  } catch (err) {
    console.warn("Ad warm-up failed:", err);
  }
}

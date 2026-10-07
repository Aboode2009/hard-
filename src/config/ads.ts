/**
 * All AdMob identifiers live here — swap these for your real ones when the
 * AdMob account is ready and nothing else needs to change.
 *
 * Right now every value is one of Google's official SAMPLE ad units, which
 * always fill with a test ad. Never ship real ad units while `USE_TEST_ADS`
 * is true, and never click your own live ads (Google bans accounts for it).
 *
 * When you go live you must ALSO replace the App ID in
 * android/app/src/main/AndroidManifest.xml
 * (meta-data com.google.android.gms.ads.APPLICATION_ID) — the manifest can't
 * read this file.
 */

/**
 * ══════════════════════════════════════════════════════════════════════
 * MASTER SWITCH — every ad in the app, on every platform.
 * ══════════════════════════════════════════════════════════════════════
 *
 * `false` turns off all three placements at once: the app-open interstitial,
 * the "I finished my tasks" interstitial, and every rewarded ad. Nothing is
 * deleted — `lib/ads.ts` derives `adsAvailable` from this, and every exported
 * function already returns early on that flag, so each placement becomes a
 * no-op that costs nothing and blocks nothing. The UI hides its own ad
 * affordances from the same flag, so no empty button or dead space is left.
 *
 * Turn ads back on by setting this to `true`. That is the only edit needed.
 */
export const ADS_ENABLED = false;

/** Flip to false only once real IDs are in place below. */
export const USE_TEST_ADS = true;

/** Google's published sample IDs — safe to click, always fill. */
const TEST_IDS = {
  androidAppId: "ca-app-pub-3940256099942544~3347511713",
  iosAppId: "ca-app-pub-3940256099942544~1458002511",
  androidInterstitial: "ca-app-pub-3940256099942544/1033173712",
  iosInterstitial: "ca-app-pub-3940256099942544/4411468910",
  androidRewarded: "ca-app-pub-3940256099942544/5224354917",
  iosRewarded: "ca-app-pub-3940256099942544/1712485313",
} as const;

/** ⬇️ Put your real AdMob IDs here, then set USE_TEST_ADS = false. */
const LIVE_IDS = {
  androidAppId: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
  iosAppId: "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
  androidInterstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
  iosInterstitial: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
  androidRewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
  iosRewarded: "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX",
} as const;

export const AD_IDS = USE_TEST_ADS ? TEST_IDS : LIVE_IDS;

/**
 * Minimum gap between two interstitials. Both placements (app start and
 * "I finished my tasks") share this budget, so a user who opens the app and
 * immediately finishes their day only sees one ad.
 */
export const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000; // 3 minutes

/** Points granted per rewarded ad — display only; the server decides the real amount. */
export const REWARDED_POINTS_HINT = 20;

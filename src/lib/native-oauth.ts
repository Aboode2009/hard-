import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import type { SignInResource } from "@clerk/react";

/** OAuth providers we start natively. Extend the union to add more later. */
type NativeOAuthStrategy = "oauth_google";

/**
 * In-app-browser OAuth for Clerk on Capacitor (native).
 *
 * Why this exists: on native, Clerk's prebuilt Google button does a
 * `window.location` redirect, which inside an Android/iOS WebView either leaves
 * the app for the system browser or hits Google's "disallowed_useragent" wall.
 * Instead we drive Clerk's OAuth manually: `signIn.create()` hands us the
 * provider URL, we open it in an in-app browser (Chrome Custom Tab /
 * SFSafariViewController), and Clerk redirects back to our custom-scheme deep
 * link carrying a one-time nonce. A deep-link listener routes the app to
 * `/sso-callback`, where Clerk's <AuthenticateWithRedirectCallback> exchanges
 * that nonce for a session — so the browser's cookie jar is never needed.
 *
 * On web this module is inert: `isNativePlatform` is false, callers keep using
 * Clerk's own social buttons, and none of this runs.
 */

export const isNativeApp = Capacitor.isNativePlatform();

/**
 * Custom-scheme deep link Clerk redirects back to after the provider auth.
 * Must match: the Android intent-filter (AndroidManifest.xml), the iOS URL
 * type (Info.plist), and Clerk Dashboard → allowed redirect URLs.
 */
export const OAUTH_REDIRECT_URL = "com.hardchallenge.app://sso-callback";

/** Path the deep-link listener routes to; a React route renders the callback. */
export const SSO_CALLBACK_PATH = "/sso-callback";

/**
 * Kick off a native OAuth flow: create the sign-in attempt, then open the
 * provider's URL in the in-app browser. Completion happens later via the
 * deep-link listener + /sso-callback route.
 */
export async function startNativeOAuth(
  signIn: SignInResource,
  strategy: NativeOAuthStrategy,
): Promise<void> {
  await signIn.create({
    strategy,
    redirectUrl: OAUTH_REDIRECT_URL,
    actionCompleteRedirectUrl: OAUTH_REDIRECT_URL,
  });

  const externalUrl = signIn.firstFactorVerification?.externalVerificationRedirectURL;
  if (!externalUrl) {
    throw new Error("Clerk did not return an external verification URL for OAuth.");
  }

  await Browser.open({ url: externalUrl.toString() });
}

/**
 * Register the deep-link listener that catches Clerk's redirect back into the
 * app, closes the in-app browser, and routes to /sso-callback with the OAuth
 * params so Clerk can finalize the session. No-op on web.
 *
 * @param onCallback receives the callback path incl. query string, e.g.
 *   "/sso-callback?rotating_token_nonce=..." — route the SPA there.
 * @returns a cleanup function that removes the listener.
 */
export function registerOAuthDeepLinkListener(
  onCallback: (pathWithQuery: string) => void,
): () => void {
  if (!isNativeApp) return () => {};

  let handle: PluginListenerHandle | undefined;

  App.addListener("appUrlOpen", async ({ url }) => {
    // Only react to our OAuth deep link, not other app links.
    if (!url.includes("sso-callback")) return;

    // Close the in-app browser (may already be gone — ignore failures).
    await Browser.close().catch(() => {});

    // com.hardchallenge.app://sso-callback?foo=bar  →  /sso-callback?foo=bar
    const queryIndex = url.indexOf("?");
    const query = queryIndex >= 0 ? url.slice(queryIndex) : "";
    onCallback(SSO_CALLBACK_PATH + query);
  }).then((h) => {
    handle = h;
  });

  return () => {
    handle?.remove();
  };
}

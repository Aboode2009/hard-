import { Capacitor } from "@capacitor/core";

/**
 * OAuth return addresses.
 *
 * Supabase only redirects to URLs on its allow-list (Authentication → URL
 * Configuration). Three are registered for this project:
 *
 *   https://localhost                       the Capacitor WebView's own origin
 *   capacitor://localhost                   the native deep link, below
 *   https://merry-dragon-9e3add.netlify.app/**   the published web build
 *
 * Anything else comes back as "redirect_to is not allowed", so these constants
 * must keep matching the dashboard exactly.
 */

/**
 * Origin of the published web build, without a trailing slash.
 * Override per environment with VITE_PUBLIC_WEB_URL.
 */
export const PUBLIC_WEB_URL = (
  import.meta.env.VITE_PUBLIC_WEB_URL || "https://merry-dragon-9e3add.netlify.app"
).replace(/\/+$/, "");

/**
 * Origin for links that leave the app — invite links, and the confirmation /
 * password-reset links Supabase emails.
 *
 * In the native app `window.location.origin` is the WebView's own
 * `https://localhost`, which means nothing to a friend's phone or to the
 * browser an email link opens in, so native uses the published web build.
 */
export const shareableOrigin = (): string =>
  Capacitor.isNativePlatform() ? PUBLIC_WEB_URL : window.location.origin;

/**
 * Where Supabase sends the system browser once Google is done, on native.
 *
 * A custom scheme rather than an https page: Android hands it straight to the
 * app as an `appUrlOpen` event (see the intent-filter in AndroidManifest.xml),
 * so the PKCE code is exchanged inside the app — the only place holding the
 * verifier — without a web page in the middle.
 */
export const NATIVE_OAUTH_REDIRECT = "capacitor://localhost";

/**
 * Optional https fallback, for a device whose browser refuses to hand a custom
 * scheme back to the app. `public/native-bridge.html` is a static page that
 * forwards the callback parameters straight to NATIVE_OAUTH_REDIRECT; pointing
 * `redirectTo` here instead routes the return trip through it. It needs the web
 * build deployed, which is why it is not the default.
 */
export const OAUTH_BRIDGE_URL = `${PUBLIC_WEB_URL}/native-bridge.html`;

/**
 * Google Cloud **Web** OAuth client ID (not the Android one).
 *
 * Android's Credential Manager wants the *web* client ID even on device: the
 * Android client is matched behind the scenes by package name + signing SHA-1,
 * which is why both the debug and release fingerprints must be registered in
 * Google Cloud. The same ID is registered as the audience in Supabase, so the
 * ID token it mints verifies on the way back in.
 *
 * Not a secret — client IDs are public — so it ships as a default rather than
 * forcing a .env entry for every build.
 */
export const GOOGLE_WEB_CLIENT_ID = (
  import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
  "71113703196-mj42r8p9t5s04e356nlmhep5sokjuaqo.apps.googleusercontent.com"
).trim();

/**
 * Google Cloud **iOS** OAuth client ID (type "iOS", bundle ID
 * com.hardchallenge.app). iOS can't use the web client the way Android's
 * Credential Manager does; Google's iOS SDK signs in with this one and asks
 * for an ID token on behalf of the web client (`iOSServerClientId`).
 *
 * Its reversed form ("com.googleusercontent.apps.<id>") must also be a URL
 * scheme in ios/App/App/Info.plist, and this ID must be listed next to the web
 * one under Supabase → Auth → Providers → Google → Client IDs.
 *
 * Empty until that client exists: iOS then hides the Google button, and
 * people sign in with Apple or email.
 */
export const GOOGLE_IOS_CLIENT_ID = (import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || "").trim();

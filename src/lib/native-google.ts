import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "@/config/auth";

const isIOS = Capacitor.getPlatform() === "ios";

/**
 * Whether the Google button can work here. On iOS it needs its own client ID
 * (see GOOGLE_IOS_CLIENT_ID); until that exists the button is hidden there.
 */
export const googleSignInAvailable = !isIOS || GOOGLE_IOS_CLIENT_ID !== "";

/**
 * Native Google sign-in: Android's Credential Manager, or Google's sign-in
 * sheet on iOS.
 *
 * No browser is involved at any point: Credential Manager shows the account
 * picker as a sheet over the app, branded with the app's own name, and hands
 * back a Google ID token. Supabase then trades that token for a session via
 * `signInWithIdToken`, so the user never sees a URL or a project ref.
 *
 * ── The nonce ───────────────────────────────────────────────────────────
 * Google embeds whatever nonce it is given verbatim into the ID token's
 * `nonce` claim, and Supabase verifies that claim by hashing the nonce *it*
 * was given. So the two sides must receive different forms of the same value:
 *
 *   SHA-256(raw) → Google      raw → Supabase
 *
 * Getting this backwards fails with "Passed nonce and nonce in id_token should
 * either both exist or not". The plugin forwards our string to `setNonce()`
 * untouched, which is what lets us hash it here and keep verification on —
 * nothing needs "Skip nonce checks" enabled in the dashboard.
 */

/** Why native Google sign-in failed, so the UI can say something useful. */
export type GoogleSignInErrorKind =
  | "cancelled"
  | "no-accounts"
  | "config"
  | "network"
  | "unknown";

export class GoogleSignInError extends Error {
  constructor(
    public kind: GoogleSignInErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "GoogleSignInError";
  }
}

/**
 * `initialize` is idempotent but not free, and two taps in a row would
 * otherwise race. Caching the promise makes the second caller await the first.
 */
let initialized: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = SocialLogin.initialize({
      google: isIOS
        ? // The ID token is minted for the web client, the audience Supabase
          // already trusts for Android.
          { iOSClientId: GOOGLE_IOS_CLIENT_ID, iOSServerClientId: GOOGLE_WEB_CLIENT_ID }
        : { webClientId: GOOGLE_WEB_CLIENT_ID },
    }).catch((err) => {
      // Don't cache a failure — the next attempt should be able to retry.
      initialized = null;
      throw err;
    });
  }
  return initialized;
}

const toHex = (buf: ArrayBuffer | Uint8Array): string =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * A fresh nonce pair per attempt. `crypto.subtle` needs a secure context,
 * which the WebView has: Capacitor serves the app over https://localhost on
 * Android and capacitor://localhost on iOS. Apple sign-in uses the same pair.
 */
export async function makeNoncePair(): Promise<{ raw: string; hashed: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const raw = toHex(bytes);

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return { raw, hashed: toHex(digest) };
}

/** Maps the plugin's English rejection strings onto something actionable. */
function classify(err: unknown): GoogleSignInError {
  const raw = String((err as Error)?.message ?? err);
  const m = raw.toLowerCase();

  if (m.includes("cancel") || m.includes("dismiss") || m.includes("user canceled")) {
    return new GoogleSignInError("cancelled", raw);
  }
  if (m.includes("no credential") || m.includes("nocredential")) {
    return new GoogleSignInError("no-accounts", raw);
  }
  if (
    m.includes("client id") ||
    m.includes("developer console") ||
    m.includes("10:") ||
    m.includes("audience")
  ) {
    return new GoogleSignInError("config", raw);
  }
  if (m.includes("network") || m.includes("timeout") || m.includes("unreachable")) {
    return new GoogleSignInError("network", raw);
  }
  return new GoogleSignInError("unknown", raw);
}

/**
 * Shows the native account picker and establishes a Supabase session.
 *
 * Resolves only once the session exists, so the caller can navigate straight
 * away. Throws `GoogleSignInError` otherwise.
 */
export async function signInWithGoogleNative(): Promise<void> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new GoogleSignInError("config", "GOOGLE_WEB_CLIENT_ID is empty");
  }
  if (!googleSignInAvailable) {
    throw new GoogleSignInError("config", "GOOGLE_IOS_CLIENT_ID is empty");
  }

  let idToken: string | null = null;
  let rawNonce: string;

  try {
    await ensureInitialized();
    const { raw, hashed } = await makeNoncePair();
    rawNonce = raw;

    const { result } = await SocialLogin.login({
      provider: "google",
      options: {
        // The sheet that slides up from the bottom, branded "Hard 21".
        style: "bottom",
        // Without this the sheet only offers accounts that have already used
        // this app — which on a first install is none of them, and the user
        // gets an empty picker.
        filterByAuthorizedAccounts: false,
        nonce: hashed,
        // Deliberately no `scopes`: the plugin already requests email, profile
        // and openid, and passing any custom scope makes it demand a modified
        // MainActivity and reject the call outright.
      },
    });

    // `offline` mode would return a serverAuthCode instead; we never set it.
    if (result.responseType === "online") {
      idToken = result.idToken;
    }
  } catch (err) {
    console.error("[google] native sign-in failed:", err);
    throw classify(err);
  }

  if (!idToken) {
    throw new GoogleSignInError("unknown", "Google returned no ID token");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
    nonce: rawNonce,
  });

  if (error) {
    console.error("[google] signInWithIdToken failed:", error);
    // A nonce or audience mismatch here is a configuration problem, not
    // something the user can retry their way out of.
    throw classify(error);
  }
}

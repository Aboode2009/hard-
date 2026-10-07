import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { makeNoncePair } from "@/lib/native-google";

/**
 * Sign in with Apple, iOS only.
 *
 * App Store review requires it of any app that offers Google sign-in
 * (guideline 4.8). The system sheet hands back an identity token that
 * Supabase exchanges for a session, the same way native Google does.
 *
 * Needs, outside this code: the "Sign in with Apple" capability on the App ID
 * (ios/App/App/App.entitlements already asks for it), and Supabase → Auth →
 * Providers → Apple enabled with the bundle ID com.hardchallenge.app among
 * its Client IDs.
 *
 * The nonce works as for Google: Apple embeds the hashed value in the token,
 * Supabase hashes the raw one and compares.
 */

export const appleSignInAvailable = Capacitor.getPlatform() === "ios";

export type AppleSignInErrorKind = "cancelled" | "unknown";

export class AppleSignInError extends Error {
  constructor(
    public kind: AppleSignInErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AppleSignInError";
  }
}

let initialized: Promise<void> | null = null;

function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = SocialLogin.initialize({
      // Not used by the system API on iOS; it only switches the provider on.
      apple: { clientId: "com.hardchallenge.app" },
    }).catch((err) => {
      initialized = null;
      throw err;
    });
  }
  return initialized;
}

/**
 * Shows Apple's sign-in sheet and establishes a Supabase session. Resolves only
 * once the session exists; throws `AppleSignInError` otherwise.
 */
export async function signInWithAppleNative(): Promise<void> {
  let idToken: string | null = null;
  let fullName = "";
  let rawNonce: string;

  try {
    await ensureInitialized();
    const { raw, hashed } = await makeNoncePair();
    rawNonce = raw;
    const { result } = await SocialLogin.login({
      provider: "apple",
      options: { scopes: ["email", "name"], nonce: hashed },
    });
    idToken = result.idToken;
    // Apple sends the name on the very first sign-in only.
    fullName = [result.profile?.givenName, result.profile?.familyName].filter(Boolean).join(" ").trim();
  } catch (err) {
    const raw = String((err as Error)?.message ?? err);
    console.error("[apple] native sign-in failed:", err);
    // ASAuthorizationError.canceled is code 1001.
    const cancelled = /cancel|1001/i.test(raw);
    throw new AppleSignInError(cancelled ? "cancelled" : "unknown", raw);
  }

  if (!idToken) throw new AppleSignInError("unknown", "Apple returned no identity token");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: idToken,
    nonce: rawNonce,
  });
  if (error) {
    console.error("[apple] signInWithIdToken failed:", error);
    throw new AppleSignInError("unknown", error.message);
  }

  // Where the profile's username comes from (lib/ensure-profile.ts), as it is
  // for Google. Best effort: without it the username falls back to the email.
  if (fullName) {
    await supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => {});
  }
}

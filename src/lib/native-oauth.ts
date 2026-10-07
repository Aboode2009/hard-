import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import type { PluginListenerHandle } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { NATIVE_OAUTH_REDIRECT } from "@/config/auth";
import { signInWithGoogleNative } from "@/lib/native-google";

/**
 * Google sign-in, per platform.
 *
 * **Android takes the native path and never opens a browser.** Credential
 * Manager shows an account sheet over the app, branded "Hard 21", and returns
 * an ID token that Supabase exchanges for a session — see native-google.ts.
 *
 * **Web** keeps the ordinary redirect: `signInWithOAuth` navigates the tab and
 * `detectSessionInUrl` picks the session up on the way back.
 *
 * The browser-based native flow below is kept as a documented fallback for a
 * device where Credential Manager cannot work (no Play Services, say). It is
 * not wired to anything: reach it by calling `startGoogleOAuthViaBrowser`
 * explicitly.
 */

export const isNativeApp = Capacitor.isNativePlatform();

/**
 * Starts Google sign-in on whichever platform we are on.
 *
 * On Android this resolves only once the session exists. On web the page has
 * already navigated away by the time it resolves.
 */
export async function startGoogleOAuth(): Promise<void> {
  if (isNativeApp) {
    await signInWithGoogleNative();
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
}

/**
 * FALLBACK ONLY — the browser-based flow, kept for a device where Credential
 * Manager is unavailable. Opens a Custom Tab and returns through the deep link
 * registered in AndroidManifest.xml; pair it with
 * `registerOAuthDeepLinkListener`.
 */
export async function startGoogleOAuthViaBrowser(): Promise<void> {
  // `skipBrowserRedirect` hands us the URL instead of navigating the WebView,
  // which is what lets us open it in a Custom Tab instead.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: NATIVE_OAUTH_REDIRECT,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Supabase returned no OAuth URL");

  await Browser.open({ url: data.url, presentationStyle: "popover" });
}

/**
 * Pulls the callback parameters out of a deep link and completes the session.
 *
 * PKCE returns `?code=`; an error, or an implicit-flow token pair, arrives in
 * the fragment instead, so both halves of the URL are checked.
 */
async function completeFromUrl(url: string): Promise<boolean> {
  const afterHash = url.includes("#") ? url.slice(url.indexOf("#") + 1) : "";
  const afterQuery = url.includes("?")
    ? url.slice(url.indexOf("?") + 1).split("#")[0]
    : "";

  for (const raw of [afterQuery, afterHash]) {
    if (!raw) continue;
    const params = new URLSearchParams(raw);

    const code = params.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    }

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      return true;
    }

    const errDesc = params.get("error_description") || params.get("error");
    if (errDesc) throw new Error(decodeURIComponent(errDesc));
  }

  return false;
}

/**
 * Registers the deep-link listener that finishes OAuth inside the app.
 *
 * @param onDone called once the attempt resolves — with an Error if it failed,
 *   with nothing if a session was established.
 * @returns a cleanup function that removes the listener.
 */
export function registerOAuthDeepLinkListener(
  onDone: (error?: Error) => void,
): () => void {
  if (!isNativeApp) return () => {};

  let handle: PluginListenerHandle | undefined;
  let cancelled = false;

  void App.addListener("appUrlOpen", ({ url }) => {
    // Only react to our own callback, not other app links.
    if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return;

    // The Custom Tab is still sitting on top of the app at this point.
    void Browser.close().catch(() => {
      /* already gone on some devices; nothing to do */
    });

    void completeFromUrl(url)
      .then((ok) => {
        if (ok) onDone();
      })
      .catch((err) => {
        console.error("[oauth] deep-link completion failed:", err);
        onDone(err instanceof Error ? err : new Error(String(err)));
      });
  }).then((h) => {
    if (cancelled) {
      void h.remove();
      return;
    }
    handle = h;
  });

  return () => {
    cancelled = true;
    void handle?.remove();
  };
}

import { supabase } from "@/integrations/supabase/client";
import { storedSessionUserId } from "@/lib/session-user";
import { writeCache, dropCache, homeKeys } from "@/lib/home-cache";

/**
 * Remembers, per user on this device, that they use company mode.
 *
 * Without it every launch painted the personal challenge first and only then
 * asked the server whether to switch — two round trips of the wrong screen. The
 * flag lets the app open /nass before anything is drawn; the server is still
 * asked, silently, and a "no" clears the flag and sends the user back.
 *
 * Keyed by user id so a second account on the same device never inherits it.
 * It is a routing hint only: CompanyAccessGate and the database decide access.
 */
export interface CompanyMode {
  mode: "company";
  code: string;
  savedAt: number;
}

const key = (uid: string) => `company_mode_${uid}`;

export function readCompanyMode(uid: string | null): CompanyMode | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(key(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CompanyMode>;
    return parsed?.mode === "company" && typeof parsed.code === "string"
      ? (parsed as CompanyMode)
      : null;
  } catch {
    return null;
  }
}

export function saveCompanyMode(uid: string, code: string) {
  try {
    const value: CompanyMode = { mode: "company", code, savedAt: Date.now() };
    localStorage.setItem(key(uid), JSON.stringify(value));
  } catch {
    /* storage unavailable — the app just falls back to asking the server */
  }
}

/** Forgets company mode for this user, including the in-session home cache. */
export function clearCompanyMode(uid: string) {
  try {
    localStorage.removeItem(key(uid));
  } catch {
    /* ignore */
  }
  writeCache(homeKeys.companyAccess(uid), false);
}

/** True when "/" should open straight into company mode for the stored user. */
export function companyModeForStoredUser(): boolean {
  return readCompanyMode(storedSessionUserId()) !== null;
}

/** The user deliberately switched to the personal challenge (`/?from=nass`). */
export const cameFromCompany = (search: string) =>
  new URLSearchParams(search).get("from") === "nass";

/**
 * Pre-render redirect. Runs before React mounts, so a company user's first
 * frame is already /nass — there is no personal-challenge frame to flash.
 */
export function redirectToCompanyBeforeFirstPaint() {
  const { pathname, search } = window.location;
  if (pathname !== "/" || cameFromCompany(search)) return;
  if (!companyModeForStoredUser()) return;
  window.history.replaceState(window.history.state, "", "/nass");
}

/**
 * Clears the flag (and the home-screen cache) on sign-out, whatever triggered it (a logout button, account
 * deletion, a refresh token that stopped working).
 *
 * SIGNED_OUT carries no session, so the id is remembered from earlier events.
 */
export function installCompanyModeSignOutCleanup() {
  let lastUid = storedSessionUserId();
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user?.id) lastUid = session.user.id;
    if (event === "SIGNED_OUT") {
      if (lastUid) clearCompanyMode(lastUid);
      lastUid = null;
      // The home screen's cached data, including the copy kept on the device
      // for first paint — not left behind for whoever uses the phone next.
      dropCache();
    }
  });
}

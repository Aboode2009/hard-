import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyProfile } from "@/lib/ensure-profile";
import { markToursEligible } from "@/lib/page-tours";

/**
 * The welcome flow is for brand-new accounts only.
 *
 * The server decides, with an explicit marker: `profiles.onboarding_completed_at`.
 * It is NULL for an account that has never finished the flow and is set once,
 * by the `complete_onboarding` RPC, when it is finished. Every account that
 * existed before the marker was introduced was back-filled, so an existing
 * user never sees the flow — on any device, however old the account.
 */

const onboardingDoneKey = (uid: string) => `hasSeenOnboarding_${uid}`;

type OnboardingRow = { onboarding_completed_at: string | null };

async function readRow(uid: string): Promise<OnboardingRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed_at")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Whether this account should see the welcome flow now. Any doubt (a failed
 * read) answers no: an existing user must never be sent through it.
 */
export async function needsOnboarding(session: Session): Promise<boolean> {
  const uid = session.user.id;
  if (localStorage.getItem(onboardingDoneKey(uid))) return false;

  try {
    let row = await readRow(uid);
    // A first sign-in can get here before ProfileBootstrap has created the row.
    if (!row) {
      await ensureMyProfile(session);
      row = await readRow(uid);
    }
    if (!row) return false;

    if (row.onboarding_completed_at !== null) {
      // Settled for good on this device; skip the query next launch.
      markOnboardingDone(uid);
      return false;
    }
    // Brand-new account: it gets the first-visit tours too (lib/page-tours.ts).
    markToursEligible(uid);
    return true;
  } catch (err) {
    console.warn("Checking whether to show onboarding failed:", err);
    return false;
  }
}

export function markOnboardingDone(uid: string) {
  localStorage.setItem(onboardingDoneKey(uid), "true");
}

/**
 * Makes the name typed on the "what should I call you" step the account's
 * username — it replaces the one derived from Google at sign-up.
 * `ensure_my_profile` only names a row when it creates it, so this choice is
 * never overwritten on later launches.
 */
export async function saveOnboardingName(name: string): Promise<"ok" | "taken" | "error"> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "error";
    const { error } = await supabase
      .from("profiles")
      .update({ username: name })
      .eq("id", user.id);
    if (!error) return "ok";
    // 23505 = unique_violation. Usernames are unique ignoring letter case
    // (profiles_username_lower_key), so "Ahmed" is taken if "ahmed" exists.
    return error.code === "23505" ? "taken" : "error";
  } catch {
    return "error";
  }
}

/**
 * Saves the remaining answers and marks the flow as finished on the server
 * (sets `onboarding_completed_at` once; calling it again keeps the first time).
 */
export async function saveOnboardingProfile(age: number, gender: "male" | "female"): Promise<void> {
  const { error } = await supabase.rpc("complete_onboarding", {
    p_age: age,
    p_gender: gender,
  });
  if (error) throw error;
}

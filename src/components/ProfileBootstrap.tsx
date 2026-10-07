import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyProfile } from "@/lib/ensure-profile";

/**
 * Makes sure the signed-in user has their Supabase rows.
 *
 * Supabase owns authentication, and the database is storage. So nothing here
 * may ever block the user from entering the app — if this fails, the user is
 * still signed in and the next launch tries again.
 *
 * All of the work is done by one server-side function, `ensure_my_profile`,
 * which is idempotent, derives a unique username on collision, and always
 * creates the `challenge_progress` row.
 */

/** Backoff between attempts. Three tries total. */
const RETRY_DELAYS_MS = [800, 2400];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ProfileBootstrap() {
  /** Guards against concurrent runs for the same user, not against retries. */
  const running = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async (session: Session) => {
      if (running.current === session.user.id) return;
      running.current = session.user.id;

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        if (cancelled) return;
        try {
          await ensureMyProfile(session);
          if (cancelled) return;
          await processPendingReferral(session.user.id);
          return;
        } catch (err) {
          // Deliberately console-only: the user is already signed in and using
          // the app, and a storage hiccup is not their problem to solve.
          console.warn(`ensure_my_profile attempt ${attempt + 1} failed:`, err);
          if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }

      // Every attempt failed — release the guard so a later sign-in event or
      // launch gets a fresh set of tries.
      if (!cancelled) running.current = null;
    };

    // Covers a session restored from storage on a cold start.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled && session) void bootstrap(session);
    });

    // ...and every later sign-in, including the OAuth deep-link return.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        void bootstrap(session);
      }
      if (event === "SIGNED_OUT") running.current = null;
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

/** Redeems a referral code captured before sign-up. Failure is not fatal. */
async function processPendingReferral(userId: string) {
  const referralCode = localStorage.getItem("pendingReferralCode");
  if (!referralCode) return;

  try {
    await supabase.rpc("process_referral", {
      p_new_user_id: userId,
      p_referral_code: referralCode,
    });
  } catch (err) {
    console.warn("process_referral failed:", err);
  }
  localStorage.removeItem("pendingReferralCode");
}

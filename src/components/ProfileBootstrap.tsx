import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/react";
import { supabase } from "@/integrations/supabase/client";

/**
 * With Supabase Auth, a database trigger (`handle_new_user`) created the
 * `profiles` and `challenge_progress` rows whenever a user was inserted into
 * `auth.users`. Clerk sign-ups never touch `auth.users`, so that trigger no
 * longer fires. This component reproduces it on the client: the first time a
 * signed-in Clerk user is seen, it makes sure their profile + challenge
 * progress rows exist. It is idempotent (safe to run on every load).
 */
export function ProfileBootstrap() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    if (done.current === user.id) return;
    done.current = user.id;

    const bootstrap = async () => {
      const username =
        user.username ||
        user.firstName ||
        user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        `user_${user.id.slice(-6)}`;

      // Onboarding values captured before sign-up (mirrors the old flow).
      const pendingCompanyCode = (localStorage.getItem("pendingCompanyCode") || "").toUpperCase() || null;

      // Create the profile row if it doesn't exist yet.
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            username,
            ...(pendingCompanyCode ? { company_code: pendingCompanyCode } : {}),
          },
          { onConflict: "id", ignoreDuplicates: true }
        );

      if (profileError) {
        // Non-fatal: a unique-username clash just means the profile already exists.
        console.warn("ProfileBootstrap: profile upsert", profileError.message);
      }

      // Start challenge progress if it isn't started yet.
      const { error: progressError } = await supabase
        .from("challenge_progress")
        .upsert(
          { user_id: user.id, start_date: new Date().toISOString().slice(0, 10) },
          { onConflict: "user_id", ignoreDuplicates: true }
        );

      if (progressError) {
        console.warn("ProfileBootstrap: progress upsert", progressError.message);
      }

      // Process a pending referral once, if present.
      const referralCode = localStorage.getItem("pendingReferralCode");
      if (referralCode) {
        try {
          await supabase.rpc("process_referral", {
            p_new_user_id: user.id,
            p_referral_code: referralCode,
          });
        } catch (e) {
          console.warn("ProfileBootstrap: referral", e);
        }
        localStorage.removeItem("pendingReferralCode");
      }
      localStorage.removeItem("pendingCompanyCode");
    };

    bootstrap();
  }, [isLoaded, isSignedIn, user]);

  return null;
}

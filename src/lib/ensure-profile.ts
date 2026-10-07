import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

/**
 * `ensure_my_profile` — the one way rows get created for a user.
 *
 * It is idempotent, derives the identity from `auth.uid()` rather than from
 * anything the client sends, resolves username collisions server-side, and
 * always creates the `challenge_progress` row alongside the profile. So no
 * client code should ever insert into `profiles` directly: a raw insert would
 * fail the unique constraint the moment two people sign up with, say,
 * `ahmed@gmail.com` and `ahmed@outlook.com`.
 */

/**
 * Best available display name, in descending order of how much the user would
 * recognise it. OAuth providers fill `user_metadata`; email sign-ups do not,
 * so the local part of the address is the fallback before a generated id.
 *
 * Only ever a *suggestion* — the server appends a suffix if it is taken.
 */
export function deriveUsername(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [
    meta.username,
    meta.preferred_username,
    meta.full_name,
    meta.name,
    user.email?.split("@")[0],
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return `user_${user.id.slice(0, 8)}`;
}

/**
 * Creates the signed-in user's rows if they are missing.
 *
 * Throws on failure so a caller that needs the rows to exist can react;
 * `ProfileBootstrap` deliberately swallows that and retries instead, because
 * being signed in must never depend on this succeeding.
 */
export async function ensureMyProfile(session: Session | { user: User }): Promise<void> {
  // Captured during onboarding, before the account existed.
  const companyCode =
    (localStorage.getItem("pendingCompanyCode") || "").toUpperCase() || null;

  const { error } = await supabase.rpc("ensure_my_profile", {
    p_username: deriveUsername(session.user),
    p_company_code: companyCode ?? undefined,
  });
  if (error) throw new Error(error.message);

  localStorage.removeItem("pendingCompanyCode");
}

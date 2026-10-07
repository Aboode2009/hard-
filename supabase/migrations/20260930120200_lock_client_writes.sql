-- Take the economy columns away from the client.
--
-- APPLY ONLY AFTER the app version that calls the new RPCs is live: the
-- previous app build writes these columns directly and would stop saving.
--
-- Points, streaks, days, freezes, tasks_state, XP, level, loot boxes, the
-- inventory, premium flags and company_code are written only by the
-- SECURITY DEFINER functions from …_server_side_challenge_economy.

-- challenge_progress: no direct INSERT/UPDATE at all (rows are created by
-- ensure_my_profile / _evaluate_progress). Reads and admin DELETE stay.
REVOKE INSERT, UPDATE ON public.challenge_progress FROM anon, authenticated;
DROP POLICY IF EXISTS "Users can update own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Admins can update any challenge progress" ON public.challenge_progress;

-- profiles: only cosmetic / personal columns stay client-writable.
-- is_premium, is_lifetime, premium_until, company_code, xp, level,
-- loot_boxes, last_loot_box_streak, referral fields: server only.
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (username, avatar_url, age, gender,
              equipped_frame_id, equipped_badge_id, equipped_theme_id)
  ON public.profiles TO authenticated;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((auth.uid())::text = id)
  WITH CHECK ((auth.uid())::text = id);

-- Inventory is granted only by the reward functions.
REVOKE INSERT, UPDATE ON public.user_inventory FROM anon, authenticated;
DROP POLICY IF EXISTS "Users can insert into own inventory" ON public.user_inventory;

-- Themes are bought through buy_theme(); the client may only switch is_active.
REVOKE INSERT, UPDATE ON public.user_themes FROM anon, authenticated;
GRANT UPDATE (is_active) ON public.user_themes TO authenticated;
DROP POLICY IF EXISTS "Users can purchase themes" ON public.user_themes;

-- Completion history is written by complete_task / complete_day / redeem_*.
REVOKE INSERT, UPDATE ON public.task_completions FROM anon, authenticated;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.task_completions;

-- XP is granted by the functions above; the client may no longer mint it.
REVOKE EXECUTE ON FUNCTION public.add_xp(text, integer) FROM PUBLIC, anon, authenticated;

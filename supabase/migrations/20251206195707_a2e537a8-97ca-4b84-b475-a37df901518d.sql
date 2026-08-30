-- Fix 1: Add DELETE policy for task_completions (GDPR compliance)
CREATE POLICY "Users can delete own completions"
  ON task_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fix 2: Restrict profiles to only view own profile (privacy protection)
-- Note: The get_leaderboard() function uses SECURITY DEFINER so it can still read all profiles
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
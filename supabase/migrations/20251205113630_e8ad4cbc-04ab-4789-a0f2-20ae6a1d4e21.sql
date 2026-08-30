-- Create a view for leaderboard that only exposes necessary fields
CREATE OR REPLACE VIEW public.leaderboard_view AS
SELECT 
  user_id,
  total_points,
  weekly_points,
  current_streak,
  best_streak,
  current_day,
  stage_level
FROM challenge_progress
WHERE is_active = true;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.leaderboard_view TO authenticated;

-- Update RLS policy: Remove the overly permissive "view all" policy
DROP POLICY IF EXISTS "Users can view all progress for leaderboard" ON challenge_progress;

-- Keep the owner-only policy for full record access
-- The "Users can view own progress" policy already exists
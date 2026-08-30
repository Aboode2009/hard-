-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.leaderboard_view;

CREATE VIEW public.leaderboard_view 
WITH (security_invoker = true)
AS
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
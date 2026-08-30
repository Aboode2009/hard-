-- Drop the view as we'll use a function instead
DROP VIEW IF EXISTS public.leaderboard_view;

-- Create a SECURITY DEFINER function to safely fetch leaderboard data
-- This bypasses RLS but only exposes the necessary fields
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  total_points integer,
  weekly_points integer,
  current_streak integer,
  best_streak integer,
  current_day integer,
  stage_level integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cp.user_id,
    p.username,
    cp.total_points,
    cp.weekly_points,
    cp.current_streak,
    cp.best_streak,
    cp.current_day,
    cp.stage_level
  FROM challenge_progress cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.is_active = true
  ORDER BY cp.weekly_points DESC;
$$;
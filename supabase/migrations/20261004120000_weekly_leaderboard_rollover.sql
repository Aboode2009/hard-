-- Weekly leaderboard reset.
--
-- `weekly_points` is what the leaderboard ranks by. Every point source adds to
-- it, but nothing ever zeroed it: calculate_weekly_champion() existed, yet no
-- job called it (pg_cron was never even installed). So the board was an
-- all-time board and the leader stayed the leader forever.
--
-- Now: at the start of every week — Monday 00:00 Asia/Baghdad, the boundary
-- the leaderboard's "days left" counter already shows — last week's top player
-- is crowned and every user's weekly_points goes back to 0. total_points (the
-- spendable balance) is never touched.
--
-- The rollover is keyed by week in `weekly_rollovers`, so it runs exactly once
-- per week however often it is called. pg_cron calls it every 5 minutes: the
-- reset lands within 5 minutes of midnight, and a missed run catches up on
-- the next one.

CREATE EXTENSION IF NOT EXISTS pg_cron;

------------------------------------------------------------------------------
-- 1) Which weeks have been rolled over
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_rollovers (
  week_start  date PRIMARY KEY,           -- Monday (Baghdad) the week began
  rolled_at   timestamptz NOT NULL DEFAULT now(),
  -- false for the baseline row below: that week did not start from zero, so
  -- its totals are not a real week's and nobody is crowned for it.
  started_clean boolean NOT NULL DEFAULT true
);
ALTER TABLE public.weekly_rollovers ENABLE ROW LEVEL SECURITY;
-- No policies: only SECURITY DEFINER functions and the cron job touch it.

-- The current week is the baseline. The first real reset is the coming Monday;
-- the week that ends then carries points from months back, so it is reset
-- without crowning anyone. Every week after that is a clean week.
INSERT INTO public.weekly_rollovers (week_start, started_clean)
VALUES (date_trunc('week', (now() AT TIME ZONE 'Asia/Baghdad'))::date, false)
ON CONFLICT (week_start) DO NOTHING;

------------------------------------------------------------------------------
-- 2) The rollover
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_weekly_rollover()
RETURNS boolean   -- true when this call performed the week's reset
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date := date_trunc('week', (now() AT TIME ZONE 'Asia/Baghdad'))::date;
  v_prev_start date := v_week_start - 7;
  v_prev_clean boolean;
  v_champion_id text;
  v_champion_points integer;
BEGIN
  -- Claims this week. A concurrent or repeated call finds the row and stops,
  -- so the reset can never run twice in one week.
  INSERT INTO public.weekly_rollovers (week_start) VALUES (v_week_start)
  ON CONFLICT (week_start) DO NOTHING;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Crown last week's leader, but only if that week started from zero.
  SELECT started_clean INTO v_prev_clean
    FROM public.weekly_rollovers WHERE week_start = v_prev_start;

  IF COALESCE(v_prev_clean, false) THEN
    -- Same order as get_leaderboard; company (NASS) employees have their own
    -- board and are left out of the public one, so out of its crown too.
    SELECT cp.user_id, cp.weekly_points
      INTO v_champion_id, v_champion_points
      FROM public.challenge_progress cp
      JOIN public.profiles p ON p.id = cp.user_id
     WHERE cp.is_active = true
       AND cp.weekly_points > 0
       AND p.company_code IS DISTINCT FROM 'NASS'
     ORDER BY cp.weekly_points DESC, cp.total_points DESC
     LIMIT 1;

    IF v_champion_id IS NOT NULL THEN
      INSERT INTO public.weekly_champions (user_id, week_start, week_end, total_points, featured_until)
      VALUES (
        v_champion_id, v_prev_start, v_prev_start + 6, v_champion_points,
        -- Featured on the leaderboard for the whole new week.
        ((v_week_start + 7)::timestamp AT TIME ZONE 'Asia/Baghdad'))
      ON CONFLICT (week_start) DO UPDATE
        SET user_id = EXCLUDED.user_id,
            total_points = EXCLUDED.total_points,
            featured_until = EXCLUDED.featured_until;
    END IF;
  END IF;

  UPDATE public.challenge_progress
     SET weekly_points = 0,
         last_weekly_reset = now()
   WHERE true;  -- every row; explicit for pg-safeupdate

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.run_weekly_rollover() FROM PUBLIC, anon, authenticated;

-- The old, never-scheduled version: wrong week boundary (UTC), a uuid variable
-- for a text id, and it reset unconditionally on every call. Removed so it
-- cannot be called by mistake.
DROP FUNCTION IF EXISTS public.calculate_weekly_champion();

------------------------------------------------------------------------------
-- 3) Schedule
------------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-leaderboard-rollover')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-leaderboard-rollover');
  PERFORM cron.schedule(
    'weekly-leaderboard-rollover',
    '*/5 * * * *',
    'SELECT public.run_weekly_rollover()'
  );
END $$;

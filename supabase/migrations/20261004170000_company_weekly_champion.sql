-- A weekly champion for the NASS company board too.
--
-- The company leaderboard now works like the public one (leagues, last week's
-- champion with the crown, the champion frame). weekly_champions held one row
-- per week; it now holds one per week per board.
--   board = 'public' — everyone except NASS employees (as before)
--   board = 'nass'   — NASS employees only
-- No champion had been crowned yet, so nothing needs moving.

ALTER TABLE public.weekly_champions
  ADD COLUMN IF NOT EXISTS board text NOT NULL DEFAULT 'public';
ALTER TABLE public.weekly_champions DROP CONSTRAINT IF EXISTS weekly_champions_board_check;
ALTER TABLE public.weekly_champions
  ADD CONSTRAINT weekly_champions_board_check CHECK (board IN ('public', 'nass'));
ALTER TABLE public.weekly_champions DROP CONSTRAINT IF EXISTS weekly_champions_week_start_key;
ALTER TABLE public.weekly_champions DROP CONSTRAINT IF EXISTS weekly_champions_week_board_key;
ALTER TABLE public.weekly_champions
  ADD CONSTRAINT weekly_champions_week_board_key UNIQUE (week_start, board);

CREATE OR REPLACE FUNCTION public.run_weekly_rollover()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date := date_trunc('week', (now() AT TIME ZONE 'Asia/Baghdad'))::date;
  v_prev_start date := v_week_start - 7;
  v_prev_clean boolean;
  v_board text;
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

  -- Crown last week's leaders, but only if that week started from zero.
  SELECT started_clean INTO v_prev_clean
    FROM public.weekly_rollovers WHERE week_start = v_prev_start;

  IF COALESCE(v_prev_clean, false) THEN
    FOREACH v_board IN ARRAY ARRAY['public', 'nass'] LOOP
      v_champion_id := NULL;
      -- Same order as the boards; NASS employees are only on their own.
      SELECT cp.user_id, cp.weekly_points
        INTO v_champion_id, v_champion_points
        FROM public.challenge_progress cp
        JOIN public.profiles p ON p.id = cp.user_id
       WHERE cp.weekly_points > 0
         AND CASE WHEN v_board = 'nass'
                  THEN p.company_code = 'NASS'
                  ELSE cp.is_active = true AND p.company_code IS DISTINCT FROM 'NASS' END
       ORDER BY cp.weekly_points DESC, cp.total_points DESC
       LIMIT 1;

      IF v_champion_id IS NOT NULL THEN
        INSERT INTO public.weekly_champions (user_id, week_start, week_end, total_points, featured_until, board)
        VALUES (
          v_champion_id, v_prev_start, v_prev_start + 6, v_champion_points,
          -- Featured on its board for the whole new week.
          ((v_week_start + 7)::timestamp AT TIME ZONE 'Asia/Baghdad'), v_board)
        ON CONFLICT (week_start, board) DO UPDATE
          SET user_id = EXCLUDED.user_id,
              total_points = EXCLUDED.total_points,
              featured_until = EXCLUDED.featured_until;

        -- The champion frame. Kept for good; winning again changes nothing.
        INSERT INTO public.user_inventory (user_id, item_id)
        SELECT v_champion_id, ci.id
          FROM public.cosmetic_items ci
         WHERE ci.type = 'frame' AND ci.css_class = 'frame-golden'
        ON CONFLICT (user_id, item_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.challenge_progress
     SET weekly_points = 0,
         last_weekly_reset = now()
   WHERE true;  -- every row; explicit for pg-safeupdate

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.run_weekly_rollover() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_current_champion();
CREATE OR REPLACE FUNCTION public.get_current_champion(p_board text DEFAULT 'public')
RETURNS TABLE(user_id text, username text, total_points integer, featured_until text,
              avatar_id text, gender text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    wc.user_id::text,
    COALESCE(p.username, 'Anonymous')::text,
    COALESCE(wc.total_points, 0)::integer,
    wc.featured_until::text,
    p.avatar_id::text,
    p.gender::text
  FROM public.weekly_champions wc
  JOIN public.profiles p ON p.id = wc.user_id
  WHERE wc.featured_until > now()
    AND wc.board = COALESCE(p_board, 'public')
  ORDER BY wc.featured_until DESC
  LIMIT 1;
$function$;
GRANT EXECUTE ON FUNCTION public.get_current_champion(text) TO anon, authenticated, service_role;

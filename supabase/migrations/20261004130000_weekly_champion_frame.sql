-- The weekly champion wins the champion frame.
--
-- The leaderboard has always said "Highest weekly points wins the champion
-- frame", but nothing granted one. The frame is the existing legendary
-- "Golden Crown" (css_class 'frame-golden'): the rollover now adds it to the
-- champion's inventory, and it is taken out of the random chest pool so the
-- only way to get it is to win a week.

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

      -- The champion frame. Kept for good; winning again changes nothing.
      INSERT INTO public.user_inventory (user_id, item_id)
      SELECT v_champion_id, ci.id
        FROM public.cosmetic_items ci
       WHERE ci.type = 'frame' AND ci.css_class = 'frame-golden'
      ON CONFLICT (user_id, item_id) DO NOTHING;
    END IF;
  END IF;

  UPDATE public.challenge_progress
     SET weekly_points = 0,
         last_weekly_reset = now()
   WHERE true;  -- every row; explicit for pg-safeupdate

  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.run_weekly_rollover() FROM PUBLIC, anon, authenticated;

-- Random drops (chests, level-ups, the boss chest) never hand out the
-- champion frame.
CREATE OR REPLACE FUNCTION public._pick_cosmetic(p_uid text, p_rarity text DEFAULT NULL::text, p_types text[] DEFAULT NULL::text[], p_weighted boolean DEFAULT false, p_allow_owned boolean DEFAULT true)
 RETURNS cosmetic_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v public.cosmetic_items;
BEGIN
  SELECT ci.* INTO v
  FROM public.cosmetic_items ci
  WHERE ci.is_active
    AND ci.css_class IS DISTINCT FROM 'frame-golden'  -- weekly champions only
    AND (p_rarity IS NULL OR ci.rarity::text = p_rarity)
    AND (p_types IS NULL OR ci.type::text = ANY (p_types))
    AND NOT EXISTS (SELECT 1 FROM public.user_inventory ui
                    WHERE ui.user_id = p_uid AND ui.item_id = ci.id)
  ORDER BY CASE WHEN p_weighted
             THEN -ln(1 - random()) / CASE ci.rarity::text
                    WHEN 'common' THEN 0.50 WHEN 'rare' THEN 0.30
                    WHEN 'epic' THEN 0.15 ELSE 0.05 END
             ELSE random() END
  LIMIT 1;

  IF v.id IS NULL AND p_allow_owned THEN
    SELECT ci.* INTO v
    FROM public.cosmetic_items ci
    WHERE ci.is_active
      AND ci.css_class IS DISTINCT FROM 'frame-golden'
      AND (p_rarity IS NULL OR ci.rarity::text = p_rarity)
      AND (p_types IS NULL OR ci.type::text = ANY (p_types))
    ORDER BY random() LIMIT 1;
  END IF;
  RETURN v;
END $function$;

-- Chest rewards: at most 100 gems from any chest.
--
-- The level-up chest paid up to 500 and the weekly boss chest a flat 500 —
-- more than weeks of finishing tasks (1–10 per task). Both are scaled down
-- by the same factor (÷5) so higher levels still pay more:
--   level 2–4: 5 · 5–9: 10 · 10–19: 20 · 20–29: 40 · 30–49: 60 · 50+: 100
--   weekly boss chest: 100 (also what it adds to the weekly leaderboard)
-- The store chest already tops out at 100 and is unchanged.

CREATE OR REPLACE FUNCTION public.claim_level_up_reward(p_level integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := public._require_uid();
  v_level integer;
  v_bonus integer;
  v_guaranteed text;
  v_lb numeric;
  v_rates numeric[];
  v_roll numeric := random();
  v_rarity text;
  v_item public.cosmetic_items;
BEGIN
  SELECT level INTO v_level FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF p_level IS NULL OR p_level < 2 OR p_level > COALESCE(v_level, 1) THEN
    RAISE EXCEPTION 'level_not_reached' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.level_up_reward_claims WHERE user_id = v_uid AND level = p_level) THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_claimed');
  END IF;

  SELECT b, g INTO v_bonus, v_guaranteed FROM (VALUES
    (p_level >= 50, 100, 'legendary'), (p_level >= 30, 60, 'epic'),
    (p_level >= 20, 40, 'rare'), (p_level >= 10, 20, 'rare'),
    (p_level >= 5, 10, NULL), (true, 5, NULL)) t(ok, b, g)
  WHERE ok LIMIT 1;

  v_lb := LEAST(p_level * 0.005, 0.2);
  v_rates := CASE v_guaranteed
    WHEN 'legendary' THEN ARRAY[0, 0, 0.3, 0.7]
    WHEN 'epic'      THEN ARRAY[0, 0.2, 0.6, 0.2]
    WHEN 'rare'      THEN ARRAY[0.1, 0.5, 0.3, 0.1]
    ELSE ARRAY[GREATEST(0.3, 0.5 - v_lb), 0.3 + v_lb * 0.4, 0.15 + v_lb * 0.4, 0.05 + v_lb * 0.2]
  END;
  v_rarity := CASE
    WHEN v_roll < v_rates[1] THEN 'common'
    WHEN v_roll < v_rates[1] + v_rates[2] THEN 'rare'
    WHEN v_roll < v_rates[1] + v_rates[2] + v_rates[3] THEN 'epic'
    WHEN v_roll < v_rates[1] + v_rates[2] + v_rates[3] + v_rates[4] THEN 'legendary'
    ELSE 'common' END;

  v_item := public._pick_cosmetic(v_uid, v_rarity);
  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_items');
  END IF;

  INSERT INTO public.user_inventory (user_id, item_id) VALUES (v_uid, v_item.id);
  UPDATE public.challenge_progress SET total_points = total_points + v_bonus WHERE user_id = v_uid;
  INSERT INTO public.level_up_reward_claims (user_id, level) VALUES (v_uid, p_level);

  RETURN jsonb_build_object('claimed', true, 'item', public._cosmetic_json(v_item),
                            'bonus_points', v_bonus, 'level', p_level);
END $function$;

CREATE OR REPLACE FUNCTION public.claim_weekly_boss_chest()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := public._require_uid();
  v_today date := public.baghdad_today();
  c_lemons constant integer := 100;
  c_xp constant integer := 1000;
  v_item public.cosmetic_items;
  v_xp jsonb;
BEGIN
  IF extract(isodow FROM v_today) <> 5 THEN
    RAISE EXCEPTION 'not_event_day' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.weekly_boss_claims (user_id, claim_date, outcome)
  VALUES (v_uid, v_today, 'chest')
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'already_claimed' USING ERRCODE = '22023';
  END IF;

  v_item := public._pick_cosmetic(v_uid, NULL, NULL, false, false);
  IF v_item.id IS NOT NULL THEN
    INSERT INTO public.user_inventory (user_id, item_id) VALUES (v_uid, v_item.id);
  END IF;

  v_xp := public._grant_xp(v_uid, c_xp);
  UPDATE public.challenge_progress
     SET total_points = total_points + c_lemons, weekly_points = weekly_points + c_lemons
   WHERE user_id = v_uid;

  RETURN jsonb_build_object('lemons', c_lemons, 'xp', c_xp, 'xp_result', v_xp,
    'cosmetic', CASE WHEN v_item.id IS NULL THEN NULL ELSE
      jsonb_build_object('name', v_item.name, 'name_ar', v_item.name_ar, 'type', v_item.type) END);
END $function$;

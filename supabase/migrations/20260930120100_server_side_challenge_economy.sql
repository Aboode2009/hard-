-- Server-authoritative challenge economy.
--
-- Every change to points, streaks, days, freezes, loot boxes, XP and the
-- inventory now happens inside SECURITY DEFINER functions that compute the
-- values themselves. The client only says *what* happened ("I finished task
-- 3", "buy a freeze"); it never sends a number. The companion migration
-- (…_lock_client_writes) removes the client's ability to write those columns.
--
-- The challenge day is computed here, in Asia/Baghdad, from start_date, and
-- challenge_progress.current_day is kept equal to it — one source of truth.

------------------------------------------------------------------------------
-- Helpers (internal; not callable by clients)
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.baghdad_today()
RETURNS date LANGUAGE sql STABLE SET search_path = public
AS $$ SELECT (now() AT TIME ZONE 'Asia/Baghdad')::date $$;

CREATE OR REPLACE FUNCTION public.challenge_stage_days(p_stage integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT CASE p_stage WHEN 2 THEN 45 WHEN 3 THEN 75 ELSE 21 END $$;

-- Days in the challenge the user is looking at: NASS is a flat 30.
CREATE OR REPLACE FUNCTION public._challenge_max_days(p_mode text, p_stage integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT CASE WHEN p_mode = 'nass' THEN 30 ELSE public.challenge_stage_days(p_stage) END $$;

-- Calendar day of the challenge, 1-based, Baghdad time, capped at the length.
CREATE OR REPLACE FUNCTION public.challenge_day_for(p_start date, p_max integer)
RETURNS integer LANGUAGE sql STABLE SET search_path = public
AS $$ SELECT GREATEST(1, LEAST((public.baghdad_today() - p_start) + 1, p_max)) $$;

-- Same table as HostageVault.getStreakBonus on the client.
CREATE OR REPLACE FUNCTION public._streak_bonus(p_streak integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE WHEN COALESCE(p_streak, 0) <= 0 THEN 10
              ELSE (ARRAY[10, 30, 50, 70, 90, 130, 150])[(p_streak % 7) + 1] END
$$;

-- The fixed tasks of each challenge, id -> title (titles match the client).
CREATE OR REPLACE FUNCTION public._required_tasks(p_mode text, p_stage integer)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE
    WHEN p_mode = 'nass' THEN
      '{"1":"kindWord","2":"focus45","3":"noSocialMedia","4":"attendance"}'::jsonb
    WHEN p_stage = 2 THEN
      '{"1":"sport","2":"sleep","3":"water","4":"reading","5":"noSugar",
        "7":"coldShower","8":"dailyTask","9":"communityService"}'::jsonb
    WHEN p_stage = 3 THEN
      '{"1":"sport","2":"sleep","3":"water","4":"reading","5":"noSugar",
        "7":"coldShower","8":"dailyTask","9":"talkToStranger","10":"makeDawa"}'::jsonb
    ELSE
      '{"1":"sport","2":"sleep","3":"water","4":"reading","5":"noSugar"}'::jsonb
  END
$$;

-- Wheel-of-Life area for each default task (mirrors Index.tsx).
CREATE OR REPLACE FUNCTION public._task_life_area(p_title text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE p_title
    WHEN 'sport' THEN 'fitness'
    WHEN 'sleep' THEN 'health' WHEN 'water' THEN 'health'
    WHEN 'noSugar' THEN 'health' WHEN 'coldShower' THEN 'health'
    WHEN 'reading' THEN 'learning'
    WHEN 'dailyTask' THEN 'work'
    WHEN 'communityService' THEN 'relationships' WHEN 'talkToStranger' THEN 'relationships'
    WHEN 'makeDawa' THEN 'religion'
  END
$$;

CREATE OR REPLACE FUNCTION public._require_uid()
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public
AS $$
DECLARE v text := (auth.uid())::text;
BEGIN
  IF v IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public._check_mode(p_uid text, p_mode text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_mode NOT IN ('main', 'nass') THEN
    RAISE EXCEPTION 'invalid_mode' USING ERRCODE = '22023';
  END IF;
  IF p_mode = 'nass' AND NOT public.has_company_access(p_uid) THEN
    RAISE EXCEPTION 'company_access_required' USING ERRCODE = '42501';
  END IF;
END $$;

-- XP grant without the client-facing cap; same level formula as add_xp.
CREATE OR REPLACE FUNCTION public._grant_xp(p_uid text, p_amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_xp integer; v_level integer; v_new_xp integer; v_new_level integer;
BEGIN
  SELECT xp, level INTO v_xp, v_level FROM public.profiles WHERE id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('new_xp', 0, 'new_level', 1, 'leveled_up', false);
  END IF;
  v_new_xp := COALESCE(v_xp, 0) + GREATEST(0, p_amount);
  v_new_level := 1 + floor(sqrt(v_new_xp::float / 100))::integer;
  UPDATE public.profiles SET xp = v_new_xp, level = v_new_level WHERE id = p_uid;
  RETURN jsonb_build_object('new_xp', v_new_xp, 'new_level', v_new_level,
                            'leveled_up', v_new_level > COALESCE(v_level, 1));
END $$;

-- Weighted pick from cosmetic_items; prefers items the user does not own.
-- Returns NULL when nothing matches.
CREATE OR REPLACE FUNCTION public._pick_cosmetic(
  p_uid text, p_rarity text DEFAULT NULL, p_types text[] DEFAULT NULL,
  p_weighted boolean DEFAULT false, p_allow_owned boolean DEFAULT true)
RETURNS public.cosmetic_items LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v public.cosmetic_items;
BEGIN
  SELECT ci.* INTO v
  FROM public.cosmetic_items ci
  WHERE ci.is_active
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
      AND (p_rarity IS NULL OR ci.rarity::text = p_rarity)
      AND (p_types IS NULL OR ci.type::text = ANY (p_types))
    ORDER BY random() LIMIT 1;
  END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public._cosmetic_json(v public.cosmetic_items)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT CASE WHEN v.id IS NULL THEN NULL ELSE to_jsonb(v) END $$;

-- Locks the caller's row, applies the missed-day rules and keeps
-- current_day equal to the calendar day. Returns what it did.
CREATE OR REPLACE FUNCTION public._evaluate_progress(p_uid text, p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.challenge_progress;
  v_day integer;
  v_missed integer[];
  v_n integer;
  v_freezes_used integer := 0;
  v_reset boolean := false;
BEGIN
  SELECT * INTO r FROM public.challenge_progress WHERE user_id = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.challenge_progress (user_id, start_date)
    VALUES (p_uid, public.baghdad_today())
    ON CONFLICT ON CONSTRAINT challenge_progress_user_id_key DO NOTHING;
    SELECT * INTO r FROM public.challenge_progress WHERE user_id = p_uid FOR UPDATE;
  END IF;

  v_day := public.challenge_day_for(r.start_date, public._challenge_max_days(p_mode, r.stage_level));

  SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_missed
  FROM generate_series(1, v_day - 1) d
  WHERE NOT (COALESCE(r.completed_days, '[]'::jsonb) @> jsonb_build_array(d));
  v_n := COALESCE(array_length(v_missed, 1), 0);

  IF v_n > 0 THEN
    IF p_mode = 'main' AND r.streak_freezes >= v_n THEN
      -- One Streak Freeze per missed day covers it.
      UPDATE public.challenge_progress
         SET completed_days = (
               SELECT COALESCE(jsonb_agg(x ORDER BY x), '[]'::jsonb)
               FROM (SELECT DISTINCT x FROM (
                       SELECT jsonb_array_elements_text(COALESCE(r.completed_days, '[]'::jsonb))::int AS x
                       UNION ALL SELECT unnest(v_missed)) s) u),
             streak_freezes = r.streak_freezes - v_n,
             current_day = v_day
       WHERE user_id = p_uid;
      v_freezes_used := v_n;
    ELSE
      UPDATE public.challenge_progress
         SET current_day = 1,
             current_streak = 0,
             completed_days = '[]'::jsonb,
             start_date = public.baghdad_today(),
             tasks_state = '{}'::jsonb
       WHERE user_id = p_uid;
      v_reset := true;
      v_day := 1;
    END IF;
  ELSIF r.current_day IS DISTINCT FROM v_day THEN
    UPDATE public.challenge_progress SET current_day = v_day WHERE user_id = p_uid;
  END IF;

  RETURN jsonb_build_object('freezes_used', v_freezes_used, 'was_reset', v_reset, 'current_day', v_day);
END $$;

-- The row as the client needs it, with the computed day.
CREATE OR REPLACE FUNCTION public._progress_json(p_uid text, p_mode text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'current_day', cp.current_day,
    'stage_level', cp.stage_level,
    'stage_days', public._challenge_max_days(p_mode, cp.stage_level),
    'start_date', cp.start_date,
    'current_streak', cp.current_streak,
    'best_streak', cp.best_streak,
    'completed_days', cp.completed_days,
    'tasks_state', cp.tasks_state,
    'today_tasks', COALESCE(cp.tasks_state -> ('day_' || cp.current_day), '{}'::jsonb),
    'total_points', cp.total_points,
    'weekly_points', cp.weekly_points,
    'streak_freezes', cp.streak_freezes)
  FROM public.challenge_progress cp WHERE cp.user_id = p_uid
$$;

-- Loot box every 3 consecutive perfect days (all required + all active custom
-- tasks done, and the day completed). Mirrors useLootBoxReward.
CREATE OR REPLACE FUNCTION public._check_loot_box_streak(p_uid text, p_mode text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.challenge_progress;
  v_key text;
  v_state jsonb;
  v_consec integer := 0;
  v_saved integer;
  d integer;
BEGIN
  SELECT * INTO r FROM public.challenge_progress WHERE user_id = p_uid;
  IF NOT FOUND THEN RETURN false; END IF;
  v_key := 'day_' || r.current_day;
  v_state := COALESCE(r.tasks_state -> v_key, '{}'::jsonb);

  IF NOT (COALESCE(r.completed_days, '[]'::jsonb) @> jsonb_build_array(r.current_day)) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(public._required_tasks(p_mode, r.stage_level)) k
             WHERE COALESCE((v_state ->> k)::boolean, false) = false) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.custom_tasks ct
             WHERE ct.user_id = p_uid AND ct.is_active
               AND COALESCE((v_state ->> ('custom_' || ct.id))::boolean, false) = false) THEN
    RETURN false;
  END IF;

  d := r.current_day;
  WHILE d >= 1 AND r.completed_days @> jsonb_build_array(d) LOOP
    v_consec := v_consec + 1;
    d := d - 1;
  END LOOP;

  SELECT COALESCE(last_loot_box_streak, 0) INTO v_saved FROM public.profiles WHERE id = p_uid FOR UPDATE;

  IF v_consec >= 3 AND (v_consec / 3) > (v_saved / 3) THEN
    UPDATE public.profiles
       SET loot_boxes = loot_boxes + 1, last_loot_box_streak = v_consec
     WHERE id = p_uid;
    RETURN true;
  ELSIF v_consec <> v_saved THEN
    UPDATE public.profiles SET last_loot_box_streak = v_consec WHERE id = p_uid;
  END IF;
  RETURN false;
END $$;

------------------------------------------------------------------------------
-- Client-facing RPCs
------------------------------------------------------------------------------

-- Run on every load of the challenge screen. Replaces the client-side
-- "missed a day" logic (freeze consumption / reset) and returns the state.
CREATE OR REPLACE FUNCTION public.evaluate_missed_days(p_mode text DEFAULT 'main')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_uid text := public._require_uid(); v_eval jsonb;
BEGIN
  PERFORM public._check_mode(v_uid, p_mode);
  v_eval := public._evaluate_progress(v_uid, p_mode);
  RETURN public._progress_json(v_uid, p_mode) || jsonb_build_object(
    'freezes_used', v_eval -> 'freezes_used', 'was_reset', v_eval -> 'was_reset');
END $$;

-- Marks one fixed task done for today. Idempotent; completions are final.
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id integer, p_mode text DEFAULT 'main')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  r public.challenge_progress;
  v_tasks jsonb;
  v_title text;
  v_key text;
  v_points integer;
  v_xp jsonb := NULL;
BEGIN
  PERFORM public._check_mode(v_uid, p_mode);
  PERFORM public._evaluate_progress(v_uid, p_mode);
  SELECT * INTO r FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;

  v_tasks := public._required_tasks(p_mode, r.stage_level);
  v_title := v_tasks ->> p_task_id::text;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'unknown_task' USING ERRCODE = '22023';
  END IF;

  -- The attendance task can only be ticked by a real check-in today.
  IF p_mode = 'nass' AND v_title = 'attendance' AND NOT EXISTS (
       SELECT 1 FROM public.attendance_records
       WHERE user_id = v_uid AND entry_date = public.baghdad_today()) THEN
    RAISE EXCEPTION 'attendance_not_recorded' USING ERRCODE = '42501';
  END IF;

  v_key := 'day_' || r.current_day;
  IF COALESCE((r.tasks_state -> v_key ->> p_task_id::text)::boolean, false) THEN
    RETURN public._progress_json(v_uid, p_mode)
           || jsonb_build_object('awarded', false, 'points', 0, 'xp', NULL);
  END IF;

  v_points := CASE WHEN p_mode = 'nass' THEN public._streak_bonus(r.current_streak)
                   ELSE LEAST((r.current_day / 2) + 1, 10) END;

  UPDATE public.challenge_progress
     SET tasks_state = jsonb_set(COALESCE(tasks_state, '{}'::jsonb), ARRAY[v_key],
           COALESCE(tasks_state -> v_key, '{}'::jsonb) || jsonb_build_object(p_task_id::text, true)),
         total_points = total_points + v_points,
         weekly_points = weekly_points + v_points
   WHERE user_id = v_uid;

  INSERT INTO public.task_completions (user_id, task_key, points_earned)
  VALUES (v_uid, CASE WHEN p_mode = 'nass' THEN 'nass_' || v_title ELSE v_title END, v_points);

  v_xp := public._grant_xp(v_uid, 10);

  RETURN public._progress_json(v_uid, p_mode)
         || jsonb_build_object('awarded', true, 'points', v_points, 'xp', v_xp,
                               'loot_box_awarded', public._check_loot_box_streak(v_uid, p_mode));
END $$;

-- Marks one of the user's own custom tasks done for today.
CREATE OR REPLACE FUNCTION public.complete_custom_task(p_task_id uuid, p_mode text DEFAULT 'main')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  r public.challenge_progress;
  v_title text;
  v_key text;
  v_ckey text := 'custom_' || p_task_id::text;
  v_points integer;
  v_xp jsonb;
BEGIN
  PERFORM public._check_mode(v_uid, p_mode);

  SELECT title INTO v_title FROM public.custom_tasks
   WHERE id = p_task_id AND user_id = v_uid AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_task' USING ERRCODE = '22023';
  END IF;

  PERFORM public._evaluate_progress(v_uid, p_mode);
  SELECT * INTO r FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;
  v_key := 'day_' || r.current_day;

  IF COALESCE((r.tasks_state -> v_key ->> v_ckey)::boolean, false) THEN
    RETURN public._progress_json(v_uid, p_mode)
           || jsonb_build_object('awarded', false, 'points', 0, 'xp', NULL);
  END IF;

  v_points := CASE WHEN p_mode = 'nass' THEN 1 ELSE LEAST((r.current_day / 2) + 1, 10) END;

  UPDATE public.challenge_progress
     SET tasks_state = jsonb_set(COALESCE(tasks_state, '{}'::jsonb), ARRAY[v_key],
           COALESCE(tasks_state -> v_key, '{}'::jsonb) || jsonb_build_object(v_ckey, true)),
         total_points = total_points + v_points,
         weekly_points = weekly_points + v_points
   WHERE user_id = v_uid;

  INSERT INTO public.task_completions (user_id, task_key, points_earned)
  VALUES (v_uid, COALESCE(v_title, v_ckey), v_points);

  v_xp := public._grant_xp(v_uid, 10);

  RETURN public._progress_json(v_uid, p_mode)
         || jsonb_build_object('awarded', true, 'points', v_points, 'xp', v_xp,
                               'loot_box_awarded', public._check_loot_box_streak(v_uid, p_mode));
END $$;

-- Finishes today. Verifies every required task, computes the streak, day
-- points, stage bonus and stage advancement on the server.
CREATE OR REPLACE FUNCTION public.complete_day(p_mode text DEFAULT 'main')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  r public.challenge_progress;
  v_tasks jsonb;
  v_key text;
  v_state jsonb;
  v_max integer;
  v_new_streak integer;
  v_best integer;
  v_custom_done integer := 0;
  v_day_points integer := 0;
  v_bonus integer := 0;
  v_stage_advanced boolean := false;
  v_all_done boolean := false;
  v_xp jsonb := NULL;
  v_completed jsonb;
BEGIN
  PERFORM public._check_mode(v_uid, p_mode);
  PERFORM public._evaluate_progress(v_uid, p_mode);
  SELECT * INTO r FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;

  v_key := 'day_' || r.current_day;
  v_state := COALESCE(r.tasks_state -> v_key, '{}'::jsonb);
  v_tasks := public._required_tasks(p_mode, r.stage_level);
  v_max := public._challenge_max_days(p_mode, r.stage_level);

  IF COALESCE(r.completed_days, '[]'::jsonb) @> jsonb_build_array(r.current_day) THEN
    RETURN public._progress_json(v_uid, p_mode) || jsonb_build_object('already_completed', true);
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_tasks) k
             WHERE COALESCE((v_state ->> k)::boolean, false) = false) THEN
    RAISE EXCEPTION 'tasks_incomplete' USING ERRCODE = '22023';
  END IF;

  v_new_streak := r.current_streak + 1;
  v_best := GREATEST(r.best_streak, v_new_streak);
  v_completed := COALESCE(r.completed_days, '[]'::jsonb) || jsonb_build_array(r.current_day);

  IF p_mode = 'nass' THEN
    UPDATE public.challenge_progress
       SET completed_days = v_completed, current_streak = v_new_streak, best_streak = v_best
     WHERE user_id = v_uid;
    v_xp := public._grant_xp(v_uid, 50);
    v_all_done := r.current_day >= v_max;
  ELSE
    SELECT count(*) INTO v_custom_done FROM public.custom_tasks ct
     WHERE ct.user_id = v_uid AND ct.is_active
       AND COALESCE((v_state ->> ('custom_' || ct.id))::boolean, false);

    v_day_points := (SELECT count(*) FROM jsonb_object_keys(v_tasks))::int + v_custom_done
                    + public._streak_bonus(r.current_streak);

    -- Wheel of Life history (was recordTaskCompletions on the client).
    INSERT INTO public.task_completions (user_id, task_key, tag_id, points_earned)
    SELECT v_uid, t.value, lat.id, 1
      FROM jsonb_each_text(v_tasks) t
      LEFT JOIN public.life_area_tags lat ON lat.name = public._task_life_area(t.value);
    INSERT INTO public.task_completions (user_id, task_key, tag_id, points_earned)
    SELECT v_uid, 'custom_' || ct.id, ct.tag_id, 1
      FROM public.custom_tasks ct
     WHERE ct.user_id = v_uid AND ct.is_active
       AND COALESCE((v_state ->> ('custom_' || ct.id))::boolean, false);

    IF r.current_day >= v_max THEN
      v_bonus := CASE r.stage_level WHEN 1 THEN 500 WHEN 2 THEN 1000 ELSE 2000 END;
      IF r.stage_level < 3 THEN
        UPDATE public.challenge_progress
           SET stage_level = r.stage_level + 1,
               current_day = 1,
               current_streak = v_new_streak,
               best_streak = v_best,
               completed_days = '[]'::jsonb,
               start_date = public.baghdad_today(),
               tasks_state = '{}'::jsonb,
               total_points = total_points + v_day_points + v_bonus
         WHERE user_id = v_uid;
        v_stage_advanced := true;
      ELSE
        -- Final day of the final stage: recorded, so it cannot be paid twice.
        UPDATE public.challenge_progress
           SET completed_days = v_completed,
               current_streak = v_new_streak,
               best_streak = v_best,
               total_points = total_points + v_day_points + v_bonus
         WHERE user_id = v_uid;
        v_all_done := true;
      END IF;
    ELSE
      UPDATE public.challenge_progress
         SET completed_days = v_completed,
             current_streak = v_new_streak,
             best_streak = v_best,
             total_points = total_points + v_day_points
       WHERE user_id = v_uid;
    END IF;
  END IF;

  RETURN public._progress_json(v_uid, p_mode) || jsonb_build_object(
    'already_completed', false,
    'completed_day', r.current_day,
    'day_points', v_day_points,
    'stage_bonus', v_bonus,
    'stage_advanced', v_stage_advanced,
    'all_stages_completed', v_all_done,
    'xp', v_xp,
    'loot_box_awarded', CASE WHEN v_stage_advanced THEN false
                             ELSE public._check_loot_box_streak(v_uid, p_mode) END);
END $$;

-- Streak Freeze: 200 points, at most 2 held.
CREATE OR REPLACE FUNCTION public.buy_streak_freeze()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  r public.challenge_progress;
  c_price constant integer := 200;
  c_max constant integer := 2;
BEGIN
  SELECT * INTO r FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_progress' USING ERRCODE = 'P0002'; END IF;
  IF r.streak_freezes >= c_max THEN RAISE EXCEPTION 'max_freezes' USING ERRCODE = '22023'; END IF;
  IF r.total_points < c_price THEN RAISE EXCEPTION 'insufficient_points' USING ERRCODE = '22023'; END IF;

  UPDATE public.challenge_progress
     SET total_points = total_points - c_price, streak_freezes = streak_freezes + 1
   WHERE user_id = v_uid
  RETURNING total_points, streak_freezes INTO r.total_points, r.streak_freezes;

  RETURN jsonb_build_object('total_points', r.total_points, 'streak_freezes', r.streak_freezes);
END $$;

-- Store treasure chest: 50 points, guaranteed weighted coins, 25% cosmetic.
CREATE OR REPLACE FUNCTION public.open_chest()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_total integer;
  c_price constant integer := 50;
  v_roll double precision := random() * 100;
  v_coins integer;
  v_rarity text;
  v_item public.cosmetic_items;
BEGIN
  SELECT total_points INTO v_total FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'no_progress' USING ERRCODE = 'P0002'; END IF;
  IF v_total < c_price THEN RAISE EXCEPTION 'insufficient_points' USING ERRCODE = '22023'; END IF;

  -- weights: 10:30 20:25 30:18 40:12 50:8 75:5 100:2
  v_coins := CASE WHEN v_roll < 30 THEN 10 WHEN v_roll < 55 THEN 20 WHEN v_roll < 73 THEN 30
                  WHEN v_roll < 85 THEN 40 WHEN v_roll < 93 THEN 50 WHEN v_roll < 98 THEN 75
                  ELSE 100 END;

  IF random() < 0.25 THEN
    v_roll := random();
    v_rarity := CASE WHEN v_roll < 0.55 THEN 'common' WHEN v_roll < 0.82 THEN 'rare'
                     WHEN v_roll < 0.95 THEN 'epic' ELSE 'legendary' END;
    v_item := public._pick_cosmetic(v_uid, v_rarity, ARRAY['theme', 'badge']);
    IF v_item.id IS NOT NULL THEN
      INSERT INTO public.user_inventory (user_id, item_id) VALUES (v_uid, v_item.id);
    END IF;
  END IF;

  UPDATE public.challenge_progress
     SET total_points = total_points - c_price + v_coins
   WHERE user_id = v_uid
  RETURNING total_points INTO v_total;

  RETURN jsonb_build_object('coins', v_coins, 'item', public._cosmetic_json(v_item),
                            'total_points', v_total);
END $$;

-- Opens one earned loot box (badges, rarity-weighted, unowned first).
CREATE OR REPLACE FUNCTION public.open_loot_box()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_boxes integer;
  v_item public.cosmetic_items;
  v_duplicate boolean;
BEGIN
  SELECT loot_boxes INTO v_boxes FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF COALESCE(v_boxes, 0) <= 0 THEN RAISE EXCEPTION 'no_loot_boxes' USING ERRCODE = '22023'; END IF;

  v_item := public._pick_cosmetic(v_uid, NULL, ARRAY['badge'], true, true);
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'no_items' USING ERRCODE = 'P0002'; END IF;

  v_duplicate := EXISTS (SELECT 1 FROM public.user_inventory
                         WHERE user_id = v_uid AND item_id = v_item.id);
  IF NOT v_duplicate THEN
    INSERT INTO public.user_inventory (user_id, item_id) VALUES (v_uid, v_item.id);
  END IF;

  UPDATE public.profiles SET loot_boxes = loot_boxes - 1 WHERE id = v_uid
  RETURNING loot_boxes INTO v_boxes;

  RETURN jsonb_build_object('item', public._cosmetic_json(v_item),
                            'duplicate', v_duplicate, 'loot_boxes', v_boxes);
END $$;

-- One reward per level reached, ever.
CREATE TABLE IF NOT EXISTS public.level_up_reward_claims (
  user_id text NOT NULL,
  level integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, level)
);
ALTER TABLE public.level_up_reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own level claims" ON public.level_up_reward_claims;
CREATE POLICY "Users view own level claims" ON public.level_up_reward_claims
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
REVOKE ALL ON public.level_up_reward_claims FROM anon, authenticated;
GRANT SELECT ON public.level_up_reward_claims TO authenticated;

-- Levels users already reached were rewarded by the old client flow.
INSERT INTO public.level_up_reward_claims (user_id, level)
SELECT p.id, g FROM public.profiles p, generate_series(2, p.level) g
WHERE p.level >= 2
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_level_up_reward(p_level integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_level integer;
  v_bonus integer;
  v_guaranteed text;
  v_lb numeric;
  v_rates numeric[];   -- common, rare, epic, legendary
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
    (p_level >= 50, 500, 'legendary'), (p_level >= 30, 300, 'epic'),
    (p_level >= 20, 200, 'rare'), (p_level >= 10, 100, 'rare'),
    (p_level >= 5, 50, NULL), (true, 25, NULL)) t(ok, b, g)
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
    -- Nothing to give yet; left unclaimed so it can be claimed later.
    RETURN jsonb_build_object('claimed', false, 'reason', 'no_items');
  END IF;

  INSERT INTO public.user_inventory (user_id, item_id) VALUES (v_uid, v_item.id);
  UPDATE public.challenge_progress SET total_points = total_points + v_bonus WHERE user_id = v_uid;
  INSERT INTO public.level_up_reward_claims (user_id, level) VALUES (v_uid, p_level);

  RETURN jsonb_build_object('claimed', true, 'item', public._cosmetic_json(v_item),
                            'bonus_points', v_bonus, 'level', p_level);
END $$;

-- Weekly boss (Fridays, Baghdad): one outcome per user per Friday.
CREATE TABLE IF NOT EXISTS public.weekly_boss_claims (
  user_id text NOT NULL,
  claim_date date NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('chest', 'penalty')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, claim_date)
);
ALTER TABLE public.weekly_boss_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own boss claims" ON public.weekly_boss_claims;
CREATE POLICY "Users view own boss claims" ON public.weekly_boss_claims
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
REVOKE ALL ON public.weekly_boss_claims FROM anon, authenticated;
GRANT SELECT ON public.weekly_boss_claims TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_weekly_boss_chest()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_today date := public.baghdad_today();
  c_lemons constant integer := 500;
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
END $$;

CREATE OR REPLACE FUNCTION public.apply_weekly_boss_penalty()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_today date := public.baghdad_today();
  v_total integer;
  v_penalty integer := 0;
BEGIN
  INSERT INTO public.weekly_boss_claims (user_id, claim_date, outcome)
  VALUES (v_uid, v_today, 'penalty')
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('penalty', 0);
  END IF;

  SELECT total_points INTO v_total FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;
  IF COALESCE(v_total, 0) > 0 THEN
    v_penalty := floor(v_total * 0.5);
    UPDATE public.challenge_progress SET total_points = total_points - v_penalty WHERE user_id = v_uid;
  END IF;
  RETURN jsonb_build_object('penalty', v_penalty);
END $$;

-- Theme store purchase.
CREATE OR REPLACE FUNCTION public.buy_theme(p_theme_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_price integer;
  v_default boolean;
  v_total integer;
BEGIN
  SELECT price, is_default INTO v_price, v_default FROM public.themes WHERE id = p_theme_id;
  IF NOT FOUND OR v_default THEN RAISE EXCEPTION 'unknown_theme' USING ERRCODE = '22023'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_themes WHERE user_id = v_uid AND theme_id = p_theme_id) THEN
    RAISE EXCEPTION 'already_owned' USING ERRCODE = '22023';
  END IF;

  SELECT total_points INTO v_total FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;
  IF COALESCE(v_total, 0) < v_price THEN RAISE EXCEPTION 'insufficient_points' USING ERRCODE = '22023'; END IF;

  UPDATE public.challenge_progress SET total_points = total_points - v_price
   WHERE user_id = v_uid RETURNING total_points INTO v_total;
  INSERT INTO public.user_themes (user_id, theme_id, is_active) VALUES (v_uid, p_theme_id, false);

  RETURN jsonb_build_object('total_points', v_total);
END $$;

-- NASS store rewards (prices live here, not in the client).
CREATE OR REPLACE FUNCTION public.redeem_nass_reward(p_reward_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_cost integer;
  v_total integer;
BEGIN
  PERFORM public._check_mode(v_uid, 'nass');
  v_cost := CASE p_reward_id
    WHEN 'cash_reward' THEN 50000 WHEN 'two_hours_off' THEN 5000 WHEN 'remote_day' THEN 8000 END;
  IF v_cost IS NULL THEN RAISE EXCEPTION 'unknown_reward' USING ERRCODE = '22023'; END IF;

  SELECT total_points INTO v_total FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;
  IF COALESCE(v_total, 0) < v_cost THEN RAISE EXCEPTION 'insufficient_points' USING ERRCODE = '22023'; END IF;

  UPDATE public.challenge_progress SET total_points = total_points - v_cost
   WHERE user_id = v_uid RETURNING total_points INTO v_total;
  INSERT INTO public.task_completions (user_id, task_key, points_earned)
  VALUES (v_uid, 'nass_reward_' || p_reward_id, -v_cost);

  RETURN jsonb_build_object('total_points', v_total);
END $$;

-- Company code: premium only (TASK = opt back out, always allowed).
CREATE OR REPLACE FUNCTION public.set_company_code(p_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := public._require_uid();
  v_code text := upper(trim(COALESCE(p_code, '')));
BEGIN
  IF v_code = '' OR length(v_code) > 32 THEN
    RAISE EXCEPTION 'invalid_code' USING ERRCODE = '22023';
  END IF;
  IF v_code <> 'TASK' AND NOT public.is_premium_active(v_uid) THEN
    RAISE EXCEPTION 'premium_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET company_code = v_code WHERE id = v_uid;
  RETURN v_code;
END $$;

-- Leaderboard shows the computed day, not a stored counter.
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(user_id text, username text, current_streak integer, best_streak integer,
              current_day integer, stage_level integer, total_points integer,
              weekly_points integer, is_premium boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    cp.user_id::text,
    COALESCE(p.username, 'Anonymous')::text,
    COALESCE(cp.current_streak, 0)::integer,
    COALESCE(cp.best_streak, 0)::integer,
    public.challenge_day_for(cp.start_date,
      public._challenge_max_days(CASE WHEN p.company_code = 'NASS' THEN 'nass' ELSE 'main' END,
                                 COALESCE(cp.stage_level, 1)))::integer,
    COALESCE(cp.stage_level, 1)::integer,
    COALESCE(cp.total_points, 0)::integer,
    COALESCE(cp.weekly_points, 0)::integer,
    COALESCE(p.is_premium AND (p.premium_until IS NULL OR p.premium_until > now()), false)
  FROM public.challenge_progress cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.is_active = true
  ORDER BY cp.weekly_points DESC, cp.total_points DESC;
$$;

-- New rows start on the Baghdad date, not the UTC one.
ALTER TABLE public.challenge_progress ALTER COLUMN start_date SET DEFAULT public.baghdad_today();

-- Bring every stored current_day in line with the calendar day.
UPDATE public.challenge_progress cp
   SET current_day = public.challenge_day_for(cp.start_date,
         public._challenge_max_days(
           CASE WHEN p.company_code = 'NASS' THEN 'nass' ELSE 'main' END, cp.stage_level))
  FROM public.profiles p
 WHERE p.id = cp.user_id;

------------------------------------------------------------------------------
-- Execute grants
------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION
  public._require_uid(), public._check_mode(text, text), public._grant_xp(text, integer),
  public._pick_cosmetic(text, text, text[], boolean, boolean),
  public._cosmetic_json(public.cosmetic_items),
  public._evaluate_progress(text, text), public._progress_json(text, text),
  public._check_loot_box_streak(text, text),
  public._challenge_max_days(text, integer), public._streak_bonus(integer),
  public._required_tasks(text, integer), public._task_life_area(text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.evaluate_missed_days(text), public.complete_task(integer, text),
  public.complete_custom_task(uuid, text), public.complete_day(text),
  public.buy_streak_freeze(), public.open_chest(), public.open_loot_box(),
  public.claim_level_up_reward(integer), public.claim_weekly_boss_chest(),
  public.apply_weekly_boss_penalty(), public.buy_theme(uuid),
  public.redeem_nass_reward(text), public.set_company_code(text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.evaluate_missed_days(text), public.complete_task(integer, text),
  public.complete_custom_task(uuid, text), public.complete_day(text),
  public.buy_streak_freeze(), public.open_chest(), public.open_loot_box(),
  public.claim_level_up_reward(integer), public.claim_weekly_boss_chest(),
  public.apply_weekly_boss_penalty(), public.buy_theme(uuid),
  public.redeem_nass_reward(text), public.set_company_code(text)
TO authenticated;


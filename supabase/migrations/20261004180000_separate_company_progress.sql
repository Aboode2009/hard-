-- The company (NASS) challenge gets its own progress, separate from the main one.
--
-- Both challenges used ONE challenge_progress row: one tasks_state keyed by
-- task number, one completed_days, one day count and streak. Task numbers
-- overlap (company 1–4 = kind word, focus, no social media, attendance;
-- main 1–4 = sport, sleep, water, reading), so ticking a company task ticked
-- the main task with the same number, and finishing either day finished both.
--
-- Now:
--   * public.nass_progress holds the company challenge's day, streak, completed
--     days and task state, one row per employee;
--   * challenge_progress keeps the main challenge — and the single point
--     balance (total_points / weekly_points), which both challenges still pay
--     into;
--   * every function taking p_mode reads and writes the right one.
-- Existing employees' current progress is copied in, so no streak is lost.

------------------------------------------------------------------------------
-- 1) The table
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nass_progress (
  user_id        text PRIMARY KEY,
  current_day    integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak    integer NOT NULL DEFAULT 0,
  completed_days jsonb   NOT NULL DEFAULT '[]'::jsonb,
  start_date     date    NOT NULL DEFAULT public.baghdad_today(),
  tasks_state    jsonb   NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nass_progress ENABLE ROW LEVEL SECURITY;
-- Written only by the SECURITY DEFINER functions below.
REVOKE ALL ON public.nass_progress FROM anon, authenticated;
GRANT SELECT ON public.nass_progress TO authenticated;
DROP POLICY IF EXISTS "Signed-in users can view company progress" ON public.nass_progress;
-- Same exposure as challenge_progress: the company board shows colleagues'
-- day and streak.
CREATE POLICY "Signed-in users can view company progress" ON public.nass_progress
  FOR SELECT TO authenticated USING (true);

-- Carry over what employees have today.
INSERT INTO public.nass_progress (user_id, current_day, current_streak, best_streak,
                                  completed_days, start_date, tasks_state)
SELECT cp.user_id, COALESCE(cp.current_day, 1), COALESCE(cp.current_streak, 0),
       COALESCE(cp.best_streak, 0), COALESCE(cp.completed_days, '[]'::jsonb),
       COALESCE(cp.start_date, public.baghdad_today()), COALESCE(cp.tasks_state, '{}'::jsonb)
  FROM public.challenge_progress cp
  JOIN public.profiles p ON p.id = cp.user_id
 WHERE p.company_code = 'NASS'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public._ensure_nass_progress(p_uid text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  INSERT INTO public.nass_progress (user_id) VALUES (p_uid) ON CONFLICT (user_id) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public._ensure_nass_progress(text) FROM PUBLIC, anon, authenticated;

------------------------------------------------------------------------------
-- 2) Missed days and the current day
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._evaluate_progress(p_uid text, p_mode text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.challenge_progress;
  n public.nass_progress;
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

  IF p_mode = 'nass' THEN
    -- The company challenge: its own row, no streak freezes.
    PERFORM public._ensure_nass_progress(p_uid);
    SELECT * INTO n FROM public.nass_progress WHERE user_id = p_uid FOR UPDATE;
    v_day := public.challenge_day_for(n.start_date, public._challenge_max_days('nass', 1));

    SELECT COALESCE(array_agg(d ORDER BY d), '{}')
      INTO v_missed
    FROM generate_series(1, v_day - 1) d
    WHERE NOT (COALESCE(n.completed_days, '[]'::jsonb) @> jsonb_build_array(d));
    v_n := COALESCE(array_length(v_missed, 1), 0);

    IF v_n > 0 THEN
      UPDATE public.nass_progress
         SET current_day = 1,
             current_streak = 0,
             completed_days = '[]'::jsonb,
             start_date = public.baghdad_today(),
             tasks_state = '{}'::jsonb,
             updated_at = now()
       WHERE user_id = p_uid;
      v_reset := true;
      v_day := 1;
    ELSIF n.current_day IS DISTINCT FROM v_day THEN
      UPDATE public.nass_progress SET current_day = v_day, updated_at = now() WHERE user_id = p_uid;
    END IF;

    RETURN jsonb_build_object('freezes_used', 0, 'was_reset', v_reset, 'current_day', v_day);
  END IF;

  v_day := public.challenge_day_for(r.start_date, public._challenge_max_days(p_mode, r.stage_level));

  SELECT COALESCE(array_agg(d ORDER BY d), '{}')
    INTO v_missed
  FROM generate_series(1, v_day - 1) d
  WHERE NOT (COALESCE(r.completed_days, '[]'::jsonb) @> jsonb_build_array(d));
  v_n := COALESCE(array_length(v_missed, 1), 0);

  IF v_n > 0 THEN
    IF p_mode = 'main' AND r.streak_freezes >= v_n THEN
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
END $function$;

------------------------------------------------------------------------------
-- 3) What the app is told
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._progress_json(p_uid text, p_mode text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_mode = 'nass' THEN
    jsonb_build_object(
      'current_day', COALESCE(n.current_day, 1),
      'stage_level', 1,
      'stage_days', public._challenge_max_days('nass', 1),
      'start_date', n.start_date,
      'current_streak', COALESCE(n.current_streak, 0),
      'best_streak', COALESCE(n.best_streak, 0),
      'completed_days', COALESCE(n.completed_days, '[]'::jsonb),
      'tasks_state', COALESCE(n.tasks_state, '{}'::jsonb),
      'today_tasks', COALESCE(n.tasks_state -> ('day_' || n.current_day), '{}'::jsonb),
      'total_points', cp.total_points,
      'weekly_points', cp.weekly_points,
      'streak_freezes', cp.streak_freezes)
  ELSE
    jsonb_build_object(
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
  END
  FROM public.challenge_progress cp
  LEFT JOIN public.nass_progress n ON n.user_id = cp.user_id
  WHERE cp.user_id = p_uid
$function$;

------------------------------------------------------------------------------
-- 4) Loot box streak (3 perfect days in a row)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._check_loot_box_streak(p_uid text, p_mode text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_day integer;
  v_stage integer;
  v_completed jsonb;
  v_tasks_state jsonb;
  v_state jsonb;
  v_consec integer := 0;
  v_saved integer;
  d integer;
BEGIN
  IF p_mode = 'nass' THEN
    SELECT current_day, 1, completed_days, tasks_state
      INTO v_day, v_stage, v_completed, v_tasks_state
      FROM public.nass_progress WHERE user_id = p_uid;
  ELSE
    SELECT current_day, stage_level, completed_days, tasks_state
      INTO v_day, v_stage, v_completed, v_tasks_state
      FROM public.challenge_progress WHERE user_id = p_uid;
  END IF;
  IF NOT FOUND THEN RETURN false; END IF;

  v_completed := COALESCE(v_completed, '[]'::jsonb);
  v_state := COALESCE(v_tasks_state -> ('day_' || v_day), '{}'::jsonb);

  IF NOT (v_completed @> jsonb_build_array(v_day)) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(public._required_tasks(p_mode, v_stage)) k
             WHERE COALESCE((v_state ->> k)::boolean, false) = false) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.custom_tasks ct
             WHERE ct.user_id = p_uid AND ct.is_active
               AND COALESCE((v_state ->> ('custom_' || ct.id))::boolean, false) = false) THEN
    RETURN false;
  END IF;

  d := v_day;
  WHILE d >= 1 AND v_completed @> jsonb_build_array(d) LOOP
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
END $function$;

------------------------------------------------------------------------------
-- 5) Completing a task
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id integer, p_mode text DEFAULT 'main'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := public._require_uid();
  r public.challenge_progress;
  n public.nass_progress;
  v_tasks jsonb;
  v_title text;
  v_key text;
  v_points integer;
  v_xp jsonb := NULL;
BEGIN
  PERFORM public._check_mode(v_uid, p_mode);
  PERFORM public._evaluate_progress(v_uid, p_mode);

  IF p_mode = 'nass' THEN
    SELECT * INTO n FROM public.nass_progress WHERE user_id = v_uid FOR UPDATE;
    v_tasks := public._required_tasks('nass', 1);
    v_title := v_tasks ->> p_task_id::text;
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'unknown_task' USING ERRCODE = '22023';
    END IF;
    IF v_title = 'attendance' AND NOT EXISTS (
         SELECT 1 FROM public.attendance_records
         WHERE user_id = v_uid AND entry_date = public.baghdad_today()) THEN
      RAISE EXCEPTION 'attendance_not_recorded' USING ERRCODE = '42501';
    END IF;

    v_key := 'day_' || n.current_day;
    IF COALESCE((n.tasks_state -> v_key ->> p_task_id::text)::boolean, false) THEN
      RETURN public._progress_json(v_uid, p_mode)
             || jsonb_build_object('awarded', false, 'points', 0, 'xp', NULL);
    END IF;

    v_points := public._streak_bonus(n.current_streak);

    UPDATE public.nass_progress
       SET tasks_state = jsonb_set(COALESCE(tasks_state, '{}'::jsonb), ARRAY[v_key],
             COALESCE(tasks_state -> v_key, '{}'::jsonb) || jsonb_build_object(p_task_id::text, true)),
           updated_at = now()
     WHERE user_id = v_uid;
    -- One balance for both challenges.
    UPDATE public.challenge_progress
       SET total_points = total_points + v_points,
           weekly_points = weekly_points + v_points
     WHERE user_id = v_uid;

    INSERT INTO public.task_completions (user_id, task_key, points_earned)
    VALUES (v_uid, 'nass_' || v_title, v_points);

    v_xp := public._grant_xp(v_uid, 10);

    RETURN public._progress_json(v_uid, p_mode)
           || jsonb_build_object('awarded', true, 'points', v_points, 'xp', v_xp,
                                 'loot_box_awarded', public._check_loot_box_streak(v_uid, p_mode));
  END IF;

  SELECT * INTO r FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;

  v_tasks := public._required_tasks(p_mode, r.stage_level);
  v_title := v_tasks ->> p_task_id::text;
  IF v_title IS NULL THEN
    RAISE EXCEPTION 'unknown_task' USING ERRCODE = '22023';
  END IF;

  v_key := 'day_' || r.current_day;
  IF COALESCE((r.tasks_state -> v_key ->> p_task_id::text)::boolean, false) THEN
    RETURN public._progress_json(v_uid, p_mode)
           || jsonb_build_object('awarded', false, 'points', 0, 'xp', NULL);
  END IF;

  v_points := LEAST((r.current_day / 2) + 1, 10);

  UPDATE public.challenge_progress
     SET tasks_state = jsonb_set(COALESCE(tasks_state, '{}'::jsonb), ARRAY[v_key],
           COALESCE(tasks_state -> v_key, '{}'::jsonb) || jsonb_build_object(p_task_id::text, true)),
         total_points = total_points + v_points,
         weekly_points = weekly_points + v_points
   WHERE user_id = v_uid;

  INSERT INTO public.task_completions (user_id, task_key, points_earned)
  VALUES (v_uid, v_title, v_points);

  v_xp := public._grant_xp(v_uid, 10);

  RETURN public._progress_json(v_uid, p_mode)
         || jsonb_build_object('awarded', true, 'points', v_points, 'xp', v_xp,
                               'loot_box_awarded', public._check_loot_box_streak(v_uid, p_mode));
END $function$;

CREATE OR REPLACE FUNCTION public.complete_custom_task(p_task_id uuid, p_mode text DEFAULT 'main'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := public._require_uid();
  v_day integer;
  v_state jsonb;
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
  IF p_mode = 'nass' THEN
    SELECT current_day, tasks_state INTO v_day, v_state FROM public.nass_progress WHERE user_id = v_uid FOR UPDATE;
  ELSE
    SELECT current_day, tasks_state INTO v_day, v_state FROM public.challenge_progress WHERE user_id = v_uid FOR UPDATE;
  END IF;
  v_key := 'day_' || v_day;

  IF COALESCE((v_state -> v_key ->> v_ckey)::boolean, false) THEN
    RETURN public._progress_json(v_uid, p_mode)
           || jsonb_build_object('awarded', false, 'points', 0, 'xp', NULL);
  END IF;

  v_points := CASE WHEN p_mode = 'nass' THEN 1 ELSE LEAST((v_day / 2) + 1, 10) END;

  IF p_mode = 'nass' THEN
    UPDATE public.nass_progress
       SET tasks_state = jsonb_set(COALESCE(tasks_state, '{}'::jsonb), ARRAY[v_key],
             COALESCE(tasks_state -> v_key, '{}'::jsonb) || jsonb_build_object(v_ckey, true)),
           updated_at = now()
     WHERE user_id = v_uid;
    UPDATE public.challenge_progress
       SET total_points = total_points + v_points,
           weekly_points = weekly_points + v_points
     WHERE user_id = v_uid;
  ELSE
    UPDATE public.challenge_progress
       SET tasks_state = jsonb_set(COALESCE(tasks_state, '{}'::jsonb), ARRAY[v_key],
             COALESCE(tasks_state -> v_key, '{}'::jsonb) || jsonb_build_object(v_ckey, true)),
           total_points = total_points + v_points,
           weekly_points = weekly_points + v_points
     WHERE user_id = v_uid;
  END IF;

  INSERT INTO public.task_completions (user_id, task_key, points_earned)
  VALUES (v_uid, COALESCE(v_title, v_ckey), v_points);

  v_xp := public._grant_xp(v_uid, 10);

  RETURN public._progress_json(v_uid, p_mode)
         || jsonb_build_object('awarded', true, 'points', v_points, 'xp', v_xp,
                               'loot_box_awarded', public._check_loot_box_streak(v_uid, p_mode));
END $function$;

------------------------------------------------------------------------------
-- 6) Finishing the day
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_day(p_mode text DEFAULT 'main'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text := public._require_uid();
  r public.challenge_progress;
  n public.nass_progress;
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

  IF p_mode = 'nass' THEN
    SELECT * INTO n FROM public.nass_progress WHERE user_id = v_uid FOR UPDATE;
    v_key := 'day_' || n.current_day;
    v_state := COALESCE(n.tasks_state -> v_key, '{}'::jsonb);
    v_tasks := public._required_tasks('nass', 1);
    v_max := public._challenge_max_days('nass', 1);

    IF COALESCE(n.completed_days, '[]'::jsonb) @> jsonb_build_array(n.current_day) THEN
      RETURN public._progress_json(v_uid, p_mode) || jsonb_build_object('already_completed', true);
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_tasks) k
               WHERE COALESCE((v_state ->> k)::boolean, false) = false) THEN
      RAISE EXCEPTION 'tasks_incomplete' USING ERRCODE = '22023';
    END IF;

    v_new_streak := n.current_streak + 1;
    UPDATE public.nass_progress
       SET completed_days = COALESCE(n.completed_days, '[]'::jsonb) || jsonb_build_array(n.current_day),
           current_streak = v_new_streak,
           best_streak = GREATEST(n.best_streak, v_new_streak),
           updated_at = now()
     WHERE user_id = v_uid;
    v_xp := public._grant_xp(v_uid, 50);
    v_all_done := n.current_day >= v_max;

    RETURN public._progress_json(v_uid, p_mode) || jsonb_build_object(
      'already_completed', false,
      'completed_day', n.current_day,
      'day_points', 0,
      'stage_bonus', 0,
      'stage_advanced', false,
      'all_stages_completed', v_all_done,
      'xp', v_xp,
      'loot_box_awarded', public._check_loot_box_streak(v_uid, p_mode));
  END IF;

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

  SELECT count(*) INTO v_custom_done FROM public.custom_tasks ct
   WHERE ct.user_id = v_uid AND ct.is_active
     AND COALESCE((v_state ->> ('custom_' || ct.id))::boolean, false);

  v_day_points := (SELECT count(*) FROM jsonb_object_keys(v_tasks))::int + v_custom_done
                  + public._streak_bonus(r.current_streak);

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
END $function$;

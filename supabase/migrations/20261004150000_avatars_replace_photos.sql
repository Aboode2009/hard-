-- Built-in avatars replace uploaded profile photos.
--
-- The app ships eight drawn avatars (src/assets/avatars). A profile stores only
-- which one the user picked, in `avatar_id`; NULL means "the default for my
-- gender" (resolved in the app — src/lib/avatars.ts). Photos are gone:
--   * every stored avatar_url is cleared, and the column can no longer be set
--     from the app (a trigger nulls it);
--   * ensure_my_profile no longer copies the Google/OAuth picture;
--   * the avatars bucket no longer accepts uploads (the files already in it
--     are removed through the Storage API, which owns that table).
-- The leaderboard and the weekly champion now return avatar_id and gender so
-- every row can draw the right avatar.

------------------------------------------------------------------------------
-- 1) The chosen avatar
------------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_id text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_id_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_id_check
  CHECK (avatar_id IS NULL OR avatar_id IN
    ('boy-1', 'boy-2', 'boy-3', 'boy-4', 'girl-1', 'girl-2', 'girl-3', 'girl-4'));

GRANT UPDATE (avatar_id) ON public.profiles TO authenticated;

------------------------------------------------------------------------------
-- 2) No more photos
------------------------------------------------------------------------------
UPDATE public.profiles SET avatar_url = NULL WHERE avatar_url IS NOT NULL;

CREATE OR REPLACE FUNCTION public.profiles_no_avatar_url()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.avatar_url := NULL;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.profiles_no_avatar_url() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_no_avatar_url ON public.profiles;
CREATE TRIGGER profiles_no_avatar_url
  BEFORE INSERT OR UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW WHEN (NEW.avatar_url IS NOT NULL)
  EXECUTE FUNCTION public.profiles_no_avatar_url();

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

-- Same function as before, minus the photo: the row is created without one.
CREATE OR REPLACE FUNCTION public.ensure_my_profile(
  p_username text DEFAULT NULL::text,
  p_avatar_url text DEFAULT NULL::text,
  p_company_code text DEFAULT NULL::text)
RETURNS TABLE(profile_id text, profile_username text, is_new boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid     text := (auth.uid())::text;
  v_base    text;
  v_name    text;
  v_try     int := 0;
  v_created boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = v_uid) THEN
    v_base := lower(regexp_replace(COALESCE(NULLIF(trim(p_username), ''), 'user'),
                                   '[^A-Za-z0-9_.؀-ۿ]', '', 'g'));
    IF v_base = '' THEN v_base := 'user'; END IF;
    v_base := left(v_base, 24);
    v_name := v_base;

    WHILE EXISTS (SELECT 1 FROM public.profiles pr WHERE lower(pr.username) = lower(v_name)) LOOP
      v_try := v_try + 1;
      v_name := v_base || floor(random() * 9000 + 1000)::int::text;
      IF v_try > 20 THEN
        v_name := v_base || substr(md5(v_uid || clock_timestamp()::text), 1, 6);
        EXIT;
      END IF;
    END LOOP;

    BEGIN
      INSERT INTO public.profiles AS pr (id, username, company_code)
      VALUES (v_uid, v_name, NULLIF(trim(p_company_code), ''))
      ON CONFLICT ON CONSTRAINT profiles_pkey DO NOTHING;
      v_created := FOUND;
    EXCEPTION WHEN unique_violation THEN
      INSERT INTO public.profiles AS pr (id, username, company_code)
      VALUES (v_uid, v_base || substr(md5(v_uid || clock_timestamp()::text), 1, 6),
              NULLIF(trim(p_company_code), ''))
      ON CONFLICT ON CONSTRAINT profiles_pkey DO NOTHING;
      v_created := FOUND;
    END;
  END IF;

  INSERT INTO public.challenge_progress AS cp (user_id)
  VALUES (v_uid)
  ON CONFLICT ON CONSTRAINT challenge_progress_user_id_key DO NOTHING;

  RETURN QUERY
    SELECT pr.id, pr.username, v_created FROM public.profiles pr WHERE pr.id = v_uid;
END;
$function$;

------------------------------------------------------------------------------
-- 3) Leaderboard + champion carry the avatar
------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_leaderboard();
CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(user_id text, username text, current_streak integer, best_streak integer,
              current_day integer, stage_level integer, total_points integer,
              weekly_points integer, is_premium boolean, avatar_id text, gender text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    COALESCE(p.is_premium AND (p.premium_until IS NULL OR p.premium_until > now()), false),
    p.avatar_id::text,
    p.gender::text
  FROM public.challenge_progress cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE cp.is_active = true
  ORDER BY cp.weekly_points DESC, cp.total_points DESC;
$function$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_current_champion();
CREATE FUNCTION public.get_current_champion()
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
  ORDER BY wc.featured_until DESC
  LIMIT 1;
$function$;
GRANT EXECUTE ON FUNCTION public.get_current_champion() TO anon, authenticated, service_role;

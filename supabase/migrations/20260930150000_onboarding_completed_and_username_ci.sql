-- Welcome flow: explicit completion marker, case-insensitive unique usernames,
-- and an ensure_my_profile that never touches an existing username.

------------------------------------------------------------------------------
-- 1) Explicit "onboarding finished" marker
------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Every account that exists today is past the welcome flow.
UPDATE public.profiles
   SET onboarding_completed_at = now()
 WHERE onboarding_completed_at IS NULL;

-- Finishes the welcome flow: saves the answers and sets the marker once.
CREATE OR REPLACE FUNCTION public.complete_onboarding(p_age integer, p_gender text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid text := (auth.uid())::text;
  v_done timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  IF p_age IS NULL OR p_age < 1 OR p_age > 120 THEN
    RAISE EXCEPTION 'invalid_age' USING ERRCODE = '22023';
  END IF;
  IF p_gender IS NULL OR p_gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'invalid_gender' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
     SET age = p_age,
         gender = p_gender,
         onboarding_completed_at = COALESCE(onboarding_completed_at, now())
   WHERE id = v_uid
  RETURNING onboarding_completed_at INTO v_done;

  IF v_done IS NULL THEN RAISE EXCEPTION 'no_profile' USING ERRCODE = 'P0002'; END IF;
  RETURN v_done;
END $$;

REVOKE ALL ON FUNCTION public.complete_onboarding(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(integer, text) TO authenticated;

-- Accounts that sign up on the previous app build (which saves age and gender
-- directly) get the marker too, so they are not shown the flow again after
-- updating the app.
CREATE OR REPLACE FUNCTION public.mark_onboarding_from_answers()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed_at IS NULL
     AND NEW.age IS NOT NULL AND NEW.gender IS NOT NULL THEN
    NEW.onboarding_completed_at := now();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mark_onboarding_from_answers() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_mark_onboarding ON public.profiles;
CREATE TRIGGER profiles_mark_onboarding
  BEFORE UPDATE OF age, gender ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.mark_onboarding_from_answers();

------------------------------------------------------------------------------
-- 2) Usernames: unique regardless of letter case, trimmed, 1–30 chars
------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_check
  CHECK (username = btrim(username) AND char_length(username) BETWEEN 1 AND 30);

------------------------------------------------------------------------------
-- 3) ensure_my_profile: sets the username only when it creates the row.
--    Collision check is now case-insensitive to match the index above;
--    otherwise a sign-up could collide with "Ahmed" and fail outright.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_my_profile(
  p_username text DEFAULT NULL::text,
  p_avatar_url text DEFAULT NULL::text,
  p_company_code text DEFAULT NULL::text)
RETURNS TABLE(profile_id text, profile_username text, is_new boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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

  -- Existing row: nothing is written, so a name chosen on the welcome screen
  -- (or in Profile) is never replaced by the Google/email one on later calls.
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
      INSERT INTO public.profiles AS pr (id, username, avatar_url, company_code)
      VALUES (v_uid, v_name, p_avatar_url, NULLIF(trim(p_company_code), ''))
      ON CONFLICT ON CONSTRAINT profiles_pkey DO NOTHING;
      v_created := FOUND;
    EXCEPTION WHEN unique_violation THEN
      -- Lost a race for the same name: fall back to a name that cannot clash.
      INSERT INTO public.profiles AS pr (id, username, avatar_url, company_code)
      VALUES (v_uid, v_base || substr(md5(v_uid || clock_timestamp()::text), 1, 6),
              p_avatar_url, NULLIF(trim(p_company_code), ''))
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
$$;

------------------------------------------------------------------------------
-- 4) RLS: a user may update only their own row (explicit WITH CHECK, and
--    only for signed-in users). Which columns are writable is decided by the
--    column grants in 20260930120200_lock_client_writes.sql
--    (username, avatar_url, age, gender, equipped_*).
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((auth.uid())::text = id)
  WITH CHECK ((auth.uid())::text = id);

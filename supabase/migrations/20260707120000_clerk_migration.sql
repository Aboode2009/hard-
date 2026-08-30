-- =====================================================================
-- MIGRATION: Supabase Auth  ->  Clerk (third-party auth)
-- Identity now comes from the Clerk JWT: auth.jwt() ->> 'sub' (text).
-- =====================================================================
BEGIN;

-- 1) Remove the auth.users signup trigger + function (Clerk never touches auth.users).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2) Drop ALL existing RLS policies (they reference auth.uid() and the columns
--    we are about to retype). They are recreated in Clerk form at the end.
DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete any progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Users can view all progress for leaderboard" ON public.challenge_progress;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Users can view their own reminders" ON public.task_reminders;
DROP POLICY IF EXISTS "Users can insert their own reminders" ON public.task_reminders;
DROP POLICY IF EXISTS "Users can update their own reminders" ON public.task_reminders;
DROP POLICY IF EXISTS "Users can delete their own reminders" ON public.task_reminders;
DROP POLICY IF EXISTS "Users can view their own photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Users can view their own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own progress photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can view backups" ON public.backups;
DROP POLICY IF EXISTS "Only admins can create backups" ON public.backups;
DROP POLICY IF EXISTS "Only admins can delete backups" ON public.backups;
DROP POLICY IF EXISTS "Everyone can view life area tags" ON public.life_area_tags;
DROP POLICY IF EXISTS "Users can view own custom tasks" ON public.custom_tasks;
DROP POLICY IF EXISTS "Users can create own custom tasks" ON public.custom_tasks;
DROP POLICY IF EXISTS "Users can update own custom tasks" ON public.custom_tasks;
DROP POLICY IF EXISTS "Users can delete own custom tasks" ON public.custom_tasks;
DROP POLICY IF EXISTS "Users can view own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Allow insert for password reset" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Allow select for verification" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Allow update for marking used" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Everyone can view weekly champions" ON public.weekly_champions;
DROP POLICY IF EXISTS "Only system can insert champions" ON public.weekly_champions;
DROP POLICY IF EXISTS "Only system can delete champions" ON public.weekly_champions;
DROP POLICY IF EXISTS "Users can view their own mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Users can create their own mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Users can update their own mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Users can delete their own mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "Everyone can view active products" ON public.store_products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.store_products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.store_products;
DROP POLICY IF EXISTS "Admins can update products" ON public.store_products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.store_products;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "No direct access" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own completions" ON public.task_completions;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public avatar access" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view themes" ON public.themes;
DROP POLICY IF EXISTS "Admins can insert themes" ON public.themes;
DROP POLICY IF EXISTS "Admins can update themes" ON public.themes;
DROP POLICY IF EXISTS "Admins can delete themes" ON public.themes;
DROP POLICY IF EXISTS "Users can view own themes" ON public.user_themes;
DROP POLICY IF EXISTS "Users can purchase themes" ON public.user_themes;
DROP POLICY IF EXISTS "Users can update own themes" ON public.user_themes;
DROP POLICY IF EXISTS "No updates to referrals" ON public.referrals;
DROP POLICY IF EXISTS "No deletes to referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all challenge progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Admins can update any challenge progress" ON public.challenge_progress;
DROP POLICY IF EXISTS "Admins can view all progress photos" ON public.progress_photos;
DROP POLICY IF EXISTS "Admins can view all task reminders" ON public.task_reminders;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Admins can view all custom tasks" ON public.custom_tasks;
DROP POLICY IF EXISTS "Admins can view all task completions" ON public.task_completions;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own categories" ON public.focus_categories;
DROP POLICY IF EXISTS "Users can create their own categories" ON public.focus_categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.focus_categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.focus_categories;
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.focus_tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.focus_tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.focus_tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.focus_tasks;
DROP POLICY IF EXISTS "Users can view subtasks of their tasks" ON public.focus_subtasks;
DROP POLICY IF EXISTS "Users can create subtasks for their tasks" ON public.focus_subtasks;
DROP POLICY IF EXISTS "Users can update subtasks of their tasks" ON public.focus_subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks of their tasks" ON public.focus_subtasks;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.focus_sessions;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.focus_settings;
DROP POLICY IF EXISTS "Users can create their own settings" ON public.focus_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.focus_settings;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.coach_messages;
DROP POLICY IF EXISTS "Users can create their own messages" ON public.coach_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.coach_messages;
DROP POLICY IF EXISTS "Everyone can view active cosmetic items" ON public.cosmetic_items;
DROP POLICY IF EXISTS "Admins can manage cosmetic items" ON public.cosmetic_items;
DROP POLICY IF EXISTS "Users can view own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can insert into own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can delete from own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Everyone can view boss fights" ON public.boss_fights;
DROP POLICY IF EXISTS "Admins can manage boss fights" ON public.boss_fights;
DROP POLICY IF EXISTS "Users can view all damage contributions" ON public.boss_damage;
DROP POLICY IF EXISTS "Users can insert own damage" ON public.boss_damage;
DROP POLICY IF EXISTS "Users can update own damage" ON public.boss_damage;
-- 3) Drop the old uuid-signature helper functions so only text versions remain.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.add_xp(uuid, integer);
DROP FUNCTION IF EXISTS public.deal_boss_damage(uuid, integer);
DROP FUNCTION IF EXISTS public.process_referral(uuid, text);
DROP FUNCTION IF EXISTS public.get_users_with_roles();

-- 4/5) Drop FKs that reference auth.users or public.profiles, or that sit on an
--      identity column. Non-identity public->public FKs are kept.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname, ns.nspname AS sch, cl.relname AS tbl
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cl.relnamespace
    WHERE con.contype = 'f' AND ns.nspname = 'public'
      AND (
        con.confrelid IN ('auth.users'::regclass, 'public.profiles'::regclass)
        OR EXISTS (
          SELECT 1 FROM unnest(con.conkey) AS ck
          JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck
          WHERE a.attname IN ('user_id','referrer_id','referred_id','referred_by','created_by')
        )
      )
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.sch, r.tbl, r.conname);
  END LOOP;
END $$;

-- 6) Convert every identity column from uuid to text.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'uuid'
      AND ( (table_name = 'profiles' AND column_name = 'id')
         OR column_name IN ('user_id','referrer_id','referred_id','referred_by','created_by') )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
                   r.table_name, r.column_name, r.column_name);
  END LOOP;
END $$;

-- 7) Recreate the public->public FK (challenge_progress.user_id -> profiles.id), text-to-text.
ALTER TABLE public.challenge_progress
  ADD CONSTRAINT challenge_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 8) Default user_id from the Clerk token on insert.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'user_id' AND data_type = 'text'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT (auth.jwt() ->> ''sub'')', r.table_name);
  END LOOP;
END $$;

-- 9) Helper + Clerk-aware functions.
CREATE OR REPLACE FUNCTION public.requesting_user_id() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT auth.jwt() ->> 'sub' $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id text, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.has_role(auth.jwt() ->> 'sub', 'admin') $$;

CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE(id text, username text, email text, created_at timestamptz, role text)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT p.id, p.username, 'N/A'::text, p.created_at, ur.role::text
      FROM public.profiles p LEFT JOIN public.user_roles ur ON ur.user_id = p.id
      ORDER BY p.created_at DESC $$;

CREATE OR REPLACE FUNCTION public.add_xp(p_user_id text, p_amount integer)
RETURNS TABLE(new_xp integer, new_level integer, leveled_up boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current_xp integer; v_current_level integer; v_new_xp integer; v_new_level integer; v_leveled_up boolean := false;
BEGIN
  SELECT xp, level INTO v_current_xp, v_current_level FROM public.profiles WHERE id = p_user_id;
  v_new_xp := COALESCE(v_current_xp,0) + p_amount;
  v_new_level := 1 + floor(sqrt(v_new_xp::float/100))::integer;
  v_leveled_up := v_new_level > COALESCE(v_current_level,1);
  UPDATE public.profiles SET xp = v_new_xp, level = v_new_level WHERE id = p_user_id;
  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up;
END; $$;

CREATE OR REPLACE FUNCTION public.deal_boss_damage(p_user_id text, p_damage integer)
RETURNS TABLE(new_hp integer, is_defeated boolean, xp_earned integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_boss_id uuid; v_current_hp integer; v_new_hp integer; v_is_defeated boolean := false; v_xp_earned integer := 0;
BEGIN
  v_boss_id := get_or_create_weekly_boss();
  SELECT bf.current_hp INTO v_current_hp FROM public.boss_fights bf WHERE bf.id = v_boss_id AND bf.is_defeated = false;
  IF v_current_hp IS NULL THEN RETURN QUERY SELECT 0, true, 0; RETURN; END IF;
  v_new_hp := GREATEST(0, v_current_hp - p_damage); v_is_defeated := v_new_hp = 0;
  UPDATE public.boss_fights SET current_hp = v_new_hp, is_defeated = v_is_defeated,
    defeated_at = CASE WHEN v_is_defeated THEN now() ELSE NULL END WHERE id = v_boss_id;
  INSERT INTO public.boss_damage (user_id, boss_fight_id, damage_dealt, attacks_count)
    VALUES (p_user_id, v_boss_id, p_damage, 1)
    ON CONFLICT (user_id, boss_fight_id) DO UPDATE SET damage_dealt = boss_damage.damage_dealt + p_damage,
      attacks_count = boss_damage.attacks_count + 1, updated_at = now();
  IF v_is_defeated THEN v_xp_earned := 500;
    UPDATE public.profiles p SET xp = p.xp + 500, loot_boxes = p.loot_boxes + 1
      FROM public.boss_damage bd WHERE bd.boss_fight_id = v_boss_id AND bd.user_id = p.id;
  END IF;
  RETURN QUERY SELECT v_new_hp, v_is_defeated, v_xp_earned;
END; $$;

CREATE OR REPLACE FUNCTION public.process_referral(p_new_user_id text, p_referral_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_referrer_id text; v_referrer_total_referrals integer; v_points_per_referral integer := 100;
BEGIN
  SELECT id, total_referrals INTO v_referrer_id, v_referrer_total_referrals FROM profiles WHERE referral_code = p_referral_code;
  IF v_referrer_id IS NULL THEN RETURN; END IF;
  IF v_referrer_id = p_new_user_id THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_new_user_id) THEN RETURN; END IF;
  UPDATE profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;
  INSERT INTO referrals (referrer_id, referred_id, points_awarded) VALUES (v_referrer_id, p_new_user_id, v_points_per_referral);
  UPDATE profiles SET total_referrals = COALESCE(total_referrals,0) + 1 WHERE id = v_referrer_id;
END; $$;

-- 10) Recreate all RLS policies in Clerk form (auth.jwt() ->> 'sub').
CREATE POLICY "Admins can delete any profile" ON public.profiles FOR DELETE TO authenticated USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'::public.app_role));
CREATE POLICY "Admins can delete any progress" ON public.challenge_progress FOR DELETE TO authenticated USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'::public.app_role));
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'::public.app_role));
CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'::public.app_role));
CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role((auth.jwt() ->> 'sub'), 'admin'::public.app_role));
CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'::public.app_role));
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (((auth.jwt() ->> 'sub') = id));
CREATE POLICY "Users can insert own progress" ON public.challenge_progress FOR INSERT WITH CHECK (((auth.jwt() ->> 'sub') = user_id));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (((auth.jwt() ->> 'sub') = id));
CREATE POLICY "Users can update own progress" ON public.challenge_progress FOR UPDATE USING (((auth.jwt() ->> 'sub') = user_id));
CREATE POLICY "Users can view all progress for leaderboard" ON public.challenge_progress FOR SELECT USING (true);
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view own progress" ON public.challenge_progress FOR SELECT USING (((auth.jwt() ->> 'sub') = user_id));
CREATE POLICY "Users can view their own reminders"
  ON public.task_reminders
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can insert their own reminders"
  ON public.task_reminders
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own reminders"
  ON public.task_reminders
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own reminders"
  ON public.task_reminders
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view their own photos"
  ON public.progress_photos
  FOR SELECT
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can insert their own photos"
  ON public.progress_photos
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own photos"
  ON public.progress_photos
  FOR UPDATE
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own photos"
  ON public.progress_photos
  FOR DELETE
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view their own progress photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'progress-photos' AND (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own progress photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'progress-photos' AND (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own progress photos"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'progress-photos' AND (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own progress photos"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'progress-photos' AND (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view their own photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos' 
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')::text
);
CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' 
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')::text
);
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'progress-photos' 
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')::text
);
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos' 
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')::text
);
CREATE POLICY "Only admins can view backups"
ON public.backups
FOR SELECT
USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'::app_role));
CREATE POLICY "Only admins can create backups"
ON public.backups
FOR INSERT
WITH CHECK (public.has_role((auth.jwt() ->> 'sub'), 'admin'::app_role));
CREATE POLICY "Only admins can delete backups"
ON public.backups
FOR DELETE
USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'::app_role));
CREATE POLICY "Everyone can view life area tags" 
ON public.life_area_tags 
FOR SELECT 
USING (true);
CREATE POLICY "Users can view own custom tasks" 
ON public.custom_tasks 
FOR SELECT 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can create own custom tasks" 
ON public.custom_tasks 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update own custom tasks" 
ON public.custom_tasks 
FOR UPDATE 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete own custom tasks" 
ON public.custom_tasks 
FOR DELETE 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view own completions" 
ON public.task_completions 
FOR SELECT 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can insert own completions" 
ON public.task_completions 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Allow insert for password reset" 
ON public.password_reset_otps 
FOR INSERT 
WITH CHECK (true);
CREATE POLICY "Allow select for verification" 
ON public.password_reset_otps 
FOR SELECT 
USING (true);
CREATE POLICY "Allow update for marking used" 
ON public.password_reset_otps 
FOR UPDATE 
USING (true);
CREATE POLICY "Everyone can view weekly champions" 
ON public.weekly_champions 
FOR SELECT 
USING (true);
CREATE POLICY "Only system can insert champions" 
ON public.weekly_champions 
FOR INSERT 
WITH CHECK (has_role((auth.jwt() ->> 'sub'), 'admin'::app_role));
CREATE POLICY "Only system can delete champions" 
ON public.weekly_champions 
FOR DELETE 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'::app_role));
CREATE POLICY "Users can view their own mood entries" 
ON public.mood_entries 
FOR SELECT 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can create their own mood entries" 
ON public.mood_entries 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own mood entries" 
ON public.mood_entries 
FOR UPDATE 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own mood entries" 
ON public.mood_entries 
FOR DELETE 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view their own referrals"
ON public.referrals
FOR SELECT
USING ((auth.jwt() ->> 'sub') = referrer_id);
CREATE POLICY "Users can insert referrals"
ON public.referrals
FOR INSERT
WITH CHECK ((auth.jwt() ->> 'sub') = referrer_id);
CREATE POLICY "Everyone can view active products"
ON public.store_products
FOR SELECT
USING (is_active = true);
CREATE POLICY "Admins can view all products"
ON public.store_products
FOR SELECT
USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can insert products"
ON public.store_products
FOR INSERT
WITH CHECK (public.has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can update products"
ON public.store_products
FOR UPDATE
USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can delete products"
ON public.store_products
FOR DELETE
USING (public.has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND public.has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND public.has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND public.has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "No direct access" ON public.password_reset_otps
FOR ALL TO anon, authenticated
USING (false);
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
CREATE POLICY "Users can delete own completions"
  ON public.task_completions FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'sub') = id);
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (auth.jwt() ->> 'sub')::text = (storage.foldername(name))[1]
);
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
CREATE POLICY "Everyone can view themes"
ON public.themes FOR SELECT
USING (true);
CREATE POLICY "Admins can insert themes"
ON public.themes FOR INSERT
WITH CHECK (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can update themes"
ON public.themes FOR UPDATE
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can delete themes"
ON public.themes FOR DELETE
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Users can view own themes"
ON public.user_themes FOR SELECT
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can purchase themes"
ON public.user_themes FOR INSERT
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update own themes"
ON public.user_themes FOR UPDATE
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "No updates to referrals" 
ON public.referrals 
FOR UPDATE 
USING (false);
CREATE POLICY "No deletes to referrals" 
ON public.referrals 
FOR DELETE 
USING (false);
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all challenge progress" 
ON public.challenge_progress 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can update any challenge progress" 
ON public.challenge_progress 
FOR UPDATE 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all progress photos" 
ON public.progress_photos 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all task reminders" 
ON public.task_reminders 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all mood entries" 
ON public.mood_entries 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all custom tasks" 
ON public.custom_tasks 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all task completions" 
ON public.task_completions 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'));
CREATE POLICY "Users can view their own categories" ON public.focus_categories FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can create their own categories" ON public.focus_categories FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own categories" ON public.focus_categories FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own categories" ON public.focus_categories FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view their own tasks" ON public.focus_tasks FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can create their own tasks" ON public.focus_tasks FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own tasks" ON public.focus_tasks FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.focus_tasks FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view subtasks of their tasks" ON public.focus_subtasks FOR SELECT USING (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = (auth.jwt() ->> 'sub')));
CREATE POLICY "Users can create subtasks for their tasks" ON public.focus_subtasks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = (auth.jwt() ->> 'sub')));
CREATE POLICY "Users can update subtasks of their tasks" ON public.focus_subtasks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = (auth.jwt() ->> 'sub')));
CREATE POLICY "Users can delete subtasks of their tasks" ON public.focus_subtasks FOR DELETE USING (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = (auth.jwt() ->> 'sub')));
CREATE POLICY "Users can view their own sessions" ON public.focus_sessions FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can create their own sessions" ON public.focus_sessions FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own sessions" ON public.focus_sessions FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view their own settings" ON public.focus_settings FOR SELECT USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can create their own settings" ON public.focus_settings FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update their own settings" ON public.focus_settings FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can view their own messages" 
ON public.coach_messages FOR SELECT 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can create their own messages" 
ON public.coach_messages FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete their own messages" 
ON public.coach_messages FOR DELETE 
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Everyone can view active cosmetic items"
ON public.cosmetic_items FOR SELECT
USING (is_active = true);
CREATE POLICY "Admins can manage cosmetic items"
ON public.cosmetic_items FOR ALL
USING (has_role((auth.jwt() ->> 'sub'), 'admin'::app_role));
CREATE POLICY "Users can view own inventory"
ON public.user_inventory FOR SELECT
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can insert into own inventory"
ON public.user_inventory FOR INSERT
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can delete from own inventory"
ON public.user_inventory FOR DELETE
USING ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Everyone can view boss fights" 
ON public.boss_fights 
FOR SELECT 
USING (true);
CREATE POLICY "Admins can manage boss fights" 
ON public.boss_fights 
FOR ALL 
USING (has_role((auth.jwt() ->> 'sub'), 'admin'::app_role));
CREATE POLICY "Users can view all damage contributions" 
ON public.boss_damage 
FOR SELECT 
USING (true);
CREATE POLICY "Users can insert own damage" 
ON public.boss_damage 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);
CREATE POLICY "Users can update own damage" 
ON public.boss_damage 
FOR UPDATE 
USING ((auth.jwt() ->> 'sub') = user_id);
COMMIT;

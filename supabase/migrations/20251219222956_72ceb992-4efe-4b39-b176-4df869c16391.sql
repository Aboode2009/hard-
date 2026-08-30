-- Update handle_new_user to also persist company_code from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert profile with metadata
  INSERT INTO public.profiles (id, username, age, gender, company_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'gender',
    NULLIF(UPPER(NEW.raw_user_meta_data->>'company_code'), '')
  );

  -- Insert challenge progress (starts automatically)
  INSERT INTO public.challenge_progress (user_id, start_date)
  VALUES (NEW.id, CURRENT_DATE);

  RETURN NEW;
END;
$$;
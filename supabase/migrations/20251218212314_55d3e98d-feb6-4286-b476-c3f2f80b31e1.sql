-- Add age and gender columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));

-- Update handle_new_user function to include age and gender from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile with metadata
  INSERT INTO public.profiles (id, username, age, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    (NEW.raw_user_meta_data->>'age')::integer,
    NEW.raw_user_meta_data->>'gender'
  );
  
  -- Insert challenge progress (starts automatically)
  INSERT INTO public.challenge_progress (user_id, start_date)
  VALUES (NEW.id, CURRENT_DATE);
  
  RETURN NEW;
END;
$$;
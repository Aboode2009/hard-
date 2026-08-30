-- Add weekly_points column to challenge_progress
ALTER TABLE public.challenge_progress 
ADD COLUMN IF NOT EXISTS weekly_points integer NOT NULL DEFAULT 0;

-- Add last_weekly_reset column to track when points were last reset
ALTER TABLE public.challenge_progress 
ADD COLUMN IF NOT EXISTS last_weekly_reset timestamp with time zone DEFAULT now();

-- Create weekly champions table
CREATE TABLE public.weekly_champions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  featured_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(week_start)
);

-- Enable RLS on weekly_champions
ALTER TABLE public.weekly_champions ENABLE ROW LEVEL SECURITY;

-- Everyone can view weekly champions
CREATE POLICY "Everyone can view weekly champions" 
ON public.weekly_champions 
FOR SELECT 
USING (true);

-- Only admins can manage weekly champions (or system via service role)
CREATE POLICY "Only system can insert champions" 
ON public.weekly_champions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only system can delete champions" 
ON public.weekly_champions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to get the current week's champion
CREATE OR REPLACE FUNCTION public.get_current_champion()
RETURNS TABLE (
  user_id uuid,
  username text,
  total_points integer,
  featured_until timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wc.user_id,
    p.username,
    wc.total_points,
    wc.featured_until
  FROM public.weekly_champions wc
  JOIN public.profiles p ON p.id = wc.user_id
  WHERE wc.featured_until > now()
  ORDER BY wc.created_at DESC
  LIMIT 1;
$$;

-- Create function to calculate and set weekly champion
CREATE OR REPLACE FUNCTION public.calculate_weekly_champion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champion_id uuid;
  v_champion_points integer;
  v_week_start date;
  v_week_end date;
BEGIN
  -- Calculate week boundaries (Monday to Sunday)
  v_week_start := date_trunc('week', current_date)::date;
  v_week_end := v_week_start + interval '6 days';
  
  -- Find user with highest weekly points
  SELECT user_id, weekly_points INTO v_champion_id, v_champion_points
  FROM public.challenge_progress
  WHERE weekly_points > 0
  ORDER BY weekly_points DESC
  LIMIT 1;
  
  -- Only insert if we found a champion with points
  IF v_champion_id IS NOT NULL AND v_champion_points > 0 THEN
    -- Insert or update champion for this week
    INSERT INTO public.weekly_champions (user_id, week_start, week_end, total_points, featured_until)
    VALUES (v_champion_id, v_week_start, v_week_end, v_champion_points, now() + interval '1 day')
    ON CONFLICT (week_start) 
    DO UPDATE SET 
      user_id = EXCLUDED.user_id,
      total_points = EXCLUDED.total_points,
      featured_until = now() + interval '1 day';
  END IF;
  
  -- Reset weekly points for all users
  UPDATE public.challenge_progress
  SET weekly_points = 0, last_weekly_reset = now();
END;
$$;
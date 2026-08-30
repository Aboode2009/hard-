-- Add XP and Level columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Create boss_fights table for weekly bosses
CREATE TABLE public.boss_fights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  boss_name text NOT NULL,
  boss_name_ar text NOT NULL,
  boss_emoji text NOT NULL DEFAULT '👹',
  max_hp integer NOT NULL DEFAULT 500,
  current_hp integer NOT NULL DEFAULT 500,
  week_start date NOT NULL,
  week_end date NOT NULL,
  is_defeated boolean NOT NULL DEFAULT false,
  defeated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create boss_damage table to track user contributions
CREATE TABLE public.boss_damage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  boss_fight_id uuid NOT NULL REFERENCES public.boss_fights(id) ON DELETE CASCADE,
  damage_dealt integer NOT NULL DEFAULT 0,
  attacks_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, boss_fight_id)
);

-- Enable RLS
ALTER TABLE public.boss_fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_damage ENABLE ROW LEVEL SECURITY;

-- Boss fights policies (everyone can view, only system can modify)
CREATE POLICY "Everyone can view boss fights" 
ON public.boss_fights 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage boss fights" 
ON public.boss_fights 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Boss damage policies
CREATE POLICY "Users can view all damage contributions" 
ON public.boss_damage 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own damage" 
ON public.boss_damage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own damage" 
ON public.boss_damage 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to get or create current week's boss
CREATE OR REPLACE FUNCTION public.get_or_create_weekly_boss()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week_start date;
  current_week_end date;
  boss_id uuid;
  boss_names text[] := ARRAY['Procrastination Demon', 'Laziness Dragon', 'Distraction Phantom', 'Doubt Monster'];
  boss_names_ar text[] := ARRAY['شيطان التسويف', 'تنين الكسل', 'شبح التشتت', 'وحش الشك'];
  boss_emojis text[] := ARRAY['👹', '🐉', '👻', '👾'];
  random_index integer;
BEGIN
  -- Calculate current week (Monday to Sunday)
  current_week_start := date_trunc('week', CURRENT_DATE)::date;
  current_week_end := current_week_start + interval '6 days';
  
  -- Check if boss exists for current week
  SELECT id INTO boss_id
  FROM public.boss_fights
  WHERE week_start = current_week_start;
  
  -- If no boss, create one
  IF boss_id IS NULL THEN
    random_index := floor(random() * 4)::integer + 1;
    
    INSERT INTO public.boss_fights (boss_name, boss_name_ar, boss_emoji, max_hp, current_hp, week_start, week_end)
    VALUES (
      boss_names[random_index],
      boss_names_ar[random_index],
      boss_emojis[random_index],
      500,
      500,
      current_week_start,
      current_week_end
    )
    RETURNING id INTO boss_id;
  END IF;
  
  RETURN boss_id;
END;
$$;

-- Create function to deal damage to boss
CREATE OR REPLACE FUNCTION public.deal_boss_damage(p_user_id uuid, p_damage integer)
RETURNS TABLE(new_hp integer, is_defeated boolean, xp_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boss_id uuid;
  v_current_hp integer;
  v_new_hp integer;
  v_is_defeated boolean := false;
  v_xp_earned integer := 0;
BEGIN
  -- Get current week's boss
  v_boss_id := get_or_create_weekly_boss();
  
  -- Get current HP
  SELECT bf.current_hp INTO v_current_hp
  FROM public.boss_fights bf
  WHERE bf.id = v_boss_id AND bf.is_defeated = false;
  
  -- If boss already defeated, return
  IF v_current_hp IS NULL THEN
    RETURN QUERY SELECT 0, true, 0;
    RETURN;
  END IF;
  
  -- Calculate new HP
  v_new_hp := GREATEST(0, v_current_hp - p_damage);
  v_is_defeated := v_new_hp = 0;
  
  -- Update boss HP
  UPDATE public.boss_fights
  SET current_hp = v_new_hp,
      is_defeated = v_is_defeated,
      defeated_at = CASE WHEN v_is_defeated THEN now() ELSE NULL END
  WHERE id = v_boss_id;
  
  -- Record user's damage contribution
  INSERT INTO public.boss_damage (user_id, boss_fight_id, damage_dealt, attacks_count)
  VALUES (p_user_id, v_boss_id, p_damage, 1)
  ON CONFLICT (user_id, boss_fight_id)
  DO UPDATE SET 
    damage_dealt = boss_damage.damage_dealt + p_damage,
    attacks_count = boss_damage.attacks_count + 1,
    updated_at = now();
  
  -- If boss is defeated, grant bonus XP
  IF v_is_defeated THEN
    v_xp_earned := 500;
    
    -- Add XP to all contributors
    UPDATE public.profiles p
    SET xp = p.xp + 500,
        loot_boxes = p.loot_boxes + 1
    FROM public.boss_damage bd
    WHERE bd.boss_fight_id = v_boss_id 
      AND bd.user_id = p.id;
  END IF;
  
  RETURN QUERY SELECT v_new_hp, v_is_defeated, v_xp_earned;
END;
$$;

-- Create function to add XP and calculate level
CREATE OR REPLACE FUNCTION public.add_xp(p_user_id uuid, p_amount integer)
RETURNS TABLE(new_xp integer, new_level integer, leveled_up boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_xp integer;
  v_current_level integer;
  v_new_xp integer;
  v_new_level integer;
  v_leveled_up boolean := false;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Calculate new XP
  v_new_xp := COALESCE(v_current_xp, 0) + p_amount;
  
  -- Calculate new level using RPG curve: Level = 1 + floor(sqrt(XP / 100))
  -- Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
  v_new_level := 1 + floor(sqrt(v_new_xp::float / 100))::integer;
  
  -- Check if leveled up
  v_leveled_up := v_new_level > COALESCE(v_current_level, 1);
  
  -- Update profile
  UPDATE public.profiles
  SET xp = v_new_xp, level = v_new_level
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up;
END;
$$;

-- Enable realtime for boss_fights
ALTER PUBLICATION supabase_realtime ADD TABLE public.boss_fights;
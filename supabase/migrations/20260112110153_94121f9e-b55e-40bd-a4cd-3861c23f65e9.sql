-- Fix add_xp function to validate user_id matches the caller
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
  v_xp_for_next_level integer;
  v_leveled_up boolean := false;
BEGIN
  -- CRITICAL: Validate user_id matches caller
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify other users XP';
  END IF;

  -- Get current XP and level
  SELECT xp, level INTO v_current_xp, v_current_level
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Calculate new XP
  v_new_xp := v_current_xp + p_amount;
  v_new_level := v_current_level;

  -- Check for level ups (XP needed = level * 100)
  LOOP
    v_xp_for_next_level := v_new_level * 100;
    EXIT WHEN v_new_xp < v_xp_for_next_level;
    v_new_xp := v_new_xp - v_xp_for_next_level;
    v_new_level := v_new_level + 1;
    v_leveled_up := true;
  END LOOP;

  -- Update profile
  UPDATE profiles
  SET xp = v_new_xp, level = v_new_level
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up;
END;
$$;

-- Fix deal_boss_damage function to validate user_id matches the caller
CREATE OR REPLACE FUNCTION public.deal_boss_damage(p_user_id uuid, p_damage integer)
RETURNS TABLE(new_hp integer, is_defeated boolean, xp_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boss_fight_id uuid;
  v_current_hp integer;
  v_new_hp integer;
  v_is_defeated boolean := false;
  v_xp_earned integer := 0;
  v_was_defeated boolean;
BEGIN
  -- CRITICAL: Validate user_id matches caller
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot deal damage for other users';
  END IF;

  -- Get current active boss fight
  SELECT id, current_hp, is_defeated INTO v_boss_fight_id, v_current_hp, v_was_defeated
  FROM boss_fights
  WHERE now() BETWEEN week_start AND week_end
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active boss fight';
  END IF;

  IF v_was_defeated THEN
    RETURN QUERY SELECT v_current_hp, true, 0;
    RETURN;
  END IF;

  -- Calculate damage (cap at remaining HP)
  v_new_hp := GREATEST(0, v_current_hp - p_damage);
  v_is_defeated := v_new_hp <= 0;

  -- Update boss HP
  UPDATE boss_fights
  SET 
    current_hp = v_new_hp,
    is_defeated = v_is_defeated,
    defeated_at = CASE WHEN v_is_defeated THEN now() ELSE defeated_at END
  WHERE id = v_boss_fight_id;

  -- Record damage dealt by user
  INSERT INTO boss_damage (boss_fight_id, user_id, damage_dealt, attacks_count)
  VALUES (v_boss_fight_id, p_user_id, p_damage, 1)
  ON CONFLICT (boss_fight_id, user_id) 
  DO UPDATE SET 
    damage_dealt = boss_damage.damage_dealt + p_damage,
    attacks_count = boss_damage.attacks_count + 1,
    updated_at = now();

  -- Award XP for participation (10 XP per attack)
  v_xp_earned := 10;

  -- Bonus XP if boss was defeated
  IF v_is_defeated THEN
    v_xp_earned := v_xp_earned + 50;
  END IF;

  RETURN QUERY SELECT v_new_hp, v_is_defeated, v_xp_earned;
END;
$$;
-- Fix 1: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Profiles viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Fix 2: Create a server-side function to handle referral processing atomically
CREATE OR REPLACE FUNCTION public.process_referral(
  p_new_user_id uuid,
  p_referral_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referrer_total_referrals integer;
  v_referrer_total_points integer;
  v_referrer_weekly_points integer;
  v_points_per_referral integer := 100;
BEGIN
  -- Find the referrer by their referral code
  SELECT id, total_referrals INTO v_referrer_id, v_referrer_total_referrals
  FROM profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    -- Invalid referral code, silently exit
    RETURN;
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_new_user_id THEN
    RETURN;
  END IF;

  -- Check if this user was already referred (prevent duplicate referrals)
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = p_new_user_id) THEN
    RETURN;
  END IF;

  -- Update the new user's profile with referred_by
  UPDATE profiles
  SET referred_by = v_referrer_id
  WHERE id = p_new_user_id;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, points_awarded)
  VALUES (v_referrer_id, p_new_user_id, v_points_per_referral);

  -- Update referrer's total referrals count
  UPDATE profiles
  SET total_referrals = COALESCE(total_referrals, 0) + 1
  WHERE id = v_referrer_id;

  -- Get referrer's current points
  SELECT total_points, weekly_points INTO v_referrer_total_points, v_referrer_weekly_points
  FROM challenge_progress
  WHERE user_id = v_referrer_id;

  -- Award points to the referrer
  IF v_referrer_total_points IS NOT NULL THEN
    UPDATE challenge_progress
    SET 
      total_points = COALESCE(total_points, 0) + v_points_per_referral,
      weekly_points = COALESCE(weekly_points, 0) + v_points_per_referral
    WHERE user_id = v_referrer_id;
  END IF;

  -- Record in task_completions for history
  INSERT INTO task_completions (user_id, task_key, points_earned)
  VALUES (v_referrer_id, 'referral_bonus', v_points_per_referral);
END;
$$;
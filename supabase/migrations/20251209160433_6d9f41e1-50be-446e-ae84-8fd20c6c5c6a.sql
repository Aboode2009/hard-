-- Add UPDATE and DELETE policies to referrals table to prevent unauthorized modifications
-- Users should NOT be able to update or delete referral records

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "No updates to referrals" ON public.referrals;
DROP POLICY IF EXISTS "No deletes to referrals" ON public.referrals;

-- Prevent any user from updating referrals (only admins via service role can)
CREATE POLICY "No updates to referrals" 
ON public.referrals 
FOR UPDATE 
USING (false);

-- Prevent any user from deleting referrals (only admins via service role can)
CREATE POLICY "No deletes to referrals" 
ON public.referrals 
FOR DELETE 
USING (false);
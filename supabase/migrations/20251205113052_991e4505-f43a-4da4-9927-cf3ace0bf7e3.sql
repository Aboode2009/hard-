-- Add reset_token column to password_reset_otps for secure verification
ALTER TABLE public.password_reset_otps 
ADD COLUMN IF NOT EXISTS reset_token uuid DEFAULT NULL;

-- Drop all existing overly permissive RLS policies
DROP POLICY IF EXISTS "Allow insert for password reset" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Allow select for verification" ON public.password_reset_otps;
DROP POLICY IF EXISTS "Allow update for marking used" ON public.password_reset_otps;

-- No client-side RLS policies needed - all operations handled via edge function with service role key
-- This effectively prevents any client-side access while allowing edge functions full access
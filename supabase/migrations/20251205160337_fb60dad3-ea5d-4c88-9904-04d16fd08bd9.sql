-- Enable RLS on password_reset_otps table
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Deny all direct access via anon/authenticated roles
-- The edge function uses service role which bypasses RLS
CREATE POLICY "No direct access" ON public.password_reset_otps
FOR ALL TO anon, authenticated
USING (false);
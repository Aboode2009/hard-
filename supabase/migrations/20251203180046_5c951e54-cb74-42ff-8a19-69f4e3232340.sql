-- Create table to store password reset OTPs
CREATE TABLE public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Allow insert from edge function (no auth required for this table since edge function handles it)
CREATE POLICY "Allow insert for password reset" 
ON public.password_reset_otps 
FOR INSERT 
WITH CHECK (true);

-- Allow select for verification
CREATE POLICY "Allow select for verification" 
ON public.password_reset_otps 
FOR SELECT 
USING (true);

-- Allow update for marking as used
CREATE POLICY "Allow update for marking used" 
ON public.password_reset_otps 
FOR UPDATE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_expires ON public.password_reset_otps(expires_at);
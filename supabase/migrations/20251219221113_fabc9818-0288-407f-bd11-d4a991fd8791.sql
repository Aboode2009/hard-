-- Add company_code field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN company_code text DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_company_code ON public.profiles(company_code);

-- Add stage support to challenge_progress table
ALTER TABLE public.challenge_progress 
ADD COLUMN IF NOT EXISTS stage_level integer DEFAULT 1 CHECK (stage_level IN (1, 2, 3));
-- Update stage_level constraint to include stage 3
ALTER TABLE public.challenge_progress 
DROP CONSTRAINT IF EXISTS challenge_progress_stage_level_check;

ALTER TABLE public.challenge_progress 
ADD CONSTRAINT challenge_progress_stage_level_check 
CHECK (stage_level IN (1, 2, 3));
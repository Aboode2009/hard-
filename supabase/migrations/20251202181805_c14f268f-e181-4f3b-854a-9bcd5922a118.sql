-- Add total_points column to challenge_progress table
ALTER TABLE public.challenge_progress 
ADD COLUMN IF NOT EXISTS total_points integer NOT NULL DEFAULT 0;

-- Create a table for life area tags
CREATE TABLE IF NOT EXISTS public.life_area_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL DEFAULT '#ef4444',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default life area tags
INSERT INTO public.life_area_tags (name, name_ar, icon, color) VALUES
  ('health', 'صحي', 'Heart', '#22c55e'),
  ('fitness', 'رياضة', 'Dumbbell', '#f97316'),
  ('learning', 'تعلّم', 'BookOpen', '#3b82f6'),
  ('culture', 'ثقافة', 'Globe', '#8b5cf6'),
  ('religion', 'دين', 'Moon', '#eab308'),
  ('work', 'عمل', 'Briefcase', '#64748b'),
  ('relationships', 'علاقات', 'Users', '#ec4899'),
  ('skills', 'مهارة', 'Wrench', '#06b6d4')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on life_area_tags
ALTER TABLE public.life_area_tags ENABLE ROW LEVEL SECURITY;

-- Everyone can view life area tags
CREATE POLICY "Everyone can view life area tags" 
ON public.life_area_tags 
FOR SELECT 
USING (true);

-- Create table for custom user tasks
CREATE TABLE IF NOT EXISTS public.custom_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  tag_id uuid REFERENCES public.life_area_tags(id),
  points integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on custom_tasks
ALTER TABLE public.custom_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view their own custom tasks
CREATE POLICY "Users can view own custom tasks" 
ON public.custom_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own custom tasks
CREATE POLICY "Users can create own custom tasks" 
ON public.custom_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom tasks
CREATE POLICY "Users can update own custom tasks" 
ON public.custom_tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own custom tasks
CREATE POLICY "Users can delete own custom tasks" 
ON public.custom_tasks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create table for task completion history (for wheel of life calculations)
CREATE TABLE IF NOT EXISTS public.task_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_key text NOT NULL,
  tag_id uuid REFERENCES public.life_area_tags(id),
  points_earned integer NOT NULL DEFAULT 10,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on task_completions
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view own completions" 
ON public.task_completions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert own completions" 
ON public.task_completions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
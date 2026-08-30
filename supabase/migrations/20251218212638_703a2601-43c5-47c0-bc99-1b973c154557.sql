-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all challenge progress
CREATE POLICY "Admins can view all challenge progress" 
ON public.challenge_progress 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update any challenge progress
CREATE POLICY "Admins can update any challenge progress" 
ON public.challenge_progress 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all progress photos
CREATE POLICY "Admins can view all progress photos" 
ON public.progress_photos 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all task reminders
CREATE POLICY "Admins can view all task reminders" 
ON public.task_reminders 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all user roles
CREATE POLICY "Admins can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all mood entries
CREATE POLICY "Admins can view all mood entries" 
ON public.mood_entries 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all custom tasks
CREATE POLICY "Admins can view all custom tasks" 
ON public.custom_tasks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all task completions
CREATE POLICY "Admins can view all task completions" 
ON public.task_completions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to view all referrals
CREATE POLICY "Admins can view all referrals" 
ON public.referrals 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));
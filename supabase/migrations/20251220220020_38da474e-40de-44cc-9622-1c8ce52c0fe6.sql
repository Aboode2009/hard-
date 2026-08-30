-- Focus categories/projects
CREATE TABLE public.focus_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT DEFAULT 'target',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Focus tasks with pomodoro tracking
CREATE TABLE public.focus_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.focus_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_pomodoros INTEGER DEFAULT 1,
  completed_pomodoros INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'none' CHECK (priority IN ('high', 'medium', 'low', 'none')),
  due_date DATE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subtasks for focus tasks
CREATE TABLE public.focus_subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.focus_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Focus sessions (completed pomodoros)
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID REFERENCES public.focus_tasks(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.focus_categories(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  was_completed BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User focus settings
CREATE TABLE public.focus_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  focus_duration INTEGER DEFAULT 25,
  short_break_duration INTEGER DEFAULT 5,
  long_break_duration INTEGER DEFAULT 15,
  pomodoros_until_long_break INTEGER DEFAULT 4,
  auto_start_breaks BOOLEAN DEFAULT false,
  auto_start_pomodoros BOOLEAN DEFAULT false,
  strict_mode BOOLEAN DEFAULT false,
  strict_mode_timeout INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.focus_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for focus_categories
CREATE POLICY "Users can view their own categories" ON public.focus_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own categories" ON public.focus_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.focus_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.focus_categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for focus_tasks
CREATE POLICY "Users can view their own tasks" ON public.focus_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tasks" ON public.focus_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.focus_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.focus_tasks FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for focus_subtasks
CREATE POLICY "Users can view subtasks of their tasks" ON public.focus_subtasks FOR SELECT USING (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = auth.uid()));
CREATE POLICY "Users can create subtasks for their tasks" ON public.focus_subtasks FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = auth.uid()));
CREATE POLICY "Users can update subtasks of their tasks" ON public.focus_subtasks FOR UPDATE USING (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete subtasks of their tasks" ON public.focus_subtasks FOR DELETE USING (EXISTS (SELECT 1 FROM public.focus_tasks WHERE id = task_id AND user_id = auth.uid()));

-- RLS Policies for focus_sessions
CREATE POLICY "Users can view their own sessions" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.focus_sessions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for focus_settings
CREATE POLICY "Users can view their own settings" ON public.focus_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own settings" ON public.focus_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.focus_settings FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_focus_tasks_updated_at BEFORE UPDATE ON public.focus_tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_focus_settings_updated_at BEFORE UPDATE ON public.focus_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
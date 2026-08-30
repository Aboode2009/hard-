-- Create themes table
CREATE TABLE public.themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_ar text NOT NULL,
  description text,
  description_ar text,
  price integer NOT NULL DEFAULT 200,
  is_default boolean NOT NULL DEFAULT false,
  preview_image text,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_themes table for purchased themes
CREATE TABLE public.user_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  purchased_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, theme_id)
);

-- Enable RLS
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

-- Themes are viewable by everyone
CREATE POLICY "Everyone can view themes"
ON public.themes FOR SELECT
USING (true);

-- Only admins can manage themes
CREATE POLICY "Admins can insert themes"
ON public.themes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update themes"
ON public.themes FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete themes"
ON public.themes FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- User themes policies
CREATE POLICY "Users can view own themes"
ON public.user_themes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can purchase themes"
ON public.user_themes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own themes"
ON public.user_themes FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default themes
INSERT INTO public.themes (name, name_ar, description, description_ar, price, is_default, colors) VALUES
('Default', 'الافتراضي', 'The original app theme', 'المظهر الأصلي للتطبيق', 0, true, 
 '{"primary": "142 86% 28%", "background": "0 0% 100%", "foreground": "142 10% 10%", "card": "0 0% 100%", "muted": "142 10% 96%", "accent": "142 30% 90%"}'::jsonb),
 
('Ocean Blue', 'المحيط الأزرق', 'Calm ocean vibes', 'أجواء المحيط الهادئة', 200, false,
 '{"primary": "210 100% 50%", "background": "210 50% 98%", "foreground": "210 50% 10%", "card": "210 50% 100%", "muted": "210 30% 95%", "accent": "210 50% 90%"}'::jsonb),

('Sunset Orange', 'غروب برتقالي', 'Warm sunset colors', 'ألوان الغروب الدافئة', 300, false,
 '{"primary": "25 100% 50%", "background": "30 50% 98%", "foreground": "25 50% 10%", "card": "30 50% 100%", "muted": "25 30% 95%", "accent": "25 50% 90%"}'::jsonb),

('Royal Purple', 'البنفسجي الملكي', 'Elegant purple theme', 'مظهر بنفسجي أنيق', 400, false,
 '{"primary": "270 70% 50%", "background": "270 30% 98%", "foreground": "270 30% 10%", "card": "270 30% 100%", "muted": "270 20% 95%", "accent": "270 40% 90%"}'::jsonb),

('Midnight Dark', 'منتصف الليل', 'Dark mode elegance', 'أناقة الوضع الداكن', 500, false,
 '{"primary": "210 100% 60%", "background": "220 20% 10%", "foreground": "210 20% 98%", "card": "220 20% 14%", "muted": "220 15% 20%", "accent": "210 30% 25%"}'::jsonb),

('Rose Gold', 'الذهب الوردي', 'Luxurious rose gold', 'الذهب الوردي الفاخر', 600, false,
 '{"primary": "350 70% 60%", "background": "350 30% 98%", "foreground": "350 30% 10%", "card": "350 30% 100%", "muted": "350 20% 95%", "accent": "350 40% 92%"}'::jsonb),

('Emerald Green', 'الزمرد الأخضر', 'Nature inspired theme', 'مظهر مستوحى من الطبيعة', 450, false,
 '{"primary": "160 84% 39%", "background": "160 30% 98%", "foreground": "160 30% 10%", "card": "160 30% 100%", "muted": "160 20% 95%", "accent": "160 40% 90%"}'::jsonb),

('Cherry Blossom', 'أزهار الكرز', 'Soft pink cherry theme', 'مظهر الكرز الوردي الناعم', 550, false,
 '{"primary": "330 80% 65%", "background": "330 40% 98%", "foreground": "330 30% 10%", "card": "330 40% 100%", "muted": "330 25% 95%", "accent": "330 50% 92%"}'::jsonb);
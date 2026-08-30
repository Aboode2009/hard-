-- Create enum for cosmetic item types
CREATE TYPE cosmetic_type AS ENUM ('frame', 'badge', 'theme');

-- Create enum for rarity levels
CREATE TYPE cosmetic_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

-- Create cosmetic_items table
CREATE TABLE public.cosmetic_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type cosmetic_type NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  asset_url TEXT,
  css_class TEXT,
  rarity cosmetic_rarity NOT NULL DEFAULT 'common',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_inventory table
CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.cosmetic_items(id) ON DELETE CASCADE,
  obtained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Add loot box tracking and equipped items to profiles
ALTER TABLE public.profiles 
ADD COLUMN equipped_frame_id UUID REFERENCES public.cosmetic_items(id),
ADD COLUMN equipped_badge_id UUID REFERENCES public.cosmetic_items(id),
ADD COLUMN equipped_theme_id UUID REFERENCES public.cosmetic_items(id),
ADD COLUMN loot_boxes INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_loot_box_streak INTEGER NOT NULL DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.cosmetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies for cosmetic_items (everyone can view active items)
CREATE POLICY "Everyone can view active cosmetic items"
ON public.cosmetic_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage cosmetic items"
ON public.cosmetic_items FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_inventory
CREATE POLICY "Users can view own inventory"
ON public.user_inventory FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into own inventory"
ON public.user_inventory FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own inventory"
ON public.user_inventory FOR DELETE
USING (auth.uid() = user_id);

-- Insert default cosmetic items
INSERT INTO public.cosmetic_items (type, name, name_ar, css_class, rarity) VALUES
-- Frames (Common to Legendary)
('frame', 'Iron Ring', 'حلقة الحديد', 'frame-iron', 'common'),
('frame', 'Fire Border', 'إطار النار', 'frame-fire', 'rare'),
('frame', 'Electric Surge', 'الصاعقة الكهربائية', 'frame-electric', 'epic'),
('frame', 'Golden Crown', 'التاج الذهبي', 'frame-golden', 'legendary'),
('frame', 'Shadow Aura', 'هالة الظل', 'frame-shadow', 'rare'),
('frame', 'Diamond Edge', 'حافة الماس', 'frame-diamond', 'legendary'),

-- Badges (Emojis next to name)
('badge', 'Fire Emoji', 'رمز النار', '🔥', 'common'),
('badge', 'Lightning Bolt', 'البرق', '⚡', 'common'),
('badge', 'Star Badge', 'نجمة', '⭐', 'rare'),
('badge', 'Crown Badge', 'تاج', '👑', 'epic'),
('badge', 'Diamond Badge', 'الماسة', '💎', 'legendary'),
('badge', 'Skull Badge', 'الجمجمة', '💀', 'rare'),
('badge', 'Iron Fist', 'القبضة الحديدية', '✊', 'epic'),
('badge', 'Champion Trophy', 'كأس البطل', '🏆', 'legendary'),

-- Themes (Accent Colors)
('theme', 'Blood Red', 'الأحمر الدموي', 'theme-blood', 'common'),
('theme', 'Royal Purple', 'البنفسجي الملكي', 'theme-purple', 'rare'),
('theme', 'Golden Glory', 'المجد الذهبي', 'theme-gold', 'epic'),
('theme', 'Electric Blue', 'الأزرق الكهربائي', 'theme-electric', 'rare'),
('theme', 'Shadow Black', 'الأسود الداكن', 'theme-shadow', 'epic'),
('theme', 'Emerald Green', 'الزمرد الأخضر', 'theme-emerald', 'legendary');
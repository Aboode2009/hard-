-- Add more badge cosmetic items
INSERT INTO cosmetic_items (name, name_ar, type, rarity, css_class, is_active) VALUES
-- Common badges
('Fire Starter', 'شعلة البداية', 'badge', 'common', '🔥', true),
('Early Bird', 'الطائر المبكر', 'badge', 'common', '🐦', true),
('Night Owl', 'بومة الليل', 'badge', 'common', '🦉', true),
('Bookworm', 'دودة الكتب', 'badge', 'common', '📚', true),
('Coffee Lover', 'عاشق القهوة', 'badge', 'common', '☕', true),
('Zen Master', 'سيد الزن', 'badge', 'common', '🧘', true),
('Runner', 'العداء', 'badge', 'common', '🏃', true),
('Healthy Eater', 'الأكل الصحي', 'badge', 'common', '🥗', true),

-- Rare badges
('Thunder Strike', 'ضربة الرعد', 'badge', 'rare', '⚡', true),
('Crystal Heart', 'قلب كريستالي', 'badge', 'rare', '💎', true),
('Moon Walker', 'ماشي القمر', 'badge', 'rare', '🌙', true),
('Rainbow Spirit', 'روح قوس قزح', 'badge', 'rare', '🌈', true),
('Rocket Power', 'قوة الصاروخ', 'badge', 'rare', '🚀', true),
('Music Soul', 'روح الموسيقى', 'badge', 'rare', '🎵', true),
('Art Master', 'سيد الفن', 'badge', 'rare', '🎨', true),
('Goal Scorer', 'هداف الأهداف', 'badge', 'rare', '⚽', true),

-- Epic badges  
('Dragon Slayer', 'قاتل التنين', 'badge', 'epic', '🐲', true),
('Phoenix Rising', 'طائر الفينيق', 'badge', 'epic', '🔱', true),
('Unicorn Magic', 'سحر اليونيكورن', 'badge', 'epic', '🦄', true),
('Galaxy Explorer', 'مستكشف المجرة', 'badge', 'epic', '🌌', true),
('Diamond Mind', 'عقل الماس', 'badge', 'epic', '💠', true),
('Ninja Master', 'سيد النينجا', 'badge', 'epic', '🥷', true),
('Wizard Power', 'قوة الساحر', 'badge', 'epic', '🧙', true),
('Super Hero', 'البطل الخارق', 'badge', 'epic', '🦸', true),

-- Legendary badges
('Golden Crown', 'التاج الذهبي', 'badge', 'legendary', '👑', true),
('Eternal Flame', 'اللهب الأبدي', 'badge', 'legendary', '🌟', true),
('Infinity Power', 'قوة اللانهاية', 'badge', 'legendary', '♾️', true),
('Ultimate Champion', 'البطل الأسطوري', 'badge', 'legendary', '🏆', true),
('Divine Light', 'النور الإلهي', 'badge', 'legendary', '✨', true),
('Ancient Wisdom', 'الحكمة القديمة', 'badge', 'legendary', '📜', true)
ON CONFLICT DO NOTHING;
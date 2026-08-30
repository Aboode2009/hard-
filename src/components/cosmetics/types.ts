export type CosmeticType = 'frame' | 'badge' | 'theme';
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticItem {
  id: string;
  type: CosmeticType;
  name: string;
  name_ar: string;
  asset_url: string | null;
  css_class: string | null;
  rarity: CosmeticRarity;
  is_active: boolean;
  created_at: string;
}

export interface UserInventoryItem {
  id: string;
  user_id: string;
  item_id: string;
  obtained_at: string;
  item?: CosmeticItem;
}

export interface UserCosmetics {
  equipped_frame_id: string | null;
  equipped_badge_id: string | null;
  equipped_theme_id: string | null;
  loot_boxes: number;
  last_loot_box_streak: number;
}

export const RARITY_COLORS: Record<CosmeticRarity, string> = {
  common: 'border-muted-foreground/50 bg-muted/30',
  rare: 'border-blue-500 bg-blue-500/10',
  epic: 'border-purple-500 bg-purple-500/10',
  legendary: 'border-amber-500 bg-amber-500/10 animate-pulse',
};

export const RARITY_TEXT_COLORS: Record<CosmeticRarity, string> = {
  common: 'text-muted-foreground',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-amber-500',
};

export const RARITY_LABELS: Record<CosmeticRarity, { en: string; ar: string }> = {
  common: { en: 'Common', ar: 'عادي' },
  rare: { en: 'Rare', ar: 'نادر' },
  epic: { en: 'Epic', ar: 'أسطوري' },
  legendary: { en: 'Legendary', ar: 'خرافي' },
};

// Loot box drop rates by rarity
export const DROP_RATES: Record<CosmeticRarity, number> = {
  common: 0.50,    // 50%
  rare: 0.30,      // 30%
  epic: 0.15,      // 15%
  legendary: 0.05, // 5%
};

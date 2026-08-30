import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CosmeticItem, CosmeticRarity, CosmeticType } from "@/components/cosmetics/types";

// Level-based reward tiers - rewards get better as level increases
const getLevelRewardTier = (level: number): { 
  lootBoxes: number; 
  guaranteedRarity: CosmeticRarity | null;
  bonusPoints: number;
} => {
  if (level >= 50) {
    return { lootBoxes: 3, guaranteedRarity: 'legendary', bonusPoints: 500 };
  } else if (level >= 30) {
    return { lootBoxes: 2, guaranteedRarity: 'epic', bonusPoints: 300 };
  } else if (level >= 20) {
    return { lootBoxes: 2, guaranteedRarity: 'rare', bonusPoints: 200 };
  } else if (level >= 10) {
    return { lootBoxes: 1, guaranteedRarity: 'rare', bonusPoints: 100 };
  } else if (level >= 5) {
    return { lootBoxes: 1, guaranteedRarity: null, bonusPoints: 50 };
  } else {
    return { lootBoxes: 1, guaranteedRarity: null, bonusPoints: 25 };
  }
};

// Drop rates adjusted by level
const getAdjustedDropRates = (level: number, guaranteedRarity: CosmeticRarity | null): Record<CosmeticRarity, number> => {
  const baseRates: Record<CosmeticRarity, number> = {
    common: 0.50,
    rare: 0.30,
    epic: 0.15,
    legendary: 0.05,
  };

  // Improve rates based on level
  const levelBonus = Math.min(level * 0.005, 0.2); // Max 20% bonus
  
  if (guaranteedRarity) {
    // Guarantee at least this rarity
    switch (guaranteedRarity) {
      case 'legendary':
        return { common: 0, rare: 0, epic: 0.3, legendary: 0.7 };
      case 'epic':
        return { common: 0, rare: 0.2, epic: 0.6, legendary: 0.2 };
      case 'rare':
        return { common: 0.1, rare: 0.5, epic: 0.3, legendary: 0.1 };
      default:
        return baseRates;
    }
  }

  return {
    common: Math.max(0.3, baseRates.common - levelBonus),
    rare: baseRates.rare + levelBonus * 0.4,
    epic: baseRates.epic + levelBonus * 0.4,
    legendary: baseRates.legendary + levelBonus * 0.2,
  };
};

const selectRarity = (rates: Record<CosmeticRarity, number>): CosmeticRarity => {
  const roll = Math.random();
  let cumulative = 0;
  
  for (const [rarity, rate] of Object.entries(rates)) {
    cumulative += rate;
    if (roll < cumulative) {
      return rarity as CosmeticRarity;
    }
  }
  
  return 'common';
};

interface LevelUpRewardResult {
  item: CosmeticItem;
  bonusPoints: number;
  level: number;
}

export const useLevelUpReward = (userId: string | null) => {
  const [isRewarding, setIsRewarding] = useState(false);
  const [rewardQueue, setRewardQueue] = useState<LevelUpRewardResult[]>([]);
  const [currentReward, setCurrentReward] = useState<LevelUpRewardResult | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);

  const processLevelUpReward = useCallback(async (newLevel: number): Promise<LevelUpRewardResult | null> => {
    if (!userId || isRewarding) return null;

    try {
      setIsRewarding(true);
      
      const tier = getLevelRewardTier(newLevel);
      const adjustedRates = getAdjustedDropRates(newLevel, tier.guaranteedRarity);
      const selectedRarity = selectRarity(adjustedRates);

      // Fetch available items of this rarity
      const { data: availableItems, error: itemsError } = await supabase
        .from("cosmetic_items")
        .select("*")
        .eq("rarity", selectedRarity)
        .eq("is_active", true);

      if (itemsError || !availableItems || availableItems.length === 0) {
        console.error("No items found for rarity:", selectedRarity);
        return null;
      }

      // Check user inventory to avoid duplicates if possible
      const { data: inventory } = await supabase
        .from("user_inventory")
        .select("item_id")
        .eq("user_id", userId);

      const ownedItemIds = new Set(inventory?.map(i => i.item_id) || []);
      
      // Prefer items not owned
      let eligibleItems = availableItems.filter(item => !ownedItemIds.has(item.id));
      
      // If all items of this rarity are owned, just pick any
      if (eligibleItems.length === 0) {
        eligibleItems = availableItems;
      }

      // Random selection
      const selectedItem = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];

      // Add to inventory
      await supabase
        .from("user_inventory")
        .insert({
          user_id: userId,
          item_id: selectedItem.id,
        });

      // Award bonus points
      if (tier.bonusPoints > 0) {
        // Get current points and update
        const { data: progress } = await supabase
          .from("challenge_progress")
          .select("total_points")
          .eq("user_id", userId)
          .single();
        
        if (progress) {
          await supabase
            .from("challenge_progress")
            .update({
              total_points: (progress.total_points || 0) + tier.bonusPoints,
            })
            .eq("user_id", userId);
        }
      }

      const result: LevelUpRewardResult = {
        item: {
          ...selectedItem,
          type: selectedItem.type as CosmeticType,
          rarity: selectedItem.rarity as CosmeticRarity,
        },
        bonusPoints: tier.bonusPoints,
        level: newLevel,
      };

      return result;
    } catch (error) {
      console.error("Error processing level up reward:", error);
      return null;
    } finally {
      setIsRewarding(false);
    }
  }, [userId, isRewarding]);

  const triggerLevelUpReward = useCallback(async (newLevel: number) => {
    const reward = await processLevelUpReward(newLevel);
    if (reward) {
      setCurrentReward(reward);
      setShowRewardAnimation(true);
    }
  }, [processLevelUpReward]);

  const closeRewardAnimation = useCallback(() => {
    setShowRewardAnimation(false);
    setCurrentReward(null);
  }, []);

  return {
    triggerLevelUpReward,
    currentReward,
    showRewardAnimation,
    closeRewardAnimation,
    isRewarding,
  };
};

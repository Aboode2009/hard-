import { useState, useCallback, useRef } from "react";
import { invalidateProgress } from "@/lib/query-client";
import { challengeRpc } from "@/lib/challenge-rpc";
import type { CosmeticItem, CosmeticRarity, CosmeticType } from "@/components/cosmetics/types";

// Reward tiers, drop rates and the "one reward per level" rule live on the
// server in claim_level_up_reward(); the client only shows the result.

interface LevelUpRewardResult {
  item: CosmeticItem;
  bonusPoints: number;
  level: number;
}

export const useLevelUpReward = (userId: string | null) => {
  const [isRewarding, setIsRewarding] = useState(false);
  /**
   * The re-entrancy guard, as a ref rather than the state above.
   *
   * Reading `isRewarding` in the callback forced it into the dependency array,
   * so `processLevelUpReward` — and every callback built on it — got a new
   * identity twice per level-up, re-rendering the whole page underneath the
   * reward animation.
   */
  const rewardingRef = useRef(false);
  const [rewardQueue, setRewardQueue] = useState<LevelUpRewardResult[]>([]);
  const [currentReward, setCurrentReward] = useState<LevelUpRewardResult | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);

  const processLevelUpReward = useCallback(async (newLevel: number): Promise<LevelUpRewardResult | null> => {
    if (!userId || rewardingRef.current) return null;

    try {
      rewardingRef.current = true;
      setIsRewarding(true);
      
      const claim = await challengeRpc.claimLevelUpReward(newLevel);
      if (!claim.claimed || !claim.item) {
        // Already claimed, or no cosmetics to give yet — nothing to show.
        return null;
      }
      if ((claim.bonus_points ?? 0) > 0) invalidateProgress();

      const result: LevelUpRewardResult = {
        item: {
          ...claim.item,
          type: claim.item.type as CosmeticType,
          rarity: claim.item.rarity as CosmeticRarity,
        },
        bonusPoints: claim.bonus_points ?? 0,
        level: claim.level ?? newLevel,
      };

      return result;
    } catch (error) {
      console.error("Error processing level up reward:", error);
      return null;
    } finally {
      rewardingRef.current = false;
      setIsRewarding(false);
    }
  }, [userId]);

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

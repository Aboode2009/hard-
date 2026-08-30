import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CosmeticItem, CosmeticType } from "@/components/cosmetics/types";

interface UserCosmeticsData {
  equippedFrame: CosmeticItem | null;
  equippedBadge: CosmeticItem | null;
  equippedTheme: CosmeticItem | null;
  lootBoxes: number;
  loading: boolean;
  refetch: () => void;
}

export const useUserCosmetics = (userId: string | null): UserCosmeticsData => {
  const [equippedFrame, setEquippedFrame] = useState<CosmeticItem | null>(null);
  const [equippedBadge, setEquippedBadge] = useState<CosmeticItem | null>(null);
  const [equippedTheme, setEquippedTheme] = useState<CosmeticItem | null>(null);
  const [lootBoxes, setLootBoxes] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCosmetics = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("equipped_frame_id, equipped_badge_id, equipped_theme_id, loot_boxes")
        .eq("id", userId)
        .single();

      if (!profile) return;

      setLootBoxes(profile.loot_boxes || 0);

      const itemIds = [
        profile.equipped_frame_id,
        profile.equipped_badge_id,
        profile.equipped_theme_id,
      ].filter(Boolean);

      if (itemIds.length > 0) {
        const { data: items } = await supabase
          .from("cosmetic_items")
          .select("*")
          .in("id", itemIds);

        if (items) {
          const itemsTyped = items.map(item => ({
            ...item,
            type: item.type as CosmeticType,
            rarity: item.rarity as any,
          }));

          setEquippedFrame(itemsTyped.find(i => i.id === profile.equipped_frame_id) || null);
          setEquippedBadge(itemsTyped.find(i => i.id === profile.equipped_badge_id) || null);
          setEquippedTheme(itemsTyped.find(i => i.id === profile.equipped_theme_id) || null);
        }
      } else {
        setEquippedFrame(null);
        setEquippedBadge(null);
        setEquippedTheme(null);
      }
    } catch (error) {
      console.error("Error fetching user cosmetics:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCosmetics();
  }, [fetchCosmetics]);

  return {
    equippedFrame,
    equippedBadge,
    equippedTheme,
    lootBoxes,
    loading,
    refetch: fetchCosmetics,
  };
};

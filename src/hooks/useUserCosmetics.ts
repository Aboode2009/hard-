import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCache, readLastKnown, writeCache, dropCache, homeKeys } from "@/lib/home-cache";
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
  // Last known equipment for the first frame (no frame popping onto the avatar
  // a second after launch).
  const [initial] = useState(() =>
    userId
      ? readLastKnown<{ lootBoxes: number; frame: CosmeticItem | null; badge: CosmeticItem | null; theme: CosmeticItem | null }>(
          homeKeys.cosmetics(userId),
          true,
        )
      : undefined,
  );
  const [equippedFrame, setEquippedFrame] = useState<CosmeticItem | null>(initial?.frame ?? null);
  const [equippedBadge, setEquippedBadge] = useState<CosmeticItem | null>(initial?.badge ?? null);
  const [equippedTheme, setEquippedTheme] = useState<CosmeticItem | null>(initial?.theme ?? null);
  const [lootBoxes, setLootBoxes] = useState(initial?.lootBoxes ?? 0);
  const [loading, setLoading] = useState(true);

  /** Shape held in the session cache. */
  interface CosmeticsSnapshotShape {
    lootBoxes: number;
    frame: CosmeticItem | null;
    badge: CosmeticItem | null;
    theme: CosmeticItem | null;
  }

  const fetchCosmetics = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Equipped cosmetics change only when the user equips something, and the
    // inventory modal calls `refetch` when they do — which drops this entry
    // first, so equipping is still reflected immediately.
    const cached = readCache<CosmeticsSnapshotShape>(homeKeys.cosmetics(userId));
    if (cached) {
      setLootBoxes(cached.lootBoxes);
      setEquippedFrame(cached.frame);
      setEquippedBadge(cached.badge);
      setEquippedTheme(cached.theme);
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

          const frame = itemsTyped.find(i => i.id === profile.equipped_frame_id) || null;
          const badge = itemsTyped.find(i => i.id === profile.equipped_badge_id) || null;
          const theme = itemsTyped.find(i => i.id === profile.equipped_theme_id) || null;

          setEquippedFrame(frame);
          setEquippedBadge(badge);
          setEquippedTheme(theme);
          writeCache<CosmeticsSnapshotShape>(homeKeys.cosmetics(userId), {
            lootBoxes: profile.loot_boxes || 0, frame, badge, theme,
          });
        }
      } else {
        setEquippedFrame(null);
        setEquippedBadge(null);
        setEquippedTheme(null);
        writeCache<CosmeticsSnapshotShape>(homeKeys.cosmetics(userId), {
          lootBoxes: profile.loot_boxes || 0, frame: null, badge: null, theme: null,
        });
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

  /** Forces a real read — used after the user equips or opens something. */
  const refetch = useCallback(async () => {
    if (userId) dropCache(homeKeys.cosmetics(userId));
    await fetchCosmetics();
  }, [userId, fetchCosmetics]);

  return {
    refetch,
    equippedFrame,
    equippedBadge,
    equippedTheme,
    lootBoxes,
    loading,
  };
};

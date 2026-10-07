import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCache, readLastKnown, writeCache, homeKeys } from "@/lib/home-cache";
import { useToast } from "@/hooks/use-toast";
import type { XPResult } from "@/lib/challenge-rpc";

interface XPData {
  xp: number;
  level: number;
}

// Level calculation: Level = 1 + floor(sqrt(XP / 100))
// Level 1: 0-99 XP, Level 2: 100-399 XP, Level 3: 400-899 XP, etc.
export const calculateLevel = (xp: number): number => {
  return 1 + Math.floor(Math.sqrt(xp / 100));
};

export const getXPForLevel = (level: number): number => {
  // Inverse of the level formula
  return Math.pow(level - 1, 2) * 100;
};

export const getXPForNextLevel = (level: number): number => {
  return getXPForLevel(level + 1);
};

export const getXPProgress = (xp: number, level: number): number => {
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForNextLevel(level);
  const progressXP = xp - currentLevelXP;
  const requiredXP = nextLevelXP - currentLevelXP;
  return Math.min(100, (progressXP / requiredXP) * 100);
};

export const useXP = (userId: string | null) => {
  // Last known value for the first frame, so the bar does not show "Level 1"
  // and then jump to the real level once the query returns.
  const [xpData, setXPData] = useState<XPData>(
    () => (userId && readLastKnown<XPData>(homeKeys.xp(userId), true)) || { xp: 0, level: 1 },
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchXP = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // The XP bar sits on the home screen, which remounts on every tab return.
    // `applyServerXP` rewrites this entry from the server's own response, so a hit is
    // always the value the query would have produced.
    const cached = readCache<{ xp: number; level: number }>(homeKeys.xp(userId));
    if (cached) {
      setXPData(cached);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("xp, level")
        .eq("id", userId)
        .single();

      if (error) throw error;

      const next = { xp: data.xp || 0, level: data.level || 1 };
      writeCache(homeKeys.xp(userId), next);
      setXPData(next);
    } catch (error) {
      console.error("Error fetching XP:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchXP();
  }, [fetchXP]);

  /**
   * XP is granted on the server by the task/day RPCs (the client can no longer
   * call add_xp). This folds the server's answer into the bar and fires the
   * level-up callback when the server says a level was reached.
   */
  const applyServerXP = useCallback((
    result: XPResult | null | undefined,
    isArabic: boolean = false,
    onLevelUp?: (newLevel: number) => void
  ): { leveledUp: boolean; newLevel: number } => {
    if (!userId || !result) return { leveledUp: false, newLevel: xpData.level };

    const next = { xp: result.new_xp, level: result.new_level };
    writeCache(homeKeys.xp(userId), next);
    setXPData(next);

    if (result.leveled_up) {
      if (onLevelUp) {
        onLevelUp(result.new_level);
      } else {
        toast({
          title: isArabic ? "🎉 مستوى جديد!" : "🎉 Level Up!",
          description: isArabic
            ? `تهانينا! وصلت للمستوى ${result.new_level}`
            : `Congratulations! You reached Level ${result.new_level}`,
        });
      }
    }

    return { leveledUp: result.leveled_up, newLevel: result.new_level };
  }, [userId, xpData.level, toast]);

  return {
    ...xpData,
    loading,
    applyServerXP,
    refetch: fetchXP,
    xpProgress: getXPProgress(xpData.xp, xpData.level),
    xpForCurrentLevel: getXPForLevel(xpData.level),
    xpForNextLevel: getXPForNextLevel(xpData.level),
  };
};

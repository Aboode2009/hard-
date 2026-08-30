import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [xpData, setXPData] = useState<XPData>({ xp: 0, level: 1 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchXP = useCallback(async () => {
    if (!userId) {
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

      setXPData({
        xp: data.xp || 0,
        level: data.level || 1,
      });
    } catch (error) {
      console.error("Error fetching XP:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchXP();
  }, [fetchXP]);

  const addXP = useCallback(async (
    amount: number, 
    isArabic: boolean = false,
    onLevelUp?: (newLevel: number) => void
  ): Promise<{ leveledUp: boolean; newLevel: number }> => {
    if (!userId) return { leveledUp: false, newLevel: xpData.level };

    try {
      const { data, error } = await supabase.rpc("add_xp", {
        p_user_id: userId,
        p_amount: amount,
      });

      if (error) throw error;

      const result = data?.[0] || { new_xp: xpData.xp + amount, new_level: xpData.level, leveled_up: false };
      
      setXPData({
        xp: result.new_xp,
        level: result.new_level,
      });

      if (result.leveled_up) {
        // Call the onLevelUp callback if provided (for level up rewards)
        if (onLevelUp) {
          onLevelUp(result.new_level);
        } else {
          // Default toast if no callback
          toast({
            title: isArabic ? "🎉 مستوى جديد!" : "🎉 Level Up!",
            description: isArabic 
              ? `تهانينا! وصلت للمستوى ${result.new_level}` 
              : `Congratulations! You reached Level ${result.new_level}`,
          });
        }
      }

      return { leveledUp: result.leveled_up, newLevel: result.new_level };
    } catch (error) {
      console.error("Error adding XP:", error);
      return { leveledUp: false, newLevel: xpData.level };
    }
  }, [userId, xpData, toast]);

  return {
    ...xpData,
    loading,
    addXP,
    refetch: fetchXP,
    xpProgress: getXPProgress(xpData.xp, xpData.level),
    xpForCurrentLevel: getXPForLevel(xpData.level),
    xpForNextLevel: getXPForNextLevel(xpData.level),
  };
};

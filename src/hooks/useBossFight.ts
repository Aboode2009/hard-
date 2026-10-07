import { useState, useEffect, useCallback } from "react";
import { invalidateProgress } from "@/lib/query-client";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BossFight {
  id: string;
  boss_name: string;
  boss_name_ar: string;
  boss_emoji: string;
  max_hp: number;
  current_hp: number;
  week_start: string;
  week_end: string;
  is_defeated: boolean;
  defeated_at: string | null;
}

interface UserDamage {
  damage_dealt: number;
  attacks_count: number;
}

export const useBossFight = (userId: string | null) => {
  const [boss, setBoss] = useState<BossFight | null>(null);
  const [userDamage, setUserDamage] = useState<UserDamage | null>(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const { toast } = useToast();

  const fetchBoss = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Get or create current week's boss
      const { data: bossId, error: bossIdError } = await supabase.rpc("get_or_create_weekly_boss");
      
      if (bossIdError) throw bossIdError;

      // Fetch boss details
      const { data: bossData, error: bossError } = await supabase
        .from("boss_fights")
        .select("*")
        .eq("id", bossId)
        .single();

      if (bossError) throw bossError;
      setBoss(bossData);

      // Fetch user's damage contribution
      const { data: damageData } = await supabase
        .from("boss_damage")
        .select("damage_dealt, attacks_count")
        .eq("user_id", userId)
        .eq("boss_fight_id", bossId)
        .maybeSingle();

      setUserDamage(damageData || { damage_dealt: 0, attacks_count: 0 });
    } catch (error) {
      console.error("Error fetching boss:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBoss();
  }, [fetchBoss]);

  // Subscribe to real-time boss HP updates
  useEffect(() => {
    if (!boss?.id) return;

    const channel = supabase
      .channel("boss_hp_updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "boss_fights",
          filter: `id=eq.${boss.id}`,
        },
        (payload) => {
          const newBoss = payload.new as BossFight;
          setBoss(newBoss);
          
          // Check for victory
          if (newBoss.is_defeated && !boss.is_defeated) {
            setShowVictory(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boss?.id, boss?.is_defeated]);

  const dealDamage = useCallback(async (damage: number, isArabic: boolean = false): Promise<{ success: boolean; isDefeated: boolean; xpEarned: number }> => {
    if (!userId || !boss || boss.is_defeated) {
      return { success: false, isDefeated: false, xpEarned: 0 };
    }

    setAttacking(true);

    try {
      const { data, error } = await supabase.rpc("deal_boss_damage", {
        p_user_id: userId,
        p_damage: damage,
      });

      if (error) throw error;

      const result = data?.[0] || { new_hp: boss.current_hp - damage, is_defeated: false, xp_earned: 0 };
      invalidateProgress();

      // Update local state immediately for responsiveness
      setBoss(prev => prev ? { ...prev, current_hp: result.new_hp, is_defeated: result.is_defeated } : null);
      setUserDamage(prev => prev ? { 
        damage_dealt: prev.damage_dealt + damage, 
        attacks_count: prev.attacks_count + 1 
      } : { damage_dealt: damage, attacks_count: 1 });

      if (result.is_defeated) {
        setShowVictory(true);
        toast({
          title: isArabic ? "🎉 انتصار!" : "🎉 Victory!",
          description: isArabic 
            ? `هزمت ${boss.boss_name_ar}! حصلت على 500 XP وصندوق كنز!`
            : `You defeated the ${boss.boss_name}! +500 XP and a Boss Chest!`,
        });
      }

      return { success: true, isDefeated: result.is_defeated, xpEarned: result.xp_earned };
    } catch (error) {
      console.error("Error dealing damage:", error);
      return { success: false, isDefeated: false, xpEarned: 0 };
    } finally {
      setAttacking(false);
    }
  }, [userId, boss, toast]);

  const closeVictory = useCallback(() => {
    setShowVictory(false);
  }, []);

  return {
    boss,
    userDamage,
    loading,
    attacking,
    showVictory,
    closeVictory,
    dealDamage,
    refetch: fetchBoss,
    hpPercentage: boss ? (boss.current_hp / boss.max_hp) * 100 : 100,
  };
};

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseLootBoxRewardProps {
  userId: string | null;
  completedDays: Set<number>;
  currentDay: number;
  tasks: { completed: boolean }[];
  customTasks: { completed: boolean }[];
  isArabic: boolean;
}

export const useLootBoxReward = ({
  userId,
  completedDays,
  currentDay,
  tasks,
  customTasks,
  isArabic,
}: UseLootBoxRewardProps) => {
  const { toast } = useToast();
  const lastCheckedStreak = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    const checkLootBoxReward = async () => {
      try {
        // Get current loot box streak from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("last_loot_box_streak, loot_boxes")
          .eq("id", userId)
          .single();

        if (!profile) return;

        const savedStreak = profile.last_loot_box_streak || 0;
        
        // Count consecutive 100% days ending at current day
        let consecutivePerfectDays = 0;
        
        // Check if today is complete (all tasks done)
        const allTasks = [...tasks, ...customTasks];
        const allComplete = allTasks.length > 0 && allTasks.every(t => t.completed);
        
        if (allComplete && completedDays.has(currentDay)) {
          consecutivePerfectDays = 1;
          
          // Count backwards from yesterday
          for (let day = currentDay - 1; day >= 1; day--) {
            if (completedDays.has(day)) {
              consecutivePerfectDays++;
            } else {
              break;
            }
          }
        }

        // Check if we've reached a new 3-day milestone
        const currentMilestone = Math.floor(consecutivePerfectDays / 3);
        const savedMilestone = Math.floor(savedStreak / 3);

        if (currentMilestone > savedMilestone && consecutivePerfectDays >= 3) {
          // Award loot box!
          const newLootBoxes = (profile.loot_boxes || 0) + 1;

          await supabase
            .from("profiles")
            .update({
              loot_boxes: newLootBoxes,
              last_loot_box_streak: consecutivePerfectDays,
            })
            .eq("id", userId);

          toast({
            title: isArabic ? "🎁 صندوق جديد!" : "🎁 New Loot Box!",
            description: isArabic 
              ? `أكملت ${consecutivePerfectDays} أيام متتالية! اذهب للمجموعة لفتحه.`
              : `You completed ${consecutivePerfectDays} perfect days! Go to Collection to open it.`,
          });
        } else if (consecutivePerfectDays !== savedStreak) {
          // Just update the streak count
          await supabase
            .from("profiles")
            .update({ last_loot_box_streak: consecutivePerfectDays })
            .eq("id", userId);
        }

        lastCheckedStreak.current = consecutivePerfectDays;
      } catch (error) {
        console.error("Error checking loot box reward:", error);
      }
    };

    // Only check when all tasks are completed
    const allTasks = [...tasks, ...customTasks];
    const allComplete = allTasks.length > 0 && allTasks.every(t => t.completed);
    
    if (allComplete) {
      checkLootBoxReward();
    }
  }, [userId, completedDays, currentDay, tasks, customTasks, isArabic, toast]);
};

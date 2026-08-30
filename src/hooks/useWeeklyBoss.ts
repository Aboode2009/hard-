import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeeklyBossQuest {
  id: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  icon: string;
}

interface WeeklyBossEvent {
  id: string;
  boss_name: string;
  boss_name_ar: string;
  boss_emoji: string;
  quest: WeeklyBossQuest;
  is_active: boolean;
  is_completed: boolean;
  started_at: string;
  ends_at: string;
  reward_claimed: boolean;
}

// Pool of special quests for the weekly boss
const BOSS_QUESTS: WeeklyBossQuest[] = [
  {
    id: "quran_kahf",
    title: "Read Surah Al-Kahf",
    title_ar: "اقرأ سورة الكهف",
    description: "Read the entire Surah Al-Kahf today",
    description_ar: "اقرأ سورة الكهف كاملة اليوم",
    icon: "📖",
  },
  {
    id: "walk_10k",
    title: "Walk 10,000 Steps",
    title_ar: "امشِ 10,000 خطوة",
    description: "Complete 10,000 steps today",
    description_ar: "أكمل 10,000 خطوة اليوم",
    icon: "🚶",
  },
  {
    id: "fast_today",
    title: "Fast Today",
    title_ar: "صم اليوم",
    description: "Complete a voluntary fast today",
    description_ar: "أكمل صيام تطوعي اليوم",
    icon: "🌙",
  },
  {
    id: "no_social_media",
    title: "No Social Media",
    title_ar: "لا وسائل تواصل",
    description: "Stay off social media for the entire day",
    description_ar: "ابتعد عن وسائل التواصل طوال اليوم",
    icon: "📵",
  },
  {
    id: "charity",
    title: "Give Charity",
    title_ar: "تصدّق",
    description: "Give charity to someone in need today",
    description_ar: "تصدّق على محتاج اليوم",
    icon: "💝",
  },
  {
    id: "meditate_30",
    title: "30 Minutes Meditation",
    title_ar: "30 دقيقة تأمل",
    description: "Complete 30 minutes of meditation or dhikr",
    description_ar: "أكمل 30 دقيقة من التأمل أو الذكر",
    icon: "🧘",
  },
  {
    id: "read_book",
    title: "Read 50 Pages",
    title_ar: "اقرأ 50 صفحة",
    description: "Read 50 pages of a beneficial book",
    description_ar: "اقرأ 50 صفحة من كتاب مفيد",
    icon: "📚",
  },
  {
    id: "help_family",
    title: "Help Your Family",
    title_ar: "ساعد عائلتك",
    description: "Spend 2 hours helping your family with chores",
    description_ar: "اقضِ ساعتين في مساعدة عائلتك في المنزل",
    icon: "👨‍👩‍👧‍👦",
  },
];

// Monster types for variety
const BOSS_MONSTERS = [
  { emoji: "👹", name: "The Procrastination Demon", name_ar: "شيطان التسويف" },
  { emoji: "🐉", name: "The Dragon of Laziness", name_ar: "تنين الكسل" },
  { emoji: "👾", name: "The Digital Beast", name_ar: "الوحش الرقمي" },
  { emoji: "🦹", name: "The Shadow of Doubt", name_ar: "ظل الشك" },
  { emoji: "🧟", name: "The Zombie of Bad Habits", name_ar: "زومبي العادات السيئة" },
  { emoji: "👻", name: "The Ghost of Wasted Time", name_ar: "شبح الوقت الضائع" },
];

export const useWeeklyBoss = (userId: string | null) => {
  const [event, setEvent] = useState<WeeklyBossEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [showChest, setShowChest] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  const [rewards, setRewards] = useState<{
    lemons: number;
    xp: number;
    cosmetic: { name: string; name_ar: string; type: string } | null;
  } | null>(null);
  const { toast } = useToast();

  // Check if today is Friday (event day) - returns true for testing purposes or actual Friday
  const isBossEventDay = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Friday = 5, but for testing, we allow any day
    // In production, change to: return dayOfWeek === 5;
    return dayOfWeek === 5 || localStorage.getItem('debug_boss_event') === 'true';
  }, []);

  // Calculate time remaining until midnight
  const getTimeRemaining = useCallback(() => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 999);
    
    const diff = midnight.getTime() - now.getTime();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      total: diff,
    };
  }, []);

  // Initialize or fetch the weekly boss event
  const fetchEvent = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check if it's boss event day
    if (!isBossEventDay()) {
      setEvent(null);
      setLoading(false);
      return;
    }

    try {
      // Check localStorage for today's event
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `weekly_boss_${userId}_${today}`;
      const storedEvent = localStorage.getItem(storageKey);

      if (storedEvent) {
        const parsed = JSON.parse(storedEvent) as WeeklyBossEvent;
        setEvent(parsed);
        setQuestCompleted(parsed.is_completed);
        
        // Check if rewards were claimed
        if (parsed.reward_claimed) {
          // Don't show the event if reward was already claimed
          setEvent(null);
        }
      } else {
        // Create new event for today
        const randomQuest = BOSS_QUESTS[Math.floor(Math.random() * BOSS_QUESTS.length)];
        const randomBoss = BOSS_MONSTERS[Math.floor(Math.random() * BOSS_MONSTERS.length)];
        
        const midnight = new Date();
        midnight.setHours(23, 59, 59, 999);

        const newEvent: WeeklyBossEvent = {
          id: `event_${today}_${userId}`,
          boss_name: randomBoss.name,
          boss_name_ar: randomBoss.name_ar,
          boss_emoji: randomBoss.emoji,
          quest: randomQuest,
          is_active: true,
          is_completed: false,
          started_at: new Date().toISOString(),
          ends_at: midnight.toISOString(),
          reward_claimed: false,
        };

        localStorage.setItem(storageKey, JSON.stringify(newEvent));
        setEvent(newEvent);
      }
    } catch (error) {
      console.error("Error fetching weekly boss event:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, isBossEventDay]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  // Complete the quest
  const completeQuest = useCallback(async () => {
    if (!event || !userId || questCompleted) return;

    setQuestCompleted(true);
    
    // Update localStorage
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `weekly_boss_${userId}_${today}`;
    const updatedEvent = { ...event, is_completed: true };
    localStorage.setItem(storageKey, JSON.stringify(updatedEvent));
    setEvent(updatedEvent);

    // Show chest animation
    setShowChest(true);
  }, [event, userId, questCompleted]);

  // Handle chest opening
  const openChest = useCallback(async () => {
    if (!userId || chestOpened) return;

    setChestOpened(true);

    try {
      // Generate rewards
      const lemonReward = 500;
      const xpReward = 1000;

      // Try to get a random cosmetic the user doesn't own
      const { data: ownedItems } = await supabase
        .from("user_inventory")
        .select("item_id")
        .eq("user_id", userId);

      const ownedIds = new Set(ownedItems?.map(i => i.item_id) || []);

      const { data: allCosmetics } = await supabase
        .from("cosmetic_items")
        .select("*")
        .eq("is_active", true);

      const unownedCosmetics = allCosmetics?.filter(c => !ownedIds.has(c.id)) || [];
      
      let cosmeticReward = null;
      if (unownedCosmetics.length > 0) {
        const randomCosmetic = unownedCosmetics[Math.floor(Math.random() * unownedCosmetics.length)];
        
        // Add to user inventory
        await supabase.from("user_inventory").insert({
          user_id: userId,
          item_id: randomCosmetic.id,
        });

        cosmeticReward = {
          name: randomCosmetic.name,
          name_ar: randomCosmetic.name_ar,
          type: randomCosmetic.type,
        };
      }

      // Add XP
      await supabase.rpc("add_xp", {
        p_user_id: userId,
        p_amount: xpReward,
      });

      // Add points/lemons to challenge progress
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("total_points, weekly_points")
        .eq("user_id", userId)
        .single();

      if (progress) {
        await supabase
          .from("challenge_progress")
          .update({
            total_points: (progress.total_points || 0) + lemonReward,
            weekly_points: (progress.weekly_points || 0) + lemonReward,
          })
          .eq("user_id", userId);
      }

      setRewards({
        lemons: lemonReward,
        xp: xpReward,
        cosmetic: cosmeticReward,
      });
    } catch (error) {
      console.error("Error opening chest:", error);
      // Still show some rewards even on error
      setRewards({
        lemons: 500,
        xp: 1000,
        cosmetic: null,
      });
    }
  }, [userId, chestOpened]);

  // Claim all rewards and close
  const claimRewards = useCallback(async () => {
    if (!event || !userId) return;

    // Mark as claimed in localStorage
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `weekly_boss_${userId}_${today}`;
    const updatedEvent = { ...event, reward_claimed: true };
    localStorage.setItem(storageKey, JSON.stringify(updatedEvent));

    setShowChest(false);
    setEvent(null);
    setRewards(null);
  }, [event, userId]);

  // Apply penalty for failure
  const applyPenalty = useCallback(async (isArabic: boolean) => {
    if (!userId || !event) return;

    try {
      // Get current points
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("total_points")
        .eq("user_id", userId)
        .single();

      if (progress && progress.total_points > 0) {
        // Deduct 50% of lemons
        const penalty = Math.floor(progress.total_points * 0.5);
        await supabase
          .from("challenge_progress")
          .update({
            total_points: progress.total_points - penalty,
          })
          .eq("user_id", userId);

        toast({
          variant: "destructive",
          title: isArabic ? "هزيمة! 😢" : "DEFEAT! 😢",
          description: isArabic
            ? `خسرت ${penalty} ليمونة لأنك لم تكمل المهمة`
            : `You lost ${penalty} lemons for not completing the quest`,
        });
      }

      // Mark event as done
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `weekly_boss_${userId}_${today}`;
      const updatedEvent = { ...event, reward_claimed: true };
      localStorage.setItem(storageKey, JSON.stringify(updatedEvent));

      setShowDefeat(true);
    } catch (error) {
      console.error("Error applying penalty:", error);
    }
  }, [userId, event, toast]);

  const closeDefeat = useCallback(() => {
    setShowDefeat(false);
    setEvent(null);
  }, []);

  return {
    event,
    loading,
    questCompleted,
    showChest,
    showDefeat,
    chestOpened,
    rewards,
    getTimeRemaining,
    completeQuest,
    openChest,
    claimRewards,
    applyPenalty,
    closeDefeat,
    isBossEventDay: isBossEventDay(),
    refetch: fetchEvent,
  };
};

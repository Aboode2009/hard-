import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { ChallengeHeader } from "@/components/ChallengeHeader";
import { DailyTask } from "@/components/DailyTask";
import { WelcomeOnboarding } from "@/components/WelcomeOnboarding";
import { SimpleWeekCalendar } from "@/components/SimpleWeekCalendar";
import { AddCustomTask } from "@/components/AddCustomTask";
import { HomeHeader } from "@/components/HomeHeader";
import { BottomNav } from "@/components/BottomNav";
import { EmptyTasksState } from "@/components/EmptyTasksState";
import { MoodTracker } from "@/components/MoodTracker";
import { getStreakBonus } from "@/components/HostageVault";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";

import { InventoryModal } from "@/components/cosmetics/InventoryModal";
import { LevelUpRewardAnimation } from "@/components/cosmetics/LevelUpRewardAnimation";
import { useLevelUpReward } from "@/hooks/useLevelUpReward";
import { WeeklyBossEvent, DefeatScreen } from "@/components/rpg/WeeklyBossEvent";
import { XPBar } from "@/components/rpg/XPBar";
import { Button } from "@/components/ui/button";
import {
  DuoDumbbell, DuoMoon, DuoWater, DuoBook,
  DuoSalad, DuoSnowflake, DuoChecklist,
  DuoUsers, DuoChat, DuoMegaphone, DuoStar
} from "@/components/icons/DuolingoIcons";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { CompatSession } from "@/lib/clerk-auth";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notificationService, TaskReminder } from "@/lib/notifications";
import { useUserCosmetics } from "@/hooks/useUserCosmetics";
import { useLootBoxReward } from "@/hooks/useLootBoxReward";
import { useXP } from "@/hooks/useXP";
import { useWeeklyBoss } from "@/hooks/useWeeklyBoss";

const POINTS_PER_TASK = 1;

const Index = () => {
  const [session, setSession] = useState<CompatSession>(null);
  const [loading, setLoading] = useState(true);
  // True when a NASS employee is viewing the main Tasks page manually (via the
  // switch button) — used to show a "back to NASS" button in the header.
  const [isNassEmployee, setIsNassEmployee] = useState(false);
  const [celebrateConfetti, setCelebrateConfetti] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isAdmin, setIsAdmin] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminders, setReminders] = useState<Record<number, TaskReminder>>({});
  const [stageLevel, setStageLevel] = useState(1);
  const [totalPoints, setTotalPoints] = useState(0);
  const [customTasks, setCustomTasks] = useState<{id: string; title: string; description: string | null; tag_id: string | null; completed: boolean; tagName?: string; tagColor?: string}[]>([]);
  const [lifeTags, setLifeTags] = useState<Record<string, {name: string; name_ar: string; color: string}>>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewingDay, setViewingDay] = useState<number | null>(null); // null = viewing current day
  const [taskFilter, setTaskFilter] = useState("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [userProfile, setUserProfile] = useState<{avatar_url: string | null; username: string} | null>(null);
  const [tasksStateCache, setTasksStateCache] = useState<Record<string, Record<string, boolean>>>({});
  const [taskColors, setTaskColors] = useState<Record<number, string>>({});
  const [countdownToMidnight, setCountdownToMidnight] = useState<string>("");
  const [inventoryOpen, setInventoryOpen] = useState(false);
  
  // Cosmetics hooks
  const { equippedFrame, equippedBadge, lootBoxes, refetch: refetchCosmetics } = useUserCosmetics(session?.user?.id || null);
  
  // XP & Boss Fight hooks
  const { xp, level, xpProgress, xpForCurrentLevel, xpForNextLevel, addXP, refetch: refetchXP } = useXP(session?.user?.id || null);

  // Level-up chest ceremony (Duolingo-style reward chest)
  const {
    triggerLevelUpReward,
    currentReward,
    showRewardAnimation,
    closeRewardAnimation,
  } = useLevelUpReward(session?.user?.id || null);
  const { 
    event: weeklyBossEvent,
    questCompleted,
    showChest,
    showDefeat,
    chestOpened,
    rewards,
    getTimeRemaining,
    completeQuest,
    openChest,
    claimRewards,
    closeDefeat,
    isBossEventDay,
    refetch: refetchWeeklyBoss 
  } = useWeeklyBoss(session?.user?.id || null);
  
  // Countdown timer to midnight
  useEffect(() => {
    const isDayCompleted = completedDays.has(currentDay);
    if (!isDayCompleted) {
      setCountdownToMidnight("");
      return;
    }
    
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdownToMidnight(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [completedDays, currentDay]);
  
  const stage1Tasks = [
    { id: 1, title: "sport", icon: <DuoDumbbell className="w-8 h-8" />, completed: false },
    { id: 2, title: "sleep", icon: <DuoMoon className="w-8 h-8" />, completed: false },
    { id: 3, title: "water", icon: <DuoWater className="w-8 h-8" />, completed: false },
    { id: 4, title: "reading", icon: <DuoBook className="w-8 h-8" />, completed: false },
    { id: 5, title: "noSugar", icon: <DuoSalad className="w-8 h-8" />, completed: false },
  ];

  const stage2Tasks = [
    { id: 1, title: "sport", icon: <DuoDumbbell className="w-8 h-8" />, completed: false },
    { id: 2, title: "sleep", icon: <DuoMoon className="w-8 h-8" />, completed: false },
    { id: 3, title: "water", icon: <DuoWater className="w-8 h-8" />, completed: false },
    { id: 4, title: "reading", icon: <DuoBook className="w-8 h-8" />, completed: false },
    { id: 5, title: "noSugar", icon: <DuoSalad className="w-8 h-8" />, completed: false },
    { id: 7, title: "coldShower", icon: <DuoSnowflake className="w-8 h-8" />, completed: false },
    { id: 8, title: "dailyTask", icon: <DuoChecklist className="w-8 h-8" />, completed: false },
    { id: 9, title: "communityService", icon: <DuoUsers className="w-8 h-8" />, completed: false },
  ];

  const stage3Tasks = [
    { id: 1, title: "sport", icon: <DuoDumbbell className="w-8 h-8" />, completed: false },
    { id: 2, title: "sleep", icon: <DuoMoon className="w-8 h-8" />, completed: false },
    { id: 3, title: "water", icon: <DuoWater className="w-8 h-8" />, completed: false },
    { id: 4, title: "reading", icon: <DuoBook className="w-8 h-8" />, completed: false },
    { id: 5, title: "noSugar", icon: <DuoSalad className="w-8 h-8" />, completed: false },
    { id: 7, title: "coldShower", icon: <DuoSnowflake className="w-8 h-8" />, completed: false },
    { id: 8, title: "dailyTask", icon: <DuoChecklist className="w-8 h-8" />, completed: false },
    { id: 9, title: "talkToStranger", icon: <DuoChat className="w-8 h-8" />, completed: false },
    { id: 10, title: "makeDawa", icon: <DuoMegaphone className="w-8 h-8" />, completed: false },
  ];

  const [tasks, setTasks] = useState(stage1Tasks);

  const getStageDays = (stage: number) => {
    if (stage === 1) return 21;
    if (stage === 2) return 45;
    if (stage === 3) return 75;
    return 21;
  };

  const totalDays = getStageDays(stageLevel);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  // Loot box reward hook (must be after tasks and i18n are declared)
  useLootBoxReward({
    userId: session?.user?.id || null,
    completedDays,
    currentDay,
    tasks,
    customTasks,
    isArabic: i18n.language === 'ar',
  });

  useEffect(() => {
    const checkNassUser = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_code")
        .eq("id", userId)
        .single();

      const isNass = profile?.company_code === "NASS";
      setIsNassEmployee(isNass);

      // NASS employees are auto-sent to their challenge on normal entry, but NOT
      // when they deliberately switched to Tasks (the button adds ?from=nass).
      // Reading the URL fresh each call avoids a stale closure across auth events.
      const cameFromNass =
        new URLSearchParams(window.location.search).get("from") === "nass";

      if (isNass && !cameFromNass) {
        navigate("/nass");
        return true; // redirected away
      }
      return false; // stay on Tasks (non-NASS, or NASS viewing manually)
    };

    // Set up auth listener FIRST (keep callback synchronous to avoid deadlocks)
    const {
      data: { subscription },
    } = clerkAuth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (!session) {
        navigate("/auth");
        setLoading(false);
        return;
      }

      // Defer any extra supabase calls to avoid running them inside the callback
      setTimeout(() => {
        checkNassUser(session.user.id);
      }, 0);

      setLoading(false);
    });

    // THEN check for existing session
    clerkAuth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        // Check if user is NASS employee - redirect to NASS challenge
        const isNassUser = await checkNassUser(session.user.id);
        if (isNassUser) return;

        // Check if user has seen onboarding (user-specific)
        const hasSeenOnboarding = localStorage.getItem(`hasSeenOnboarding_${session.user.id}`);

        if (!hasSeenOnboarding) {
          setShowOnboarding(true);
        }

        fetchProgress();
        checkAdminStatus();
        fetchReminders();
        fetchCustomTasks();
        fetchUserProfile();
        // Load task colors from localStorage. Guarded: a corrupt value used to
        // throw here, which skipped setLoading(false) below and left the app
        // stuck on the loading screen with no way out but clearing site data.
        const savedColors = localStorage.getItem(`task_colors_${session.user.id}`);
        if (savedColors) {
          try {
            setTaskColors(JSON.parse(savedColors));
          } catch {
            localStorage.removeItem(`task_colors_${session.user.id}`);
          }
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Schedule all task reminders including urgent ones based on task completion
  useEffect(() => {
    const allTasksCompleted = tasks.every(task => task.completed);
    const isArabic = t('nav.home') === 'الرئيسية';
    
    if (session) {
      // Use the new combined method that handles all reminders
      notificationService.scheduleAllTaskReminders(allTasksCompleted, isArabic);
    }
  }, [tasks, session, t]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      if (!error && data) {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const fetchReminders = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("task_reminders")
        .select("*")
        .eq("user_id", session.user.id);

      if (error) throw error;

      const remindersMap: Record<number, TaskReminder> = {};
      data?.forEach(reminder => {
        remindersMap[reminder.task_id] = {
          id: reminder.id,
          task_id: reminder.task_id,
          reminder_time: reminder.reminder_time,
          is_enabled: reminder.is_enabled,
        };
      });

      setReminders(remindersMap);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  const fetchCustomTasks = async () => {
    try {
      const { data: { session } } = await clerkAuth.getSession();
      if (!session) return;

      // Fetch tags first
      const { data: tagsData } = await supabase
        .from("life_area_tags")
        .select("*");
      
      const tagsMap: Record<string, {name: string; name_ar: string; color: string}> = {};
      tagsData?.forEach(tag => {
        tagsMap[tag.id] = { name: tag.name, name_ar: tag.name_ar, color: tag.color };
      });
      setLifeTags(tagsMap);

      const { data, error } = await supabase
        .from("custom_tasks")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      if (error) throw error;

      // Get today's completion status from tasks_state
      const { data: progressData } = await supabase
        .from("challenge_progress")
        .select("tasks_state")
        .eq("user_id", session.user.id)
        .maybeSingle();

      const tasksState = (progressData?.tasks_state || {}) as Record<string, Record<string, boolean>>;
      const todayKey = `day_${currentDay}`;
      const todayTasks = tasksState[todayKey] || {};

      // Get custom reminders/colors from localStorage
      const customReminders = JSON.parse(localStorage.getItem(`custom_reminders_${session.user.id}`) || '{}');
      const customSettings = JSON.parse(localStorage.getItem(`custom_settings_${session.user.id}`) || '{}');

      setCustomTasks(data?.map(task => {
        const tagInfo = task.tag_id ? tagsMap[task.tag_id] : null;
        const customConfig = customReminders[task.id] || {};
        const taskSettings = customSettings[task.id] || {};
        return {
          ...task,
          completed: todayTasks[`custom_${task.id}`] || false,
          tagName: tagInfo ? (i18n.language === 'ar' ? tagInfo.name_ar : tagInfo.name) : undefined,
          tagColor: taskSettings.color || customConfig.color || tagInfo?.color,
        };
      }) || []);
    } catch (error) {
      console.error("Error fetching custom tasks:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await clerkAuth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, username")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchProgress = useCallback(async () => {
    try {
      const { data: { session: currentSession } } = await clerkAuth.getSession();
      if (!currentSession?.user?.id) return;

      const { data, error } = await supabase
        .from("challenge_progress")
        .select("*")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const stage = data.stage_level || 1;
        const start = new Date(data.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        
        // Calculate current day based on calendar
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const stageDays = getStageDays(stage);
        const calculatedDay = Math.min(diffDays + 1, stageDays);
        
        const completedDaysArray = (data.completed_days || []) as number[];
        const completedDaysSet = new Set(completedDaysArray);
        
        // Check if user missed any day - if they're on day > 1 and didn't complete yesterday
        let shouldReset = false;
        const missedDays: number[] = [];

        if (calculatedDay > 1) {
          for (let day = 1; day < calculatedDay; day++) {
            if (!completedDaysSet.has(day)) {
              missedDays.push(day);
            }
          }
          shouldReset = missedDays.length > 0;
        }

        // Streak Freeze: consume one shield per missed day instead of resetting.
        const freezes = data.streak_freezes ?? 0;
        if (shouldReset && freezes >= missedDays.length) {
          missedDays.forEach((day) => completedDaysSet.add(day));

          const { error: freezeError } = await supabase
            .from("challenge_progress")
            .update({
              completed_days: Array.from(completedDaysSet),
              streak_freezes: freezes - missedDays.length,
            })
            .eq("user_id", currentSession.user.id);

          if (!freezeError) {
            shouldReset = false;
            toast({
              title: i18n.language === 'ar' ? "درع التجميد أنقذ ستريكك" : "Streak Freeze saved your streak",
              description: i18n.language === 'ar'
                ? `تم استهلاك ${missedDays.length === 1 ? "درع واحد" : `${missedDays.length} دروع`} لتغطية الأيام الفائتة`
                : `${missedDays.length} freeze${missedDays.length > 1 ? "s" : ""} used to cover missed days`,
            });
          }
        }

        if (shouldReset) {
          const { error: resetError } = await supabase
            .from("challenge_progress")
            .update({
              current_day: 1,
              current_streak: 0,
              completed_days: [],
              start_date: new Date().toISOString().split('T')[0],
              tasks_state: {},
            })
            .eq("user_id", currentSession.user.id);

          if (resetError) throw resetError;

          toast({
            variant: "destructive",
            title: t('challenge.resetTitle') || "تم إعادة التحدي",
            description: t('challenge.resetDescription') || "لم تكمل مهام الأيام السابقة، تم إرجاعك لليوم الأول",
          });

          setStageLevel(stage);
          setCurrentDay(1);
          setCurrentStreak(0);
          setCompletedDays(new Set());
          setStartDate(new Date());
          
          const stageTasks = stage === 1 ? stage1Tasks : stage === 2 ? stage2Tasks : stage3Tasks;
          setTasks(stageTasks.map(task => ({
            ...task,
            completed: false
          })));
        } else {
          // Normal flow - no reset needed
          setStageLevel(stage);
          setCurrentDay(calculatedDay);
          setCurrentStreak(data.current_streak);
          setCompletedDays(completedDaysSet);
          setStartDate(new Date(data.start_date));
          setTotalPoints(data.total_points || 0);
          
          const stageTasks = stage === 1 ? stage1Tasks : stage === 2 ? stage2Tasks : stage3Tasks;
          
          // Load tasks for current day from tasks_state
          const tasksState = (data.tasks_state || {}) as Record<string, Record<number, boolean>>;
          const todayKey = `day_${calculatedDay}`;
          const todayTasks = tasksState[todayKey] || {};
          
          setTasks(stageTasks.map(task => ({
            ...task,
            completed: !!todayTasks[task.id]
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  }, [t, toast, navigate]);

  // Refetch progress when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session) {
        fetchProgress();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, fetchProgress]);

  const toggleTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    // Completions are final — a checked task cannot be unchecked.
    if (task?.completed) return;
    const wasCompleted = task?.completed;
    const isArabic = i18n.language === 'ar';
    
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    // Save task state for current day
    try {
      const { data, error: fetchError } = await supabase
        .from("challenge_progress")
        .select("tasks_state, weekly_points, total_points")
        .eq("user_id", session?.user?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const tasksState = (data?.tasks_state || {}) as Record<string, Record<string, boolean>>;
      const todayKey = `day_${currentDay}`;
      
      // Preserve existing custom task entries, update only stage tasks
      const existingDayTasks = tasksState[todayKey] || {};
      const updatedDayTasks: Record<string, boolean> = {};
      
      // Keep custom task entries
      Object.keys(existingDayTasks).forEach(key => {
        if (key.startsWith('custom_')) {
          updatedDayTasks[key] = existingDayTasks[key];
        }
      });
      
      // Update stage tasks
      updatedTasks.forEach(task => {
        updatedDayTasks[String(task.id)] = task.completed;
      });
      
      tasksState[todayKey] = updatedDayTasks;

      // Calculate points based on current day (increases as challenge progresses)
      const basePoints = Math.min(Math.floor(currentDay / 2) + 1, 10); // 1-10 points based on day
      const pointChange = wasCompleted ? -basePoints : basePoints;
      const newWeeklyPoints = Math.max(0, (data?.weekly_points || 0) + pointChange);
      const newTotalPoints = Math.max(0, (data?.total_points || 0) + pointChange);
      
      setTotalPoints(newTotalPoints);

      const { error: updateError } = await supabase
        .from("challenge_progress")
        .update({ 
          tasks_state: tasksState,
          weekly_points: newWeeklyPoints,
          total_points: newTotalPoints
        })
        .eq("user_id", session?.user?.id);

      if (updateError) throw updateError;

      // XP & Boss Fight integration
      if (!wasCompleted) {
        // Record in task_completions for history
        await supabase.from("task_completions").insert({
          user_id: session?.user?.id,
          task_key: task?.title || `task_${taskId}`,
          points_earned: basePoints,
        });

        // Add XP for completing task (+10 XP)
        await addXP(10, isArabic, triggerLevelUpReward);
      }
    } catch (error) {
      console.error("Error saving task state:", error);
    }
  };

  const toggleCustomTask = async (taskId: string) => {
    const task = customTasks.find(t => t.id === taskId);
    // Completions are final — a checked task cannot be unchecked.
    if (task?.completed) return;
    const wasCompleted = task?.completed;
    const isArabic = i18n.language === 'ar';
    
    const updatedCustomTasks = customTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setCustomTasks(updatedCustomTasks);

    // Save custom task state
    try {
      const { data, error: fetchError } = await supabase
        .from("challenge_progress")
        .select("tasks_state, weekly_points, total_points")
        .eq("user_id", session?.user?.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const tasksState = (data?.tasks_state || {}) as Record<string, Record<string, boolean>>;
      const todayKey = `day_${currentDay}`;
      
      if (!tasksState[todayKey]) {
        tasksState[todayKey] = {};
      }
      
      // Update custom task status
      const customTaskKey = `custom_${taskId}`;
      tasksState[todayKey][customTaskKey] = !wasCompleted;

      // Calculate points based on current day
      const basePoints = Math.min(Math.floor(currentDay / 2) + 1, 10);
      const pointChange = wasCompleted ? -basePoints : basePoints;
      const newWeeklyPoints = Math.max(0, (data?.weekly_points || 0) + pointChange);
      const newTotalPoints = Math.max(0, (data?.total_points || 0) + pointChange);
      
      setTotalPoints(newTotalPoints);

      const { error: updateError } = await supabase
        .from("challenge_progress")
        .update({ 
          tasks_state: tasksState,
          weekly_points: newWeeklyPoints,
          total_points: newTotalPoints
        })
        .eq("user_id", session?.user?.id);

      if (updateError) throw updateError;

      // XP & Boss Fight integration
      if (!wasCompleted) {
        // Record in task_completions for history
        await supabase.from("task_completions").insert({
          user_id: session?.user?.id,
          task_key: task?.title || `custom_${taskId}`,
          points_earned: basePoints,
        });

        // Add XP for completing task (+10 XP)
        await addXP(10, isArabic, triggerLevelUpReward);
      }
    } catch (error) {
      console.error("Error saving custom task state:", error);
    }
  };

  // Delete a custom task
  const deleteCustomTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("custom_tasks")
        .update({ is_active: false })
        .eq("id", taskId)
        .eq("user_id", session?.user?.id);

      if (error) throw error;

      // Remove from local state
      setCustomTasks(prev => prev.filter(task => task.id !== taskId));

      toast({
        title: i18n.language === 'ar' ? "تم الحذف" : "Deleted",
        description: i18n.language === 'ar' ? "تم حذف المهمة بنجاح" : "Task deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting custom task:", error);
      toast({
        variant: "destructive",
        title: i18n.language === 'ar' ? "خطأ" : "Error",
        description: i18n.language === 'ar' ? "فشل حذف المهمة" : "Failed to delete task",
      });
    }
  };

  // Handle calendar date selection to view past day's tasks
  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    
    // Calculate which challenge day this date corresponds to
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffTime = date.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const selectedDay = diffDays + 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();
    
    // If date is before challenge start or in the future beyond current day, ignore
    if (selectedDay < 1 || selectedDay > currentDay) {
      if (!isToday) {
        toast({
          title: i18n.language === 'ar' ? "غير متاح" : "Not available",
          description: i18n.language === 'ar' ? "لا يمكن عرض مهام هذا اليوم" : "Cannot view tasks for this day",
        });
        return;
      }
    }
    
    if (isToday || selectedDay === currentDay) {
      // Viewing current day - reset to normal mode
      setViewingDay(null);
      fetchProgress(); // Reload current day tasks
      return;
    }
    
    setViewingDay(selectedDay);
    
    // Load tasks for the selected day from cache or database
    const dayKey = `day_${selectedDay}`;
    
    try {
      const { data } = await supabase
        .from("challenge_progress")
        .select("tasks_state")
        .eq("user_id", session?.user?.id)
        .maybeSingle();
      
      const tasksState = (data?.tasks_state || {}) as Record<string, Record<string, boolean>>;
      setTasksStateCache(tasksState);
      const dayTasks = tasksState[dayKey] || {};
      
      // Load tasks with the day's completion status
      const stageTasks = stageLevel === 1 ? stage1Tasks : stageLevel === 2 ? stage2Tasks : stage3Tasks;
      setTasks(stageTasks.map(task => ({
        ...task,
        completed: dayTasks[task.id] || false
      })));
      
      // Load custom tasks for that day
      setCustomTasks(prev => prev.map(task => ({
        ...task,
        completed: dayTasks[`custom_${task.id}`] || false
      })));
    } catch (error) {
      console.error("Error loading day tasks:", error);
    }
  };

  // Check if viewing a past day (read-only mode)
  const isViewingPastDay = viewingDay !== null && viewingDay < currentDay;

  // Map default tasks to life areas for Wheel of Life
  const taskToLifeArea: Record<string, string> = {
    sport: 'fitness',
    sleep: 'health',
    water: 'health',
    reading: 'learning',
    noSugar: 'health',
    coldShower: 'health',
    dailyTask: 'work',
    communityService: 'relationships',
    talkToStranger: 'relationships',
    makeDawa: 'religion',
  };

  const recordTaskCompletions = async () => {
    if (!session?.user?.id) return;

    try {
      // Fetch life area tags
      const { data: tags } = await supabase
        .from('life_area_tags')
        .select('*');

      const tagMap = tags?.reduce((acc, tag) => {
        acc[tag.name] = tag.id;
        return acc;
      }, {} as Record<string, string>) || {};

      const completions: any[] = [];

      // Add default task completions
      tasks.forEach(task => {
        if (task.completed) {
          const areaName = taskToLifeArea[task.title];
          completions.push({
            user_id: session.user.id,
            task_key: task.title,
            tag_id: areaName ? tagMap[areaName] : null,
            points_earned: POINTS_PER_TASK,
          });
        }
      });

      // Add custom task completions
      customTasks.forEach(task => {
        if (task.completed) {
          completions.push({
            user_id: session.user.id,
            task_key: `custom_${task.id}`,
            tag_id: task.tag_id,
            points_earned: POINTS_PER_TASK,
          });
        }
      });

      if (completions.length > 0) {
        await supabase.from('task_completions').insert(completions);
      }
    } catch (error) {
      console.error('Error recording task completions:', error);
    }
  };

  const completeDay = async () => {
    // Check if today was already completed
    if (completedDays.has(currentDay)) {
      toast({
        title: i18n.language === 'ar' ? "تم إكمال اليوم بالفعل" : "Day already completed",
        description: i18n.language === 'ar' ? "عد غداً لإكمال المهام الجديدة" : "Come back tomorrow for new tasks",
      });
      return;
    }
    
    const allTasksCompleted = tasks.every(task => task.completed);
    
    if (!allTasksCompleted) {
      toast({
        variant: "destructive",
        title: t('challenge.allTasksRequired'),
      });
      return;
    }

    try {
      const newCompletedDays = new Set([...completedDays, currentDay]);
      const newStreak = currentStreak + 1;
      const bestStreak = Math.max(newStreak, currentStreak);
      
      // Calculate points for completing all tasks + streak bonus
      const streakBonus = getStreakBonus(currentStreak);
      const dayPoints = ((tasks.length + customTasks.filter(t => t.completed).length) * POINTS_PER_TASK) + streakBonus;
      const newTotalPoints = totalPoints + dayPoints;
      
      // Record task completions for Wheel of Life
      await recordTaskCompletions();
      
      // Check if stage is completed
      if (currentDay >= totalDays) {
        // Bonus for completing stage
        const stageBonusPoints = stageLevel === 1 ? 500 : stageLevel === 2 ? 1000 : 2000;
        
        if (stageLevel === 1) {
          // Move to stage 2
          const { error } = await supabase
            .from("challenge_progress")
            .update({
              stage_level: 2,
              current_day: 1,
              current_streak: newStreak,
              best_streak: bestStreak,
              completed_days: [],
              start_date: new Date().toISOString().split('T')[0],
              tasks_state: {},
              total_points: newTotalPoints + stageBonusPoints,
            })
            .eq("user_id", session?.user?.id);

          if (error) throw error;

          toast({
            title: t('challenge.stageCompleted', { stage: t('challenge.stageName') }),
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (stageLevel === 2) {
          // Move to stage 3
          const { error } = await supabase
            .from("challenge_progress")
            .update({
              stage_level: 3,
              current_day: 1,
              current_streak: newStreak,
              best_streak: bestStreak,
              completed_days: [],
              start_date: new Date().toISOString().split('T')[0],
              tasks_state: {},
              total_points: newTotalPoints + stageBonusPoints,
            })
            .eq("user_id", session?.user?.id);

          if (error) throw error;

          toast({
            title: t('challenge.stageCompleted', { stage: t('challenge.stage2Name') }),
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (stageLevel === 3) {
          // All stages completed
          await supabase
            .from("challenge_progress")
            .update({
              total_points: newTotalPoints + stageBonusPoints,
            })
            .eq("user_id", session?.user?.id);
            
          toast({
            title: t('challenge.allStagesCompleted'),
          });
          setTimeout(() => navigate("/leaderboard"), 2000);
        }
      } else {
        // Continue in current stage
        const nextDay = currentDay + 1;
        const { error } = await supabase
          .from("challenge_progress")
          .update({
            current_day: nextDay,
            current_streak: newStreak,
            best_streak: bestStreak,
            completed_days: Array.from(newCompletedDays),
            total_points: newTotalPoints,
          })
          .eq("user_id", session?.user?.id);

        if (error) throw error;

        setTotalPoints(newTotalPoints);
        
        // Select a random motivational message
        const motivationalKeys = ['motivational1', 'motivational2', 'motivational3', 'motivational4', 'motivational5'];
        const randomKey = motivationalKeys[Math.floor(Math.random() * motivationalKeys.length)];
        
        // Trigger confetti celebration
        setCelebrateConfetti(true);
        setTimeout(() => setCelebrateConfetti(false), 3000);
        
        toast({
          title: t('challenge.dayCompleted', { day: currentDay }),
          description: t(`challenge.${randomKey}`),
        });
        
        setCurrentStreak(newStreak);
        setCompletedDays(newCompletedDays);
        
        // Refresh to load next day's tasks
        await fetchProgress();
      }
    } catch (error) {
      console.error("Error completing day:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save progress",
      });
    }
  };

  const handleLogout = async () => {
    await clerkAuth.signOut();
    navigate("/auth");
  };

  const handleTaskColorChange = (taskId: number, color: string) => {
    const newColors = { ...taskColors, [taskId]: color };
    if (!color) {
      delete newColors[taskId];
    }
    setTaskColors(newColors);
    if (session?.user?.id) {
      localStorage.setItem(`task_colors_${session.user.id}`, JSON.stringify(newColors));
    }
  };

  const handleReminderClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    const existingReminder = reminders[taskId];
    setReminderTime(existingReminder?.reminder_time || "09:00");
    setReminderDialogOpen(true);
  };

  const saveReminder = async () => {
    if (!selectedTaskId || !session?.user?.id) return;

    try {
      const existingReminder = reminders[selectedTaskId];

      if (existingReminder?.id) {
        // Update existing reminder
        const { error } = await supabase
          .from("task_reminders")
          .update({
            reminder_time: reminderTime,
            is_enabled: true,
          })
          .eq("id", existingReminder.id);

        if (error) throw error;
      } else {
        // Create new reminder
        const { data, error } = await supabase
          .from("task_reminders")
          .insert({
            user_id: session.user.id,
            task_id: selectedTaskId,
            reminder_time: reminderTime,
            is_enabled: true,
          })
          .select()
          .single();

        if (error) throw error;
      }

      // Refresh reminders
      await fetchReminders();

      // Schedule notifications
      const hasPermission = await notificationService.checkPermission();
      if (hasPermission) {
        const taskNames = tasks.reduce((acc, task) => {
          acc[task.id] = t(`tasks.${task.title}.title`);
          return acc;
        }, {} as Record<number, string>);

        const allReminders = Object.values({ ...reminders, [selectedTaskId]: { task_id: selectedTaskId, reminder_time: reminderTime, is_enabled: true } });
        await notificationService.scheduleTaskReminders(allReminders as TaskReminder[], taskNames);
      }

      setReminderDialogOpen(false);
      toast({
        title: t('index.saved'),
        description: t('index.reminderSet'),
      });
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast({
        title: t('index.error'),
        description: t('index.failedToSaveReminder'),
        variant: "destructive",
      });
    }
  };

  const handleOnboardingComplete = () => {
    if (session?.user?.id) {
      localStorage.setItem(`hasSeenOnboarding_${session.user.id}`, "true");
    }
    setShowOnboarding(false);
    setLoading(false);
    
  };


  if (showOnboarding) {
    return <WelcomeOnboarding onComplete={handleOnboardingComplete} />;
  }


  if (loading) {
    // No splash / loading page — render nothing (background only) during the
    // brief data fetch so navigating to Home is instant.
    return null;
  }

  return (
    <div className="duo-page min-h-screen bg-background pb-20 overflow-y-auto overflow-x-hidden">
      {/* Home Header */}
      <HomeHeader
        avatarUrl={userProfile?.avatar_url}
        username={userProfile?.username}
        selectedFilter={taskFilter}
        totalPoints={totalPoints}
        onFilterChange={setTaskFilter}
        onAvatarClick={() => setInventoryOpen(true)}
        frameClass={equippedFrame?.css_class}
        badgeEmoji={equippedBadge?.css_class}
        lootBoxes={lootBoxes}
        level={level}
        showSwitchButton={isNassEmployee}
        switchTo="/nass"
        switchTitle={i18n.language === "ar" ? "تحدّي NASS" : "NASS Challenge"}
      />

      {/* Inventory Modal */}
      <InventoryModal
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        userId={session?.user?.id || ''}
        onEquipmentChange={refetchCosmetics}
      />
      
      {/* XP Bar */}
      <div className="px-4 mb-3">
        <XPBar
          xp={xp}
          level={level}
          xpProgress={xpProgress}
          xpForCurrentLevel={xpForCurrentLevel}
          xpForNextLevel={xpForNextLevel}
          isArabic={i18n.language === 'ar'}
          compact
        />
      </div>

      {/* Confetti Celebration */}
      <ConfettiCelebration trigger={celebrateConfetti} />
      
      {/* Week Calendar Bar */}
      <div className="px-4 mb-4 bg-card rounded-xl shadow-sm border border-border/50">
        <SimpleWeekCalendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          completedDates={new Set(
            Array.from(completedDays).map(day => {
              const date = addDays(new Date(startDate), day - 1);
              return format(date, 'yyyy-MM-dd');
            })
          )}
        />
      </div>
      
      {/* Weekly Boss Event - Only shows on Fridays */}
      {isBossEventDay && weeklyBossEvent && (
        <div className="px-4 mb-4">
          <WeeklyBossEvent
            event={weeklyBossEvent}
            questCompleted={questCompleted}
            showChest={showChest}
            chestOpened={chestOpened}
            rewards={rewards}
            getTimeRemaining={getTimeRemaining}
            onCompleteQuest={completeQuest}
            onOpenChest={openChest}
            onClaimRewards={claimRewards}
            isArabic={i18n.language === 'ar'}
          />
        </div>
      )}
      
      {/* Defeat Screen */}
      {showDefeat && (
        <DefeatScreen
          isArabic={i18n.language === 'ar'}
          onClose={closeDefeat}
        />
      )}
      
      {/* Viewing Past Day Indicator */}
      {isViewingPastDay && (
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border/50">
            <span className="text-sm text-muted-foreground">
              {i18n.language === 'ar' 
                ? `عرض اليوم ${viewingDay} (للقراءة فقط)`
                : `Viewing Day ${viewingDay} (read-only)`}
            </span>
            <button 
              onClick={() => handleDateSelect(new Date())}
              className="text-xs text-primary font-medium hover:underline"
            >
              {i18n.language === 'ar' ? "العودة لليوم" : "Back to today"}
            </button>
          </div>
        </div>
      )}
      
      {/* Countdown Timer - Show when day is completed */}
      {!isViewingPastDay && completedDays.has(currentDay) && countdownToMidnight && (
        <div className="px-4 mb-4">
          <div className="duo-card p-4 flex items-center gap-4">
            <div className="w-14 h-14 flex-shrink-0">
              <DuoMoon className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                {i18n.language === 'ar' ? 'أحسنت! أكملت يومك' : 'Great job! Day complete'}
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                {i18n.language === 'ar' ? 'المهام الجديدة تفتح خلال' : 'New tasks unlock in'}
              </p>
            </div>
            <div className="px-3 py-2 rounded-xl flex-shrink-0" style={{ background: "#FFC8001e" }}>
              <span className="text-xl font-extrabold tabular-nums" style={{ color: "#FFC800" }} dir="ltr">
                {countdownToMidnight}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Filter tasks based on selected filter */}
        {(() => {
          const filteredTasks = taskFilter === "all" 
            ? tasks 
            : taskFilter === "completed" 
              ? tasks.filter(t => t.completed)
              : tasks.filter(t => !t.completed);
          
          const filteredCustomTasks = taskFilter === "all"
            ? customTasks
            : taskFilter === "completed"
              ? customTasks.filter(t => t.completed)
              : customTasks.filter(t => !t.completed);

          const hasTasks = filteredTasks.length > 0 || filteredCustomTasks.length > 0;

          if (!hasTasks && taskFilter !== "all") {
            return <EmptyTasksState onAddClick={() => setShowAddTask(true)} />;
          }

          return (
            <>
              {/* Tasks List */}
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const reminder = reminders[task.id];
                  return (
                    <DailyTask
                      key={task.id}
                      title={t(`tasks.${task.title}.title`)}
                      description={t(`tasks.${task.title}.description`)}
                      icon={task.icon}
                      completed={task.completed}
                      onToggle={() => !isViewingPastDay && toggleTask(task.id)}
                      reminderTime={reminder?.is_enabled ? reminder.reminder_time : undefined}
                      hasReminder={reminder?.is_enabled || false}
                      onReminderClick={() => !isViewingPastDay && handleReminderClick(task.id)}
                      customColor={taskColors[task.id]}
                      onColorChange={(color) => handleTaskColorChange(task.id, color)}
                    />
                  );
                })}
                
                {/* Custom Tasks */}
                {filteredCustomTasks.map((task) => {
                  // Check if description is an emoji (used as icon)
                  const isEmoji = task.description && /\p{Emoji}/u.test(task.description) && task.description.length <= 4;
                  return (
                    <DailyTask
                      key={`custom-${task.id}`}
                      title={task.title}
                      description=""
                      icon={<DuoStar className="w-8 h-8" />}
                      completed={task.completed}
                      onToggle={() => !isViewingPastDay && toggleCustomTask(task.id)}
                      hasReminder={false}
                      tagName={task.tagName}
                      tagColor={task.tagColor}
                      customColor={task.tagColor}
                      canDelete={!isViewingPastDay}
                      onDelete={() => deleteCustomTask(task.id)}
                    />
                  );
                })}
              </div>

              {/* Complete Day Button - Only show for current day */}
              {!isViewingPastDay && (
                <Button
                  size="lg"
                  className={cn(
                    "w-full h-14 text-lg font-bold rounded-2xl uppercase tracking-widest",
                    "text-white border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-150",
                    tasks.every(task => task.completed)
                      ? "bg-[#58cc02] hover:bg-[#46a302] border-[#58a700]"
                      : "bg-[#e5e5e5] hover:bg-[#e5e5e5] border-[#d8d8d8] text-[#afafaf]"
                  )}
                  onClick={completeDay}
                  disabled={!tasks.every(task => task.completed)}
                >
                  {t('challenge.completeDay')}
                </Button>
              )}
            </>
          );
        })()}
      </div>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('index.setReminder')}</DialogTitle>
            <DialogDescription>
              {t('index.selectTime')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminderTime">{t('index.time')}</Label>
              <Input
                id="reminderTime"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>

            <Button onClick={saveReminder} className="w-full">
              {t('index.saveReminder')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Custom Task Dialog */}
      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="max-w-md">
          <AddCustomTask onTaskAdded={() => { fetchCustomTasks(); setShowAddTask(false); }} stageLevel={stageLevel} />
        </DialogContent>
      </Dialog>

      {/* Mood Tracker FAB */}
      <MoodTracker />

      {/* Level-up chest ceremony */}
      <LevelUpRewardAnimation
        isOpen={showRewardAnimation}
        onClose={() => {
          closeRewardAnimation();
          refetchCosmetics();
        }}
        reward={currentReward?.item || null}
        bonusPoints={currentReward?.bonusPoints || 0}
        level={currentReward?.level || 1}
      />


      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
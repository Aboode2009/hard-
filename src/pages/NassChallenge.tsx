import { useState, useEffect, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { NassBottomNav } from "@/components/NassBottomNav";
import { SimpleWeekCalendar } from "@/components/SimpleWeekCalendar";
import { HostageVault, getStreakBonus } from "@/components/HostageVault";
import { DailyTask } from "@/components/DailyTask";
import { HomeHeader } from "@/components/HomeHeader";
import { AddCustomTask } from "@/components/AddCustomTask";
import { EmptyTasksState } from "@/components/EmptyTasksState";
import { MoodTracker } from "@/components/MoodTracker";

import { InventoryModal } from "@/components/cosmetics/InventoryModal";
import { LevelUpRewardAnimation } from "@/components/cosmetics/LevelUpRewardAnimation";
import { WeeklyBossEvent, DefeatScreen } from "@/components/rpg/WeeklyBossEvent";
import { XPBar } from "@/components/rpg/XPBar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Clock, Smartphone, CheckCircle2, CheckSquare, QrCode } from "lucide-react";
import { AttendanceScannerDialog } from "@/components/AttendanceScannerDialog";
import { DuoMoon } from "@/components/icons/DuolingoIcons";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { CompatSession } from "@/lib/clerk-auth";
import { useXP } from "@/hooks/useXP";
import { useUserCosmetics } from "@/hooks/useUserCosmetics";
import { useWeeklyBoss } from "@/hooks/useWeeklyBoss";
import { useLootBoxReward } from "@/hooks/useLootBoxReward";
import { useLevelUpReward } from "@/hooks/useLevelUpReward";
import { notificationService, TaskReminder } from "@/lib/notifications";
import confetti from 'canvas-confetti';

const POINTS_PER_TASK = 1;

/** The barcode attendance task; tapping it scans instead of toggling. */
const ATTENDANCE_TASK_ID = 4;

const TOTAL_DAYS = 30;

const NassChallenge = () => {
  const [session, setSession] = useState<CompatSession>(null);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [totalPoints, setTotalPoints] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewingDay, setViewingDay] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<{avatar_url: string | null; username: string} | null>(null);
  const [countdownToMidnight, setCountdownToMidnight] = useState<string>("");
  const [taskColors, setTaskColors] = useState<Record<number, string>>({});
  const [taskNotes, setTaskNotes] = useState<Record<number, string>>({});
  const [taskFilter, setTaskFilter] = useState("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminders, setReminders] = useState<Record<number, TaskReminder>>({});
  const [customTasks, setCustomTasks] = useState<{id: string; title: string; description: string | null; tag_id: string | null; completed: boolean; tagName?: string; tagColor?: string}[]>([]);
  const [lifeTags, setLifeTags] = useState<Record<string, {name: string; name_ar: string; color: string}>>({});

  const nassTasks = [
    { 
      id: 1, 
      title: "kindWord", 
      titleAr: "كلمة طيبة لزميل",
      titleEn: "Kind word to a colleague",
      descriptionAr: "وجّه كلمة طيبة أو مجاملة صادقة لأحد زملائك اليوم",
      descriptionEn: "Give a kind word or sincere compliment to a colleague today",
      icon: <Heart className="w-5 h-5" />, 
      completed: false 
    },
    { 
      id: 2, 
      title: "focus45", 
      titleAr: "التركيز 45 دقيقة × 3",
      titleEn: "Focus 45 minutes × 3",
      descriptionAr: "ركز على عملك لمدة 45 دقيقة ثلاث مرات خلال اليوم",
      descriptionEn: "Focus on your work for 45 minutes three times during the day",
      icon: <Clock className="w-5 h-5" />, 
      completed: false 
    },
    {
      id: 3,
      title: "noSocialMedia",
      titleAr: "بدون وسائل التواصل",
      titleEn: "No social media at work",
      descriptionAr: "امتنع عن استخدام وسائل التواصل الاجتماعي خلال ساعات العمل",
      descriptionEn: "Avoid using social media during working hours",
      icon: <Smartphone className="w-5 h-5" />,
      completed: false
    },
    {
      id: ATTENDANCE_TASK_ID,
      title: "attendance",
      titleAr: "تسجيل حضور الساعة 8",
      titleEn: "Check in at 8 AM",
      descriptionAr: "امسح باركود الشركة في مقر العمل لتسجيل حضورك",
      descriptionEn: "Scan the company barcode at the workplace to check in",
      icon: <QrCode className="w-5 h-5" />,
      completed: false
    },
  ];

  const [tasks, setTasks] = useState(nassTasks);

  // Attendance check-in: the scanner dialog owns the camera, the RPC call and
  // the result display; this page only tracks whether it's open.
  const [scannerOpen, setScannerOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // XP & Cosmetics hooks
  const { xp, level, xpProgress, xpForCurrentLevel, xpForNextLevel, addXP, refetch: refetchXP } = useXP(session?.user?.id || null);
  const { equippedFrame, equippedBadge, lootBoxes, refetch: refetchCosmetics } = useUserCosmetics(session?.user?.id || null);
  
  // Level up reward hook
  const { 
    triggerLevelUpReward, 
    currentReward, 
    showRewardAnimation, 
    closeRewardAnimation,
  } = useLevelUpReward(session?.user?.id || null);

  // Handle level up callback
  const handleLevelUp = useCallback((newLevel: number) => {
    triggerLevelUpReward(newLevel);
  }, [triggerLevelUpReward]);

  // Boss fight hook
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

  // Loot box reward hook
  useLootBoxReward({
    userId: session?.user?.id || null,
    completedDays,
    currentDay,
    tasks,
    customTasks,
    isArabic,
  });

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

  useEffect(() => {
    clerkAuth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        checkNassUser(session.user.id);
        fetchProgress();
        fetchUserProfile();
        fetchReminders();
        fetchCustomTasks();
        // Load saved colors and notes. Guarded: a corrupt value used to throw
        // here, which skipped setLoading(false) below and left the app stuck on
        // the loading screen with no way out but clearing site data.
        const colorsKey = `nass_task_colors_${session.user.id}`;
        const notesKey = `nass_task_notes_${session.user.id}`;
        const savedColors = localStorage.getItem(colorsKey);
        const savedNotes = localStorage.getItem(notesKey);
        try {
          if (savedColors) setTaskColors(JSON.parse(savedColors));
        } catch {
          localStorage.removeItem(colorsKey);
        }
        try {
          if (savedNotes) setTaskNotes(JSON.parse(savedNotes));
        } catch {
          localStorage.removeItem(notesKey);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = clerkAuth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Schedule reminders
  useEffect(() => {
    const allTasksCompleted = tasks.every(task => task.completed);
    if (session) {
      notificationService.scheduleAllTaskReminders(allTasksCompleted, isArabic);
    }
  }, [tasks, session, isArabic]);

  const checkNassUser = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("company_code")
      .eq("id", userId)
      .single();

    if (error || data?.company_code !== "NASS") {
      navigate("/");
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

      const customSettings = JSON.parse(localStorage.getItem(`custom_settings_${session.user.id}`) || '{}');

      setCustomTasks(data?.map(task => {
        const tagInfo = task.tag_id ? tagsMap[task.tag_id] : null;
        const taskSettings = customSettings[task.id] || {};
        return {
          ...task,
          completed: todayTasks[`custom_${task.id}`] || false,
          tagName: tagInfo ? (isArabic ? tagInfo.name_ar : tagInfo.name) : undefined,
          tagColor: taskSettings.color || tagInfo?.color,
        };
      }) || []);
    } catch (error) {
      console.error("Error fetching custom tasks:", error);
    }
  };

  const fetchProgress = async () => {
    try {
      const { data: { session: currentSession } } = await clerkAuth.getSession();
      if (!currentSession?.user?.id) return;

      const { data, error } = await supabase
        .from("challenge_progress")
        .select("*")
        .eq("user_id", currentSession.user.id)
        .single();

      if (error) throw error;

      if (data) {
        const start = new Date(data.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        
        const diffTime = today.getTime() - start.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const calculatedDay = Math.min(diffDays + 1, TOTAL_DAYS);
        
        const completedDaysArray = (data.completed_days || []) as number[];
        const completedDaysSet = new Set(completedDaysArray);
        
        let shouldReset = false;
        
        if (calculatedDay > 1) {
          for (let day = 1; day < calculatedDay; day++) {
            if (!completedDaysSet.has(day)) {
              shouldReset = true;
              break;
            }
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
            title: bi("تم إعادة التحدي", "Challenge Reset"),
            description: bi("لم تكمل مهام الأيام السابقة، تم إرجاعك لليوم الأول", "You missed previous days, reset to Day 1"),
          });

          setCurrentDay(1);
          setCurrentStreak(0);
          setCompletedDays(new Set());
          setStartDate(new Date());
          setTasks(nassTasks.map(task => ({ ...task, completed: false })));
        } else {
          setCurrentDay(calculatedDay);
          setCurrentStreak(data.current_streak);
          setCompletedDays(completedDaysSet);
          setStartDate(new Date(data.start_date));
          setTotalPoints(data.total_points || 0);
          
          const tasksState = (data.tasks_state || {}) as Record<string, Record<number, boolean>>;
          const todayKey = `day_${calculatedDay}`;
          const todayTasks = tasksState[todayKey] || {};
          
          setTasks(nassTasks.map(task => ({
            ...task,
            completed: todayTasks[task.id] || false
          })));
        }
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  const toggleTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    const wasCompleted = task?.completed;
    
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    try {
      const { data, error: fetchError } = await supabase
        .from("challenge_progress")
        .select("tasks_state, weekly_points, total_points")
        .eq("user_id", session?.user?.id)
        .single();

      if (fetchError) throw fetchError;

      const tasksState = (data?.tasks_state || {}) as Record<string, Record<number, boolean>>;
      const todayKey = `day_${currentDay}`;
      
      if (!tasksState[todayKey]) {
        tasksState[todayKey] = {};
      }
      tasksState[todayKey][taskId] = !wasCompleted;

      const currentWeeklyPoints = data?.weekly_points || 0;
      const currentTotalPoints = data?.total_points || 0;
      const streakBonus = getStreakBonus(currentStreak);
      const pointChange = !wasCompleted ? Math.ceil(POINTS_PER_TASK * streakBonus) : -Math.ceil(POINTS_PER_TASK * streakBonus);

      const { error: updateError } = await supabase
        .from("challenge_progress")
        .update({ 
          tasks_state: tasksState,
          weekly_points: currentWeeklyPoints + pointChange,
          total_points: currentTotalPoints + pointChange,
        })
        .eq("user_id", session?.user?.id);

      if (updateError) throw updateError;

      if (!wasCompleted) {
        setTotalPoints(prev => prev + Math.ceil(POINTS_PER_TASK * streakBonus));
        
        // Add XP for completing task (with level up reward callback)
        addXP(10, isArabic, handleLevelUp);
        
        await supabase
          .from("task_completions")
          .insert({
            user_id: session?.user?.id,
            task_key: `nass_${nassTasks.find(t => t.id === taskId)?.title}`,
            points_earned: Math.ceil(POINTS_PER_TASK * streakBonus),
          });
      } else {
        setTotalPoints(prev => prev - Math.ceil(POINTS_PER_TASK * streakBonus));
      }
    } catch (error) {
      console.error("Error saving task state:", error);
      setTasks(tasks);
    }
  };

  /**
   * Tapping the attendance task always opens the camera scanner — there is no
   * manual code entry on any platform. All timing/barcode validation happens
   * server-side inside record_attendance, which the dialog calls.
   */
  const handleAttendanceTap = () => {
    if (isViewingPastDay) return;

    // Already checked in today → don't reopen the camera, just confirm.
    if (tasks.find((t) => t.id === ATTENDANCE_TASK_ID)?.completed) {
      toast({
        title: bi("سجّلت حضورك اليوم", "Already checked in today"),
        description: bi("لا حاجة لإعادة المسح.", "No need to scan again."),
      });
      return;
    }

    setScannerOpen(true);
  };

  /**
   * The server confirmed a check-in exists for today. 'on_time'/'late' are new
   * check-ins, so they run the normal NASS completion flow (points + XP +
   * persistence); 'already' only syncs the checkbox so nothing is re-awarded.
   * Failures ('too_late' etc.) leave the task incomplete — the day is missed.
   */
  const handleAttendanceRecorded = async (status: "on_time" | "late" | "already") => {
    const attendanceTask = tasks.find((t) => t.id === ATTENDANCE_TASK_ID);
    if (!attendanceTask || attendanceTask.completed) return;

    if (status === "already") {
      setTasks((prev) =>
        prev.map((t) => (t.id === ATTENDANCE_TASK_ID ? { ...t, completed: true } : t)),
      );
      return;
    }

    await toggleTask(ATTENDANCE_TASK_ID);
  };

  const toggleCustomTask = async (taskId: string) => {
    const task = customTasks.find(t => t.id === taskId);
    const wasCompleted = task?.completed;
    
    const updatedCustomTasks = customTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setCustomTasks(updatedCustomTasks);

    try {
      const { data, error: fetchError } = await supabase
        .from("challenge_progress")
        .select("tasks_state, weekly_points, total_points")
        .eq("user_id", session?.user?.id)
        .single();

      if (fetchError) throw fetchError;

      const tasksState = (data?.tasks_state || {}) as Record<string, Record<string, boolean>>;
      const todayKey = `day_${currentDay}`;
      
      if (!tasksState[todayKey]) {
        tasksState[todayKey] = {};
      }
      
      const customTaskKey = `custom_${taskId}`;
      tasksState[todayKey][customTaskKey] = !wasCompleted;

      const basePoints = POINTS_PER_TASK;
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

      if (!wasCompleted) {
        await supabase.from("task_completions").insert({
          user_id: session?.user?.id,
          task_key: task?.title || `custom_${taskId}`,
          points_earned: basePoints,
        });

        addXP(10, isArabic, handleLevelUp);
      }
    } catch (error) {
      console.error("Error saving custom task state:", error);
    }
  };

  const deleteCustomTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("custom_tasks")
        .update({ is_active: false })
        .eq("id", taskId)
        .eq("user_id", session?.user?.id);

      if (error) throw error;

      setCustomTasks(prev => prev.filter(task => task.id !== taskId));

      toast({
        title: bi("تم الحذف", "Deleted"),
        description: bi("تم حذف المهمة بنجاح", "Task deleted successfully"),
      });
    } catch (error) {
      console.error("Error deleting custom task:", error);
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: bi("فشل حذف المهمة", "Failed to delete task"),
      });
    }
  };

  const handleTaskColorChange = (taskId: number, color: string) => {
    const newColors = { ...taskColors, [taskId]: color };
    if (!color) {
      delete newColors[taskId];
    }
    setTaskColors(newColors);
    if (session?.user?.id) {
      localStorage.setItem(`nass_task_colors_${session.user.id}`, JSON.stringify(newColors));
    }
  };

  const handleTaskNoteChange = (taskId: number, note: string) => {
    const newNotes = { ...taskNotes, [taskId]: note };
    setTaskNotes(newNotes);
    if (session?.user?.id) {
      localStorage.setItem(`nass_task_notes_${session.user.id}`, JSON.stringify(newNotes));
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
        const { error } = await supabase
          .from("task_reminders")
          .update({
            reminder_time: reminderTime,
            is_enabled: true,
          })
          .eq("id", existingReminder.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("task_reminders")
          .insert({
            user_id: session.user.id,
            task_id: selectedTaskId,
            reminder_time: reminderTime,
            is_enabled: true,
          });

        if (error) throw error;
      }

      await fetchReminders();
      setReminderDialogOpen(false);
      toast({
        title: bi("تم الحفظ", "Saved"),
        description: bi("تم ضبط التذكير", "Reminder set successfully"),
      });
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast({
        title: bi("خطأ", "Error"),
        description: bi("فشل حفظ التذكير", "Failed to save reminder"),
        variant: "destructive",
      });
    }
  };

  const allTasksCompleted = tasks.every(task => task.completed);
  const isDayCompleted = completedDays.has(currentDay);
  const isViewingPastDay = viewingDay !== null && viewingDay < currentDay;

  const completeDay = async () => {
    if (!allTasksCompleted || isDayCompleted) return;

    try {
      const newCompletedDays = [...Array.from(completedDays), currentDay];
      const newStreak = currentStreak + 1;
      
      const { data: currentData, error: fetchError } = await supabase
        .from("challenge_progress")
        .select("best_streak")
        .eq("user_id", session?.user?.id)
        .single();

      if (fetchError) throw fetchError;

      const bestStreak = Math.max(currentData?.best_streak || 0, newStreak);

      const { error } = await supabase
        .from("challenge_progress")
        .update({
          completed_days: newCompletedDays,
          current_streak: newStreak,
          best_streak: bestStreak,
        })
        .eq("user_id", session?.user?.id);

      if (error) throw error;

      setCompletedDays(new Set(newCompletedDays));
      setCurrentStreak(newStreak);
      
      // Add bonus XP for completing day
      addXP(50, isArabic);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: isArabic ? `🎉 أكملت اليوم ${currentDay}!` : `🎉 Completed Day ${currentDay}!`,
        description: bi("استمر في التألق!", "Keep up the great work!"),
      });

      if (currentDay === TOTAL_DAYS) {
        toast({
          title: bi("🏆 تهانينا!", "🏆 Congratulations!"),
          description: bi("أكملت تحدي NASS بنجاح!", "You completed the NASS Challenge!"),
        });
      }
    } catch (error) {
      console.error("Error completing day:", error);
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffTime = date.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const selectedDay = diffDays + 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();

    if (selectedDay < 1 || selectedDay > currentDay) {
      if (!isToday) {
        toast({
          title: bi("غير متاح", "Not available"),
          description: bi("لا يمكن عرض مهام هذا اليوم", "Cannot view tasks for this day"),
        });
        return;
      }
    }
    
    if (isToday || selectedDay === currentDay) {
      setViewingDay(null);
      fetchProgress();
      return;
    }
    
    setViewingDay(selectedDay);
    loadDayTasks(selectedDay);
  };

  const loadDayTasks = async (dayNumber: number) => {
    try {
      const { data, error } = await supabase
        .from("challenge_progress")
        .select("tasks_state")
        .eq("user_id", session?.user?.id)
        .single();

      if (error) throw error;

      const tasksState = (data?.tasks_state || {}) as Record<string, Record<number, boolean>>;
      const dayKey = `day_${dayNumber}`;
      const dayTasks = tasksState[dayKey] || {};

      setTasks(nassTasks.map(task => ({
        ...task,
        completed: dayTasks[task.id] || false
      })));

      setCustomTasks(prev => prev.map(task => ({
        ...task,
        completed: dayTasks[`custom_${task.id}`] || false
      })));
    } catch (error) {
      console.error("Error loading day tasks:", error);
    }
  };


  const handleAddTaskComplete = () => {
    setShowAddTask(false);
    fetchCustomTasks();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const progress = (currentDay / TOTAL_DAYS) * 100;
  const completedTasksCount = tasks.filter(t => t.completed).length + customTasks.filter(t => t.completed).length;
  const totalTasksCount = tasks.length + customTasks.length;

  // Filter tasks
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

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={bi("rtl", "ltr")}>
      {/* Home Header with filter, avatar, level */}
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
        showSwitchButton={true}
        switchTo="/?from=nass"
        switchTitle={bi("التحدي الرئيسي", "Main Challenge")}
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
          isArabic={isArabic}
          compact
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
            isArabic={isArabic}
          />
        </div>
      )}

      {/* Defeat Screen */}
      {showDefeat && (
        <DefeatScreen
          isArabic={isArabic}
          onClose={closeDefeat}
        />
      )}

      {/* Week Calendar */}
      <div className="duo-card mx-4 mb-4 px-4">
        <SimpleWeekCalendar
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          completedDates={new Set(
            Array.from(completedDays).map(day => {
              const date = addDays(startDate, day - 1);
              return format(date, 'yyyy-MM-dd');
            })
          )}
        />
      </div>

      {/* Viewing Past Day Indicator */}
      {isViewingPastDay && (
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-2 border border-border/50">
            <span className="text-sm text-muted-foreground">
              {isArabic 
                ? `عرض اليوم ${viewingDay} (للقراءة فقط)`
                : `Viewing Day ${viewingDay} (read-only)`}
            </span>
            <button 
              onClick={() => handleDateSelect(new Date())}
              className="text-xs text-primary font-medium hover:underline"
            >
              {bi("العودة لليوم", "Back to today")}
            </button>
          </div>
        </div>
      )}

      {/* Hostage Vault */}
      {!isViewingPastDay && (
        <HostageVault 
          currentStreak={currentStreak}
          tasksCompleted={completedTasksCount}
          totalTasks={totalTasksCount}
          onRewardClaimed={(amount) => {
            console.log(`Vault released: ${amount} lemons`);
          }}
        />
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
                {bi("🎉 أحسنت! عد غداً للمتابعة", "🎉 Great job! Come back tomorrow")}
              </p>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                {bi("المهام الجديدة في:", "New tasks in:")}
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

      {/* Tasks Section */}
      <div className="px-4 space-y-4">
        {!hasTasks && taskFilter !== "all" ? (
          <EmptyTasksState onAddClick={() => setShowAddTask(true)} />
        ) : (
          <>
            {/* Task List */}
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const reminder = reminders[task.id];
                return (
                  <DailyTask
                    key={task.id}
                    title={isArabic ? task.titleAr : task.titleEn}
                    description={isArabic ? task.descriptionAr : task.descriptionEn}
                    icon={task.icon}
                    completed={task.completed}
                    onToggle={() =>
                      task.id === ATTENDANCE_TASK_ID
                        ? handleAttendanceTap()
                        : !isViewingPastDay && !isDayCompleted && toggleTask(task.id)
                    }
                    reminderTime={reminder?.is_enabled ? reminder.reminder_time : undefined}
                    hasReminder={reminder?.is_enabled || false}
                    onReminderClick={() => !isViewingPastDay && handleReminderClick(task.id)}
                    customColor={taskColors[task.id]}
                    onColorChange={(color) => handleTaskColorChange(task.id, color)}
                    note={taskNotes[task.id]}
                    onNoteChange={(note) => handleTaskNoteChange(task.id, note)}
                  />
                );
              })}
              
              {/* Custom Tasks */}
              {filteredCustomTasks.map((task) => {
                const isEmoji = task.description && /\p{Emoji}/u.test(task.description) && task.description.length <= 4;
                return (
                  <DailyTask
                    key={`custom-${task.id}`}
                    title={task.title}
                    description=""
                    icon={isEmoji ? <span className="text-xl">{task.description}</span> : <CheckSquare className="w-6 h-6" />}
                    completed={task.completed}
                    onToggle={() => !isViewingPastDay && !isDayCompleted && toggleCustomTask(task.id)}
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


            {/* Complete Day Button */}
            {!isViewingPastDay && (
              isDayCompleted ? (
                <div className="duo-card p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: "#58CC02" }} strokeWidth={2.5} />
                  <p className="font-extrabold" style={{ color: "#58CC02" }}>
                    {bi("تم إكمال اليوم! 🎉", "Day Completed! 🎉")}
                  </p>
                  {countdownToMidnight && (
                    <p className="text-sm font-semibold mt-2" style={{ color: "hsl(var(--duo-muted))" }}>
                      {isArabic ? `اليوم التالي بعد:` : `Next day in:`}
                      <span className="font-extrabold tabular-nums mx-2" style={{ color: "hsl(var(--duo-text))" }} dir="ltr">{countdownToMidnight}</span>
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={completeDay}
                  disabled={!allTasksCompleted}
                  className={cn(
                    "w-full h-14 text-lg font-bold rounded-2xl uppercase tracking-widest",
                    "text-white border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-150",
                    allTasksCompleted
                      ? "bg-[#58cc02] hover:bg-[#46a302] border-[#58a700]"
                      : "bg-[#e5e5e5] hover:bg-[#e5e5e5] border-[#d8d8d8] text-[#afafaf]"
                  )}
                  size="lg"
                >
                  {allTasksCompleted
                    ? (bi("✨ إنهاء اليوم", "✨ End This Day"))
                    : (isArabic ? `أكمل ${totalTasksCount - completedTasksCount} مهام متبقية` : `Complete ${totalTasksCount - completedTasksCount} remaining tasks`)
                  }
                </Button>
              )
            )}
          </>
        )}
      </div>

      {/* Add Custom Task */}
      {showAddTask && (
        <AddCustomTask
          onTaskAdded={handleAddTaskComplete}
        />
      )}

      {/* Attendance — camera-only scanner (ML Kit on device, zxing on web).
          It owns the camera, the record_attendance RPC and the result UI. */}
      <AttendanceScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onAttendanceRecorded={handleAttendanceRecorded}
      />


      {/* Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{bi("ضبط التذكير", "Set Reminder")}</DialogTitle>
            <DialogDescription>
              {bi("اختر وقت التذكير بهذه المهمة", "Choose when to be reminded about this task")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminderTime">{bi("الوقت", "Time")}</Label>
              <Input
                id="reminderTime"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReminderDialogOpen(false)} className="flex-1">
                {bi("إلغاء", "Cancel")}
              </Button>
              <Button onClick={saveReminder} className="flex-1">
                {bi("حفظ", "Save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Up Reward Animation */}
      <LevelUpRewardAnimation
        isOpen={showRewardAnimation}
        onClose={closeRewardAnimation}
        reward={currentReward?.item || null}
        bonusPoints={currentReward?.bonusPoints || 0}
        level={currentReward?.level || 1}
      />

      {/* Mood Tracker */}
      <MoodTracker />


      <NassBottomNav />
    </div>
  );
};

export default NassChallenge;

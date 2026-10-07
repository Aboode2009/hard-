import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { invalidateProfile, invalidateProgress } from "@/lib/query-client";
import { markOnboardingDone, needsOnboarding } from "@/lib/onboarding";
import { supabase } from "@/integrations/supabase/client";
import { showInterstitial } from "@/lib/ads";
import { createSerializer } from "@/lib/serialize";
import { pushWidgetSnapshot, widgetLang } from "@/lib/widget-sync";
import { bi } from "@/i18n/bi";
import { ToastAction } from "@/components/ui/toast";
import {
  readCache, readLastKnown, writeCache, patchCache, dropCache, homeKeys, baghdadDay,
  type ProgressSnapshot,
} from "@/lib/home-cache";
import { storedSessionUserId } from "@/lib/session-user";
import { ProductTour } from "@/components/ProductTour";
import { clearCompanyMode, saveCompanyMode } from "@/lib/company-mode";
import { hasSeenHomeTour, markHomeTourSeen, homeTourSteps } from "@/lib/home-tour";
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
import type { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notificationService, TaskReminder } from "@/lib/notifications";
import { useUserCosmetics } from "@/hooks/useUserCosmetics";
import { useLootBoxReward } from "@/hooks/useLootBoxReward";
import { useXP } from "@/hooks/useXP";
import { useWeeklyBoss } from "@/hooks/useWeeklyBoss";
import { challengeRpc, rpcErrorText, ChallengeRpcError } from "@/lib/challenge-rpc";

const POINTS_PER_TASK = 1;

/** A user-created task as the home screen holds it, cache included. */
interface CustomTask {
  id: string;
  title: string;
  description: string | null;
  tag_id: string | null;
  completed: boolean;
  tagName?: string;
  tagColor?: string;
}

/** "HH:MM:SS" until the device's local midnight, when the next day opens. */
const countdownToMidnightText = () => {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const Index = () => {
  /**
   * What this screen last showed, read synchronously for the FIRST frame.
   *
   * Every piece of state below used to start at a placeholder (day 1, no name,
   * "Level 1") and be filled in by effects after the first paint. Measured on
   * a phone, that meant: coming back to this tab drew an empty frame (this
   * component returned null while `loading`), and a cold start showed the
   * placeholders and then corrected them one by one over ~1.6s — the level,
   * then the name, then the "day done" card pushing the list down. Starting
   * from the last known values makes the first frame the real screen; the
   * fetches that follow still replace them with the server's answer.
   */
  const [boot] = useState(() => {
    const uid = storedSessionUserId();
    if (!uid) return { uid: null, snap: undefined, profile: undefined, custom: undefined };
    return {
      uid,
      snap: readLastKnown<ProgressSnapshot>(homeKeys.progress(uid)),
      profile: readLastKnown<{ avatar_id: string | null; gender: string | null; username: string }>(homeKeys.profile(uid), true),
      custom: readLastKnown<{
        tags: Record<string, { name: string; name_ar: string; color: string }>;
        tasks: CustomTask[];
      }>(homeKeys.customTasks(uid)),
    };
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!boot.snap);
  // True when a NASS employee is viewing the main Tasks page manually (via the
  // switch button) — used to show a "back to NASS" button in the header.
  const [isNassEmployee, setIsNassEmployee] = useState(false);
  const [celebrateConfetti, setCelebrateConfetti] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  /**
   * The first-run tour over this page's real elements.
   *
   * Armed only after the page has rendered with its data — it is an overlay on
   * top of a working screen, never a gate in front of one. Settings can replay
   * it by clearing the flag and dispatching `hard21:replay-home-tour`.
   */
  const [tourRunning, setTourRunning] = useState(false);
  const [currentDay, setCurrentDay] = useState(boot.snap?.currentDay ?? 1);
  const [currentStreak, setCurrentStreak] = useState(boot.snap?.currentStreak ?? 0);
  const [completedDays, setCompletedDays] = useState<Set<number>>(() => new Set(boot.snap?.completedDays ?? []));
  const [startDate, setStartDate] = useState<Date>(() => (boot.snap ? new Date(boot.snap.startDate) : new Date()));
  const [isAdmin, setIsAdmin] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminders, setReminders] = useState<Record<number, TaskReminder>>({});
  const [stageLevel, setStageLevel] = useState(boot.snap?.stageLevel ?? 1);
  /**
   * True once real progress has been applied. Until then the state above is
   * placeholder defaults (day 1, streak 0), which must never reach the
   * home-screen widget.
   */
  const [progressReady, setProgressReady] = useState(false);
  const [totalPoints, setTotalPoints] = useState(boot.snap?.totalPoints ?? 0);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>(boot.custom?.tasks ?? []);
  const [lifeTags, setLifeTags] = useState<Record<string, {name: string; name_ar: string; color: string}>>(boot.custom?.tags ?? {});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewingDay, setViewingDay] = useState<number | null>(null); // null = viewing current day
  const [taskFilter, setTaskFilter] = useState("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatar_id: string | null; gender: string | null; username: string } | null>(boot.profile ?? null);
  const [tasksStateCache, setTasksStateCache] = useState<Record<string, Record<string, boolean>>>({});
  const [taskColors, setTaskColors] = useState<Record<number, string>>({});
  // Filled at once when the snapshot says today is done, so the "day done"
  // card is in the first frame instead of appearing and pushing the list down.
  const [countdownToMidnight, setCountdownToMidnight] = useState<string>(() =>
    boot.snap && boot.snap.completedDays.includes(boot.snap.currentDay) ? countdownToMidnightText() : "",
  );
  const [inventoryOpen, setInventoryOpen] = useState(false);
  // Stable identity so the memoized HomeHeader is not re-rendered by every
  // unrelated state change on this screen.
  const openInventory = useCallback(() => setInventoryOpen(true), []);


  
  // Cosmetics hooks
  const { equippedFrame, equippedBadge, lootBoxes, refetch: refetchCosmetics } = useUserCosmetics(session?.user?.id || boot.uid);
  
  // XP & Boss Fight hooks
  const { xp, level, xpProgress, xpForCurrentLevel, xpForNextLevel, applyServerXP, refetch: refetchXP } = useXP(session?.user?.id || boot.uid);

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
    
    const updateCountdown = () => setCountdownToMidnight(countdownToMidnightText());
    
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

  const [tasks, setTasks] = useState(() => {
    const stage = boot.snap?.stageLevel ?? 1;
    const stageTasks = stage === 1 ? stage1Tasks : stage === 2 ? stage2Tasks : stage3Tasks;
    const done = boot.snap?.tasksCompleted ?? {};
    return stageTasks.map((task) => ({ ...task, completed: !!done[task.id] }));
  });

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

  // Loot boxes are awarded server-side; this only announces them.
  const announceLootBox = useLootBoxReward();

  // Home-screen widget: mirror today's required tasks and the streak whenever
  // they change. Custom tasks are optional for finishing a day, so they stay
  // out, and browsing a past day in the calendar must not overwrite today.
  useEffect(() => {
    if (!session?.user?.id || !progressReady) return;
    if (viewingDay !== null && viewingDay !== currentDay) return;
    pushWidgetSnapshot({
      signedIn: true,
      lang: widgetLang(i18n.language),
      date: baghdadDay(),
      day: currentDay,
      totalDays,
      streak: currentStreak,
      startDate: baghdadDay(startDate),
      completedDays: Array.from(completedDays).sort((a, b) => a - b),
      dayCompleted: completedDays.has(currentDay),
      tasks: tasks.map((task) => ({
        title: t(`tasks.${task.title}.title`),
        done: task.completed,
      })),
    });
  }, [
    session?.user?.id, progressReady, viewingDay, currentDay, totalDays,
    currentStreak, startDate, completedDays, tasks, i18n.language, t,
  ]);

  useEffect(() => {
    const checkNassUser = async (userId: string) => {
      // Two requests, and their only job here is deciding whether to auto-open
      // company mode. Enforcement is unchanged and still happens on every
      // mount of the company screens themselves (CompanyAccessGate), so
      // reusing the answer within a session cannot grant access to anyone.
      const cachedNass = readCache<boolean>(homeKeys.companyAccess(userId));
      if (cachedNass !== undefined) {
        setIsNassEmployee(cachedNass);
        const cameBack =
          new URLSearchParams(window.location.search).get("from") === "nass";
        if (cachedNass && !cameBack) {
          navigate("/nass");
          return true;
        }
        return false;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_code")
        .eq("id", userId)
        .single();

      // Company mode is premium-only, so the auto-redirect has to ask the
      // server, not just read the code. Without this a lapsed subscriber gets
      // bounced to /nass on every launch only to meet the paywall gate.
      let isNass = profile?.company_code === "NASS";
      // Whether the answer came from the server rather than a failed request.
      // Only a definite "no" may forget a remembered company user — a network
      // blip must not undo it.
      let definite = !profileError;
      if (isNass) {
        try {
          const { data: allowed, error } = await supabase.rpc("has_company_access");
          if (error) definite = false;
          if (error || allowed !== true) isNass = false;
        } catch (err) {
          console.warn("has_company_access failed; staying on the main challenge:", err);
          isNass = false;
          definite = false;
        }
      }
      setIsNassEmployee(isNass);
      writeCache(homeKeys.companyAccess(userId), isNass);
      // Remembered on this device so the next launch opens company mode
      // before anything is drawn (see lib/company-mode.ts).
      if (isNass) saveCompanyMode(userId, "NASS");
      else if (definite) clearCompanyMode(userId);

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
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        // Check if user is NASS employee - redirect to NASS challenge
        const isNassUser = await checkNassUser(session.user.id);
        if (isNassUser) return;

        // Welcome flow: new accounts only — see lib/onboarding.ts. Not
        // awaited, so the home screen loads meanwhile; for an existing
        // account (the usual case) this settles to "no" without showing.
        void needsOnboarding(session).then((show) => {
          if (show) setShowOnboarding(true);
        });

        fetchProgress();
        checkAdminStatus(session.user.id);
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
    }).catch((err) => {
      // Without this the whole chain could reject — a failed profile read, a
      // network blip inside checkNassUser — and `setLoading(false)` above would
      // never run, leaving the app on its loading screen forever with no way
      // out. Clearing the flag lets the UI render its empty/error state.
      console.error("Startup session check failed:", err);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Only this boolean reaches the scheduler, so only this boolean belongs in
  // the dependency list. Depending on the whole `tasks` array meant every
  // single task tap fired two native notification calls (cancel + schedule)
  // across the Capacitor bridge, even when the completed/not-completed state
  // had not actually flipped — a visible stutter on every check.
  const allTasksCompleted = tasks.length > 0 && tasks.every((task) => task.completed);
  const isArabicUi = i18n.language === "ar";

  useEffect(() => {
    if (!session) return;
    notificationService.scheduleAllTaskReminders(allTasksCompleted, isArabicUi);
  }, [allTasksCompleted, isArabicUi, session]);

  /**
   * Takes the id explicitly. Reading it off component state failed silently:
   * `session` is still null on the mount where this runs, so the cache was
   * never written and `is_admin` fired on every single return to this screen.
   */
  const checkAdminStatus = async (uid: string) => {
    try {
      const hit = readCache<boolean>(homeKeys.admin(uid));
      if (hit !== undefined) {
        setIsAdmin(hit);
        return;
      }

      const { data, error } = await supabase.rpc('is_admin');
      if (!error) {
        setIsAdmin(!!data);
        writeCache(homeKeys.admin(uid), !!data);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const fetchReminders = async () => {
    if (!session?.user?.id) return;

    const cached = readCache<Record<number, TaskReminder>>(
      homeKeys.reminders(session.user.id),
    );
    if (cached) {
      setReminders(cached);
      return;
    }

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

      writeCache(homeKeys.reminders(session.user.id), remindersMap);
      setReminders(remindersMap);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  const fetchCustomTasks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Three queries live below (tags, custom tasks, today's state). A cache
      // hit skips all three.
      const cached = readCache<{
        tags: Record<string, { name: string; name_ar: string; color: string }>;
        tasks: CustomTask[];
      }>(homeKeys.customTasks(session.user.id));
      if (cached) {
        setLifeTags(cached.tags);
        setCustomTasks(cached.tasks);
        return;
      }

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

      const built = data?.map(task => {
        const tagInfo = task.tag_id ? tagsMap[task.tag_id] : null;
        const customConfig = customReminders[task.id] || {};
        const taskSettings = customSettings[task.id] || {};
        return {
          ...task,
          completed: todayTasks[`custom_${task.id}`] || false,
          tagName: tagInfo ? (i18n.language === 'ar' ? tagInfo.name_ar : tagInfo.name) : undefined,
          tagColor: taskSettings.color || customConfig.color || tagInfo?.color,
        };
      }) || [];

      writeCache(homeKeys.customTasks(session.user.id), { tags: tagsMap, tasks: built });
      setCustomTasks(built);
    } catch (error) {
      console.error("Error fetching custom tasks:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const cached = readCache<{ avatar_id: string | null; gender: string | null; username: string }>(
        homeKeys.profile(session.user.id),
      );
      if (cached) {
        setUserProfile(cached);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_id, gender, username")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        writeCache(homeKeys.profile(session.user.id), data);
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  /** Applies a cached snapshot without touching the network. */
  const applyProgressSnapshot = useCallback((snap: ProgressSnapshot) => {
    setStageLevel(snap.stageLevel);
    setCurrentDay(snap.currentDay);
    setCurrentStreak(snap.currentStreak);
    setCompletedDays(new Set(snap.completedDays));
    setStartDate(new Date(snap.startDate));
    setTotalPoints(snap.totalPoints);

    const stageTasks =
      snap.stageLevel === 1 ? stage1Tasks : snap.stageLevel === 2 ? stage2Tasks : stage3Tasks;
    setTasks(stageTasks.map((task) => ({
      ...task,
      completed: !!snap.tasksCompleted[task.id],
    })));
    setProgressReady(true);
  }, []);

  const fetchProgress = useCallback(async (force = false) => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.user?.id) return;

      // Returning to this tab with nothing changed in between: paint from the
      // snapshot and issue no query at all. The snapshot is dropped on a cold
      // start and at Baghdad midnight, and kept in step by every write below,
      // so it can only ever be the same data the query would have returned.
      if (!force) {
        const cached = readCache<ProgressSnapshot>(homeKeys.progress(currentSession.user.id));
        if (cached) {
          applyProgressSnapshot(cached);
          return;
        }
      }

      // The server applies the missed-day rules (Streak Freeze or reset, in
      // Asia/Baghdad time) and returns the canonical day — the client no
      // longer computes the day or writes any of these columns.
      const data = await challengeRpc.evaluate("main");

      if (data) {
        const stage = data.stage_level || 1;
        const calculatedDay = data.current_day;
        const completedDaysSet = new Set<number>(data.completed_days || []);

        if (data.freezes_used > 0) {
          const used = data.freezes_used;
          toast({
            title: i18n.language === 'ar' ? "درع التجميد أنقذ ستريكك" : "Streak Freeze saved your streak",
            description: i18n.language === 'ar'
              ? `تم استهلاك ${used === 1 ? "درع واحد" : `${used} دروع`} لتغطية الأيام الفائتة`
              : `${used} freeze${used > 1 ? "s" : ""} used to cover missed days`,
          });
        }

        if (data.was_reset) {
          toast({
            variant: "destructive",
            title: t('challenge.resetTitle') || "تم إعادة التحدي",
            description: t('challenge.resetDescription') || "لم تكمل مهام الأيام السابقة، تم إرجاعك لليوم الأول",
          });
        }

        setStageLevel(stage);
        setCurrentDay(calculatedDay);
        setCurrentStreak(data.current_streak);
        setCompletedDays(completedDaysSet);
        setStartDate(new Date(data.start_date));
        setTotalPoints(data.total_points || 0);

        const stageTasks = stage === 1 ? stage1Tasks : stage === 2 ? stage2Tasks : stage3Tasks;
        const todayTasks = data.today_tasks || {};

        setTasks(stageTasks.map(task => ({
          ...task,
          completed: !!todayTasks[task.id]
        })));
        setProgressReady(true);

        // Snapshot the server's answer so a later cache hit skips the call.
        writeCache<ProgressSnapshot>(homeKeys.progress(currentSession.user.id), {
          stageLevel: stage,
          currentDay: calculatedDay,
          currentStreak: data.current_streak,
          completedDays: Array.from(completedDaysSet),
          startDate: new Date(data.start_date).toISOString(),
          totalPoints: data.total_points || 0,
          tasksCompleted: stageTasks.reduce<Record<number, boolean>>((acc, task) => {
            acc[task.id] = !!todayTasks[task.id];
            return acc;
          }, {}),
        });
      }
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  }, [t, toast, navigate, applyProgressSnapshot]);

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

  /**
   * Serializes every write to `challenge_progress`. Task toggles are a
   * read-modify-write of the same row, so two quick taps would otherwise both
   * read the pre-change row and the second would erase the first.
   */
  const saveQueue = useRef(createSerializer()).current;

  /**
   * A write to the database failed.
   *
   * The optimistic tick is rolled back, the cache is deliberately NOT updated
   * (a snapshot must only ever hold what the server confirmed), and the user
   * gets a plain Arabic reason with a way to try again.
   */
  const reportSaveFailure = useCallback(
    (error: unknown, retry: () => void) => {
      console.error("Saving to the database failed:", error);
      toast({
        variant: "destructive",
        title: bi("لم يتم الحفظ", "Not saved"),
        description: bi(
          "تعذّر حفظ التغيير. تحقّق من اتصالك ثم أعد المحاولة.",
          "Couldn't save your change. Check your connection and try again.",
        ),
        action: (
          <ToastAction altText={bi("إعادة المحاولة", "Try again")} onClick={retry}>
            {bi("إعادة المحاولة", "Try again")}
          </ToastAction>
        ),
      });
    },
    [toast],
  );

  const toggleTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    // Completions are final — a checked task cannot be unchecked.
    if (task?.completed) return;
    const isArabic = i18n.language === 'ar';
    
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);


    // The server marks the task, computes the points and grants XP.
    await saveQueue(async () => {
    try {
      const result = await challengeRpc.completeTask(taskId, "main");
      const newTotalPoints = result.total_points;
      setTotalPoints(newTotalPoints);

      if (result.awarded) {
        applyServerXP(result.xp, isArabic, triggerLevelUpReward);
      }
      if (result.loot_box_awarded) {
        announceLootBox(isArabic);
        refetchCosmetics();
      }

      // Confirmed by the server — fold the same values into the snapshot so
      // returning to this screen needs no re-read to show them.
      if (session?.user?.id) {
        patchCache<ProgressSnapshot>(homeKeys.progress(session.user.id), (prev) => ({
          ...prev,
          totalPoints: newTotalPoints,
          tasksCompleted: { ...prev.tasksCompleted, [taskId]: true },
        }));
      }
      // Other screens read these rows from the query cache.
      invalidateProgress();
    } catch (error) {
      setTasks(tasks); // undo the optimistic tick
      reportSaveFailure(error, () => void toggleTask(taskId));
    }
    });
  };

  const toggleCustomTask = async (taskId: string) => {
    const task = customTasks.find(t => t.id === taskId);
    // Completions are final — a checked task cannot be unchecked.
    if (task?.completed) return;
    const isArabic = i18n.language === 'ar';
    
    const updatedCustomTasks = customTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setCustomTasks(updatedCustomTasks);

    // The server marks the task, computes the points and grants XP.
    await saveQueue(async () => {
    try {
      const result = await challengeRpc.completeCustomTask(taskId, "main");
      const newTotalPoints = result.total_points;
      setTotalPoints(newTotalPoints);

      if (result.awarded) {
        applyServerXP(result.xp, isArabic, triggerLevelUpReward);
      }
      if (result.loot_box_awarded) {
        announceLootBox(isArabic);
        refetchCosmetics();
      }

      if (session?.user?.id) {
        patchCache<ProgressSnapshot>(homeKeys.progress(session.user.id), (prev) => ({
          ...prev,
          totalPoints: newTotalPoints,
        }));
        // The custom-task list carries its own completion flags.
        patchCache<{ tags: Record<string, { name: string; name_ar: string; color: string }>; tasks: CustomTask[] }>(
          homeKeys.customTasks(session.user.id),
          (prev) => ({
            ...prev,
            tasks: prev.tasks.map((ct) =>
              ct.id === taskId ? { ...ct, completed: true } : ct,
            ),
          }),
        );
      }
      // Other screens read these rows from the query cache.
      invalidateProgress();
    } catch (error) {
      setCustomTasks(customTasks); // undo the optimistic tick
      reportSaveFailure(error, () => void toggleCustomTask(taskId));
    }
    });
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

  const completeDay = async () => {
    // Interstitial on "I finished my tasks". Fire-and-forget and capped in
    // lib/ads.ts, so it never delays or blocks completing the day.
    void showInterstitial();

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
      // The server verifies every task, then computes the streak, the day
      // points, the stage bonus and any stage advancement, and records the
      // Wheel of Life history. Nothing here is trusted from the client.
      const result = await challengeRpc.completeDay("main");

      if (result.already_completed) {
        toast({
          title: i18n.language === 'ar' ? "تم إكمال اليوم بالفعل" : "Day already completed",
          description: i18n.language === 'ar' ? "عد غداً لإكمال المهام الجديدة" : "Come back tomorrow for new tasks",
        });
        return;
      }

      if (result.loot_box_awarded) {
        announceLootBox(i18n.language === 'ar');
        refetchCosmetics();
      }

      if (result.stage_advanced) {
        toast({
          title: t('challenge.stageCompleted', {
            stage: t(stageLevel === 1 ? 'challenge.stageName' : 'challenge.stage2Name'),
          }),
        });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }

      if (result.all_stages_completed) {
        setTotalPoints(result.total_points);
        invalidateProgress();
        toast({
          title: t('challenge.allStagesCompleted'),
        });
        setTimeout(() => navigate("/leaderboard"), 2000);
        return;
      }

      setTotalPoints(result.total_points);

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

      setCurrentStreak(result.current_streak);
      setCompletedDays(new Set(result.completed_days));

      // `force` bypasses the cache and rewrites it from the server.
      await fetchProgress(true);
      invalidateProgress();
    } catch (error) {
      if (error instanceof ChallengeRpcError && error.code === "tasks_incomplete") {
        const [ar, en] = rpcErrorText(error);
        toast({ variant: "destructive", title: bi(ar, en) });
        void fetchProgress(true);
        return;
      }
      reportSaveFailure(error, () => void completeDay());
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
      markOnboardingDone(session.user.id);
      // The flow renamed the account; drop the Google-derived name held in
      // the home cache and the profile queries so the new one shows at once.
      dropCache(homeKeys.profile(session.user.id));
      invalidateProfile();
      void fetchUserProfile();
    }
    setShowOnboarding(false);
    setLoading(false);
  };


  useEffect(() => {
    if (loading || showOnboarding || !session) return;
    if (hasSeenHomeTour()) return;

    // One frame after paint, so the targets exist and the home screen has
    // already shown itself to the user.
    const id = setTimeout(() => setTourRunning(true), 600);
    return () => clearTimeout(id);
  }, [loading, showOnboarding, session]);

  // Settings asks for a replay.
  useEffect(() => {
    const replay = () => setTourRunning(true);
    window.addEventListener("hard21:replay-home-tour", replay);
    return () => window.removeEventListener("hard21:replay-home-tour", replay);
  }, []);

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
        avatarId={userProfile?.avatar_id}
        gender={userProfile?.gender}
        userId={session?.user?.id ?? boot.uid}
        username={userProfile?.username}
        selectedFilter={taskFilter}
        totalPoints={totalPoints}
        onFilterChange={setTaskFilter}
        onAvatarClick={openInventory}
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
      <div className="px-4 mb-3" data-tour="xp-bar">
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
      <div className="px-4 mb-4 bg-card rounded-xl shadow-sm border border-border/50" data-tour="week-calendar">
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
              {/* Under the text, not beside it: on a 360px screen the timer
                  beside it squeezed the text to one word per line. */}
              <div className="mt-2 inline-block px-3 py-1.5 rounded-xl" style={{ background: "#FFC8001e" }}>
                <span className="text-xl font-extrabold tabular-nums" style={{ color: "#FFC800" }} dir="ltr">
                  {countdownToMidnight}
                </span>
              </div>
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
              <div className="space-y-3" data-tour="task-list">
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
                      // Presets from the Create Task page are stored by key
                      // ("walk"); show their translation. A title the user
                      // typed has no such key and comes through unchanged.
                      title={t(`createTask.habits.${task.title}`, { defaultValue: task.title })}
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
                <div data-tour="complete-day">
                <Button
                  size="lg"
                  className={cn(
                    "w-full h-14 text-lg font-bold rounded-2xl uppercase tracking-widest",
                    "text-white border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-150",
                    tasks.every(task => task.completed)
                      ? "bg-[hsl(var(--duo-accent))] hover:bg-[hsl(var(--duo-accent-edge))] border-[hsl(var(--duo-accent-edge))]"
                      : "bg-[#e5e5e5] hover:bg-[#e5e5e5] border-[#d8d8d8] text-[#afafaf]"
                  )}
                  onClick={completeDay}
                  disabled={!tasks.every(task => task.completed)}
                >
                  {t('challenge.completeDay')}
                </Button>
                </div>
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

      {/* First-run tour. An overlay on the real screen — the page below is
          fully rendered and untouched. */}
      <ProductTour
        steps={homeTourSteps()}
        run={tourRunning}
        onDone={() => {
          setTourRunning(false);
          markHomeTourSeen();
        }}
      />
    </div>
  );
};

export default Index;

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { HabitTracker } from "@/components/HabitTracker";
import { BottomNav } from "@/components/BottomNav";
import { WheelOfLife } from "@/components/WheelOfLife";
import { Trophy, CalendarCheck, ClipboardCheck, TrendingUp, Heart, Dumbbell, BookOpen, Globe, Moon, Briefcase, Users, Wrench } from "lucide-react";
import { motion } from "framer-motion";

const Overall = () => {
  const { t } = useTranslation();
  const [challengeProgress, setChallengeProgress] = useState<any>(null);
  const [taskCompletions, setTaskCompletions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [progressResult, completionsResult] = await Promise.all([
        supabase
          .from("challenge_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("task_completions")
          .select("id")
          .eq("user_id", user.id)
      ]);

      setChallengeProgress(progressResult.data);
      setTaskCompletions(completionsResult.data?.length || 0);
      setLoading(false);
    };

    fetchProgress();
  }, []);

  // Convert completed_days array to Set<number>
  const completedDaysArray = challengeProgress?.completed_days as string[] || [];
  const completedDays = new Set<number>(
    completedDaysArray.map((day: string) => parseInt(day, 10)).filter((n: number) => !isNaN(n))
  );
  
  const startDate = challengeProgress?.start_date 
    ? new Date(challengeProgress.start_date) 
    : new Date();
  
  const currentDay = challengeProgress?.current_day || 1;
  const bestStreak = challengeProgress?.best_streak || 0;
  const currentStreak = challengeProgress?.current_streak || 0;
  const stageLevel = challengeProgress?.stage_level || 1;
  
  // Get total days for the current path/stage
  const getStageDays = (stage: number) => {
    if (stage === 1) return 21;
    if (stage === 2) return 45;
    if (stage === 3) return 75;
    return 21;
  };
  const totalDays = getStageDays(stageLevel);
  
  // Use the higher value between completed_days and current_streak
  const perfectDays = Math.max(completedDays.size, currentStreak);
  
  // Calculate daily average (tasks per day)
  const daysElapsed = Math.max(1, currentDay);
  const dailyAverage = (taskCompletions / daysElapsed).toFixed(1);
  
  // Overall rate: percentage of perfect days out of TOTAL PATH DAYS (not elapsed days)
  const overallRate = totalDays > 0 ? Math.min(100, Math.round((perfectDays / totalDays) * 100)) : 0;

  // Duolingo accent palette (matches the Profile page stat cards).
  const stats = [
    { icon: Trophy, value: bestStreak, label: t("overall.bestStreaks", "Best Streaks"), color: "#FFC800" },
    { icon: CalendarCheck, value: perfectDays, label: t("overall.perfectDays", "Perfect Days"), color: "#1CB0F6" },
    { icon: ClipboardCheck, value: taskCompletions, label: t("overall.tasksDone", "Tasks Done"), color: "#58CC02" },
    { icon: TrendingUp, value: dailyAverage, label: t("overall.dailyAverage", "Daily Avg"), color: "#CE82FF" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0
    }
  } as const;

  return (
    <div className="duo-page min-h-screen bg-background pb-24">
      <div className="p-4">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-extrabold mb-6"
          style={{ color: "hsl(var(--duo-text))" }}
        >
          {t("overall.title", "Challenge Overview")}
        </motion.h1>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="rounded-full h-8 w-8 border-b-2 border-primary"
            />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Monthly Calendar */}
            <motion.div variants={itemVariants}>
              <MonthlyCalendar
                completedDays={completedDays}
                startDate={startDate}
                currentDay={currentDay}
              />
            </motion.div>

            {/* Habit Tracker */}
            <motion.div variants={itemVariants} className="my-6">
              <HabitTracker />
            </motion.div>

            {/* Compact Stats Card */}
            <motion.div
              variants={itemVariants}
              className="duo-card p-4 mb-6"
            >
              {/* Overall Rate - Compact */}
              <div
                className="flex items-center gap-4 mb-4 pb-4"
                style={{ borderBottom: "2px solid hsl(var(--duo-border))" }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="relative w-16 h-16 flex-shrink-0"
                >
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="hsl(var(--duo-border))"
                      strokeWidth="10"
                      fill="none"
                    />
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#58CC02"
                      strokeWidth="10"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: "0 251" }}
                      animate={{ strokeDasharray: `${overallRate * 2.51} 251` }}
                      transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, type: "spring" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{overallRate}%</span>
                  </motion.div>
                </motion.div>
                <div>
                  <span className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{t("overall.overallRate", "Overall Rate")}</span>
                  <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>{perfectDays}/{totalDays} {t("overall.day", "days")}</p>
                </div>
              </div>

              {/* Horizontal Stats */}
              <div className="grid grid-cols-4 gap-2">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1, type: "spring", stiffness: 300 }}
                    whileHover={{ scale: 1.08, y: -4 }}
                    className="flex flex-col items-center text-center p-2 cursor-pointer"
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.3 }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5"
                      style={{ background: `${stat.color}22` }}
                    >
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-lg font-extrabold leading-none" style={{ color: "hsl(var(--duo-text))" }}>{stat.value}</span>
                    <span className="text-[10px] font-bold leading-tight mt-1" style={{ color: "hsl(var(--duo-muted))" }}>{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Wheel of Life */}
            <motion.div variants={itemVariants}>
              <WheelOfLife />
            </motion.div>
          </motion.div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Overall;

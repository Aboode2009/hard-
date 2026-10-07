import { useState, useEffect, useRef, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Flame, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { ProgressFill } from "@/components/ui/progress-fill";
import confetti from "canvas-confetti";

interface HostageVaultProps {
  currentStreak: number;
  tasksCompleted: number;
  totalTasks: number;
  onRewardClaimed?: (amount: number) => void;
}

const STREAK_BONUSES = [10, 30, 50, 70, 90, 130, 150];

export const getStreakBonus = (streak: number): number => {
  if (streak <= 0) return STREAK_BONUSES[0];
  const dayIndex = streak % 7;
  return STREAK_BONUSES[dayIndex];
};

const getTodayKey = (): string => new Date().toISOString().split("T")[0];
const isRewardClaimedToday = (): boolean => localStorage.getItem("vault_claimed_date") === getTodayKey();
const markRewardClaimed = (): void => localStorage.setItem("vault_claimed_date", getTodayKey());

const SOUNDS = {
  shatter: "https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3",
  coins: "https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3",
};

export const HostageVault = ({
  currentStreak,
  tasksCompleted,
  totalTasks,
  onRewardClaimed,
}: HostageVaultProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const [showCooldown, setShowCooldown] = useState(false);
  const [hasAnimationPlayed, setHasAnimationPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const completionPercentage = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;
  const todayReward = getStreakBonus(currentStreak);
  const currentStreakDay = (currentStreak % 7) + 1;

  useEffect(() => {
    if (isRewardClaimedToday()) {
      setIsReleased(true);
      setShowCooldown(true);
      setHasAnimationPlayed(true);
    }
  }, []);

  useEffect(() => {
    const checkDayChange = () => {
      if (!isRewardClaimedToday() && showCooldown) {
        setShowCooldown(false);
        setIsReleased(false);
        setHasAnimationPlayed(false);
      }
    };
    checkDayChange();
    const interval = setInterval(checkDayChange, 60000);
    return () => clearInterval(interval);
  }, [showCooldown]);

  const playSound = useCallback((url: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      audioRef.current = new Audio(url);
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (completionPercentage >= 100 && !isReleased && !hasAnimationPlayed && !isRewardClaimedToday()) {
      triggerRelease();
    }
  }, [completionPercentage, isReleased, hasAnimationPlayed]);

  const triggerRelease = async () => {
    setHasAnimationPlayed(true);
    playSound(SOUNDS.shatter);
    setIsReleased(true);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FFD700", "#FFA500", "#FFFF00", "#FF6B6B"],
    });

    await new Promise((r) => setTimeout(r, 300));
    playSound(SOUNDS.coins);
    markRewardClaimed();
    onRewardClaimed?.(todayReward);

    await new Promise((r) => setTimeout(r, 1500));
    setShowCooldown(true);
  };

  return (
    <div className={cn("fixed bottom-20 z-40", bi("left-14", "right-14"))}>
      {/* Compact floating button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={bi("خزنة مكافأة السلسلة", "Streak bonus vault")}
        aria-expanded={isExpanded}
        className={cn(
          "w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 shadow-lg border",
          showCooldown
            ? "bg-green-500/20 border-green-500/50"
            : isReleased
            ? "bg-[#1CB0F6]/20 border-[#1CB0F6]/50"
            : "bg-card/95 border-border/50"
        )}
        whileTap={{ scale: 0.9 }}
        animate={!isReleased && !showCooldown ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {showCooldown ? (
          <Unlock className="w-4 h-4 text-green-500" />
        ) : isReleased ? (
          <DuoGem className="w-5 h-5" />
        ) : (
          <>
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[8px] font-bold text-[#1CB0F6]">+{todayReward}</span>
          </>
        )}
      </motion.button>

      {/* Expanded mini panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute bottom-14 bg-card rounded-xl",
              "border border-border/50 shadow-xl p-3 min-w-[160px]",
              bi("left-0", "right-0")
            )}
          >
            {showCooldown ? (
              <div className="text-center">
                <span className="text-2xl">✅</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {bi("تم تحصيل مكافأة اليوم!", "Today's reward collected!")}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <DuoGem className="w-7 h-7" />
                  <span className="text-xl font-bold text-[#1CB0F6]">+{todayReward}</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <ProgressFill
                    value={completionPercentage}
                    className={cn(
                      "rounded-full",
                      isReleased ? "bg-[#1CB0F6]" : "bg-primary"
                    )}
                  />
                </div>

                <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span>
                    {isArabic
                      ? `يوم ${currentStreakDay} • ${tasksCompleted}/${totalTasks}`
                      : `Day ${currentStreakDay} • ${tasksCompleted}/${totalTasks}`}
                  </span>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
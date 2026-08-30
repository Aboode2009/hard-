import { Flame } from "lucide-react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StreakBonusBarProps {
  currentStreak: number;
}

// Streak bonus points for consecutive days (7-day cycle)
const STREAK_BONUSES = [10, 30, 50, 70, 90, 130, 150];

export const getStreakBonus = (streak: number): number => {
  if (streak <= 0) return STREAK_BONUSES[0];
  const dayIndex = (streak) % 7;
  return STREAK_BONUSES[dayIndex];
};

export const StreakBonusBar = ({ currentStreak }: StreakBonusBarProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentPosition = currentStreak % 7;
  const currentBonus = STREAK_BONUSES[currentPosition];
  
  return (
    <div className={cn(
      "fixed bottom-20 z-40",
      bi("left-2", "right-2")
    )}>
      {/* Tiny floating badge */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="duo-card duo-press w-10 h-10 flex flex-col items-center justify-center gap-0.5"
        whileTap={{ scale: 0.9 }}
      >
        <Flame className="w-3.5 h-3.5 text-[#FF9600]" strokeWidth={2.5} />
        <span className="text-[8px] font-bold text-[#FF9600] leading-none">+{currentBonus}</span>
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
              "absolute bottom-12 duo-card p-2",
              bi("left-0", "right-0")
            )}
          >
            <div className="flex gap-1" dir={bi("rtl", "ltr")}>
              {STREAK_BONUSES.map((bonus, index) => {
                const isCurrentDay = index === currentPosition;
                const isPastDay = index < currentPosition;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "w-6 h-8 flex flex-col items-center justify-center rounded",
                      isCurrentDay
                        ? "border-2 border-[#1CB0F6] bg-[#1CB0F61e]"
                        : isPastDay
                          ? "bg-[#58CC02] shadow-[0_2px_0_#45A302]"
                          : "bg-[hsl(var(--duo-border)/0.3)]"
                    )}
                  >
                    {isCurrentDay ? (
                      <Flame className="w-2.5 h-2.5 text-[#1CB0F6]" strokeWidth={2.5} />
                    ) : (
                      <span className={cn(
                        "text-[8px] font-bold",
                        isPastDay ? "text-white" : "text-[hsl(var(--duo-text))]"
                      )}>
                        {index + 1}
                      </span>
                    )}
                    <span className={cn(
                      "text-[7px] font-bold",
                      isCurrentDay
                        ? "text-[#1CB0F6]"
                        : isPastDay
                          ? "text-white/90"
                          : "text-[hsl(var(--duo-muted))]"
                    )}>
                      +{bonus}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
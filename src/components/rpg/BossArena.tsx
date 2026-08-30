import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sword, Skull, Sparkles, Trophy, Gift, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface BossArenaProps {
  boss: {
    boss_name: string;
    boss_name_ar: string;
    boss_emoji: string;
    max_hp: number;
    current_hp: number;
    is_defeated: boolean;
    week_end: string;
  } | null;
  userDamage: {
    damage_dealt: number;
    attacks_count: number;
  } | null;
  hpPercentage: number;
  attacking: boolean;
  showVictory: boolean;
  onCloseVictory: () => void;
  isArabic?: boolean;
  className?: string;
}

export const BossArena = ({
  boss,
  userDamage,
  hpPercentage,
  attacking,
  showVictory,
  onCloseVictory,
  isArabic = false,
  className,
}: BossArenaProps) => {
  const [showAttackEffect, setShowAttackEffect] = useState(false);

  // Show attack animation
  useEffect(() => {
    if (attacking) {
      setShowAttackEffect(true);
      const timer = setTimeout(() => setShowAttackEffect(false), 500);
      return () => clearTimeout(timer);
    }
  }, [attacking]);

  // Victory confetti
  useEffect(() => {
    if (showVictory) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#FFD700", "#FF6B6B", "#4CAF50", "#00BCD4"],
      });
    }
  }, [showVictory]);

  if (!boss) return null;

  const daysRemaining = Math.max(0, Math.ceil((new Date(boss.week_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const getHPColor = () => {
    if (hpPercentage > 60) return "from-green-500 to-green-600";
    if (hpPercentage > 30) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-red-600";
  };

  return (
    <>
      <Card className={cn(
        "relative overflow-hidden border-2",
        boss.is_defeated 
          ? "border-green-500/50 bg-green-500/5" 
          : "border-red-500/30 bg-gradient-to-br from-red-950/20 to-background",
        className
      )}>
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-red-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
        </div>

        <div className="relative p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skull className="w-5 h-5 text-red-500" />
              <span className="text-sm font-bold text-red-500 uppercase tracking-wider">
                {bi("ساحة الزعيم", "Boss Arena")}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="w-3 h-3" />
              <span>
                {boss.is_defeated 
                  ? (bi("مهزوم!", "Defeated!"))
                  : (isArabic ? `${daysRemaining} أيام متبقية` : `${daysRemaining} days left`)
                }
              </span>
            </div>
          </div>

          {/* Boss Display */}
          <div className="flex items-center gap-4">
            {/* Boss Avatar */}
            <motion.div
              animate={showAttackEffect ? { 
                x: [0, -10, 10, -5, 5, 0],
                filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
              } : {}}
              transition={{ duration: 0.3 }}
              className={cn(
                "relative w-20 h-20 rounded-xl flex items-center justify-center text-5xl",
                boss.is_defeated 
                  ? "bg-muted/50 grayscale opacity-50" 
                  : "bg-gradient-to-br from-red-900/50 to-red-950/50 border border-red-500/30"
              )}
            >
              {boss.boss_emoji}
              
              {/* Attack slash effect */}
              <AnimatePresence>
                {showAttackEffect && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                    animate={{ opacity: 1, scale: 1.5, rotate: 0 }}
                    exit={{ opacity: 0, scale: 2 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Sword className="w-12 h-12 text-yellow-400" />
                  </motion.div>
                )}
              </AnimatePresence>

              {boss.is_defeated && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                </div>
              )}
            </motion.div>

            {/* Boss Info & HP */}
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-bold text-lg">
                  {isArabic ? boss.boss_name_ar : boss.boss_name}
                </h3>
                <div className="text-xs text-muted-foreground">
                  HP: {boss.current_hp} / {boss.max_hp}
                </div>
              </div>

              {/* HP Bar */}
              <div className="relative">
                <div className="h-4 bg-muted rounded-full overflow-hidden border border-border">
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: `${hpPercentage}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cn(
                      "h-full bg-gradient-to-r rounded-full relative",
                      getHPColor()
                    )}
                  >
                    {/* Damage flash effect */}
                    {showAttackEffect && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-white"
                      />
                    )}
                  </motion.div>
                </div>
              </div>

              {/* User's contribution */}
              {userDamage && userDamage.attacks_count > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Sword className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">
                    {isArabic 
                      ? `أنت: ${userDamage.damage_dealt} ضرر (${userDamage.attacks_count} هجمات)`
                      : `You: ${userDamage.damage_dealt} damage (${userDamage.attacks_count} attacks)`
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info footer */}
          <div className="text-xs text-center text-muted-foreground bg-muted/30 rounded-lg p-2">
            <Sparkles className="w-3 h-3 inline-block mr-1" />
            {bi("أكمل المهام للهجوم! كل مهمة = 10 ضرر", "Complete tasks to attack! Each task = 10 damage")
            }
          </div>
        </div>
      </Card>

      {/* Victory Modal */}
      <AnimatePresence>
        {showVictory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onCloseVictory}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border-2 border-yellow-500/50 rounded-2xl p-8 text-center max-w-sm w-full space-y-6 shadow-2xl shadow-yellow-500/20"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-7xl"
              >
                🏆
              </motion.div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-yellow-500">
                  {bi("انتصار!", "VICTORY!")}
                </h2>
                <p className="text-muted-foreground">
                  {isArabic 
                    ? `هزمت ${boss.boss_name_ar}!`
                    : `You defeated the ${boss.boss_name}!`
                  }
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">+500</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
                <div className="text-center">
                  <Gift className="w-8 h-8 mx-auto text-purple-500" />
                  <div className="text-xs text-muted-foreground">
                    {bi("صندوق الزعيم", "Boss Chest")}
                  </div>
                </div>
              </div>

              <Button onClick={onCloseVictory} className="w-full">
                {bi("رائع!", "Awesome!")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

import { useEffect, useRef, useState } from "react";
import { bi } from "@/i18n/bi";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Swords, Trophy, Gift, Timer, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BossFigure } from "./bosses/BossFigure";
import type { BossState } from "./bosses/BossCreature";
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

/** Below this the boss wakes up and turns angry. */
const ENRAGE_AT = 35;

/**
 * Health bar.
 *
 * Animates `scaleX` rather than `width` — a width animation lays out and
 * paints on every frame, which is exactly the kind of thing that was making
 * this app stutter. The fill is anchored to the inline start so it drains the
 * correct way in both LTR and RTL.
 */
const HealthBar = ({ percent, isArabic }: { percent: number; isArabic: boolean }) => {
  const tone =
    percent > 60 ? "bg-emerald-500" : percent > ENRAGE_AT ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={cn("h-full w-full rounded-full", tone)}
        style={{ transformOrigin: isArabic ? "right center" : "left center" }}
        initial={false}
        animate={{ scaleX: Math.max(0, Math.min(100, percent)) / 100 }}
        transition={{ type: "spring", stiffness: 170, damping: 24, mass: 0.9 }}
      />
    </div>
  );
};

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
  const reduceMotion = useReducedMotion();
  const [hitPulse, setHitPulse] = useState(false);
  const confettiFired = useRef(false);

  // A hit is a momentary state; the creature returns to its resting pose.
  useEffect(() => {
    if (!attacking) return;
    setHitPulse(true);
    const timer = setTimeout(() => setHitPulse(false), 700);
    return () => clearTimeout(timer);
  }, [attacking]);

  // Victory confetti — fired once, and skipped entirely under reduced motion.
  useEffect(() => {
    if (!showVictory || confettiFired.current || reduceMotion) return;
    confettiFired.current = true;
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        disableForReducedMotion: true,
        colors: ["#FFD700", "#FF6B6B", "#4CAF50", "#00BCD4"],
      });
    } catch {
      /* decorative only */
    }
  }, [showVictory, reduceMotion]);

  useEffect(() => {
    if (!showVictory) confettiFired.current = false;
  }, [showVictory]);

  if (!boss) return null;

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(boss.week_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  // One source of truth for the creature's mood.
  const bossState: BossState = boss.is_defeated
    ? "defeated"
    : hitPulse
      ? "hit"
      : hpPercentage <= ENRAGE_AT
        ? "angry"
        : "idle";

  const name = isArabic ? boss.boss_name_ar : boss.boss_name;

  return (
    <>
      <Card className={cn("boss-screen overflow-hidden border-border", className)}>
        <div className="space-y-4 p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Swords className="h-4 w-4 shrink-0 text-destructive" />
              <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {bi("ساحة الزعيم", "Boss Arena")}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <span>
                {boss.is_defeated
                  ? bi("مهزوم", "Defeated")
                  : isArabic
                    ? `${daysRemaining} أيام`
                    : `${daysRemaining}d left`}
              </span>
            </div>
          </div>

          {/* Creature — the visual lead. */}
          <div className="relative flex justify-center">
            <BossFigure
              nameAr={boss.boss_name_ar}
              nameEn={boss.boss_name}
              emoji={boss.boss_emoji}
              state={bossState}
              size={168}
              className={cn(boss.is_defeated && "opacity-60 grayscale")}
            />

            {boss.is_defeated && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 16 }}
                className="absolute bottom-2 rounded-full border border-border bg-card p-2.5 shadow-sm"
              >
                <Trophy className="h-6 w-6 text-amber-500" />
              </motion.div>
            )}
          </div>

          {/* Name + HP */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                <span dir="ltr">{boss.current_hp} / {boss.max_hp}</span>
              </span>
            </div>

            <HealthBar percent={hpPercentage} isArabic={isArabic} />

            {userDamage && userDamage.attacks_count > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Swords className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {isArabic
                    ? `ضررك: ${userDamage.damage_dealt} · ${userDamage.attacks_count} هجمات`
                    : `Your damage: ${userDamage.damage_dealt} · ${userDamage.attacks_count} attacks`}
                </span>
              </p>
            )}
          </div>

          {/* Hint */}
          <p className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            {bi("أكمل المهام للهجوم — كل مهمة = 10 ضرر", "Complete tasks to attack — each one deals 10 damage")}
          </p>
        </div>
      </Card>

      {/* Victory */}
      <AnimatePresence>
        {showVictory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="boss-screen fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
            onClick={onCloseVictory}
          >
            <motion.div
              initial={{ scale: 0.85, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22, mass: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 text-center shadow-xl"
            >
              <div className="flex justify-center">
                <BossFigure
                  nameAr={boss.boss_name_ar}
                  nameEn={boss.boss_name}
                  emoji={boss.boss_emoji}
                  state="victory"
                  size={140}
                />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">{bi("انتصار", "Victory")}</h2>
                <p className="text-sm text-muted-foreground">
                  {isArabic ? `هزمت ${boss.boss_name_ar}` : `You defeated the ${boss.boss_name}`}
                </p>
              </div>

              <div className="flex items-center justify-center gap-6">
                <div>
                  <div className="text-xl font-semibold text-primary">+500</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
                <div>
                  <Gift className="mx-auto h-6 w-6 text-primary" />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {bi("صندوق الزعيم", "Boss Chest")}
                  </div>
                </div>
              </div>

              <Button onClick={onCloseVictory} className="w-full">
                {bi("رائع", "Awesome")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

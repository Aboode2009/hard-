import { useState, useEffect, useRef, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Timer, Swords, Check, ShieldAlert, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BossFigure } from "./bosses/BossFigure";
import { ChestCeremony } from "@/components/cosmetics/ChestCeremony";

interface WeeklyBossEventProps {
  event: {
    boss_name: string;
    boss_name_ar: string;
    boss_emoji: string;
    quest: {
      title: string;
      title_ar: string;
      description: string;
      description_ar: string;
      icon: string;
    };
    ends_at: string;
  };
  questCompleted: boolean;
  showChest: boolean;
  chestOpened: boolean;
  rewards: {
    lemons: number;
    xp: number;
    cosmetic: { name: string; name_ar: string; type: string } | null;
  } | null;
  getTimeRemaining: () => { hours: number; minutes: number; seconds: number; total: number };
  onCompleteQuest: () => void;
  onOpenChest: () => void;
  onClaimRewards: () => void;
  isArabic?: boolean;
  className?: string;
}

const SFX = {
  shatter: "https://assets.mixkit.co/active_storage/sfx/2970/2970-preview.mp3",
} as const;

/** One countdown segment. */
const TimeCell = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{value}</span>
    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
  </div>
);

export const WeeklyBossEvent = ({
  event,
  questCompleted,
  showChest,
  chestOpened,
  rewards,
  getTimeRemaining,
  onCompleteQuest,
  onOpenChest,
  onClaimRewards,
  isArabic = false,
  className,
}: WeeklyBossEventProps) => {
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRefs = useRef<Partial<Record<keyof typeof SFX, HTMLAudioElement | null>>>({});
  // Countdown. Paused while the tab is hidden — a 1s setState in the
  // background is a re-render of this whole subtree for nobody to see.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(() => setTimeRemaining(getTimeRemaining()), 1000);
    };
    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setTimeRemaining(getTimeRemaining());
        start();
      } else {
        stop();
      }
    };

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [getTimeRemaining]);

  const playSound = useCallback(
    (key: keyof typeof SFX) => {
      if (!soundEnabled) return;
      const el = audioRefs.current[key];
      if (!el) return;
      try {
        el.currentTime = 0;
        void el.play().catch(() => {});
      } catch {
        /* audio is optional */
      }
    },
    [soundEnabled],
  );

  if (!event) return null;

  const pad = (v: number) => v.toString().padStart(2, "0");
  const bossName = isArabic ? event.boss_name_ar : event.boss_name;
  const urgent = timeRemaining.total > 0 && timeRemaining.hours < 3;

  return (
    <>
      {/*
        preload="none": these are remote files. With preload="auto" the
        browser fetched all of them the moment the home screen mounted, on a
        screen where most users never tap the chest.
      */}
      {(Object.keys(SFX) as (keyof typeof SFX)[]).map((key) => (
        <audio
          key={key}
          ref={(el) => {
            audioRefs.current[key] = el;
          }}
          src={SFX[key]}
          preload="none"
        />
      ))}

      <Card className={cn("boss-screen overflow-hidden border-border", className)}>
        <div className="space-y-5 p-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Swords className="h-4 w-4 shrink-0 text-destructive" />
              <span className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {bi("زعيم الأسبوع", "Weekly Boss")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={bi("الصوت", "Sound")}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>

          {/* Creature — the visual lead, and the only large element. */}
          <div className="flex flex-col items-center">
            <BossFigure
              nameAr={event.boss_name_ar}
              nameEn={event.boss_name}
              emoji={event.boss_emoji}
              state={questCompleted ? "defeated" : urgent ? "angry" : "idle"}
              size={200}
            />
            <h2 className="mt-1 text-lg font-semibold text-foreground">{bossName}</h2>
          </div>

          {/* Countdown */}
          <div
            className={cn(
              "flex items-center justify-center gap-4 rounded-xl border px-4 py-3",
              urgent ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/40",
            )}
          >
            <Timer className={cn("h-4 w-4 shrink-0", urgent ? "text-destructive" : "text-muted-foreground")} />
            <div className="flex items-center gap-3">
              <TimeCell value={pad(timeRemaining.hours)} label={bi("ساعة", "hrs")} />
              <span className="pb-4 text-lg text-muted-foreground">:</span>
              <TimeCell value={pad(timeRemaining.minutes)} label={bi("دقيقة", "min")} />
              <span className="pb-4 text-lg text-muted-foreground">:</span>
              <TimeCell value={pad(timeRemaining.seconds)} label={bi("ثانية", "sec")} />
            </div>
          </div>

          {/* Quest */}
          <div
            className={cn(
              "rounded-xl border p-4",
              questCompleted ? "border-primary/40 bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                {event.quest.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {bi("المهمة", "Quest")}
                </p>
                <h3 className="mt-0.5 font-semibold text-foreground">
                  {isArabic ? event.quest.title_ar : event.quest.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {isArabic ? event.quest.description_ar : event.quest.description}
                </p>
              </div>

              {questCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="shrink-0 rounded-full bg-primary p-1.5"
                >
                  <Check className="h-4 w-4 text-primary-foreground" />
                </motion.div>
              )}
            </div>

            {!questCompleted && (
              <Button
                onClick={() => {
                  playSound("shatter");
                  onCompleteQuest();
                }}
                className="mt-4 w-full"
              >
                <Check className="h-4 w-4" />
                {bi("أكملت المهمة", "I completed the quest")}
              </Button>
            )}
          </div>

          {/* Warning — informational, not alarming. */}
          <p className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {bi(
                "إذا انتهى الوقت دون إكمال المهمة، ستخسر نصف جواهرك.",
                "If time runs out before you finish the quest, you lose half your gems.",
              )}
            </span>
          </p>
        </div>
      </Card>

      {/* Chest — the app's shared chest screen, same as the store's. */}
      <ChestCeremony
        isOpen={showChest}
        kicker={bi("هزمت الزعيم", "BOSS DEFEATED")}
        title={bi("صندوق الزعيم", "Boss Chest")}
        reward={
          rewards
            ? { coins: rewards.lemons, xp: rewards.xp, item: rewards.cosmetic }
            : null
        }
        onOpen={() => {
          if (!chestOpened) onOpenChest();
        }}
        onClose={onClaimRewards}
      />
    </>
  );
};

/**
 * Shown when the week ends with the quest unfinished.
 *
 * Deliberately low-key: the week is lost either way, so this states what
 * happened and points at next week rather than dramatising it.
 */
export const DefeatScreen = ({
  isArabic,
  onClose,
}: {
  isArabic: boolean;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="boss-screen fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.88, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24, mass: 1.1 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6 text-center"
    >
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Timer className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          {isArabic ? "انتهى الوقت" : "Time's up"}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {isArabic
            ? "لم تكتمل المهمة هذا الأسبوع، وخسرت نصف جواهرك. الأسبوع القادم فرصة جديدة."
            : "The quest went unfinished this week and you lost half your gems. Next week is a fresh start."}
        </p>
      </div>

      <Button onClick={onClose} variant="outline" className="w-full">
        {isArabic ? "حسناً" : "OK"}
      </Button>
    </motion.div>
  </motion.div>
);

import { cn } from "@/lib/utils";
import { ProgressFill } from "@/components/ui/progress-fill";
import { bi } from "@/i18n/bi";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface XPBarProps {
  xp: number;
  level: number;
  xpProgress: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  isArabic?: boolean;
  className?: string;
  compact?: boolean;
}

const GOLD = "#FFC800";
const GOLD_EDGE = "#E6A700";

// Module-level component: defining it inside XPBar gave it a new identity on
// every render, so React remounted it and the fill re-animated from 0 each
// second (the home page re-renders every second for the midnight countdown).
const Bar = ({ height, progress }: { height: string; progress: number }) => (
  <div
    className={cn("relative rounded-full overflow-hidden", height)}
    style={{ background: "hsl(var(--duo-border) / 0.6)" }}
  >
    <ProgressFill value={progress} className="rounded-full" style={{ background: GOLD }}>
      <div className="absolute inset-x-2 top-[3px] h-1 rounded-full bg-white/40" />
    </ProgressFill>
  </div>
);

export const XPBar = ({
  xp,
  level,
  xpProgress,
  xpForCurrentLevel,
  xpForNextLevel,
  isArabic = false,
  className,
  compact = false,
}: XPBarProps) => {
  const currentLevelXP = xp - xpForCurrentLevel;
  const neededXP = xpForNextLevel - xpForCurrentLevel;

  if (compact) {
    return (
      <div className={cn("duo-card p-3", className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: GOLD, boxShadow: `0 2px 0 ${GOLD_EDGE}` }}
            >
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} fill="#fff" />
            </div>
            <span className="text-sm font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {isArabic ? `المستوى ${level}` : `Level ${level}`}
            </span>
          </div>
          <span className="text-sm font-extrabold tabular-nums" style={{ color: GOLD }} dir="ltr">
            {currentLevelXP}/{neededXP} XP
          </span>
        </div>
        <Bar height="h-3.5" progress={xpProgress} />
      </div>
    );
  }

  return (
    <div className={cn("duo-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: GOLD, boxShadow: `0 2px 0 ${GOLD_EDGE}` }}
          >
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} fill="#fff" />
          </div>
          <div>
            <div className="text-sm font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {isArabic ? `المستوى ${level}` : `Level ${level}`}
            </div>
            <div className="text-xs font-bold tabular-nums" style={{ color: "hsl(var(--duo-muted))" }} dir="ltr">
              {currentLevelXP} / {neededXP} XP
            </div>
          </div>
        </div>
        <span className="text-xs font-extrabold tabular-nums" style={{ color: GOLD }}>
          {xp} XP {bi("إجمالي", "total")}
        </span>
      </div>

      <Bar height="h-4" progress={xpProgress} />

      <div className="flex justify-between mt-1.5 text-[10px] font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
        <span>{isArabic ? `المستوى ${level}` : `Lvl ${level}`}</span>
        <span>{isArabic ? `المستوى ${level + 1}` : `Lvl ${level + 1}`}</span>
      </div>
    </div>
  );
};

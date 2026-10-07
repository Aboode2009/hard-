import type React from "react";
import { ChevronsUp, Crown, Flame, Timer, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { bi } from "@/i18n/bi";
import { cn } from "@/lib/utils";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { UserAvatar } from "@/components/UserAvatar";

/**
 * The pieces both leaderboards are built from — the public one
 * (pages/Leaderboard.tsx) and the NASS company one (pages/NassLeaderboard.tsx)
 * — so the two always look and behave the same.
 */

/** Duolingo-style league tiers driven by weekly points. */
const LEAGUES = [
  { id: "bronze", ar: "البرونزي", en: "Bronze", color: "#E5A55D", min: 0 },
  { id: "silver", ar: "الفضي", en: "Silver", color: "#B7C9D3", min: 100 },
  { id: "gold", ar: "الذهبي", en: "Gold", color: "#FFC800", min: 250 },
  { id: "ruby", ar: "الياقوتي", en: "Ruby", color: "#FF4D8A", min: 500 },
  { id: "diamond", ar: "الماسي", en: "Diamond", color: "#1CB0F6", min: 1000 },
];

const leagueIndexFor = (weeklyPoints: number) =>
  LEAGUES.reduce((acc, l, i) => (weeklyPoints >= l.min ? i : acc), 0);

const RANK_COLORS: Record<number, string> = { 1: "#FFC800", 2: "#93A8B4", 3: "#CD8A4D" };

/** Days left in the weekly round. The server resets it at Monday 00:00
 *  Baghdad (UTC+3, no DST), whatever timezone the phone is set to. */
const weeklyDaysLeft = () => {
  const baghdad = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const n = (8 - baghdad.getUTCDay()) % 7;
  return n === 0 ? 7 : n;
};

const LeagueShield = ({ color, active }: { color: string; active: boolean }) => (
  <svg
    viewBox="0 0 40 48"
    className={cn("transition-all", active ? "w-[52px] h-[62px]" : "w-10 h-12 opacity-30 grayscale")}
  >
    <path d="M20 2L36 8V24C36 36 28 43 20 46C12 43 4 36 4 24V8Z" fill={color} />
    <path d="M20 2L36 8V24C36 31 33 36 29 40L20 46V2Z" fill="#000" opacity="0.12" />
    <path d="M20 8L30 12V23C30 31 25 36 20 39C15 36 10 31 10 23V12Z" fill="#fff" opacity="0.25" />
  </svg>
);

/** The row of league shields, the league's name and the days left. */
export const LeagueHeader = ({ weeklyPoints, isArabic }: { weeklyPoints: number; isArabic: boolean }) => {
  const activeIdx = leagueIndexFor(weeklyPoints);
  const league = LEAGUES[activeIdx];
  const daysLeft = weeklyDaysLeft();
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 mb-3"
        data-tour="lb-league"
      >
        {LEAGUES.map((l, i) => (
          <LeagueShield key={l.id} color={l.color} active={i === activeIdx} />
        ))}
      </motion.div>
      <div className="text-center mb-4">
        <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
          {isArabic ? `الدوري ${league.ar}` : `${league.en} League`}
        </h2>
        <p className="flex items-center justify-center gap-1.5 text-sm font-extrabold mt-1" style={{ color: "#FFC800" }}>
          <Timer className="w-4 h-4" strokeWidth={2.5} />
          {isArabic ? `${daysLeft} ${daysLeft === 1 ? "يوم متبقٍ" : "أيام متبقية"}` : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}
        </p>
      </div>
      <div className="h-0.5 rounded-full mb-4" style={{ background: "hsl(var(--duo-border))" }} />
    </>
  );
};

export interface ChampionInfo {
  user_id: string;
  username: string;
  total_points: number;
  avatar_id: string | null;
  gender: string | null;
}

/** Last week's champion, wearing the crown. */
export const ChampionBanner = ({ champion }: { champion: ChampionInfo }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="rounded-2xl p-4 mb-4 flex items-center gap-3"
    style={{ background: "#FFC800", boxShadow: "0 4px 0 #d9a800" }}
    data-tour="lb-champion"
  >
    <div className="relative flex-shrink-0">
      <UserAvatar
        avatarId={champion.avatar_id}
        gender={champion.gender}
        seed={champion.user_id}
        alt={champion.username}
        className="w-14 h-14"
        style={{ boxShadow: "0 0 0 3px #FFFFFF" }}
      />
      <Crown className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-6 h-6 text-white drop-shadow" fill="#FFFFFF" strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-extrabold tracking-wider text-white/90">
        {bi("بطل الأسبوع", "WEEKLY CHAMPION")}
      </p>
      <h3 className="text-lg font-extrabold text-white leading-tight truncate" dir="auto">{champion.username}</h3>
    </div>
    <div className="flex items-center gap-1 flex-shrink-0">
      <DuoGem className="w-5 h-5" />
      <span className="font-extrabold text-white">{champion.total_points}</span>
    </div>
  </motion.div>
);

/** The line under the top three. */
export const PromotionDivider = () => (
  <div className="flex items-center gap-2 py-2.5 px-1" data-tour="lb-promo">
    <div className="flex-1 h-0.5 rounded-full" style={{ background: "#58CC0270" }} />
    <ChevronsUp className="w-4 h-4" style={{ color: "#58CC02" }} strokeWidth={2.5} />
    <span className="text-[11px] font-extrabold tracking-wider" style={{ color: "#58CC02" }}>
      {bi("منطقة الترقية", "PROMOTION ZONE")}
    </span>
    <ChevronsUp className="w-4 h-4" style={{ color: "#58CC02" }} strokeWidth={2.5} />
    <div className="flex-1 h-0.5 rounded-full" style={{ background: "#58CC0270" }} />
  </div>
);

/** "How to earn points?" — one card per way. */
export const EarnRows = ({ rows }: { rows: { icon: LucideIcon; color: string; text: string }[] }) => (
  <div className="mt-6" data-tour="lb-earn">
    <h3 className="text-lg font-extrabold mb-3" style={{ color: "hsl(var(--duo-text))" }}>
      {bi("كيف تكسب النقاط؟", "How to earn points?")}
    </h3>
    <div className="space-y-3">
      {rows.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="duo-card flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}22` }}>
              <Icon className="w-5 h-5" style={{ color: item.color }} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold" style={{ color: "hsl(var(--duo-text))" }}>
              {item.text}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

export interface BoardEntry {
  rank: number;
  user_id: string;
  username: string;
  current_day: number;
  current_streak: number;
  weekly_points: number;
  avatar_id: string | null;
  gender: string | null;
  is_premium?: boolean;
}

/** One player's row; the promotion line follows rank 3 when more come after. */
export const LeaderboardRow = ({
  entry,
  index,
  isCurrentUser,
  isArabic,
  showPromotion,
  badge,
}: {
  entry: BoardEntry;
  index: number;
  isCurrentUser: boolean;
  isArabic: boolean;
  showPromotion: boolean;
  /** Shown after the name (the premium crown on the public board). */
  badge?: React.ReactNode;
}) => (
  <div data-rank-row={isCurrentUser ? "me" : undefined}>
    <motion.div
      initial={{ opacity: 0, x: isArabic ? 16 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      // Short, so a cached board reads as immediate.
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.15) }}
      className={cn("flex items-center gap-3 px-3 py-2.5 rounded-2xl", isCurrentUser && "border-2")}
      data-tour={isCurrentUser ? "lb-me" : undefined}
      style={isCurrentUser ? { background: "#1CB0F615", borderColor: "#1CB0F650" } : undefined}
    >
      <span className="w-7 text-center text-lg font-extrabold flex-shrink-0" style={{ color: RANK_COLORS[entry.rank] || "hsl(var(--duo-muted))" }}>
        {entry.rank}
      </span>
      <UserAvatar avatarId={entry.avatar_id} gender={entry.gender} seed={entry.user_id} alt={entry.username} className="w-11 h-11" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-extrabold truncate" dir="auto" style={{ color: isCurrentUser ? "#1CB0F6" : "hsl(var(--duo-text))" }}>
            {entry.username}
          </span>
          {badge}
          {isCurrentUser && (
            <span className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#1CB0F6" }}>
              {bi("أنت", "YOU")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
          <span>{isArabic ? `اليوم ${entry.current_day}` : `Day ${entry.current_day}`}</span>
          <Flame className="w-3 h-3" style={{ color: "#FF9600" }} strokeWidth={2.5} />
          <span>{entry.current_streak}</span>
        </div>
      </div>
      <span className="font-extrabold flex-shrink-0" style={{ color: "hsl(var(--duo-muted))" }}>
        {entry.weekly_points} {bi("نقطة", "XP")}
      </span>
    </motion.div>
    {showPromotion && <PromotionDivider />}
  </div>
);

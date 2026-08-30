import { useEffect, useState } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { ChevronLeft, ChevronRight, ChevronsUp, Crown, Flame, Timer, CheckCircle2, TrendingUp, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  rank: number;
  username: string;
  user_id: string;
  current_streak: number;
  best_streak: number;
  current_day: number;
  total_points: number;
  weekly_points: number;
}

interface WeeklyChampion {
  user_id: string;
  username: string;
  total_points: number;
  featured_until: string;
}

// Duolingo-style league tiers driven by weekly points.
const LEAGUES = [
  { id: "bronze", ar: "البرونزي", en: "Bronze", color: "#E5A55D", min: 0 },
  { id: "silver", ar: "الفضي", en: "Silver", color: "#B7C9D3", min: 100 },
  { id: "gold", ar: "الذهبي", en: "Gold", color: "#FFC800", min: 250 },
  { id: "ruby", ar: "الياقوتي", en: "Ruby", color: "#FF4D8A", min: 500 },
  { id: "diamond", ar: "الماسي", en: "Diamond", color: "#1CB0F6", min: 1000 },
];

const AVATAR_COLORS = ["#1CB0F6", "#58CC02", "#FF9600", "#CE82FF", "#FF4D8A", "#FFC800"];
const avatarColor = (name: string) => AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const RANK_COLORS: Record<number, string> = { 1: "#FFC800", 2: "#93A8B4", 3: "#CD8A4D" };

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

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyChampion, setWeeklyChampion] = useState<WeeklyChampion | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    checkAuth();
    fetchLeaderboard();
    fetchWeeklyChampion();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(user.id);
    } catch (error) {
      console.error("Error checking auth:", error);
    }
  };

  const fetchWeeklyChampion = async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_champion');
      if (!error && data && data.length > 0) {
        setWeeklyChampion(data[0] as WeeklyChampion);
      }
    } catch (error) {
      console.error("Error fetching champion:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      // First get NASS user IDs to exclude them
      const { data: nassProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("company_code", "NASS");

      const nassUserIds = (nassProfiles || []).map(p => p.id);

      const { data, error } = await supabase.rpc('get_leaderboard');

      if (error) throw error;

      // Filter out NASS employees from leaderboard
      const filteredData = (data || []).filter((entry: { user_id: string }) =>
        !nassUserIds.includes(entry.user_id)
      );

      const leaderboardData = filteredData.map((entry: Omit<LeaderboardEntry, "rank">, index: number) => ({
        rank: index + 1,
        user_id: entry.user_id,
        username: entry.username || "Anonymous",
        current_streak: entry.current_streak,
        best_streak: entry.best_streak,
        current_day: entry.current_day,
        total_points: entry.total_points,
        weekly_points: entry.weekly_points,
      }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setFetchError((error as { message?: string })?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  // Current user's league from their weekly points
  const myWeekly = leaderboard.find(e => e.user_id === currentUserId)?.weekly_points ?? 0;
  const activeLeagueIdx = LEAGUES.reduce((acc, l, i) => (myWeekly >= l.min ? i : acc), 0);
  const activeLeague = LEAGUES[activeLeagueIdx];

  // Days left in the weekly round (resets Monday)
  const daysLeft = (() => {
    const n = (8 - new Date().getDay()) % 7;
    return n === 0 ? 7 : n;
  })();

  const earnRows = [
    { icon: CheckCircle2, color: "#58CC02", text: bi("أكمل مهمة = نقطة واحدة", "Complete a task = 1 point") },
    { icon: Crown, color: "#FFC800", text: bi("أعلى نقاط الأسبوع يحصل على إطار البطل", "Highest weekly points wins the champion frame") },
    { icon: TrendingUp, color: "#1CB0F6", text: bi("تُصفَّر النقاط الأسبوعية كل أسبوع", "Weekly points reset every week") },
  ];

  return (
    <div className="duo-page min-h-screen bg-background pb-28" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("المتصدرين", "Leaderboard")}
          </h1>
          <div className="w-11" />
        </div>

        {/* League shields row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-3"
        >
          {LEAGUES.map((league, i) => (
            <LeagueShield key={league.id} color={league.color} active={i === activeLeagueIdx} />
          ))}
        </motion.div>

        {/* League name + countdown */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {isArabic ? `الدوري ${activeLeague.ar}` : `${activeLeague.en} League`}
          </h2>
          <p className="flex items-center justify-center gap-1.5 text-sm font-extrabold mt-1" style={{ color: "#FFC800" }}>
            <Timer className="w-4 h-4" strokeWidth={2.5} />
            {isArabic ? `${daysLeft} ${daysLeft === 1 ? "يوم متبقٍ" : "أيام متبقية"}` : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}
          </p>
        </div>
        <div className="h-0.5 rounded-full mb-4" style={{ background: "hsl(var(--duo-border))" }} />

        {/* Weekly Champion banner */}
        {weeklyChampion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: "#FFC800", boxShadow: "0 4px 0 #d9a800" }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.3)" }}>
              <Crown className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold tracking-wider text-white/90">
                {bi("بطل الأسبوع", "WEEKLY CHAMPION")}
              </p>
              <h3 className="text-lg font-extrabold text-white leading-tight truncate">{weeklyChampion.username}</h3>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <DuoGem className="w-5 h-5" />
              <span className="font-extrabold text-white">{weeklyChampion.total_points}</span>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
            />
            <span className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("جاري التحميل...", "Loading...")}
            </span>
          </div>
        ) : (
          <div>
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === currentUserId;
              const rankColor = RANK_COLORS[entry.rank];

              return (
                <div key={entry.user_id}>
                  <motion.div
                    initial={{ opacity: 0, x: isArabic ? 16 : -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.5) }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-2xl",
                      isCurrentUser && "border-2"
                    )}
                    style={isCurrentUser ? { background: "#1CB0F615", borderColor: "#1CB0F650" } : undefined}
                  >
                    {/* Rank */}
                    <span
                      className="w-7 text-center text-lg font-extrabold flex-shrink-0"
                      style={{ color: rankColor || "hsl(var(--duo-muted))" }}
                    >
                      {entry.rank}
                    </span>

                    {/* Avatar */}
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-extrabold flex-shrink-0"
                      style={{ background: avatarColor(entry.username) }}
                    >
                      {entry.username.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + sub info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-extrabold truncate"
                          style={{ color: isCurrentUser ? "#1CB0F6" : "hsl(var(--duo-text))" }}
                        >
                          {entry.username}
                        </span>
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

                    {/* Weekly points */}
                    <span className="font-extrabold flex-shrink-0" style={{ color: "hsl(var(--duo-muted))" }}>
                      {entry.weekly_points} {bi("نقطة", "XP")}
                    </span>
                  </motion.div>

                  {/* Promotion zone divider after top 3 */}
                  {entry.rank === 3 && leaderboard.length > 3 && (
                    <div className="flex items-center gap-2 py-2.5 px-1">
                      <div className="flex-1 h-0.5 rounded-full" style={{ background: "#58CC0270" }} />
                      <ChevronsUp className="w-4 h-4" style={{ color: "#58CC02" }} strokeWidth={2.5} />
                      <span className="text-[11px] font-extrabold tracking-wider" style={{ color: "#58CC02" }}>
                        {bi("منطقة الترقية", "PROMOTION ZONE")}
                      </span>
                      <ChevronsUp className="w-4 h-4" style={{ color: "#58CC02" }} strokeWidth={2.5} />
                      <div className="flex-1 h-0.5 rounded-full" style={{ background: "#58CC0270" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Visible DB error */}
        {!loading && fetchError && (
          <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-bold text-destructive mb-1">
              {bi("تعذّر تحميل المتصدرين", "Failed to load leaderboard")}
            </p>
            <p className="text-muted-foreground break-all" dir="ltr">{fetchError}</p>
          </div>
        )}

        {!loading && !fetchError && leaderboard.length === 0 && (
          <div className="duo-card p-8 flex flex-col items-center text-center mt-2">
            <UsersRound className="w-10 h-10 mb-3" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2} />
            <p className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("لا توجد تحديات نشطة بعد", "No active challenges yet")}
            </p>
          </div>
        )}

        {/* How to earn points */}
        <div className="mt-6">
          <h3 className="text-lg font-extrabold mb-3" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("كيف تكسب النقاط؟", "How to earn points?")}
          </h3>
          <div className="space-y-3">
            {earnRows.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="duo-card flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${item.color}22` }}
                  >
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
      </div>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;

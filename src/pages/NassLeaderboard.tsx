import { useEffect, useState } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { Flame, Crown, Star, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NassBottomNav } from "@/components/NassBottomNav";

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

// Solid Duolingo-palette rank badges (gold / silver / bronze) with a small ledge.
const RANK_BADGE: Record<number, { face: string; edge: string }> = {
  1: { face: "#FFC800", edge: "#D9A800" },
  2: { face: "#93A8B4", edge: "#76909F" },
  3: { face: "#FF9600", edge: "#CC7800" },
};

const NassLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    checkAuth();
    fetchNassLeaderboard();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCurrentUserId(user.id);

      // Check if user is NASS employee
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_code")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.company_code !== "NASS") {
        navigate("/");
        return;
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    }
  };

  const fetchNassLeaderboard = async () => {
    try {
      // First get all NASS users
      const { data: nassProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("company_code", "NASS");

      if (profilesError) throw profilesError;

      if (!nassProfiles || nassProfiles.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const nassUserIds = nassProfiles.map(p => p.id);

      // Get challenge progress for NASS users
      const { data: progressData, error: progressError } = await supabase
        .from("challenge_progress")
        .select("user_id, current_streak, best_streak, current_day, total_points, weekly_points")
        .in("user_id", nassUserIds);

      if (progressError) throw progressError;

      // Combine data
      const leaderboardData = (progressData || [])
        .map((progress) => {
          const profile = nassProfiles.find(p => p.id === progress.user_id);
          return {
            user_id: progress.user_id,
            username: profile?.username || "Anonymous",
            current_streak: progress.current_streak,
            best_streak: progress.best_streak,
            current_day: progress.current_day,
            total_points: progress.total_points,
            weekly_points: progress.weekly_points,
          };
        })
        .sort((a, b) => b.weekly_points - a.weekly_points)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Error fetching NASS leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const topUser = leaderboard.length > 0 ? leaderboard[0] : null;

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={bi("rtl", "ltr")}>
      <div className="max-w-2xl mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/nass")}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6" style={{ color: "#1CB0F6" }} strokeWidth={2.5} />
            <h1 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {bi("لوحة صدارة NASS", "NASS Leaderboard")}
            </h1>
          </div>
          <div className="w-11" />
        </div>

        <div className="space-y-6">
          {/* Champion Banner */}
          {topUser && topUser.weekly_points > 0 && (
            <div
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
            >
              {/* Crown Icon */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.3)" }}>
                  <Crown className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <div
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "#FFC800", boxShadow: "0 2px 0 #D9A800" }}
                >
                  <span className="text-xs font-extrabold text-white">1</span>
                </div>
              </div>

              {/* Champion Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-extrabold tracking-wider text-white/90 uppercase">
                  {bi("🏆 نجم الأسبوع", "🏆 Star of the Week")}
                </p>
                <h3 className="text-xl font-extrabold text-white leading-tight truncate">
                  {topUser.username}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Star className="w-4 h-4 text-white fill-white" />
                  <span className="text-sm font-extrabold text-white">
                    {topUser.weekly_points} {bi("نقطة", "points")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("جاري التحميل...", "Loading...")}
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => {
                const isCurrentUser = entry.user_id === currentUserId;
                const isTop = entry.rank === 1 && entry.weekly_points > 0;
                const badge = RANK_BADGE[entry.rank];

                return (
                  <div
                    key={entry.rank}
                    className="duo-card p-4"
                    style={isCurrentUser ? { background: "#1CB0F60D", borderColor: "#1CB0F650" } : undefined}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Badge */}
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-extrabold"
                        style={badge
                          ? { background: badge.face, boxShadow: `0 3px 0 ${badge.edge}`, color: "#fff" }
                          : { background: "hsl(var(--duo-border))", color: "hsl(var(--duo-muted))" }}
                      >
                        {isTop ? (
                          <Crown className="w-5 h-5" strokeWidth={2.5} />
                        ) : (
                          entry.rank
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-extrabold text-base truncate"
                            style={{ color: isTop ? "#1CB0F6" : "hsl(var(--duo-text))" }}
                          >
                            {entry.username}
                          </span>
                          {isCurrentUser && (
                            <span
                              className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: "#1CB0F6" }}
                            >
                              {bi("أنت", "You")}
                            </span>
                          )}
                          {isTop && (
                            <Crown className="w-4 h-4 flex-shrink-0" style={{ color: "#FFC800" }} strokeWidth={2.5} />
                          )}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                          {isArabic ? `اليوم ${entry.current_day}` : `Day ${entry.current_day}`}
                        </div>
                      </div>

                      {/* Points & Stats */}
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Star className="w-4 h-4" style={{ color: "#1CB0F6", fill: "#1CB0F6" }} />
                          <span className="font-extrabold text-lg" style={{ color: "#1CB0F6" }}>
                            {entry.weekly_points}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-semibold justify-end" style={{ color: "hsl(var(--duo-muted))" }}>
                          <Flame className="w-3 h-3" style={{ color: "#FF9600" }} strokeWidth={2.5} />
                          <span>{entry.current_streak}</span>
                          <span className="mx-1">|</span>
                          <span>{bi("الإجمالي:", "Total:")} {entry.total_points}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && leaderboard.length === 0 && (
            <div className="duo-card p-8 flex flex-col items-center text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2} />
              <p className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                {bi("لا يوجد موظفين نشطين بعد", "No active employees yet")}
              </p>
            </div>
          )}

          {/* Points Info */}
          <div className="duo-card p-4">
            <h3 className="font-extrabold mb-2 flex items-center gap-2" style={{ color: "hsl(var(--duo-text))" }}>
              <Star className="w-4 h-4" style={{ color: "#FFC800", fill: "#FFC800" }} />
              {bi("كيف تكسب النقاط؟", "How to earn points?")}
            </h3>
            <ul className="text-sm font-semibold space-y-1" style={{ color: "hsl(var(--duo-muted))" }}>
              <li>• {bi("أكمل مهمة = نقطة واحدة", "Complete a task = 1 point")}</li>
              <li>• {bi("كلمة طيبة لزميل ✓", "Kind word to colleague ✓")}</li>
              <li>• {bi("التركيز 45 دقيقة × 3 ✓", "Focus 45 min × 3 ✓")}</li>
              <li>• {bi("بدون وسائل تواصل ✓", "No social media ✓")}</li>
            </ul>
          </div>
        </div>
      </div>

      <NassBottomNav />
    </div>
  );
};

export default NassLeaderboard;

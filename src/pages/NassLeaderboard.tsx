import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionUserId } from "@/lib/session-user";
import { companyCodeQuery, nassChampionQuery, nassLeaderboardQuery } from "@/lib/queries";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { clearCompanyMode } from "@/lib/company-mode";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, Crown, Heart, PhoneOff, Target, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NassBottomNav } from "@/components/NassBottomNav";
import { RankChangeMessage, useRankChange } from "@/components/RankChangeCelebration";
import { ChampionBanner, EarnRows, LeaderboardRow, LeagueHeader } from "@/components/LeaderboardParts";

/**
 * The NASS company board. Same look and rules as the public leaderboard
 * (components/LeaderboardParts.tsx): leagues by weekly points, last week's
 * champion with the crown and the champion frame (run_weekly_rollover crowns
 * one per board), the promotion zone and the weekly reset — only NASS
 * employees on it.
 */
const NassLeaderboard = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const currentUserId = useSessionUserId();

  // Cached: a revisit paints the last board at once and refreshes it behind.
  // The membership check runs alongside it rather than before it.
  const boardQ = useQuery(nassLeaderboardQuery());
  const championQ = useQuery(nassChampionQuery());
  const codeQ = useQuery(companyCodeQuery(currentUserId));
  const leaderboard = boardQ.data ?? [];
  const champion = championQ.data ?? null;
  const loading = boardQ.isPending;

  useEffect(() => {
    if (!currentUserId) navigate("/auth");
  }, [currentUserId, navigate]);

  // Only a definite non-NASS answer sends the user back (a failed read proves
  // nothing), and it forgets company mode on this device first.
  useEffect(() => {
    if (!currentUserId || !codeQ.isSuccess || codeQ.data === "NASS") return;
    clearCompanyMode(currentUserId);
    navigate("/");
  }, [currentUserId, codeQ.isSuccess, codeQ.data, navigate]);

  // Climb / slip since the last visit to the company board, on fresh data only.
  const rankChange = useRankChange(
    "company",
    currentUserId,
    leaderboard,
    boardQ.isSuccess && !boardQ.isFetching,
    false,
  );

  const myWeekly = leaderboard.find((e) => e.user_id === currentUserId)?.weekly_points ?? 0;

  const earnRows = [
    { icon: CheckCircle2, color: "#58CC02", text: bi("أكمل مهمة = نقطة واحدة", "Complete a task = 1 point") },
    { icon: Heart, color: "#FF4B4B", text: bi("كلمة طيبة لزميل", "A kind word to a colleague") },
    { icon: Target, color: "#CE82FF", text: bi("التركيز 45 دقيقة × 3", "Focus 45 min × 3") },
    { icon: PhoneOff, color: "#FF9600", text: bi("بدون وسائل تواصل", "No social media") },
    { icon: Crown, color: "#FFC800", text: bi("أعلى نقاط الأسبوع يحصل على إطار البطل", "Highest weekly points wins the champion frame") },
    { icon: TrendingUp, color: "#1CB0F6", text: bi("تُصفَّر النقاط الأسبوعية كل أسبوع", "Weekly points reset every week") },
  ];

  return (
    <div className="duo-page min-h-screen bg-background pb-28" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate("/nass")}
            aria-label={bi("رجوع", "Back")}
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

        {/* Which board this is */}
        <div className="flex justify-center -mt-2 mb-4">
          <span
            className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-full text-[13px] font-extrabold"
            style={{ background: "#1CB0F61f", color: "#1899D6" }}
          >
            <Building2 className="w-4 h-4" strokeWidth={2.6} />
            {bi("لوحة موظفي ناس", "NASS employees")}
          </span>
        </div>

        <LeagueHeader weeklyPoints={myWeekly} isArabic={isArabic} />

        {champion && <ChampionBanner champion={champion} />}

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
            {leaderboard.map((entry, index) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                index={index}
                isCurrentUser={entry.user_id === currentUserId}
                isArabic={isArabic}
                showPromotion={entry.rank === 3 && leaderboard.length > 3}
              />
            ))}
          </div>
        )}

        {!loading && boardQ.isError && (
          <div className="rounded-xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm">
            <p className="font-bold text-destructive">
              {bi("تعذّر تحميل المتصدرين", "Failed to load leaderboard")}
            </p>
          </div>
        )}

        {!loading && !boardQ.isError && leaderboard.length === 0 && (
          <div className="duo-card p-8 flex flex-col items-center text-center mt-2">
            <Building2 className="w-10 h-10 mb-3" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2} />
            <p className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("لا يوجد موظفين نشطين بعد", "No active employees yet")}
            </p>
          </div>
        )}

        <EarnRows rows={earnRows} />
      </div>

      <NassBottomNav />
      <RankChangeMessage message={rankChange.message} onDismiss={rankChange.dismiss} />
    </div>
  );
};

export default NassLeaderboard;

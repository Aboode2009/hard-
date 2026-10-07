import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionUserId } from "@/lib/session-user";
import { leaderboardQuery } from "@/lib/queries";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Crown, CheckCircle2, TrendingUp, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/BottomNav";
import { PremiumBadge } from "@/components/PremiumGate";
import { ChampionBanner, EarnRows, LeaderboardRow, LeagueHeader } from "@/components/LeaderboardParts";
import { motion } from "framer-motion";
import { ProductTour } from "@/components/ProductTour";
import { leaderboardTourSteps, usePageTour } from "@/lib/page-tours";
import { RankChangeMessage, useRankChange } from "@/components/RankChangeCelebration";

const Leaderboard = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const currentUserId = useSessionUserId();

  // One cached read: the board, the champion and the company exclusion list are
  // fetched together. A revisit paints the last board at once.
  const boardQ = useQuery(leaderboardQuery());
  const leaderboard = boardQ.data?.entries ?? [];
  const weeklyChampion = boardQ.data?.champion ?? null;
  const loading = boardQ.isPending;
  const fetchError = boardQ.isError ? boardQ.error?.message || String(boardQ.error) : null;

  useEffect(() => {
    if (!currentUserId) navigate("/auth");
  }, [currentUserId, navigate]);

  // First visit only, once the real ranking is on screen.
  const tour = usePageTour("leaderboard", boardQ.isSuccess);
  // Climb / slip since the last visit — compared on fresh data only (not a
  // cached copy that is being refreshed), and held back until the tour is done.
  const rankChange = useRankChange(
    "individual",
    currentUserId,
    leaderboard,
    boardQ.isSuccess && !boardQ.isFetching,
    tour.pending,
  );

  const myWeekly = leaderboard.find(e => e.user_id === currentUserId)?.weekly_points ?? 0;

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

        <LeagueHeader weeklyPoints={myWeekly} isArabic={isArabic} />

        {weeklyChampion && <ChampionBanner champion={weeklyChampion} />}

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
                badge={entry.is_premium ? <PremiumBadge className="text-sm" /> : undefined}
              />
            ))}
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

        <EarnRows rows={earnRows} />
      </div>

      <BottomNav />

      <ProductTour steps={leaderboardTourSteps()} run={tour.run} onDone={tour.onDone} />
      <RankChangeMessage message={rankChange.message} onDismiss={rankChange.dismiss} />
    </div>
  );
};

export default Leaderboard;

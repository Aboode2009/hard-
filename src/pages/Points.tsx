import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { ChevronLeft, ChevronRight, Sparkles, TrendingUp, Leaf, Check } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

interface PointEntry {
  id: string;
  task_key: string;
  points_earned: number;
  completed_at: string;
}

const Points = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const navigate = useNavigate();

  const [totalPoints, setTotalPoints] = useState(0);
  const [todayPoints, setTodayPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPointsData();
  }, []);

  const fetchPointsData = async () => {
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch total points from challenge_progress
    const { data: progress } = await supabase
      .from("challenge_progress")
      .select("total_points")
      .eq("user_id", user.id)
      .maybeSingle();

    if (progress) {
      setTotalPoints(progress.total_points);
    }

    // Fetch today's points
    const today = new Date();
    const startOfToday = startOfDay(today).toISOString();
    const endOfToday = endOfDay(today).toISOString();

    const { data: todayData } = await supabase
      .from("task_completions")
      .select("points_earned")
      .eq("user_id", user.id)
      .gte("completed_at", startOfToday)
      .lte("completed_at", endOfToday);

    if (todayData) {
      const sum = todayData.reduce((acc, curr) => acc + curr.points_earned, 0);
      setTodayPoints(sum);
    }

    // Fetch all points history
    const { data: history } = await supabase
      .from("task_completions")
      .select("id, task_key, points_earned, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(100);

    if (history) {
      setPointsHistory(history);
    }

    setLoading(false);
  };

  const getTaskDisplayName = (taskKey: string) => {
    // Handle special task keys
    if (taskKey === "referral_bonus") {
      return bi("مكافأة دعوة صديق", "Referral Bonus");
    }

    // Try to get translation, fallback to formatted key
    const translated = t(`createTask.habits.${taskKey}`, taskKey);
    if (translated !== taskKey) return translated;

    // Format camelCase to readable text
    return taskKey.charAt(0).toUpperCase() + taskKey.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const groupedHistory = pointsHistory.reduce((groups, entry) => {
    const date = format(new Date(entry.completed_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, PointEntry[]>);

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={bi("rtl", "ltr")}>
      {/* Hero banner */}
      <div
        className="px-4 pt-5 pb-8 rounded-b-3xl text-white"
        style={{
          background: "hsl(var(--primary))",
          boxShadow: "0 4px 0 color-mix(in srgb, hsl(350 80% 60%) 70%, black)",
        }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="duo-card duo-press w-11 h-11 flex items-center justify-center"
              style={{ borderRadius: "1rem" }}
            >
              {isArabic ? (
                <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              ) : (
                <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              )}
            </button>
            <h1 className="text-2xl font-extrabold text-white">
              {bi("سجل نقاطك", "Points Record")}
            </h1>
            <div className="w-11" />
          </div>

          {/* Points Display */}
          <div className="flex flex-col items-center pt-2">
            <div className="relative mb-4">
              <div className="text-6xl">🍋</div>
              <Sparkles className="absolute -top-2 -left-3 w-5 h-5 animate-pulse" style={{ color: "#FFC800" }} strokeWidth={2.5} />
              <Sparkles className="absolute -top-1 -right-2 w-4 h-4 animate-pulse delay-150" style={{ color: "#FFC800" }} strokeWidth={2.5} />
              <Sparkles className="absolute bottom-0 -right-3 w-3 h-3 animate-pulse delay-300" style={{ color: "#FFC800" }} strokeWidth={2.5} />
            </div>

            <p className="text-xl font-bold mb-1">
              {bi("لديك", "You have")}
            </p>
            <p className="text-4xl font-extrabold mb-4">
              {totalPoints} {bi("نقطة", "points")}
            </p>

            <div
              className="bg-white rounded-full px-6 py-2 flex items-center gap-2"
              style={{
                color: "hsl(var(--primary))",
                boxShadow: "0 3px 0 color-mix(in srgb, hsl(350 80% 60%) 70%, black)",
              }}
            >
              <span className="text-lg">🍋</span>
              <span className="font-bold">
                {bi("اليوم", "Today")}
              </span>
              <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
              <span className="font-extrabold">{todayPoints}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Points History */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <p className="text-xs font-extrabold tracking-wider mb-2.5 px-1" style={{ color: "hsl(var(--duo-muted))" }}>
          {bi("سجل نقاطك", "Points History")}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : pointsHistory.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
              style={{ background: "hsl(var(--duo-border) / 0.5)" }}
            >
              <Leaf className="w-10 h-10" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
            </div>
            <p className="font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("لا يوجد سجل للنقاط", "No points record yet")}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(groupedHistory).map(([date, entries]) => {
              const dayTotal = entries.reduce((sum, e) => sum + e.points_earned, 0);
              const isToday = date === format(new Date(), "yyyy-MM-dd");

              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-sm font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                      {isToday
                        ? (bi("اليوم", "Today"))
                        : format(new Date(date), bi("dd/MM/yyyy", "MMM dd, yyyy"))}
                    </span>
                    <span className="text-sm font-extrabold" style={{ color: "#58CC02" }}>
                      +{dayTotal} {bi("نقطة", "pts")}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="duo-card flex items-center justify-between p-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "#58CC0222" }}
                          >
                            <Check className="w-5 h-5" style={{ color: "#58CC02" }} strokeWidth={3} />
                          </div>
                          <div>
                            <p className="font-bold text-sm" style={{ color: "hsl(var(--duo-text))" }}>
                              {getTaskDisplayName(entry.task_key)}
                            </p>
                            <p className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                              {format(new Date(entry.completed_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 font-extrabold" style={{ color: "#58CC02" }}>
                          <span>+{entry.points_earned}</span>
                          <span className="text-lg">🍋</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Points;

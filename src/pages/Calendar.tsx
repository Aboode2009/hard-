import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { WheelOfLife } from "@/components/WheelOfLife";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Flame, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayData {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isCompleted: boolean;
  isMissed: boolean;
  isFuture: boolean;
  tasksCompleted: number;
  totalTasks: number;
}

const Calendar = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [challengeData, setChallengeData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await clerkAuth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Check admin status
      const { data: adminData } = await supabase.rpc('is_admin');
      setIsAdmin(!!adminData);

      // Fetch challenge progress
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setChallengeData(progress);
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: DayData[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const challengeStart = challengeData ? new Date(challengeData.start_date) : null;
    if (challengeStart) challengeStart.setHours(0, 0, 0, 0);

    const completedDays = new Set(challengeData?.completed_days || []);

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    for (let i = startingDay - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date: dayDate,
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        isCompleted: false,
        isMissed: false,
        isFuture: true,
        tasksCompleted: 0,
        totalTasks: 0,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      dayDate.setHours(0, 0, 0, 0);

      let dayNumber = 0;
      let isCompleted = false;
      let isMissed = false;
      let isFuture = dayDate > today;

      if (challengeStart && dayDate >= challengeStart) {
        const diffTime = dayDate.getTime() - challengeStart.getTime();
        dayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        isCompleted = completedDays.has(dayNumber);
        isMissed = !isCompleted && dayDate < today && dayNumber <= (challengeData?.current_day || 0);
      }

      days.push({
        date: dayDate,
        dayNumber,
        isCurrentMonth: true,
        isToday: dayDate.getTime() === today.getTime(),
        isCompleted,
        isMissed,
        isFuture,
        tasksCompleted: isCompleted ? 8 : 0,
        totalTasks: 8,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const dayDate = new Date(year, month + 1, i);
      days.push({
        date: dayDate,
        dayNumber: 0,
        isCurrentMonth: false,
        isToday: false,
        isCompleted: false,
        isMissed: false,
        isFuture: true,
        tasksCompleted: 0,
        totalTasks: 0,
      });
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthNames = isArabic
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const dayNames = isArabic
    ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = getDaysInMonth(currentMonth);

  const stats = [
    { icon: Flame, value: challengeData?.current_streak || 0, label: t('calendar.currentStreak'), color: "#FF9600" },
    { icon: Trophy, value: challengeData?.best_streak || 0, label: t('calendar.bestStreak'), color: "#FFC800" },
    { icon: Star, value: challengeData?.total_points || 0, label: t('calendar.points'), color: "#1CB0F6" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={isArabic ? "rtl" : "ltr"}>
      <Navbar isAdmin={isAdmin} />

      <div className="container max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="duo-card p-4 text-center">
              <stat.icon className="w-6 h-6 mx-auto mb-1" style={{ color: stat.color }} strokeWidth={2.5} />
              <div className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                {stat.value}
              </div>
              <div className="text-xs font-bold" style={{ color: "hsl(var(--duo-muted))" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="duo-card p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="duo-press w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "hsl(var(--duo-surface))",
                border: "2px solid hsl(var(--duo-border))",
                boxShadow: "0 3px 0 hsl(var(--duo-edge))",
              }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            </button>
            <h2 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="duo-press w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "hsl(var(--duo-surface))",
                border: "2px solid hsl(var(--duo-border))",
                boxShadow: "0 3px 0 hsl(var(--duo-edge))",
              }}
            >
              <ChevronRight className="w-5 h-5" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-extrabold py-2" style={{ color: "hsl(var(--duo-muted))" }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isPending = day.isCurrentMonth && !day.isCompleted && !day.isMissed && !day.isFuture;
              const cellStyle: React.CSSProperties = { color: "hsl(var(--duo-text))" };
              if (day.isCompleted) {
                cellStyle.background = "#58CC02";
                cellStyle.color = "#fff";
                cellStyle.boxShadow = "0 3px 0 #45A302";
              } else if (day.isMissed) {
                cellStyle.background = "#FF4B4B1e";
                cellStyle.color = "#FF4B4B";
              } else if (day.isFuture && day.isCurrentMonth) {
                cellStyle.background = "hsl(var(--duo-border) / 0.35)";
                cellStyle.color = "hsl(var(--duo-muted))";
              }
              if (day.isToday) {
                cellStyle.border = "2px solid #1CB0F6";
              }

              return (
                <button
                  key={index}
                  onClick={() => day.isCurrentMonth && day.dayNumber > 0 && setSelectedDay(day)}
                  disabled={!day.isCurrentMonth || day.dayNumber === 0}
                  style={cellStyle}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-colors relative",
                    !day.isCurrentMonth && "opacity-30",
                    isPending && "hover:bg-muted"
                  )}
                >
                  <span className="font-bold">{day.date.getDate()}</span>
                  {day.dayNumber > 0 && (
                    <span className="text-[9px] font-bold opacity-60">D{day.dayNumber}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div
            className="flex items-center justify-center gap-4 mt-4 pt-4"
            style={{ borderTop: "2px solid hsl(var(--duo-border))" }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              <div className="w-3 h-3 rounded" style={{ background: "#58CC02", boxShadow: "0 2px 0 #45A302" }} />
              <span>{t('calendar.completed')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              <div className="w-3 h-3 rounded" style={{ background: "#FF4B4B1e", border: "1px solid #FF4B4B" }} />
              <span>{t('calendar.missed')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
              <div className="w-3 h-3 rounded" style={{ border: "2px solid #1CB0F6" }} />
              <span>{t('calendar.today')}</span>
            </div>
          </div>
        </div>

        {/* Selected Day Details */}
        {selectedDay && selectedDay.dayNumber > 0 && (
          <div className="duo-card p-4">
            <h3 className="font-extrabold mb-2" style={{ color: "hsl(var(--duo-text))" }}>
              {t('calendar.day')} {selectedDay.dayNumber}
            </h3>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
              {selectedDay.isCompleted
                ? t('calendar.dayCompletedMessage')
                : selectedDay.isMissed
                  ? t('calendar.dayMissedMessage')
                  : t('calendar.dayPendingMessage')}
            </p>
          </div>
        )}

        {/* Wheel of Life */}
        <WheelOfLife />
      </div>

      <BottomNav />
    </div>
  );
};

export default Calendar;

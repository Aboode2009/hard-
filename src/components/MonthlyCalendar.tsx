import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { MOODS } from "./MoodTracker";

interface MonthlyCalendarProps {
  startDate?: Date;
  completedDays?: Set<number>;
  currentDay?: number;
  onDateSelect?: (date: Date) => void;
}

interface MoodEntry {
  mood: string;
  entry_date: string;
}

export const MonthlyCalendar = ({
  startDate = new Date(),
  completedDays = new Set(),
  currentDay = 1,
  onDateSelect
}: MonthlyCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [moodEntries, setMoodEntries] = useState<Record<string, string>>({});
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    fetchMoodEntries();
  }, [currentMonth]);

  const fetchMoodEntries = async () => {
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from("mood_entries")
      .select("mood, entry_date")
      .eq("user_id", user.id)
      .gte("entry_date", firstDay)
      .lte("entry_date", lastDay);

    if (data) {
      const entries: Record<string, string> = {};
      data.forEach((entry: MoodEntry) => {
        entries[entry.entry_date] = entry.mood;
      });
      setMoodEntries(entries);
    }
  };

  const getMoodForDate = (date: Date): typeof MOODS[0] | null => {
    const dateStr = date.toISOString().split('T')[0];
    const moodKey = moodEntries[dateStr];
    if (!moodKey) return null;
    return MOODS.find(m => m.key === moodKey) || null;
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const challengeStart = useMemo(() => {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startDate]);

  // Days of week starting from Monday
  const dayNames = isArabic 
    ? ['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const getDaysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get day of week, adjusting so Monday = 0
    let startingDay = firstDay.getDay() - 1;
    if (startingDay < 0) startingDay = 6;
    
    const days: Array<{
      date: Date;
      dayOfMonth: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isInChallenge: boolean;
      challengeDayNumber: number;
      isCompleted: boolean;
    }> = [];

    // Previous month days
    const prevMonth = new Date(year, month, 0);
    const prevMonthDays = prevMonth.getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const dayDate = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date: dayDate,
        dayOfMonth: prevMonthDays - i,
        isCurrentMonth: false,
        isToday: false,
        isInChallenge: false,
        challengeDayNumber: 0,
        isCompleted: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      dayDate.setHours(0, 0, 0, 0);
      
      const isToday = dayDate.getTime() === today.getTime();
      
      // Calculate challenge day number
      let challengeDayNumber = 0;
      let isInChallenge = false;
      let isCompleted = false;
      
      if (dayDate >= challengeStart) {
        const diffTime = dayDate.getTime() - challengeStart.getTime();
        challengeDayNumber = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        isInChallenge = challengeDayNumber <= currentDay || dayDate <= today;
        isCompleted = completedDays.has(challengeDayNumber);
      }

      days.push({
        date: dayDate,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday,
        isInChallenge,
        challengeDayNumber,
        isCompleted,
      });
    }

    // Next month days to fill the grid (always show 6 rows = 42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const dayDate = new Date(year, month + 1, i);
      days.push({
        date: dayDate,
        dayOfMonth: i,
        isCurrentMonth: false,
        isToday: false,
        isInChallenge: false,
        challengeDayNumber: 0,
        isCompleted: false,
      });
    }

    return days;
  }, [currentMonth, today, challengeStart, completedDays, currentDay]);

  const goToPreviousMonth = () => {
    setDirection(-1);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setDirection(1);
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const formatMonthYear = () => {
    const monthNames = isArabic 
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[currentMonth.getMonth()];
    const year = currentMonth.getFullYear();
    return `${month} ${year}`;
  };

  return (
    <div className="duo-card p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-[hsl(var(--duo-border)/0.4)] rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[hsl(var(--duo-muted))]" strokeWidth={2.5} />
        </button>

        <h2 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
          {formatMonthYear()}
        </h2>

        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-[hsl(var(--duo-border)/0.4)] rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[hsl(var(--duo-muted))]" strokeWidth={2.5} />
        </button>
      </div>

      {/* Day Names Row */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day, index) => (
          <div key={index} className="text-center text-sm font-bold text-[hsl(var(--duo-muted))] py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentMonth.getMonth()}
          initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-1"
        >
          {getDaysInMonth.map((day, index) => {
            const mood = day.isCurrentMonth ? getMoodForDate(day.date) : null;
            
            return (
              <button
                key={index}
                onClick={() => day.isCurrentMonth && onDateSelect?.(day.date)}
                className={cn(
                  "relative aspect-square flex flex-col items-center justify-center rounded-full transition-all duration-200",
                  // Base styling
                  "text-sm font-medium",
                  // Not current month - faded
                  !day.isCurrentMonth && "text-[hsl(var(--duo-muted)/0.4)]",
                  // Current month normal day (no mood)
                  day.isCurrentMonth && !mood && !day.isInChallenge && "text-[hsl(var(--duo-text))] hover:bg-[hsl(var(--duo-border)/0.4)]",
                  // Challenge day - blue ring (no mood)
                  day.isCurrentMonth && !mood && day.isInChallenge && !day.isCompleted &&
                    "ring-2 ring-[#1CB0F6]/40 text-[hsl(var(--duo-text))]",
                  // Completed day - filled green (no mood)
                  day.isCurrentMonth && !mood && day.isCompleted &&
                    "bg-[#58CC02] text-white shadow-[0_3px_0_#45A302]",
                  // Has mood - show mood color
                  mood && mood.color,
                  // Today
                  day.isToday && "font-bold"
                )}
              >
                {mood ? (
                  // Show the actual mood emoji
                  <span className="emoji-ios text-[15px] leading-none">{mood.emoji}</span>
                ) : (
                  <span>{day.dayOfMonth}</span>
                )}
                {/* Today indicator dot */}
                {day.isToday && !mood && (
                  <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[hsl(var(--duo-text))]" />
                )}
                {day.isToday && mood && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[hsl(var(--duo-text))]" />
                )}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

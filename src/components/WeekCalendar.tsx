import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";

interface WeekCalendarProps {
  startDate: Date;
  currentDay: number;
  completedDays: Set<number>;
  onDayClick?: (day: number) => void;
}

export const WeekCalendar = ({
  startDate,
  currentDay,
  completedDays,
  onDayClick,
}: WeekCalendarProps) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // Get 7 days starting from start of current week view
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the start of the week containing the current day
    const challengeStartDate = new Date(startDate);
    challengeStartDate.setHours(0, 0, 0, 0);
    
    // Find the beginning of the current 7-day period
    const daysSinceStart = Math.floor((today.getTime() - challengeStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(daysSinceStart / 7);
    const weekStartOffset = weekNumber * 7;
    
    for (let i = 0; i < 7; i++) {
      const dayNumber = weekStartOffset + i + 1;
      const date = new Date(challengeStartDate);
      date.setDate(date.getDate() + weekStartOffset + i);
      
      const isCompleted = completedDays.has(dayNumber);
      const isCurrent = dayNumber === currentDay;
      const isPast = dayNumber < currentDay;
      const isFuture = dayNumber > currentDay;

      days.push({
        dayNumber,
        date,
        isCompleted,
        isCurrent,
        isPast,
        isFuture,
      });
    }
    
    return days;
  };

  const weekDays = getWeekDays();

  const getDayName = (date: Date) => {
    const dayNames = isArabic 
      ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  };

  return (
    <div className="duo-card p-4">
      <div className="flex items-center justify-between gap-1">
        {weekDays.map((day) => (
          <button
            key={day.dayNumber}
            onClick={() => onDayClick?.(day.dayNumber)}
            disabled={day.isFuture}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all",
              day.isCurrent && "bg-[#1CB0F61e]",
              day.isCompleted && !day.isCurrent && "bg-[hsl(var(--duo-accent)/0.12)]",
              day.isPast && !day.isCompleted && "bg-[#FF4B4B1e]",
              day.isFuture && "opacity-50",
              !day.isFuture && "hover:bg-[hsl(var(--duo-border)/0.4)] cursor-pointer"
            )}
          >
            {/* Day Name */}
            <span className="text-[10px] text-[hsl(var(--duo-muted))] font-bold">
              {getDayName(day.date)}
            </span>

            {/* Day Number Circle */}
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-colors",
              day.isCurrent && "border-2 border-[#1CB0F6] bg-[hsl(var(--duo-surface))] text-[#1CB0F6]",
              day.isCompleted && !day.isCurrent && "bg-[hsl(var(--duo-accent))] text-white shadow-[0_3px_0_hsl(var(--duo-accent-edge))]",
              day.isPast && !day.isCompleted && "bg-[#FF4B4B1e] text-[#FF4B4B]",
              day.isFuture && "border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] text-[hsl(var(--duo-muted))]"
            )}>
              {day.isCompleted ? (
                <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
              ) : (
                day.dayNumber
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

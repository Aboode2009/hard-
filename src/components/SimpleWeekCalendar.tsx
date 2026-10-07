import { useState, useRef } from "react";
import { bi } from "@/i18n/bi";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { addDays, subDays, startOfWeek, isSameDay, format, isSameWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useAnimation, PanInfo } from "framer-motion";

interface SimpleWeekCalendarProps {
  selectedDate: Date;
  onDateSelect?: (date: Date) => void;
  completedDates?: Set<string>;
}

export const SimpleWeekCalendar = ({
  selectedDate,
  onDateSelect,
  completedDates = new Set(),
}: SimpleWeekCalendarProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const today = new Date();
  const [centerDate, setCenterDate] = useState(() => today);
  const controls = useAnimation();
  
  // Generate 7 days centered around centerDate (3 before, center, 3 after)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(centerDate, i - 3));
  
  const dayNames = isArabic 
    ? ['س', 'أ', 'إ', 'ث', 'أر', 'خ', 'ج']
    : ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];

  const getDayName = (date: Date) => {
    const dayIndex = date.getDay();
    // Convert from Sunday=0 to Saturday=0
    const adjustedIndex = dayIndex === 6 ? 0 : dayIndex + 1;
    return dayNames[adjustedIndex];
  };

  const goToPreviousDay = () => {
    controls.start({ x: [0, 30, 0], transition: { duration: 0.15 } });
    setCenterDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    controls.start({ x: [0, -30, 0], transition: { duration: 0.15 } });
    setCenterDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setCenterDate(today);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 30;
    const swipeDirection = isArabic ? -1 : 1;
    
    if (info.offset.x * swipeDirection > threshold) {
      goToPreviousDay();
    } else if (info.offset.x * swipeDirection < -threshold) {
      goToNextDay();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 15) {
        goToNextDay();
      } else if (e.deltaX < -15) {
        goToPreviousDay();
      }
    }
  };

  const isToday = isSameDay(centerDate, today);
  const monthYear = format(centerDate, bi("MMMM yyyy", "MMM yyyy"));

  return (
    <div 
      className="py-3 select-none"
      onWheel={handleWheel}
    >
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          className="duo-card duo-press h-9 w-9 flex items-center justify-center"
          onClick={goToPreviousDay}
        >
          <ChevronLeft className="h-4 w-4" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
        </button>
        
        <button 
          onClick={goToToday}
          className={cn(
            "duo-press text-sm font-bold px-4 py-1.5 rounded-xl border-2",
            isToday
              ? "text-[#1CB0F6] border-[#1CB0F6] bg-[#1CB0F61e] shadow-[0_3px_0_#0F8ED9]"
              : "text-[hsl(var(--duo-muted))] border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] shadow-[0_3px_0_hsl(var(--duo-edge))]"
          )}
        >
          {monthYear}
          {!isToday && (
            <span className="text-xs ml-1 text-[#1CB0F6] font-bold">
              ({bi("اليوم", "Today")})
            </span>
          )}
        </button>
        
        <button
          className="duo-card duo-press h-9 w-9 flex items-center justify-center"
          onClick={goToNextDay}
        >
          <ChevronRight className="h-4 w-4" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
        </button>
      </div>

      {/* Week Days - Swipeable */}
      <motion.div 
        className="flex justify-between items-center px-1 cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={controls}
      >
        {weekDays.map((date, index) => {
          const isTodayDate = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const isCenter = index === 3;
          const dateKey = format(date, 'yyyy-MM-dd');
          const isCompleted = completedDates.has(dateKey);
          
          return (
            <button
              key={`${centerDate.getTime()}-${index}`}
              onClick={() => onDateSelect?.(date)}
              className="flex flex-col items-center gap-1.5 group outline-none"
            >
              <span className={cn(
                "text-xs font-bold uppercase",
                isTodayDate ? "text-[#1CB0F6]" : "text-[hsl(var(--duo-muted))]"
              )}>
                {getDayName(date)}
              </span>

              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-75",
                "group-active:translate-y-[2px]",
                isTodayDate
                  ? "border-2 border-[#1CB0F6] bg-[#1CB0F61e] text-[#1CB0F6] shadow-[0_3px_0_hsl(var(--duo-edge))]"
                  : isCompleted
                    ? "bg-[hsl(var(--duo-accent))] text-white shadow-[0_3px_0_hsl(var(--duo-accent-edge))]"
                    : isSelected
                      ? "border-2 border-[#1CB0F6] bg-[hsl(var(--duo-surface))] text-[#1CB0F6] shadow-[0_3px_0_hsl(var(--duo-edge))]"
                      : "border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] text-[hsl(var(--duo-text))] shadow-[0_3px_0_hsl(var(--duo-edge))]"
              )}>
                {date.getDate()}
              </div>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
};

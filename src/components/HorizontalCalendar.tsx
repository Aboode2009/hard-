import { useState, useRef, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { format, addDays, subDays, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, CheckCircle2, X, Flame, Target, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DayStats {
  tasksCompleted: number;
  totalTasks: number;
  points: number;
  isCompleted: boolean;
}

interface HorizontalCalendarProps {
  startDate: Date;
  currentChallengeDay: number;
  completedDays: Set<number>;
  totalTasks: number;
  onDaySelect?: (date: Date, challengeDay: number) => void;
  tasksState?: Record<string, Record<string, boolean>>;
}

export const HorizontalCalendar = ({
  startDate,
  currentChallengeDay,
  completedDays,
  totalTasks,
  onDaySelect,
  tasksState = {},
}: HorizontalCalendarProps) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showStats, setShowStats] = useState(false);
  const [selectedStats, setSelectedStats] = useState<DayStats | null>(null);
  const [centerDate, setCenterDate] = useState<Date>(new Date());
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Generate days array centered around the centerDate
  const generateDays = (center: Date, range: number = 15) => {
    const days: Date[] = [];
    for (let i = -range; i <= range; i++) {
      days.push(addDays(center, i));
    }
    return days;
  };

  const [days, setDays] = useState<Date[]>(() => generateDays(new Date()));

  // Calculate challenge day for a given date
  const getChallengeDayForDate = (date: Date): number => {
    const challengeStart = startOfDay(new Date(startDate));
    const targetDate = startOfDay(date);
    const diffTime = targetDate.getTime() - challengeStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  // Get stats for a specific day
  const getDayStats = (date: Date): DayStats => {
    const challengeDay = getChallengeDayForDate(date);
    const dayKey = `day_${challengeDay}`;
    const dayTasks = tasksState[dayKey] || {};
    const completedCount = Object.values(dayTasks).filter(Boolean).length;
    const isCompleted = completedDays.has(challengeDay);
    
    return {
      tasksCompleted: completedCount,
      totalTasks: totalTasks,
      points: completedCount * 10 + (isCompleted ? 50 : 0),
      isCompleted,
    };
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    const challengeDay = getChallengeDayForDate(date);
    const today = startOfDay(new Date());
    const clickedDate = startOfDay(date);
    
    // Only allow clicking on past or current days within the challenge
    if (challengeDay < 1 || clickedDate > today) return;
    
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
    
    setSelectedDate(date);
    const stats = getDayStats(date);
    setSelectedStats(stats);
    setShowStats(true);
    onDaySelect?.(date, challengeDay);
  };

  // Scroll handlers for infinite scroll effect
  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    
    // Load more days when near the edges
    if (scrollLeft < 100) {
      const newCenter = subDays(centerDate, 10);
      setCenterDate(newCenter);
      setDays(generateDays(newCenter));
    } else if (scrollLeft > scrollWidth - clientWidth - 100) {
      const newCenter = addDays(centerDate, 10);
      setCenterDate(newCenter);
      setDays(generateDays(newCenter));
    }
  };

  // Scroll left/right buttons
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Center on today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      const scrollPosition = (scrollRef.current.scrollWidth - containerWidth) / 2;
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, []);

  const getDayName = (date: Date) => {
    const dayNames = isArabic 
      ? ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames[date.getDay()];
  };

  const getMonthName = (date: Date) => {
    const monthNames = isArabic
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[date.getMonth()];
  };

  const today = startOfDay(new Date());
  const challengeStartDate = startOfDay(new Date(startDate));

  return (
    <>
      {/* Transition Effect Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#1CB0F6] animate-pulse" />
        </div>
      )}

      <div className="duo-card overflow-hidden">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[hsl(var(--duo-border))]">
          <button
            onClick={scrollLeft}
            className="p-1.5 rounded-full hover:bg-[hsl(var(--duo-border)/0.4)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[hsl(var(--duo-muted))]" strokeWidth={2.5} />
          </button>

          <div className="text-center">
            <span className="text-sm font-bold text-[hsl(var(--duo-text))]">
              {getMonthName(centerDate)} {centerDate.getFullYear()}
            </span>
          </div>

          <button
            onClick={scrollRight}
            className="p-1.5 rounded-full hover:bg-[hsl(var(--duo-border)/0.4)] transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[hsl(var(--duo-muted))]" strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Days */}
        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto scrollbar-hide py-4 px-2 gap-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map((date, index) => {
            const challengeDay = getChallengeDayForDate(date);
            const isToday = isSameDay(date, today);
            const isPast = date < today && challengeDay >= 1;
            const isFuture = date > today;
            const isBeforeChallenge = challengeDay < 1;
            const isCompleted = completedDays.has(challengeDay);
            const isSelected = isSameDay(date, selectedDate);
            const isMissed = isPast && !isCompleted && challengeDay >= 1 && challengeDay < currentChallengeDay;

            return (
              <button
                key={index}
                onClick={() => handleDayClick(date)}
                disabled={isFuture || isBeforeChallenge}
                className={cn(
                  "flex flex-col items-center min-w-[52px] py-2 px-3 rounded-xl transition-all duration-200",
                  isToday && "border-2 border-[#1CB0F6]",
                  isSelected && !isToday && "bg-[#1CB0F61e]",
                  isCompleted && "bg-[#58CC021e]",
                  isMissed && "bg-[#FF4B4B1e]",
                  (isFuture || isBeforeChallenge) && "opacity-40",
                  !isFuture && !isBeforeChallenge && "hover:bg-[hsl(var(--duo-border)/0.4)] cursor-pointer hover:scale-105 active:scale-95"
                )}
              >
                {/* Day Name */}
                <span className={cn(
                  "text-[10px] font-bold mb-1",
                  isToday ? "text-[#1CB0F6]" : "text-[hsl(var(--duo-muted))]"
                )}>
                  {getDayName(date)}
                </span>

                {/* Date Number */}
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                  isToday && "border-2 border-[#1CB0F6] bg-[#1CB0F61e] text-[#1CB0F6]",
                  isCompleted && !isToday && "bg-[#58CC02] text-white shadow-[0_3px_0_#45A302]",
                  isMissed && "bg-[#FF4B4B1e] text-[#FF4B4B]",
                  !isToday && !isCompleted && !isMissed && "border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] text-[hsl(var(--duo-text))]"
                )}>
                  {isCompleted && !isToday ? (
                    <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                  ) : isMissed ? (
                    <X className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                    date.getDate()
                  )}
                </div>

                {/* Challenge Day Number */}
                {challengeDay >= 1 && challengeDay <= 75 && (
                  <span className={cn(
                    "text-[9px] mt-1",
                    isToday ? "text-[#1CB0F6] font-bold" : "text-[hsl(var(--duo-muted))]"
                  )}>
                    {isArabic ? `ي${challengeDay}` : `D${challengeDay}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStats && (
            <div className="space-y-4 py-4">
              {/* Completion Status */}
              <div className={cn(
                "text-center py-4 rounded-2xl border-2",
                selectedStats.isCompleted
                  ? "bg-[#58CC021e] border-[#58CC02]"
                  : "bg-[hsl(var(--duo-surface))] border-[hsl(var(--duo-border))]"
              )}>
                {selectedStats.isCompleted ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-12 h-12 text-[#58CC02]" strokeWidth={2.5} />
                    <span className="font-bold text-[#58CC02]">
                      {bi("يوم مكتمل!", "Day Completed!")}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Target className="w-12 h-12 text-[hsl(var(--duo-muted))]" strokeWidth={2.5} />
                    <span className="font-bold text-[hsl(var(--duo-muted))]">
                      {bi("لم يكتمل", "Not Completed")}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] p-3 text-center">
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-[#1CB0F6]" strokeWidth={2.5} />
                  <div className="text-lg font-bold text-[hsl(var(--duo-text))]">
                    {selectedStats.tasksCompleted}/{selectedStats.totalTasks}
                  </div>
                  <div className="text-[10px] font-bold text-[hsl(var(--duo-muted))]">
                    {bi("المهام", "Tasks")}
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] p-3 text-center">
                  <Flame className="w-5 h-5 mx-auto mb-1 text-[#FF9600]" strokeWidth={2.5} />
                  <div className="text-lg font-bold text-[hsl(var(--duo-text))]">
                    {selectedStats.points}
                  </div>
                  <div className="text-[10px] font-bold text-[hsl(var(--duo-muted))]">
                    {bi("النقاط", "Points")}
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] p-3 text-center">
                  <TrendingUp className="w-5 h-5 mx-auto mb-1 text-[#58CC02]" strokeWidth={2.5} />
                  <div className="text-lg font-bold text-[hsl(var(--duo-text))]">
                    {Math.round((selectedStats.tasksCompleted / selectedStats.totalTasks) * 100)}%
                  </div>
                  <div className="text-[10px] font-bold text-[hsl(var(--duo-muted))]">
                    {bi("الإنجاز", "Progress")}
                  </div>
                </div>
              </div>

              {/* Challenge Day */}
              <div className="text-center text-sm font-bold text-[hsl(var(--duo-muted))]">
                {bi("اليوم", "Challenge Day")} {getChallengeDayForDate(selectedDate)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

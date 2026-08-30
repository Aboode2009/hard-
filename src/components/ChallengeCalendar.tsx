import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Calendar as CalendarIcon, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChallengeCalendarProps {
  startDate: Date;
  currentDay: number;
  totalDays: number;
  completedDays: Set<number>;
}

export const ChallengeCalendar = ({ startDate, currentDay, totalDays, completedDays }: ChallengeCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  
  // حساب تاريخ اليوم الحالي في التحدي
  const getDayNumberFromDate = (date: Date) => {
    const diffTime = date.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };
  
  // التحقق من حالة اليوم
  const getDayStatus = (date: Date) => {
    const dayNumber = getDayNumberFromDate(date);
    
    if (dayNumber < 1 || dayNumber > totalDays) return "none";
    if (completedDays.has(dayNumber)) return "completed";
    if (dayNumber === currentDay) return "current";
    if (dayNumber < currentDay) return "missed";
    return "upcoming";
  };
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate_calendar = startOfWeek(monthStart, { weekStartsOn: 6 }); // السبت
  const endDate_calendar = endOfWeek(monthEnd, { weekStartsOn: 6 });
  
  const days = eachDayOfInterval({ start: startDate_calendar, end: endDate_calendar });
  const weekDays = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
  
  const getDayStyles = (status: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return "text-[hsl(var(--duo-muted)/0.4)] text-[10px]";

    switch (status) {
      case "completed":
        return "bg-[#58CC02] text-white shadow-[0_3px_0_#45A302] text-[10px] font-bold";
      case "current":
        return "border-2 border-[#1CB0F6] bg-[#1CB0F61e] text-[#1CB0F6] text-[10px] font-bold";
      case "missed":
        return "bg-[#FF4B4B1e] text-[#FF4B4B] text-[10px]";
      case "upcoming":
        return "text-[hsl(var(--duo-text))] text-[10px]";
      default:
        return "text-[hsl(var(--duo-text))] text-[10px]";
    }
  };

  return (
    <>
      {/* زر فتح التقويم */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="duo-press fixed bottom-6 left-6 w-14 h-14 rounded-full z-50 text-white bg-[#1CB0F6] hover:bg-[#1CB0F6] shadow-[0_3px_0_#0F8ED9]"
        >
          <CalendarIcon className="w-6 h-6" strokeWidth={2.5} />
        </Button>
      )}

      {/* التقويم المصغر */}
      {isOpen && (
        <div className="duo-card fixed bottom-6 left-6 w-80 z-50 animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b-2 border-[hsl(var(--duo-border))]">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              </Button>

              <span className="text-sm font-bold" style={{ color: "hsl(var(--duo-text))" }}>
                {format(currentMonth, "MMMM yyyy", { locale: ar })}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              </Button>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
            </Button>
          </div>

          <div className="p-3">
            {/* أيام الأسبوع */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-[10px] font-bold text-[hsl(var(--duo-muted))]">
                  {day}
                </div>
              ))}
            </div>

            {/* الأيام */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const status = getDayStatus(day);
                
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded transition-all",
                      getDayStyles(status, isCurrentMonth)
                    )}
                  >
                    {format(day, "d")}
                  </div>
                );
              })}
            </div>

            {/* معلومات التحدي */}
            <div className="mt-3 pt-3 border-t-2 border-[hsl(var(--duo-border))]">
              <div className="text-xs font-bold text-[hsl(var(--duo-muted))] text-center">
                بدأت في {format(startDate, "d MMM yyyy", { locale: ar })}
              </div>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#58CC02]"></div>
                  <span className="text-[10px] font-bold text-[hsl(var(--duo-muted))]">مكتمل</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#1CB0F6]"></div>
                  <span className="text-[10px] font-bold text-[hsl(var(--duo-muted))]">حالي</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-[#FF4B4B1e]"></div>
                  <span className="text-[10px] font-bold text-[hsl(var(--duo-muted))]">فائت</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

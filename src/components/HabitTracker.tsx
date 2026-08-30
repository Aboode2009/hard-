import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { ChevronLeft, ChevronRight, Dumbbell, Moon, Droplets, BookOpen, Salad, Snowflake, CheckSquare, Users, MessageCircle, Megaphone, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";

interface TaskCompletion {
  task_key: string;
  completed_at: string;
}

const TASK_DEFINITIONS = [
  { key: "sport", icon: Dumbbell, color: "bg-[#FF9600]" },
  { key: "sleep", icon: Moon, color: "bg-[#CE82FF]" },
  { key: "water", icon: Droplets, color: "bg-[#1CB0F6]" },
  { key: "reading", icon: BookOpen, color: "bg-[#FFC800]" },
  { key: "noSugar", icon: Salad, color: "bg-[#58CC02]" },
  { key: "coldShower", icon: Snowflake, color: "bg-[#1CB0F6]" },
  { key: "dailyTask", icon: CheckSquare, color: "bg-[#58CC02]" },
  { key: "communityService", icon: Users, color: "bg-[#FFC800]" },
  { key: "talkToStranger", icon: MessageCircle, color: "bg-[#CE82FF]" },
  { key: "makeDawa", icon: Megaphone, color: "bg-[#FF9600]" },
];

export const HabitTracker = () => {
  const { t } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageLevel, setStageLevel] = useState(1);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  useEffect(() => {
    fetchCompletions();
  }, [currentWeekStart]);

  const fetchCompletions = async () => {
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) return;

    // Fetch stage level
    const { data: progress } = await supabase
      .from("challenge_progress")
      .select("stage_level")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    
    if (progress) {
      setStageLevel(progress.stage_level || 1);
    }

    // Fetch completions for the week
    const { data } = await supabase
      .from("task_completions")
      .select("task_key, completed_at")
      .eq("user_id", user.id)
      .gte("completed_at", currentWeekStart.toISOString())
      .lte("completed_at", weekEnd.toISOString());

    setCompletions(data || []);
    setLoading(false);
  };

  const getTasksForStage = () => {
    if (stageLevel === 1) return TASK_DEFINITIONS.slice(0, 8);
    if (stageLevel === 2) return TASK_DEFINITIONS.slice(0, 11);
    return TASK_DEFINITIONS;
  };

  const isTaskCompleted = (taskKey: string, day: Date) => {
    return completions.some(c => 
      c.task_key === taskKey && isSameDay(new Date(c.completed_at), day)
    );
  };

  const getTaskCompletionCount = (taskKey: string) => {
    return weekDays.filter(day => isTaskCompleted(taskKey, day)).length;
  };

  const isPerfectWeek = (taskKey: string) => {
    return getTaskCompletionCount(taskKey) === 7;
  };

  const tasks = getTasksForStage();
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="duo-card p-4">
      {/* Header */}
      <h2 className="text-lg font-extrabold mb-4 text-center" style={{ color: "hsl(var(--duo-text))" }}>
        {t("overall.habitTracker", "Habit Tracker")}
      </h2>

      {/* Week Navigation */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          className="h-8 w-8 rounded-full bg-[#1CB0F61e] text-[#1CB0F6]"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </Button>
        <span className="text-sm font-bold italic" style={{ color: "hsl(var(--duo-text))" }}>
          {format(currentWeekStart, "dd/MM")}~{format(weekEnd, "dd/MM")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          className="h-8 w-8 rounded-full bg-[#1CB0F61e] text-[#1CB0F6]"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1CB0F6]"></div>
        </div>
      ) : (
        <>
          {/* Grid Header */}
          <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_1fr))_auto] gap-1 mb-2">
            <div></div>
            {dayLabels.map((day, i) => (
              <div key={i} className="text-center text-xs font-bold text-[hsl(var(--duo-muted))] bg-[hsl(var(--duo-border)/0.4)] rounded-full py-1">
                {day}
              </div>
            ))}
            <div></div>
          </div>

          {/* Task Rows */}
          <div className="space-y-2">
            {tasks.map((task) => {
              const Icon = task.icon;
              const perfect = isPerfectWeek(task.key);
              
              return (
                <div key={task.key} className="grid grid-cols-[1fr_repeat(7,_minmax(0,_1fr))_auto] gap-1 items-center">
                  {/* Task Name */}
                  <div className="flex items-center gap-1">
                    <Icon className="w-4 h-4 text-[hsl(var(--duo-muted))]" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-[hsl(var(--duo-text))] truncate">
                      {t(`tasks.${task.key}.title`, task.key).replace(/^[^\s]+\s/, "")}
                    </span>
                  </div>
                  
                  {/* Day Cells */}
                  {weekDays.map((day, dayIndex) => {
                    const completed = isTaskCompleted(task.key, day);
                    return (
                      <div
                        key={dayIndex}
                        className={`aspect-square rounded-md transition-all ${
                          completed
                            ? task.color
                            : "bg-[hsl(var(--duo-border)/0.3)]"
                        }`}
                      />
                    );
                  })}
                  
                  {/* Perfect Badge */}
                  <div className="w-6 flex justify-center">
                    {perfect && (
                      <Award className="w-4 h-4 text-[#FFC800]" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best Day Row */}
          <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_1fr))_auto] gap-1 items-center mt-3 pt-3 border-t-2 border-[hsl(var(--duo-border))]">
            <span className="text-xs font-bold text-[#D9A800] bg-[#FFC8001e] rounded px-1 py-0.5">
              {t("overall.bestDay", "BestDay")}
            </span>
            {weekDays.map((day, dayIndex) => {
              const dayCompletions = tasks.filter(task => isTaskCompleted(task.key, day)).length;
              const isPerfect = dayCompletions === tasks.length;
              return (
                <div key={dayIndex} className="flex justify-center">
                  {isPerfect && (
                    <Award className="w-4 h-4 text-[#FFC800]" strokeWidth={2.5} />
                  )}
                </div>
              );
            })}
            <div></div>
          </div>
        </>
      )}
    </div>
  );
};

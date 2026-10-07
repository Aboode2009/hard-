import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSessionUserId } from "@/lib/session-user";
import { progressQuery } from "@/lib/queries";
import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Dumbbell, Moon, Droplets, BookOpen, Salad, Snowflake, CheckSquare, MessageCircle, Megaphone, Award, ListChecks, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";

interface TaskCompletion {
  task_key: string;
  completed_at: string;
}

interface TrackerRow {
  /** Unique per row (React key). */
  id: string;
  /** Matches `task_completions.task_key`. */
  key: string;
  label: string;
  icon: LucideIcon;
  /** Fill colour of a completed day. */
  color: string;
}

/** The built-in tasks, by the key `complete_task` records. */
const PATH_TASKS: Record<string, { icon: LucideIcon; color: string }> = {
  sport: { icon: Dumbbell, color: "#FF9600" },
  sleep: { icon: Moon, color: "#CE82FF" },
  water: { icon: Droplets, color: "#1CB0F6" },
  reading: { icon: BookOpen, color: "#FFC800" },
  noSugar: { icon: Salad, color: "#58CC02" },
  coldShower: { icon: Snowflake, color: "#1CB0F6" },
  dailyTask: { icon: CheckSquare, color: "#58CC02" },
  communityService: { icon: CheckSquare, color: "#FFC800" },
  talkToStranger: { icon: MessageCircle, color: "#CE82FF" },
  makeDawa: { icon: Megaphone, color: "#FF9600" },
};

/**
 * Which built-in tasks each stage (path) has — the same lists the home screen
 * shows (stage1Tasks / stage2Tasks / stage3Tasks in pages/Index.tsx). Showing
 * more than the path has filled the tracker with rows that can never be done.
 */
const STAGE_TASKS: Record<number, string[]> = {
  1: ["sport", "sleep", "water", "reading", "noSugar"],
  2: ["sport", "sleep", "water", "reading", "noSugar", "coldShower", "dailyTask", "communityService"],
  3: ["sport", "sleep", "water", "reading", "noSugar", "coldShower", "dailyTask", "talkToStranger", "makeDawa"],
};

/** Colours for the user's own tasks when their life-area tag has none. */
const CUSTOM_COLORS = ["#FF4B4B", "#2B70C9", "#FF86D0", "#00CD9C", "#A560D9", "#E5A000"];

/** Monday-first, like the week itself. */
const DAY_LABELS: [string, string][] = [
  ["ن", "M"], ["ث", "T"], ["ر", "W"], ["خ", "T"], ["ج", "F"], ["س", "S"], ["ح", "S"],
];

/**
 * One grid for the whole tracker: a fixed-width name column, seven equal day
 * columns and a badge column. Each row used to size its own name column, so a
 * row with a longer name got smaller day circles than its neighbours.
 */
const GRID = "grid grid-cols-[7.5rem_repeat(7,minmax(0,1fr))_1.25rem] gap-1 items-center";

export const HabitTracker = () => {
  const { t } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const uid = useSessionUserId();
  // The stage comes from the same cached progress row Overall already reads,
  // and each week's completions are cached per week — no auth round trip and
  // no second progress read on every visit.
  const { data: progress } = useQuery(progressQuery(uid));
  const stageLevel = (progress?.is_active && progress.stage_level) || 1;
  const { data: completions = [], isPending: loading } = useQuery({
    queryKey: ["habit-week", uid, currentWeekStart.toISOString()],
    enabled: !!uid,
    queryFn: async (): Promise<TaskCompletion[]> => {
      const { data, error } = await supabase
        .from("task_completions")
        .select("task_key, completed_at")
        .eq("user_id", uid!)
        .gte("completed_at", currentWeekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  // The user's own active tasks. Tasks are added from several screens, so
  // rather than each of them invalidating this, it is re-read whenever the
  // stats screen opens (staleTime 0) — the cached list paints at once and a
  // task added a moment ago joins it as soon as the read returns.
  const { data: customTasks = [] } = useQuery({
    queryKey: ["habit-custom-tasks", uid],
    enabled: !!uid,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_tasks")
        .select("id, title, created_at, life_area_tags(color)")
        .eq("user_id", uid!)
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows: TrackerRow[] = [
    ...(STAGE_TASKS[stageLevel] ?? STAGE_TASKS[1]).map((key) => ({
      id: key,
      key,
      label: t(`tasks.${key}.title`, key),
      ...PATH_TASKS[key],
    })),
    // complete_custom_task records a custom task's completion under its title.
    ...customTasks.map((task, i) => ({
      id: `custom:${task.id}`,
      key: task.title,
      label: task.title,
      icon: ListChecks,
      color: task.life_area_tags?.color || CUSTOM_COLORS[i % CUSTOM_COLORS.length],
    })),
  ];

  const isTaskCompleted = (taskKey: string, day: Date) =>
    completions.some((c) => c.task_key === taskKey && isSameDay(new Date(c.completed_at), day));

  const isPerfectWeek = (taskKey: string) =>
    weekDays.every((day) => isTaskCompleted(taskKey, day));

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
          aria-label={bi("الأسبوع السابق", "Previous week")}
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
        </Button>
        <span className="text-sm font-bold" style={{ color: "hsl(var(--duo-text))" }} dir="ltr">
          {format(currentWeekStart, "dd/MM")} – {format(weekEnd, "dd/MM")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          className="h-8 w-8 rounded-full bg-[#1CB0F61e] text-[#1CB0F6]"
          aria-label={bi("الأسبوع التالي", "Next week")}
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
          <div className={`${GRID} mb-2`}>
            <div></div>
            {DAY_LABELS.map(([ar, en], i) => (
              <div key={i} className="text-center text-xs font-bold text-[hsl(var(--duo-muted))] bg-[hsl(var(--duo-border)/0.4)] rounded-full py-1">
                {bi(ar, en)}
              </div>
            ))}
            <div></div>
          </div>

          {/* Task Rows */}
          <div className="space-y-2">
            {rows.map((task) => {
              const Icon = task.icon;
              const perfect = isPerfectWeek(task.key);

              return (
                <div key={task.id} className={GRID}>
                  {/* Task Name */}
                  <div className="flex items-center gap-1 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 text-[hsl(var(--duo-muted))]" strokeWidth={2.5} />
                    {/* Up to two lines: the task names are long ("تمرين صباحي 45 دقيقة"). */}
                    <span className="text-xs font-bold leading-tight text-[hsl(var(--duo-text))] line-clamp-2" title={task.label}>
                      {task.label}
                    </span>
                  </div>

                  {/* Day Cells */}
                  {weekDays.map((day, dayIndex) => {
                    const completed = isTaskCompleted(task.key, day);
                    return (
                      <div
                        key={dayIndex}
                        className="aspect-square w-full rounded-full transition-colors"
                        style={{ background: completed ? task.color : "hsl(var(--duo-border) / 0.35)" }}
                      />
                    );
                  })}

                  {/* Perfect Badge */}
                  <div className="flex justify-center">
                    {perfect && (
                      <Award className="w-4 h-4 text-[#FFC800]" strokeWidth={2.5} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Best Day Row */}
          <div className={`${GRID} mt-3 pt-3 border-t-2 border-[hsl(var(--duo-border))]`}>
            <span className="text-xs font-bold text-[#D9A800] bg-[#FFC8001e] rounded px-1 py-0.5 truncate">
              {t("overall.bestDay", "BestDay")}
            </span>
            {weekDays.map((day, dayIndex) => {
              const dayCompletions = rows.filter((task) => isTaskCompleted(task.key, day)).length;
              const isPerfect = rows.length > 0 && dayCompletions === rows.length;
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

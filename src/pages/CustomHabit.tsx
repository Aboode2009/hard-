import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker } from "@/components/EmojiPicker";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGate } from "@/components/PremiumGate";
import { isPremiumRequiredError } from "@/lib/premium";

const PRESET_COLORS = [
  "#14b8a6", // teal (primary from screenshots)
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#ec4899", // pink
];

const TIME_RANGES = ["anytime", "morning", "afternoon", "evening"] as const;
const GOAL_PERIODS = ["daily", "weekly", "monthly"] as const;
const TASK_DAYS_OPTIONS = ["everyday", "weekdays", "weekends", "custom"] as const;

const CustomHabit = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const navigate = useNavigate();
  const { toast } = useToast();

  // Building your own tasks is a subscriber feature; the server is the source
  // of truth via is_premium_active.
  const { isPremium, loading: premiumLoading } = usePremium();

  const [title, setTitle] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("⭐");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState("#14b8a6");
  const [habitType, setHabitType] = useState<"build" | "quit">("build");
  const [goalPeriod, setGoalPeriod] = useState<typeof GOAL_PERIODS[number]>("daily");
  const [goalValue, setGoalValue] = useState(1);
  const [goalUnit, setGoalUnit] = useState("count");
  const [taskDays, setTaskDays] = useState<typeof TASK_DAYS_OPTIONS[number]>("everyday");
  const [timeRange, setTimeRange] = useState<typeof TIME_RANGES[number]>("anytime");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [showMemo, setShowMemo] = useState(true);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        variant: "destructive",
        title: bi("الاسم مطلوب", "Name is required"),
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ 
        title: bi("خطأ", "Error"), 
        description: bi("يرجى تسجيل الدخول أولاً", "Please login first"), 
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("custom_tasks")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: selectedEmoji,
        });

      if (error) throw error;

      // Store additional settings in localStorage
      const { data: newTask } = await supabase
        .from("custom_tasks")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", title.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (newTask) {
        const customSettings = JSON.parse(localStorage.getItem(`custom_settings_${user.id}`) || '{}');
        customSettings[newTask.id] = {
          color: selectedColor,
          habitType,
          goalPeriod,
          goalValue,
          goalUnit,
          taskDays,
          timeRange,
          reminderEnabled,
          reminderTime: reminderEnabled ? reminderTime : null,
          showMemo,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString() || null,
        };
        localStorage.setItem(`custom_settings_${user.id}`, JSON.stringify(customSettings));
      }

      toast({
        title: bi("تمت الإضافة!", "Task Added!"),
        description: bi("تمت إضافة المهمة بنجاح", "Your custom task has been created"),
      });

      navigate(-1);
    } catch (error) {
      console.error('Error:', error);
      toast(
        isPremiumRequiredError(error)
          ? {
              variant: "destructive",
              title: bi("للمشتركين فقط", "Subscribers only"),
              description: bi("إضافة المهام متاحة لمشتركي بريميوم.", "Adding tasks is available with Premium."),
            }
          : { variant: "destructive", title: bi("خطأ", "Error") },
      );
    } finally {
      setSaving(false);
    }
  };

  const duoPopover =
    "duo-page rounded-[1.25rem] border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] shadow-[0_4px_0_hsl(var(--duo-edge))]";

  const chipActive = (face: string, edge: string): React.CSSProperties => ({
    background: face,
    color: "#fff",
    boxShadow: `0 3px 0 ${edge}`,
  });

  const chipInactive: React.CSSProperties = {
    background: "hsl(var(--duo-surface))",
    color: "hsl(var(--duo-text))",
    border: "2px solid hsl(var(--duo-border))",
    boxShadow: "0 3px 0 hsl(var(--duo-edge))",
  };

  // Shared header so the back button still works in every state below.
  const header = (
    <div
      className="sticky top-0 z-10 bg-background border-b-2 px-4 py-4 flex items-center justify-between"
      style={{ borderColor: "hsl(var(--duo-border))" }}
    >
      <button
        onClick={() => navigate("/create-task")}
        className="duo-card duo-press w-11 h-11 flex items-center justify-center"
        style={{ borderRadius: "1rem" }}
      >
        {isArabic
          ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
          : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
      </button>
      <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: "hsl(var(--duo-text))" }}>
        <span className="text-2xl">🌟</span>
        {bi("مهمة مخصصة", "Custom Task")}
      </h1>
      <div className="w-11" />
    </div>
  );

  if (premiumLoading) {
    return (
      <div className="duo-page min-h-screen bg-background pb-24">
        {header}
        <div className="max-w-lg mx-auto px-4 pt-8">
          <div className="h-56 rounded-2xl animate-pulse" style={{ background: "hsl(var(--duo-border))" }} />
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="duo-page min-h-screen bg-background pb-24">
        {header}
        <div className="px-4 pt-8">
          <PremiumGate
            title={bi("هذه الميزة للمشتركين", "This feature is for subscribers")}
            message={bi(
              "اشترك في بريميوم لإنشاء مهامك الخاصة بأسمائها وألوانها وأوقاتها.",
              "Subscribe to Premium to build your own tasks, with your own names, colors and schedules.",
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="duo-page min-h-screen bg-background"
      // Room for the fixed Save bar plus the gesture bar, so the last rows
      // (reminders) can scroll out from under it.
      style={{ paddingBottom: "calc(8.5rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-background border-b-2 px-4 py-4 flex items-center justify-between"
        style={{ borderColor: "hsl(var(--duo-border))" }}
      >
        <button
          onClick={() => navigate("/create-task")}
          className="duo-card duo-press w-11 h-11 flex items-center justify-center"
          style={{ borderRadius: "1rem" }}
        >
          {isArabic
            ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
        </button>
        <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: "hsl(var(--duo-text))" }}>
          <span className="text-2xl">🌟</span>
          {bi("مهمة مخصصة", "Custom Task")}
        </h1>
        <div className="w-11" />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {/* Name & Description Card */}
        <div className="duo-card p-4">
          <div className="flex items-start gap-3">
            <EmojiPicker
              selectedEmoji={selectedEmoji}
              onEmojiSelect={setSelectedEmoji}
              color={selectedColor}
              isArabic={isArabic}
            />
            <div className="flex-1 space-y-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={bi("اسم المهمة", "Task name")}
                className="border-0 border-b rounded-none px-0 focus-visible:ring-0 font-bold"
                style={{ borderColor: "hsl(var(--duo-border))", color: "hsl(var(--duo-text))" }}
              />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={bi("الوصف (اختياري)", "Description (Optional)")}
                className="border-0 border-b rounded-none px-0 focus-visible:ring-0 text-sm font-semibold"
                style={{ borderColor: "hsl(var(--duo-border))", color: "hsl(var(--duo-muted))" }}
              />
            </div>
          </div>

          {/* Color Selection */}
          <div className="mt-4 flex items-center justify-between py-3 border-t-2" style={{ borderColor: "hsl(var(--duo-border))" }}>
            <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("اللون", "Color")}</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2">
                  <div
                    className="w-16 h-8 rounded-full border-2"
                    style={{ backgroundColor: selectedColor, borderColor: "hsl(var(--duo-border))" }}
                  />
                  <ChevronRight className="w-5 h-5" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
                </button>
              </PopoverTrigger>
              <PopoverContent className={cn(duoPopover, "w-64 p-3")}>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        selectedColor === color && "ring-2 ring-offset-2 ring-[hsl(var(--duo-text))]"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Habit Type Card */}
        <div className="duo-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("نوع المهمة", "Task Type")}</span>
            <HelpCircle className="w-4 h-4" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setHabitType("build")}
              className="duo-press flex-1 h-12 rounded-2xl font-extrabold transition-all"
              style={habitType === "build" ? chipActive("#58CC02", "#45A302") : chipInactive}
            >
              {bi("بناء", "Build")}
            </button>
            <button
              onClick={() => setHabitType("quit")}
              className="duo-press flex-1 h-12 rounded-2xl font-extrabold transition-all"
              style={habitType === "quit" ? chipActive("#FF4B4B", "#E63E3E") : chipInactive}
            >
              {bi("إقلاع", "Quit")}
            </button>
          </div>
        </div>

        {/* Goal Settings Card */}
        <div className="duo-card p-4 space-y-4">
          {/* Goal Period */}
          <div className="flex items-center justify-between py-2 border-b-2" style={{ borderColor: "hsl(var(--duo-border))" }}>
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("فترة الهدف", "Goal Period")}</span>
              <HelpCircle className="w-4 h-4" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 font-bold" style={{ color: "hsl(var(--duo-text))" }}>
                  <span>{goalPeriod === "daily" ? (bi("يومي", "Day-Long")) : goalPeriod === "weekly" ? (bi("أسبوعي", "Weekly")) : (bi("شهري", "Monthly"))}</span>
                  <ChevronRight className="w-5 h-5" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
                </button>
              </PopoverTrigger>
              <PopoverContent className={cn(duoPopover, "w-40 p-2")}>
                {GOAL_PERIODS.map((period) => (
                  <button
                    key={period}
                    onClick={() => setGoalPeriod(period)}
                    className={cn(
                      "w-full text-start px-3 py-2 rounded-xl font-bold transition-colors",
                      goalPeriod !== period && "hover:bg-muted"
                    )}
                    style={goalPeriod === period ? { background: "#1CB0F6", color: "#fff" } : { color: "hsl(var(--duo-text))" }}
                  >
                    {period === "daily" ? (bi("يومي", "Daily")) : period === "weekly" ? (bi("أسبوعي", "Weekly")) : (bi("شهري", "Monthly"))}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Goal Value */}
          <div className="flex items-center justify-between py-2 border-b-2" style={{ borderColor: "hsl(var(--duo-border))" }}>
            <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("قيمة الهدف", "Goal Value")}</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(parseInt(e.target.value) || 1)}
                min={1}
                className="w-16 h-9 text-center rounded-xl border-2 font-bold"
              />
              <span className="font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>{bi("مرة", "count")}</span>
              <span className="font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>/ {goalPeriod === "daily" ? (bi("يوم", "Day")) : goalPeriod === "weekly" ? (bi("أسبوع", "Week")) : (bi("شهر", "Month"))}</span>
            </div>
          </div>

          {/* Task Days */}
          <div className="flex items-center justify-between py-2">
            <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("أيام المهمة", "Task Days")}</span>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 font-bold" style={{ color: "hsl(var(--duo-text))" }}>
                  <span>
                    {taskDays === "everyday" ? (bi("كل يوم", "Every Day")) :
                     taskDays === "weekdays" ? (bi("أيام الأسبوع", "Weekdays")) :
                     taskDays === "weekends" ? (bi("عطلة نهاية الأسبوع", "Weekends")) :
                     (bi("مخصص", "Custom"))}
                  </span>
                  <ChevronRight className="w-5 h-5" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
                </button>
              </PopoverTrigger>
              <PopoverContent className={cn(duoPopover, "w-48 p-2")}>
                {TASK_DAYS_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setTaskDays(option)}
                    className={cn(
                      "w-full text-start px-3 py-2 rounded-xl font-bold transition-colors",
                      taskDays !== option && "hover:bg-muted"
                    )}
                    style={taskDays === option ? { background: "#1CB0F6", color: "#fff" } : { color: "hsl(var(--duo-text))" }}
                  >
                    {option === "everyday" ? (bi("كل يوم", "Every Day")) :
                     option === "weekdays" ? (bi("أيام الأسبوع", "Weekdays")) :
                     option === "weekends" ? (bi("عطلة نهاية الأسبوع", "Weekends")) :
                     (bi("مخصص", "Custom"))}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-sm font-bold" style={{ color: "#FF9600" }}>
            *{isArabic ? `أكمل ${goalValue} مرة كل يوم` : `Complete ${goalValue} count each day`}
          </p>
        </div>

        {/* Time Range Card */}
        <div className="duo-card p-4">
          <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("نطاق الوقت", "Time Range")}</span>
          <div className="flex gap-2 mt-3 flex-wrap">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="duo-press px-4 h-10 rounded-2xl text-sm font-extrabold transition-all"
                style={timeRange === range ? chipActive("#1CB0F6", "#0F8ED9") : chipInactive}
              >
                {range === "anytime" ? (bi("أي وقت", "Anytime")) :
                 range === "morning" ? (bi("صباحاً", "Morning")) :
                 range === "afternoon" ? (bi("ظهراً", "Afternoon")) :
                 (bi("مساءً", "Evening"))}
              </button>
            ))}
          </div>
        </div>

        {/* Reminders Card */}
        <div className="duo-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("التذكيرات", "Reminders")}</span>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={setReminderEnabled}
            />
          </div>
          {reminderEnabled && (
            <div className="mt-3 pt-3 border-t-2" style={{ borderColor: "hsl(var(--duo-border))" }}>
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full rounded-xl border-2 font-bold"
              />
            </div>
          )}
        </div>

        {/* Additional Settings Card */}
        <div className="duo-card p-4 space-y-4">
          {/* Show Memo */}
          <div className="flex items-center justify-between py-2 border-b-2" style={{ borderColor: "hsl(var(--duo-border))" }}>
            <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("إظهار ملاحظة بعد الإكمال", "Show memo after completion")}</span>
            <Switch
              checked={showMemo}
              onCheckedChange={setShowMemo}
            />
          </div>

          {/* Task Term */}
          <div className="space-y-3">
            <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{bi("مدة المهمة", "Task Term")}</span>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs font-bold mb-1" style={{ color: "hsl(var(--duo-muted))" }}>{bi("تاريخ البدء", "Start Date")}</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="duo-press w-full justify-start rounded-xl border-2 font-bold"
                      style={{ background: "#1CB0F6", borderColor: "#1CB0F6", color: "#fff", boxShadow: "0 3px 0 #0F8ED9" }}
                    >
                      {format(startDate, "yyyy-MM-dd")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={cn(duoPopover, "w-auto p-0 overflow-hidden")} align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold mb-1" style={{ color: "hsl(var(--duo-muted))" }}>{bi("تاريخ الانتهاء", "End Date")}</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="duo-press w-full justify-start rounded-xl border-2 font-bold"
                      style={
                        !endDate
                          ? { background: "#1CB0F6", borderColor: "#1CB0F6", color: "#fff", boxShadow: "0 3px 0 #0F8ED9" }
                          : { background: "hsl(var(--duo-surface))", borderColor: "hsl(var(--duo-border))", color: "hsl(var(--duo-text))", boxShadow: "0 3px 0 hsl(var(--duo-edge))" }
                      }
                    >
                      {endDate ? format(endDate, "yyyy-MM-dd") : (bi("بلا نهاية", "No End"))}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className={cn(duoPopover, "w-auto p-0 overflow-hidden")} align="start">
                    <div className="p-2">
                      <Button
                        variant="ghost"
                        className="w-full mb-2 rounded-xl font-bold"
                        onClick={() => setEndDate(null)}
                      >
                        {bi("بلا نهاية", "No End Date")}
                      </Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={endDate || undefined}
                      onSelect={(date) => setEndDate(date || null)}
                      disabled={(date) => date < startDate}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div
        className="fixed left-4 right-4"
        // Above the gesture bar: at a flat bottom-6 the pill sat on the button.
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="duo-press w-full h-14 rounded-2xl font-extrabold text-white text-lg"
          style={{ background: "#58CC02", boxShadow: "0 4px 0 #45A302" }}
        >
          {saving ? "..." : (bi("حفظ", "Save"))}
        </Button>
      </div>
    </div>
  );
};

export default CustomHabit;

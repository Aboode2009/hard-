import { useState } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, Plus, Flame, Heart, Dumbbell, Brain, Ban,
  Footprints, BedDouble, Droplets, Activity, PersonStanding, Bike, BookOpen,
  Coffee, Flower2, StretchHorizontal, CigaretteOff, Salad, type LucideIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import { usePremium } from "@/hooks/usePremium";
import { PremiumGate } from "@/components/PremiumGate";
import { isPremiumRequiredError } from "@/lib/premium";

// The stored emoji stays in `description` (the home task card uses it as the
// task icon); this page itself renders colorful icons instead.
const PRESET_HABITS: { key: string; emoji: string; category: string; icon: LucideIcon; color: string }[] = [
  { key: "walk", emoji: "🚶", category: "fitness", icon: Footprints, color: "#1CB0F6" },
  { key: "sleep", emoji: "🛌", category: "health", icon: BedDouble, color: "#CE82FF" },
  { key: "drinkWater", emoji: "💧", category: "health", icon: Droplets, color: "#1CB0F6" },
  { key: "meditation", emoji: "🧘", category: "mindfulness", icon: Brain, color: "#CE82FF" },
  { key: "run", emoji: "🏃", category: "fitness", icon: Activity, color: "#FF9600" },
  { key: "stand", emoji: "🧍", category: "health", icon: PersonStanding, color: "#58CC02" },
  { key: "cycling", emoji: "🚴", category: "fitness", icon: Bike, color: "#1CB0F6" },
  { key: "workout", emoji: "💪", category: "fitness", icon: Dumbbell, color: "#FF4B4B" },
  { key: "burnCalories", emoji: "🔥", category: "fitness", icon: Flame, color: "#FF9600" },
  { key: "readBooks", emoji: "📚", category: "mindfulness", icon: BookOpen, color: "#FFC800" },
  { key: "lessCaffeine", emoji: "☕", category: "health", icon: Coffee, color: "#A56A43" },
  { key: "yoga", emoji: "🧘‍♀️", category: "fitness", icon: Flower2, color: "#CE82FF" },
  { key: "stretch", emoji: "🤸", category: "fitness", icon: StretchHorizontal, color: "#58CC02" },
  { key: "noSmoking", emoji: "🚭", category: "health", icon: CigaretteOff, color: "#FF4B4B" },
  { key: "eatHealthy", emoji: "🥗", category: "health", icon: Salad, color: "#58CC02" },
];

const CATEGORIES: { key: string; icon: LucideIcon; color: string; ar: string; en: string }[] = [
  { key: "all", icon: Flame, color: "#FF9600", ar: "الشائعة", en: "Popular" },
  { key: "health", icon: Heart, color: "#58CC02", ar: "الصحة", en: "Health" },
  { key: "fitness", icon: Dumbbell, color: "#1CB0F6", ar: "اللياقة", en: "Fitness" },
  { key: "mindfulness", icon: Brain, color: "#CE82FF", ar: "العقل", en: "Mind" },
  { key: "quit", icon: Ban, color: "#FF4B4B", ar: "الإقلاع", en: "Quit" },
];

const CreateTask = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Adding tasks — ready-made or custom — is for subscribers only. The server
  // enforces it too (a trigger on custom_tasks); this keeps free users from
  // seeing a list they cannot use.
  const { isPremium, loading: premiumLoading } = usePremium();
  const [saving, setSaving] = useState(false);

  const filteredHabits = selectedCategory === "all"
    ? PRESET_HABITS
    : PRESET_HABITS.filter(h => h.category === selectedCategory);

  const errorToast = (error: { message: string }) =>
    isPremiumRequiredError(error)
      ? {
          title: bi("للمشتركين فقط", "Subscribers only"),
          description: bi("إضافة المهام متاحة لمشتركي بريميوم.", "Adding tasks is available with Premium."),
          variant: "destructive" as const,
        }
      : { title: t("common.error", "Error"), description: error.message, variant: "destructive" as const };

  const handleAddHabit = async (habitKey: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: t("common.error", "Error"), description: bi("سجّل دخولك أولاً", "Please login first"), variant: "destructive" });
      return;
    }

    setSaving(true);

    // Deleting a task only sets is_active = false, so a deleted preset still
    // has its row. Counting that row as "already exists" meant a habit could
    // never be added back once removed; bring it back instead.
    const { data: rows } = await supabase
      .from("custom_tasks")
      .select("id, is_active")
      .eq("user_id", user.id)
      .eq("title", habitKey);
    const existing = rows?.find((r) => r.is_active);
    const removed = rows?.find((r) => !r.is_active);

    if (!existing && removed) {
      const { error: restoreError } = await supabase
        .from("custom_tasks")
        .update({ is_active: true })
        .eq("id", removed.id)
        .eq("user_id", user.id);
      setSaving(false);
      if (restoreError) {
        toast(errorToast(restoreError));
        return;
      }
      haptic("light");
      toast({
        title: t("createTask.added", "Habit Added!"),
        description: t("createTask.habitAddedDesc", "The habit has been added to your daily tasks"),
      });
      return;
    }

    if (existing) {
      toast({
        title: t("createTask.alreadyExists", "Already exists"),
        description: t("createTask.habitAlreadyAdded", "This habit is already in your list"),
        variant: "destructive"
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("custom_tasks")
      .insert({
        user_id: user.id,
        title: habitKey,
        description: emoji,
      });

    setSaving(false);

    if (error) {
      toast(errorToast(error));
      return;
    }

    haptic("light");
    toast({
      title: t("createTask.added", "Habit Added!"),
      description: t("createTask.habitAddedDesc", "The habit has been added to your daily tasks")
    });
  };

  const activeCat = CATEGORIES.find(c => c.key === selectedCategory) || CATEGORIES[0];

  if (premiumLoading || !isPremium) {
    return (
      <div className="duo-page min-h-screen bg-background pb-24" dir={bi("rtl", "ltr")}>
        <div className="max-w-lg mx-auto px-4 pt-5">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/")}
              className="duo-card duo-press w-11 h-11 flex items-center justify-center"
              style={{ borderRadius: "1rem" }}
              aria-label={bi("رجوع", "Back")}
            >
              {isArabic
                ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
                : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
            </button>
            <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
              {t("createTask.title", "New Habit")}
            </h1>
            <div className="w-11" />
          </div>
          {premiumLoading ? (
            <div className="h-56 rounded-2xl animate-pulse" style={{ background: "hsl(var(--duo-border))" }} />
          ) : (
            <PremiumGate
              title={bi("إضافة المهام للمشتركين", "Adding tasks is for subscribers")}
              message={bi(
                "اشترك في بريميوم لتضيف مهاماً جاهزة أو تبتكر مهامك الخاصة إلى تحدّيك اليومي.",
                "Subscribe to Premium to add ready-made habits or create your own tasks for your daily challenge.",
              )}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="duo-page min-h-screen bg-background"
      dir={bi("rtl", "ltr")}
      // The last presets scroll out from under the floating button.
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="max-w-lg mx-auto px-4 pt-5 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/")}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {t("createTask.title", "New Habit")}
          </h1>
          <div className="w-11" />
        </div>

        {/* Category Tabs */}
        <div className="overflow-x-auto -mx-4 px-4 pb-1 mb-5">
          <div className="flex gap-2.5 w-max">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className="duo-press flex items-center gap-2 px-4 h-11 rounded-2xl font-extrabold text-sm whitespace-nowrap"
                  style={
                    isActive
                      ? {
                          background: cat.color,
                          color: "#fff",
                          boxShadow: `0 3px 0 color-mix(in srgb, ${cat.color} 70%, black)`,
                        }
                      : {
                          background: "hsl(var(--duo-surface))",
                          color: "hsl(var(--duo-muted))",
                          border: "2px solid hsl(var(--duo-border))",
                          boxShadow: "0 3px 0 hsl(var(--duo-edge))",
                        }
                  }
                >
                  <Icon className="w-[18px] h-[18px]" strokeWidth={2.5} style={!isActive ? { color: cat.color } : undefined} />
                  {isArabic ? cat.ar : cat.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-3">
          <h2 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {isArabic ? activeCat.ar : activeCat.en}
          </h2>
          <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
            {t("createTask.popularDesc", "Most popular habits")}
          </p>
        </div>

        {/* Habits List */}
        <div className="space-y-3">
          {filteredHabits.map((habit) => {
            const Icon = habit.icon;
            return (
              <div key={habit.key} className="duo-card flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${habit.color}22` }}
                  >
                    <Icon className="w-[22px] h-[22px]" style={{ color: habit.color }} strokeWidth={2.5} />
                  </div>
                  <span className="font-bold truncate" style={{ color: "hsl(var(--duo-text))" }}>
                    {t(`createTask.habits.${habit.key}`, habit.key.charAt(0).toUpperCase() + habit.key.slice(1).replace(/([A-Z])/g, ' $1'))}
                  </span>
                </div>
                <button
                  onClick={() => handleAddHabit(habit.key, habit.emoji)}
                  disabled={saving}
                  className="duo-press w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white disabled:opacity-50"
                  style={{ background: "#58CC02", boxShadow: "0 3px 0 #45a302" }}
                  aria-label={bi("أضف العادة", "Add habit")}
                >
                  <Plus className="w-5 h-5" strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Habit button */}
      <div
        className="fixed inset-x-0 flex justify-center px-4"
        // Clear of the gesture bar, which drew over it at a flat bottom-6.
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={() => navigate("/custom-habit")}
          className="duo-press h-12 px-8 rounded-2xl flex items-center gap-2 font-extrabold text-white tracking-wide"
          style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
        >
          <Plus className="w-5 h-5" strokeWidth={3} />
          {t("createTask.customHabit", "Custom Habit")}
        </button>
      </div>
    </div>
  );
};

export default CreateTask;

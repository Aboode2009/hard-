import { useState, useEffect, useCallback } from "react";
import { bi } from "@/i18n/bi";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { BottomNav } from "@/components/BottomNav";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Lock, CalendarDays, ListChecks } from "lucide-react";
import {
  DuoDumbbell, DuoMoon, DuoWater, DuoBook, DuoSalad,
  DuoSnowflake, DuoChecklist, DuoChat, DuoMegaphone, DuoStar, DuoThickCheck,
} from "@/components/icons/DuolingoIcons";
import { haptic } from "@/lib/haptics";

interface PathTask {
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}

interface PathConfig {
  titleKey: string;
  descriptionKey: string;
  totalDays: number;
  stageLevel: number;
  color: string;      // Duolingo-style unit color
  colorEdge: string;  // darker 3D ledge
  tasks: PathTask[];
}

const ic = "w-full h-full";

const pathsConfig: Record<string, PathConfig> = {
  "21-muslim-hard": {
    titleKey: "paths.muslimHard.title",
    descriptionKey: "paths.muslimHard.description",
    totalDays: 21,
    stageLevel: 1,
    color: "#FF9600",
    colorEdge: "#CC7800",
    tasks: [
      { titleKey: "tasks.sport.title", descriptionKey: "tasks.sport.description", icon: <DuoDumbbell className={ic} /> },
      { titleKey: "tasks.fasting.title", descriptionKey: "tasks.fasting.description", icon: <DuoStar className={ic} /> },
      { titleKey: "tasks.adhkar.title", descriptionKey: "tasks.adhkar.description", icon: <DuoChat className={ic} /> },
      { titleKey: "tasks.sleep.title", descriptionKey: "tasks.sleep.description", icon: <DuoMoon className={ic} /> },
      { titleKey: "tasks.diet.title", descriptionKey: "tasks.diet.description", icon: <DuoSalad className={ic} /> },
      { titleKey: "tasks.noSocial.title", descriptionKey: "tasks.noSocial.description", icon: <DuoMegaphone className={ic} /> },
    ],
  },
  "45-discipline": {
    titleKey: "paths.discipline.title",
    descriptionKey: "paths.discipline.description",
    totalDays: 45,
    stageLevel: 2,
    color: "#1CB0F6",
    colorEdge: "#0F8ED9",
    tasks: [
      { titleKey: "tasks.sport.title", descriptionKey: "tasks.sport.description", icon: <DuoDumbbell className={ic} /> },
      { titleKey: "tasks.fasting.title", descriptionKey: "tasks.fasting.description", icon: <DuoStar className={ic} /> },
      { titleKey: "tasks.adhkar.title", descriptionKey: "tasks.adhkar.description", icon: <DuoChat className={ic} /> },
      { titleKey: "tasks.sleep.title", descriptionKey: "tasks.sleep.description", icon: <DuoMoon className={ic} /> },
      { titleKey: "tasks.diet.title", descriptionKey: "tasks.diet.description", icon: <DuoSalad className={ic} /> },
      { titleKey: "tasks.noSocial.title", descriptionKey: "tasks.noSocial.description", icon: <DuoMegaphone className={ic} /> },
      { titleKey: "tasks.coldShower.title", descriptionKey: "tasks.coldShower.description", icon: <DuoSnowflake className={ic} /> },
      { titleKey: "tasks.reading.title", descriptionKey: "tasks.reading.description", icon: <DuoBook className={ic} /> },
    ],
  },
  "75-transformation": {
    titleKey: "paths.transformation.title",
    descriptionKey: "paths.transformation.description",
    totalDays: 75,
    stageLevel: 3,
    color: "#CE82FF",
    colorEdge: "#A560D9",
    tasks: [
      { titleKey: "tasks.sport.title", descriptionKey: "tasks.sport.description", icon: <DuoDumbbell className={ic} /> },
      { titleKey: "tasks.fasting.title", descriptionKey: "tasks.fasting.description", icon: <DuoStar className={ic} /> },
      { titleKey: "tasks.adhkar.title", descriptionKey: "tasks.adhkar.description", icon: <DuoChat className={ic} /> },
      { titleKey: "tasks.sleep.title", descriptionKey: "tasks.sleep.description", icon: <DuoMoon className={ic} /> },
      { titleKey: "tasks.diet.title", descriptionKey: "tasks.diet.description", icon: <DuoSalad className={ic} /> },
      { titleKey: "tasks.noSocial.title", descriptionKey: "tasks.noSocial.description", icon: <DuoMegaphone className={ic} /> },
      { titleKey: "tasks.coldShower.title", descriptionKey: "tasks.coldShower.description", icon: <DuoSnowflake className={ic} /> },
      { titleKey: "tasks.reading.title", descriptionKey: "tasks.reading.description", icon: <DuoBook className={ic} /> },
      { titleKey: "tasks.noSugar.title", descriptionKey: "tasks.noSugar.description", icon: <DuoSalad className={ic} /> },
      { titleKey: "tasks.water.title", descriptionKey: "tasks.water.description", icon: <DuoWater className={ic} /> },
    ],
  },
  "health-path": {
    titleKey: "paths.health.title",
    descriptionKey: "paths.health.description",
    totalDays: 30,
    stageLevel: 1,
    color: "#58CC02",
    colorEdge: "#45A302",
    tasks: [
      { titleKey: "tasks.sport.title", descriptionKey: "tasks.sport.description", icon: <DuoDumbbell className={ic} /> },
      { titleKey: "tasks.sleep.title", descriptionKey: "tasks.sleep.description", icon: <DuoMoon className={ic} /> },
      { titleKey: "tasks.diet.title", descriptionKey: "tasks.diet.description", icon: <DuoSalad className={ic} /> },
      { titleKey: "tasks.water.title", descriptionKey: "tasks.water.description", icon: <DuoWater className={ic} /> },
      { titleKey: "tasks.noSugar.title", descriptionKey: "tasks.noSugar.description", icon: <DuoSalad className={ic} /> },
    ],
  },
  "fitness-path": {
    titleKey: "paths.fitness.title",
    descriptionKey: "paths.fitness.description",
    totalDays: 30,
    stageLevel: 1,
    color: "#FF4B4B",
    colorEdge: "#D63333",
    tasks: [
      { titleKey: "tasks.sport.title", descriptionKey: "tasks.sport.description", icon: <DuoDumbbell className={ic} /> },
      { titleKey: "tasks.diet.title", descriptionKey: "tasks.diet.description", icon: <DuoSalad className={ic} /> },
      { titleKey: "tasks.water.title", descriptionKey: "tasks.water.description", icon: <DuoWater className={ic} /> },
      { titleKey: "tasks.coldShower.title", descriptionKey: "tasks.coldShower.description", icon: <DuoSnowflake className={ic} /> },
      { titleKey: "tasks.sleep.title", descriptionKey: "tasks.sleep.description", icon: <DuoMoon className={ic} /> },
    ],
  },
  "learning-path": {
    titleKey: "paths.learning.title",
    descriptionKey: "paths.learning.description",
    totalDays: 21,
    stageLevel: 1,
    color: "#FFC800",
    colorEdge: "#E6A700",
    tasks: [
      { titleKey: "tasks.reading.title", descriptionKey: "tasks.reading.description", icon: <DuoBook className={ic} /> },
      { titleKey: "tasks.noSocial.title", descriptionKey: "tasks.noSocial.description", icon: <DuoMegaphone className={ic} /> },
    ],
  },
};

const PathTasks = () => {
  const { pathId } = useParams<{ pathId: string }>();
  const [loading, setLoading] = useState(true);
  const [activePath, setActivePath] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const pathConfig = pathId ? pathsConfig[pathId] : null;

  const checkAuth = useCallback(async () => {
    try {
      const { data: { session } } = await clerkAuth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Must filter by user id — without it .single() fails whenever RLS
      // exposes other users' rows (same bug fixed on the Paths page)
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("stage_level")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (progress) {
        const stageToPath: Record<number, string> = {
          1: "21-muslim-hard",
          2: "45-discipline",
          3: "75-transformation",
        };
        setActivePath(stageToPath[progress.stage_level || 1] || "21-muslim-hard");
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking auth:", error);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!pathConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-xl text-foreground">Path not found</div>
      </div>
    );
  }

  const isActive = activePath === pathId;

  return (
    <div className="duo-page min-h-screen bg-background pb-40" dir={bi("rtl", "ltr")}>
      {/* ===== Duolingo-style colored unit header ===== */}
      <div
        className="rounded-b-3xl"
        style={{ background: pathConfig.color, boxShadow: `0 5px 0 ${pathConfig.colorEdge}` }}
      >
        <div className="container max-w-lg mx-auto px-4 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate("/paths")}
              className="duo-press w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.22)" }}
            >
              {isRTL
                ? <ChevronRight className="w-6 h-6 text-white" strokeWidth={2.5} />
                : <ChevronLeft className="w-6 h-6 text-white" strokeWidth={2.5} />}
            </button>
            {isActive && (
              <span
                className="px-3.5 py-1.5 rounded-full text-xs font-extrabold tracking-wider text-white"
                style={{ background: "rgba(255,255,255,0.25)" }}
              >
                {t('paths.active')}
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-white leading-tight">
            {t(pathConfig.titleKey)}
          </h1>
          <p className="text-sm font-semibold text-white/85 mt-2 leading-relaxed">
            {t(pathConfig.descriptionKey)}
          </p>

          {/* Stats pills */}
          <div className="flex items-center gap-2.5 mt-4">
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold text-white"
              style={{ background: "rgba(255,255,255,0.22)" }}
            >
              <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
              {pathConfig.totalDays} {t('paths.days')}
            </span>
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold text-white"
              style={{ background: "rgba(255,255,255,0.22)" }}
            >
              <ListChecks className="w-4 h-4" strokeWidth={2.5} />
              {pathConfig.tasks.length} {t('pathTasks.tasksCount')}
            </span>
          </div>
        </div>
      </div>

      {/* ===== Daily tasks (guidebook content) ===== */}
      <div className="container max-w-lg mx-auto px-4 pt-6">
        <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
          {t('pathTasks.dailyTasks')}
        </h2>
        <div className="h-0.5 mt-3 mb-5 rounded-full" style={{ background: "hsl(var(--duo-border))" }} />

        <div className="space-y-3">
          {pathConfig.tasks.map((task, index) => (
            <div key={index} className="duo-card flex items-center gap-3.5 p-3.5">
              <div className="w-14 h-14 flex-shrink-0">
                {task.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                  {t(task.titleKey)}
                </h3>
                <p className="text-sm font-semibold line-clamp-2 mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                  {t(task.descriptionKey)}
                </p>
              </div>
              {isActive ? (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "#58CC02" }}
                >
                  <DuoThickCheck className="w-[18px] h-[18px] text-white" />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "hsl(var(--duo-border))" }}
                >
                  <Lock className="w-4 h-4" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Sticky CTA ===== */}
      <div className="fixed bottom-[76px] inset-x-0 px-4">
        <div className="max-w-lg mx-auto">
          {isActive ? (
            <button
              onClick={() => { haptic("light"); navigate("/"); }}
              className="duo-press w-full py-3.5 rounded-2xl font-extrabold text-white tracking-wide"
              style={{ background: "#58CC02", boxShadow: "0 4px 0 #45A302" }}
            >
              {t('pathTasks.goToChallenge')}
            </button>
          ) : !activePath ? (
            <button
              onClick={() => { haptic("light"); navigate(`/paths?start=${pathId}`); }}
              className="duo-press w-full py-3.5 rounded-2xl font-extrabold text-white tracking-wide"
              style={{ background: pathConfig.color, boxShadow: `0 4px 0 ${pathConfig.colorEdge}` }}
            >
              {t('pathTasks.startPath')}
            </button>
          ) : null}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PathTasks;

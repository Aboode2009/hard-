import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { BottomNav } from "@/components/BottomNav";
import { ProgressionMap } from "@/components/paths/ProgressionMap";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Flame, Target, Brain, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PathConfig {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  totalDays: number;
  stageLevel: number;
  color: string;
}

const pathConfigs: PathConfig[] = [
  {
    id: "21-muslim-hard",
    titleKey: "paths.muslimHard.title",
    icon: <Flame className="w-5 h-5" strokeWidth={2.5} />,
    totalDays: 21,
    stageLevel: 1,
    color: "#FF9600",
  },
  {
    id: "45-discipline",
    titleKey: "paths.discipline.title",
    icon: <Target className="w-5 h-5" strokeWidth={2.5} />,
    totalDays: 45,
    stageLevel: 2,
    color: "#1CB0F6",
  },
  {
    id: "75-transformation",
    titleKey: "paths.transformation.title",
    icon: <Brain className="w-5 h-5" strokeWidth={2.5} />,
    totalDays: 75,
    stageLevel: 3,
    color: "#CE82FF",
  },
];

const Paths = () => {
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState<PathConfig>(pathConfigs[0]);
  const [currentDay, setCurrentDay] = useState(1);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await clerkAuth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Get user profile for avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setAvatarUrl(profile.avatar_url);
      }

      // Check if user has an active challenge (must filter by user id —
      // without it .single() fails whenever RLS exposes other users' rows,
      // leaving the map stuck at day 1)
      const { data: progress } = await supabase
        .from("challenge_progress")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (progress) {
        // Map stage_level to path config
        const pathConfig = pathConfigs.find(
          (p) => p.stageLevel === (progress.stage_level || 1)
        );
        if (pathConfig) {
          setCurrentPath(pathConfig);
        }

        // Parse completed days from the database (values may be stored as
        // strings in the JSON column — normalize to numbers)
        const completed = progress.completed_days;
        const completedDaysArray = (Array.isArray(completed) ? completed : [])
          .map((d) => Number(d))
          .filter((n) => !isNaN(n));
        setCompletedDays(completedDaysArray);

        // Use current_day from DB (synced when user completes a day)
        // Fall back to calculation from completed_days if current_day is stale
        const dbCurrentDay = progress.current_day || 1;
        const maxDays = pathConfig?.totalDays || 21;
        
        if (completedDaysArray.length > 0) {
          const highestCompletedDay = Math.max(...completedDaysArray);
          const calculatedCurrentDay = highestCompletedDay + 1;
          // Use the higher of DB value or calculated value for accuracy
          setCurrentDay(Math.min(Math.max(dbCurrentDay, calculatedCurrentDay), maxDays));
        } else {
          setCurrentDay(Math.min(dbCurrentDay, maxDays));
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking auth:", error);
      setLoading(false);
    }
  };

  const handlePathChange = (path: PathConfig) => {
    setCurrentPath(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-xl text-foreground"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="duo-page min-h-screen bg-background pb-20 overflow-hidden">
      {/* Header with Path Selector — Duolingo-style unit banner */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b-2" style={{ borderColor: "hsl(var(--duo-border))" }}>
        <div className="container max-w-lg mx-auto px-4 py-3">
          <div
            className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: currentPath.color, boxShadow: `0 4px 0 color-mix(in srgb, ${currentPath.color} 70%, black)` }}
          >
            <div>
              <p className="text-[11px] font-extrabold tracking-wider text-white/80">
                {t("paths.title")} — {completedDays.length}/{currentPath.totalDays}
              </p>
              <h1 className="text-lg font-extrabold text-white leading-tight">
                {t(currentPath.titleKey)}
              </h1>
            </div>

            {/* Path Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-1.5 border-0 text-white font-extrabold hover:opacity-90"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  {currentPath.icon}
                  <ChevronDown className="w-4 h-4" strokeWidth={2.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {pathConfigs.map((path) => (
                  <DropdownMenuItem
                    key={path.id}
                    onClick={() => handlePathChange(path)}
                    className="gap-2 cursor-pointer"
                  >
                    <div
                      className="p-1.5 rounded-lg text-white"
                      style={{ background: path.color }}
                    >
                      {path.icon}
                    </div>
                    <div>
                      <p className="font-bold">{t(path.titleKey)}</p>
                      <p className="text-xs text-muted-foreground">
                        {path.totalDays} days
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Progression Map */}
      <ProgressionMap
        totalDays={currentPath.totalDays}
        currentDay={currentDay}
        completedDays={completedDays}
        avatarUrl={avatarUrl}
        pathId={currentPath.id}
      />

      <BottomNav />
    </div>
  );
};

export default Paths;

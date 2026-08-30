import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { ChevronLeft, ChevronRight, Flame, Shield, Trophy, Gem, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface Badge {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  requiredDays: number;
  icon: LucideIcon;
  tile: string;      // tile background
  tileEdge: string;  // 3D bottom ledge
  tier: number;
}

// Duolingo-style achievement badges driven by the user's best streak.
const badges: Badge[] = [
  {
    id: "bronze",
    nameAr: "شعلة البداية",
    nameEn: "Wildfire",
    descriptionAr: "حافظ على ستريك لمدة 7 أيام",
    descriptionEn: "Reach a 7 day streak",
    requiredDays: 7,
    icon: Flame,
    tile: "#FF4B4B",
    tileEdge: "#D63333",
    tier: 1,
  },
  {
    id: "silver",
    nameAr: "الفارس الصامد",
    nameEn: "Sage",
    descriptionAr: "حافظ على ستريك لمدة 21 يومًا",
    descriptionEn: "Reach a 21 day streak",
    requiredDays: 21,
    icon: Shield,
    tile: "#58CC02",
    tileEdge: "#45A302",
    tier: 2,
  },
  {
    id: "gold",
    nameAr: "البطل",
    nameEn: "Champion",
    descriptionAr: "حافظ على ستريك لمدة 99 يومًا",
    descriptionEn: "Reach a 99 day streak",
    requiredDays: 99,
    icon: Trophy,
    tile: "#CE82FF",
    tileEdge: "#A560D9",
    tier: 3,
  },
  {
    id: "diamond",
    nameAr: "الأسطورة",
    nameEn: "Legend",
    descriptionAr: "حافظ على ستريك لمدة 365 يومًا",
    descriptionEn: "Reach a 365 day streak",
    requiredDays: 365,
    icon: Gem,
    tile: "#1CB0F6",
    tileEdge: "#0F8ED9",
    tier: 4,
  },
];

const Achievements = () => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const navigate = useNavigate();

  const [bestStreak, setBestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStreakData();
  }, []);

  const fetchStreakData = async () => {
    const { data: { user } } = await clerkAuth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: progress } = await supabase
      .from("challenge_progress")
      .select("best_streak")
      .eq("user_id", user.id)
      .maybeSingle();

    if (progress) {
      setBestStreak(progress.best_streak || 0);
    }
    setLoading(false);
  };

  const unlockedCount = badges.filter(b => bestStreak >= b.requiredDays).length;

  return (
    <div className="duo-page min-h-screen bg-background pb-10" dir={bi("rtl", "ltr")}>
      <div className="max-w-lg mx-auto px-4 pt-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isArabic
              ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
              : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {bi("الأوسمة", "Achievements")}
          </h1>
          <div className="w-11" />
        </div>

        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="duo-card p-4 mb-6 flex items-center gap-4"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#FF960022" }}
          >
            <Flame className="w-7 h-7" style={{ color: "#FF9600" }} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-extrabold leading-none" style={{ color: "hsl(var(--duo-text))" }}>
              {bestStreak}
            </p>
            <p className="text-sm font-bold mt-1" style={{ color: "hsl(var(--duo-muted))" }}>
              {bi("أفضل ستريك", "Best streak")}
            </p>
          </div>
          <span
            className="px-3 py-1.5 rounded-full text-xs font-extrabold tracking-wider"
            style={{ background: "hsl(var(--duo-border) / 0.6)", color: "hsl(var(--duo-muted))" }}
          >
            {unlockedCount} / {badges.length} {bi("مفتوح", "UNLOCKED")}
          </span>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
            />
          </div>
        ) : (
          <div className="space-y-3">
            {badges.map((badge, index) => {
              const Icon = badge.icon;
              const progress = Math.min((bestStreak / badge.requiredDays) * 100, 100);
              const shown = Math.min(bestStreak, badge.requiredDays);

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="duo-card p-4 flex items-center gap-4"
                >
                  {/* Colored badge tile with LEVEL banner (like the screenshot) */}
                  <div
                    className="w-[72px] h-[86px] rounded-2xl flex flex-col overflow-hidden flex-shrink-0"
                    style={{ background: badge.tile, boxShadow: `0 4px 0 ${badge.tileEdge}` }}
                  >
                    <div className="flex-1 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
                        <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                    <div
                      className="py-1 text-center text-[9px] font-extrabold text-white tracking-wider"
                      style={{ background: "rgba(0,0,0,0.28)" }}
                    >
                      {isArabic ? `المستوى ${badge.tier}` : `LEVEL ${badge.tier}`}
                    </div>
                  </div>

                  {/* Title, counter, progress bar, description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-extrabold leading-tight" style={{ color: "hsl(var(--duo-text))" }}>
                        {isArabic ? badge.nameAr : badge.nameEn}
                      </h3>
                      <span className="text-sm font-extrabold flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--duo-muted))" }}>
                        {shown}/{badge.requiredDays}
                      </span>
                    </div>

                    {/* Thick gold progress bar */}
                    <div
                      className="relative h-4 rounded-full overflow-hidden mt-2.5"
                      style={{ background: "hsl(var(--duo-border) / 0.6)" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.9, delay: 0.2 + index * 0.1, ease: "easeOut" }}
                        className="absolute inset-y-0 start-0 rounded-full"
                        style={{ background: "#FFC800" }}
                      >
                        <div className="absolute inset-x-2.5 top-[3px] h-[5px] rounded-full bg-white/40" />
                      </motion.div>
                    </div>

                    <p className="text-sm font-semibold mt-2.5" style={{ color: "hsl(var(--duo-muted))" }}>
                      {isArabic ? badge.descriptionAr : badge.descriptionEn}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Achievements;

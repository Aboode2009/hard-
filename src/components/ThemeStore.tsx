import { useState, useEffect } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { buildThemeOverrideCss } from "@/lib/theme-css";
import { useToast } from "@/hooks/use-toast";
import { Check, Lock, Crown } from "lucide-react";
import { DuoGem, DuoThickCheck } from "@/components/icons/DuolingoIcons";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeColors {
  primary: string;
  background: string;
  foreground: string;
  card: string;
  muted: string;
  accent: string;
}

interface Theme {
  id: string;
  name: string;
  name_ar: string;
  description: string | null;
  description_ar: string | null;
  price: number;
  is_default: boolean;
  colors: ThemeColors;
  colors_dark?: ThemeColors;
}

interface UserTheme {
  theme_id: string;
  is_active: boolean;
}

const GREEN = "#58CC02";
const GREEN_EDGE = "#45A302";
const BLUE = "#1CB0F6";
const BLUE_EDGE = "#0F8ED9";

export const ThemeStore = () => {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const isArabic = i18n.language === 'ar';

  const [themes, setThemes] = useState<Theme[]>([]);
  const [userThemes, setUserThemes] = useState<UserTheme[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const { data: themesData, error: themesError } = await supabase
        .from('themes')
        .select('*')
        .order('price', { ascending: true });

      if (themesError) throw themesError;
      const formattedThemes = (themesData || []).map(theme => {
        const colors = theme.colors as unknown as ThemeColors;
        const colors_dark = (theme.colors as unknown as { dark?: ThemeColors })?.dark as ThemeColors | undefined;
        return { ...theme, colors, colors_dark };
      });
      setThemes(formattedThemes);

      const { data: userThemesData, error: userThemesError } = await supabase
        .from('user_themes')
        .select('theme_id, is_active')
        .eq('user_id', user.id);

      if (userThemesError) throw userThemesError;
      setUserThemes(userThemesData || []);

      const { data: progressData, error: progressError } = await supabase
        .from('challenge_progress')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (progressError) throw progressError;
      setUserPoints(progressData?.total_points || 0);

      const activeTheme = userThemesData?.find(ut => ut.is_active);
      if (activeTheme) {
        const theme = formattedThemes.find(t => t.id === activeTheme.theme_id);
        if (theme) applyThemeColors(theme.colors, theme.colors_dark);
      }
    } catch (error) {
      console.error("Error fetching theme data:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyThemeColors = (lightColors: ThemeColors, darkColors?: ThemeColors) => {
    let styleEl = document.getElementById('theme-override-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-override-styles';
      document.head.appendChild(styleEl);
    }

    // Themes without a dark palette only skin light mode — never copy the
    // light colors into .dark, or dark mode ends up with light backgrounds.
    styleEl.textContent = buildThemeOverrideCss(
      lightColors as unknown as Record<string, string>,
      darkColors as unknown as Record<string, string> | undefined,
    );

    localStorage.setItem(
      'activeThemeColors',
      JSON.stringify({ light: lightColors, dark: darkColors ?? null }),
    );
  };

  const isOwned = (themeId: string) => userThemes.some(ut => ut.theme_id === themeId);
  const isActive = (themeId: string) => userThemes.some(ut => ut.theme_id === themeId && ut.is_active);

  const handlePurchase = async (theme: Theme) => {
    if (theme.is_default) return;
    if (userPoints < theme.price) {
      toast({
        title: bi("عملات غير كافية", "Insufficient coins"),
        description: isArabic
          ? `تحتاج ${theme.price - userPoints} عملة إضافية`
          : `You need ${theme.price - userPoints} more coins`,
        variant: "destructive",
      });
      return;
    }

    setPurchasing(theme.id);
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      const { error: pointsError } = await supabase
        .from('challenge_progress')
        .update({ total_points: userPoints - theme.price })
        .eq('user_id', user.id);
      if (pointsError) throw pointsError;

      const { error: purchaseError } = await supabase
        .from('user_themes')
        .insert({ user_id: user.id, theme_id: theme.id });
      if (purchaseError) throw purchaseError;

      setUserPoints(prev => prev - theme.price);
      setUserThemes(prev => [...prev, { theme_id: theme.id, is_active: false }]);
      haptic("medium");

      toast({
        title: bi("تم الشراء!", "Purchased!"),
        description: isArabic
          ? `تم شراء مظهر ${theme.name_ar}`
          : `${theme.name} theme purchased`,
      });
    } catch (error) {
      console.error("Error purchasing theme:", error);
      toast({
        title: bi("خطأ", "Error"),
        description: bi("فشل الشراء", "Purchase failed"),
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const handleApply = async (theme: Theme) => {
    setApplying(theme.id);
    try {
      const { data: { user } } = await clerkAuth.getUser();
      if (!user) return;

      await supabase
        .from('user_themes')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (!theme.is_default) {
        await supabase
          .from('user_themes')
          .update({ is_active: true })
          .eq('user_id', user.id)
          .eq('theme_id', theme.id);
      }

      applyThemeColors(theme.colors, theme.colors_dark);

      setUserThemes(prev => prev.map(ut => ({
        ...ut,
        is_active: ut.theme_id === theme.id
      })));
      haptic("light");

      toast({
        title: bi("تم التطبيق!", "Applied!"),
        description: isArabic
          ? `تم تطبيق مظهر ${theme.name_ar}`
          : `${theme.name} theme applied`,
      });
    } catch (error) {
      console.error("Error applying theme:", error);
      toast({
        title: bi("خطأ", "Error"),
        description: bi("فشل التطبيق", "Failed to apply"),
        variant: "destructive",
      });
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="duo-card p-4 flex items-center gap-4"
      >
        <DuoGem className="w-12 h-12 flex-shrink-0" />
        <div>
          <p className="text-2xl font-extrabold leading-none" style={{ color: BLUE }}>
            {userPoints.toLocaleString()}
          </p>
          <p className="text-xs font-bold mt-1" style={{ color: "hsl(var(--duo-muted))" }}>
            {bi("رصيدك من العملات", "Your coin balance")}
          </p>
        </div>
      </motion.div>

      {/* Themes */}
      <div className="space-y-3">
        {themes.map((theme, index) => {
          const owned = theme.is_default || isOwned(theme.id);
          const active = theme.is_default
            ? !userThemes.some(ut => ut.is_active)
            : isActive(theme.id);
          const expanded = selectedTheme === theme.id;
          const canAfford = userPoints >= theme.price;

          return (
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              layout
            >
              <motion.div
                className="relative overflow-hidden rounded-[1.25rem] cursor-pointer"
                style={{
                  background: "hsl(var(--duo-surface))",
                  border: `2px solid ${active ? GREEN : "hsl(var(--duo-border))"}`,
                  boxShadow: `0 4px 0 ${active ? GREEN_EDGE : "hsl(var(--duo-edge))"}`,
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedTheme(expanded ? null : theme.id)}
              >
                {/* Color Strip */}
                <div className="h-28 relative overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(135deg, hsl(${theme.colors.primary}) 0%, hsl(${theme.colors.accent}) 50%, hsl(${theme.colors.muted}) 100%)`
                    }}
                  />
                  {/* Mini preview */}
                  <div className="absolute inset-3 flex items-end">
                    <div
                      className="w-full rounded-xl p-3"
                      style={{ backgroundColor: `hsl(${theme.colors.background} / 0.9)` }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                        />
                        <div className="flex-1 space-y-1">
                          <div
                            className="h-2 w-16 rounded-full"
                            style={{ backgroundColor: `hsl(${theme.colors.foreground} / 0.7)` }}
                          />
                          <div
                            className="h-1.5 w-10 rounded-full"
                            style={{ backgroundColor: `hsl(${theme.colors.muted})` }}
                          />
                        </div>
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status badges */}
                  {active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2.5 end-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: GREEN }}
                    >
                      <DuoThickCheck className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-extrabold text-white tracking-wider">
                        {bi("مفعّل", "ACTIVE")}
                      </span>
                    </motion.div>
                  )}
                  {!owned && !theme.is_default && (
                    <div className="absolute top-2.5 start-2.5 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base truncate" style={{ color: "hsl(var(--duo-text))" }}>
                          {isArabic ? theme.name_ar : theme.name}
                        </h3>
                        {theme.price >= 500 && (
                          <Crown className="w-4 h-4 flex-shrink-0" style={{ color: "#FFC800" }} strokeWidth={2.5} />
                        )}
                      </div>
                      <p className="text-xs font-semibold mt-0.5 line-clamp-1" style={{ color: "hsl(var(--duo-muted))" }}>
                        {isArabic ? theme.description_ar : theme.description}
                      </p>
                    </div>

                    {theme.is_default ? (
                      <span
                        className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full flex-shrink-0 text-white"
                        style={{ background: GREEN }}
                      >
                        {bi("مجاني", "FREE")}
                      </span>
                    ) : (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: "hsl(var(--duo-border) / 0.5)" }}
                      >
                        <DuoGem className="w-4 h-4" />
                        <span className="text-sm font-extrabold" style={{ color: BLUE }}>{theme.price}</span>
                      </div>
                    )}
                  </div>

                  {/* Color dots */}
                  <div className="flex items-center gap-1.5 mt-3">
                    {[theme.colors.primary, theme.colors.accent, theme.colors.foreground, theme.colors.muted, theme.colors.card].map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full"
                        style={{ backgroundColor: `hsl(${color})`, border: "2px solid hsl(var(--duo-border))" }}
                      />
                    ))}
                  </div>

                  {/* Expandable action area */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 mt-3" style={{ borderTop: "2px solid hsl(var(--duo-border))" }}>
                          {owned || theme.is_default ? (
                            <button
                              className="duo-press w-full h-11 rounded-2xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 disabled:cursor-not-allowed text-white"
                              style={
                                active
                                  ? { background: "hsl(var(--duo-border))", color: "hsl(var(--duo-muted))", boxShadow: "none" }
                                  : { background: GREEN, boxShadow: `0 3px 0 ${GREEN_EDGE}` }
                              }
                              disabled={active || applying === theme.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApply(theme);
                              }}
                            >
                              {applying === theme.id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                                />
                              ) : active ? (
                                <>
                                  <Check className="w-4 h-4" strokeWidth={3} />
                                  {bi("مفعّل حاليًا", "CURRENTLY ACTIVE")}
                                </>
                              ) : (
                                <>{bi("تطبيق المظهر", "APPLY THEME")}</>
                              )}
                            </button>
                          ) : (
                            <button
                              className="duo-press w-full h-11 rounded-2xl font-extrabold text-sm tracking-wide flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                              style={
                                canAfford
                                  ? { background: BLUE, color: "#fff", boxShadow: `0 3px 0 ${BLUE_EDGE}` }
                                  : { background: "hsl(var(--duo-border) / 0.5)", color: "hsl(var(--duo-muted))", boxShadow: "none" }
                              }
                              disabled={purchasing === theme.id || !canAfford}
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePurchase(theme);
                              }}
                            >
                              {purchasing === theme.id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                                />
                              ) : !canAfford ? (
                                <>
                                  <Lock className="w-4 h-4" strokeWidth={2.5} />
                                  {isArabic ? `تحتاج ${theme.price - userPoints} عملة` : `NEED ${theme.price - userPoints} MORE`}
                                </>
                              ) : (
                                <>
                                  {bi("شراء مقابل:", "BUY FOR:")}
                                  <DuoGem className="w-5 h-5" />
                                  {theme.price}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

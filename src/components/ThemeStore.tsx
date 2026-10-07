import { useState, useEffect, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { invalidateProgress } from "@/lib/query-client";
import { supabase } from "@/integrations/supabase/client";
import { challengeRpc } from "@/lib/challenge-rpc";
import { applyThemeColors, clearThemeColors } from "@/lib/theme-apply";
import { themeColorMode } from "@/lib/theme-css";
import { currentColorMode, setColorMode, type ColorMode } from "@/lib/color-mode";
import { useToast } from "@/hooks/use-toast";
import { Check, ChevronLeft, ChevronRight, Crown, Lock, Moon, Sun } from "lucide-react";
import { DuoGem } from "@/components/icons/DuolingoIcons";
import { UserAvatar } from "@/components/UserAvatar";
import { haptic } from "@/lib/haptics";
import { motion, AnimatePresence } from "framer-motion";

/** HSL triplets ("210 100% 50%"), the format the app's CSS variables use. */
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

/**
 * What the Default card previews: the app's real look (its green accent —
 * --duo-accent in index.css). The Default row in the database holds an old
 * palette that is never applied: choosing Default clears the override
 * (lib/theme-apply.ts).
 */
const APP_LOOK: ThemeColors = {
  primary: "95 98% 40%",
  background: "0 0% 100%",
  foreground: "0 0% 15%",
  card: "0 0% 100%",
  muted: "0 0% 94%",
  accent: "199 92% 85%",
};

const GREEN = "#58CC02";
const GREEN_EDGE = "#46A302";
const BLUE = "#1CB0F6";
const BLUE_EDGE = "#0F8ED9";

const hsl = (triplet: string, alpha?: number) =>
  alpha == null ? `hsl(${triplet})` : `hsl(${triplet} / ${alpha})`;
/** Same hue and saturation, lightness moved by `delta` points. */
const shade = (triplet: string, delta: number) => {
  const [h, s, l] = triplet.split(" ");
  const next = Math.max(0, Math.min(100, parseFloat(l) + delta));
  return `hsl(${h} ${s} ${next}%)`;
};
const isDarkPalette = (c: ThemeColors) => parseFloat(c.background.split(" ")[2]) < 40;

/** The palette a theme's previews draw with. */
const swatch = (theme: Theme) => {
  const c = theme.is_default ? APP_LOOK : theme.colors;
  const dark = isDarkPalette(c);
  return {
    bg: hsl(c.background),
    card: hsl(c.card),
    fg: hsl(c.foreground),
    fgSoft: hsl(c.foreground, 0.45),
    fgFaint: hsl(c.foreground, 0.25),
    muted: hsl(c.muted),
    accent: hsl(c.accent),
    primary: hsl(c.primary),
    primaryEdge: shade(c.primary, -12),
    primaryText: dark ? hsl(c.primary) : shade(c.primary, -8),
    cardEdge: dark ? shade(c.card, 8) : shade(c.muted, -6),
    tint: hsl(c.primary, 0.1),
    tintEdge: hsl(c.primary, 0.3),
  };
};

/** The light/dark mode a theme shows in ("both" = either). */
const modeOf = (theme: Theme) =>
  theme.is_default
    ? "both"
    : themeColorMode(
        theme.colors as unknown as Record<string, string>,
        theme.colors_dark as unknown as Record<string, string> | undefined,
      );

type Tier = { label: string; bg: string; fg: string; legendary: boolean };
const tierOf = (price: number): Tier => {
  if (price === 0) return { label: bi("مجاني", "Free"), bg: "#58CC021f", fg: GREEN_EDGE, legendary: false };
  if (price < 300) return { label: bi("عادي", "Common"), bg: "hsl(var(--duo-border) / 0.6)", fg: "hsl(var(--duo-muted))", legendary: false };
  if (price < 500) return { label: bi("نادر", "Rare"), bg: "#1CB0F61f", fg: "#1899D6", legendary: false };
  return { label: bi("أسطوري", "Legendary"), bg: "#FFC80026", fg: "#C98F00", legendary: true };
};

const SURFACE: CSSProperties = {
  background: "hsl(var(--duo-surface))",
  border: "2px solid hsl(var(--duo-border))",
  boxShadow: "0 3px 0 hsl(var(--duo-edge))",
};

const Spinner = () => (
  <motion.span
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    className="block w-5 h-5 border-[3px] border-current border-t-transparent rounded-full"
  />
);

/**
 * The theme store: a live preview of the home screen painted in the picked
 * theme ("try before you buy"), one action button that knows the theme's
 * state (buy / not enough points / apply / active), and a grid of every theme.
 */
export const ThemeStore = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isArabic = i18n.language === "ar";

  const [themes, setThemes] = useState<Theme[]>([]);
  const [userThemes, setUserThemes] = useState<UserTheme[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [me, setMe] = useState<{ id: string; username: string; avatar_id: string | null; gender: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [justBought, setJustBought] = useState<string | null>(null);
  /** A theme for the other colour mode: ask before switching the app's mode. */
  const [modePrompt, setModePrompt] = useState<{ theme: Theme; need: ColorMode } | null>(null);

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [themesRes, ownedRes, progressRes, profileRes] = await Promise.all([
        supabase.from("themes").select("*").order("price", { ascending: true }),
        supabase.from("user_themes").select("theme_id, is_active").eq("user_id", user.id),
        supabase.from("challenge_progress").select("total_points").eq("user_id", user.id).single(),
        supabase.from("profiles").select("username, avatar_id, gender").eq("id", user.id).maybeSingle(),
      ]);
      if (themesRes.error) throw themesRes.error;
      if (ownedRes.error) throw ownedRes.error;

      const list: Theme[] = (themesRes.data || []).map((theme) => {
        const colors = theme.colors as unknown as ThemeColors;
        const colors_dark = (theme.colors as unknown as { dark?: ThemeColors })?.dark;
        return { ...theme, colors, colors_dark };
      });
      setThemes(list);
      setUserThemes(ownedRes.data || []);
      setUserPoints(progressRes.data?.total_points || 0);
      if (profileRes.data) setMe({ id: user.id, ...profileRes.data });

      // Open on the theme in use; with none, on the first one to buy.
      const active = ownedRes.data?.find((ut) => ut.is_active);
      setPickedId(active?.theme_id ?? list.find((th) => !th.is_default)?.id ?? list[0]?.id ?? null);

      // Re-sync what is painted with what the account says. Nothing active
      // means the app's own look — this also undoes the old green "Default".
      const activeTheme = active && list.find((th) => th.id === active.theme_id);
      if (activeTheme && !activeTheme.is_default) {
        applyThemeColors(
          activeTheme.colors as unknown as Record<string, string>,
          activeTheme.colors_dark as unknown as Record<string, string> | undefined,
        );
      } else {
        clearThemeColors();
      }
    } catch (error) {
      console.error("Error fetching theme data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isOwned = (theme: Theme) => theme.is_default || userThemes.some((ut) => ut.theme_id === theme.id);
  const isActive = (theme: Theme) =>
    theme.is_default ? !userThemes.some((ut) => ut.is_active) : userThemes.some((ut) => ut.theme_id === theme.id && ut.is_active);

  const picked = themes.find((th) => th.id === pickedId) ?? themes[0];

  const pick = (theme: Theme) => {
    if (theme.id === pickedId) return;
    haptic("light");
    setPickedId(theme.id);
    setJustBought(null);
  };

  const confirmPurchase = async () => {
    if (!picked) return;
    setPurchasing(true);
    try {
      // Price, ownership and balance are checked by the server.
      const { total_points } = await challengeRpc.buyTheme(picked.id);
      setUserPoints(total_points);
      invalidateProgress();
      setUserThemes((prev) => [...prev, { theme_id: picked.id, is_active: false }]);
      setConfirming(false);
      setJustBought(picked.id);
      haptic("heavy");
    } catch (error) {
      console.error("Error purchasing theme:", error);
      toast({ title: bi("خطأ", "Error"), description: bi("فشل الشراء", "Purchase failed"), variant: "destructive" });
    } finally {
      setPurchasing(false);
    }
  };

  const apply = async (theme: Theme) => {
    setApplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: offError } = await supabase.from("user_themes").update({ is_active: false }).eq("user_id", user.id);
      if (offError) throw offError;
      if (!theme.is_default) {
        const { error: onError } = await supabase
          .from("user_themes")
          .update({ is_active: true })
          .eq("user_id", user.id)
          .eq("theme_id", theme.id);
        if (onError) throw onError;
        applyThemeColors(
          theme.colors as unknown as Record<string, string>,
          theme.colors_dark as unknown as Record<string, string> | undefined,
        );
      } else {
        clearThemeColors();
      }

      setUserThemes((prev) => prev.map((ut) => ({ ...ut, is_active: ut.theme_id === theme.id })));
      setJustBought(null);
      haptic("medium");
      toast({
        title: bi("تم التطبيق!", "Applied!"),
        description: isArabic ? `صار تطبيقك بمظهر ${theme.name_ar}` : `Your app now uses ${theme.name}`,
      });
    } catch (error) {
      console.error("Error applying theme:", error);
      toast({ title: bi("خطأ", "Error"), description: bi("فشل التطبيق", "Failed to apply"), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  /** Applies, or first asks to switch light/dark when the theme needs it. */
  const requestApply = (theme: Theme) => {
    const need = modeOf(theme);
    if (need !== "both" && need !== currentColorMode()) {
      haptic("light");
      setModePrompt({ theme, need });
      return;
    }
    void apply(theme);
  };

  const switchModeAndApply = () => {
    if (!modePrompt) return;
    setColorMode(modePrompt.need);
    const theme = modePrompt.theme;
    setModePrompt(null);
    void apply(theme);
  };

  const header = (
    <div className="flex items-center justify-between mb-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label={bi("رجوع", "Back")}
        className="duo-press w-11 h-11 flex items-center justify-center rounded-2xl"
        style={SURFACE}
      >
        {isArabic
          ? <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.8} />
          : <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.8} />}
      </button>
      <h1 className="text-[22px] font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
        {bi("متجر المظاهر", "Theme Store")}
      </h1>
      <div className="h-11 px-3 rounded-2xl flex items-center gap-1.5" style={SURFACE}>
        <DuoGem className="w-5 h-5" />
        <span className="text-base font-extrabold tabular-nums" style={{ color: BLUE }} dir="ltr">
          {userPoints.toLocaleString("en-US")}
        </span>
      </div>
    </div>
  );

  if (loading || !picked) {
    return (
      <div>
        {header}
        <div className="h-[330px] rounded-[30px] animate-pulse" style={{ background: "hsl(var(--duo-border) / 0.6)" }} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[140px] rounded-[20px] animate-pulse" style={{ background: "hsl(var(--duo-border) / 0.6)" }} />
          ))}
        </div>
      </div>
    );
  }

  const sw = swatch(picked);
  const tier = tierOf(picked.price);
  const owned = isOwned(picked);
  const active = isActive(picked);
  const afford = userPoints >= picked.price;
  const ownedCount = themes.filter(isOwned).length;
  const pickedMode = modeOf(picked);

  // The one action, by the picked theme's state.
  const action = active
    ? { label: bi("مفعّل حالياً", "Currently active"), style: { background: "hsl(var(--duo-border))", color: "hsl(var(--duo-muted))" }, icon: <Check className="w-5 h-5" strokeWidth={3.5} />, onClick: undefined }
    : owned
      ? { label: bi("طبّق المظهر", "Apply theme"), style: { background: GREEN, color: "#fff", boxShadow: `0 4px 0 ${GREEN_EDGE}` }, icon: null, onClick: () => requestApply(picked) }
      : afford
        ? { label: isArabic ? `اشترِ بـ ${picked.price}` : `Buy for ${picked.price}`, style: { background: BLUE, color: "#fff", boxShadow: `0 4px 0 ${BLUE_EDGE}` }, icon: <DuoGem className="w-6 h-6" />, onClick: () => { haptic("light"); setConfirming(true); } }
        : { label: isArabic ? `تحتاج ${picked.price - userPoints} نقطة زيادة` : `Need ${picked.price - userPoints} more points`, style: { background: "hsl(var(--duo-border) / 0.7)", color: "hsl(var(--duo-muted))" }, icon: <Lock className="w-5 h-5" strokeWidth={2.8} />, onClick: undefined };

  const miniTasks = [t("tasks.sport.title"), t("tasks.water.title")];

  return (
    <div>
      {header}

      {/* ── Live preview: the home screen in the picked theme ── */}
      <div className="rounded-[30px] p-3.5 space-y-2.5 transition-colors" style={{ background: sw.tint, border: `2px solid ${sw.tintEdge}` }}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: sw.primaryText }}>
            <span className="w-2 h-2 rounded-full" style={{ background: sw.primary }} />
            {bi("معاينة مباشرة", "Live preview")}
          </span>
          <span className="text-xs font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
            {bi("هكذا يبين تطبيقك", "This is how your app looks")}
          </span>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={picked.id}
            initial={{ opacity: 0.4, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="rounded-[22px] p-3.5 space-y-2.5"
            style={{ background: sw.bg, border: `2px solid ${sw.cardEdge}`, boxShadow: `0 6px 0 ${sw.tintEdge}` }}
            aria-hidden="true"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <UserAvatar
                  avatarId={me?.avatar_id}
                  gender={me?.gender}
                  seed={me?.id}
                  className="w-[38px] h-[38px]"
                  style={{ boxShadow: `0 0 0 2px ${sw.bg}, 0 0 0 4px ${sw.primary}` }}
                />
                <span className="text-[15px] font-extrabold truncate" style={{ color: sw.fg }} dir="auto">
                  {me?.username ?? ""}
                </span>
              </div>
              <span className="h-[30px] px-2.5 rounded-[10px] flex items-center text-[13px] font-extrabold" style={{ background: sw.card, border: `2px solid ${sw.cardEdge}`, color: sw.fg }}>
                {bi("الكل", "All")}
              </span>
            </div>

            <div className="rounded-2xl px-3 py-2.5 space-y-1.5" style={{ background: sw.card, border: `2px solid ${sw.cardEdge}`, boxShadow: `0 3px 0 ${sw.cardEdge}` }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold" style={{ color: sw.fg }}>{bi("المستوى 5", "Level 5")}</span>
                <span className="text-xs font-extrabold" style={{ color: sw.primaryText }} dir="ltr">860/900 XP</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: sw.muted }}>
                <div className="h-full w-[92%] rounded-full" style={{ background: sw.primary }} />
              </div>
            </div>

            {miniTasks.map((label) => (
              <div
                key={label}
                className="rounded-2xl px-3 py-2 flex items-center justify-between gap-2"
                style={{ background: sw.card, border: `2px solid ${sw.primary}`, boxShadow: `0 3px 0 ${sw.primaryEdge}` }}
              >
                <span className="text-sm font-extrabold line-through truncate" style={{ color: sw.fgSoft }}>{label}</span>
                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: sw.primary }}>
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={4} />
                </span>
              </div>
            ))}

            <div className="h-[42px] rounded-[14px] flex items-center justify-center text-[15px] font-extrabold text-white" style={{ background: sw.primary, boxShadow: `0 4px 0 ${sw.primaryEdge}` }}>
              {bi("أكمل اليوم بنجاح", "Complete the day")}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── The picked theme ── */}
      <div className="mt-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[26px] leading-tight font-extrabold truncate" style={{ color: "hsl(var(--duo-text))" }}>
                {isArabic ? picked.name_ar : picked.name}
              </h2>
              {tier.legendary && <Crown className="w-5 h-5 flex-shrink-0" style={{ color: "#FFC800" }} fill="#FFC800" strokeWidth={2} />}
            </div>
            <p className="text-[15px] font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
              {isArabic ? picked.description_ar : picked.description}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
            <span className="text-xs font-extrabold rounded-full px-2.5 py-1" style={{ background: tier.bg, color: tier.fg }}>
              {tier.label}
            </span>
            {pickedMode !== "both" && (
              <span
                className="inline-flex items-center gap-1 text-xs font-extrabold rounded-full px-2.5 py-1"
                style={pickedMode === "dark"
                  ? { background: "#2B3340", color: "#C9D6EA" }
                  : { background: "#FFF4CC", color: "#B98500" }}
              >
                {pickedMode === "dark" ? <Moon className="w-3.5 h-3.5" strokeWidth={2.8} /> : <Sun className="w-3.5 h-3.5" strokeWidth={2.8} />}
                {pickedMode === "dark" ? bi("للوضع الداكن", "Dark mode") : bi("للوضع النهاري", "Light mode")}
              </span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {justBought === picked.id && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className="rounded-[18px] px-3.5 py-3 flex items-center gap-2.5"
              style={{ background: "#58CC021f", border: "2px solid #58CC0255" }}
            >
              <span className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: GREEN }}>
                <Check className="w-[18px] h-[18px] text-white" strokeWidth={3.5} />
              </span>
              <div>
                <p className="text-base font-extrabold" style={{ color: GREEN_EDGE }}>{bi("مبروك! صار المظهر إلك", "It's yours!")}</p>
                <p className="text-[13px] font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                  {bi("طبّقه هسه أو بأي وقت من هنا.", "Apply it now, or any time from here.")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={action.onClick}
          disabled={!action.onClick || applying || purchasing}
          className="duo-press w-full h-[54px] rounded-[18px] flex items-center justify-center gap-2 text-[17px] font-extrabold disabled:cursor-default"
          style={action.style}
        >
          {applying ? <Spinner /> : action.icon}
          <span>{action.label}</span>
        </button>
        {!owned && !afford && (
          <button
            type="button"
            onClick={() => navigate("/points")}
            className="block mx-auto text-[15px] font-extrabold"
            style={{ color: "#1899D6" }}
          >
            {bi("اشحن نقاطك", "Top up your points")}
          </button>
        )}
      </div>

      {/* ── Every theme ── */}
      <div className="mt-6 flex items-baseline justify-between">
        <h3 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{bi("كل المظاهر", "All themes")}</h3>
        <span className="text-sm font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
          {isArabic ? `${ownedCount} من ${themes.length} عندك` : `You own ${ownedCount} of ${themes.length}`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {themes.map((theme) => {
          const s = swatch(theme);
          const on = theme.id === picked.id;
          const tOwned = isOwned(theme);
          const tActive = isActive(theme);
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => pick(theme)}
              aria-pressed={on}
              aria-label={isArabic ? theme.name_ar : theme.name}
              className="duo-press text-start rounded-[20px] overflow-hidden flex flex-col"
              style={{
                background: "hsl(var(--duo-surface))",
                border: `2px solid ${on ? s.primary : "hsl(var(--duo-border))"}`,
                boxShadow: `0 4px 0 ${on ? s.primaryEdge : "hsl(var(--duo-edge))"}`,
              }}
            >
              <div className="h-[78px] relative overflow-hidden" style={{ background: s.bg }}>
                <span className="absolute w-24 h-24 rounded-full -top-[34px] -left-[22px]" style={{ background: s.primary }} />
                <span className="absolute w-14 h-14 rounded-full -bottom-5 left-[54px]" style={{ background: s.accent }} />
                <span
                  className="absolute right-2.5 bottom-2.5 w-[72px] h-7 rounded-[10px] flex items-center gap-1.5 px-1.5"
                  style={{ background: s.card, border: `2px solid ${s.cardEdge}` }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.primary }} />
                  <span className="h-[5px] flex-1 rounded-full" style={{ background: s.fgFaint }} />
                </span>
                {modeOf(theme) === "dark" && (
                  <span className="absolute top-2 left-2 w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} aria-hidden="true">
                    <Moon className="w-3 h-3 text-white" strokeWidth={3} />
                  </span>
                )}
                {tActive && (
                  <span className="absolute top-2 right-2 h-[22px] px-2 rounded-full flex items-center gap-1 text-[11px] font-extrabold text-white" style={{ background: GREEN }}>
                    <Check className="w-3 h-3" strokeWidth={4} />
                    {bi("مفعّل", "Active")}
                  </span>
                )}
              </div>
              <div className="px-[11px] pt-[9px] pb-[11px] space-y-0.5">
                <p className="text-[15px] font-extrabold truncate" style={{ color: "hsl(var(--duo-text))" }}>
                  {isArabic ? theme.name_ar : theme.name}
                </p>
                <p className="inline-flex items-center gap-1 text-[13px] font-extrabold" style={{ color: tOwned ? GREEN_EDGE : "#1899D6" }}>
                  {!tOwned && <DuoGem className="w-3.5 h-3.5" />}
                  {theme.is_default ? bi("مجاني", "Free") : tOwned ? bi("عندك", "Owned") : theme.price}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Purchase confirmation ── */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(10,12,16,0.55)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !purchasing && setConfirming(false)}
            dir={bi("rtl", "ltr")}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={bi("تأكيد الشراء", "Confirm purchase")}
              className="duo-page w-full max-w-sm rounded-[28px] p-5 space-y-3.5"
              style={{ ...SURFACE, boxShadow: "0 6px 0 hsl(var(--duo-edge))" }}
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-[18px] relative overflow-hidden flex-shrink-0" style={{ background: sw.bg, border: `2px solid ${sw.cardEdge}` }}>
                  <span className="absolute w-[58px] h-[58px] rounded-full -top-[22px] -left-4" style={{ background: sw.primary }} />
                  <span className="absolute w-[30px] h-[30px] rounded-full -bottom-2 -right-1" style={{ background: sw.accent }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "hsl(var(--duo-muted))" }}>{bi("تشتري مظهر", "You're buying")}</p>
                  <p className="text-[22px] font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{isArabic ? picked.name_ar : picked.name}</p>
                </div>
              </div>

              <div className="rounded-2xl px-3.5 py-3 space-y-2" style={{ background: "hsl(var(--background))" }}>
                <div className="flex justify-between text-[15px] font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                  <span>{bi("رصيدك", "Balance")}</span>
                  <span dir="ltr" style={{ color: "hsl(var(--duo-text))" }}>{userPoints}</span>
                </div>
                <div className="flex justify-between text-[15px] font-bold" style={{ color: "hsl(var(--duo-muted))" }}>
                  <span>{bi("السعر", "Price")}</span>
                  <span dir="ltr" style={{ color: "#FF4B4B" }}>−{picked.price}</span>
                </div>
                <div className="h-0.5" style={{ background: "hsl(var(--duo-border))" }} />
                <div className="flex justify-between text-base font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                  <span>{bi("يبقى عندك", "Left after")}</span>
                  <span dir="ltr" style={{ color: BLUE }}>{userPoints - picked.price}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void confirmPurchase()}
                disabled={purchasing}
                className="duo-press w-full h-[52px] rounded-2xl flex items-center justify-center text-[17px] font-extrabold text-white disabled:opacity-80"
                style={{ background: BLUE, boxShadow: `0 4px 0 ${BLUE_EDGE}` }}
              >
                {purchasing ? <Spinner /> : bi("تأكيد الشراء", "Confirm purchase")}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={purchasing}
                className="w-full h-11 rounded-[14px] text-base font-extrabold"
                style={{ color: "hsl(var(--duo-muted))" }}
              >
                {bi("لا، رجوع", "No, go back")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── This theme lives in the other colour mode ── */}
      <AnimatePresence>
        {modePrompt && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(10,12,16,0.55)", paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModePrompt(null)}
            dir={bi("rtl", "ltr")}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={modePrompt.need === "light" ? bi("مظهر للوضع النهاري", "A light-mode theme") : bi("مظهر للوضع الداكن", "A dark-mode theme")}
              className="duo-page w-full max-w-sm rounded-[28px] p-5 space-y-4 text-center"
              style={{ ...SURFACE, boxShadow: "0 6px 0 hsl(var(--duo-edge))" }}
              initial={{ y: 40, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="mx-auto w-20 h-20 rounded-full flex items-center justify-center"
                style={modePrompt.need === "light" ? { background: "#FFF4CC" } : { background: "#2B3340" }}
              >
                {modePrompt.need === "light"
                  ? <Sun className="w-10 h-10" style={{ color: "#FFC800" }} strokeWidth={2.5} />
                  : <Moon className="w-10 h-10" style={{ color: "#C9D6EA" }} strokeWidth={2.5} />}
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                  {modePrompt.need === "light"
                    ? bi("هذا المظهر للوضع النهاري", "This theme is for light mode")
                    : bi("هذا المظهر للوضع الداكن", "This theme is for dark mode")}
                </h2>
                <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "hsl(var(--duo-muted))" }}>
                  {isArabic
                    ? `مظهر ${modePrompt.theme.name_ar} يبين بس ${modePrompt.need === "light" ? "بالوضع النهاري" : "بالوضع الداكن"}، وتطبيقك هسه على ${modePrompt.need === "light" ? "الوضع الداكن" : "الوضع النهاري"}. نحوّله حتى يطلع المظهر؟`
                    : `${modePrompt.theme.name} only shows in ${modePrompt.need} mode, and your app is in ${modePrompt.need === "light" ? "dark" : "light"} mode. Switch so it shows?`}
                </p>
              </div>
              <button
                type="button"
                onClick={switchModeAndApply}
                className="duo-press w-full h-[52px] rounded-2xl flex items-center justify-center gap-2 text-[17px] font-extrabold text-white"
                style={{ background: BLUE, boxShadow: `0 4px 0 ${BLUE_EDGE}` }}
              >
                {modePrompt.need === "light" ? <Sun className="w-5 h-5" strokeWidth={2.8} /> : <Moon className="w-5 h-5" strokeWidth={2.8} />}
                {modePrompt.need === "light" ? bi("حوّل للنهاري وطبّق", "Switch to light & apply") : bi("حوّل للداكن وطبّق", "Switch to dark & apply")}
              </button>
              <button
                type="button"
                onClick={() => {
                  const theme = modePrompt.theme;
                  setModePrompt(null);
                  void apply(theme);
                }}
                className="w-full h-11 rounded-[14px] text-base font-extrabold"
                style={{ color: "hsl(var(--duo-muted))" }}
              >
                {bi("طبّق بدون تحويل", "Apply without switching")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

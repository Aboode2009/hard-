import type { ComponentType } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";

export interface TabItem {
  path: string;
  Icon: ComponentType<{ className?: string }>;
}

/**
 * Spoken names for the icon-only tabs. The label used to be the route itself,
 * so a screen reader announced "slash overall".
 */
const TAB_LABELS: Record<string, [ar: string, en: string]> = {
  "/": ["الرئيسية", "Home"],
  "/nass": ["الرئيسية", "Home"],
  "/overall": ["الإحصائيات", "Stats"],
  "/store": ["المتجر", "Store"],
  "/nass/store": ["متجر المكافآت", "Rewards store"],
  "/leaderboard": ["المتصدرون", "Leaderboard"],
  "/nass/leaderboard": ["المتصدرون", "Leaderboard"],
  "/profile": ["الملف الشخصي", "Profile"],
  "/settings": ["الإعدادات", "Settings"],
};

const tabLabel = (path: string) => {
  const names = TAB_LABELS[path];
  return names ? bi(names[0], names[1]) : path;
};

/**
 * Duolingo-style bottom tab bar shared by the main app and the NASS challenge.
 * - Colorful custom icons, no text labels.
 * - The active tab sits inside a highlighted rounded box that slides between
 *   tabs via a shared layout animation.
 * - Solid duo surface (no blur — duo is flat and tactile), safe-area inset,
 *   and a light haptic on tap.
 */
export const NativeTabBar = ({ items }: { items: TabItem[] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  useTranslation(); // re-render the labels on a language change

  const isActive = (path: string) => location.pathname === path;

  const go = (path: string) => {
    if (location.pathname === path) return;
    haptic("light");
    navigate(path);
  };

  return (
    <nav
      data-tour="bottom-nav"
      className="duo-page fixed bottom-0 left-0 right-0 z-50 border-t-2"
      style={{
        background: "hsl(var(--duo-surface))",
        borderColor: "hsl(var(--duo-border))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch justify-around h-[62px] px-2">
        {items.map((item) => {
          const { Icon } = item;
          const active = isActive(item.path);

          return (
            <motion.button
              key={item.path}
              onClick={() => go(item.path)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              aria-current={active ? "page" : undefined}
              aria-label={tabLabel(item.path)}
              className="relative flex flex-1 items-center justify-center min-w-0"
            >
              <div className="relative flex items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="tabHighlight"
                    className="absolute -inset-x-3 -inset-y-2 rounded-2xl border-2 border-primary/40 bg-primary/[0.10]"
                    transition={{ type: "spring", stiffness: 520, damping: 34 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative w-8 h-8 transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-75"
                  )}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

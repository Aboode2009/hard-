import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ProgressFillProps {
  /** 0–100. Clamped. */
  value: number;
  /** Classes for the fill element (colours, rounding, inner highlights). */
  className?: string;
  /** Inline styles for the fill — use for gradients / CSS variables. */
  style?: React.CSSProperties;
  /** Animation length in seconds. */
  duration?: number;
  children?: React.ReactNode;
}

/**
 * The fill half of a progress bar, animated with `scaleX` instead of `width`.
 *
 * Animating `width` re-runs layout and paint on every single frame, for every
 * bar on screen — the app has several, and on the home screen one of them
 * re-renders each second. `scaleX` is composited, so it costs nothing.
 *
 * The bar grows from the inline start, so it fills right-to-left in Arabic
 * without the caller having to think about it. Render it inside a container
 * that has `overflow-hidden` and the track background.
 */
export const ProgressFill = ({
  value,
  className,
  style,
  duration = 0.7,
  children,
}: ProgressFillProps) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <motion.div
      className={cn("h-full w-full", className)}
      style={{
        ...style,
        transformOrigin: isRTL ? "right center" : "left center",
        willChange: "transform",
      }}
      initial={false}
      animate={{ scaleX: pct / 100 }}
      transition={{ duration, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

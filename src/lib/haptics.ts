// Best-effort haptic feedback with no hard dependency.
//
// On a native build it uses the Capacitor Haptics plugin if it has been added
// to the native project (read off the global Capacitor bridge, so importing
// this file never requires the package to be installed). On the web / Android
// PWA it falls back to the Web Vibration API. On iOS Safari (no Vibration API
// and no plugin) it silently does nothing.

type HapticStyle = "light" | "medium" | "heavy";

interface CapacitorHaptics {
  impact?: (options: { style: string }) => void | Promise<void>;
}

interface CapacitorGlobal {
  Plugins?: { Haptics?: CapacitorHaptics };
}

export function haptic(style: HapticStyle = "light"): void {
  try {
    const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
    const haptics = cap?.Plugins?.Haptics;
    if (haptics?.impact) {
      const styleMap: Record<HapticStyle, string> = {
        light: "LIGHT",
        medium: "MEDIUM",
        heavy: "HEAVY",
      };
      void haptics.impact({ style: styleMap[style] });
      return;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      const ms = style === "heavy" ? 18 : style === "medium" ? 12 : 7;
      navigator.vibrate(ms);
    }
  } catch {
    /* haptics are purely cosmetic — never let them throw */
  }
}

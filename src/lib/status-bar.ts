import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Keeps the system status-bar icons readable against the app's theme.
 *
 * The app draws edge-to-edge, so the clock and battery icons sit on the page
 * background. Android left them white whatever the theme, which made them
 * vanish in light mode. The theme is applied in several places (App.tsx,
 * Settings, onboarding) by toggling `dark`/`light` on <html>; watching that
 * class covers all of them without touching each one.
 *
 * Native only; a no-op on the web.
 */
export function syncStatusBarWithTheme(): void {
  if (!Capacitor.isNativePlatform()) return;

  const root = document.documentElement;
  let last: boolean | null = null;

  const apply = () => {
    const dark = root.classList.contains("dark");
    if (dark === last) return;
    last = dark;
    // Style.Dark = light icons for a dark background, and vice versa.
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch((err) =>
      console.warn("Setting the status bar style failed:", err),
    );
  };

  apply();
  new MutationObserver(apply).observe(root, { attributes: true, attributeFilter: ["class"] });
}

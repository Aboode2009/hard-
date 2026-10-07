import { buildThemeOverrideCss } from "@/lib/theme-css";

/**
 * Applying a purchased theme: one <style> block of CSS-variable overrides,
 * remembered in localStorage so App.tsx can re-apply it before first paint.
 */
const STYLE_ID = "theme-override-styles";
const STORAGE_KEY = "activeThemeColors";

export function applyThemeColors(
  light: Record<string, string>,
  dark?: Record<string, string> | null,
) {
  let styleEl = document.getElementById(STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }
  // Themes without a dark palette only skin light mode — never copy the light
  // colours into .dark, or dark mode ends up with light backgrounds.
  styleEl.textContent = buildThemeOverrideCss(light, dark ?? undefined);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ light, dark: dark ?? null }));
  } catch {
    /* the theme still applies for this session */
  }
}

/**
 * Back to the app's own look. The "Default" theme row carries an old green
 * palette that is not the app's real colours, so it must not be applied as
 * an override — the default is simply no override at all.
 */
export function clearThemeColors() {
  document.getElementById(STYLE_ID)?.remove();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

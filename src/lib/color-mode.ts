/**
 * Light / dark mode, as Settings stores and applies it: the choice in
 * localStorage "theme" ("light" | "dark" | "system") and a `light`/`dark`
 * class on <html>. lib/status-bar.ts follows the class on its own.
 */
export type ColorMode = "light" | "dark";

/** The mode on screen right now (a "system" choice resolved). */
export function currentColorMode(): ColorMode {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Switches the app to `mode` and remembers it, like the Settings toggle. */
export function setColorMode(mode: ColorMode) {
  try {
    localStorage.setItem("theme", mode);
  } catch {
    /* still switches for this session */
  }
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
}

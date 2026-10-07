/**
 * Build the CSS override block for a purchased theme.
 *
 * A theme with one palette belongs to ONE colour mode: a light palette skins
 * light mode only (:root:not(.dark)), a dark one — "Midnight" — dark mode
 * only (.dark). Applying it everywhere put light backgrounds in dark mode or
 * the reverse. `themeColorMode` tells the store which mode a theme needs, so
 * it can offer to switch (components/ThemeStore.tsx).
 *
 * A theme row only carries the shadcn tokens (background, card, foreground,
 * primary, muted, accent), but most of the app is drawn with the Duolingo
 * tokens (--duo-surface, --duo-text, …; see index.css). Left alone those kept
 * their light values, so a dark theme such as "Midnight" painted a dark page
 * with white cards and dark, unreadable text. They are derived from the
 * theme's palette here so every surface follows the theme.
 */

type Palette = Record<string, string>;

/** "H S% L%" → [h, s, l] numbers. */
const parse = (triplet: string): [number, number, number] | null => {
  const m = /^\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/.exec(triplet ?? "");
  return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : null;
};
const fmt = (h: number, s: number, l: number) =>
  `${Math.round(h)} ${Math.round(s)}% ${Math.round(Math.max(0, Math.min(100, l)))}%`;

/** The Duolingo tokens a palette implies. Empty if the palette is unreadable. */
export const deriveDuoTokens = (colors: Palette): Palette => {
  const bg = parse(colors.background);
  const card = parse(colors.card ?? colors.background);
  const fg = parse(colors.foreground);
  if (!bg || !card || !fg) return {};
  const dark = bg[2] < 40;
  const [ch, cs, cl] = card;
  const primary = parse(colors.primary);
  return {
    // The "done / go" colour (index.css): the theme's own primary.
    ...(primary
      ? {
          "duo-accent": fmt(primary[0], primary[1], primary[2]),
          "duo-accent-edge": fmt(primary[0], primary[1], primary[2] - 9),
        }
      : {}),
    "duo-surface": fmt(ch, cs, cl),
    // Borders and the 3D ledge sit a step off the surface: lighter on a dark
    // palette, darker on a light one.
    "duo-border": dark ? fmt(ch, Math.min(cs, 18), cl + 12) : fmt(ch, Math.min(cs, 20), Math.min(cl, 100) - 11),
    "duo-edge": dark ? fmt(ch, Math.min(cs, 22), Math.max(cl - 7, 2)) : fmt(ch, Math.min(cs, 20), Math.min(cl, 100) - 16),
    "duo-text": fmt(fg[0], fg[1], fg[2]),
    "duo-muted": fmt(fg[0], Math.min(fg[1], 12), dark ? 64 : 48),
  };
};

/** True for a palette meant for dark mode (a dark background). */
export const isDarkPalette = (colors: Palette): boolean => {
  const bg = parse(colors.background);
  return !!bg && bg[2] < 40;
};

/**
 * The colour mode a theme is visible in: "both" when it has a palette for
 * each mode, else the mode its one palette is for.
 */
export const themeColorMode = (light: Palette, dark?: Palette | null): "light" | "dark" | "both" => {
  if (dark && JSON.stringify(dark) !== JSON.stringify(light)) return "both";
  return isDarkPalette(light) ? "dark" : "light";
};

export const buildThemeOverrideCss = (
  light: Palette,
  dark?: Palette | null,
) => {
  const toCss = (colors: Palette) =>
    Object.entries({ ...colors, ...deriveDuoTokens(colors) })
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => `--${key}: ${value};`)
      .join('\n    ');
  const mode = themeColorMode(light, dark);
  if (mode === "dark") {
    return `
  .dark {
    ${toCss(light)}
  }
`;
  }
  return mode === "both"
    ? `
  :root {
    ${toCss(light)}
  }
  .dark {
    ${toCss(dark!)}
  }
`
    : `
  :root:not(.dark) {
    ${toCss(light)}
  }
`;
};

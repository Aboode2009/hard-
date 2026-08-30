/**
 * Build the CSS override block for a purchased theme.
 *
 * Themes WITHOUT a real dark palette (dark missing, or an identical copy of
 * light — old saves persisted that) must only skin LIGHT mode; scoping them
 * to :root:not(.dark) keeps the app's default dark tokens working. Otherwise
 * dark mode shows light backgrounds everywhere and only un-themed elements
 * (duo buttons) turn dark.
 */
export const buildThemeOverrideCss = (
  light: Record<string, string>,
  dark?: Record<string, string> | null,
) => {
  const toCss = (colors: Record<string, string>) =>
    Object.entries(colors)
      .map(([key, value]) => `--${key}: ${value};`)
      .join('\n    ');
  const hasRealDark = !!dark && JSON.stringify(dark) !== JSON.stringify(light);
  return hasRealDark
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

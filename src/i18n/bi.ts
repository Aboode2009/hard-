import i18next from "i18next";
import { HARD } from "./hard-strings";

/**
 * Bilingual string helper. Replaces the old `isArabic ? ar : en` ternaries:
 * returns `ar` for Arabic, `en` for English, and for every other language it
 * looks the English string up in the HARD dictionary (falling back to
 * English when a translation is missing — which also safely passes through
 * non-UI values like CSS classes, "rtl"/"ltr" and date-format strings).
 *
 * Components already re-render on language change via useTranslation, so
 * reading the language from the i18next singleton here stays reactive.
 */
export const bi = (ar: string, en: string): string => {
  const lang = (i18next.language || "en").slice(0, 2);
  if (lang === "ar") return ar;
  if (lang === "en") return en;
  return HARD[en]?.[lang as keyof (typeof HARD)[string]] ?? en;
};

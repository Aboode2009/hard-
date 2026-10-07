import type { MotionProps } from "framer-motion";

/**
 * The animatable parts every boss artwork exposes. All four SVGs use the same
 * element ids, so one controller drives any of them.
 */
export interface BossGroups {
  /** Ground shadow — shrinks and fades as the boss rises. */
  shadow?: MotionProps;
  /** Main mass. Target of squash and stretch. */
  body?: MotionProps;
  head?: MotionProps;
  /** Tail / trailing limbs — lags the body (follow-through). */
  tail?: MotionProps;
  /** Wings or shoulder spines as a pair. */
  wings?: MotionProps;
  wingLeft?: MotionProps;
  wingRight?: MotionProps;
  /** Whole eye cluster — scaleY here is how the boss blinks. */
  eyes?: MotionProps;
  glowLeft?: MotionProps;
  glowRight?: MotionProps;
  /** Pupils narrow when angry. */
  pupilLeft?: MotionProps;
  pupilRight?: MotionProps;
  mouth?: MotionProps;
}

export interface BossArtProps {
  groups?: BossGroups;
}

/** Which artwork to show. */
export type BossKind = "dragon" | "demon" | "phantom" | "monster";

/**
 * Resolve a boss to its artwork from either language's name.
 *
 * Returns `null` when the name is unrecognised, which is the signal to fall
 * back to `boss_emoji` — so a boss added later still renders something.
 */
export const resolveBossKind = (
  nameAr?: string | null,
  nameEn?: string | null,
): BossKind | null => {
  const ar = (nameAr ?? "").trim();
  const en = (nameEn ?? "").trim().toLowerCase();

  if (ar.includes("تنين") || en.includes("dragon")) return "dragon";
  if (ar.includes("شيطان") || en.includes("demon")) return "demon";
  if (ar.includes("شبح") || en.includes("phantom") || en.includes("ghost")) return "phantom";
  if (ar.includes("وحش") || en.includes("monster")) return "monster";

  return null;
};

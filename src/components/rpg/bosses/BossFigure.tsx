import { BossCreature, type BossState } from "./BossCreature";
import { resolveBossKind } from "./types";

interface BossFigureProps {
  nameAr?: string | null;
  nameEn?: string | null;
  /** Shown when the boss has no drawn artwork yet. */
  emoji?: string | null;
  state?: BossState;
  size?: number;
  className?: string;
}

/**
 * Picks the right artwork for a boss and falls back to `boss_emoji`.
 *
 * The fallback matters: bosses come from the database, so one added later
 * without matching artwork still renders instead of leaving a hole.
 */
export const BossFigure = ({
  nameAr,
  nameEn,
  emoji,
  state = "idle",
  size = 200,
  className = "",
}: BossFigureProps) => {
  const kind = resolveBossKind(nameAr, nameEn);

  if (!kind) {
    return (
      <div
        className={`pointer-events-none select-none flex items-center justify-center ${className}`}
        style={{ width: size, height: size * (420 / 400) }}
        aria-hidden="true"
      >
        <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{emoji ?? "👾"}</span>
      </div>
    );
  }

  return <BossCreature kind={kind} state={state} size={size} className={className} />;
};

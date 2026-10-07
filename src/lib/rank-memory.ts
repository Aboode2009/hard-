/**
 * The last leaderboard position this user saw, per board, on this device.
 *
 * Opening a leaderboard compares the current position with the remembered one
 * and then remembers the current one, so the climb/slip animation plays once
 * per change rather than on every visit.
 *
 * ── The weekly reset ────────────────────────────────────────────────────
 * Weekly points are zeroed by a server job (Monday 00:00 Baghdad), which
 * reshuffles the whole board. Comparing across that would greet everybody with
 * a fake "you dropped". So a comparison is only made inside the same week, and
 * two independent signs of a reset (the job may land a few minutes late) also
 * cancel it:
 *   - this user's weekly points went down — they only grow within a week;
 *   - the board's total weekly points fell by half or more.
 * In any of these cases the current position is saved as a new baseline and
 * nothing is shown.
 *
 * Keyed by user id so two accounts on one device never compare with each other.
 */
export type RankBoard = "individual" | "company";

export type RankChange = { kind: "up" | "down"; places: number } | null;

interface SavedRank {
  rank: number;
  weeklyPoints: number;
  boardTotal: number;
  weekStart: string;
  savedAt: number;
}

const key = (board: RankBoard, uid: string) => `lb_rank_${board}_${uid}`;

/** Iraq is UTC+3 all year (no daylight saving). */
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Monday of the current week in Baghdad, as YYYY-MM-DD — the same boundary as
 * the server's weekly rollover (`run_weekly_rollover`, Monday 00:00
 * Asia/Baghdad).
 */
export function weekStart(now: Date = new Date()): string {
  const b = new Date(now.getTime() + BAGHDAD_OFFSET_MS);
  const d = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

function read(board: RankBoard, uid: string): SavedRank | null {
  try {
    const raw = localStorage.getItem(key(board, uid));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedRank>;
    if (typeof v.rank !== "number" || typeof v.weekStart !== "string") return null;
    return {
      rank: v.rank,
      weeklyPoints: typeof v.weeklyPoints === "number" ? v.weeklyPoints : 0,
      boardTotal: typeof v.boardTotal === "number" ? v.boardTotal : 0,
      weekStart: v.weekStart,
      savedAt: typeof v.savedAt === "number" ? v.savedAt : 0,
    };
  } catch {
    return null;
  }
}

function write(board: RankBoard, uid: string, value: SavedRank) {
  try {
    localStorage.setItem(key(board, uid), JSON.stringify(value));
  } catch {
    /* storage unavailable — the next visit simply has no baseline */
  }
}

/**
 * Compares against the remembered position, then remembers the current one.
 *
 * Returns null for "nothing to show": first visit, a new week, a detected
 * reset, or no change.
 */
export function compareAndRemember(
  board: RankBoard,
  uid: string,
  current: { rank: number; weeklyPoints: number; boardTotal: number },
): RankChange {
  const prev = read(board, uid);
  const week = weekStart();
  write(board, uid, { ...current, weekStart: week, savedAt: Date.now() });

  if (!prev) return null; // first visit — this is the baseline
  if (prev.weekStart !== week) return null; // a new week
  if (current.weeklyPoints < prev.weeklyPoints) return null; // points were reset
  if (prev.boardTotal > 0 && current.boardTotal <= prev.boardTotal / 2) return null;

  const diff = prev.rank - current.rank;
  if (diff > 0) return { kind: "up", places: diff };
  if (diff < 0) return { kind: "down", places: -diff };
  return null;
}

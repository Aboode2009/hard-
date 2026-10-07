/**
 * In-memory cache for the signed-in user's OWN home-screen data.
 *
 * The home screen unmounts every time the user visits another tab, so coming
 * back re-ran every query on it — a fresh round trip for data that had not
 * changed because nothing had happened in between. This holds the result for
 * the rest of the session so the screen paints from memory instead.
 *
 * ── What may live here, and what may not ────────────────────────────────
 * ONLY data scoped to this user, on this device: their progress row, their
 * reminders, their custom tasks, their profile. Anything shared — the
 * leaderboard, the weekly boss, attendance — must keep reading the database
 * every time, because this device cannot know when somebody else changed it.
 *
 * ── When it goes stale ──────────────────────────────────────────────────
 * 1. Cold start. The cache is a module-level Map, so it dies with the process.
 *    Nothing to invalidate; relaunching the app is already a clean read.
 * 2. Midnight in Baghdad. Every entry is stamped with the Baghdad calendar
 *    date, and an entry from a previous day is treated as absent — the day's
 *    tasks reset at midnight, so yesterday's snapshot must never be shown.
 * 3. A write. Callers patch the entry with what they just saved, which is why
 *    no re-read is needed after completing a task.
 *
 * ── The last-known copy (first paint only) ──────────────────────────────
 * Every write is also mirrored to localStorage. `readCache` never returns it —
 * a cold start still asks the server, which also runs the missed-day rules —
 * but `readLastKnown` does, so the home screen's FIRST frame can show the
 * user's real level, name and tasks instead of placeholders ("Level 1",
 * "User", day 1) that then visibly jump to the real values a second later.
 * The fetch that follows replaces it with the server's answer.
 */

interface Entry {
  value: unknown;
  /** Baghdad calendar date this was captured on. */
  day: string;
}

const store = new Map<string, Entry>();

const PERSIST_PREFIX = "hc:";

function persist(key: string, entry: Entry | null) {
  try {
    if (entry) localStorage.setItem(PERSIST_PREFIX + key, JSON.stringify(entry));
    else localStorage.removeItem(PERSIST_PREFIX + key);
  } catch {
    /* storage full or blocked — first paint just falls back to defaults */
  }
}

/**
 * Today's date in Baghdad as YYYY-MM-DD.
 *
 * Asia/Baghdad is UTC+3 all year — Iraq dropped daylight saving in 2015 — so
 * shifting by three hours and reading the UTC date is exact, and avoids
 * depending on the device's own timezone, which may be anything.
 */
export function baghdadDay(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** Cached value, or undefined when absent or from an earlier day. */
export function readCache<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.day !== baghdadDay()) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function writeCache<T>(key: string, value: T): void {
  const entry = { value, day: baghdadDay() };
  store.set(key, entry);
  persist(key, entry);
}

/**
 * For a component's initial state only: this session's value, else the copy
 * kept from the previous session. Never use it to decide whether to fetch.
 *
 * @param anyDay  Accept a copy from an earlier Baghdad day. Right for data that
 *                does not roll over at midnight (name, XP, cosmetics); wrong
 *                for the day's task state, which resets.
 */
export function readLastKnown<T>(key: string, anyDay = false): T | undefined {
  const fresh = readCache<T>(key);
  if (fresh !== undefined) return fresh;
  try {
    const raw = localStorage.getItem(PERSIST_PREFIX + key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as Entry;
    if (!anyDay && entry.day !== baghdadDay()) return undefined;
    return entry.value as T;
  } catch {
    return undefined;
  }
}

/**
 * Updates an entry in place after a confirmed write.
 *
 * No-op when nothing is cached: there is no snapshot to keep in step, and the
 * next read will fetch the truth anyway.
 */
export function patchCache<T>(key: string, update: (prev: T) => T): void {
  const current = readCache<T>(key);
  if (current === undefined) return;
  writeCache(key, update(current));
}

/** Drops one key, or everything when called with no argument. */
export function dropCache(key?: string): void {
  if (key === undefined) {
    store.clear();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(PERSIST_PREFIX)) localStorage.removeItem(k);
      }
    } catch {
      /* ignore */
    }
  } else {
    store.delete(key);
    persist(key, null);
  }
}

/** Key builders, so a typo cannot silently create a second cache slot. */
export const homeKeys = {
  progress: (uid: string) => `home:progress:${uid}`,
  reminders: (uid: string) => `home:reminders:${uid}`,
  customTasks: (uid: string) => `home:customTasks:${uid}`,
  // v2: avatar_id + gender replaced the photo URL in this entry.
  profile: (uid: string) => `home:profile2:${uid}`,
  admin: (uid: string) => `home:admin:${uid}`,
  companyAccess: (uid: string) => `home:company:${uid}`,
  xp: (uid: string) => `home:xp:${uid}`,
  cosmetics: (uid: string) => `home:cosmetics:${uid}`,
  mood: (uid: string) => `home:mood:${uid}`,
};

/**
 * The derived home-screen state, not the raw `challenge_progress` row.
 *
 * Deliberate: deriving it again also re-runs the missed-day check, which
 * *writes* (it consumes a streak freeze or resets the challenge). Replaying
 * that on every tab switch would be wrong, so the finished state is what gets
 * stored and a cache hit skips the logic entirely.
 */
export interface ProgressSnapshot {
  stageLevel: number;
  currentDay: number;
  currentStreak: number;
  completedDays: number[];
  /** ISO date string; rehydrated into a Date by the caller. */
  startDate: string;
  totalPoints: number;
  /** Completion state of the CURRENT day's tasks, by task id. */
  tasksCompleted: Record<number, boolean>;
}

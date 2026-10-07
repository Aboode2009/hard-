import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ensureMyProfile } from "@/lib/ensure-profile";
import { qk, queryClient } from "@/lib/query-client";

/**
 * Reads shared by the tab screens, as react-query options.
 *
 * Each screen used to fetch these in a mount effect, so every visit started
 * from a spinner. Through the query cache a revisit paints the last result at
 * once and refreshes it in the background; the same options feed the idle-time
 * prefetch in App.tsx, so a first visit is usually warm too.
 *
 * Only reads live here. Writes stay where they were and go to the database
 * immediately; afterwards they invalidate the keys they affect.
 */

export type ProgressRow = Tables<"challenge_progress">;

// ── Per-user rows ───────────────────────────────────────────────────────

export const progressQuery = (uid: string | null) => ({
  queryKey: qk.progress(uid),
  enabled: !!uid,
  queryFn: async (): Promise<ProgressRow | null> => {
    const { data, error } = await supabase
      .from("challenge_progress")
      .select("*")
      .eq("user_id", uid!)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
});

/** A count, not the rows: `head: true` returns no data at all. */
export const completionsCountQuery = (uid: string | null) => ({
  queryKey: qk.completionsCount(uid),
  enabled: !!uid,
  queryFn: async (): Promise<number> => {
    const { count, error } = await supabase
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid!);
    if (error) throw error;
    return count ?? 0;
  },
});

export const isAdminQuery = (uid: string | null) => ({
  queryKey: qk.isAdmin(uid),
  enabled: !!uid,
  queryFn: async (): Promise<boolean> => {
    const { data } = await supabase.rpc("is_admin");
    return data === true;
  },
});

export const companyCodeQuery = (uid: string | null) => ({
  queryKey: qk.companyCode(uid),
  enabled: !!uid,
  queryFn: async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("company_code")
      .eq("id", uid!)
      .maybeSingle();
    if (error) throw error;
    return data?.company_code ?? null;
  },
});

export interface ProfileData {
  username: string;
  created_at: string;
  /** Built-in avatar (lib/avatars.ts); NULL → the default for `gender`. */
  avatar_id: string | null;
  gender: string | null;
}

/**
 * The profile and progress rows the Profile screen shows. Missing rows are the
 * server's job to create (ensure_my_profile is idempotent), so a gap is filled
 * once and read again.
 */
export const profileQuery = (uid: string | null) => ({
  queryKey: qk.profile(uid),
  enabled: !!uid,
  queryFn: async (): Promise<{ profile: ProfileData | null; progress: ProgressRow | null }> => {
    const readBoth = () =>
      Promise.all([
        supabase.from("profiles").select("username, created_at, avatar_id, gender").eq("id", uid!).maybeSingle(),
        supabase.from("challenge_progress").select("*").eq("user_id", uid!).maybeSingle(),
      ]);

    let [p, g] = await readBoth();
    if (p.error) throw p.error;
    if (g.error) throw g.error;

    if (!p.data || !g.data) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await ensureMyProfile(session);
        [p, g] = await readBoth();
        if (p.error) throw p.error;
        if (g.error) throw g.error;
      }
    }
    // Profile shows the same row the other screens read; share it.
    if (g.data) queryClient.setQueryData(qk.progress(uid), g.data);
    return { profile: p.data, progress: g.data };
  },
});

// ── Shared data ─────────────────────────────────────────────────────────

export const storeProductsQuery = () => ({
  queryKey: qk.storeProducts(),
  queryFn: async (): Promise<Tables<"store_products">[]> => {
    const { data, error } = await supabase
      .from("store_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export interface LeaderboardEntry {
  rank: number;
  username: string;
  user_id: string;
  current_streak: number;
  best_streak: number;
  current_day: number;
  total_points: number;
  weekly_points: number;
  is_premium: boolean;
  avatar_id: string | null;
  gender: string | null;
}

export interface WeeklyChampion {
  user_id: string;
  username: string;
  total_points: number;
  featured_until: string;
  avatar_id: string | null;
  gender: string | null;
}

/**
 * The public board and the weekly champion. The three reads are independent,
 * so they run together instead of one after another.
 */
export const leaderboardQuery = () => ({
  queryKey: qk.leaderboard(),
  queryFn: async (): Promise<{ entries: LeaderboardEntry[]; champion: WeeklyChampion | null }> => {
    const [nass, board, champ] = await Promise.all([
      // Company employees have their own board and are left out of this one.
      supabase.from("profiles").select("id").eq("company_code", "NASS"),
      supabase.rpc("get_leaderboard"),
      supabase.rpc("get_current_champion"),
    ]);
    if (board.error) throw board.error;

    const nassIds = new Set((nass.data ?? []).map((p) => p.id));
    const rows = (board.data ?? []).filter(
      (e) => !nassIds.has(e.user_id),
    );

    const entries = rows.map((entry, index) => ({
      rank: index + 1,
      user_id: entry.user_id,
      username: entry.username || "Anonymous",
      current_streak: entry.current_streak,
      best_streak: entry.best_streak,
      current_day: entry.current_day,
      total_points: entry.total_points,
      weekly_points: entry.weekly_points,
      // Default to false so an older backend still renders.
      is_premium: entry.is_premium === true,
      avatar_id: entry.avatar_id ?? null,
      gender: entry.gender ?? null,
    }));

    const champion =
      !champ.error && champ.data && champ.data.length > 0 ? (champ.data[0] as WeeklyChampion) : null;

    return { entries, champion };
  },
});

export type NassEntry = Omit<LeaderboardEntry, "is_premium">;

/** Last week's champion of the NASS company board (crowned by run_weekly_rollover). */
export const nassChampionQuery = () => ({
  queryKey: qk.nassChampion(),
  queryFn: async (): Promise<WeeklyChampion | null> => {
    const { data, error } = await supabase.rpc("get_current_champion", { p_board: "nass" });
    if (error) throw error;
    return data && data.length > 0 ? (data[0] as WeeklyChampion) : null;
  },
});

export const nassLeaderboardQuery = () => ({
  queryKey: qk.nassLeaderboard(),
  queryFn: async (): Promise<NassEntry[]> => {
    const { data: nassProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, avatar_id, gender")
      .eq("company_code", "NASS");
    if (profilesError) throw profilesError;
    if (!nassProfiles || nassProfiles.length === 0) return [];

    const names = new Map(nassProfiles.map((p) => [p.id, p.username]));
    const looks = new Map(nassProfiles.map((p) => [p.id, { avatar_id: p.avatar_id, gender: p.gender }]));
    const ids = [...names.keys()];
    // Points are one balance (challenge_progress); day and streak are the
    // company challenge's own (nass_progress), separate from the main one.
    const [{ data: progressData, error: progressError }, { data: nassData, error: nassError }] = await Promise.all([
      supabase
        .from("challenge_progress")
        .select("user_id, total_points, weekly_points")
        .in("user_id", ids),
      supabase
        .from("nass_progress")
        .select("user_id, current_streak, best_streak, current_day")
        .in("user_id", ids),
    ]);
    if (progressError) throw progressError;
    if (nassError) throw nassError;
    const company = new Map((nassData ?? []).map((n) => [n.user_id, n]));

    return (progressData ?? [])
      .map((p) => ({
        user_id: p.user_id,
        username: names.get(p.user_id) || "Anonymous",
        avatar_id: looks.get(p.user_id)?.avatar_id ?? null,
        gender: looks.get(p.user_id)?.gender ?? null,
        current_streak: company.get(p.user_id)?.current_streak ?? 0,
        best_streak: company.get(p.user_id)?.best_streak ?? 0,
        current_day: company.get(p.user_id)?.current_day ?? 1,
        total_points: p.total_points,
        weekly_points: p.weekly_points,
      }))
      .sort((a, b) => b.weekly_points - a.weekly_points)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  },
});

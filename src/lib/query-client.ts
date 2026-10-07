import { QueryClient } from "@tanstack/react-query";

/**
 * One client for the whole app.
 *
 * Revisiting a screen paints what was fetched last time straight away and
 * refreshes it in the background once it is older than `staleTime`. Writes
 * still go to the database immediately; afterwards the affected keys are
 * invalidated (see invalidate* below) so the next read is fresh.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Key builders, so a typo cannot silently create a second cache slot. */
export const qk = {
  companyAccess: (uid: string | null) => ["company-access", uid] as const,
  progress: (uid: string | null) => ["progress", uid] as const,
  completionsCount: (uid: string | null) => ["completions-count", uid] as const,
  profile: (uid: string | null) => ["profile", uid] as const,
  isAdmin: (uid: string | null) => ["is-admin", uid] as const,
  companyCode: (uid: string | null) => ["company-code", uid] as const,
  storeProducts: () => ["store-products"] as const,
  leaderboard: () => ["leaderboard"] as const,
  nassLeaderboard: () => ["nass-leaderboard"] as const,
  nassChampion: () => ["nass-leaderboard", "champion"] as const,
};

/**
 * After anything that changes points, streaks or completed days: task
 * completion, finishing a day, a purchase, attendance, a boss hit.
 */
export function invalidateProgress() {
  void queryClient.invalidateQueries({ queryKey: ["progress"] });
  void queryClient.invalidateQueries({ queryKey: ["completions-count"] });
  void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  void queryClient.invalidateQueries({ queryKey: ["nass-leaderboard"] });
  // The stats screen's per-week habits and life-area wheel count completions.
  void queryClient.invalidateQueries({ queryKey: ["habit-week"] });
  void queryClient.invalidateQueries({ queryKey: ["wheel"] });
}

export function invalidateProfile() {
  void queryClient.invalidateQueries({ queryKey: ["profile"] });
  void queryClient.invalidateQueries({ queryKey: ["company-code"] });
  // Company membership decides which board a user appears on.
  void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  void queryClient.invalidateQueries({ queryKey: ["nass-leaderboard"] });
}

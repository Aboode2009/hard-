import { queryClient } from "@/lib/query-client";
import {
  companyCodeQuery,
  completionsCountQuery,
  isAdminQuery,
  nassLeaderboardQuery,
  profileQuery,
  progressQuery,
  storeProductsQuery,
} from "@/lib/queries";
import { storedSessionUserId } from "@/lib/session-user";
import { companyModeForStoredUser } from "@/lib/company-mode";

/**
 * Route chunk loaders, shared by `lazy()` in App.tsx and the preloader below.
 * `import()` of a module already requested returns the same promise, so
 * preloading and rendering never download a chunk twice.
 */
export const loadOverall = () => import("@/pages/Overall");
export const loadStore = () => import("@/pages/Store");
export const loadProfile = () => import("@/pages/Profile");
export const loadSettings = () => import("@/pages/Settings");
export const loadNassChallenge = () => import("@/pages/NassChallenge");
export const loadNassLeaderboard = () => import("@/pages/NassLeaderboard");
export const loadNassStore = () => import("@/pages/NassStore");

type IdleCallback = (cb: () => void, opts?: { timeout: number }) => number;

/** requestIdleCallback where available (not in older Android WebViews). */
const whenIdle = (cb: () => void) => {
  const ric = (window as unknown as { requestIdleCallback?: IdleCallback }).requestIdleCallback;
  if (ric) ric(cb, { timeout: 3000 });
  else setTimeout(cb, 1200);
};

let started = false;

/**
 * After the first screen is up and the main thread is idle: fetch the code of
 * the bottom-bar tabs and warm their data, so the first tap on each tab shows a
 * finished screen instead of a spinner. The personal and company bars differ,
 * so only the set this user will see is loaded.
 *
 * One idle slot per step keeps the work out of the way of whatever the user is
 * doing on the first screen.
 */
export function preloadTabs() {
  if (started) return;
  const uid = storedSessionUserId();
  if (!uid) return; // signed out — the tabs are not reachable yet
  started = true;

  const company = companyModeForStoredUser();

  const code = company
    ? [loadNassChallenge, loadNassLeaderboard, loadNassStore, loadProfile, loadSettings]
    : [loadOverall, loadStore, loadProfile, loadSettings];

  const data = company
    ? [nassLeaderboardQuery(), companyCodeQuery(uid), profileQuery(uid), isAdminQuery(uid)]
    : [
        progressQuery(uid),
        completionsCountQuery(uid),
        storeProductsQuery(),
        isAdminQuery(uid),
        profileQuery(uid),
        companyCodeQuery(uid),
      ];

  whenIdle(() => {
    for (const load of code) void load().catch(() => undefined);
    whenIdle(() => {
      for (const q of data) {
        // prefetchQuery never throws, and skips anything already fresh.
        void queryClient.prefetchQuery(q as Parameters<typeof queryClient.prefetchQuery>[0]);
      }
    });
  });
}

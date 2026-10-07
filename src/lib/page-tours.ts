import { useCallback, useEffect, useState } from "react";
import { bi } from "@/i18n/bi";
import type { TourStep } from "@/components/ProductTour";
import { storedSessionUserId, useSessionUserId } from "@/lib/session-user";

/**
 * First-visit tours for the screens beyond home.
 *
 * Unlike the home tour these never start on their own and never navigate: each
 * runs only when the user opens that screen themselves for the first time, and
 * only after its real content (not a spinner) is on screen. A screen the user
 * never opens never shows its tour.
 *
 * Every `target` matches a `data-tour` attribute on an element really rendered
 * by that page; ProductTour skips a step whose element is absent.
 *
 * Flags are per user (`tour_<page>_done_<uid>`), so a second account on the
 * same device gets its own first visit.
 *
 * Tours are for brand-new accounts only. An account is new when the server
 * says it has never finished the welcome flow (`profiles.onboarding_completed_at`
 * is NULL — see lib/onboarding.ts), which marks it eligible on this device
 * (`tours_eligible_<uid>`). An account that existed before therefore never
 * sees a tour: not after reinstalling, not on another phone. Settings →
 * "Replay the tour" makes any account eligible again on purpose.
 */
export type PageTourId = "home" | "leaderboard" | "story" | "store" | "stats";

export const PAGE_TOURS: PageTourId[] = ["home", "leaderboard", "story", "store", "stats"];

const flagKey = (id: PageTourId, uid: string) => `tour_${id}_done_${uid}`;
const eligibleKey = (uid: string) => `tours_eligible_${uid}`;

/** Called when the server reports a brand-new account (lib/onboarding.ts). */
export function markToursEligible(uid: string) {
  try {
    localStorage.setItem(eligibleKey(uid), "true");
  } catch {
    /* tours just will not run on this device */
  }
}

/** The home tour's flag from before tours were per user. */
const LEGACY_HOME_FLAG = "home_tour_completed";

export function hasSeenTour(id: PageTourId, uid: string | null): boolean {
  // No user yet: behave as seen, so nothing runs over a signed-out screen.
  if (!uid) return true;
  try {
    if (localStorage.getItem(flagKey(id, uid)) === "true") return true;
    // Carry the old device-wide home flag over to whoever is signed in now,
    // once, rather than replaying a tour an existing user already finished.
    if (id === "home" && localStorage.getItem(LEGACY_HOME_FLAG) === "true") {
      localStorage.setItem(flagKey(id, uid), "true");
      localStorage.removeItem(LEGACY_HOME_FLAG);
      return true;
    }
    // An existing account (never marked new on this device) has nothing to see.
    return localStorage.getItem(eligibleKey(uid)) !== "true";
  } catch {
    // Storage can throw in a locked-down WebView. Treat it as "already seen"
    // so a tour cannot reappear on every single visit.
    return true;
  }
}

export function markTourSeen(id: PageTourId, uid: string | null) {
  if (!uid) return;
  try {
    localStorage.setItem(flagKey(id, uid), "true");
  } catch {
    /* nothing to do — the tour simply may run again */
  }
}

/** Settings → "Replay the tour": every screen's tour shows again once. */
export function resetAllTours(uid: string | null = storedSessionUserId()) {
  try {
    localStorage.removeItem(LEGACY_HOME_FLAG);
    if (!uid) return;
    for (const id of PAGE_TOURS) localStorage.removeItem(flagKey(id, uid));
    // Asked for explicitly, so it applies to existing accounts too.
    localStorage.setItem(eligibleKey(uid), "true");
  } catch {
    /* ignore */
  }
}

/**
 * Runs a page's tour once, the first time the user opens it.
 *
 * @param ready  The page's real content is rendered (data loaded).
 * @param delay  Lets entrance animations settle so holes land on final
 *               positions rather than where elements start their animation.
 * @returns `run`/`onDone` for <ProductTour>, and `pending` — true while the
 *          tour is still to be shown or showing, so other first-visit effects
 *          (the leaderboard's rank animation) can wait for it.
 */
export function usePageTour(id: PageTourId, ready: boolean, delay = 450) {
  const uid = useSessionUserId();
  const [seen, setSeen] = useState(() => hasSeenTour(id, uid));
  const [run, setRun] = useState(false);

  useEffect(() => {
    setSeen(hasSeenTour(id, uid));
  }, [id, uid]);

  useEffect(() => {
    if (!ready || seen) return;
    const t = setTimeout(() => setRun(true), delay);
    return () => clearTimeout(t);
  }, [ready, seen, delay]);

  const onDone = useCallback(() => {
    setRun(false);
    setSeen(true);
    markTourSeen(id, uid);
  }, [id, uid]);

  return { run, onDone, pending: !seen };
}

// ── Steps ────────────────────────────────────────────────────────────────

export const leaderboardTourSteps = (): TourStep[] => [
  {
    target: "lb-league",
    title: bi("دوريّك", "Your league"),
    body: bi(
      "نقاطك هذا الأسبوع تحدّد دوريّك — من البرونزي حتى الماسي.",
      "Your points this week decide your league — from Bronze up to Diamond.",
    ),
    prefer: "bottom",
  },
  {
    target: "lb-champion",
    title: bi("بطل الأسبوع", "Weekly champion"),
    body: bi(
      "صاحب أعلى نقاط في الأسبوع الماضي يظهر هنا ويحصل على إطار البطل.",
      "Last week's top scorer is featured here and wins the champion frame.",
    ),
    prefer: "bottom",
  },
  {
    target: "lb-me",
    title: bi("مركزك", "Your place"),
    body: bi(
      "هذا صفّك في الترتيب. أكمل مهامك لتصعد فوق غيرك.",
      "This is your row in the ranking. Finish your tasks to climb past others.",
    ),
    prefer: "bottom",
  },
  {
    target: "lb-promo",
    title: bi("منطقة الترقية", "Promotion zone"),
    body: bi(
      "الترتيب حسب نقاط هذا الأسبوع فقط، وأول ثلاثة يصعدون للدوري الأعلى.",
      "Ranked by this week's points only; the top three move up a league.",
    ),
    prefer: "bottom",
  },
  {
    target: "lb-earn",
    title: bi("كيف تكسب النقاط", "How to earn points"),
    body: bi(
      "كل مهمة تكملها تضيف نقطة، والنقاط الأسبوعية تتصفّر كل أسبوع.",
      "Every task you finish adds a point; weekly points reset every week.",
    ),
    prefer: "top",
  },
];

export const storyTourSteps = (): TourStep[] => [
  {
    target: "story-house",
    title: bi("بيتك", "Your home"),
    body: bi(
      "كل يوم تكمله يضيف قطعة جديدة لبيتك، من الأساس حتى اللافتة.",
      "Every day you complete adds a new piece to your home, from the foundation to the sign.",
    ),
    prefer: "top",
  },
  {
    target: "story-progress",
    title: bi("تقدّم البناء", "Building progress"),
    body: bi(
      "كم قطعة بنيت من أصل 21. الشريط يمتلئ مع كل يوم مكتمل.",
      "How many of the 21 pieces you have built. The bar fills with every completed day.",
    ),
    prefer: "top",
  },
  {
    target: "story-next",
    title: bi("القطعة التالية", "Next piece"),
    body: bi(
      "هذه القطعة التي ستُضاف عندما تكمل يومك القادم.",
      "This is the piece that lands when you complete your next day.",
    ),
    prefer: "top",
  },
];

export const storeTourSteps = (): TourStep[] => [
  {
    target: "store-balance",
    title: bi("رصيدك", "Your balance"),
    body: bi(
      "نقاطك التي جمعتها من المهام — تصرفها هنا.",
      "The points you earned from tasks — spend them here.",
    ),
    prefer: "bottom",
  },
  {
    target: "store-packs",
    title: bi("شراء النقاط", "Buy points"),
    body: bi(
      "تحتاج نقاطاً أكثر؟ اختر باقة واشحن رصيدك مباشرة.",
      "Need more points? Pick a pack and top up your balance directly.",
    ),
    prefer: "bottom",
  },
  {
    target: "store-freeze",
    title: bi("تجميد الستريك", "Streak Freeze"),
    body: bi(
      "يحمي ستريكك تلقائياً إذا فاتك يوم. تقدر تجهّز اثنين كحد أقصى.",
      "Protects your streak automatically if you miss a day. You can equip up to two.",
    ),
    prefer: "bottom",
  },
  {
    target: "store-chest",
    title: bi("صندوق الكنز", "Treasure Chest"),
    body: bi(
      "افتحه لتربح نقاطاً مضمونة، مع فرصة لثيمات وشارات نادرة.",
      "Open it for guaranteed points, plus a chance at rare themes and badges.",
    ),
    prefer: "top",
  },
];

export const statsTourSteps = (): TourStep[] => [
  {
    target: "stats-calendar",
    title: bi("تقويم التحدي", "Challenge calendar"),
    body: bi(
      "الأيام التي أكملتها معلَّمة هنا، فترى التزامك على مدار الشهر.",
      "Days you completed are marked here, so you can see your consistency across the month.",
    ),
    prefer: "bottom",
  },
  {
    target: "stats-habits",
    title: bi("متتبّع العادات", "Habit tracker"),
    body: bi(
      "كل عادة وكم مرة التزمت بها — اعرف أين تحتاج تركيزاً أكثر.",
      "Each habit and how often you kept it — see where you need more focus.",
    ),
    prefer: "top",
  },
  {
    target: "stats-summary",
    title: bi("أرقامك", "Your numbers"),
    body: bi(
      "نسبة الإنجاز الكلية، أفضل ستريك، الأيام المثالية ومعدّلك اليومي.",
      "Your overall rate, best streak, perfect days and daily average.",
    ),
    prefer: "top",
  },
  {
    target: "stats-wheel",
    title: bi("عجلة الحياة", "Wheel of Life"),
    body: bi(
      "توازن جوانب حياتك المختلفة في لمحة واحدة.",
      "The balance across the areas of your life, at a glance.",
    ),
    prefer: "top",
  },
];

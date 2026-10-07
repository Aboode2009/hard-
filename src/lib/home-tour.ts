import { bi } from "@/i18n/bi";
import type { TourStep } from "@/components/ProductTour";
import { hasSeenTour, markTourSeen } from "@/lib/page-tours";
import { storedSessionUserId } from "@/lib/session-user";

/**
 * The home-screen tour.
 *
 * Every `target` here matches a `data-tour` attribute on an element that is
 * really rendered by src/pages/Index.tsx, and the order follows the order those
 * elements appear down the screen. A step whose element is absent on the day
 * (an empty task list, a filtered view) is skipped by ProductTour rather than
 * pointing at nothing.
 *
 * Deliberately five steps: the tour covers what a first-time user needs to act,
 * not an inventory of the screen.
 */
/**
 * Seen-state is per user and shared with the other screens' tours — see
 * lib/page-tours.ts, which also migrates the old device-wide flag.
 */
export function hasSeenHomeTour(): boolean {
  return hasSeenTour("home", storedSessionUserId());
}

export function markHomeTourSeen() {
  markTourSeen("home", storedSessionUserId());
}

export const homeTourSteps = (): TourStep[] => [
  {
    target: "xp-bar",
    title: bi("مستواك وخبرتك", "Your level and XP"),
    body: bi(
      "كل مهمة تنجزها تمنحك خبرة، وعند امتلاء الشريط ترتفع مستوى وتفتح مكافأة.",
      "Every task you finish earns XP; fill the bar to level up and unlock a reward.",
    ),
    prefer: "bottom",
  },
  {
    target: "week-calendar",
    title: bi("أسبوعك", "Your week"),
    body: bi(
      "الأيام التي أكملتها تظهر معلَّمة هنا — حافظ على التتابع بلا انقطاع.",
      "Days you completed are marked here — keep them unbroken.",
    ),
    prefer: "bottom",
  },
  {
    target: "task-list",
    title: bi("مهام اليوم", "Today's tasks"),
    body: bi(
      "اضغط على دائرة المهمة لتعليمها كمكتملة. الإنجاز نهائي ولا يمكن التراجع عنه.",
      "Tap a task's circle to mark it done. Completions are final.",
    ),
    prefer: "bottom",
  },
  {
    target: "complete-day",
    title: bi("أنهِ يومك", "Finish your day"),
    body: bi(
      "بعد إكمال كل المهام يصبح هذا الزر أخضر — اضغطه لتسجيل اليوم وكسب نقاطه.",
      "Once every task is done this button turns green — press it to bank the day and its points.",
    ),
    prefer: "top",
  },
  {
    target: "bottom-nav",
    title: bi("بقية التطبيق", "The rest of the app"),
    body: bi(
      "من هنا تصل إلى المتصدّرين والمتجر وملفك الشخصي.",
      "This is your way to the leaderboard, the store and your profile.",
    ),
    prefer: "top",
  },
];

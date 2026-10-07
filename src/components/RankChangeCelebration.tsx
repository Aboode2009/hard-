import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";
import { haptic } from "@/lib/haptics";
import { compareAndRemember, type RankBoard, type RankChange } from "@/lib/rank-memory";

/**
 * Climb / slip feedback on a leaderboard.
 *
 * The user's own row is marked with `data-rank-row="me"`. When their position
 * changed since the last visit, that row slides from where it used to be to
 * where it is now, and a short message appears mid-screen. Climbs get a light
 * confetti burst; slips a calm movement and an encouraging line — never a
 * scolding one.
 *
 * Everything moves on transform/opacity only, and prefers-reduced-motion
 * drops the movement and confetti, leaving just the message.
 */

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** "N places" with Arabic number agreement. */
const placesAr = (n: number) =>
  n === 1 ? "مركزاً واحداً" : n === 2 ? "مركزين" : n <= 10 ? `${n} مراكز` : `${n} مركزاً`;
const placesEn = (n: number) => `${n} ${n === 1 ? "place" : "places"}`;

const upMessages = (n: number) => [
  bi(`صعدت ${placesAr(n)}! 🔥`, `You climbed ${placesEn(n)}! 🔥`),
  bi(`تقدّمت ${placesAr(n)} في الترتيب! 🚀`, `Up ${placesEn(n)} in the ranking! 🚀`),
  bi(`رائع! ارتفعت ${placesAr(n)} ⭐`, `Nice! You rose ${placesEn(n)} ⭐`),
  bi(`شغل نار! +${n} في الترتيب 🏆`, `On fire! +${n} in the ranking 🏆`),
];

const downMessages = () => [
  bi("نزلت شوي، تقدر ترجع! كمّل مهامك 💪", "You slipped a little — you can climb back! Keep going 💪"),
  bi("الترتيب يتغيّر كل يوم — مهمة وحدة ترجّعك للأعلى 🌱", "Rankings shift every day — one task can lift you back up 🌱"),
  bi("غيرك تقدّم شوي، وأنت قدها! يلا نكمل 🔁", "Others moved ahead a bit — you've got this! Let's go 🔁"),
  bi("خطوة للوراء قبل القفزة! كمّل اليوم وارجع مكانك ✨", "A step back before the leap! Finish today and take your spot back ✨"),
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** Rows the movement travels at most, so a big jump still reads as one slide. */
const MAX_ROWS = 6;

interface Entry {
  user_id: string;
  rank: number;
  weekly_points: number;
}

/**
 * Evaluates the change once per visit, when the board is loaded with fresh
 * data, and plays it as soon as nothing else (a first-visit tour) is on screen.
 *
 * @param ready   Fresh board data is on screen (not a cached copy mid-refresh).
 * @param blocked Hold the animation back — e.g. the page's tour is pending.
 */
export function useRankChange(
  board: RankBoard,
  uid: string | null,
  entries: Entry[],
  ready: boolean,
  blocked: boolean,
) {
  const [change, setChange] = useState<RankChange>(null);
  const [message, setMessage] = useState<{ kind: "up" | "down"; text: string } | null>(null);
  const evaluated = useRef(false);
  const played = useRef(false);

  // 1. Compare once per mount, as soon as fresh data is in.
  useEffect(() => {
    if (evaluated.current || !ready || !uid) return;
    const me = entries.find((e) => e.user_id === uid);
    evaluated.current = true;
    if (!me) return; // not on this board — nothing to remember
    const boardTotal = entries.reduce((sum, e) => sum + (e.weekly_points || 0), 0);
    setChange(
      compareAndRemember(board, uid, { rank: me.rank, weeklyPoints: me.weekly_points, boardTotal }),
    );
  }, [board, uid, entries, ready]);

  // 2. Play it once nothing is in the way.
  useEffect(() => {
    if (!change || blocked || played.current) return;
    played.current = true;

    const reduce = prefersReducedMotion();
    const row = document.querySelector<HTMLElement>('[data-rank-row="me"]');
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = async () => {
      if (row && !reduce) {
        const r = row.getBoundingClientRect();
        if (r.top < 80 || r.bottom > window.innerHeight - 90) {
          row.scrollIntoView({ behavior: "smooth", block: "center" });
          await new Promise((res) => setTimeout(res, 380));
          if (cancelled) return;
        }
        const rows = Math.min(change.places, MAX_ROWS);
        // Came from below when climbing, from above when slipping.
        const from = (change.kind === "up" ? 1 : -1) * rows * row.offsetHeight;
        row.style.position = "relative";
        row.style.zIndex = "5";
        const controls = animate(
          row,
          change.kind === "up"
            ? { y: [from, 0], scale: [1, 1.04, 1] }
            : { y: [from, 0] },
          change.kind === "up"
            ? { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
            : { duration: 1.1, ease: "easeInOut" },
        );
        void controls.then(() => {
          row.style.zIndex = "";
        });
      }

      if (cancelled) return;
      setMessage({
        kind: change.kind,
        text: change.kind === "up" ? pick(upMessages(change.places)) : pick(downMessages()),
      });

      if (change.kind === "up") {
        haptic("medium");
        if (!reduce) {
          timers.push(
            setTimeout(() => {
              void confetti({
                particleCount: 45,
                spread: 65,
                startVelocity: 32,
                origin: { y: 0.55 },
                colors: ["#FFC800", "#58CC02", "#1CB0F6", "#FF4D8A"],
                disableForReducedMotion: true,
              });
            }, 450),
          );
        }
      }
      timers.push(setTimeout(() => setMessage(null), 3000));
    };

    void run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [change, blocked]);

  return { message, dismiss: () => setMessage(null) };
}

/** The mid-screen message. Tap anywhere on it to dismiss early. */
export const RankChangeMessage = ({
  message,
  onDismiss,
}: {
  message: { kind: "up" | "down"; text: string } | null;
  onDismiss: () => void;
}) => {
  useTranslation(); // keeps bi() reactive on language change
  const reduce = prefersReducedMotion();
  const up = message?.kind === "up";

  return (
    <AnimatePresence>
      {message && (
        <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center px-6">
          <motion.button
            type="button"
            onClick={onDismiss}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 26 }}
            className="pointer-events-auto max-w-xs rounded-3xl px-6 py-5 text-center text-lg font-extrabold leading-snug"
            style={{
              background: "hsl(var(--duo-surface))",
              color: "hsl(var(--duo-text))",
              border: `2px solid ${up ? "#58CC02" : "hsl(var(--duo-border))"}`,
              boxShadow: `0 5px 0 ${up ? "#58A700" : "hsl(var(--duo-edge))"}`,
            }}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
};

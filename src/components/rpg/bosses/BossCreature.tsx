import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { BossGroups, BossKind } from "./types";

const ART = {
  dragon: lazy(() => import("./BossDragon").then((m) => ({ default: m.BossDragon }))),
  demon: lazy(() => import("./BossDemon").then((m) => ({ default: m.BossDemon }))),
  phantom: lazy(() => import("./BossPhantom").then((m) => ({ default: m.BossPhantom }))),
  monster: lazy(() => import("./BossMonster").then((m) => ({ default: m.BossMonster }))),
} as const;

export type BossState = "idle" | "hit" | "angry" | "defeated" | "victory";

/**
 * Spring "personality" per state. These are the settle springs — what the part
 * does once the impulse is over — so each state ends with its own character of
 * damped oscillation instead of a uniform stop.
 */
const SPRINGS = {
  /** Heavy, sleepy: high mass, high damping. Barely moves, slowly. */
  idle: { type: "spring", stiffness: 45, damping: 20, mass: 2.4 },
  /** Sharp impact, loose rebound — the wobble is the point. */
  hit: { type: "spring", stiffness: 620, damping: 11, mass: 0.8 },
  /** Awake and tense: quick to reach the pose, little overshoot. */
  angry: { type: "spring", stiffness: 260, damping: 18, mass: 1.1 },
  /** Dead weight: very heavy, over-damped, no bounce back. */
  defeated: { type: "spring", stiffness: 55, damping: 26, mass: 3.2 },
  /** Collapsing away as the player wins. */
  victory: { type: "spring", stiffness: 90, damping: 15, mass: 1.6 },
} as const;

/** Followers lag the body by this much — the basis of overlapping action. */
const LAG = { tail: 0.12, wings: 0.07, wingRight: 0.04, head: 0.03 };

interface BossCreatureProps {
  kind: BossKind;
  state?: BossState;
  /** Rendered width in px; height follows the 400x420 viewBox. */
  size?: number;
  className?: string;
}

/**
 * One animation controller for all four boss artworks.
 *
 * Physics notes, all load-bearing:
 *
 * • Squash and stretch preserve area — scaleX is the reciprocal of scaleY
 *   (0.86 ↔ 1.16), so the boss deforms rather than just changing size.
 * • `transformBox: "fill-box"` is what makes a percentage transform-origin
 *   resolve against each group's own bounding box. Without it SVG origins
 *   resolve against the user-space origin and squash looks like it pivots
 *   from the corner of the canvas.
 * • The ground shadow runs inverse to height: it shrinks and fades as the
 *   boss rises, grows and darkens as it lands, which is most of what sells
 *   the weight.
 * • Falls use `easeIn` tweens, not springs: gravity accelerates downward and
 *   a spring would make the drop symmetric with the rise.
 *
 * Performance: only transform and opacity are animated, looping tracks stop
 * when scrolled out of view, and `prefers-reduced-motion` drops to a static
 * pose.
 */
export const BossCreature = ({
  kind,
  state = "idle",
  size = 200,
  className = "",
}: BossCreatureProps) => {
  const reduceMotion = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [blink, setBlink] = useState(false);

  const Art = ART[kind];

  // Pause every looping track while off-screen.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const still = reduceMotion || !visible;

  // Irregular blinking — a fixed interval reads as a machine. Only while idle,
  // and never while off-screen or in reduced motion.
  useEffect(() => {
    if (still || state !== "idle") {
      setBlink(false);
      return;
    }
    let closeTimer: ReturnType<typeof setTimeout>;
    let nextTimer: ReturnType<typeof setTimeout>;

    const schedule = () => {
      // 2.2s–6.2s apart: long enough to feel sleepy, uneven enough to feel alive.
      nextTimer = setTimeout(() => {
        setBlink(true);
        closeTimer = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 190);
      }, 2200 + Math.random() * 4000);
    };
    schedule();

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(nextTimer);
    };
  }, [still, state]);

  const groups = useMemo<BossGroups>(() => {
    const originBottom = { transformBox: "fill-box", transformOrigin: "50% 100%" } as const;
    const originCenter = { transformBox: "fill-box", transformOrigin: "50% 50%" } as const;

    // Reduced motion / off-screen: hold a readable pose, animate nothing.
    if (still) {
      const defeated = state === "defeated" || state === "victory";
      return {
        body: {
          animate: { scaleY: defeated ? 0.9 : 1, scaleX: defeated ? 1.1 : 1, y: defeated ? 16 : 0 },
          style: originBottom,
        },
        head: { animate: { rotate: defeated ? 12 : 0 }, style: originBottom },
        eyes: { animate: { opacity: defeated ? 0.25 : 1 }, style: originCenter },
        glowLeft: { animate: { opacity: state === "angry" ? 1 : 0.6 }, style: originCenter },
        glowRight: { animate: { opacity: state === "angry" ? 1 : 0.6 }, style: originCenter },
        shadow: { animate: { scaleX: defeated ? 1.15 : 1, opacity: 1 }, style: originCenter },
      };
    }

    switch (state) {
      /**
       * Hit: anticipation is impossible (the blow is not ours to predict), so
       * the read comes from a hard squash on frame one that springs back with
       * a loose damping, while tail and wings arrive late and keep moving
       * after the body has settled.
       */
      case "hit":
        return {
          body: {
            animate: {
              scaleY: [1, 0.86, 1.06, 0.98, 1],
              scaleX: [1, 1.16, 0.96, 1.02, 1],
            },
            transition: { duration: 0.55, times: [0, 0.14, 0.42, 0.7, 1], ease: "easeOut" },
            style: originBottom,
          },
          head: {
            animate: { rotate: [0, -9, 5, -2, 0], y: [0, 5, -2, 0] },
            transition: { duration: 0.6, delay: LAG.head, ease: "easeOut" },
            style: originBottom,
          },
          tail: {
            animate: { rotate: [0, 11, -6, 3, 0] },
            transition: { duration: 0.85, delay: LAG.tail, ease: "easeOut" },
            style: originCenter,
          },
          wingLeft: {
            animate: { rotate: [0, -13, 7, -3, 0] },
            transition: { duration: 0.78, delay: LAG.wings, ease: "easeOut" },
            style: originCenter,
          },
          wingRight: {
            animate: { rotate: [0, 13, -7, 3, 0] },
            transition: { duration: 0.78, delay: LAG.wings + LAG.wingRight, ease: "easeOut" },
            style: originCenter,
          },
          // Eyes flare on impact.
          glowLeft: {
            animate: { opacity: [0.6, 1, 0.6], scale: [1, 1.5, 1] },
            transition: { duration: 0.5 },
            style: originCenter,
          },
          glowRight: {
            animate: { opacity: [0.6, 1, 0.6], scale: [1, 1.5, 1] },
            transition: { duration: 0.5, delay: 0.04 },
            style: originCenter,
          },
          // Inverse to the body: widest at the moment of maximum squash.
          shadow: {
            animate: { scaleX: [1, 1.18, 0.98, 1], opacity: [1, 1, 0.9, 1] },
            transition: { duration: 0.55, ease: "easeOut" },
            style: originCenter,
          },
        };

      /** Angry: awake. Lids up, pupils narrowed, breathing faster and shallower. */
      case "angry":
        return {
          body: {
            animate: { scaleY: [1, 1.035, 1], scaleX: [1, 0.985, 1], y: [0, -4, 0] },
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
            style: originBottom,
          },
          head: {
            animate: { rotate: [-1.5, 1.5, -1.5], y: -3 },
            transition: { rotate: { duration: 2.3, repeat: Infinity, ease: "easeInOut" }, y: SPRINGS.angry },
            style: originBottom,
          },
          tail: {
            animate: { rotate: [-5, 5, -5] },
            transition: { duration: 1.9, repeat: Infinity, ease: "easeInOut", delay: LAG.tail },
            style: originCenter,
          },
          wingLeft: {
            animate: { rotate: [-4, 2, -4] },
            transition: { duration: 1.7, repeat: Infinity, ease: "easeInOut", delay: LAG.wings },
            style: originCenter,
          },
          wingRight: {
            animate: { rotate: [4, -2, 4] },
            transition: {
              duration: 1.7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: LAG.wings + LAG.wingRight,
            },
            style: originCenter,
          },
          // Wide open — no blinking when enraged.
          eyes: { animate: { scaleY: 1.12 }, transition: SPRINGS.angry, style: originCenter },
          pupilLeft: { animate: { scaleX: 0.5 }, transition: SPRINGS.angry, style: originCenter },
          pupilRight: { animate: { scaleX: 0.5 }, transition: SPRINGS.angry, style: originCenter },
          glowLeft: {
            animate: { opacity: [0.85, 1, 0.85], scale: [1.15, 1.3, 1.15] },
            transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
            style: originCenter,
          },
          glowRight: {
            animate: { opacity: [0.85, 1, 0.85], scale: [1.15, 1.3, 1.15] },
            transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.15 },
            style: originCenter,
          },
          shadow: {
            animate: { scaleX: [1, 0.96, 1] },
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
            style: originCenter,
          },
        };

      /**
       * Defeated: a small anticipation rear-back, then the fall accelerates
       * (easeIn) and lands heavy. Nothing bounces — over-damped on purpose.
       */
      case "defeated":
        return {
          body: {
            animate: {
              y: [0, -6, 26, 22, 24],
              rotate: [0, -3, 12, 9, 10],
              scaleY: [1, 1.03, 0.88, 0.94, 0.92],
              scaleX: [1, 0.97, 1.14, 1.06, 1.08],
            },
            transition: {
              duration: 1.25,
              times: [0, 0.16, 0.55, 0.78, 1],
              ease: ["easeOut", "easeIn", "easeOut", "easeOut"],
            },
            style: originBottom,
          },
          head: {
            animate: { rotate: [0, -5, 20, 16, 18], y: [0, -3, 12, 10, 11] },
            transition: {
              duration: 1.45,
              delay: LAG.head,
              times: [0, 0.16, 0.55, 0.8, 1],
              ease: ["easeOut", "easeIn", "easeOut", "easeOut"],
            },
            style: originBottom,
          },
          tail: {
            animate: { rotate: [0, -8, 22, 16, 19] },
            transition: { duration: 1.7, delay: LAG.tail, ease: "easeOut" },
            style: originCenter,
          },
          wingLeft: {
            animate: { rotate: [0, 6, -22, -17, -19], opacity: 0.75 },
            transition: { duration: 1.6, delay: LAG.wings, ease: "easeOut" },
            style: originCenter,
          },
          wingRight: {
            animate: { rotate: [0, -6, 22, 17, 19], opacity: 0.75 },
            transition: { duration: 1.6, delay: LAG.wings + LAG.wingRight, ease: "easeOut" },
            style: originCenter,
          },
          // The light goes out.
          eyes: { animate: { opacity: 0.2, scaleY: 0.35 }, transition: { duration: 0.7, delay: 0.4 }, style: originCenter },
          glowLeft: { animate: { opacity: 0 }, transition: { duration: 0.8, delay: 0.3 }, style: originCenter },
          glowRight: { animate: { opacity: 0 }, transition: { duration: 0.8, delay: 0.3 }, style: originCenter },
          // Spreads and darkens under the collapsed weight.
          shadow: {
            animate: { scaleX: [1, 0.9, 1.22, 1.16, 1.18], opacity: [1, 0.85, 1, 1, 1] },
            transition: { duration: 1.25, times: [0, 0.16, 0.55, 0.8, 1], ease: "easeOut" },
            style: originCenter,
          },
        };

      /** Victory (the player won): the boss shrinks away and dissolves. */
      case "victory":
        return {
          body: {
            animate: { scaleY: [1, 1.05, 0.2], scaleX: [1, 0.95, 0.3], y: [0, -8, 30], opacity: [1, 1, 0] },
            transition: { duration: 1.1, times: [0, 0.2, 1], ease: ["easeOut", "easeIn"] },
            style: originBottom,
          },
          head: {
            animate: { y: [0, -10, 26], opacity: [1, 1, 0], rotate: [0, -4, 14] },
            transition: { duration: 1.2, delay: LAG.head, ease: "easeIn" },
            style: originBottom,
          },
          tail: { animate: { opacity: 0, rotate: 18 }, transition: { duration: 1, delay: LAG.tail }, style: originCenter },
          wingLeft: { animate: { opacity: 0, rotate: -20 }, transition: { duration: 1, delay: LAG.wings }, style: originCenter },
          wingRight: { animate: { opacity: 0, rotate: 20 }, transition: { duration: 1, delay: LAG.wings + LAG.wingRight }, style: originCenter },
          glowLeft: { animate: { opacity: 0 }, transition: { duration: 0.5 }, style: originCenter },
          glowRight: { animate: { opacity: 0 }, transition: { duration: 0.5 }, style: originCenter },
          shadow: { animate: { scaleX: 0.4, opacity: 0 }, transition: { duration: 1.1, ease: "easeIn" }, style: originCenter },
        };

      /**
       * Idle: slow heavy breathing on two non-harmonic periods (4.3s body,
       * 6.7s sway) so the loop never lines up and never reads as a cycle.
       */
      default:
        return {
          body: {
            animate: { scaleY: [1, 1.028, 1], scaleX: [1, 0.988, 1], y: [0, -3, 0] },
            transition: { duration: 4.3, repeat: Infinity, ease: "easeInOut" },
            style: originBottom,
          },
          head: {
            animate: { rotate: [-1.8, 1.8, -1.8], y: [0, -2, 0] },
            transition: {
              rotate: { duration: 6.7, repeat: Infinity, ease: "easeInOut" },
              y: { duration: 4.3, repeat: Infinity, ease: "easeInOut", delay: LAG.head },
            },
            style: originBottom,
          },
          tail: {
            animate: { rotate: [-3.5, 3.5, -3.5] },
            transition: { duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: LAG.tail },
            style: originCenter,
          },
          wingLeft: {
            animate: { rotate: [-2.5, 1.5, -2.5] },
            transition: { duration: 5.1, repeat: Infinity, ease: "easeInOut", delay: LAG.wings },
            style: originCenter,
          },
          wingRight: {
            animate: { rotate: [2.5, -1.5, 2.5] },
            transition: {
              duration: 5.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: LAG.wings + LAG.wingRight,
            },
            style: originCenter,
          },
          // Blink: a fast close, a slower open — the way a real lid moves.
          eyes: {
            animate: { scaleY: blink ? 0.08 : 1 },
            transition: blink
              ? { duration: 0.07, ease: "easeIn" }
              : { type: "spring", stiffness: 320, damping: 22, mass: 0.6 },
            style: originCenter,
          },
          glowLeft: {
            animate: { opacity: [0.45, 0.7, 0.45] },
            transition: { duration: 3.7, repeat: Infinity, ease: "easeInOut" },
            style: originCenter,
          },
          glowRight: {
            animate: { opacity: [0.45, 0.7, 0.45] },
            transition: { duration: 3.7, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            style: originCenter,
          },
          // Inverse of the breath: smallest when the body is at its highest.
          shadow: {
            animate: { scaleX: [1, 0.97, 1], opacity: [1, 0.92, 1] },
            transition: { duration: 4.3, repeat: Infinity, ease: "easeInOut" },
            style: originCenter,
          },
        };
    }
  }, [state, still, blink]);

  return (
    <div
      ref={hostRef}
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size }}
      aria-hidden="true"
    >
      <motion.svg
        viewBox="0 0 400 420"
        width={size}
        height={size * (420 / 400)}
        style={{ display: "block", width: "100%", height: "auto", willChange: still ? undefined : "transform" }}
        // Whole-creature recoil on impact, separate from the body squash so the
        // two compose instead of overwriting each other.
        animate={state === "hit" && !still ? { x: [0, -9, 8, -4, 2, 0] } : { x: 0 }}
        transition={state === "hit" ? { duration: 0.42, ease: "easeOut" } : SPRINGS.idle}
      >
        <Suspense fallback={null}>
          <Art groups={groups} />
        </Suspense>

        {/*
          Impact flash. Opacity-only (a CSS filter would re-rasterize the whole
          creature every frame), drawn over the body with `screen` so it reads
          as light rather than a red sheet.
        */}
        <motion.ellipse
          cx="200"
          cy="270"
          rx="150"
          ry="160"
          fill="#FF3B30"
          style={{ mixBlendMode: "screen", pointerEvents: "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: state === "hit" && !still ? [0, 0.55, 0] : 0 }}
          transition={{ duration: 0.36, times: [0, 0.18, 1], ease: "easeOut" }}
        />
      </motion.svg>
    </div>
  );
};

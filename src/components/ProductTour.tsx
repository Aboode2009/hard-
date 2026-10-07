import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";

/**
 * Spotlight product tour over the real screen.
 *
 * Each step dims the page, cuts a hole around an element that is actually
 * mounted, and puts a small bubble beside it. Nothing is drawn from a mock:
 * targets are found by `data-tour` attribute, so a step whose element is not on
 * screen (a conditional section, a filtered-away list) is skipped rather than
 * pointing at nothing.
 *
 * ── Why an SVG mask ────────────────────────────────────────────────────
 * The obvious spotlight is a div with a huge `box-shadow`, moved by changing
 * top/left/width/height — four layout properties, animated, every frame. Here
 * the dimming is one full-screen `<rect>` whose mask hole is another `<rect>`.
 * SVG geometry attributes do not participate in CSS box layout, so animating
 * the hole cannot reflow the page behind it; the bubble moves on `transform`
 * alone. The overlay never blocks the page from rendering — it mounts after
 * the page does, and the page stays fully interactive underneath once the tour
 * ends.
 */

export interface TourStep {
  /** Matches `data-tour="..."` on the real element. */
  target: string;
  title: string;
  body: string;
  /** Preferred bubble side; flips automatically when there is no room. */
  prefer?: "top" | "bottom";
}

interface ProductTourProps {
  steps: TourStep[];
  /** Tour runs only while true. */
  run: boolean;
  /** Called when the tour ends, by finishing or skipping. */
  onDone: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Breathing room around the highlighted element, in px. */
const PAD = 8;
/** Ring stroke width, kept inside the viewport so the outline is never cut. */
const RING = 2;
const BUBBLE_W = 288;
const BUBBLE_GAP = 14;
/** Side margin so the bubble never touches the screen edge. */
const EDGE = 12;

/** An element that is mounted but empty (a wrapper whose child rendered
 *  nothing) counts as absent, so its step is skipped instead of circling air. */
const findTarget = (name: string): HTMLElement | null => {
  const el = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
};

/**
 * Heights of the system bars. The app draws edge-to-edge, so `innerHeight`
 * includes the status bar and the gesture/navigation bar; a bubble placed
 * against the raw edges had its buttons under the gesture pill or the notch.
 */
const safeAreaInset = (side: "top" | "bottom"): number => {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;${side}:0;height:env(safe-area-inset-${side},0px);visibility:hidden;pointer-events:none`;
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
};

const measure = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

/** True when the element sits well inside the viewport already. */
const isComfortablyVisible = (r: Rect) =>
  r.top >= 64 && r.top + r.height <= window.innerHeight - 64;

export const ProductTour = ({ steps, run, onDone }: ProductTourProps) => {
  useTranslation(); // keeps bi() reactive on language change

  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  /** Nothing is painted until a target has been located and scrolled to. */
  const [ready, setReady] = useState(false);
  const cancelled = useRef(false);
  /**
   * The bubble's real rendered height. Its size depends on the device: the
   * system font-size setting scales WebView text, narrow screens wrap more
   * lines, and Arabic runs longer than English. Placing it from a guessed
   * height pushed the buttons off-screen on some phones, so it is measured
   * and the bubble stays invisible until it has been.
   */
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState<number | null>(null);

  // Callers build `steps` inline (`steps={homeTourSteps()}`), so it is a new
  // array on every render of the page. Depending on it directly restarted the
  // tour at step 1 on each re-render — and the home screen re-renders every
  // second once the day is done (the midnight countdown), which pinned the
  // tour to 1/5. Read the latest values through refs instead; only `run`
  // starts or restarts a tour.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const finish = useCallback(() => {
    cancelled.current = true;
    onDoneRef.current();
  }, []);

  /**
   * Locates step `i`, scrolling to it if needed, and skips forward past any
   * step whose element is not on the page.
   */
  const goTo = useCallback(
    async (i: number) => {
      setReady(false);
      setBubbleH(null);
      const steps = stepsRef.current;

      for (let step = i; step < steps.length; step++) {
        if (cancelled.current) return;

        // The page may still be settling on first mount, so give each target a
        // short window to appear rather than dropping the step immediately.
        let el: HTMLElement | null = null;
        for (let attempt = 0; attempt < 12 && !el; attempt++) {
          el = findTarget(steps[step].target);
          if (!el) await new Promise((r) => setTimeout(r, 100));
        }
        if (!el) continue; // not on this screen — skip the step entirely

        let r = measure(el);
        if (!isComfortablyVisible(r)) {
          el.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "center",
          });
          // Let the scroll settle before measuring, or the hole lands where the
          // element used to be.
          await new Promise((res) => setTimeout(res, reduceMotion ? 60 : 420));
          if (cancelled.current) return;
          r = measure(el);
        }

        setIndex(step);
        setRect(r);
        setReady(true);
        return;
      }

      // Ran off the end without finding anything left to show.
      finish();
    },
    [reduceMotion, finish],
  );

  // Start / restart.
  useLayoutEffect(() => {
    if (!run) return;
    cancelled.current = false;
    setIndex(0);
    void goTo(0);
    return () => {
      cancelled.current = true;
    };
  }, [run, goTo]);

  // Keep the hole on the element if the viewport changes underneath it.
  useEffect(() => {
    if (!run || !ready) return;
    const reflow = () => {
      const el = findTarget(stepsRef.current[index]?.target ?? "");
      if (el) setRect(measure(el));
    };
    window.addEventListener("resize", reflow);
    window.addEventListener("orientationchange", reflow);
    // Sections that finish loading after the tour started (a list, a card
    // that fills in) shift everything below them; follow the target.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reflow) : null;
    ro?.observe(document.body);
    return () => {
      window.removeEventListener("resize", reflow);
      window.removeEventListener("orientationchange", reflow);
      ro?.disconnect();
    };
  }, [run, ready, index]);

  // Measure the bubble once it is laid out, and again whenever its size
  // changes (font load, rotation, language switch).
  useLayoutEffect(() => {
    if (!run || !ready) return;
    const el = bubbleRef.current;
    if (!el) return;
    const read = () => setBubbleH(el.offsetHeight);
    read();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(read) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [run, ready, index]);

  // Escape ends the tour, same as skipping.
  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, finish]);

  if (!run || !ready || !rect) return null;

  const step = steps[index];
  const isLast = index === steps.length - 1;

  /**
   * The padded hole, clamped to the viewport.
   *
   * An element pinned to an edge — the bottom navigation bar is the one here —
   * has no room for padding on that side, so an unclamped box put the ring's
   * bottom and sides off-screen and it rendered as three broken lines. RING is
   * the stroke width, kept inside so the outline is drawn in full.
   */
  const hole = (() => {
    const left = Math.max(RING, rect.left - PAD);
    const top = Math.max(RING, rect.top - PAD);
    const right = Math.min(window.innerWidth - RING, rect.left + rect.width + PAD);
    const bottom = Math.min(window.innerHeight - RING, rect.top + rect.height + PAD);
    return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
  })();

  // The area the bubble must stay inside: clear of the status bar / notch and
  // of the gesture bar.
  const viewTop = safeAreaInset("top") + EDGE;
  const viewBottom = window.innerHeight - safeAreaInset("bottom") - EDGE;
  const maxBubbleH = Math.max(0, viewBottom - viewTop);
  // Until measured, assume the bubble fills the screen; it is invisible then.
  const h = Math.min(bubbleH ?? maxBubbleH, maxBubbleH);

  // On the preferred side when the whole bubble fits there, else the other
  // side, else over the target — always clamped fully on screen, so the
  // buttons can never end up outside it.
  const fitsBelow = hole.y + hole.h + BUBBLE_GAP + h <= viewBottom;
  const fitsAbove = hole.y - BUBBLE_GAP - h >= viewTop;
  const below = hole.y + hole.h + BUBBLE_GAP;
  const above = hole.y - BUBBLE_GAP - h;
  // Neither fits: take the roomier side and let the clamp slide the bubble
  // over the target only as far as it must.
  const roomier = viewBottom - below >= above + h - viewTop ? below : above;
  let bubbleY: number;
  if (step.prefer === "top") {
    bubbleY = fitsAbove ? above : fitsBelow ? below : roomier;
  } else {
    bubbleY = fitsBelow ? below : fitsAbove ? above : roomier;
  }
  bubbleY = Math.min(Math.max(viewTop, bubbleY), viewBottom - h);

  const bubbleW = Math.min(BUBBLE_W, window.innerWidth - EDGE * 2);
  const bubbleX = Math.min(
    Math.max(EDGE, hole.x + hole.w / 2 - bubbleW / 2),
    window.innerWidth - bubbleW - EDGE,
  );

  return (
    <div
      className="fixed inset-0 z-[120]"
      role="dialog"
      aria-modal="true"
      aria-label={bi("جولة تعريفية", "Product tour")}
    >
      {/* Dimming + the hole. Geometry lives in SVG, so moving it cannot
          reflow the page underneath. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id="tour-hole">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={hole.x}
              y={hole.y}
              width={hole.w}
              height={hole.h}
              rx="16"
              fill="black"
              style={{
                transition: reduceMotion ? "none" : "all 280ms cubic-bezier(.4,0,.2,1)",
              }}
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.72)"
          mask="url(#tour-hole)"
        />
      </svg>

      {/* Ring around the highlighted element. Outline only — it draws on top of
          the real element without covering it. */}
      <div
        className="pointer-events-none absolute rounded-2xl ring-2 ring-primary"
        style={{
          top: 0,
          left: 0,
          width: hole.w,
          height: hole.h,
          transform: `translate3d(${hole.x}px, ${hole.y}px, 0)`,
          transition: reduceMotion ? "none" : "transform 280ms cubic-bezier(.4,0,.2,1)",
          willChange: "transform",
        }}
      />

      {/* Swallows taps on the dimmed area so the page cannot be used mid-tour. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <div
        ref={bubbleRef}
        className="absolute flex flex-col rounded-2xl border border-border bg-card p-4 shadow-2xl"
        style={{
          top: 0,
          left: 0,
          width: bubbleW,
          // A screen too short for the whole text scrolls the text; the
          // buttons below it always stay visible.
          maxHeight: maxBubbleH,
          visibility: bubbleH === null ? "hidden" : "visible",
          transform: `translate3d(${bubbleX}px, ${bubbleY}px, 0)`,
          transition:
            reduceMotion || bubbleH === null
              ? "none"
              : "transform 280ms cubic-bezier(.4,0,.2,1)",
          willChange: "transform",
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="text-base font-extrabold text-foreground">{step.title}</p>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </div>

        {/* Wraps instead of pushing "Next" past the bubble's edge on narrow
            screens or with a large system font. */}
        <div className="mt-3.5 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-xs font-bold tabular-nums text-muted-foreground" dir="ltr">
            <span dir="ltr">{index + 1} / {steps.length}</span>
          </span>

          <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
            {/* Available on every step, including the last. */}
            <button
              type="button"
              onClick={finish}
              className="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold text-muted-foreground"
            >
              {bi("تخطّي الجولة", "Skip tour")}
            </button>
            <button
              type="button"
              onClick={() => (isLast ? finish() : void goTo(index + 1))}
              className="whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground"
            >
              {isLast ? bi("إنهاء", "Finish") : bi("التالي", "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

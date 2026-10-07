import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";

// Brand pink from the app logo ("21" inside a circular arrow).
const PINK = "#FF4D8A";
const CYAN = "#2EF2FF";
const BG = "#070608";
const FONT = "'Archivo', system-ui, sans-serif";

/*
 * App-startup animation: two slot-machine reels spin and stop on 2 then 1,
 * the 21 glitches, a scan line sweeps, a laser draws the logo's circular
 * arrow, the logo thumps and throws sparks, then flies at the camera to
 * reveal the app.
 *
 * Two rules keep it smooth on phones:
 *  1. It plays while the whole app boots underneath, so the main thread is
 *     busy. Every animation moves only `transform` and `opacity`, which the
 *     GPU compositor runs by itself — no animated filter, stroke-dashoffset,
 *     clip-path, letter-spacing or blend modes (those stuttered badly).
 *  2. The motion is physical: reel friction and spring capture, squash on
 *     impact, spring thumps, inertia, sparks under gravity. Simulated once
 *     here at load and baked into keyframes sampled at 60 fps, so the
 *     compositor still plays it without any JavaScript per frame.
 */

// ---------------------------------------------------------------- timeline
/** Moments, in seconds from launch. */
const AT = {
  reel1: 0.7, // reel 1 reaches "2" (then springs into place)
  reel2: 1.0, // reel 2 reaches "1"
  glitch: 1.2,
  scan: 1.22,
  ring: 1.32, // the laser starts drawing the ring
  ringDone: 1.82, // ring closed: thump, sparks, arrowhead
  word: 1.95,
  unveil: 2.3, // the app underneath gets painted (see SplashScreen)
  exit: 2.55, // anticipation, then the logo flies at the camera
};
/** Total length; the splash unmounts here. */
const T = 3.1;
const FRAME = 1 / 60;

const pct = (s: number) => `${Math.min(100, Math.max(0, (s / T) * 100)).toFixed(3)}%`;
type Key = [number, string];
/** Keyframes from (time, declarations) pairs; holds the ends. */
const keyframes = (name: string, keys: Key[]) => {
  const sorted = [...keys].sort((a, b) => a[0] - b[0]);
  const body = sorted.map(([t, d]) => `${pct(t)}{${d}}`).join("");
  return `@keyframes ${name}{0%{${sorted[0][1]}}${body}100%{${sorted[sorted.length - 1][1]}}}`;
};
/** Samples f over [t0, t1] at 60 fps. */
const sample = (t0: number, t1: number, f: (t: number) => string): Key[] => {
  const out: Key[] = [];
  for (let t = t0; t < t1; t += FRAME) out.push([t, f(t - t0)]);
  out.push([t1, f(t1 - t0)]);
  return out;
};
/** Damped spring x'' = -w²(x-to) - 2zw x', integrated finely; x at time t. */
const spring = (from: number, to: number, v0: number, w: number, z: number) => {
  const dt = 1 / 1200;
  const xs: number[] = [];
  let x = from;
  let v = v0;
  for (let i = 0; i < 1200 * 2; i++) {
    xs.push(x);
    const a = -w * w * (x - to) - 2 * z * w * v;
    v += a * dt;
    x += v * dt;
  }
  return (t: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(t * 1200)))];
};

// ---------------------------------------------------------------- reels
const SLOT_H = 120;
/*
 * Digits are SVG text placed by their baseline. As HTML text their height in
 * the window came from the font's ascent/descent, which Android reads
 * differently from desktop: on the phone they sat low and the digit above
 * showed as a bar along the window's top.
 */
const DIGIT_SIZE = 124;
const CAP = 87; // the digits' height at DIGIT_SIZE (measured)
const BASELINE = (SLOT_H + CAP) / 2; // centres a digit in its 120px cell
const STOP1 = 12; // index of "2" on reel 1
const STOP2 = 21; // index of "1" on reel 2
/**
 * Each reel is one short loop of the digits (0–9 plus 0,1 for the wrap) and
 * its travel is wrapped onto it. A long strip had to be rasterized piece by
 * piece while it spun, which stalled frames on the phone.
 */
const LOOP = 10 * SLOT_H;
const REEL_DIGITS = 12;
const wrap = (y: number) => {
  const m = ((y % LOOP) + LOOP) % LOOP; // 0..LOOP
  return m === 0 ? 0 : m - LOOP; // (-LOOP, 0]
};

/**
 * A reel's travel: a small wind-up the other way, then a free spin slowing
 * under friction (v = v0·e^(-λt)) that reaches the stop at `arrive` still
 * moving at `vArrive`, then a spring catches it there — overshoot, settle.
 * Returns position and speed over time.
 */
const reelMotion = (stop: number, start: number, arrive: number, vArrive: number) => {
  const windUp = 16;
  const windT = 0.09;
  const D = stop * SLOT_H + windUp; // distance covered by the free spin
  const tA = arrive - start - windT;
  // Friction rate λ such that the spin covers D in tA and ends at vArrive.
  const f = (l: number) => (vArrive + l * D) * Math.exp(-l * tA) - vArrive;
  let lo = 0.01;
  let hi = 60;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  const lambda = lo;
  const v0 = vArrive + lambda * D;
  const catchSpring = spring(0, 0, vArrive, 26, 0.36);
  const pos = (t: number) => {
    // y offset is negative upward; positions as translateY
    if (t < start) return { y: 0, speed: 0 };
    const tt = t - start;
    if (tt < windT) {
      const k = Math.sin((tt / windT) * (Math.PI / 2));
      return { y: windUp * k, speed: 300 };
    }
    const ts = tt - windT;
    if (ts < tA) {
      const dist = (v0 / lambda) * (1 - Math.exp(-lambda * ts));
      return { y: windUp - dist, speed: v0 * Math.exp(-lambda * ts) };
    }
    const tc = ts - tA;
    const over = catchSpring(tc); // overshoot past the stop, positive = further up
    const v = (catchSpring(tc + 0.002) - over) / 0.002;
    return { y: -(stop * SLOT_H) - over, speed: Math.abs(v) };
  };
  return pos;
};
const reel1 = reelMotion(STOP1, 0, AT.reel1, 1500);
const reel2 = reelMotion(STOP2, 0.04, AT.reel2, 1500);
const smear = (speed: number) => Math.min(1, Math.max(0, (speed - 250) / 1600));

/** The wrapped travel; at each wrap the previous frame's value is continued
 *  past the loop's end so the jump back lands on an identical picture. */
const reelTravel = (motion: ReturnType<typeof reelMotion>, end: number): Key[] => {
  const keys: Key[] = [];
  let prev: number | null = null;
  for (let t = 0; t <= end + 1e-9; t += FRAME) {
    const y = wrap(motion(t).y);
    if (prev !== null && Math.abs(y - prev) > LOOP / 2) {
      keys.push([t - 0.0005, `transform:translateY(${(y > prev ? y - LOOP : y + LOOP).toFixed(1)}px)`]);
    }
    keys.push([t, `transform:translateY(${y.toFixed(1)}px)`]);
    prev = y;
  }
  return keys;
};
const reelKeys = (name: string, motion: ReturnType<typeof reelMotion>, end: number) => [
  keyframes(`${name}`, reelTravel(motion, end)),
  keyframes(`${name}Blur`, sample(0, end, (t) => `opacity:${smear(motion(t).speed).toFixed(3)}`)),
  keyframes(`${name}Sharp`, sample(0, end, (t) => `opacity:${(1 - 0.9 * smear(motion(t).speed)).toFixed(3)}`)),
];

/** Squash on impact, as a spring kicked at `at`: scaleY dips, scaleX bulges. */
const squash = (name: string, at: number) => {
  const s = spring(1, 1, -4.2, 30, 0.3);
  return keyframes(name, [
    [0, "transform:none"],
    ...sample(at, at + 0.7, (t) => {
      const y = s(t);
      return `transform:scale(${(1 / Math.sqrt(y)).toFixed(4)},${y.toFixed(4)})`;
    }),
  ]);
};

// ---------------------------------------------------------------- ring
// Radius 122 around the centre of a 300px stage, open at the upper right
// (-70°..-20°) like the logo, kept well clear of the digits. Drawn as short
// segments that switch on behind the laser; a smooth ring replaces them.
const C = 150;
const R = 122;
const THICK = 15;
const START = -20;
const SWEEP = 310;
const SEGMENTS = 36;
const SEG_LEN = 2 * R * Math.sin((SWEEP / SEGMENTS / 2) * (Math.PI / 180)) + 2;
const RING_EASE = [0.5, 0, 0.25, 1] as const;
const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
/** Laser progress 0..1 at time fraction x (cubic-bezier RING_EASE). */
const ringProgress = (x: number) => {
  const [x1, y1, x2, y2] = RING_EASE;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (bez(x1, x2, m) < x) lo = m;
    else hi = m;
  }
  return bez(y1, y2, (lo + hi) / 2);
};
const RING_DUR = AT.ringDone - AT.ring;
const segDelay = (frac: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    if (ringProgress(m) < frac) lo = m;
    else hi = m;
  }
  return AT.ring + RING_DUR * lo;
};
const segments = Array.from({ length: SEGMENTS }, (_, i) => {
  const frac = (i + 0.5) / SEGMENTS;
  return { angle: START + frac * SWEEP, delay: segDelay(frac) };
});
const ARC = (() => {
  const a0 = (START * Math.PI) / 180;
  const a1 = ((START + SWEEP) * Math.PI) / 180;
  const f = (n: number) => n.toFixed(2);
  return `M ${f(C + R * Math.cos(a0))} ${f(C + R * Math.sin(a0))} A ${R} ${R} 0 1 1 ${f(C + R * Math.cos(a1))} ${f(C + R * Math.sin(a1))}`;
})();
const END = ((START + SWEEP) * Math.PI) / 180;
const HEAD_POS = { x: C + R * Math.cos(END), y: C + R * Math.sin(END) };
const HEAD_ROT = START + SWEEP + 90;
const TAN = { x: -Math.sin(END), y: Math.cos(END) };
const TIP = { x: HEAD_POS.x + TAN.x * 26, y: HEAD_POS.y + TAN.y * 26 };

/** After closing, the ring keeps turning on its momentum and slows down. */
const INERTIA = (t: number) => (40 / 3.2) * (1 - Math.exp(-3.2 * t));

// ---------------------------------------------------------------- sparks
const SPARKS = (() => {
  let seed = 21;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const base = Math.atan2(TAN.y, TAN.x);
  return Array.from({ length: 16 }, () => {
    const a = base + (rnd() - 0.5) * 2.4;
    const v = 160 + rnd() * 320;
    return {
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 120,
      life: 0.5 + rnd() * 0.45,
      size: 3 + rnd() * 4,
    };
  });
})();
const GRAVITY = 950;

// ---------------------------------------------------------------- CSS
const anim = (cls: string, name: string, extra = "") =>
  `.${cls}{animation:${name} ${T}s linear both;${extra}}`;

const CSS = [
  `.hc-sp{position:fixed;inset:0;z-index:200;overflow:hidden;contain:strict;pointer-events:auto}`,
  `.hc-sp *{box-sizing:border-box}`,
  // The dark ground and the backdrop; they fade out last to reveal the app.
  `.hc-sp-ground{position:absolute;inset:0;background:${BG}}`,
  anim("hc-sp-ground", "hcGround"),
  keyframes("hcGround", [[0, "opacity:1"], [AT.exit + 0.1, "opacity:1"], [AT.exit + 0.45, "opacity:0"]]),
  `.hc-sp-bg{position:absolute;left:-30vw;top:-10vh;width:160vw;height:120vh;transform:rotate(-14deg)}`,
  `.hc-sp-row{white-space:nowrap;font-family:${FONT};font-style:italic;font-weight:900;font-size:62px;line-height:96px;color:transparent;-webkit-text-stroke:1px rgba(255,77,138,.28)}`,
  `.hc-sp-row.off{transform:translateX(-220px)}`,
  `.hc-sp-dim{position:absolute;inset:0;background:${BG}}`,
  anim("hc-sp-dim", "hcDim"),
  keyframes("hcDim", [[0, "opacity:1"], [0.25, "opacity:0"], [AT.glitch, "opacity:0"], [AT.glitch + 0.4, "opacity:.8"]]),
  `.hc-sp-glow{position:absolute;left:50%;top:50%;width:560px;height:380px;margin:-190px 0 0 -280px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,77,138,.26),rgba(255,77,138,0))}`,
  anim("hc-sp-glow", "hcGlow"),
  keyframes("hcGlow", [
    [0, "opacity:0;transform:scale(.8)"],
    [AT.scan, "opacity:0;transform:scale(.8)"],
    ...sample(AT.ringDone, AT.exit + 0.45, (t) => {
      // breathes while the logo rests, gone with the ground on the way out
      const out = Math.min(1, Math.max(0, (AT.exit + 0.45 - (AT.ringDone + t)) / 0.35));
      return `opacity:${(Math.min(1, t / 0.2) * (0.85 + 0.15 * Math.sin(t * 9)) * out).toFixed(3)};transform:scale(${(1 + 0.06 * Math.sin(t * 9)).toFixed(4)})`;
    }),
  ]),
  // Layout: everything scales to the phone (--fit), centred.
  `.hc-sp-center{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}`,
  `.hc-sp-fit{position:relative;width:300px;height:360px;transform:scale(var(--fit,1))}`,
  `.hc-sp-fly{position:absolute;inset:0}`,
  anim("hc-sp-fly", "hcFly"),
  keyframes("hcFly", [
    [0, "transform:scale(1);opacity:1"],
    [AT.exit, "transform:scale(1);opacity:1"],
    ...sample(AT.exit, AT.exit + 0.12, (t) => `transform:scale(${(1 - 0.06 * Math.sin((t / 0.12) * (Math.PI / 2))).toFixed(4)});opacity:1`),
    ...sample(AT.exit + 0.12, AT.exit + 0.5, (t) => {
      const k = t / 0.38;
      // Kept to 1.4×: a bigger zoom makes the browser rasterize every layer
      // at that size from the start.
      return `transform:scale(${(0.94 + 0.46 * k * k * k).toFixed(4)});opacity:${Math.max(0, 1 - Math.max(0, k - 0.15) / 0.6).toFixed(3)}`;
    }),
  ]),
  `.hc-sp-thump{position:absolute;left:0;top:0;width:300px;height:300px}`,
  anim("hc-sp-thump", "hcThump"),
  (() => {
    const s = spring(1, 1, 1.9, 17, 0.28);
    return keyframes("hcThump", [[0, "transform:none"], ...sample(AT.ringDone, AT.ringDone + 0.9, (t) => `transform:scale(${s(t).toFixed(4)})`)]);
  })(),
  // Reels
  `.hc-sp-slot{position:absolute;top:90px;width:88px;height:${SLOT_H}px;overflow:hidden}`,
  `.hc-sp-digits{position:absolute;left:0;top:0;width:88px;overflow:visible;fill:${PINK};font-family:${FONT};font-style:italic;font-weight:900;font-size:${DIGIT_SIZE}px;text-anchor:middle}`,
  `.hc-sp-s1{left:62px}`,
  `.hc-sp-s2{left:144px}`,
  `.hc-sp-strip{position:absolute;left:0;top:0;width:100%}`,
  `.hc-sp-squash1,.hc-sp-squash2{position:absolute;inset:0;transform-origin:50% 60%}`,
  anim("hc-sp-squash1", "hcSquash1"),
  anim("hc-sp-squash2", "hcSquash2"),
  squash("hcSquash1", AT.reel1),
  squash("hcSquash2", AT.reel2),
  anim("hc-sp-r1", "hcR1"),
  anim("hc-sp-r1b", "hcR1Blur"),
  anim("hc-sp-r1s", "hcR1Sharp"),
  anim("hc-sp-r2", "hcR2"),
  anim("hc-sp-r2b", "hcR2Blur"),
  anim("hc-sp-r2s", "hcR2Sharp"),
  ...reelKeys("hcR1", reel1, AT.reel1 + 0.6),
  ...reelKeys("hcR2", reel2, AT.reel2 + 0.6),
  // Glitch: colour ghosts jump about while the digits shake.
  `.hc-sp-ghost{position:absolute;inset:0;opacity:0}`,
  `.hc-sp-cyan .hc-sp-digits{fill:${CYAN}}`,
  `.hc-sp-white .hc-sp-digits{fill:#fff}`,
  anim("hc-sp-cyan", "hcCyan"),
  anim("hc-sp-white", "hcWhite"),
  anim("hc-sp-shake", "hcShake", "position:absolute;inset:0"),
  keyframes("hcCyan", [
    [0, "opacity:0;transform:none"],
    [AT.glitch - 0.001, "opacity:0;transform:none"],
    [AT.glitch, "opacity:.85;transform:translate(-9px,1px)"],
    [AT.glitch + 0.059, "opacity:.85;transform:translate(-9px,1px)"],
    [AT.glitch + 0.06, "opacity:.85;transform:translate(7px,-2px)"],
    [AT.glitch + 0.119, "opacity:.85;transform:translate(7px,-2px)"],
    [AT.glitch + 0.12, "opacity:.85;transform:translate(-5px,0)"],
    [AT.glitch + 0.179, "opacity:.85;transform:translate(-5px,0)"],
    [AT.glitch + 0.18, "opacity:0;transform:none"],
  ]),
  keyframes("hcWhite", [
    [0, "opacity:0;transform:none"],
    [AT.glitch + 0.029, "opacity:0;transform:none"],
    [AT.glitch + 0.03, "opacity:.7;transform:translate(8px,-1px)"],
    [AT.glitch + 0.089, "opacity:.7;transform:translate(8px,-1px)"],
    [AT.glitch + 0.09, "opacity:.7;transform:translate(-6px,2px)"],
    [AT.glitch + 0.149, "opacity:.7;transform:translate(-6px,2px)"],
    [AT.glitch + 0.15, "opacity:0;transform:none"],
  ]),
  keyframes("hcShake", [
    [0, "transform:none"],
    [AT.glitch - 0.001, "transform:none"],
    [AT.glitch, "transform:translate(3px,0) skewX(-7deg)"],
    [AT.glitch + 0.069, "transform:translate(3px,0) skewX(-7deg)"],
    [AT.glitch + 0.07, "transform:translate(-3px,0) skewX(6deg)"],
    [AT.glitch + 0.139, "transform:translate(-3px,0) skewX(6deg)"],
    [AT.glitch + 0.14, "transform:none"],
  ]),
  // Scan line
  `.hc-sp-scan{position:absolute;left:0;top:0;width:100%;height:2px;background:#fff;box-shadow:0 0 18px 4px ${PINK}}`,
  anim("hc-sp-scan", "hcScan"),
  keyframes("hcScan", [
    [0, "opacity:0;transform:translateY(-10px)"],
    [AT.scan - 0.001, "opacity:0;transform:translateY(-10px)"],
    ...sample(AT.scan, AT.scan + 0.34, (t) => {
      const k = t / 0.34;
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      return `opacity:1;transform:translateY(${(e * 100).toFixed(2)}vh)`;
    }),
    [AT.scan + 0.36, "opacity:0;transform:translateY(100vh)"],
  ]),
  // Ring
  `.hc-sp-spin{position:absolute;inset:0}`,
  anim("hc-sp-spin", "hcSpin"),
  keyframes("hcSpin", [[0, "transform:none"], ...sample(AT.ringDone, AT.exit + 0.5, (t) => `transform:rotate(${INERTIA(t).toFixed(3)}deg)`)]),
  `.hc-sp-seg{position:absolute;left:${C}px;top:${C}px;width:${THICK}px;height:${SEG_LEN.toFixed(2)}px;margin:${(-SEG_LEN / 2).toFixed(2)}px 0 0 ${-THICK / 2}px;background:${PINK};animation:hcIn .05s linear both}`,
  `@keyframes hcIn{from{opacity:0}to{opacity:1}}`,
  `.hc-sp-segs{position:absolute;inset:0}`,
  anim("hc-sp-segs", "hcSegs"),
  keyframes("hcSegs", [[0, "opacity:1"], [AT.ringDone + 0.05, "opacity:1"], [AT.ringDone + 0.1, "opacity:0"]]),
  `.hc-sp-ring{position:absolute;left:0;top:0;width:300px;height:300px;overflow:visible}`,
  anim("hc-sp-ring", "hcRing"),
  keyframes("hcRing", [[0, "opacity:0"], [AT.ringDone - 0.02, "opacity:0"], [AT.ringDone + 0.05, "opacity:1"]]),
  `.hc-sp-laser{position:absolute;inset:0}`,
  anim("hc-sp-laser", "hcLaser"),
  keyframes("hcLaser", [
    [0, `opacity:0;transform:rotate(${START}deg)`],
    [AT.ring - 0.001, `opacity:0;transform:rotate(${START}deg)`],
    ...sample(AT.ring, AT.ringDone, (t) => `opacity:1;transform:rotate(${(START + SWEEP * ringProgress(t / RING_DUR)).toFixed(2)}deg)`),
    [AT.ringDone + 0.06, `opacity:0;transform:rotate(${START + SWEEP}deg)`],
  ]),
  `.hc-sp-dot{position:absolute;left:${C + R - 10}px;top:${C - 10}px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 0 10px 3px #fff,0 0 26px 8px ${PINK}}`,
  `.hc-sp-headpos{position:absolute;width:0;height:0}`,
  `.hc-sp-head{position:absolute;left:-4px;top:-19px;width:32px;height:38px;background:${PINK};clip-path:polygon(0 0,100% 50%,0 100%);transform-origin:0 50%}`,
  anim("hc-sp-head", "hcHead"),
  (() => {
    const s = spring(0, 1, 9, 24, 0.32);
    return keyframes("hcHead", [[0, "transform:scale(0)"], [AT.ringDone - 0.02, "transform:scale(0)"], ...sample(AT.ringDone - 0.02, AT.ringDone + 0.6, (t) => `transform:scale(${Math.max(0, s(t)).toFixed(4)})`)]);
  })(),
  `.hc-sp-shock{position:absolute;left:${C - R}px;top:${C - R}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;border:3px solid ${PINK}}`,
  anim("hc-sp-shock", "hcShock"),
  keyframes("hcShock", [
    [0, "opacity:0;transform:scale(.9)"],
    [AT.ringDone - 0.001, "opacity:0;transform:scale(.9)"],
    ...sample(AT.ringDone, AT.ringDone + 0.55, (t) => {
      const k = t / 0.55;
      const e = 1 - (1 - k) ** 3;
      return `opacity:${(0.85 * (1 - k)).toFixed(3)};transform:scale(${(0.95 + 0.9 * e).toFixed(4)})`;
    }),
  ]),
  // Sparks thrown off the arrowhead, falling under gravity.
  `.hc-sp-spark{position:absolute;border-radius:50%;background:#fff;box-shadow:0 0 6px 2px ${PINK}}`,
  ...SPARKS.map((s, i) => [
    anim(`hc-sp-k${i}`, `hcK${i}`),
    keyframes(`hcK${i}`, [
      [0, "opacity:0;transform:none"],
      [AT.ringDone - 0.001, "opacity:0;transform:none"],
      ...sample(AT.ringDone, AT.ringDone + s.life, (t) => {
        const k = t / s.life;
        const x = s.vx * t;
        const y = s.vy * t + 0.5 * GRAVITY * t * t;
        return `opacity:${(1 - k * k).toFixed(3)};transform:translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(1 - 0.7 * k).toFixed(3)})`;
      }),
    ]),
  ].join("")),
  // Wordmark drops in on a spring.
  `.hc-sp-word{position:absolute;left:-40px;right:-40px;top:318px;text-align:center;color:#fff;font-family:${FONT};font-style:italic;font-weight:900;font-size:13px;letter-spacing:7px}`,
  anim("hc-sp-word", "hcWord"),
  (() => {
    const s = spring(1, 0, 0, 20, 0.38);
    return keyframes("hcWord", [[0, "opacity:0;transform:translateY(16px)"], [AT.word, "opacity:0;transform:translateY(16px)"], ...sample(AT.word, AT.word + 0.7, (t) => `opacity:${(0.78 * Math.min(1, t / 0.25)).toFixed(3)};transform:translateY(${(16 * s(t)).toFixed(2)}px)`)]);
  })(),
].join("\n");

// ---------------------------------------------------------------- view
/** Motion smear: faded copies above and below each digit. */
const SMEAR = [
  { dy: -48, o: 0.22 },
  { dy: -24, o: 0.5 },
  { dy: 0, o: 1 },
  { dy: 24, o: 0.5 },
  { dy: 48, o: 0.22 },
];

const column = (n: number, blur: boolean, className: string) => (
  <svg className={`hc-sp-digits ${className}`} width={88} height={n * SLOT_H}>
    {Array.from({ length: n }, (_, k) =>
      (blur ? SMEAR : [{ dy: 0, o: 1 }]).map(({ dy, o }) => (
        <text key={`${k}:${dy}`} x={44} y={k * SLOT_H + BASELINE + dy} fillOpacity={o}>
          {k % 10}
        </text>
      )),
    )}
  </svg>
);

const Reel = ({ n, slot, r }: { n: number; slot: string; r: "r1" | "r2" }) => (
  <div className={`hc-sp-slot ${slot}`}>
    <div className={`hc-sp-squash${r === "r1" ? "1" : "2"}`}>
      <div className={`hc-sp-strip hc-sp-${r}`}>
        {column(n, true, `hc-sp-${r}b`)}
        {column(n, false, `hc-sp-${r}s`)}
      </div>
    </div>
  </div>
);

const digit = (d: number) => (
  <svg className="hc-sp-digits" width={88} height={SLOT_H}>
    <text x={44} y={BASELINE}>{d}</text>
  </svg>
);

const Digits = () => (
  <>
    <div className="hc-sp-slot hc-sp-s1">{digit(2)}</div>
    <div className="hc-sp-slot hc-sp-s2">{digit(1)}</div>
  </>
);

/** Everything that animates; mounted when the timeline starts. */
const Scene = () => (
  <>
    <div className="hc-sp-ground">
      <div className="hc-sp-bg">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={i % 2 ? "hc-sp-row off" : "hc-sp-row"}>
            {"HARD CHALLENGE — ".repeat(3)}
          </div>
        ))}
      </div>
      <div className="hc-sp-dim" />
    </div>
    <div className="hc-sp-glow" />

    <div className="hc-sp-center">
      <div className="hc-sp-fit" style={{ ["--fit" as string]: fitScale() }}>
        <div className="hc-sp-fly">
          <div className="hc-sp-thump">
            <div className="hc-sp-ghost hc-sp-cyan"><Digits /></div>
            <div className="hc-sp-ghost hc-sp-white"><Digits /></div>
            <div className="hc-sp-shake">
              <Reel n={REEL_DIGITS} slot="hc-sp-s1" r="r1" />
              <Reel n={REEL_DIGITS} slot="hc-sp-s2" r="r2" />
            </div>

            <div className="hc-sp-shock" />
            <div className="hc-sp-spin">
              <div className="hc-sp-segs">
                {segments.map((s, i) => (
                  <div
                    key={i}
                    className="hc-sp-seg"
                    style={{
                      transform: `rotate(${s.angle}deg) translateX(${R}px)`,
                      transformOrigin: `${THICK / 2}px ${SEG_LEN / 2}px`,
                      animationDelay: `${s.delay.toFixed(3)}s`,
                    }}
                  />
                ))}
              </div>
              <svg className="hc-sp-ring" viewBox="0 0 300 300">
                <path d={ARC} fill="none" stroke={PINK} strokeWidth={THICK} strokeLinecap="round" />
              </svg>
              <div className="hc-sp-headpos" style={{ left: HEAD_POS.x, top: HEAD_POS.y, transform: `rotate(${HEAD_ROT}deg)` }}>
                <div className="hc-sp-head" />
              </div>
            </div>
            <div className="hc-sp-laser">
              <div className="hc-sp-dot" />
            </div>
            {SPARKS.map((s, i) => (
              <div
                key={i}
                className={`hc-sp-spark hc-sp-k${i}`}
                style={{ left: TIP.x - s.size / 2, top: TIP.y - s.size / 2, width: s.size, height: s.size }}
              />
            ))}
          </div>
          <div className="hc-sp-word">HARD CHALLENGE</div>
        </div>
      </div>
    </div>

    <div className="hc-sp-scan" />
  </>
);

/** Logo size: the ring takes ~62% of the screen width, never more than 1:1. */
const fitScale = () => {
  if (typeof window === "undefined") return 1;
  const ring = 2 * R + THICK;
  return Math.min(1, (0.62 * window.innerWidth) / ring, (0.36 * window.innerHeight) / ring);
};

// The logo font is preloaded by index.html; wait for it so the reels never
// show a fallback face for their first frames.
const FONT_SPEC = "italic 900 124px Archivo";
const fontReady: Promise<unknown> =
  typeof document !== "undefined" && document.fonts
    ? Promise.race([document.fonts.load(FONT_SPEC), new Promise((r) => setTimeout(r, 400))])
    : Promise.resolve();

/** Longest the animation waits for the app tree to commit underneath. */
const MAX_WAIT_FOR_APP = 700;

interface SplashScreenProps {
  /** The app tree has committed underneath (see App). */
  appCommitted: boolean;
  onComplete: () => void;
}

/** Shown once per launch (mounted in App, not per route). */
export const SplashScreen = ({ appCommitted, onComplete }: SplashScreenProps) => {
  const done = useRef(onComplete);
  done.current = onComplete;
  // The timeline starts on the dark ground once the font is in and the app
  // has committed underneath (or after MAX_WAIT_FOR_APP regardless).
  const [fontIn, setFontIn] = useState(() => typeof document !== "undefined" && !!document.fonts?.check(FONT_SPEC));
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    let live = true;
    void fontReady.then(() => live && setFontIn(true));
    const t = setTimeout(() => setWaited(true), MAX_WAIT_FOR_APP);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, []);
  const [ready, setReady] = useState(false);
  const starting = useRef(false);
  useEffect(() => {
    // Latched: once started, the timeline never restarts.
    if (starting.current || !fontIn || !(appCommitted || waited)) return;
    starting.current = true;
    setReady(true);
  }, [fontIn, appCommitted, waited]);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const unveil = () => root.classList.remove("hc-veil");
    const unboot = () => root.classList.remove("hc-booting", "hc-veil");
    const timers = [
      setTimeout(() => haptic("light"), AT.reel1 * 1000),
      setTimeout(() => haptic("light"), AT.reel2 * 1000),
      setTimeout(() => haptic("medium"), AT.ringDone * 1000),
      // index.html keeps the page dark until here so no white flashes
      // between the native splash and this one.
      // The app stays unpainted under the splash until the logo is resting:
      // its first paint is one long frame, so it goes where nothing moves much.
      setTimeout(unveil, AT.unveil * 1000),
      setTimeout(unboot, AT.exit * 1000),
      setTimeout(() => done.current(), T * 1000),
    ];
    return () => {
      timers.forEach(clearTimeout);
      unboot();
    };
  }, [ready]);

  return (
    <div className="hc-sp" aria-hidden>
      <style>{CSS}</style>
      {ready ? <Scene /> : <div className="hc-sp-ground" style={{ animation: "none" }} />}
    </div>
  );
};

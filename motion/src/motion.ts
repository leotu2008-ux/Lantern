// The landing animation as plain data and math, shared by:
//  - Scene.tsx (Remotion: Studio previews and video exports)
//  - web.ts (the website: a tiny requestAnimationFrame player, no React)
// Only transform and opacity change over time, so browsers animate it on the GPU.
import geo from "../public/geometry.json";

export const FPS = 60;
export const INTRO_S = 3.5; // landing, plays once
export const LOOP_S = 8; // seamless idle loop: every period below divides 8s
export const CW = geo.W;
export const CH = geo.H;

const PIVOT = { x: geo.pivot[0], y: geo.pivot[1] }; // her fingertips
const LANTERN = { x: geo.lanternCenter[0], y: geo.lanternCenter[1], r: geo.lanternR };
const [ax0, ay0, ax1, ay1] = geo.angelBox;
const [lx0, ly0, lx1, ly1] = geo.lanternBox;
const TAU = Math.PI * 2;
const MOTES = 24;
const MISTS = 5;

// ---- small helpers (same behaviour as Remotion's interpolate/Easing) ----
const wave = (t: number, period: number, phase = 0) => Math.sin((TAU * t) / period + phase);
const frac = (x: number) => ((x % 1) + 1) % 1;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
type Ease = (x: number) => number;
const linear: Ease = (x) => x;
const quadInOut: Ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const cubicInOut: Ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const bezier = (x1: number, y1: number, x2: number, y2: number): Ease => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    t = clamp01(t);
    return ((ay * t + by) * t + cy) * t;
  };
};
const easeOut = bezier(0.16, 1, 0.3, 1);
// piecewise interpolation, clamped at both ends, easing applied per segment
const lerp = (x: number, xs: number[], ys: number[], ease: Ease = linear) => {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * ease((x - xs[i - 1]) / (xs[i] - xs[i - 1]));
  }
  return ys[ys.length - 1];
};
// deterministic pseudo-random in [0, 1) from a string seed
const random = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---- the scene graph (static) ----
export type Node = {
  id: string;
  src?: string; // image file in motion/public (png names; the site swaps in .webp)
  x: number; y: number; w: number; h: number;
  origin?: string; // transform-origin, in the node's own px
  children?: Node[];
};

const mote = (i: number): Node => {
  const size = 8 + random(`s${i}`) * 16;
  return { id: `mote${i}`, src: "mote.png", x: 0, y: 0, w: size, h: size };
};

export const SCENE: Node[] = [
  { id: "sky", src: "sky.jpg", x: 0, y: 0, w: CW, h: CH, origin: `${CW * 0.3}px ${CH * 0.4}px` },
  {
    id: "angelGroup", x: 0, y: 0, w: CW, h: CH, origin: "300px 380px",
    children: [
      { id: "angel", src: "angel.png", x: ax0, y: ay0, w: ax1 - ax0, h: ay1 - ay0 },
      {
        id: "swing", x: 0, y: 0, w: CW, h: CH, origin: `${PIVOT.x}px ${PIVOT.y}px`,
        children: [
          { id: "glowOuter", src: "glow.png", x: LANTERN.x - LANTERN.r * 3.6, y: LANTERN.y - LANTERN.r * 3.6, w: LANTERN.r * 7.2, h: LANTERN.r * 7.2 },
          { id: "lantern", src: "lantern.png", x: lx0, y: ly0, w: lx1 - lx0, h: ly1 - ly0 },
          { id: "glowInner", src: "glow.png", x: LANTERN.x - LANTERN.r * 1.1, y: LANTERN.y - LANTERN.r, w: LANTERN.r * 2.2, h: LANTERN.r * 2.2 },
        ],
      },
    ],
  },
  { id: "rays", src: "rays.png", x: -220, y: -280, w: 1700, h: 1700, origin: "0 0" },
  ...Array.from({ length: MOTES }, (_, i) => mote(i)),
  ...Array.from({ length: MISTS }, (_, i): Node => ({ id: `mist${i}`, src: "mist.png", x: 0, y: 0, w: 1200, h: 420 })),
  { id: "curtainL", src: "mist.png", x: 0, y: 0, w: 2400, h: 1400 },
  { id: "curtainR", src: "mist.png", x: 0, y: 0, w: 2400, h: 1400 },
];

export const IMAGES = ["sky.jpg", "angel.png", "glow.png", "lantern.png", "rays.png", "mote.png", "mist.png"];

// ---- the motion ----
export type Pose = { transform: string; opacity: number };
export type Frame = Record<string, Pose>;

type Intro = { enter: number; ignite: number; extraSwing: number; skyScale: number; rays: number; curtain: number };
const SETTLED: Intro = { enter: 1, ignite: 1, extraSwing: 0, skyScale: 1, rays: 1, curtain: 0 };

const introAt = (s: number): Intro => {
  const p = Math.min(1, s / (INTRO_S - 1 / FPS));
  return {
    enter: lerp(s, [0.15, 2.8], [0, 1], easeOut),
    ignite: lerp(s, [1.9, 2.4, 3.4], [0, 1.45, 1], quadInOut),
    extraSwing: 15 * Math.pow(1 - p, 2) * Math.sin(p * Math.PI * 4),
    skyScale: lerp(s, [0, 3.5], [1.1, 1], easeOut),
    rays: lerp(s, [1.2, 3.2], [0, 1]),
    curtain: lerp(s, [0, 1.8], [1, 0], cubicInOut),
  };
};

// elapsed: seconds since the landing began. The idle clock runs through the landing,
// so nothing jumps when the landing finishes.
// light (optional, 0..1): lets the page light the lantern itself (the website ties it to scrolling);
// it blooms briefly as it reaches full brightness. Without it the lantern lights on its own.
export const sample = (elapsed: number, light?: number): Frame => {
  const intro = elapsed < INTRO_S ? introAt(elapsed) : SETTLED;
  const t = elapsed < INTRO_S ? elapsed - INTRO_S : (elapsed - INTRO_S) % LOOP_S;
  const { enter, ignite, extraSwing, skyScale, rays, curtain } = intro;
  const lit = light === undefined ? Math.min(ignite, 1) : clamp01(light);
  const floatY = 16 * wave(t, LOOP_S);
  const driftX = 8 * wave(t, LOOP_S, Math.PI / 2);
  const floatRot = 0.8 * wave(t, LOOP_S, Math.PI / 3);
  const swing = 5 * wave(t, LOOP_S / 2, -0.6) + 0.8 * wave(t, LOOP_S / 4, 0.9) + extraSwing;
  const glow = 0.78 + 0.14 * wave(t, 2) + 0.05 * wave(t, 0.5, 1.3) + 0.04 * wave(t, 1, 0.4);
  const flare = light === undefined
    ? (ignite > 1 ? ignite - 1 : 0) // brief bloom when the lantern lights
    : 0.5 * Math.max(0, Math.sin(Math.PI * clamp01((light - 0.55) / 0.45)));
  const enterX = -160 * (1 - enter);
  const enterY = -560 * (1 - enter);

  const f: Frame = {
    sky: { transform: `translate3d(${6 * wave(t, LOOP_S)}px,${-3 * wave(t, LOOP_S, 1)}px,0) scale(${skyScale})`, opacity: 1 },
    angelGroup: { transform: `translate3d(${enterX + driftX}px,${enterY + floatY}px,0) rotate(${floatRot}deg)`, opacity: Math.min(1, enter * 1.6) },
    swing: { transform: `rotate(${swing}deg)`, opacity: 1 },
    glowOuter: { transform: `scale(${1 + 0.07 * wave(t, 2) + flare * 0.5})`, opacity: Math.min(1, glow * lit + flare) },
    glowInner: { transform: "none", opacity: Math.max(0, (glow - 0.2) * lit) },
    rays: { transform: `rotate(${3 * wave(t, LOOP_S, 2)}deg)`, opacity: (0.42 + 0.16 * wave(t, LOOP_S / 2, 0.8)) * rays },
  };
  for (let i = 0; i < MOTES; i++) {
    const p = frac(t / LOOP_S + random(`p${i}`));
    const x = LANTERN.x + driftX + (random(`x${i}`) - 0.5) * 340 + 22 * Math.sin(TAU * (p * 2 + random(`w${i}`)));
    const y = LANTERN.y + floatY + 120 - p * (380 + random(`h${i}`) * 260);
    f[`mote${i}`] = { transform: `translate3d(${x}px,${y}px,0)`, opacity: Math.sin(Math.PI * p) * (0.45 + random(`o${i}`) * 0.55) * lit };
  }
  for (let i = 0; i < MISTS; i++) {
    const p = frac(t / LOOP_S + i / MISTS);
    const x = -400 + i * 440 + p * 300 * (i % 2 ? -1 : 1);
    f[`mist${i}`] = { transform: `translate3d(${x}px,${CH - 420 + (i % 3) * 50}px,0)`, opacity: 0.75 * Math.sin(Math.PI * p) };
  }
  f.curtainL = { transform: `translate3d(${-700 - (1 - curtain) * 900}px,-60px,0)`, opacity: curtain };
  f.curtainR = { transform: `translate3d(${260 + (1 - curtain) * 900}px,-60px,0)`, opacity: curtain };
  return f;
};

// Website player for the landing animation: builds the shared scene (motion.ts) once,
// then each frame only writes transform and opacity. No React, no Remotion runtime.
// Pauses while the hero is off screen or the tab is hidden.
import { CW, CH, IMAGES, SCENE, sample, type Node } from "./motion";

const mount = document.getElementById("hero-player");
const BASE = "assets/motion/";
const file = (n: string) => BASE + n.replace(/\.png$/, ".webp");

if (mount) {
  const stage = document.createElement("div");
  stage.style.cssText = `position:absolute;left:0;top:0;width:${CW}px;height:${CH}px;transform-origin:0 0;background:#1b2840;overflow:hidden;contain:strict`;
  const els = new Map<string, HTMLElement>();
  const last = new Map<string, string>();

  // Only the three parallax roots get will-change — not every mote/mist/curtain.
  const PROMOTE = new Set(["sky", "angelGroup", "hazeGroup"]);

  const build = (node: Node, parent: HTMLElement) => {
    const el = node.src
      ? Object.assign(document.createElement("img"), { src: file(node.src), alt: "", decoding: "async", draggable: false })
      : document.createElement("div");
    const promote = PROMOTE.has(node.id) ? "will-change:transform;" : "";
    el.style.cssText =
      `position:absolute;left:${node.x}px;top:${node.y}px;width:${node.w}px;height:${node.h}px;${promote}` +
      (node.origin ? `transform-origin:${node.origin};` : "");
    parent.appendChild(el);
    els.set(node.id, el);
    node.children?.forEach((c) => build(c, el));
  };
  SCENE.forEach((n) => build(n, stage));
  mount.appendChild(stage);

  const fit = () => { stage.style.transform = `scale(${mount.clientWidth / CW})`; };
  new ResizeObserver(fit).observe(mount);
  fit();

  // Depth parallax (scene px at |n|=1). Page sets window.LANTERN_PARALLAX = { nx, ny } in [-1, 1].
  const SKY_X = 5, SKY_Y = 2;
  const MIST_X = 13, MIST_Y = 5;
  const ANGEL_X = 24, ANGEL_Y = 8;
  const SKY_LERP = 9;    // 1/s — responsive haze/sky
  const ANGEL_LERP = 4.6; // heavier / weightier
  const SPRING_K = 8;     // rad/s²
  const SPRING_Z = 0.7;
  const MAX_SWING = (6 * Math.PI) / 180;
  const DRIVE_GAIN = 0.0018;

  let skyN = { x: 0, y: 0 };
  let mistN = { x: 0, y: 0 };
  let angelN = { x: 0, y: 0 };
  let prevAngelPx = 0;
  let angelVx = 0;
  let theta = 0;
  let thetaV = 0;

  const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
  const lerpExp = (cur: number, target: number, rate: number, dt: number) =>
    cur + (target - cur) * (1 - Math.exp(-rate * dt));

  const readTarget = () => {
    const pan = (window as unknown as { LANTERN_PARALLAX?: { nx?: number; ny?: number; x?: number; y?: number } }).LANTERN_PARALLAX;
    if (!pan) return { x: 0, y: 0 };
    // Prefer normalized nx/ny; fall back to legacy px (±26 ≈ full range)
    if (typeof pan.nx === "number" || typeof pan.ny === "number") {
      return { x: clamp1(pan.nx ?? 0), y: clamp1(pan.ny ?? 0) };
    }
    return {
      x: clamp1((pan.x ?? 0) / ANGEL_X),
      y: clamp1((pan.y ?? 0) / ANGEL_Y),
    };
  };

  // The page may set window.LANTERN_LIGHT (0..1) to light the lantern as you scroll.
  const draw = (elapsed: number, dt: number) => {
    const light = (window as unknown as { LANTERN_LIGHT?: number }).LANTERN_LIGHT;
    const target = readTarget();

    skyN.x = lerpExp(skyN.x, target.x, SKY_LERP, dt);
    skyN.y = lerpExp(skyN.y, target.y, SKY_LERP, dt);
    mistN.x = lerpExp(mistN.x, target.x, SKY_LERP, dt);
    mistN.y = lerpExp(mistN.y, target.y, SKY_LERP, dt);
    angelN.x = lerpExp(angelN.x, target.x, ANGEL_LERP, dt);
    angelN.y = lerpExp(angelN.y, target.y, ANGEL_LERP, dt);

    const angelPx = angelN.x * ANGEL_X;
    const safeDt = Math.max(dt, 1 / 120);
    const vx = (angelPx - prevAngelPx) / safeDt;
    const ax = (vx - angelVx) / safeDt;
    angelVx = vx;
    prevAngelPx = angelPx;

    // Damped spring: lantern lags the hand (driven by −acceleration)
    const omega = Math.sqrt(SPRING_K);
    const drive = -ax * DRIVE_GAIN;
    const aTheta = -SPRING_K * theta - 2 * SPRING_Z * omega * thetaV + drive;
    thetaV += aTheta * dt;
    theta += thetaV * dt;
    if (theta > MAX_SWING) { theta = MAX_SWING; thetaV *= 0.4; }
    if (theta < -MAX_SWING) { theta = -MAX_SWING; thetaV *= 0.4; }
    const extraDeg = (theta * 180) / Math.PI;

    const skyT = `translate3d(${(skyN.x * SKY_X).toFixed(2)}px,${(skyN.y * SKY_Y).toFixed(2)}px,0)`;
    const mistT = `translate3d(${(mistN.x * MIST_X).toFixed(2)}px,${(mistN.y * MIST_Y).toFixed(2)}px,0)`;
    const angelT = `translate3d(${(angelN.x * ANGEL_X).toFixed(2)}px,${(angelN.y * ANGEL_Y).toFixed(2)}px,0)`;

    // Page sets window.LANTERN_DROP in [0,1] once the lantern leaves the hand.
    const drop = (window as unknown as { LANTERN_DROP?: number }).LANTERN_DROP;
    const dropAmt = typeof drop === "number" ? Math.min(1, Math.max(0, drop)) : 0;

    const frame = sample(elapsed, typeof light === "number" ? light : undefined);
    for (const id in frame) {
      const el = els.get(id);
      if (!el) continue;
      let { transform, opacity } = frame[id];

      if (id === "sky") {
        transform = `${skyT} ${transform}`;
      } else if (id === "angelGroup") {
        transform = `${angelT} ${transform}`;
      } else if (id === "hazeGroup") {
        transform = mistT;
        opacity *= 1 - dropAmt * 0.35; // embers quiet as the lantern leaves
      } else if (id === "swing") {
        const m = /rotate\(([-\d.]+)deg\)/.exec(transform);
        if (m) {
          const base = parseFloat(m[1]);
          transform = `rotate(${(base + extraDeg).toFixed(3)}deg)`;
        }
        // Hand off to the page-fixed falling lantern
        opacity *= 1 - dropAmt;
      } else if (id === "lantern" || id === "glowOuter" || id === "glowInner") {
        opacity *= 1 - dropAmt;
      } else if (id.startsWith("mote")) {
        opacity *= 1 - dropAmt;
      }

      const o = opacity < 0.002 ? "0" : opacity.toFixed(3);
      const key = transform + "|" + o;
      if (last.get(id) === key) continue;
      last.set(id, key);
      el.style.transform = transform;
      el.style.opacity = o;
    }
  };

  let clock = 0, prev = 0, raf = 0, onScreen = true;
  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - prev) / 1000);
    prev = now;
    clock += dt;
    draw(clock, dt || 1 / 60);
    raf = requestAnimationFrame(tick);
  };
  const run = () => {
    const should = onScreen && !document.hidden;
    if (should && !raf) { prev = performance.now(); raf = requestAnimationFrame(tick); }
    if (!should && raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  draw(0, 1 / 60);
  const ready = IMAGES.map((n) => new Promise<void>((res) => {
    const img = new Image(); img.src = file(n);
    img.decode().then(() => res(), () => res());
  }));
  Promise.all(ready).then(() => {
    document.documentElement.classList.add("player-on");
    new IntersectionObserver((e) => { onScreen = e[0].isIntersecting; run(); }).observe(mount);
    document.addEventListener("visibilitychange", run);
    run();
  });
}

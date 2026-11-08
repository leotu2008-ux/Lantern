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

  const build = (node: Node, parent: HTMLElement) => {
    const el = node.src ? Object.assign(document.createElement("img"), { src: file(node.src), alt: "", decoding: "async", draggable: false }) : document.createElement("div");
    el.style.cssText = `position:absolute;left:${node.x}px;top:${node.y}px;width:${node.w}px;height:${node.h}px;will-change:transform,opacity;` + (node.origin ? `transform-origin:${node.origin};` : "");
    parent.appendChild(el);
    els.set(node.id, el);
    node.children?.forEach((c) => build(c, el));
  };
  SCENE.forEach((n) => build(n, stage));
  mount.appendChild(stage);

  const fit = () => { stage.style.transform = `scale(${mount.clientWidth / CW})`; };
  new ResizeObserver(fit).observe(mount);
  fit();

  // The page may set window.LANTERN_LIGHT (0..1) to light the lantern as you scroll.
  const draw = (elapsed: number) => {
    const light = (window as unknown as { LANTERN_LIGHT?: number }).LANTERN_LIGHT;
    const frame = sample(elapsed, typeof light === "number" ? light : undefined);
    for (const id in frame) {
      const el = els.get(id);
      if (!el) continue;
      const { transform, opacity } = frame[id];
      const o = opacity < 0.002 ? "0" : opacity.toFixed(3);
      const key = transform + "|" + o;
      if (last.get(id) === key) continue; // skip unchanged layers
      last.set(id, key);
      el.style.transform = transform;
      el.style.opacity = o;
    }
  };

  let clock = 0, prev = 0, raf = 0, onScreen = true;
  const tick = (now: number) => {
    clock += Math.min(0.1, (now - prev) / 1000); // no jump after a pause or a slow frame
    prev = now;
    draw(clock);
    raf = requestAnimationFrame(tick);
  };
  const run = () => {
    const should = onScreen && !document.hidden;
    if (should && !raf) { prev = performance.now(); raf = requestAnimationFrame(tick); }
    if (!should && raf) { cancelAnimationFrame(raf); raf = 0; }
  };

  draw(0);
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

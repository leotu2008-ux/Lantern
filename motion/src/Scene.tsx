import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import geo from "../public/geometry.json";

// Everything here only changes transform and opacity, so browsers can animate it on the GPU.
export const FPS = 60;
export const INTRO_FRAMES = Math.round(3.5 * FPS); // landing, plays once
export const LOOP_FRAMES = 8 * FPS; // seamless idle loop: every period below divides 8s
const LOOP_S = LOOP_FRAMES / FPS;

const CW = geo.W;
const CH = geo.H;
const PIVOT = { x: geo.pivot[0], y: geo.pivot[1] }; // her fingertips
const LANTERN = { x: geo.lanternCenter[0], y: geo.lanternCenter[1], r: geo.lanternR };
const [ax0, ay0, ax1, ay1] = geo.angelBox;
const [lx0, ly0, lx1, ly1] = geo.lanternBox;

// Image paths: staticFile() for video renders, plain URLs for the website Player.
let resolveAsset = (name: string) => staticFile(name);
export const setAssetBase = (base: string, rename: (n: string) => string = (n) => n) => {
  resolveAsset = (name) => base + rename(name);
};

const TAU = Math.PI * 2;
const wave = (t: number, period: number, phase = 0) => Math.sin((TAU * t) / period + phase);
const frac = (x: number) => ((x % 1) + 1) % 1;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const layer: React.CSSProperties = { position: "absolute", left: 0, top: 0, willChange: "transform, opacity" };

type Intro = { enter: number; ignite: number; extraSwing: number; skyScale: number; rays: number; curtain: number };
const SETTLED: Intro = { enter: 1, ignite: 1, extraSwing: 0, skyScale: 1, rays: 1, curtain: 0 };

// t: seconds since the loop started (negative during the landing, so the idle motion never stops).
const Scene: React.FC<{ t: number; intro?: Intro }> = ({ t, intro = SETTLED }) => {
  const { enter, ignite, extraSwing, skyScale, rays, curtain } = intro;
  const floatY = 16 * wave(t, LOOP_S);
  const driftX = 8 * wave(t, LOOP_S, Math.PI / 2);
  const floatRot = 0.8 * wave(t, LOOP_S, Math.PI / 3);
  const swing = 5 * wave(t, LOOP_S / 2, -0.6) + 0.8 * wave(t, LOOP_S / 4, 0.9) + extraSwing;
  const glow = 0.78 + 0.14 * wave(t, 2) + 0.05 * wave(t, 0.5, 1.3) + 0.04 * wave(t, 1, 0.4);
  const enterX = interpolate(enter, [0, 1], [-160, 0]);
  const enterY = interpolate(enter, [0, 1], [-560, 0]);
  const flare = ignite > 1 ? ignite - 1 : 0; // brief bloom when the lantern lights

  return (
    <AbsoluteFill style={{ background: "#f6ead2", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: CW, height: CH, transform: `scale(${1920 / CW})`, transformOrigin: "0 0" }}>
        <Img
          src={resolveAsset("sky.jpg")}
          style={{ ...layer, width: CW, height: CH, transform: `translate3d(${6 * wave(t, LOOP_S)}px, ${-3 * wave(t, LOOP_S, 1)}px, 0) scale(${skyScale})`, transformOrigin: "30% 40%" }}
        />
        {/* the angel and her lantern */}
        <div style={{ ...layer, width: CW, height: CH, opacity: Math.min(1, enter * 1.6), transform: `translate3d(${enterX + driftX}px, ${enterY + floatY}px, 0) rotate(${floatRot}deg)`, transformOrigin: "300px 380px" }}>
          <Img src={resolveAsset("angel.png")} style={{ ...layer, left: ax0, top: ay0, width: ax1 - ax0, height: ay1 - ay0 }} />
          <div style={{ ...layer, width: CW, height: CH, transform: `rotate(${swing}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px` }}>
            <Img
              src={resolveAsset("glow.png")}
              style={{ ...layer, left: LANTERN.x - LANTERN.r * 3.6, top: LANTERN.y - LANTERN.r * 3.6, width: LANTERN.r * 7.2, height: LANTERN.r * 7.2, opacity: Math.min(1, glow * Math.min(ignite, 1) + flare), transform: `scale(${1 + 0.07 * wave(t, 2) + flare * 0.5})` }}
            />
            <Img src={resolveAsset("lantern.png")} style={{ ...layer, left: lx0, top: ly0, width: lx1 - lx0, height: ly1 - ly0 }} />
            <Img
              src={resolveAsset("glow.png")}
              style={{ ...layer, left: LANTERN.x - LANTERN.r * 1.1, top: LANTERN.y - LANTERN.r, width: LANTERN.r * 2.2, height: LANTERN.r * 2.2, opacity: (glow - 0.2) * Math.min(ignite, 1) }}
            />
          </div>
        </div>

        <Img
          src={resolveAsset("rays.png")}
          style={{ ...layer, left: -220, top: -280, width: 1700, height: 1700, opacity: (0.42 + 0.16 * wave(t, LOOP_S / 2, 0.8)) * rays, transform: `rotate(${3 * wave(t, LOOP_S, 2)}deg)`, transformOrigin: "0 0" }}
        />

        {/* embers rising from the lantern */}
        {new Array(36).fill(0).map((_, i) => {
          const p = frac(t / LOOP_S + random(`p${i}`));
          const x = LANTERN.x + driftX + (random(`x${i}`) - 0.5) * 340 + 22 * Math.sin(TAU * (p * 2 + random(`w${i}`)));
          const y = LANTERN.y + floatY + 120 - p * (380 + random(`h${i}`) * 260);
          const size = 8 + random(`s${i}`) * 16;
          return (
            <Img
              key={i}
              src={resolveAsset("mote.png")}
              style={{ ...layer, width: size, height: size, opacity: Math.sin(Math.PI * p) * (0.45 + random(`o${i}`) * 0.55) * Math.min(ignite, 1), transform: `translate3d(${x}px, ${y}px, 0)` }}
            />
          );
        })}

        {/* mist drifting over the cloud bank */}
        {[0, 1, 2, 3, 4].map((i) => {
          const p = frac(t / LOOP_S + i / 5);
          const x = -400 + i * 440 + p * 300 * (i % 2 ? -1 : 1);
          return (
            <Img
              key={i}
              src={resolveAsset("mist.png")}
              style={{ ...layer, width: 1200, height: 420, opacity: 0.75 * Math.sin(Math.PI * p), transform: `translate3d(${x}px, ${CH - 420 + (i % 3) * 50}px, 0)` }}
            />
          );
        })}

        {/* clouds parting during the landing */}
        {curtain > 0 &&
          [-1, 1].map((side) => (
            <Img
              key={side}
              src={resolveAsset("mist.png")}
              style={{ ...layer, width: 2400, height: 1400, opacity: curtain, transform: `translate3d(${(side < 0 ? -700 : 260) + side * (1 - curtain) * 900}px, ${-60}px, 0)` }}
            />
          ))}
      </div>
    </AbsoluteFill>
  );
};

const introAt = (frame: number): Intro => {
  const p = Math.min(1, frame / (INTRO_FRAMES - 1));
  const s = frame / FPS;
  const ignite = interpolate(s, [1.9, 2.4, 3.4], [0, 1.45, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return {
    enter: interpolate(s, [0.15, 2.8], [0, 1], { ...clamp, easing: easeOut }),
    ignite,
    extraSwing: 15 * Math.pow(1 - p, 2) * Math.sin(p * Math.PI * 4),
    skyScale: interpolate(s, [0, 3.5], [1.1, 1], { ...clamp, easing: easeOut }),
    rays: interpolate(s, [1.2, 3.2], [0, 1], clamp),
    curtain: interpolate(s, [0, 1.8], [1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) }),
  };
};

// Landing followed by an endless loop. The idle clock runs through the landing,
// so nothing jumps when the landing finishes.
export const Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (frame - INTRO_FRAMES) / FPS;
  if (frame < INTRO_FRAMES) return <Scene t={t} intro={introAt(frame)} />;
  return <Scene t={t % LOOP_S} />;
};

export const Loop: React.FC = () => <Scene t={useCurrentFrame() / FPS} />;

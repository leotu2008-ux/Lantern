import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";

export const FPS = 30;
export const INTRO_FRAMES = 3 * FPS; // landing animation, plays once
export const LOOP_FRAMES = 8 * FPS; // seamless idle loop
const LOOP_S = LOOP_FRAMES / FPS;

// Painting canvas (see geometry.json, produced with the layers).
const CW = 1960;
const CH = 1225;
const PIVOT = { x: 479.6, y: 402.5 }; // her fingertips, where the cord hangs
const LANTERN = { x: 479.6, y: 564.2, r: 86 };

const TAU = Math.PI * 2;
const wave = (t: number, period: number, phase = 0) => Math.sin((TAU * t) / period + phase);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

// Idle motion at loop time t (seconds). Every period divides 8s, so t=0 and t=8 match.
const idle = (t: number) => ({
  skyX: 10 * wave(t, LOOP_S),
  floatY: 9 * wave(t, LOOP_S),
  floatRot: 0.5 * wave(t, LOOP_S, Math.PI / 3),
  swing: 2.2 * wave(t, LOOP_S / 2, -0.6),
  glow: 0.62 + 0.1 * wave(t, 2) + 0.04 * wave(t, 0.5, 1.3) + 0.03 * wave(t, 1, 0.4),
  rays: 0.24 + 0.08 * wave(t, LOOP_S, 0.8),
  raysRot: 1.5 * wave(t, LOOP_S, 2),
  mistX: 28 * wave(t, LOOP_S, 1.1),
});

type SceneProps = {
  t: number; // loop time in seconds
  enter: number; // 0..1 angel arrival
  sky: number; // 0..1 sky reveal
  ignite: number; // 0..1 lantern light
  extraSwing: number; // degrees added during the landing
};

const Motes: React.FC<{ t: number; strength: number }> = ({ t, strength }) => (
  <>
    {new Array(26).fill(0).map((_, i) => {
      const p = (t / LOOP_S + random(`p${i}`)) % 1; // loops every 8s
      const x = LANTERN.x + (random(`x${i}`) - 0.5) * 300 + 14 * Math.sin(TAU * (p + random(`w${i}`)));
      const y = LANTERN.y + 140 - p * (260 + random(`h${i}`) * 160);
      const size = 2 + random(`s${i}`) * 3.5;
      const o = Math.sin(Math.PI * p) * (0.35 + random(`o${i}`) * 0.5) * strength;
      return (
        <div
          key={i}
          style={{
            position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%",
            background: "rgba(255, 236, 196, 1)", boxShadow: `0 0 ${size * 3}px rgba(255, 200, 120, .9)`, opacity: o,
          }}
        />
      );
    })}
  </>
);

const Scene: React.FC<SceneProps> = ({ t, enter, sky, ignite, extraSwing }) => {
  const m = idle(t);
  const enterX = interpolate(enter, [0, 1], [-260, 0]);
  const enterY = interpolate(enter, [0, 1], [-200, 0]);
  const enterScale = interpolate(enter, [0, 1], [1.06, 1]);
  const skyScale = interpolate(sky, [0, 1], [1.12, 1.04]);
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <div style={{ position: "absolute", width: CW, height: CH, transform: `scale(${1920 / CW})`, transformOrigin: "0 0" }}>
        {/* sky */}
        <Img
          src={staticFile("sky.jpg")}
          style={{ position: "absolute", inset: 0, width: CW, height: CH, opacity: sky, transform: `translateX(${m.skyX}px) scale(${skyScale})` }}
        />
        {/* light falling from the upper left */}
        <div
          style={{
            position: "absolute", left: -400, top: -600, width: 2000, height: 2000, opacity: m.rays * sky,
            transform: `rotate(${m.raysRot}deg)`, transformOrigin: "400px 600px", mixBlendMode: "screen",
            background:
              "repeating-conic-gradient(from 100deg at 400px 600px, rgba(255,240,205,.0) 0deg, rgba(255,240,205,.55) 3deg, rgba(255,240,205,0) 7deg, rgba(255,240,205,0) 12deg)",
            maskImage: "radial-gradient(circle at 400px 600px, #000 0, rgba(0,0,0,.5) 700px, transparent 1300px)",
            WebkitMaskImage: "radial-gradient(circle at 400px 600px, #000 0, rgba(0,0,0,.5) 700px, transparent 1300px)",
          }}
        />
        {/* the angel and her lantern */}
        <div
          style={{
            position: "absolute", inset: 0, opacity: enter,
            transform: `translate(${enterX}px, ${enterY + m.floatY}px) rotate(${m.floatRot}deg) scale(${enterScale})`,
            transformOrigin: "300px 380px",
          }}
        >
          <Img src={staticFile("angel.png")} style={{ position: "absolute", inset: 0, width: CW, height: CH }} />
          <div
            style={{
              position: "absolute", inset: 0, transform: `rotate(${m.swing + extraSwing}deg)`,
              transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`,
            }}
          >
            <div
              style={{
                position: "absolute", left: LANTERN.x - LANTERN.r * 3.2, top: LANTERN.y - LANTERN.r * 3.2,
                width: LANTERN.r * 6.4, height: LANTERN.r * 6.4, borderRadius: "50%", opacity: m.glow * ignite,
                background: "radial-gradient(circle, rgba(255,214,150,.9) 0%, rgba(255,190,120,.35) 28%, rgba(255,180,110,0) 62%)",
                mixBlendMode: "screen",
              }}
            />
            <Img src={staticFile("lantern.png")} style={{ position: "absolute", inset: 0, width: CW, height: CH }} />
            <div
              style={{
                position: "absolute", left: LANTERN.x - LANTERN.r * 0.9, top: LANTERN.y - LANTERN.r * 0.75,
                width: LANTERN.r * 1.8, height: LANTERN.r * 1.5, borderRadius: "50%", opacity: (m.glow - 0.3) * ignite,
                background: "radial-gradient(circle at 50% 58%, rgba(255,236,190,.75), rgba(255,220,170,0) 70%)",
                mixBlendMode: "screen",
              }}
            />
          </div>
          <Motes t={t} strength={ignite} />
        </div>
        {/* slow mist over the cloud bank */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute", left: -200 + i * 560 + (i % 2 ? -m.mistX : m.mistX), top: CH - 330 + (i % 2) * 60,
              width: 900, height: 320, borderRadius: "50%", opacity: 0.55 * sky,
              background: "radial-gradient(ellipse at center, rgba(255,255,255,.85), rgba(255,255,255,0) 70%)",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Loop: React.FC = () => {
  const frame = useCurrentFrame();
  return <Scene t={frame / FPS} enter={1} sky={1} ignite={1} extraSwing={0} />;
};

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const last = INTRO_FRAMES - 1; // the last intro frame equals Loop frame 0
  const p = frame / last;
  const sky = interpolate(frame, [0, 1.3 * FPS], [0, 1], { ...clamp, easing: easeOut });
  const enter = interpolate(frame, [0.15 * FPS, last], [0, 1], { ...clamp, easing: easeOut });
  const ignite = interpolate(frame, [1.5 * FPS, last], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const extraSwing = 11 * Math.pow(1 - p, 2) * Math.sin(p * Math.PI * 3.5);
  return <Scene t={0} enter={enter} sky={sky} ignite={ignite} extraSwing={extraSwing} />;
};

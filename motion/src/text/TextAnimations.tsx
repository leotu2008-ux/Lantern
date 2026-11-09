// Lantern text-animation mockups (after Base44's motion: typed prompt, masked line rise,
// rolling word, word reveal, footer rise). Each is its own composition; Root registers them.
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";

// local copies in public/fonts (the render browser can't reach Google Fonts)
const JOSEFIN = "Josefin Sans", JOST = "Jost", SERIF = "Instrument Serif";
loadFont({ family: JOSEFIN, url: staticFile("fonts/josefin-sans-latin-600-normal.woff2"), weight: "600" });
loadFont({ family: JOST, url: staticFile("fonts/jost-latin-300-normal.woff2"), weight: "300" });
loadFont({ family: JOST, url: staticFile("fonts/jost-latin-400-normal.woff2"), weight: "400" });
loadFont({ family: SERIF, url: staticFile("fonts/instrument-serif-latin-400-italic.woff2"), weight: "400", style: "italic" });

const NAVY = "#16213a", IVORY = "#F6F1E7", AMBER = "#E39A4F", PAPER = "#FBFAF7";
const out = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Caps: React.FC<{ size: number; color?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ size, color = NAVY, children, style }) => (
  <span style={{ fontFamily: JOSEFIN, fontWeight: 600, fontSize: size, letterSpacing: "0.06em", textTransform: "uppercase", color, lineHeight: 1.08, ...style }}>{children}</span>
);
const Before: React.FC<{ size: number }> = ({ size }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: size * 1.22, color: AMBER, textTransform: "none", letterSpacing: 0 }}>before</span>
);

// 1 · masked line rise: each line slides up from behind its own mask, staggered
export const LineRise: React.FC = () => {
  const f = useCurrentFrame();
  const lines = ["Angel capital for", "founders of exceptional", "ability and character."];
  return (
    <AbsoluteFill style={{ background: PAPER, justifyContent: "center", paddingLeft: 140 }}>
      <div style={{ display: "grid", gap: 6 }}>
        {lines.map((l, i) => {
          const t = interpolate(f, [8 + i * 7, 38 + i * 7], [0, 1], { ...clamp, easing: out });
          return (
            <div key={i} style={{ overflow: "hidden", paddingBottom: 6 }}>
              <div style={{ transform: `translateY(${(1 - t) * 105}%) rotate(${(1 - t) * 3}deg)`, transformOrigin: "0 100%" }}>
                <Caps size={80} style={{ whiteSpace: "nowrap" }}>{l}</Caps>
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 26, height: 2, width: 160, background: AMBER, transformOrigin: "left",
          transform: `scaleX(${interpolate(f, [52, 80], [0, 1], { ...clamp, easing: out })})` }} />
      </div>
    </AbsoluteFill>
  );
};

// 2 · typed prompt: the network line is typed into a field, the city word cycles
export const TypedPrompt: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const lead = "I'm building in ", cities = ["Boston", "London", "Shenzhen", "Toronto"];
  const PER = Math.round(1.6 * fps);                    // one city: type, hold, delete
  const leadChars = Math.min(lead.length, Math.floor(f / 1.6));
  const after = f - lead.length * 1.6;
  let city = "";
  if (after > 0) {
    const i = Math.floor(after / PER) % cities.length, k = after % PER, w = cities[i];
    const typeEnd = w.length * 2.2, delStart = PER - w.length * 1.2;
    city = k < typeEnd ? w.slice(0, Math.floor(k / 2.2)) : k < delStart ? w : w.slice(0, Math.max(0, w.length - Math.floor((k - delStart) / 1.2)));
  }
  const caret = Math.floor(f / 15) % 2 === 0;
  const drop = interpolate(f, [0, 18], [24, 0], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ background: PAPER, justifyContent: "center", alignItems: "center" }}>
      <div style={{ transform: `translateY(${drop}px)`, opacity: interpolate(f, [0, 12], [0, 1], clamp),
        width: 1240, padding: "40px 48px", background: "#fff", border: `1px solid rgba(22,33,58,.18)`,
        boxShadow: "0 20px 60px rgba(22,33,58,.10)", display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ fontFamily: JOST, fontWeight: 300, fontSize: 60, color: NAVY, flex: 1, whiteSpace: "pre" }}>
          {lead.slice(0, leadChars)}<span style={{ color: AMBER, fontFamily: SERIF, fontStyle: "italic", fontSize: 70 }}>{city}</span>
          <span style={{ display: "inline-block", width: 3, height: 64, background: AMBER, verticalAlign: "-8px", marginLeft: 4, opacity: caret ? 1 : 0 }} />
        </span>
        <span style={{ width: 92, height: 92, background: NAVY, display: "grid", placeItems: "center", color: IVORY, fontSize: 34 }}>→</span>
      </div>
    </AbsoluteFill>
  );
};

// 3 · rolling word: one word swaps in place, rolling up through a mask
export const RollingWord: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const words = ["technological", "financial", "academic", "artistic", "manufacturing", "logistical"];
  const STEP = Math.round(0.9 * fps), MOVE = 14;
  const n = Math.floor(f / STEP), k = f % STEP;
  const t = interpolate(k, [STEP - MOVE, STEP], [0, 1], { ...clamp, easing: Easing.bezier(0.7, 0, 0.2, 1) });
  const cur = words[n % words.length], next = words[(n + 1) % words.length];
  const H = 112;
  return (
    <AbsoluteFill style={{ background: NAVY, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 14 }}>
        <Caps size={30} color="rgba(246,241,231,.7)" style={{ letterSpacing: "0.34em" }}>Capital for the</Caps>
        <div style={{ height: H, overflow: "hidden", position: "relative", width: 1200, textAlign: "center" }}>
          {[cur, next].map((w, i) => (
            <div key={i} style={{ position: "absolute", inset: 0, transform: `translateY(${(i - t) * 100}%)`, opacity: i === 0 ? 1 - t * 0.6 : 0.4 + t * 0.6 }}>
              <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 108, color: AMBER, lineHeight: `${H}px` }}>{w}</span>
            </div>
          ))}
        </div>
        <Caps size={30} color="rgba(246,241,231,.7)" style={{ letterSpacing: "0.34em" }}>founder</Caps>
      </div>
    </AbsoluteFill>
  );
};

// 4 · word reveal: each word lifts and un-blurs in turn; "before" lands last with an underline
export const WordReveal: React.FC = () => {
  const f = useCurrentFrame(), { fps } = useVideoConfig();
  const words = ["We", "back", "founders", "before", "anyone", "else", "is", "looking."];
  return (
    <AbsoluteFill style={{ background: NAVY, justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: 1500, textAlign: "center", lineHeight: 1.2 }}>
        {words.map((w, i) => {
          const start = 6 + i * 5 + (w === "before" ? 10 : 0);
          const s = spring({ frame: f - start, fps, config: { damping: 18, mass: 0.7 } });
          const blur = interpolate(s, [0, 1], [14, 0]);
          return (
            <span key={i} style={{ display: "inline-block", margin: "0 18px", opacity: s, filter: `blur(${blur}px)`,
              transform: `translateY(${(1 - s) * 40}px)`, position: "relative" }}>
              {w === "before" ? <Before size={86} /> : <Caps size={86} color={IVORY}>{w}</Caps>}
              {w === "before" && <span style={{ position: "absolute", left: 4, right: 4, bottom: 2, height: 3, background: AMBER, transformOrigin: "left",
                transform: `scaleX(${interpolate(f, [start + 12, start + 34], [0, 1], { ...clamp, easing: out })})` }} />}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// 5 · footer rise: the closing line rises from below the fold, then the call to action draws its underline
export const FooterRise: React.FC = () => {
  const f = useCurrentFrame();
  const a = interpolate(f, [4, 40], [0, 1], { ...clamp, easing: out });
  const b = interpolate(f, [16, 52], [0, 1], { ...clamp, easing: out });
  const c = interpolate(f, [50, 78], [0, 1], { ...clamp, easing: out });
  return (
    <AbsoluteFill style={{ background: PAPER, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 8, textAlign: "center" }}>
        {[["Light the way.", a], ["Build it with us.", b]].map(([t, p], i) => (
          <div key={i} style={{ overflow: "hidden" }}>
            <div style={{ transform: `translateY(${(1 - (p as number)) * 110}%)` }}><Caps size={120}>{t as string}</Caps></div>
          </div>
        ))}
        <div style={{ marginTop: 36, opacity: c, transform: `translateY(${(1 - c) * 16}px)`, display: "grid", justifyItems: "center", gap: 10 }}>
          <span style={{ fontFamily: JOST, fontSize: 34, color: NAVY, letterSpacing: "0.2em", textTransform: "uppercase" }}>Stay in touch →</span>
          <span style={{ height: 2, width: 330, background: AMBER, transformOrigin: "left", transform: `scaleX(${interpolate(f, [62, 92], [0, 1], { ...clamp, easing: out })})` }} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

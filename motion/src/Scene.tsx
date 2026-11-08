import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { CW, FPS, INTRO_S, LOOP_S, SCENE, sample, type Frame, type Node } from "./motion";

// Remotion view of the shared scene (motion.ts). The website draws the same scene with web.ts.
export { FPS };
export const INTRO_FRAMES = Math.round(INTRO_S * FPS);
export const LOOP_FRAMES = LOOP_S * FPS;

const Layer: React.FC<{ node: Node; frame: Frame }> = ({ node, frame }) => {
  const pose = frame[node.id];
  const style: React.CSSProperties = {
    position: "absolute", left: node.x, top: node.y, width: node.w, height: node.h,
    transformOrigin: node.origin, transform: pose?.transform, opacity: pose?.opacity,
  };
  if (node.src) return <Img src={staticFile(node.src)} style={style} />;
  return (
    <div style={style}>
      {node.children?.map((c) => <Layer key={c.id} node={c} frame={frame} />)}
    </div>
  );
};

const Scene: React.FC<{ elapsed: number }> = ({ elapsed }) => {
  const frame = sample(elapsed);
  return (
    <AbsoluteFill style={{ background: "#f6ead2", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: CW, transform: `scale(${1920 / CW})`, transformOrigin: "0 0" }}>
        {SCENE.map((n) => <Layer key={n.id} node={n} frame={frame} />)}
      </div>
    </AbsoluteFill>
  );
};

// Landing followed by the loop.
export const Hero: React.FC = () => <Scene elapsed={useCurrentFrame() / FPS} />;
// The loop alone, starting where the landing ends.
export const Loop: React.FC = () => <Scene elapsed={INTRO_S + useCurrentFrame() / FPS} />;

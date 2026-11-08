import { Composition } from "remotion";
import { Hero, Loop, FPS, INTRO_FRAMES, LOOP_FRAMES } from "./Scene";

// 1920x1200 matches the 1960x1225 painting canvas (16:10).
export const RemotionRoot = () => (
  <>
    <Composition id="Intro" component={Hero} durationInFrames={INTRO_FRAMES} fps={FPS} width={1920} height={1200} />
    <Composition id="Loop" component={Loop} durationInFrames={LOOP_FRAMES} fps={FPS} width={1920} height={1200} />
    <Composition id="Hero" component={Hero} durationInFrames={INTRO_FRAMES + LOOP_FRAMES * 2} fps={FPS} width={1920} height={1200} />
  </>
);

import { Composition } from "remotion";
import { Hero, Loop, FPS, INTRO_FRAMES, LOOP_FRAMES } from "./Scene";
import { LineRise, TypedPrompt, RollingWord, WordReveal, FooterRise } from "./text/TextAnimations";

// 1920x1200 matches the 1960x1225 painting canvas (16:10).
export const RemotionRoot = () => (
  <>
    <Composition id="Intro" component={Hero} durationInFrames={INTRO_FRAMES} fps={FPS} width={1920} height={1200} />
    <Composition id="Loop" component={Loop} durationInFrames={LOOP_FRAMES} fps={FPS} width={1920} height={1200} />
    <Composition id="Hero" component={Hero} durationInFrames={INTRO_FRAMES + LOOP_FRAMES * 2} fps={FPS} width={1920} height={1200} />
    {/* text-animation mockups, 1600x900 at 30fps */}
    <Composition id="TextLineRise" component={LineRise} durationInFrames={120} fps={30} width={1600} height={900} />
    <Composition id="TextTypedPrompt" component={TypedPrompt} durationInFrames={225} fps={30} width={1600} height={900} />
    <Composition id="TextRollingWord" component={RollingWord} durationInFrames={162} fps={30} width={1600} height={900} />
    <Composition id="TextWordReveal" component={WordReveal} durationInFrames={120} fps={30} width={1600} height={900} />
    <Composition id="TextFooterRise" component={FooterRise} durationInFrames={120} fps={30} width={1600} height={900} />
  </>
);

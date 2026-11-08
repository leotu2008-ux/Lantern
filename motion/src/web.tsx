// Mounts the animation live on the website with the Remotion Player (no video autoplay needed).
import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { Hero, setAssetBase, FPS, INTRO_FRAMES, LOOP_FRAMES } from "./Scene";

const mount = document.getElementById("hero-player");
if (mount) {
  setAssetBase("assets/motion/", { "angel.png": "angel.webp", "lantern.png": "lantern.webp" });
  createRoot(mount).render(
    <Player
      component={Hero}
      durationInFrames={INTRO_FRAMES + LOOP_FRAMES * 450}
      fps={FPS}
      compositionWidth={1920}
      compositionHeight={1200}
      autoPlay
      loop
      controls={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      style={{ width: "100%", height: "100%" }}
      acknowledgeRemotionLicense
    />,
  );
  // Tell the page the animation is running so it can hide the still image.
  requestAnimationFrame(() => document.documentElement.classList.add("player-on"));
}

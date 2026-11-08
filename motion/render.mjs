// Renders the landing animation into ../assets as MP4 (H.264) and WebM (VP9).
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";

const browserExecutable = process.env.REMOTION_BROWSER || undefined;
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const outDir = path.resolve("../assets");
for (const id of ["Intro", "Loop"]) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  for (const [codec, ext, crf] of [["h264", "mp4", 24], ["vp9", "webm", 34]]) {
    const outputLocation = path.join(outDir, `hero-${id.toLowerCase()}.${ext}`);
    await renderMedia({
      composition, serveUrl, codec, crf, outputLocation, browserExecutable, muted: true,
      scale: 1600 / 1920, pixelFormat: "yuv420p", concurrency: 4,
      onProgress: ({ progress }) => process.stdout.write(`\r${id} ${ext} ${Math.round(progress * 100)}%   `),
    });
    console.log(`\n-> ${outputLocation}`);
  }
}

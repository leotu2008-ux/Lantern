# Lantern 00

Website for Lantern Ventures (Fund 00), a student-run angel fund. White "Renaissance edition" layout: the hero is a painted angel carrying the lantern (`assets/angel-hero.jpg`, built from `assets/angel.jpg`) that dissolves through the clouds into the page.

It's a single static page: `index.html`. No build step. Open it in a browser, or host it on GitHub Pages / Vercel / Netlify.

## Editing

- **Cities**: edit the `CITIES` list in the `<script>` at the bottom of `index.html`. `lit: true` means we have people there; `false` shows "Seeking".
- **Team bios / terms / copy**: plain HTML in the matching `<section>`.
- **Colors & fonts**: tokens at the top of the `<style>` block (`--vermilion`, `--paper`, etc.). Dark mode follows the visitor's system setting.

## Email sign-up

The "Stay connected" box on the landing doesn't send anywhere yet. Paste a Formspree, Buttondown or Mailchimp form URL into `SIGNUP_ENDPOINT` in the script at the bottom of `index.html`.

## Application form

The form doesn't send anywhere yet. Create a free form at Formspree, Getform or Basin and paste its URL into `FORM_ENDPOINT` in the script. Until then, submitting tells people to message us on LinkedIn.

## Landing animation

The hero animation runs live in the page from `assets/hero-motion.js` (about 5 KB, layers in `assets/motion/`). It is a small player built from the same motion code Remotion uses, so the site stays light and smooth: it only moves and fades images, and pauses when the hero is off screen. It plays a 3-second landing (the sky appears, the angel glides in, the lantern lights) and then loops gently forever. `assets/angel-hero.jpg` is the still fallback for visitors with reduced motion turned on.

The animation code lives in `motion/` (Remotion, 60 fps; effects are pre-rendered images so the browser only moves and fades them):

```bash
cd motion && npm install
npm run studio      # preview and tweak in Remotion Studio
npm run build:web   # rebuild assets/hero-motion.js for the website
npm run render      # optional: export MP4 + WebM versions (e.g. for social posts)
```

The background (`motion/public/sky.jpg`) is an AI-generated aerial landscape (source `landscape-source.png`). Earlier skies are kept as `sky-clouds.jpg` and `sky-warm.jpg`. The angel layer comes from a background-removed cutout (`angel-cutout.png`) via `make_angel.py` (removes the lantern, tones her robes white). Rebuild order: `make_angel.py`, `make_fx.py`, then `make_night.py` (night grade for the landscape, mist and angel).

Layers are in `motion/public/` (sky, the angel without her lantern, the lantern, light effects). The motion is defined once in `motion/src/motion.ts`; `Scene.tsx` shows it in Remotion and `web.ts` plays it on the site.

## Opening performance (narrow)

Lag in Firefox came from the opening wireframe stroke-dash draws and six separately animated globe SVGs. Those are simplified only: the wireframe fades in as one layer, and the globe is a single SVG with one rotate. The landing angel / lantern / embers player is not paused or swapped for a still by any “lite mode.” Reduced-motion visitors still get the still painting via `prefers-reduced-motion`.

Two compositor-level fixes keep the look unchanged: the rotating globe/rays layer (`.portal-art`) is `position: fixed` so it is not clipped by the hero's `overflow: hidden` (Firefox re-rendered the rotated SVGs through that clip every frame), and while the black grain sheet is still solid (`b < 0.05`) the canvas gets an opaque CSS background so browsers can skip drawing the landing layers hidden beneath it.

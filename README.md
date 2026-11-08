# Lantern 00

Website for Lantern Ventures (Fund 00), a student-run angel fund. White "Renaissance edition" layout: the hero is a painted angel carrying the lantern (`assets/angel-hero.jpg`, built from `assets/angel.jpg`) that dissolves through the clouds into the page.

It's a single static page: `index.html`. No build step. Open it in a browser, or host it on GitHub Pages / Vercel / Netlify.

## Editing

- **Cities**: edit the `CITIES` list in the `<script>` at the bottom of `index.html`. `lit: true` means we have people there; `false` shows "Seeking".
- **Team bios / terms / copy**: plain HTML in the matching `<section>`.
- **Colors & fonts**: tokens at the top of the `<style>` block (`--vermilion`, `--paper`, etc.). Dark mode follows the visitor's system setting.

## Application form

The form doesn't send anywhere yet. Create a free form at Formspree, Getform or Basin and paste its URL into `FORM_ENDPOINT` in the script. Until then, submitting tells people to message us on LinkedIn.

## Landing animation

The hero animation runs live in the page with the Remotion Player (`assets/hero-motion.js`, layers in `assets/motion/`). It plays a 3-second landing (the sky appears, the angel glides in, the lantern lights) and then loops gently forever. `assets/angel-hero.jpg` is the still fallback for visitors with reduced motion turned on.

The animation code lives in `motion/` (Remotion):

```bash
cd motion && npm install
npm run studio      # preview and tweak in Remotion Studio
npm run build:web   # rebuild assets/hero-motion.js for the website
npm run render      # optional: export ../assets/hero-intro / hero-loop as MP4 + WebM (e.g. for social posts)
```

Layers are in `motion/public/` (sky, the angel without her lantern, the lantern). The motion itself is in `motion/src/Scene.tsx`.

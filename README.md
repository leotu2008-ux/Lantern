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

The hero plays `assets/hero-intro.*` once (the angel arrives, the lantern lights), then loops `assets/hero-loop.*`. `assets/angel-hero.jpg` is the still fallback, shown when motion is off or autoplay is blocked.

The videos are made with Remotion in `motion/`:

```bash
cd motion && npm install
npm run studio          # preview
npm run render          # writes ../assets/hero-*.mp4 and .webm
```

Layers live in `motion/public/` (sky, angel without lantern, lantern). Animation code is `motion/src/Scene.tsx`.

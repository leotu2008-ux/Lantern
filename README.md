# Lantern 00

Website for Lantern Ventures (Fund 00), a student-run angel fund. White "Renaissance edition" layout: the hero is a painted angel carrying the lantern (`assets/angel-hero.jpg`, built from `extras/angel-source.jpg`) that dissolves through the clouds into the page.

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

## The burns after the landing (angel, courtyard, garden)

After the black sheet has burnt away there are two more burns in a row, each rising from the bottom edge in the same grain and at the same pace as the first, and each running backwards when you scroll up:

1. The angel's night scene burns away into **Virtue and Pragmatism**, the courtyard section that says what we look for in a founder.
2. After a pause to read it, the courtyard burns away into the **Our Network** garden.

The lengths are the `--burn`, `--hold`, `--burn2`, `--hold2` and `--burn3` variables in the CSS (in svh). The later burns are shorter only because their lead-in before the first grains go is 8svh instead of 25svh. `--hold` is the pause with the angel fully revealed and nothing moving, which is also when the back-to-top corner appears; `--hold2` is the pause on the courtyard.

Nothing is frozen while a burn runs. The scene underneath slides up from its top to its resting view and arrives as the last grain goes (the courtyard rests with its bottom on the bottom of the screen; the garden rests on the whole statue and the text on wide screens, and with the statue just under the top of the screen on phones). The scene on top scrolls up with the page: the angel's sky drifts slowly (`DRIFT` in the script) and everything in front of it, the angel, her lantern and the words, goes faster (`DRIFT_FRONT`); in the courtyard only the words scroll up; the statue stands on the floor, so he and the painting stay put. From the first grain on, the pointer goes through to the scene underneath, so the garden's city names and globe answer as soon as they are uncovered.

How it is built, in `index.html`: the stage is tall enough that the angel and the courtyard stay pinned through all of it, and the garden is pulled up under them and held for the last burn while the script slides it. A page element cannot be given a live grain mask directly, so for each burn `makeRise` draws the pattern into two full-screen canvases that are blended: one blacks out the scene underneath where the one on top is intact, the other blacks out the one on top where it has burnt, and the top one is laid over with `mix-blend-mode: screen`. Where the grain cannot run (reduced motion, low-power devices, no WebGL, or `?fade=1`) each scene simply fades out.

## Virtue and Pragmatism

The courtyard is an empty painted courtyard with the things that stand in it as separate pieces, so each can move on its own:

- `courtyard-*.webp`: one corner of the old Our Network courtyard, repainted empty and with a little more sky above the roofline. The source painting (`extras/atlas/virtue-source/court.webp`) has a wing on both sides; `make_virtue.py` takes the left one out and carries the far wall on in its place (the two bays next to the corner copied leftwards, clear sky above, floor below), so the picture is a far wall running off to the left and one side wing on the right. Everything right of the old corner column is the painting untouched. Three sizes; the browser picks one.
- `well`, `lemon-a`, `lemon-b`, `jar`: cut-outs painted from the courtyard so they match it, each with a soft shadow under its foot. They are placed in `index.html` by where their foot is on the painting (`--x`, `--y`, as fractions of the picture) and how tall they are (`--h`, set from how far away they stand).
- `scholar.webp`: one of the two statues that were unused (`extras/statues/statue-a.png`), mirrored so he points toward the words and lifted from grey stone to the white marble of Atlas and the angel. He is large, up to three quarters of the screen's height, and stands at the very front of the floor with his plinth just above the bottom edge: nearer than anything else, which is what makes that size a statue of four to five metres and not a giant.

The script at the end of `index.html` lays the painting out. It is sized so the roofline sits a little way down the screen (`SKY`, a sliver of sky above it) with the floor on the bottom, and its right-hand edge sits on the right-hand edge of the screen, so every screen shape sees a corner: the side wing on the right, the far wall running off to the left. A phone would be all wing that way, so there the wing keeps to a share of the width (`WING_MAX`). Screens wider than about 2.3:1 lose the sky.

The depth comes from a small shader in the same script that draws the painting and slides each part by how near it is: the far wall stays put, the side wing and the floor come toward us. It follows the cursor and the scroll. Every object, and the statue, moves with the patch of floor it stands on. The painting's geometry is described in the shader's `depth()` function and the `BASE`, `ROOF` and `WING` constants as fractions of the picture, so they need updating if the painting changes. Without WebGL, or with reduced motion on, the still painting shows and nothing moves.

To rebuild the images from the sources in `extras/atlas/virtue-source/`:

```bash
python3 extras/atlas/make_virtue.py assets/virtue
```

## Opening performance (narrow)

Lag in Firefox came from the opening wireframe stroke-dash draws and six separately animated globe SVGs. Those are simplified only: the wireframe fades in as one layer, and the globe is a single SVG with one rotate. The landing angel / lantern / embers player is not paused or swapped for a still by any “lite mode.” Reduced-motion visitors still get the still painting via `prefers-reduced-motion`.

Two compositor-level fixes keep the look unchanged: the rotating globe/rays layer (`.portal-art`) is `position: fixed` so it is not clipped by the hero's `overflow: hidden` (Firefox re-rendered the rotated SVGs through that clip every frame), and while the black grain sheet is still solid (`b < 0.05`) the canvas gets an opaque CSS background so browsers can skip drawing the landing layers hidden beneath it.

## Our Network garden

The "Eleven cities" section is a small, enclosed Italian garden room built from separate painted layers in `assets/garden/`: a neutral overcast sky, the trees, a tall yew wall with urn niches, the lawn with its lily pool and stone pad, a few separate plants, a foreground bough and hedge end, and Atlas as a cut-out with a hole where the live globe shows through. The layers are placed in units of the statue's width around the foot of his pedestal, so the scene keeps its scale on every screen. They drift with the cursor and the scroll, and the trees sway on their own; both stop for visitors with reduced motion turned on.

Every layer was generated from the same anchor painting (`wall`), which is why they share one style and one level of detail. Keep that rule when adding a layer: pass `wall` as the style reference. The three wide layers come in three sizes (phones, ordinary desktop screens, high-density screens) and the browser picks one.

The AI-generated sources are in `extras/garden/source/`. To rebuild the layers:

```bash
python3 extras/garden/make_layers.py extras/garden/source assets/garden
```

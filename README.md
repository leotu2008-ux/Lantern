# Lantern 00

Website for Lantern Ventures (Fund 00), a student-run angel fund. Renaissance theme: the hero painting (`assets/angel.jpg`) is an AI-generated angel carrying the lantern.

It's a single static page: `index.html`. No build step. Open it in a browser, or host it on GitHub Pages / Vercel / Netlify.

## Editing

- **Cities**: edit the `CITIES` list in the `<script>` at the bottom of `index.html`. `lit: true` means we have people there; `false` shows "Seeking".
- **Team bios / terms / copy**: plain HTML in the matching `<section>`.
- **Colors & fonts**: tokens at the top of the `<style>` block (`--vermilion`, `--paper`, etc.). Dark mode follows the visitor's system setting.

## Application form

The form doesn't send anywhere yet. Create a free form at Formspree, Getform or Basin and paste its URL into `FORM_ENDPOINT` in the script. Until then, submitting tells people to message us on LinkedIn.

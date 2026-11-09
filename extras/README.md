# Extras

Files the live site does not load: map and globe demos, the text-animation mockups,
the statue images, the original angel painting and the social card image, and the globe's source code.
Everything the site does load is in `assets/`.

To rebuild the globe: `esbuild extras/globe-source/globe-site.js --bundle --minify --format=iife --loader:.json=json --outfile=assets/globe/globe.js`
(its data file, `globe-data.json`, sits next to it).

"""Build the one picture the night sky behind Stay in touch needs: the old globe that drifts beside Atlas.

usage (from the repo root): python3 extras/sky/make_sky.py extras/sky/source assets/sky

Source:
  globe   a hand-painted globe of about 1500, the bare ball on a clear ground (no stand, no ring)
Output:
  globe.webp   the same, small: it is drawn about a tenth of the screen tall

(Everything else in that sky is either drawn by the script in index.html or a picture another section already uses.)
"""
import sys, os
import numpy as np
from PIL import Image
RAW, OUT = sys.argv[1], sys.argv[2]
for ext in ("png", "webp"):
    p = f"{RAW}/globe.{ext}"
    if os.path.exists(p): break
im = Image.open(p).convert("RGBA")
a = np.asarray(im).copy()
a[..., 3] = np.clip((a[..., 3].astype(np.float32) - 24) * 255 / 231, 0, 255).astype(np.uint8)     # drop the faint haze left in the clear area
im = Image.fromarray(a); im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
im = im.resize((440, round(im.height * 440 / im.width)), Image.LANCZOS)
im.save(f"{OUT}/globe.webp", quality=86, method=4)
print(f"globe  {im.width}x{im.height}  {os.path.getsize(f'{OUT}/globe.webp') // 1024} KB")

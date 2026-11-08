# Grades the aerial landscape (landscape-source.png) to a moonlit night and writes sky.jpg,
# plus night versions of the mist and a slightly dimmed angel so she sits in the scene.
# Usage: python3 make_night.py public   (run after make_angel.py; then make_fx.py crops)
import sys
import numpy as np
from PIL import Image, ImageFilter
D = sys.argv[1]
src = Image.open(f"{D}/landscape-source.png").convert("RGB")
W, H = src.size; cw = round(H * 1.6); x0 = (W - cw) // 2
img = src.crop((x0, 0, x0 + cw, H)).resize((1960, 1225), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=40, threshold=2))
a = np.array(img).astype(np.float32) / 255
lum = 0.30 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
night = np.stack([lum * 0.40, lum * 0.52, lum * 0.78], -1) * 0.55 + a * np.array([0.22, 0.27, 0.36]) * 0.45
night = np.power(np.clip(night, 0, 1), 1.12) * 1.15
y = np.linspace(0, 1, 1225)[:, None, None]
night *= 0.82 + 0.18 * (1 - np.abs(y - 0.45) * 1.4)          # a touch darker at the top and bottom
Image.fromarray((np.clip(night, 0, 1) * 255).astype(np.uint8)).save(f"{D}/sky.jpg", quality=92)

# moonlit mist instead of white fog
m = np.array(Image.open(f"{D}/mist.png").convert("RGBA")).astype(np.float32)
m[..., 0], m[..., 1], m[..., 2] = 150, 172, 205
m[..., 3] *= 0.7
Image.fromarray(m.astype(np.uint8)).save(f"{D}/mist.png")

# angel: a little dimmer and cooler, so she belongs to the night (the lantern still lights her)
ang = np.array(Image.open(f"{D}/angel-full.png").convert("RGBA")).astype(np.float32)
ang[..., :3] *= np.array([0.80, 0.84, 0.92])
Image.fromarray(np.clip(ang, 0, 255).astype(np.uint8)).save(f"{D}/angel-full.png")
print("night written")

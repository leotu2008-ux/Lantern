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

# lantern: feathered edges and a night-toned rim, so it glows in the scene instead of
# looking cut out; its lit centre stays warm
import json
lan = Image.open(f"{D}/lantern.png").convert("RGBA")
# trim the outline to the clean background-removed cutout, so no painted sky rides along
geo = json.load(open(f"{D}/geometry.json")); x0, y0, x1, y1 = geo["lanternBox"]
cutA = Image.open(f"{D}/angel-cutout.png").getchannel("A")
hh = round(1225 * 0.76); ww = round(880 * hh / 1168)
full = Image.new("L", (1960, 1225), 0); full.paste(cutA.resize((ww, hh), Image.LANCZOS), (-70, -50))
clean = np.array(full.crop((x0, y0, x1, y1))).astype(np.float32) / 255
la = np.array(lan).astype(np.float32); la[..., 3] *= clean
lan = Image.fromarray(la.astype(np.uint8))
A = lan.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.6))
arr = np.array(lan).astype(np.float32)
h, w = arr.shape[:2]
cy, cx = 0.44 * h, 0.5 * w                                   # lantern body centre within the crop
yy, xx = np.mgrid[0:h, 0:w]
r = np.sqrt(((xx - cx) / (0.5 * w)) ** 2 + ((yy - cy) / (0.3 * h)) ** 2)
rim = np.clip((r - 0.45) / 0.6, 0, 1)[..., None]              # 0 in the lit heart, 1 at the edges
night_tint = np.array([0.62, 0.62, 0.78])
arr[..., :3] = arr[..., :3] * (1 - rim * (1 - night_tint))
arr[..., 3] = np.array(A).astype(np.float32)
# the tassel and bottom cap: a wider feather, and the tassel tip fades out instead of ending in a cut
soft = np.array(lan.getchannel("A").filter(ImageFilter.GaussianBlur(3.2))).astype(np.float32)
below = np.clip((yy - 0.66 * h) / (0.06 * h), 0, 1)
arr[..., 3] = arr[..., 3] * (1 - below) + np.minimum(arr[..., 3], soft) * below
tip = 1 - np.clip((yy - 0.84 * h) / (0.15 * h), 0, 1) ** 1.5
arr[..., 3] *= tip
Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(f"{D}/lantern.png")
print("lantern blended")

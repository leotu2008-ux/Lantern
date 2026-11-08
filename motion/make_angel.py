# Builds the angel layer from a clean cutout (angel-cutout.png, 880x1168, background removed):
# takes out the lantern and its cord (they are their own layer), tones the robes toward white,
# and places her on the 1960x1225 canvas exactly where the animation expects her.
# Usage: python3 make_angel.py public   (then run make_fx.py public to crop)
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
D = sys.argv[1]
W, H = 1960, 1225
cut = Image.open(f"{D}/angel-cutout.png").convert("RGBA")
arr = np.array(cut).astype(np.float32)

# lantern + cord + tassel, same outline as the lantern layer (original painting coords)
SS = 4; m = Image.new("L", (880 * SS, 1168 * SS), 0); d = ImageDraw.Draw(m)
S = lambda *v: [c * SS for c in v]
d.line(S(690, 560, 690, 672), fill=255, width=6 * SS)
d.rounded_rectangle(S(656, 664, 726, 692), radius=3 * SS, fill=255)
d.ellipse(S(576, 676, 804, 868), fill=255)
d.rounded_rectangle(S(655, 845, 727, 882), radius=3 * SS, fill=255)
d.line(S(690, 876, 690, 940), fill=255, width=6 * SS)
d.ellipse(S(665, 881, 715, 938), fill=255)
d.polygon(S(681, 926, 699, 926, 709, 962, 707, 1032, 653, 1032, 671, 962), fill=255)
hole = np.array(m.resize((880, 1168), Image.LANCZOS).filter(ImageFilter.MaxFilter(5))).astype(np.float32) / 255
hole[:574, :] = 0  # keep her fingers
arr[..., 3] *= 1 - hole

# robes and wings toward white: pull colour out, lift a little, keep a faint ivory warmth
rgb = arr[..., :3] / 255
lum = (0.30 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2])[..., None]
mx, mn = rgb.max(-1, keepdims=True), rgb.min(-1, keepdims=True); sat = (mx - mn) / (mx + 1e-4)
keep = np.clip((0.22 - sat) / 0.22, 0, 1) * 0.5 + 0.18            # skin and shadows keep a bit more colour
ivory = np.array([1.0, 0.985, 0.955])
white = np.clip(lum * 1.08 + 0.04, 0, 1) * ivory
rgb = rgb * keep + white * (1 - keep)
arr[..., :3] = np.clip(rgb, 0, 1) * 255

cut = Image.fromarray(arr.round().astype(np.uint8))
h = round(H * 0.76); w = round(880 * h / 1168); ox, oy = -70, -50
cut = cut.resize((w, h), Image.LANCZOS)
canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
canvas.alpha_composite(cut.crop((-ox, -oy, w, h)), (0, 0))
canvas.save(f"{D}/angel-full.png")
print("angel layer written")

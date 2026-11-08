# Recolours the warm, yellow sky and clouds to a soft Renaissance blue, keeping the angel,
# her robes and the lantern warm. Usage: python3 make_blue.py public
# Reads sky-warm.jpg / angel-warm-full.png (kept as the originals) and writes sky.jpg / angel-full.png.
import sys, os, shutil
import numpy as np
from PIL import Image
D = sys.argv[1]
for src, keep in [("sky.jpg", "sky-warm.jpg"), ("angel-full.png", "angel-warm-full.png")]:
    if not os.path.exists(f"{D}/{keep}"): shutil.copy(f"{D}/{src}", f"{D}/{keep}")

TOP = np.array([0.50, 0.66, 0.84])    # azure overhead
LOW = np.array([0.80, 0.87, 0.92])    # pale haze toward the clouds

def blue(rgb, protect=None, any_sat=None):
    a = rgb.astype(np.float32) / 255
    h = a.shape[0]
    lum = 0.30 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
    mx, mn = a.max(-1), a.min(-1); sat = (mx - mn) / (mx + 1e-4)
    warm = np.clip((a[..., 0] - a[..., 2]) * 4, 0, 1)            # how yellow/orange the pixel is
    # sky and clouds: light and not strongly coloured
    satw = np.clip((0.55 - sat) / 0.25, 0, 1)
    if any_sat is not None: satw = satw + (1 - satw) * any_sat   # golden clouds outside the figure too
    w = np.clip((lum - 0.40) / 0.25, 0, 1) * satw * (0.35 + 0.65 * warm)
    if protect is not None: w *= 1 - protect
    y = np.linspace(0, 1, h)[:, None, None]
    tint = TOP * (1 - y) + LOW * y
    white = np.clip((lum - 0.78) / 0.2, 0, 1)[..., None]          # bright cloud tops stay near white
    target = lum[..., None] * (tint / tint.mean(-1, keepdims=True)) * (1 - white) + (lum[..., None] * 0.98 + 0.02) * white
    target = np.clip(target * 1.04, 0, 1)
    out = a * (1 - w[..., None]) + target * w[..., None]
    return (out * 255).round().astype(np.uint8)

sky = np.array(Image.open(f"{D}/sky-warm.jpg").convert("RGB"))
Image.fromarray(blue(sky)).save(f"{D}/sky.jpg", quality=92)

ang = Image.open(f"{D}/angel-warm-full.png").convert("RGBA")
arr = np.array(ang); rgb = arr[..., :3]
from PIL import ImageDraw, ImageFilter
# her figure (wings, head, arm, robes), traced on the original painting (880x1168) and placed like the layer
FIG = [(0,120),(60,20),(200,0),(380,60),(430,150),(560,140),(700,110),(860,130),(860,260),(700,420),(650,460),
       (740,520),(752,592),(690,604),(560,522),(480,522),(420,560),(380,640),(300,720),(200,800),(90,840),(0,830)]
sc, ox, oy = 701 / 880, -70, -50
poly = Image.new("L", ang.size, 0)
ImageDraw.Draw(poly).polygon([(ox + x * sc, oy + y * sc) for x, y in FIG], fill=255)
poly = np.array(poly.filter(ImageFilter.GaussianBlur(10))) / 255
# inside the figure only the strongly coloured or shaded parts are kept warm; everything else turns blue,
# including the golden clouds around her
a = rgb.astype(np.float32) / 255
mx, mn = a.max(-1), a.min(-1); sat = (mx - mn) / (mx + 1e-4)
lum = 0.30 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
fig = np.clip((sat - 0.22) / 0.12, 0, 1) + np.clip((0.55 - lum) / 0.15, 0, 1)
fig = np.array(Image.fromarray((np.clip(fig, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(6))) / 255
protect = np.maximum(poly * 0.4, poly * fig)
arr[..., :3] = blue(rgb, protect=protect, any_sat=(1 - poly))
Image.fromarray(arr).save(f"{D}/angel-full.png")
print("done")

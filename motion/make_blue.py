# Recolours the warm, yellow sky and clouds to a soft Renaissance blue, keeping the angel,
# her robes and the lantern warm. Usage: python3 make_blue.py public
# Reads sky-warm.jpg (kept as the original) and writes sky.jpg. The angel layer comes from make_angel.py.
import sys, os, shutil
import numpy as np
from PIL import Image
D = sys.argv[1]
for src, keep in [("sky.jpg", "sky-warm.jpg")]:
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

print("done")

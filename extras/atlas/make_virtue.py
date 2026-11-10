"""Build the two images for the Virtue and Pragmatism section.

usage (from the repo root): python3 extras/atlas/make_virtue.py assets/virtue

courtyard.jpg  the old Our Network courtyard, mirrored (so its well sits behind the words, not the statue)
               and with its yellow cast taken down to warm stone
scholar.webp   the unused statue (extras/statues/statue-a.png), mirrored so he points toward the words,
               with the same yellow taken out of his rim light
"""
import sys, os, colorsys
import numpy as np
from PIL import Image
OUT = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__))

def calm(rgb, keep=0.5):
    """take the saturation of the orange-yellow hues down, leaving blues and greens alone"""
    a = rgb.astype(np.float32) / 255
    mx = a.max(-1); mn = a.min(-1); d = mx - mn
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h = np.zeros_like(mx)
    m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0); gc = np.where(m, (mx - g) / np.where(m, d, 1), 0); bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc)); h = (h / 6) % 1          # 0..1
    deg = h * 360
    # full effect between 20 and 62 degrees (orange to yellow), easing out to none by 0 and 95 (so lemons' leaves stay green)
    w = np.clip(np.minimum((deg - 0) / 20, (95 - deg) / 33), 0, 1)
    scale = 1 - (1 - keep) * w
    grey = (0.299 * r + 0.587 * g + 0.114 * b)[..., None]
    out = grey + (a - grey) * scale[..., None]
    out[..., 2] = out[..., 2] * (1 + 0.04 * w)          # and a touch cooler, so the stone reads as stone
    return (np.clip(out, 0, 1) * 255).astype(np.uint8)

bg = Image.open(f"{HERE}/courtyard.jpg").convert("RGB").transpose(Image.FLIP_LEFT_RIGHT)
bg = Image.fromarray(calm(np.asarray(bg), 0.5))
bg.save(f"{OUT}/courtyard.jpg", quality=76, optimize=True, progressive=True)
print("courtyard", bg.size, os.path.getsize(f"{OUT}/courtyard.jpg") // 1024, "KB; floor colour", tuple(int(v) for v in np.asarray(bg)[-40:].reshape(-1, 3).mean(0)))

st = Image.open(f"{HERE}/../statues/statue-a.png").convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
arr = np.asarray(st).copy(); arr[..., :3] = calm(arr[..., :3], 0.35)
st = Image.fromarray(arr)
box = st.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox(); st = st.crop(box)
st.save(f"{OUT}/scholar.webp", quality=88, method=6)
print("scholar", st.size, os.path.getsize(f"{OUT}/scholar.webp") // 1024, "KB")

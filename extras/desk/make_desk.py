"""Build the images for the Stay in touch section: a Renaissance scholar's working desk, seen from high up at an angle.

usage (from the repo root): python3 extras/desk/make_desk.py extras/desk/source assets/desk

Sources (the things were painted from the desk, so they share its hand, its light from high on the left, and its view
from in front and well above):
  desk     the desk with everything that lies flat on it: papers, a map, an open notebook, letters, small tools.
           Its far edge is at the top, its carved near edge and a strip of floor and carpet at the bottom
  things   eight things that stand up, on a clear ground, four across and two down: a candlestick, an hourglass,
           a globe, a stack of books, a book stand with an open book, an inkwell with quills, a goblet, an armillary

Output:
  desk-1920/2880/3840.webp   the desk in three sizes
  <thing>.webp               each upright thing cut out. Its canvas has room to its right and below, because:
  <thing>-s.webp             its shadow, thrown across the desk to the right, is on the same canvas, so the page can
                             lay the thing over its shadow and lean the thing while the shadow stays on the wood
It prints each thing's size and where its foot is on the canvas, which the page's stylesheet needs.
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
RAW, OUT = sys.argv[1], sys.argv[2]

def load(n, mode):
    for ext in ("png", "webp"):
        p = f"{RAW}/{n}.{ext}"
        if os.path.exists(p): return Image.open(p).convert(mode)
    raise FileNotFoundError(n)

def save(im, n, q):
    im.save(f"{OUT}/{n}.webp", quality=q, method=4)
    return os.path.getsize(f"{OUT}/{n}.webp") // 1024

# ---- the desk: as painted, a little deeper so the papers do not glare beside the words
desk = np.asarray(load("desk", "RGB")).astype(np.float32) / 255
desk = np.clip(desk ** 1.08 * 0.94, 0, 1)
# its top edge dissolves into the dark of the room (DARK below is the page's colour above the painting), so the page can
# show the painting whole with nothing cut off along the top
DARK = np.array([13, 9, 7], dtype=np.float32) / 255
t = np.clip(np.arange(desk.shape[0], dtype=np.float32) / (0.05 * desk.shape[0]), 0, 1)[:, None, None]
t = t * t * (3 - 2 * t)
desk = Image.fromarray(((DARK * (1 - t) + desk * t) * 255).astype(np.uint8))
for w in (1920, 2880, 3840):
    im = desk if w == desk.width else desk.resize((w, round(desk.height * w / desk.width)), Image.LANCZOS)
    print(f"desk-{w:<10d} {im.width}x{im.height}  {save(im, f'desk-{w}', 80)} KB")

# ---- the upright things. name: tallest side in px on the page's canvas
GRID = [["candle", "hourglass", "globe", "books"], ["stand", "inkwell", "goblet", "armillary"]]
SIZE = {"candle": 760, "hourglass": 560, "globe": 760, "books": 620, "stand": 820, "inkwell": 640, "goblet": 440, "armillary": 720}
SHADOW = (0.95, 0.24)                               # how far a point's shadow lies to the right and toward us, per unit of its height on the canvas
sheet = load("things", "RGBA"); a = np.asarray(sheet).copy(); H, W = a.shape[:2]
a[..., 3] = np.clip((a[..., 3].astype(np.float32) - 24) * 255 / 231, 0, 255).astype(np.uint8)       # drop the faint haze left in the clear areas
lab, n = ndimage.label(a[..., 3] > 40)
sizes = np.bincount(lab.ravel()); cms = ndimage.center_of_mass(a[..., 3] > 40, lab, range(1, n + 1))
rows, cols = len(GRID), len(GRID[0])
owner = [None] + [GRID[min(rows - 1, int(cms[i][0] * rows / H))][min(cols - 1, int(cms[i][1] * cols / W))] if sizes[i + 1] > 300 else None for i in range(n)]
for row in GRID:
    for name in row:
        mine = np.isin(lab, [i for i in range(1, n + 1) if owner[i] == name])
        ys, xs = np.where(mine); m = 8
        y0, y1, x0, x1 = max(ys.min() - m, 0), min(ys.max() + m, H), max(xs.min() - m, 0), min(xs.max() + m, W)
        part = a[y0:y1, x0:x1].copy()
        part[..., 3] = np.where(ndimage.binary_dilation(mine[y0:y1, x0:x1], iterations=6), part[..., 3], 0)
        thing = Image.fromarray(part); k = SIZE[name] / thing.height
        thing = thing.resize((round(thing.width * k), SIZE[name]), Image.LANCZOS)
        tw, th = thing.size; al = np.asarray(thing.getchannel("A")).astype(np.float32) / 255
        # its foot: the middle of the lowest tenth of it, a little up from the very bottom (the foot is round, seen from above)
        low = al[int(th * 0.9):]; cols_on = np.where(low.max(0) > 0.5)[0]
        fx = (cols_on.min() + cols_on.max()) / 2; fw = cols_on.max() - cols_on.min(); fy = th - 1 - 0.28 * fw
        pad = round(0.06 * th); right = round(SHADOW[0] * th * 1.05); below = round(SHADOW[1] * th * 1.1)
        cw, ch = tw + 2 * pad + right, th + 2 * pad + below
        canvas = Image.new("RGBA", (cw, ch)); canvas.alpha_composite(thing, (pad, pad))
        bx, by = pad + fx, pad + fy                 # the foot, on the canvas
        # the shadow: every point of the thing dropped onto the desk along the light, which comes from high on the left.
        # A point as far above the foot as u lands u * SHADOW to the right and toward us.
        full = np.zeros((ch, cw), np.float32); full[pad:pad + th, pad:pad + tw] = al
        yy, xx = np.mgrid[0:ch, 0:cw].astype(np.float32)
        u = np.clip((yy - by) / SHADOW[1], 0, None)                              # how high the point that lands here was
        src_y = by - u; src_x = xx - SHADOW[0] * u
        cast = ndimage.map_coordinates(full, [src_y, src_x], order=1, mode="constant")
        cast = np.where(yy >= by - 1, cast, 0)
        soft = ndimage.gaussian_filter(cast, 0.012 * th); softer = ndimage.gaussian_filter(cast, 0.045 * th)
        t = np.clip(u / th, 0, 1)                                                 # the further it falls, the softer and fainter
        cast = (soft * (1 - t) + softer * t) * (0.62 - 0.3 * t)
        contact = ndimage.gaussian_filter(np.where((yy > by - 0.1 * fw) , full, 0), 0.02 * th) * 0.5      # and a close one round the foot
        contact = ndimage.shift(contact, (0.012 * th, 0.008 * th), order=1)
        sh = np.clip(np.maximum(cast, contact), 0, 1)
        shadow = Image.fromarray(np.dstack([np.full(sh.shape + (3,), (10, 6, 4), np.uint8), (sh * 255).astype(np.uint8)]), "RGBA")
        shadow = shadow.resize((max(1, cw // 3), max(1, ch // 3)), Image.LANCZOS)                              # it is all blur: a third of the size is plenty
        print(f"{name:<10s} {cw}x{ch}  {save(canvas, name, 84)} KB  shadow {save(shadow, name + '-s', 70)} KB  foot {100 * bx / cw:.1f}% {100 * by / ch:.1f}%  stands {100 * (by - pad) / ch:.1f}% of the canvas tall")

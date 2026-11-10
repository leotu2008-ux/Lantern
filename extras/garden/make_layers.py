"""Build the garden layers for the Our Network section from the painted sources.

usage (from the repo root): python3 extras/garden/make_layers.py extras/garden/source assets/garden

Sources (all painted from the same anchor image, wall, so they share one style and one level of detail):
  wall      the back of the garden: tall yew wall with urn niches, trees crowding over it, transparent sky
  sky       a quiet, neutral overcast sky
  ground    the lawn, lily pool, stone pad and low box hedge, transparent above the hedge
  sheet     a row of separate plants: two cypresses, a broadleaf tree, a yew cone, a hydrangea
  bough     foreground: an overhanging bough that enters from the left edge only
  fore      foreground: the end of a near yew hedge (its right-hand element; the bough in it is not used)
  atlas-key the statue on a green screen with the ball painted magenta; atlas is the same painting with the ball
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage

RAW, OUT = sys.argv[1], sys.argv[2]

def load(n, mode="RGBA"):
    for ext in ("png", "webp"):
        p = f"{RAW}/{n}.{ext}"
        if os.path.exists(p): return Image.open(p).convert(mode)
    raise FileNotFoundError(n)

def clean(im, lo=24):
    """drop the faint haze the generator leaves in transparent areas"""
    a = np.asarray(im).copy(); al = a[..., 3].astype(np.float32)
    a[..., 3] = np.clip((al - lo) * 255 / (255 - lo), 0, 255).astype(np.uint8)
    return Image.fromarray(a)

def trim(im, pad=2):
    b = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return im.crop((max(0, b[0]-pad), max(0, b[1]-pad), min(im.width, b[2]+pad), min(im.height, b[3]+pad)))

def fit(im, w=None, h=None):
    if w and im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    if h and im.height > h: im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    return im

def save(im, n, w=None, h=None, q=80):
    im = fit(im, w, h); im.save(f"{OUT}/{n}.webp", quality=q, method=4)
    print(f"{n:14s} {im.width}x{im.height}  {os.path.getsize(f'{OUT}/{n}.webp')//1024} KB"); return im

def plate(im, n, q=74, full=True):
    """a full-width plate in three sizes: phones, ordinary desktop screens, and high-density desktop screens"""
    save(im, n + "-1920", 1920, q=q); save(im, n + "-2880", 2880, q=q)
    if full: save(im, n + "-3840", 3840, q=q)

# ---- the sky: soft and neutral, so it only needs a modest size
sky = fit(load("sky", "RGB"), 2000); sky.save(f"{OUT}/sky.jpg", quality=82, optimize=True, progressive=True)
print(f"sky            {sky.width}x{sky.height}  {os.path.getsize(f'{OUT}/sky.jpg')//1024} KB")

# ---- the back of the garden: split at the top of the yew wall, so separate trees can sway between the two
wall = clean(load("wall")); W, H = wall.size
TOP = 946                                   # the wall's clipped top edge in the source
plate(wall.crop((0, 0, W, TOP + 40)), "trees", full=False)   # far and soft: never needs the largest size
w = np.asarray(wall.crop((0, TOP - 8, W, H))).copy()
rng = np.random.default_rng(7)              # a slightly ragged cut, like clipped yew, instead of a ruled line
edge = ndimage.gaussian_filter1d(rng.normal(0, 3.0, W), 3) + 6
yy = np.arange(w.shape[0])[:, None]
w[..., 3] = (w[..., 3] * np.clip(yy - edge[None, :] + .5, 0, 1)).astype(np.uint8)
plate(Image.fromarray(w), "wall")

# ---- the floor
gr = clean(load("ground"))
top = int(np.argmax((np.asarray(gr.getchannel("A")) > 128).mean(1) > .5))
plate(gr.crop((0, top - 6, gr.width, gr.height)), "ground")

# ---- the plants, cut apart
sheet = clean(load("sheet"))
alpha_s = np.asarray(sheet.getchannel("A"))
lab, n = ndimage.label(alpha_s > 40)
sizes = np.bincount(lab.ravel()); sizes[0] = 0
big = [i for i in np.argsort(sizes)[::-1][:5]]                               # the five plants; anything else is a stray leaf
boxes = ndimage.find_objects(lab)
big.sort(key=lambda i: boxes[i - 1][1].start)
names = ["cypress-a", "cypress-b", "tree", "cone", "hydrangea"]
sa = np.asarray(sheet)
for i, name in zip(big, names):
    m = 30; b = boxes[i - 1]
    b = (slice(max(0, b[0].start - m), min(sheet.height, b[0].stop + m)), slice(max(0, b[1].start - m), min(sheet.width, b[1].stop + m)))
    part = sa[b].copy()
    own = ndimage.binary_dilation(lab[b] == i, iterations=24)                # keep its own loose leaves, drop its neighbours
    other = np.isin(lab[b], [j for j in big if j != i])
    part[..., 3] = np.where(own & ~ndimage.binary_dilation(other, iterations=3), part[..., 3], 0)
    im = trim(Image.fromarray(part))
    if name == "cone":                       # the cone stands on the lawn: give it a soft contact shadow
        pad = round(im.height * .035); canvas = Image.new("RGBA", (round(im.width * 1.5), im.height + pad))
        sh = Image.new("L", canvas.size, 0); d = ImageDraw.Draw(sh); cx = canvas.width // 2
        d.ellipse((cx - im.width * .62, im.height - pad * 1.6, cx + im.width * .62, im.height + pad * .9), fill=120)
        sh = sh.filter(ImageFilter.GaussianBlur(pad * .55))
        canvas.paste(Image.new("RGBA", canvas.size, (12, 22, 14, 255)), (0, 0), sh)
        canvas.alpha_composite(im, (cx - im.width // 2, 0)); im = canvas
    if name != "cypress-b":                  # the second cypress is not used on the page
        save(im, name, h={"cypress-a": 1300, "tree": 1000, "cone": 900, "hydrangea": 480}[name])

# ---- the foreground
save(trim(clean(load("bough"))), "bough", w=1300, q=76)                     # reaches in from the left edge only
fo = clean(load("fore")); half = round(fo.width * .7)
save(trim(fo.crop((half, 0, fo.width, fo.height))), "buttress", h=1500)

# ---- the statue: green screen -> transparent outside, magenta -> a hole the live globe shows through
a = np.asarray(load("atlas-key", "RGB")).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
kg = g - np.maximum(r, b)            # greenness
km = np.minimum(r, b) - g            # magentaness
alpha = 1 - np.clip(np.maximum(kg, km) / 60.0, 0, 1)
g2 = np.where(kg > 0, np.maximum(r, b), g)                                   # despill the edges
r2 = np.where(km > 0, np.minimum(r, g + 6), r); b2 = np.where(km > 0, np.minimum(b, g + 6), b)
al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
al = al.point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 255 / 190)))
st = Image.fromarray(np.stack([r2, g2, b2], -1).clip(0, 255).astype(np.uint8)).convert("RGBA"); st.putalpha(al)
ys, xs = np.where(km > 80)
x0, x1, y0 = xs.min(), xs.max(), ys.min()
R = (x1 - x0 + 1) / 2; cx = (x0 + x1 + 1) / 2; cy = y0 + R                    # the ball's circle
bb = st.getchannel("A").getbbox()
bb = (min(bb[0], int(cx - R) - 4), min(bb[1], int(cy - R) - 4), max(bb[2], int(cx + R) + 4), bb[3])
st = st.crop(bb)
print("statue %dx%d, ball centre %.4f %.4f of w/h, radius %.4f of w" % (st.width, st.height, (cx - bb[0]) / st.width, (cy - bb[1]) / st.height, R / st.width))
save(st, "atlas", w=900, q=88)
# the painted marble ball itself, from the un-keyed painting: it sits behind the live globe
src = load("atlas", "RGB")
X0, Y0, D = round(cx - R), round(cy - R), round(2 * R)
ball = src.crop((X0, Y0, X0 + D, Y0 + D)).convert("RGBA")
yy, xx = np.mgrid[0:D, 0:D]; dist = np.hypot(xx - D / 2 + .5, yy - D / 2 + .5)
ball.putalpha(Image.fromarray((np.clip((D / 2 - 3 - dist) / 3, 0, 1) * 255).astype(np.uint8)))
save(ball, "ball", w=640, q=86)

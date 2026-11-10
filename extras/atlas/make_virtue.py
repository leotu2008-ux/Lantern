"""Build the images for the Virtue and Pragmatism section.

usage (from the repo root): python3 extras/atlas/make_virtue.py assets/virtue

Sources, in extras/atlas/virtue-source/ unless noted:
  court     the old Our Network courtyard repainted exactly as it was but empty (no well, no pots), with a little
            more sky added above the roofline, so the things that stand in it can be separate pieces. It has a wing
            on both sides; the page shows a corner of it, so corner() below takes the left wing out
  objects   a row of those things, painted from the courtyard so they match it: a well, two potted lemon trees, a jar
  extras/statues/statue-a.png   the scholar (one of the two statues that were unused)

Output:
  courtyard-2048/3072/4096.webp   the empty corner of the courtyard in three sizes (phones, ordinary screens,
                                  high-density screens)
  well, lemon-a, lemon-b, jar     the cut-outs, each with a soft shadow under its foot
  scholar.webp                    the statue, mirrored so he points toward the words, lifted to white marble
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage
OUT = sys.argv[1]; HERE = os.path.dirname(os.path.abspath(__file__)); SRC = f"{HERE}/virtue-source"

def load(n, mode="RGBA"):
    for ext in ("png", "webp"):
        p = f"{SRC}/{n}.{ext}"
        if os.path.exists(p): return Image.open(p).convert(mode)
    raise FileNotFoundError(n)

def save(im, n, q=82):
    im.save(f"{OUT}/{n}.webp", quality=q, method=4)
    print(f"{n:16s} {im.width}x{im.height}  {os.path.getsize(f'{OUT}/{n}.webp') // 1024} KB")

# ---- the empty courtyard, as a corner: the right-hand wing stays, and where the left-hand wing was the far wall
#      simply carries on. Its arcade repeats, so the two bays next to the corner are copied leftwards, with clear sky
#      above them and floor below; everything right of the old corner column is the painting untouched.
def smooth(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

def corner(court, EXT=880):
    """the far wall carried on to the left in place of the left wing, and EXT px beyond the old left edge"""
    a = np.asarray(court.convert("RGB")).astype(np.float32); H, W = a.shape[:2]
    k = W / 3504.0                                  # everything below was measured on the 3504 px wide painting
    def samp(x, y):                                 # bilinear sample of the original at (x, y) arrays
        return np.stack([ndimage.map_coordinates(a[..., c], [y, x], order=1, mode="nearest") for c in range(3)], -1)
    SEAM = 616 * k                                  # just right of the corner column's axis: left of this is the left wing
    P_UP, P_LO, DY = 870 * k, 861 * k, -8 * k       # two bays to the right, the upper and lower storeys line up like this
    Y_SKY, Y_BASE = 580 * k, 2034 * k               # the wall strip: from just above the roof to the foot of the columns
    S_FLOOR, Y_HORIZON = 936 * k, 1810 * k          # the floor moved sideways by about one repeat of its pattern
    X_FLOOR, X_VANISH = 1045 * k, 1700 * k          # the floor is replaced left of a line running from here at the wall toward the viewer
    F = 14 * k
    out = np.zeros((H, W + EXT, 3), np.float32); out[:, EXT:] = a
    cols = int(X_FLOOR + 40 * k)                    # the strip of the painting that gets touched
    ys, xs = np.mgrid[0:H, -EXT:cols].astype(np.float32)
    orig = samp(np.maximum(xs, 0), ys)

    # ---- sky: cloudless sky from the middle of the painting, mirrored back and forth so it never shows a seam
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    top = int(600 * k)
    white = (np.minimum(np.minimum(r, g), b)[:top] > 130).any(0)                       # columns with any cloud in them
    white[:int(700 * k)] = True; white[int(2800 * k):] = True
    lab, n = ndimage.label(~white); best = max(ndimage.find_objects(lab), key=lambda sl: sl[0].stop - sl[0].start)[0]
    LAP = 90 * k; X0 = best.start + 30 * k; T = best.stop - best.start - 60 * k - LAP   # tiles of clear sky, overlapping by LAP
    def tile(i, l):                                 # every tile a little different: flipped or not, nudged up or down
        i = i.astype(int); sx = X0 + np.where(i % 2 == 1, T + LAP - l, l)
        return samp(sx, np.abs(ys + np.array([0, 34, -27, 15, -40, 22])[i % 6] * k))
    xc = xs + EXT; i0 = np.floor(xc / T); l = xc - i0 * T
    wt = smooth(l / LAP)[..., None]
    sky = tile(i0, l) * wt + tile(i0 - 1, l + T) * (1 - wt)
    solid = (b - r <= 25) & (np.minimum(np.minimum(r, g), b) <= 150)                   # neither blue nor cloud: roof
    run = ndimage.uniform_filter1d(solid[:int(640 * k), :cols].astype(np.float32), int(15 * k), axis=0) > 0.95
    bnd = np.where(run.any(0), run.argmax(0), 640 * k).astype(np.float32)             # the wing's roofline
    bnd = ndimage.minimum_filter1d(ndimage.median_filter(bnd, 31), 9)
    bndx = np.concatenate([np.zeros(EXT, np.float32), bnd])[None, :]
    w_sky = np.where(xs < 0, 1.0, smooth((ys - (bndx - 170 * k)) / (70 * k)))          # 1 where the wing's roof was
    w_sky = np.maximum(w_sky, smooth((-xs + 30 * k) / (40 * k)))                        # and into the extension
    w_sky = w_sky * (ys < Y_SKY + 2 * F) * (xs < SEAM + F)                              # sky only: the wall and floor follow
    res = orig * (1 - w_sky[..., None]) + sky * w_sky[..., None]

    # ---- the wall: bays one and two, repeated leftwards
    P = P_UP + (P_LO - P_UP) * smooth((ys - 1297 * k) / (81 * k))
    dy = DY * smooth((ys - 612 * k) / (52 * k))    # the roof ridge is level with the corner's as it is; everything below sits lower
    c1 = samp(xs + P, ys + dy); c2 = samp(xs + 2 * P, ys + dy)
    t2 = smooth((xs - (SEAM - P - F / 2)) / F)[..., None]
    wall = c1 * t2 + c2 * (1 - t2)
    # the copy is a touch different in tone from the corner it meets: ease each repeat toward the corner over its last third
    strip = (xs[0] >= SEAM) & (xs[0] < SEAM + 2.5 * F)
    d = np.median((orig - c1)[:, strip], axis=1)                                        # per row, per channel
    d = ndimage.gaussian_filter1d(ndimage.median_filter(d, size=(int(41 * k), 1)), 40 * k, axis=0)
    u = ((xs - SEAM) % P) / P                                                           # place within the repeat, 0 at its left end
    wall = wall + d[:, None, :] * smooth((u - 0.62) / 0.38)[..., None]
    w_wall = smooth((ys - (Y_SKY - F)) / F) * (1 - smooth((ys - (Y_BASE - 4 * k)) / (8 * k)))
    res = res * (1 - w_wall[..., None]) + wall * w_wall[..., None]

    # ---- the floor: everything left of a line that runs from the wall toward the viewer, so the old wing leaves no reflection
    dep = (ys - Y_HORIZON) / (Y_BASE - Y_HORIZON)   # 1 at the wall, growing toward the viewer
    D = S_FLOOR * dep
    L = X_FLOOR + (X_FLOOR - X_VANISH) * (dep - 1)
    fl = None
    for n in (4, 3, 2, 1):                          # the nearest untouched piece of floor, n repeats to the right
        cand = samp(np.clip(xs + n * D, 0, W - 2), ys)
        if fl is None: fl = cand
        else:
            t = smooth((xs + n * D - L) / (36 * k))[..., None]; fl = cand * t + fl * (1 - t)
    w_fl = smooth((ys - (Y_BASE - 4 * k)) / (8 * k)) * smooth((L - xs + 18 * k) / (36 * k))
    res = res * (1 - w_fl[..., None]) + fl * w_fl[..., None]

    # ---- join it to the untouched painting just right of the corner column
    t1 = smooth((xs - (SEAM - F / 2)) / F)
    keep = np.where((ys > Y_SKY - F) & (ys < Y_BASE + 4 * k), t1, 0.0)[..., None]      # the sky and floor already blend by themselves
    res = orig * keep + res * (1 - keep)
    out[:, :EXT + cols] = res
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))

court = corner(load("court", "RGB"))
for w in (2048, 3072, 4096):                        # 4096 is as wide as every graphics card will take as one texture
    save(court.resize((w, round(court.height * w / court.width)), Image.LANCZOS), f"courtyard-{w}", 76)

# ---- the things that stand in it, cut apart. Each gets a little extra canvas below its foot (FOOT of its height)
#      holding a soft contact shadow; the page hangs that part below the point where the object stands.
FOOT = 0.02
sheet = load("objects")
al = np.asarray(sheet.getchannel("A"))
lab, n = ndimage.label(al > 40)
sizes = np.bincount(lab.ravel()); sizes[0] = 0
big = sorted(np.argsort(sizes)[::-1][:4], key=lambda i: ndimage.find_objects(lab)[i - 1][1].start)
boxes = ndimage.find_objects(lab); sa = np.asarray(sheet)
for i, (name, height, spread) in zip(big, [("well", 900, .92), ("lemon-a", 1000, .46), ("lemon-b", 560, .52), ("jar", 380, .5)]):
    m = 12; b = boxes[i - 1]
    b = (slice(max(0, b[0].start - m), min(sheet.height, b[0].stop + m)), slice(max(0, b[1].start - m), min(sheet.width, b[1].stop + m)))
    part = sa[b].copy()
    own = ndimage.binary_dilation(lab[b] == i, iterations=10)
    part[..., 3] = np.where(own, np.clip((part[..., 3].astype(np.float32) - 24) * 255 / 231, 0, 255), 0).astype(np.uint8)
    im = Image.fromarray(part); box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox(); im = im.crop(box)
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    pad = round(height * FOOT / (1 - FOOT)); side = round(im.width * .12)
    canvas = Image.new("RGBA", (im.width + 2 * side, im.height + pad))
    sh = Image.new("L", canvas.size, 0); d = ImageDraw.Draw(sh); cx = canvas.width / 2; half = im.width * spread / 2
    d.ellipse((cx - half * 1.25, im.height - pad * 2.2, cx + half * 1.25, im.height + pad * .8), fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(pad * .6))
    canvas.paste(Image.new("RGBA", canvas.size, (38, 28, 20, 255)), (0, 0), sh)
    canvas.alpha_composite(im, (side, 0))
    save(canvas, name, 84)

# ---- the scholar: mirrored, and lifted from grey stone to the white marble of the other two statues
def whiten(rgb):
    a = rgb.astype(np.float32)
    lum = a @ np.array([.299, .587, .114], dtype=np.float32)
    # his tones (5th to 95th percentile) mapped onto Atlas's as Atlas is shown on the page
    curve = np.interp(lum, [0, 66, 97, 128, 157, 191, 255], [46, 118, 158, 183, 199, 215, 244])
    grey = lum[..., None]
    out = grey + (a - grey) * 0.3                       # most of the blue-grey and the yellow rim light go
    out = out * (curve / np.maximum(lum, 1))[..., None]
    out[..., 0] *= 1.012; out[..., 2] *= 0.985          # Atlas is a very slightly warm white
    return np.clip(out, 0, 255).astype(np.uint8)

st = Image.open(f"{HERE}/../statues/statue-a.png").convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
arr = np.asarray(st).copy(); arr[..., :3] = whiten(arr[..., :3])
st = Image.fromarray(arr)
box = st.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox(); st = st.crop(box)
st.save(f"{OUT}/scholar.webp", quality=88, method=6)
print("scholar", st.size, os.path.getsize(f"{OUT}/scholar.webp") // 1024, "KB")

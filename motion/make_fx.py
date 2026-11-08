# Pre-renders the light effects as images, so the animation only moves/fades them (cheap, smooth).
# Also crops the angel and lantern layers to their visible area. Usage: python3 make_fx.py public
import sys, json, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
OUT = sys.argv[1]
geo = json.load(open(f'{OUT}/geometry.json'))

def radial(size, stops, name):
    y, x = np.mgrid[0:size, 0:size]; r = np.hypot(x - size/2, y - size/2) / (size/2)
    a = np.interp(r, [s[0] for s in stops], [s[1] for s in stops])
    img = np.zeros((size, size, 4), np.uint8); img[..., 0], img[..., 1], img[..., 2] = 255, 214, 160
    img[..., 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8); Image.fromarray(img).save(f'{OUT}/{name}')

radial(512, [(0, .95), (.18, .7), (.45, .25), (.75, .06), (1, 0)], 'glow.png')
radial(64, [(0, 1), (.25, .8), (.6, .2), (1, 0)], 'mote.png')

# soft god rays fanning from the upper left
S = 1600; rays = Image.new('L', (S, S), 0); d = ImageDraw.Draw(rays); rng = np.random.default_rng(7)
for k in range(16):
    a0 = math.radians(8 + k * 5.2 + rng.uniform(-1.5, 1.5)); w = math.radians(rng.uniform(1.2, 3.2))
    d.polygon([(0, 0), (S*1.5*math.cos(a0), S*1.5*math.sin(a0)), (S*1.5*math.cos(a0+w), S*1.5*math.sin(a0+w))], fill=int(rng.uniform(90, 200)))
rays = rays.filter(ImageFilter.GaussianBlur(18))
y, x = np.mgrid[0:S, 0:S]; fall = np.clip(1 - np.hypot(x, y) / (S * 0.95), 0, 1) ** 1.4
alpha = (np.array(rays) * fall * 0.75).astype(np.uint8)
r = np.zeros((S, S, 4), np.uint8); r[..., 0], r[..., 1], r[..., 2] = 246, 250, 255; r[..., 3] = alpha
Image.fromarray(r).save(f'{OUT}/rays.png')

# drifting mist wisps
mist = Image.new('L', (1200, 420), 0); d = ImageDraw.Draw(mist)
for (cx, cy, rx, ry) in [(600, 230, 520, 120), (380, 200, 260, 90), (820, 250, 300, 80), (600, 180, 220, 70)]:
    d.ellipse((cx-rx, cy-ry, cx+rx, cy+ry), fill=150)
mist = mist.filter(ImageFilter.GaussianBlur(55))
m = np.zeros((420, 1200, 4), np.uint8); m[..., :3] = 255; m[..., 3] = np.array(mist)
Image.fromarray(m).save(f'{OUT}/mist.png')

# crop big transparent layers to what is visible, remember the offsets
for name in ['angel.png', 'lantern.png']:
    im = Image.open(f'{OUT}/{name}'); box = im.getchannel('A').point(lambda v: 255 if v > 3 else 0).getbbox()
    full = f'{OUT}/{name.replace(".png", "-full.png")}'
    import os
    if not os.path.exists(full): im.save(full)
    else: im = Image.open(full); box = im.getchannel('A').point(lambda v: 255 if v > 3 else 0).getbbox()
    im.crop(box).save(f'{OUT}/{name}'); geo[name.split('.')[0] + 'Box'] = list(box)
json.dump(geo, open(f'{OUT}/geometry.json', 'w'), indent=1); print(geo)

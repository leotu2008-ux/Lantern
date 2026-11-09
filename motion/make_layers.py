# Builds motion/public/{sky.jpg,angel.png,lantern.png} from the generated paintings.
# Usage: python3 make_layers.py <folder with one0.png> motion/public  (needs pillow, opencv-python-headless)
import sys, json
import numpy as np, cv2
from PIL import Image, ImageOps, ImageDraw, ImageFilter
GEN, OUT = sys.argv[1], sys.argv[2]
W, H = 1960, 1225
# --- sky (same as the static hero) ---
sky_src = Image.open(f'{GEN}/one0.png').convert('RGB')
sky = sky_src.crop((600, 0, 1344, 752)).resize((round(744*H/752), H), Image.LANCZOS)
sw = sky.size[0]; bg = Image.new('RGB', (W, H)); x, flip = 0, False
while x < W:
    bg.paste(ImageOps.mirror(sky) if flip else sky, (x, 0)); x += sw; flip = not flip
bg.save(f'{OUT}/sky.jpg', quality=92)
# --- lantern mask in original painting coords (880x1168), 4x supersampled ---
SS = 4; ang = Image.open('/home/user/Lantern/extras/angel-source.jpg').convert('RGB')
m = Image.new('L', (880*SS, 1168*SS), 0); d = ImageDraw.Draw(m)
S = lambda *v: [c*SS for c in v]
d.line(S(690, 568, 690, 672), fill=255, width=4*SS)
d.rounded_rectangle(S(660, 668, 722, 688), radius=3*SS, fill=255)
d.ellipse(S(582, 681, 798, 862), fill=255)
d.rounded_rectangle(S(659, 849, 723, 878), radius=3*SS, fill=255)
d.line(S(690, 876, 690, 940), fill=255, width=4*SS)
d.ellipse(S(669, 885, 711, 934), fill=255)
d.polygon(S(683, 930, 697, 930, 705, 962, 703, 1026, 659, 1026, 675, 962), fill=255)
lmask = m.resize((880, 1168), Image.LANCZOS)
# --- remove lantern from the angel painting ---
arr = cv2.cvtColor(np.array(ang), cv2.COLOR_RGB2BGR)
hole = cv2.dilate((np.array(lmask) > 20).astype(np.uint8)*255, np.ones((13, 13), np.uint8))
hole[:572, :] = 0  # keep the fingers
clean = cv2.inpaint(arr, hole, 9, cv2.INPAINT_TELEA)
clean = Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB))
# --- place on canvas exactly like the static hero ---
h = round(H*0.76); w = round(880*h/1168); ox, oy = -70, -50; s = w/880
soft = Image.new('L', (w, h), 0)
ImageDraw.Draw(soft).rounded_rectangle((-60, -60, w-50, h-70), radius=170, fill=255)
soft = soft.filter(ImageFilter.GaussianBlur(46))
# blend the cleaned angel into the sky exactly like the static hero...
blend = bg.copy(); blend.paste(clean.resize((w, h), Image.LANCZOS), (ox, oy), soft)
# ...then cut a wide, soft region around her so the layer edge falls in plain sky
blob = Image.new('L', (W, H), 0)
ImageDraw.Draw(blob).rounded_rectangle((-300, -300, 760, 960), radius=260, fill=255)
blob = blob.filter(ImageFilter.GaussianBlur(90))
angel = blend.convert('RGBA'); angel.putalpha(blob)
angel.save(f'{OUT}/angel.png')
lan = ang.resize((w, h), Image.LANCZOS).convert('RGBA'); lan.putalpha(lmask.resize((w, h), Image.LANCZOS))
tmp = Image.new('RGBA', (W, H), (0,0,0,0)); tmp.paste(lan, (ox, oy), lan); tmp.save(f'{OUT}/lantern.png')
geo = {"W": W, "H": H, "pivot": [ox+690*s, oy+568*s], "lanternCenter": [ox+690*s, oy+771*s], "lanternR": 108*s}
json.dump(geo, open(f'{OUT}/geometry.json', 'w'), indent=1); print(geo)
# preview of the inpainted angel around the lantern
clean.crop((540, 520, 860, 1060)).save(f'{GEN}/inpaint-check.png')

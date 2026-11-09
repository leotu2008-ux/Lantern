# Builds a dark topographic-survey style world map (SVG) from projected.json.
import json, sys, math
import numpy as np, cv2
D = sys.argv[1]
data = json.load(open(f"{D}/projected.json"))
W, H, S = data["W"], data["H"], 3                 # raster at 3x for clean contours
ids = [c["id"] for c in data["continents"]]
label = np.zeros((H * S, W * S), np.uint8)
for i, c in enumerate(data["continents"], 1):
    for ring in c["rings"]:
        pts = (np.array(ring) * S).round().astype(np.int32)
        cv2.fillPoly(label, [pts], i)
land = (label > 0).astype(np.uint8)

# elevation: smooth multi-octave noise, rising away from the coast
rng = np.random.default_rng(11)
noise = np.zeros(label.shape, np.float32)
for octave, amp in [(5, 1.0), (12, .6), (26, .4), (55, .22), (110, .1)]:
    g = rng.random((max(2, H * octave // W), octave)).astype(np.float32)
    noise += amp * cv2.resize(g, (W * S, H * S), interpolation=cv2.INTER_CUBIC)
noise = (noise - noise.min()) / (noise.max() - noise.min())
din = cv2.distanceTransform(land, cv2.DIST_L2, 5)
elev = (1 - np.exp(-din / (10 * S))) * (0.25 + 0.75 * noise) + noise * 0.06
elev = cv2.GaussianBlur(elev, (0, 0), 1.6) * land

def contours(mask, eps=1.0, minlen=8):
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.arcLength(c, True) < minlen * S: continue
        c = cv2.approxPolyDP(c, eps * S / 3, True)
        if len(c) < 3: continue
        out.append(c[:, 0, :] / S)
    return out

def path(polys):
    return "".join("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in p) + "Z" for p in polys)

levels = np.linspace(0.05, 0.97, 44)
groups = {cid: [[] for _ in levels] for cid in ids}
# traced per continent, so lines never run across two continents where they touch
for i, cid in enumerate(ids):
    own = label == i + 1
    for li, lv in enumerate(levels):
        groups[cid][li] = contours((elev > lv) & own)

coast = {cid: path(contours(label == i + 1, eps=0.6, minlen=3)) for i, cid in enumerate(ids)}

# sea: rings that follow the coast outward
dout = cv2.distanceTransform(1 - land, cv2.DIST_L2, 5)
sea = [path(contours(dout < r * S, eps=1.0, minlen=20)) for r in (5, 11, 19, 30, 44)]

f = lambda v: f"{v:.1f}"
grat = "".join("M" + "L".join(f"{f(x)} {f(y)}" for x, y in line) for line in data["grat"] if len(line) > 1)
parts = []
for i, c in enumerate(data["continents"]):
    lv = "".join(f'<path class="lv" style="--l:{li}" d="{path(g)}"/>' for li, g in enumerate(groups[c["id"]]) if g)
    lx, ly = c["label"]
    spaced = " ".join(" ".join(c["name"].upper()).split(" "))
    parts.append(f'''  <g id="{c["id"]}" class="continent" data-name="{c["name"]}">
    <path class="land" d="{coast[c["id"]]}"/>
    {lv}
    <path class="coast" d="{coast[c["id"]]}"/>
    <text class="name" x="{f(lx)}" y="{f(ly)}">{c["name"].upper().replace(" ", "\u00a0\u00a0")}</text>
  </g>''')
ticks = "".join(f'<text class="tick{" lon" if t.get("lon") else ""}" x="{f(t["x"] - (0 if t.get("lon") else 6))}" y="{f(t["y"] + (14 if t.get("lon") else 3))}">{t["t"]}</text>' for t in data["ticks"])
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Topographic-style map of the world by continent">
  <!-- Survey-map style world map. One <g> per continent: id north-america, south-america, europe, africa,
       asia, oceania (Russia counts as Asia), class .continent, data-name. Contours are stylised
       (generated, not real elevation). Coastlines: Natural Earth (public domain). -->
  <defs><clipPath id="globe"><path d="{data["sphere"]}"/></clipPath></defs>
  <style>
    .bg{{fill:#08090c}}
    .frame{{fill:none;stroke:#e9e9e4;stroke-opacity:.5;stroke-width:.8}}
    .grat{{fill:none;stroke:#e9e9e4;stroke-opacity:.16;stroke-width:.5}}
    .sea{{fill:none;stroke:#e9e9e4;stroke-width:.4;opacity:0;animation:fade 1.4s ease forwards}}
    .land{{fill:#111317}}
    .lv{{fill:none;stroke:#e9e9e4;stroke-width:.4;stroke-opacity:.38;opacity:0;animation:fade .9s calc(.5s + var(--l) * .035s) ease forwards;transition:stroke .3s, stroke-opacity .3s}}
    .lv:nth-of-type(5n+2){{stroke-width:.75;stroke-opacity:.6}}
    .coast{{fill:none;stroke:#f4f4ef;stroke-width:.9;stroke-opacity:.9;stroke-dasharray:1 0}}
    .name{{fill:#f4f4ef;font:400 11px "Instrument Serif",Georgia,serif;letter-spacing:.55em;text-anchor:middle;paint-order:stroke;stroke:#08090c;stroke-width:3px;opacity:0;animation:fade 1s 2.2s forwards;pointer-events:none}}
    .tick{{fill:#e9e9e4;fill-opacity:.55;font:400 8px "IBM Plex Mono",monospace;text-anchor:end}}.tick.lon{{text-anchor:middle}}
    .continent{{cursor:pointer}}
    .continent:hover .lv{{stroke:#F2B36A;stroke-opacity:.85}}
    .continent:hover .coast{{stroke:#FFE3A8}}
    .continent:hover .name{{fill:#F2B36A}}
    @keyframes fade{{to{{opacity:1}}}}
    @media (prefers-reduced-motion:reduce){{.sea,.lv,.name{{animation:none;opacity:1}}}}
  </style>
  <rect class="bg" width="{W}" height="{H}"/>
  <g clip-path="url(#globe)">
    <path class="grat" d="{grat}"/>
''' + "".join(f'    <path class="sea" style="stroke-opacity:{.34 - k * .055:.2f};animation-delay:{.2 + k * .12:.2f}s" d="{p}"/>\n' for k, p in enumerate(sea)) + f'''  </g>
  <path class="frame" d="{data["sphere"]}"/>
  {ticks}
{chr(10).join(parts)}
</svg>
'''
open(f"{D}/world-topo.svg", "w").write(svg)
print("bytes", len(svg), {k: sum(len(x) for x in v) for k, v in groups.items()})

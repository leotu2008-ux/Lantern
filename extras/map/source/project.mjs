import fs from "node:fs";
import { merge } from "topojson-client";
import { geoEqualEarth, geoPath, geoCentroid, geoGraticule } from "d3-geo";
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
const cont = JSON.parse(fs.readFileSync("continents.json"));
const ORDER = [["north-america","North America"],["south-america","South America"],["europe","Europe"],["africa","Africa"],["asia","Asia"],["oceania","Oceania"]];
const W = 1200, H = 620;
const shapes = ORDER.map(([id, name]) => ({ id, name, geo: merge(topo, topo.objects.countries.geometries.filter(g => cont[g.id] === id)) }));
{ const eu = shapes.find(s => s.id === "europe").geo, sa = shapes.find(s => s.id === "south-america").geo, keep = [];
  for (const poly of eu.coordinates) { const [lon, lat] = geoCentroid({ type: "Polygon", coordinates: poly }); (lon < -30 && lat < 20 ? sa.coordinates : keep).push(poly); }
  eu.coordinates = keep; }
const proj = geoEqualEarth().fitExtent([[30, 30], [W - 30, H - 30]], { type: "Sphere" });
const cx = W / 2, cy = H / 2, PUSH = { "north-america": 8, "south-america": 12, europe: 6, africa: 8, asia: 8, oceania: 8 };
const out = { W, H, continents: [], sphere: geoPath(proj)({ type: "Sphere" }), labels: {} };
const LABEL = { "north-america": [-100, 45], "south-america": [-60, -15], europe: [18, 52], africa: [20, 5], asia: [95, 45], oceania: [134, -25] };
for (const s of shapes) {
  const [x, y] = proj(geoCentroid(s.geo)); const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, k = PUSH[s.id];
  const tx = dx / d * k, ty = dy / d * k;
  // let d3 cut shapes at the 180° line (Russia's far east, Fiji) so nothing wraps across the map
  const rings = []; let cur = null;
  const ctx = { moveTo(x, y) { cur = [[x + tx, y + ty]]; rings.push(cur); }, lineTo(x, y) { cur.push([x + tx, y + ty]); },
    closePath() {}, arc() {}, rect() {} };
  geoPath(proj, ctx)(s.geo);
  for (let i = rings.length - 1; i >= 0; i--) if (rings[i].length < 3) rings.splice(i, 1);
  const [lx, ly] = proj(LABEL[s.id]);
  out.continents.push({ id: s.id, name: s.name, rings, label: [lx + tx, ly + ty] });
}
// graticule lines as polylines
out.grat = geoGraticule().step([15, 15])().coordinates.map(line => line.map(p => proj(p)).filter(Boolean));
out.ticks = [];
for (let lat = -60; lat <= 75; lat += 15) { const p = proj([-180, lat]); if (p) out.ticks.push({ x: p[0], y: p[1], t: (lat === 0 ? "0" : Math.abs(lat) + (lat > 0 ? "N" : "S")) }); }
for (let lon = -150; lon <= 180; lon += 30) { const p = proj([lon, 0]); if (p) out.ticks.push({ x: p[0], y: p[1], t: Math.abs(lon) + (lon < 0 ? "W" : lon > 0 ? "E" : ""), lon: true }); }
fs.writeFileSync("projected.json", JSON.stringify(out));
console.log("ok", out.continents.map(c => c.id + ":" + c.rings.length).join(" "));

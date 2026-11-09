// Projects Lantern's cities with the same projection and continent offsets as the topo map,
// and builds curved "flight" arcs between them.
import fs from "node:fs";
import { merge } from "topojson-client";
import { geoEqualEarth, geoCentroid } from "d3-geo";
const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json"));
const cont = JSON.parse(fs.readFileSync("continents.json"));
const W = 1200, H = 620;
const proj = geoEqualEarth().fitExtent([[30, 30], [W - 30, H - 30]], { type: "Sphere" });
const PUSH = { "north-america": 8, "south-america": 12, europe: 6, africa: 8, asia: 8, oceania: 8 };
const off = {};
for (const id of Object.keys(PUSH)) {
  const geo = merge(topo, topo.objects.countries.geometries.filter(g => cont[g.id] === id));
  if (id === "europe") geo.coordinates = geo.coordinates.filter(poly => { const [lo, la] = geoCentroid({ type: "Polygon", coordinates: poly }); return !(lo < -30 && la < 20); });
  const [x, y] = proj(geoCentroid(geo)); const dx = x - W / 2, dy = y - H / 2, d = Math.hypot(dx, dy) || 1;
  off[id] = [dx / d * PUSH[id], dy / d * PUSH[id]];
}
const CITIES = [
  ["vancouver", "Vancouver", -123.12, 49.28, "north-america"],
  ["boston", "Boston", -71.06, 42.36, "north-america"],
  ["new-york", "New York", -74.0, 40.71, "north-america"],
  ["pittsburgh", "Pittsburgh", -79.99, 40.44, "north-america"],
  ["london", "London", -0.13, 51.51, "europe"],
  ["hong-kong", "Hong Kong · Shenzhen", 114.17, 22.32, "asia"],
];
const cities = CITIES.map(([id, name, lon, lat, c]) => { const [x, y] = proj([lon, lat]); return { id, name, lon, lat, continent: c, x: +(x + off[c][0]).toFixed(1), y: +(y + off[c][1]).toFixed(1) }; });
const by = Object.fromEntries(cities.map(c => [c.id, c]));
const LINKS = [["boston", "london"], ["new-york", "london"], ["london", "hong-kong"], ["vancouver", "boston"], ["pittsburgh", "new-york"], ["vancouver", "london"], ["boston", "hong-kong"]];
const arcs = LINKS.map(([a, b], i) => {
  const A = by[a], B = by[b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dist = Math.hypot(B.x - A.x, B.y - A.y);
  const lift = Math.min(160, 18 + dist * 0.28);
  return { id: `${a}--${b}`, from: a, to: b, d: `M${A.x} ${A.y}Q${mx.toFixed(1)} ${(my - lift).toFixed(1)} ${B.x} ${B.y}`, i };
});
// scale bar: pixels for 2,000 km along the equator near 0°
const [x0] = proj([0, 0]), [x1] = proj([2000 / 111.32, 0]);
fs.writeFileSync("network.json", JSON.stringify({ W, H, cities, arcs, km2000: +(x1 - x0).toFixed(1) }, null, 1));
console.log(cities.map(c => c.id + "@" + c.x + "," + c.y).join("  "), "km2000px", (x1 - x0).toFixed(1));

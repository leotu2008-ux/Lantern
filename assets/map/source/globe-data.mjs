// Converts the topo map's contour lines back to longitude/latitude (undoing each continent's nudge)
// and packs everything the 3D globe needs into one small JSON file.
import fs from "node:fs";
import { merge } from "topojson-client";
import { geoEqualEarth, geoCentroid } from "d3-geo";
const topo110 = JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-110m.json"));
const cont = JSON.parse(fs.readFileSync("continents.json"));
const net = JSON.parse(fs.readFileSync("network.json"));
const lines = JSON.parse(fs.readFileSync("contours.json"));
const W = 1200, H = 620;
const proj = geoEqualEarth().fitExtent([[30, 30], [W - 30, H - 30]], { type: "Sphere" });
const ORDER = [["north-america","North America"],["south-america","South America"],["europe","Europe"],["africa","Africa"],["asia","Asia"],["oceania","Oceania"]];
const PUSH = { "north-america": 8, "south-america": 12, europe: 6, africa: 8, asia: 8, oceania: 8 };
const r2 = v => Math.round(v * 100) / 100;
const out = { continents: [], cities: net.cities.map(c => ({ id: c.id, name: c.name, lon: c.lon, lat: c.lat, c: c.continent })), links: net.arcs.map(a => [a.from, a.to]) };
for (const [id, name] of ORDER) {
  const geo = merge(topo110, topo110.objects.countries.geometries.filter(g => cont[g.id] === id));
  if (id === "europe" || id === "south-america") {
    const eu = merge(topo110, topo110.objects.countries.geometries.filter(g => cont[g.id] === "europe"));
    const fg = eu.coordinates.filter(p => { const [lo, la] = geoCentroid({ type: "Polygon", coordinates: p }); return lo < -30 && la < 20; });
    if (id === "europe") geo.coordinates = geo.coordinates.filter(p => !fg.includes(p) && !(geoCentroid({ type: "Polygon", coordinates: p })[0] < -30 && geoCentroid({ type: "Polygon", coordinates: p })[1] < 20));
    else geo.coordinates.push(...fg);
  }
  // the continent's nudge on the flat map, to undo before inverting
  const big = merge(JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json")), JSON.parse(fs.readFileSync("node_modules/world-atlas/countries-50m.json")).objects.countries.geometries.filter(g => cont[g.id] === id));
  const [x, y] = proj(geoCentroid(big)); const dx = x - W / 2, dy = y - H / 2, d = Math.hypot(dx, dy) || 1, ox = dx / d * PUSH[id], oy = dy / d * PUSH[id];
  const levels = lines[id].map(level => level.map(poly => {
    const pts = []; for (const [px, py] of poly) { const ll = proj.invert([px - ox, py - oy]); if (ll && isFinite(ll[0])) pts.push([r2(ll[0]), r2(ll[1])]); }
    return pts;
  }).filter(p => p.length > 3));
  const coast = geo.coordinates.map(poly => poly.map(ring => ring.map(([a, b]) => [r2(a), r2(b)])));
  out.continents.push({ id, name, coast, levels });
}
fs.writeFileSync("globe-data.json", JSON.stringify(out));
console.log("bytes", fs.statSync("globe-data.json").size, out.continents.map(c => c.id + ":" + c.levels.flat().length).join(" "));

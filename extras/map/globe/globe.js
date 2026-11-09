// Lantern topographic globe: canvas 2D + d3-geo orthographic. Spins, drags, hovers.
import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoInterpolate, geoDistance } from "d3-geo";
import data from "./globe-data.json";

const canvas = document.getElementById("globe"), ctx = canvas.getContext("2d");
const label = document.getElementById("label");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "246,241,231", AMBER = "242,179,106"; // site ivory + lantern amber
const proj = geoOrthographic().clipAngle(90).precision(0.6), path = geoPath(proj, ctx);
const grat = geoGraticule10();
// every Lantern city lights in turn; label offsets keep the East Coast cluster readable
const CITIES = [
  { id: "london", name: "London", lon: -0.13, lat: 51.51, c: "europe", dx: 8, dy: -8 },
  { id: "boston", name: "Boston", lon: -71.06, lat: 42.36, c: "north-america", dx: 8, dy: -9 },
  { id: "new-york", name: "New York", lon: -74.0, lat: 40.71, c: "north-america", dx: 8, dy: 12 },
  { id: "pittsburgh", name: "Pittsburgh", lon: -79.99, lat: 40.44, c: "north-america", dx: -8, dy: 3, end: true },
  { id: "vancouver", name: "Vancouver", lon: -123.12, lat: 49.28, c: "north-america", dx: -8, dy: -6, end: true },
  { id: "hong-kong", name: "Hong Kong", lon: 114.17, lat: 22.32, c: "asia", dx: 8, dy: 12 },
  { id: "shenzhen", name: "Shenzhen", lon: 114.06, lat: 22.54, c: "asia", dx: 8, dy: -7 },
].map((c, i) => ({ ...c, at: 1.4 + i * 0.55 }));
data.cities = CITIES;
data.links = [["boston", "london"], ["new-york", "london"], ["pittsburgh", "new-york"], ["vancouver", "boston"], ["london", "hong-kong"], ["hong-kong", "shenzhen"], ["vancouver", "hong-kong"], ["boston", "shenzhen"]];
const byId = Object.fromEntries(data.cities.map(c => [c.id, c]));
const conts = data.continents.map(c => ({ ...c,
  coastGeo: { type: "MultiPolygon", coordinates: c.coast },
  linesGeo: { type: "MultiLineString", coordinates: c.levels.flat() } }));
const arcs = data.links.map(([a, b], i) => { const A = byId[a], B = byId[b];
  return { i, a: A, b: B, interp: geoInterpolate([A.lon, A.lat], [B.lon, B.lat]), geo: { type: "LineString", coordinates: Array.from({ length: 49 }, (_, k) => geoInterpolate([A.lon, A.lat], [B.lon, B.lat])(k / 48)) } }; });

// North America centred to start; scrolling turns the globe (one full turn over the scroll),
// eased so it glides rather than jumps. Dragging adds its own offset on top.
const HOME = [98, -38];
let scrollSpin = 0, scrollTarget = 0, dragOffset = 0;
const readScroll = () => { const max = Math.max(1, document.documentElement.scrollHeight - innerHeight); scrollTarget = (scrollY / max) * 360; };
addEventListener("scroll", readScroll, { passive: true }); addEventListener("resize", readScroll); readScroll();
let size = 0, rot = HOME.slice(), vel = 0.12, hover = null, dragging = false, last = performance.now(), t0 = last;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth;
  size = w; canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  proj.translate([w / 2, w / 2]).scale(w * 0.44);
}
new ResizeObserver(resize).observe(canvas); resize();

const visible = ([lon, lat]) => geoDistance([lon, lat], [-rot[0], -rot[1]]) < Math.PI / 2 - 0.02;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  scrollSpin += (scrollTarget - scrollSpin) * (reduce ? 1 : Math.min(1, dt * 6));
  if (!dragging) rot[0] = HOME[0] + dragOffset - scrollSpin;
  proj.rotate(rot);
  const s = size, r = proj.scale(), c = s / 2, t = (now - t0) / 1000;
  ctx.clearRect(0, 0, s, s);
  // atmosphere and body
  let g = ctx.createRadialGradient(c, c, r * 0.96, c, c, r * 1.12);
  g.addColorStop(0, `rgba(${AMBER},.18)`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r * 1.12, 0, 7); ctx.fill();
  g = ctx.createRadialGradient(c - r * .35, c - r * .4, r * .1, c, c, r);
  g.addColorStop(0, "#26375c"); g.addColorStop(1, "#111a2e"); // site night navy, lit from the upper left
  ctx.fillStyle = g; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill();
  ctx.lineWidth = 0.5; ctx.strokeStyle = `rgba(${INK},.12)`; ctx.beginPath(); path(grat); ctx.stroke();
  // land: dark fill, contour lines, coastline
  const fade = Math.min(1, t / 2.2);
  for (const k of conts) {
    const on = hover === k.id, col = on ? AMBER : INK;
    ctx.fillStyle = on ? "rgba(242,179,106,.10)" : "rgba(10,16,30,.55)"; ctx.beginPath(); path(k.coastGeo); ctx.fill();
    ctx.lineWidth = 0.55; ctx.strokeStyle = `rgba(${col},${(on ? .75 : .38) * fade})`; ctx.beginPath(); path(k.linesGeo); ctx.stroke();
    ctx.lineWidth = on ? 1.2 : 0.9; ctx.strokeStyle = `rgba(${col},${on ? 1 : .85})`; ctx.beginPath(); path(k.coastGeo); ctx.stroke();
  }
  ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${INK},.55)`; ctx.beginPath(); path({ type: "Sphere" }); ctx.stroke();
  // cities light like lanterns, one after another; their glow lights the land around them
  const lit = city => Math.max(0, Math.min(1, (t - city.at) / 0.6));
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const city of data.cities) {
    const k = lit(city), ll = [city.lon, city.lat]; if (!k || !visible(ll)) continue;
    const [x, y] = proj(ll), flick = 0.9 + 0.1 * Math.sin(t * 7 + city.lon) * Math.sin(t * 3.1 + city.lat);
    const R = r * 0.16 * (1 + 0.5 * Math.max(0, 1 - (t - city.at) / 1.4));
    const glow = ctx.createRadialGradient(x, y, 0, x, y, R);
    glow.addColorStop(0, `rgba(255,190,110,${0.42 * k * flick})`); glow.addColorStop(0.35, `rgba(242,150,70,${0.16 * k * flick})`); glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
  }
  ctx.restore();
  // links draw once both ends are lit, then carry travelling lights
  for (const a of arcs) {
    const start = Math.max(a.a.at, a.b.at) + 0.4, p = Math.max(0, Math.min(1, (t - start) / 1.1));
    if (!p) continue;
    const n = Math.max(2, Math.round(48 * p));
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${AMBER},.6)`; ctx.beginPath();
    path({ type: "LineString", coordinates: Array.from({ length: n + 1 }, (_, k) => a.interp(k / n * p)) }); ctx.stroke();
    if (p < 1) continue;
    const q = ((t * 0.28 + a.i * 0.37) % 1), ll = a.interp(q);
    if (!visible(ll)) continue;
    const [x, y] = proj(ll); ctx.fillStyle = "rgba(255,227,168,.95)"; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
  }
  for (const city of data.cities) {
    const k = lit(city), ll = [city.lon, city.lat]; if (!visible(ll)) continue;
    const [x, y] = proj(ll), since = t - city.at;
    if (k <= 0) { ctx.fillStyle = `rgba(${INK},.35)`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); continue; }
    if (since < 1.2) { // ignition ring
      const e = since / 1.2; ctx.lineWidth = 1.4 * (1 - e); ctx.strokeStyle = `rgba(255,235,200,${1 - e})`;
      ctx.beginPath(); ctx.arc(x, y, 3 + e * 26, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,240,210,${k})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${AMBER},${k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 7); ctx.stroke();
    ctx.font = "600 9px 'Josefin Sans', sans-serif"; ctx.letterSpacing = "2px"; ctx.textAlign = city.end ? "right" : "left";
    ctx.fillStyle = `rgba(${hover && hover !== city.c ? INK + ",.35" : "255,240,210," + k})`;
    ctx.fillText(city.name.toUpperCase(), x + city.dx, y + city.dy); ctx.textAlign = "left";
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// pointer: drag to turn, hover/tap to light a continent
let down = null;
function pick(e) {
  const b = canvas.getBoundingClientRect(), ll = proj.invert([e.clientX - b.left, e.clientY - b.top]);
  if (!ll || Math.hypot(e.clientX - b.left - size / 2, e.clientY - b.top - size / 2) > proj.scale()) return null;
  const hit = conts.find(k => geoContains(k.coastGeo, ll)); return hit ? hit.id : null;
}
function setHover(id) { hover = id; const k = conts.find(c => c.id === id); label.textContent = k ? k.name : "Scroll to turn · hover a continent"; canvas.style.cursor = id ? "pointer" : (dragging ? "grabbing" : "grab"); }
canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, rot: rot.slice() }; dragging = false; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => {
  if (down) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 4) dragging = true;
    if (dragging) { const k = 180 / (proj.scale() * Math.PI); rot = [down.rot[0] + dx * k, Math.max(-60, Math.min(60, down.rot[1] - dy * k))]; dragOffset = rot[0] - HOME[0] + scrollSpin; }
  } else if (e.pointerType === "mouse") setHover(pick(e));
});
canvas.addEventListener("pointerup", e => { if (!dragging) setHover(pick(e)); down = null; dragging = false; });
canvas.addEventListener("pointerleave", () => { if (!down) setHover(null); });

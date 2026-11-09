// Lantern topographic globe: canvas 2D + d3-geo orthographic. Spins, drags, hovers.
import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoInterpolate, geoDistance } from "d3-geo";
import data from "./globe-data.json";

const canvas = document.getElementById("globe"), ctx = canvas.getContext("2d");
const label = document.getElementById("label");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "233,233,228", AMBER = "242,179,106";
const proj = geoOrthographic().clipAngle(90).precision(0.6), path = geoPath(proj, ctx);
const grat = geoGraticule10();
const byId = Object.fromEntries(data.cities.map(c => [c.id, c]));
const conts = data.continents.map(c => ({ ...c,
  coastGeo: { type: "MultiPolygon", coordinates: c.coast },
  linesGeo: { type: "MultiLineString", coordinates: c.levels.flat() } }));
const arcs = data.links.map(([a, b], i) => { const A = byId[a], B = byId[b];
  return { i, interp: geoInterpolate([A.lon, A.lat], [B.lon, B.lat]), geo: { type: "LineString", coordinates: Array.from({ length: 49 }, (_, k) => geoInterpolate([A.lon, A.lat], [B.lon, B.lat])(k / 48)) } }; });

let size = 0, rot = [-20, -18], vel = 0.12, hover = null, dragging = false, last = performance.now(), t0 = last;
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
  if (!dragging && !reduce) rot[0] += vel * dt * 60 * (hover ? 0.25 : 1);
  proj.rotate(rot);
  const s = size, r = proj.scale(), c = s / 2, t = (now - t0) / 1000;
  ctx.clearRect(0, 0, s, s);
  // atmosphere and body
  let g = ctx.createRadialGradient(c, c, r * 0.96, c, c, r * 1.12);
  g.addColorStop(0, `rgba(${AMBER},.18)`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r * 1.12, 0, 7); ctx.fill();
  g = ctx.createRadialGradient(c - r * .35, c - r * .4, r * .1, c, c, r);
  g.addColorStop(0, "#15181f"); g.addColorStop(1, "#08090c");
  ctx.fillStyle = g; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill();
  ctx.lineWidth = 0.5; ctx.strokeStyle = `rgba(${INK},.12)`; ctx.beginPath(); path(grat); ctx.stroke();
  // land: dark fill, contour lines, coastline
  const fade = Math.min(1, t / 2.2);
  for (const k of conts) {
    const on = hover === k.id, col = on ? AMBER : INK;
    ctx.fillStyle = on ? "rgba(242,179,106,.08)" : "#101217"; ctx.beginPath(); path(k.coastGeo); ctx.fill();
    ctx.lineWidth = 0.55; ctx.strokeStyle = `rgba(${col},${(on ? .75 : .38) * fade})`; ctx.beginPath(); path(k.linesGeo); ctx.stroke();
    ctx.lineWidth = on ? 1.2 : 0.9; ctx.strokeStyle = `rgba(${col},${on ? 1 : .85})`; ctx.beginPath(); path(k.coastGeo); ctx.stroke();
  }
  ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${INK},.55)`; ctx.beginPath(); path({ type: "Sphere" }); ctx.stroke();
  // network: arcs, travelling pulses, cities
  const net = Math.max(0, Math.min(1, (t - 1.6) / 1.2));
  if (net > 0) {
    ctx.lineWidth = 1; ctx.strokeStyle = `rgba(${AMBER},${.6 * net})`;
    for (const a of arcs) { ctx.beginPath(); path(a.geo); ctx.stroke(); }
    for (const a of arcs) {
      const p = ((t * 0.28 + a.i * 0.37) % 1), ll = a.interp(p);
      if (!visible(ll)) continue;
      const [x, y] = proj(ll); ctx.fillStyle = `rgba(255,227,168,${net})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
    }
    for (const city of data.cities) {
      const ll = [city.lon, city.lat]; if (!visible(ll)) continue;
      const [x, y] = proj(ll), pulse = (Math.sin(t * 2.2 + city.lon) + 1) / 2;
      ctx.fillStyle = `rgba(${AMBER},${.18 * net * (1 - pulse * .6)})`; ctx.beginPath(); ctx.arc(x, y, 5 + pulse * 6, 0, 7); ctx.fill();
      ctx.fillStyle = `rgba(255,227,168,${net})`; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
      if (hover === city.c || hover === null && !city.id.match(/new-york|pittsburgh/)) {
        ctx.font = "8px 'IBM Plex Mono', monospace"; ctx.fillStyle = `rgba(${INK},${.85 * net})`;
        ctx.fillText(city.name.toUpperCase(), x + 7, y - 6);
      }
    }
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
function setHover(id) { hover = id; const k = conts.find(c => c.id === id); label.textContent = k ? k.name : "Drag to turn · hover a continent"; canvas.style.cursor = id ? "pointer" : (dragging ? "grabbing" : "grab"); }
canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, rot: rot.slice() }; dragging = false; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => {
  if (down) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 4) dragging = true;
    if (dragging) { const k = 180 / (proj.scale() * Math.PI); rot = [down.rot[0] + dx * k, Math.max(-60, Math.min(60, down.rot[1] - dy * k))]; }
  } else if (e.pointerType === "mouse") setHover(pick(e));
});
canvas.addEventListener("pointerup", e => { if (!dragging) setHover(pick(e)); down = null; dragging = false; });
canvas.addEventListener("pointerleave", () => { if (!down) setHover(null); });

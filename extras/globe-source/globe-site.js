// Lantern topographic globe: canvas 2D + d3-geo orthographic. Spins, drags, hovers.
import { geoOrthographic, geoPath, geoGraticule10, geoContains, geoInterpolate, geoDistance, geoCircle } from "d3-geo";
import data from "./globe-data.json";

const canvas = document.getElementById("network-globe");
if (canvas) {
const ctx = canvas.getContext("2d");
const label = document.getElementById("globe-label");
const section = canvas.closest("section") || document.body;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "22,33,58", AMBER = "214,120,48", GOLD = "176,132,62"; // desk globe: ivory ball, gold land, navy labels
const ATLAS = canvas.dataset.style === "atlas"; // drawn onto the marble ball Atlas carries
const AXIS = ATLAS ? 0 : 23.5; // the axis leans like a real desk globe
const proj = geoOrthographic().clipAngle(90).precision(0.6), path = geoPath(proj, ctx);
const grat = geoGraticule10();
// every Lantern city lights in turn; label offsets keep the East Coast cluster readable
const CITIES = [
  { id: "new-york", name: "New York", lon: -74.0, lat: 40.71, c: "north-america", dx: 8, dy: 12 },
  { id: "boston", name: "Boston", lon: -71.06, lat: 42.36, c: "north-america", dx: 8, dy: -9 },
  { id: "toronto", name: "Toronto", lon: -79.38, lat: 43.65, c: "north-america", dx: -8, dy: -8, end: true },
  { id: "pittsburgh", name: "Pittsburgh", lon: -79.99, lat: 40.44, c: "north-america", dx: -8, dy: 10, end: true },
  { id: "san-francisco", name: "San Francisco", lon: -122.42, lat: 37.77, c: "north-america", dx: -8, dy: 3, end: true },
  { id: "los-angeles", name: "Los Angeles", lon: -118.24, lat: 34.05, c: "north-america", dx: 8, dy: 10 },
  { id: "vancouver", name: "Vancouver", lon: -123.12, lat: 49.28, c: "north-america", dx: -8, dy: -6, end: true },
  { id: "london", name: "London", lon: -0.13, lat: 51.51, c: "europe", dx: 8, dy: -8 },
  { id: "shanghai", name: "Shanghai", lon: 121.47, lat: 31.23, c: "asia", dx: 8, dy: -6 },
  { id: "shenzhen", name: "Shenzhen", lon: 114.06, lat: 22.54, c: "asia", dx: -8, dy: -6, end: true },
  { id: "hong-kong", name: "Hong Kong", lon: 114.17, lat: 22.32, c: "asia", dx: 8, dy: 12 },
].map((c, i) => ({ ...c, at: 0.6 + i * 0.25 }));
data.cities = CITIES;
data.links = [["new-york", "london"], ["boston", "london"], ["toronto", "new-york"], ["pittsburgh", "new-york"], ["san-francisco", "new-york"], ["los-angeles", "san-francisco"], ["vancouver", "san-francisco"], ["london", "shanghai"], ["shanghai", "hong-kong"], ["hong-kong", "shenzhen"], ["san-francisco", "shanghai"], ["vancouver", "hong-kong"]];
const byId = Object.fromEntries(data.cities.map(c => [c.id, c]));
const conts = data.continents.map(c => ({ ...c,
  coastGeo: { type: "MultiPolygon", coordinates: c.coast },
  linesGeo: { type: "MultiLineString", coordinates: c.levels.flat() } }));
const arcs = data.links.map(([a, b], i) => { const A = byId[a], B = byId[b];
  return { i, a: A, b: B, interp: geoInterpolate([A.lon, A.lat], [B.lon, B.lat]), geo: { type: "LineString", coordinates: Array.from({ length: 49 }, (_, k) => geoInterpolate([A.lon, A.lat], [B.lon, B.lat])(k / 48)) } }; });

// North America centred to start; scrolling turns the globe (one full turn over the scroll),
// eased so it glides rather than jumps. Dragging adds its own offset on top.
const HOME = [98, 0, AXIS];
let scrollSpin = 0, scrollTarget = 0, dragOffset = 0, dragTilt = 0, spinV = 0, idle = 0, touched = false;
// turns as the Our Network section passes through the screen
// pinned stage: progress runs while the section's sticky frame holds the screen; one full turn
const bar = document.getElementById("network-progress");
const readScroll = () => { const r = section.getBoundingClientRect(); const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
  scrollTarget = p * 360; if (bar) bar.style.transform = `scaleX(${p})`; };
addEventListener("scroll", readScroll, { passive: true }); addEventListener("resize", readScroll); readScroll();
let size = 0, rot = HOME.slice(), vel = 0.12, hover = null, dragging = false, last = performance.now(), t0 = last;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth;
  size = w; canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (ATLAS) proj.translate([w / 2, w / 2]).scale(w * 0.5); else proj.translate([w / 2, w * 0.4]).scale(w * 0.32);
}
new ResizeObserver(resize).observe(canvas); resize();
// the cities light when the globe first comes into view, not at page load
let seen = false;
new IntersectionObserver((e) => { if (!seen && e[0].isIntersecting) { seen = true; t0 = performance.now(); } }, { threshold: 0.4 }).observe(canvas);

// Atlas mode: the city list turns the globe; focus = the city being shown
let focus = null, aim = null;
// the real sun: where it is overhead right now (page can shift the clock through window.LanternClock)
const clockNow = () => (window.LanternClock && window.LanternClock.now) ? window.LanternClock.now() : new Date();
const R2D = 180 / Math.PI, D2R = Math.PI / 180;
function subsolar(date) {
  const d = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 864e5;
  const g = (357.529 + 0.98560028 * d) * D2R, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R, e = (23.439 - 0.00000036 * d) * D2R;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) * R2D, dec = Math.asin(Math.sin(e) * Math.sin(L)) * R2D;
  const gmst = (18.697374558 + 24.06570982441908 * d) % 24 * 15;
  return [((ra - gmst + 540) % 360) - 180, dec];
}
const shade = geoCircle();
const wrapDeg = d => ((d + 540) % 360) - 180;
window.LanternGlobe = { spinTo(id) { const c = byId[id]; if (!c) return; focus = id; aim = [-c.lon, -c.lat * 0.75]; touched = true; },
  release() { focus = null; aim = null; } };
const visible = ([lon, lat]) => geoDistance([lon, lat], [-rot[0], -rot[1]]) < Math.PI / 2 - 0.02;

// antique brass half-meridian: from the north pole round the left side to the foot of the ball
function drawRing(c, cy, r) {
  const n = proj([0, 90]), sp = proj([0, -90]), R = r * 1.085, w = Math.max(3, r * .055);
  // the ring runs pole to pole round the left side, passing under the ball where the stand holds it
  const a0 = Math.atan2(sp[1] - cy, sp[0] - c); let a1 = Math.atan2(n[1] - cy, n[0] - c); while (a1 < a0) a1 += Math.PI * 2;
  const g = ctx.createLinearGradient(c - R, cy - R, c + R * .2, cy + R);
  g.addColorStop(0, "#a07a4c"); g.addColorStop(.35, "#6d4a2c"); g.addColorStop(.6, "#8c6a43"); g.addColorStop(1, "#4f3420");
  ctx.lineCap = "round"; ctx.lineWidth = w; ctx.strokeStyle = g;
  ctx.beginPath(); ctx.arc(c, cy, R, a0, a1); ctx.stroke();
  ctx.lineWidth = Math.max(1, w * .25); ctx.strokeStyle = "rgba(255,230,190,.35)";
  ctx.beginPath(); ctx.arc(c, cy, R - w * .2, Math.PI * .8, a1 - .1); ctx.stroke();
  // pivot pins at both poles
  for (const [px, py] of [n, sp]) {
    const ox = (px - c) / r, oy = (py - cy) / r;
    ctx.lineWidth = Math.max(1.5, r * .02); ctx.strokeStyle = "#5a3d24"; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(c + ox * R, cy + oy * R); ctx.stroke();
    ctx.fillStyle = "#8c6a43"; ctx.beginPath(); ctx.arc(c + ox * R, cy + oy * R, w * .75, 0, 7); ctx.fill();
  }
  ctx.lineCap = "butt";
}
// turned mango-wood stand: a short neck, a bulb, a stepped round base
function drawStand(c, cy, r) {
  const top = cy + r * 1.085, base = cy + r * 1.72, bw = r * .62, bh = r * .13;
  const wood = (x0, x1) => { const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#8a5a2e"); g.addColorStop(.3, "#d2a36a"); g.addColorStop(.55, "#c08a50"); g.addColorStop(1, "#7a4c24"); return g; };
  // shadow on the floor
  let g = ctx.createRadialGradient(c, base + bh * .9, 0, c, base + bh * .9, bw * 1.25);
  g.addColorStop(0, "rgba(40,30,20,.22)"); g.addColorStop(1, "rgba(40,30,20,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(c, base + bh * .9, bw * 1.25, bh * 1.1, 0, 0, 7); ctx.fill();
  // base: side then top
  ctx.fillStyle = wood(c - bw, c + bw);
  ctx.beginPath(); ctx.ellipse(c, base + bh * .55, bw, bh * .55, 0, 0, Math.PI); ctx.lineTo(c - bw, base);
  ctx.ellipse(c, base, bw, bh * .55, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d8ad75"; ctx.beginPath(); ctx.ellipse(c, base, bw, bh * .55, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(120,80,40,.35)"; ctx.lineWidth = 0.8;
  for (const k of [.82, .62]) { ctx.beginPath(); ctx.ellipse(c, base, bw * k, bh * .55 * k, 0, 0, 7); ctx.stroke(); }
  // turned column: neck, bulb, collar
  const h = base - top, nw = r * .06;
  ctx.fillStyle = wood(c - r * .2, c + r * .2);
  ctx.beginPath();
  ctx.moveTo(c - nw, top);
  ctx.bezierCurveTo(c - nw, top + h * .25, c - r * .2, top + h * .35, c - r * .19, top + h * .6);
  ctx.bezierCurveTo(c - r * .18, top + h * .8, c - r * .1, top + h * .82, c - r * .14, base - bh * .1);
  ctx.lineTo(c + r * .14, base - bh * .1);
  ctx.bezierCurveTo(c + r * .1, top + h * .82, c + r * .18, top + h * .8, c + r * .19, top + h * .6);
  ctx.bezierCurveTo(c + r * .2, top + h * .35, c + nw, top + h * .25, c + nw, top);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6d4a2c"; ctx.beginPath(); ctx.ellipse(c, top + r * .01, nw * 1.6, nw * .55, 0, 0, 7); ctx.fill();
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // critically damped follow: smooth and weighty, no jumps between scroll steps
  if (reduce) { scrollSpin = scrollTarget; spinV = 0; }
  else { const k = 7; spinV += ((scrollTarget - scrollSpin) * k * k - 2 * k * spinV) * dt; scrollSpin += spinV * dt; }
  if (!touched) idle += dt * (reduce ? 0 : 3.5);         // a slow drift until someone moves it by hand
  if (ATLAS) {
    if (aim && !dragging) { const e = 1 - Math.exp(-dt * 4.5); // glide the shortest way round to the city
      rot[0] += wrapDeg(aim[0] - rot[0]) * e; rot[1] += (aim[1] - rot[1]) * e; }
    else if (!dragging && !reduce) { rot[0] -= dt * 3.5; rot[1] += (-28 - rot[1]) * (1 - Math.exp(-dt * 1.5)); }
    rot[2] = 0;
  } else {
  if (!dragging) rot[0] = HOME[0] + dragOffset - scrollSpin - idle; // stays wherever it was dragged
  rot[1] = 0; rot[2] = AXIS;
  }
  proj.rotate(rot);
  const s = size, r = proj.scale(), [c, cy] = proj.translate(), t = seen ? (now - t0) / 1000 : 0;
  ctx.clearRect(0, 0, s, s);
  if (!ATLAS) drawStand(c, cy, r);
  // the ball: ivory, faintly blush, lit from the upper left
  let g = ctx.createRadialGradient(c - r * .4, cy - r * .45, r * .05, c, cy, r);
  g.addColorStop(0, "#ffffff"); g.addColorStop(.55, "#f6f1ec"); g.addColorStop(1, "#ddd3cc");
  if (!ATLAS) { ctx.fillStyle = g; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill(); }
  ctx.lineWidth = 0.5; ctx.strokeStyle = ATLAS ? "rgba(110,95,80,.16)" : "rgba(120,110,105,.22)"; ctx.beginPath(); path(grat); ctx.stroke();
  // land: dark fill, contour lines, coastline
  const fade = Math.min(1, t / 2.2);
  const landGold = ctx.createLinearGradient(c - r, cy - r, c + r, cy + r);
  landGold.addColorStop(0, "#e8cf96"); landGold.addColorStop(.45, "#c9a25a"); landGold.addColorStop(.7, "#e3c483"); landGold.addColorStop(1, "#a97f3c");
  for (const k of conts) {
    const on = hover === k.id, col = on ? AMBER : GOLD;
    ctx.fillStyle = on ? "rgba(214,120,48,.42)" : ATLAS ? "rgba(150,118,80,.30)" : landGold; ctx.beginPath(); path(k.coastGeo); ctx.fill();
    ctx.lineWidth = 0.5; ctx.strokeStyle = `rgba(${col},${(on ? .55 : .35) * fade})`; ctx.beginPath(); path(k.linesGeo); ctx.stroke();
    ctx.lineWidth = on ? 1.1 : 0.7; ctx.strokeStyle = `rgba(${on ? AMBER : ATLAS ? "110,82,52" : "140,100,40"},${on ? 1 : ATLAS ? .55 : .8})`; ctx.beginPath(); path(k.coastGeo); ctx.stroke();
  }
  // night side: deep night, then three twilight bands (sun 6, 12, 18 degrees below the horizon)
  const sun = subsolar(clockNow()), anti = [sun[0] + 180, -sun[1]];
  for (const [rad, a] of [[90, .09], [84, .09], [78, .09], [72, .13]]) {
    ctx.fillStyle = `rgba(14,22,44,${a})`; ctx.beginPath(); path(shade.center(anti).radius(rad)()); ctx.fill();
  }
  // roundness: shade toward the edge, a soft gloss up top
  if (!ATLAS) {
  g = ctx.createRadialGradient(c - r * .3, cy - r * .35, r * .5, c, cy, r * 1.02);
  g.addColorStop(0, "rgba(70,45,30,0)"); g.addColorStop(1, "rgba(70,45,30,.22)");
  ctx.fillStyle = g; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill();
  g = ctx.createRadialGradient(c - r * .42, cy - r * .5, 0, c - r * .42, cy - r * .5, r * .45);
  g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.beginPath(); path({ type: "Sphere" }); ctx.fill();
  ctx.lineWidth = 0.8; ctx.strokeStyle = "rgba(90,70,55,.35)"; ctx.beginPath(); path({ type: "Sphere" }); ctx.stroke();
  drawRing(c, cy, r);
  }
  // cities light like lanterns, one after another; their glow lights the land around them
  const lit = city => Math.max(0, Math.min(1, (t - city.at) / 0.6));
  ctx.save(); ctx.globalCompositeOperation = "multiply";
  for (const city of data.cities) {
    const k = lit(city), ll = [city.lon, city.lat]; if (!k || !visible(ll)) continue;
    const [x, y] = proj(ll), flick = 0.9 + 0.1 * Math.sin(t * 7 + city.lon) * Math.sin(t * 3.1 + city.lat);
    const dark = Math.max(0, Math.min(1, (90 - geoDistance(ll, sun) * R2D) / -12)); // 0 in daylight, 1 once the sun is 12 degrees down
    const R = r * 0.16 * (1 + 0.5 * Math.max(0, 1 - (t - city.at) / 1.4)) * (1 + 0.7 * dark);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, R);
    glow.addColorStop(0, `rgba(240,170,90,${0.55 * k * flick})`); glow.addColorStop(0.35, `rgba(245,200,140,${0.25 * k * flick})`); glow.addColorStop(1, "rgba(0,0,0,0)");
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
    const [x, y] = proj(ll); ctx.fillStyle = "rgba(214,120,48,.95)"; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
  }
  for (const city of data.cities) {
    const k = lit(city), ll = [city.lon, city.lat]; if (!visible(ll)) continue;
    const [x, y] = proj(ll), since = t - city.at;
    if (k <= 0) { ctx.fillStyle = `rgba(${INK},.35)`; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); continue; }
    if (since < 1.2) { // ignition ring
      const e = since / 1.2; ctx.lineWidth = 1.4 * (1 - e); ctx.strokeStyle = `rgba(214,120,48,${1 - e})`;
      ctx.beginPath(); ctx.arc(x, y, 3 + e * 26, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = `rgba(214,120,48,${k})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${AMBER},${k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 4.6, 0, 7); ctx.stroke();
    if (ATLAS && city.id !== focus) continue;
    if (ATLAS) { ctx.strokeStyle = `rgba(${AMBER},.9)`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 9 + 2 * Math.sin(t * 4), 0, 7); ctx.stroke(); }
    ctx.font = ATLAS ? "600 11px 'Josefin Sans', sans-serif" : "600 9px 'Josefin Sans', sans-serif"; ctx.letterSpacing = "2px"; ctx.textAlign = city.end ? "right" : "left";
    ctx.fillStyle = `rgba(${INK},${hover && hover !== city.c ? .3 : .9 * k})`;
    ctx.fillText(city.name.toUpperCase(), x + city.dx, y + city.dy); ctx.textAlign = "left";
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// pointer: drag to turn, hover/tap to light a continent
let down = null;
function pick(e) {
  const b = canvas.getBoundingClientRect(), ll = proj.invert([e.clientX - b.left, e.clientY - b.top]);
  if (!ll || Math.hypot(e.clientX - b.left - proj.translate()[0], e.clientY - b.top - proj.translate()[1]) > proj.scale()) return null;
  const hit = conts.find(k => geoContains(k.coastGeo, ll)); return hit ? hit.id : null;
}
function setHover(id) { hover = id; const k = conts.find(c => c.id === id); if (label) label.textContent = k ? k.name : "Hover a continent"; canvas.style.cursor = id ? "pointer" : (dragging ? "grabbing" : "grab"); }
canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, rot: rot.slice() }; dragging = false; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", e => {
  if (down) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.hypot(dx, dy) > 4) dragging = true;
    if (dragging) { const k = 180 / (proj.scale() * Math.PI); touched = true;
      rot[0] = down.rot[0] + dx * k; // a desk globe only turns on its axis
      if (ATLAS) { rot[1] = Math.max(-70, Math.min(70, down.rot[1] - dy * k)); aim = null; }
      dragOffset = rot[0] - HOME[0] + scrollSpin + idle; }
  } else if (e.pointerType === "mouse" && !ATLAS) setHover(pick(e));
});
canvas.addEventListener("pointerup", e => { if (!dragging && !ATLAS) setHover(pick(e)); down = null; dragging = false; });
canvas.addEventListener("pointerleave", () => { if (!down) setHover(null); });
}

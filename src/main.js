import * as THREE from 'three';
import { MapControls } from '../vendor/MapControls.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { BOOKS, PREQUEL, LOCKED_BOOKS, BOUNDS, PLACES, REGIONS, sceneFor } from './data.js';
import { buildFerian } from './ferian.js';
import { INTERIORS } from './interiors.js';
import { buildWorld } from './world.js';
import { buildSettlement, buildMarkers } from './settlement.js';
import { Labels } from './labels.js';
import { clamp, ease } from './util.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

// ---- renderer, camera, controls ------------------------------------------------------------------
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: new URLSearchParams(location.search).has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(40, 1, 1, 14000);
const controls = new MapControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.zoomToCursor = true; controls.maxPolarAngle = 1.4; controls.minPolarAngle = 0.08;

function makeScene(shadows) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#a9c7d6', 0.0003);
  scene.background = new THREE.Color('#a9c7d6');
  const hemi = new THREE.HemisphereLight('#cfe3f2', '#5b5a48', 0.9);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.6);
  if (shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
    Object.assign(sun.shadow.camera, { left: -560, right: 560, top: 560, bottom: -560, near: 50, far: 2600 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 1.2;
  }
  scene.add(hemi, sun, sun.target);
  return { scene, hemi, sun };
}
const W = makeScene(false), LOC = makeScene(true), INT = makeScene(true);
INT.scene.background.set('#0b1013'); INT.scene.fog.color.set('#0b1013'); INT.scene.fog.density = 0.0012;
INT.hemi.intensity = 0.75; INT.hemi.color.set('#fff2dc'); INT.hemi.groundColor.set('#3a3530');
INT.sun.intensity = 1.5; INT.sun.color.set('#fff6e8'); INT.sun.shadow.mapSize.set(2048, 2048);
Object.assign(INT.sun.shadow.camera, { left: -190, right: 190, top: 190, bottom: -190 });
const pmrem = new THREE.PMREMGenerator(renderer);
LOC.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
LOC.scene.environmentIntensity = 0.3;

const MOODS = {
  Day: { sky: '#a9c7d6', sun: '#fff1d6', sunI: 2.6, dir: [0.55, 0.8, 0.35], hemiS: '#cfe3f2', hemiG: '#5b5a48', hemiI: 0.9, water: 1, exp: 1.05 },
  Dusk: { sky: '#d6a184', sun: '#ff9d5c', sunI: 2.4, dir: [-0.85, 0.3, 0.3], hemiS: '#9a8fb8', hemiG: '#4a3d3a', hemiI: 0.75, water: 0.85, exp: 1.0 },
  Night: { sky: '#101b2e', sun: '#9fb6e6', sunI: 0.9, dir: [0.35, 0.75, -0.4], hemiS: '#33466e', hemiG: '#12121a', hemiI: 0.7, water: 0.4, exp: 0.95 },
};
let mood = store.get('tog-mood', 'Day');
if (!MOODS[mood]) mood = 'Day';

// ---- state ---------------------------------------------------------------------------------------
let progress = clamp(parseInt(store.get('tog-progress', '3'), 10) || 3, 1, 3);
let ab = store.get('tog-ab', '1') === '1';
let world, markers, local = null, here = null, room = null; // here = the place we are in; room = the interior we are in
let cityView = null, walk = null; // walk = first-person state while standing in a room
const keys = new Set();
let fly = null, worldView = null;
const labels = new Labels($('labels'));
const can = (b) => (b === 0 ? ab : b <= progress);
const visible = (o) => can(o.book ?? 1);
const bookTitle = (b) => (b === 0 ? PREQUEL : BOOKS[b - 1]).title;

function applyMood() {
  const m = MOODS[mood], lm = local?.mood;
  for (const S of [W, LOC]) {
    const sky = new THREE.Color(m.sky);
    if (S === LOC && lm === 'mist') sky.lerp(new THREE.Color('#b9c2c4'), mood === 'Night' ? 0.15 : 0.75);
    if (S === LOC && lm === 'grim') sky.lerp(new THREE.Color('#3a3a40'), 0.6);
    S.scene.background.copy(sky); S.scene.fog.color.copy(sky);
    S.scene.fog.density = S === W ? 0.0003 : lm === 'mist' ? 0.0026 : 0.00085;
    S.sun.color.set(m.sun); S.sun.intensity = m.sunI * (S === LOC && lm ? 0.7 : 1);
    S.sun.position.set(...m.dir).multiplyScalar(1200);
    S.hemi.color.set(m.hemiS); S.hemi.groundColor.set(m.hemiG); S.hemi.intensity = m.hemiI;
  }
  renderer.toneMappingExposure = m.exp;
  world?.setLight(m.water);
  $('mood').textContent = mood;
}

// ---- camera helpers --------------------------------------------------------------------------------
function flyTo(target, dist, { polar = 0.95, azimuth = controls.getAzimuthalAngle(), time = 1.7 } = {}) {
  const end = new THREE.Vector3().setFromSphericalCoords(dist, polar, azimuth).add(target);
  fly = { t: 0, time, p0: camera.position.clone(), p1: end, t0: controls.target.clone(), t1: target.clone() };
  controls.enabled = false;
}
function snapTo(target, dist, polar = 0.95, azimuth = 0) {
  controls.target.copy(target);
  camera.position.setFromSphericalCoords(dist, polar, azimuth).add(target);
  controls.update();
}
const groundNow = (x, z) => (room ? room.minY - 4 : here ? Math.max(local.heightAt(x, z), 0) : world.groundAt(x, z));

// ---- labels ----------------------------------------------------------------------------------------
function worldLabels() {
  const items = [];
  for (const r of REGIONS.filter(visible)) {
    const y = world.groundAt(...r.pos) + (r.kind === 'feature' ? 6 : 10);
    items.push({ text: r.name, cls: r.kind, pos: new THREE.Vector3(r.pos[0], y, r.pos[1]),
      pri: r.kind === 'realm' ? 60 : r.kind === 'sea' ? 40 : 10, min: r.kind === 'feature' ? 90 : 300, max: r.kind === 'feature' ? 1000 : Infinity });
  }
  for (const p of PLACES.filter(visible)) {
    const big = p.kind === 'capital';
    items.push({ text: p.name, cls: 'place ' + p.kind, pos: new THREE.Vector3(p.pos[0], world.groundAt(...p.pos) + (big ? 9 : 4), p.pos[1]),
      pri: big ? 100 : p.kind === 'town' ? 20 : 50, max: big ? Infinity : p.kind === 'town' ? 800 : 1500, onClick: () => selectPlace(p) });
  }
  labels.set(items);
}
function localLabels() {
  labels.set((room || local).pois.filter((poi) => poi.kind !== 'hidden' && poi.notes.some(([b]) => can(b))).map((poi) => ({ text: poi.name, cls: 'poi ' + (poi.kind === 'feature' ? 'feature-poi' : 'capital'), pos: poi.pos, pri: poi.kind === 'feature' ? 10 : 50, onClick: () => selectPoi(poi) })));
}

// ---- panel -----------------------------------------------------------------------------------------
// Descriptions start folded away; once a reader opens one, later ones stay open until they fold it again.
let notesOpen = false;
function setNotesOpen(open) {
  notesOpen = open; $('pNotes').hidden = !open;
  $('pToggle').setAttribute('aria-expanded', open); $('pMore').textContent = open ? 'Show less' : 'Read more';
}
function showPanel(kicker, name, notes, actions, soon) {
  $('pKicker').textContent = kicker; $('pName').textContent = name;
  $('pNotes').replaceChildren(...notes.filter(([b]) => can(b)).map(([b, text]) => {
    const p = document.createElement('p'), em = document.createElement('em');
    p.className = 'note'; em.textContent = bookTitle(b); p.append(em, text);
    return p;
  }));
  if (soon) { const s = document.createElement('p'); s.className = 'soon'; s.textContent = soon; $('pNotes').append(s); }
  $('pToggle').disabled = !$('pNotes').childElementCount;
  setNotesOpen(notesOpen && !$('pToggle').disabled);
  $('pActions').replaceChildren(...actions.map(([text, fn, primary]) => {
    const b = document.createElement('button'); b.textContent = text; b.onclick = fn; if (primary) b.className = 'primary';
    return b;
  }));
  $('panel').hidden = false; $('list').hidden = true;
}
const KIND = { capital: 'Capital', city: 'City', town: 'Town', fortress: 'Stronghold', mine: 'Labour camp' };
function selectPlace(p) {
  if (here) return;
  showPanel(`${KIND[p.kind]} · ${p.realm}`, p.name, p.notes, [[`Enter ${p.name}`, () => enter(p), true]]);
  flyTo(new THREE.Vector3(p.pos[0], world.groundAt(...p.pos), p.pos[1]), 150, { polar: 1.02 });
}
function selectPoi(poi) {
  if (room) {
    const acts = [[`Back to ${here.name}`, exitRoom]];
    if (poi.kind === 'landmark') acts.unshift(['Stand in this room', () => startWalk(poi), true]);
    showPanel(room.name, poi.name, poi.notes, acts);
    flyTo(poi.focus, clamp(poi.size * 1.7, 40, 150), { polar: 0.9 });
    return;
  }
  const acts = [['Back to Erilea', leave]];
  if (poi.interior && INTERIORS[poi.interior]) acts.unshift(['Step inside', () => enterRoom(poi), true]);
  showPanel(here.name, poi.name, poi.notes, acts);
  flyTo(poi.focus, clamp(poi.size * 3.2, 150, 520), { polar: 1.12 });
}

// ---- moving between the continent and a place ------------------------------------------------------
const veil = (on, text = '') => new Promise((res) => { $('veilText').textContent = text; $('veil').classList.toggle('on', on); setTimeout(res, on ? 650 : 50); });
function crumbs() {
  const c = $('crumbs'), back = $('back'); c.replaceChildren();
  back.hidden = !here;
  if (here) { back.textContent = room ? `Back to ${here.name}` : 'Back to Erilea'; back.onclick = room ? exitRoom : leave; }
  if (!here) { c.textContent = 'A spoiler-safe atlas of Throne of Glass'; return; }
  const b = document.createElement('button'); b.textContent = 'Erilea'; b.onclick = leave;
  const cur = document.createElement('b'); cur.textContent = room ? room.name : here.name;
  c.append(b, ' › ');
  if (room) { const m = document.createElement('button'); m.textContent = here.name; m.onclick = exitRoom; c.append(m, ' › '); }
  c.append(cur);
}
async function enter(p) {
  await veil(true, `Approaching ${p.name}…`);
  worldView = { pos: camera.position.clone(), target: controls.target.clone() };
  if (local) LOC.scene.remove(local.group);
  const cfg = sceneFor(p);
  local = cfg.custom === 'ferian' ? buildFerian(progress) : buildSettlement(p, cfg, can);
  LOC.scene.add(local.group);
  here = p; fly = null; controls.enabled = true;
  controls.minDistance = 30; controls.maxDistance = 1500;
  snapTo(new THREE.Vector3(0, local.focusY ?? groundNow(0, 0), 0), local.radius * 2.2 + 240, 1.05, -0.5);
  localLabels(); applyMood(); crumbs();
  showPanel(`${KIND[p.kind]} · ${p.realm}`, p.name, p.notes, [['Back to Erilea', leave]]);
  flyTo(controls.target.clone(), local.radius * 1.6 + 170, { polar: local.startPolar ?? 1.12, azimuth: cfg.view ?? -0.15, time: 3 });
  await veil(false);
}
function setLens(fov, near) { camera.fov = fov; camera.near = near; camera.updateProjectionMatrix(); }
const EYE = 6.4;
function zoneAt(x, z, y) {
  let best = null;
  for (const zn of room.zones) {
    if (x < zn.x0 || x > zn.x1 || z < zn.z0 || z > zn.z1) continue;
    const zy = zn.yAt(x, z), d = Math.abs(zy - y);
    if (d < 3.2 && (!best || d < best.d)) best = { zn, y: zy, d };
  }
  return best;
}
const inSolid = (s, x, z, y) => Math.abs(s.y - y) < 3 && x > s.x0 - 0.9 && x < s.x1 + 0.9 && z > s.z0 - 0.9 && z < s.z1 + 0.9;
function stepTo(x, z) { // may we stand at x, z?  Furniture we are already inside never traps us.
  const zn = zoneAt(x, z, walk.fy);
  if (!zn) return null;
  for (const s of room.solids) if (inSolid(s, x, z, zn.y) && !inSolid(s, camera.position.x, camera.position.z, walk.fy)) return null;
  return zn;
}
function walkPanel() {
  const poi = walk.poi, rooms = room.pois.filter((o) => o.kind === 'landmark' && o.notes.some(([b]) => can(b))), i = Math.max(0, rooms.indexOf(poi));
  showPanel(room.name, poi.name, poi.notes, [
    ['‹ Previous room', () => startWalk(rooms[(i - 1 + rooms.length) % rooms.length])],
    ['Next room ›', () => startWalk(rooms[(i + 1) % rooms.length]), true],
    ['Look from above', stopWalk],
  ], 'Drag to look around. W A S D or the arrow keys to walk, Shift to hurry. Doorways and stairs lead on to the next room.');
  const sky = poi.sky ? (mood === 'Night' ? '#101b2e' : mood === 'Dusk' ? '#d6a184' : '#9cc4dc') : '#0b1013';
  INT.scene.background.set(sky); INT.scene.fog.color.set(sky);
  INT.sun.intensity = poi.sky ? (mood === 'Night' ? 0.5 : 2.2) : poi.dark ? 0.12 : 0.5; INT.hemi.intensity = poi.sky ? 0.9 : poi.dark ? 0.26 : 0.5;
}
function startWalk(poi, yaw = 0) {
  fly = null; controls.enabled = false; setLens(72, 0.25);
  const B = poi.bounds;
  walk = { poi, yaw, pitch: -0.05, fy: B.y, vx: 0, vz: 0, step: 0 };
  let x = poi.focus.x, z = poi.focus.z + Math.min(B.d * 0.3, 14);
  camera.position.set(x, B.y + EYE, z);
  search: for (let r = 0; r < poi.size / 2; r += 2) for (let a = 0; a < 6.28; a += 0.5) { // nearest free floor
    const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
    if (px > B.x0 + 2 && px < B.x1 - 2 && pz > B.z0 + 2 && pz < B.z1 - 2 && !room.solids.some((s) => inSolid(s, px, pz, B.y))) { camera.position.set(px, B.y + EYE, pz); break search; }
  }
  labels.set([]); $('hint').classList.add('gone');
  walkPanel();
}
function stopWalk(overview = true) {
  if (!walk) return;
  walk = null; setLens(40, 1); controls.enabled = true; INT.sun.intensity = 1.5; INT.hemi.intensity = 0.75;
  INT.scene.background.set('#0b1013'); INT.scene.fog.color.set('#0b1013');
  if (overview && room) { snapTo(room.center, room.size * 1.25, 0.85, 0.25); localLabels(); $('panel').hidden = true; }
}
async function enterRoom(poi) {
  await veil(true, 'Stepping inside…');
  cityView = { pos: camera.position.clone(), target: controls.target.clone() };
  if (room) INT.scene.remove(room.group);
  room = { ...INTERIORS[poi.interior](can), name: poi.name };
  INT.scene.add(room.group);
  INT.sun.target.position.copy(room.center); INT.sun.position.set(90, 400, 140).add(room.center);
  { const sc = INT.sun.shadow.camera, k = room.size * 0.72; Object.assign(sc, { left: -k, right: k, top: k, bottom: -k }); sc.updateProjectionMatrix(); }
  fly = null; controls.enabled = true; controls.minDistance = 14; controls.maxDistance = room.size * 2.4;
  snapTo(room.center, room.size * 1.9, 0.75, 0.5);
  localLabels(); crumbs();
  showPanel(here.name, poi.name, poi.notes, [[`Back to ${here.name}`, exitRoom]]);
  flyTo(room.center.clone(), room.size * 1.25, { polar: 0.85, azimuth: 0.25, time: 2.6 });
  await veil(false);
}
async function exitRoom() {
  if (!room) return;
  await veil(true, `Back out into ${here.name}…`);
  stopWalk(false);
  INT.scene.remove(room.group);
  room = null; fly = null; controls.enabled = true; controls.minDistance = 30; controls.maxDistance = 1500;
  camera.position.copy(cityView.pos); controls.target.copy(cityView.target); controls.update();
  showPanel(`${KIND[here.kind]} · ${here.realm}`, here.name, here.notes, [['Back to Erilea', leave]]);
  localLabels(); crumbs();
  await veil(false);
}
async function leave() {
  if (!here) return;
  await veil(true, 'Returning to the continent…');
  stopWalk(false);
  if (room) INT.scene.remove(room.group);
  room = null; here = null; fly = null; controls.enabled = true;
  controls.minDistance = 22; controls.maxDistance = 2300;
  camera.position.copy(worldView.pos); controls.target.copy(worldView.target); controls.update();
  $('panel').hidden = true;
  worldLabels(); applyMood(); crumbs();
  await veil(false);
}

// ---- place list & progress -------------------------------------------------------------------------
function fillList() {
  const q = $('search').value.trim().toLowerCase(), body = $('listBody'), groups = new Map();
  for (const p of PLACES.filter(visible)) if (!q || p.name.toLowerCase().includes(q)) (groups.get(p.realm) || groups.set(p.realm, []).get(p.realm)).push(p);
  body.replaceChildren();
  for (const [realm, ps] of groups) {
    const h = document.createElement('h3'); h.textContent = realm; body.append(h);
    for (const p of ps) {
      const b = document.createElement('button'), s = document.createElement('small');
      b.textContent = p.name; s.textContent = KIND[p.kind]; b.append(s);
      b.onclick = async () => { if (here) await leave(); selectPlace(p); };
      body.append(b);
    }
  }
}
function applyProgress() {
  world.setProgress(progress);
  for (const p of PLACES) markers.byId.get(p.id).visible = visible(p);
  fillList();
  if (!here) worldLabels();
  $('panel').hidden = true;
}
function setupUI() {
  const sel = $('progress');
  for (const b of BOOKS) sel.add(new Option(b.title, b.n));
  for (const t of LOCKED_BOOKS) { const o = new Option(`${t} (sealed)`, ''); o.disabled = true; sel.add(o); }
  sel.value = progress;
  sel.onchange = async () => { progress = +sel.value; store.set('tog-progress', progress); if (here) await leave(); applyProgress(); };
  $('ab').checked = ab;
  $('ab').onchange = async () => { ab = $('ab').checked; store.set('tog-ab', ab ? '1' : '0'); if (here) await leave(); applyProgress(); };
  $('mood').onclick = () => { const k = Object.keys(MOODS); mood = k[(k.indexOf(mood) + 1) % k.length]; store.set('tog-mood', mood); applyMood(); };
  $('listBtn').onclick = () => { $('list').hidden = !$('list').hidden; if (!$('list').hidden) $('search').focus(); };
  $('search').oninput = fillList;
  $('pToggle').onclick = () => setNotesOpen(!notesOpen);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('list').hidden) $('list').hidden = true; else if (walk) stopWalk(); else if (!$('panel').hidden) $('panel').hidden = true; else if (room) exitRoom(); else leave(); } });

  addEventListener('keydown', (e) => { if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') keys.add(e.key.toLowerCase()); });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointermove', (e) => {
    if (!walk || !e.buttons) return;
    walk.yaw -= e.movementX * 0.0045; walk.pitch = clamp(walk.pitch - e.movementY * 0.0045, -1.2, 1.2);
  });
  // click the ground near a town to select it
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; $('hint').classList.add('gone'); });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || fly || walk) return;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const p = new THREE.Vector3();
    for (let t = 0, i = 0; i < 500; i++) {
      ray.ray.at(t, p);
      const g = groundNow(p.x, p.z);
      if (p.y <= g + 0.2) {
        if (room) return;
        if (here) {
          const hit = local.pois.filter((o) => o.kind === 'landmark').find((o) => Math.hypot(o.focus.x - p.x, o.focus.z - p.z) < o.size * 0.6);
          if (hit) selectPoi(hit);
        } else {
          const lim = Math.max(8, camera.position.distanceTo(p) * 0.035);
          const hit = PLACES.filter(visible).map((o) => [Math.hypot(o.pos[0] - p.x, o.pos[1] - p.z), o]).filter(([d]) => d < lim).sort((a, b) => a[0] - b[0])[0];
          if (hit) selectPlace(hit[1]);
        }
        return;
      }
      t += Math.max(0.6, (p.y - g) * 0.4);
    }
  });
}

// ---- frame loop --------------------------------------------------------------------------------------
const clock = new THREE.Clock();
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;
  if (walk) {
    const f = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    const r = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    const sp = keys.has('shift') ? 26 : 14, sy = Math.sin(walk.yaw), cy = Math.cos(walk.yaw), len = Math.hypot(f, r) || 1, ease2 = Math.min(1, dt * 9);
    walk.vx += (((-sy * f + cy * r) / len) * sp - walk.vx) * ease2; walk.vz += (((-cy * f - sy * r) / len) * sp - walk.vz) * ease2;
    const v = Math.hypot(walk.vx, walk.vz), px = camera.position.x, pz = camera.position.z, nx = px + walk.vx * dt, nz = pz + walk.vz * dt;
    const hit = stepTo(nx, nz) || stepTo(nx, pz) || stepTo(px, nz);
    if (hit) {
      const moved = stepTo(nx, nz) ? [nx, nz] : stepTo(nx, pz) ? [nx, pz] : [px, nz];
      camera.position.x = moved[0]; camera.position.z = moved[1]; walk.fy = hit.y;
      const np = hit.zn.poi;
      if (np && np !== walk.poi) { walk.poi = np; if (np.notes.some(([b]) => can(b))) walkPanel(); }
    } else { walk.vx = walk.vz = 0; }
    walk.step += v * dt;
    camera.position.y += (walk.fy + EYE + Math.sin(walk.step * 0.85) * 0.12 * Math.min(1, v / 8) - camera.position.y) * Math.min(1, dt * 12);
    camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  } else if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.time);
    const k = ease(fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k);
    camera.lookAt(controls.target);
    if (fly.t >= 1) { fly = null; controls.enabled = true; }
  } else {
    controls.update();
    const t = controls.target, lim = room ? room.size : here ? 800 : null;
    if (room) t.y = clamp(t.y, room.minY, 40);
    const cx = lim ? clamp(t.x, -lim, lim) : clamp(t.x, BOUNDS.minX, BOUNDS.maxX), cz = lim ? clamp(t.z, -lim, lim) : clamp(t.z, BOUNDS.minZ, BOUNDS.maxZ - 60);
    if (cx !== t.x || cz !== t.z) { camera.position.x += cx - t.x; camera.position.z += cz - t.z; t.x = cx; t.z = cz; }
  }
  const floor = groundNow(camera.position.x, camera.position.z) + (here ? 6 : 3);
  if (!walk && camera.position.y < floor) camera.position.y = floor;
  if (!here) world.update(time); else if (!room) local.update?.(time); else room.update?.(time, walk?.poi, walk ? camera.position : null);
  const S = room ? INT : here ? LOC : W;
  if (here && !room) { S.sun.target.position.copy(controls.target).setY(0); S.sun.position.set(...MOODS[mood].dir).multiplyScalar(1200).add(S.sun.target.position); }
  renderer.render(S.scene, camera);
  labels.update(camera, camera.position.distanceTo(controls.target), innerWidth, innerHeight);
  requestAnimationFrame(frame);
}

// First visit: ask how far the reader has got before anything of the map is shown.
function askGate() {
  return new Promise((resolve) => {
    const g = $('gate'), list = $('gateBooks'), abBox = $('gateAb');
    abBox.checked = store.get('tog-ab', '0') === '1';
    for (const b of BOOKS) {
      const btn = document.createElement('button'), sm = document.createElement('small');
      btn.append(b.title, sm); sm.textContent = `Book ${b.n}`;
      btn.onclick = () => {
        progress = b.n; ab = abBox.checked;
        store.set('tog-progress', progress); store.set('tog-ab', ab ? '1' : '0'); store.set('tog-gate', '1');
        g.classList.add('gone'); setTimeout(() => { g.hidden = true; resolve(); }, 520);
      };
      list.append(btn);
    }
    for (const t of LOCKED_BOOKS) {
      const btn = document.createElement('button'), sm = document.createElement('small');
      btn.disabled = true; btn.append(t, sm); sm.textContent = 'sealed'; list.append(btn);
    }
    g.hidden = false; list.firstChild.focus();
  });
}

async function start() {
  const q0 = new URLSearchParams(location.search);
  if (q0.has('gate') || (!q0.has('shot') && !q0.has('place') && !store.get('tog-gate'))) { await askGate(); await new Promise((r) => setTimeout(r, 80)); }
  world = buildWorld();
  W.scene.add(world.group);
  markers = buildMarkers(PLACES, world.groundAt);
  W.scene.add(markers.group);
  controls.minDistance = 22; controls.maxDistance = 2300;
  setupUI(); applyMood(); applyProgress(); crumbs(); resize();
  addEventListener('resize', resize);
  const q = new URLSearchParams(location.search), jump = PLACES.find((p) => p.id === q.get('place'));
  snapTo(new THREE.Vector3(380, 0, 60), 2050, 0.5, 0);
  frame();
  window.atlas = { keys, get walk() { return walk; }, enter, leave, selectPlace, enterRoom, exitRoom, selectPoi, get room() { return room; }, startWalk, PLACES, camera, controls, snapTo, get local() { return local; } };
  if (jump && visible(jump)) { enter(jump).then(() => { const fp = local.pois.find((o) => o.id === q.get('focus')); if (fp) selectPoi(fp);
    const poi = local.pois.find((o) => o.interior && o.interior === q.get('inside')); if (poi) enterRoom(poi).then(() => { const r = room.pois.find((o) => o.id === q.get('stand')); if (r) startWalk(r, +(q.get('yaw') || 0)); }); }); return; }
  veil(false);
  if (!q.has('still')) flyTo(new THREE.Vector3(330, 0, -20), 1050, { polar: 0.78, azimuth: -0.12, time: 4.5 });
}
document.fonts.ready.then(() => setTimeout(start, 60));

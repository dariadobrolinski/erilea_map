// Walk-in interiors, built as open-topped "dollhouse" rooms: walls are drawn from the inside only,
// so whichever wall is between you and the room simply isn't there.
// Layouts and furnishings interpret the books' descriptions; they are not published floor plans.
// Notes follow the same spoiler rule as data.js: [book, text], book 0 = The Assassin's Blade.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { rng } from './util.js';

const mats = new Map();
const M = (color, o) => {
  const k = color + JSON.stringify(o || 0);
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o }));
  return mats.get(k);
};
const glow = (color, i = 1.8) => M(color, { emissive: color, emissiveIntensity: i });
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 18), BALL = new THREE.SphereGeometry(0.5, 16, 12);
const WOOD = '#5a3d28', DARK = '#33231a', GOLD = '#c9a440';
const soft = new Map();

function mesh(geo, color, o) { const m = new THREE.Mesh(geo, typeof color === 'string' ? M(color, o) : color); m.castShadow = m.receiveShadow = true; return m; }
function b(w, h, d, color, x = 0, y = 0, z = 0, o) { const m = mesh(BOX, color, o); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); return m; }
function cyl(r, h, color, x = 0, y = 0, z = 0, o) { const m = mesh(CYL, color, o); m.scale.set(r * 2, h, r * 2); m.position.set(x, y + h / 2, z); return m; }
function ball(r, color, x = 0, y = 0, z = 0, o) { const m = mesh(BALL, color, o); m.scale.setScalar(r * 2); m.position.set(x, y, z); return m; }
// rounded box, for anything upholstered
function rb(w, h, d, color, x = 0, y = 0, z = 0, r = 0.35) {
  const k = [w, h, d, r].join();
  if (!soft.has(k)) soft.set(k, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)));
  const m = mesh(soft.get(k), color); m.position.set(x, y + h / 2, z); return m;
}
const G = (...kids) => { const g = new THREE.Group(); if (kids.length) g.add(...kids); return g; };
const legs = (w, d, h, color, r = 0.22) => [-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(r, h, color, sx * (w / 2 - r * 2), 0, sz * (d / 2 - r * 2))));

// ---- painted surfaces ------------------------------------------------------------------------------
const texCache = new Map();
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
function surface(kind, base, repX = 1, repY = 1) {
  const key = kind + base;
  if (!texCache.has(key)) {
    const c = document.createElement('canvas'), S = 512; c.width = c.height = S;
    const g = c.getContext('2d'), R = rng(key.length * 97 + parseInt(base.slice(1, 4), 16));
    const mottle = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '255,255,255'},${R() * a})`; g.fillRect(R() * S, R() * S, 20 + R() * 90, 20 + R() * 90); } };
    const wainscot = (wood) => { const y = S * 0.66; g.fillStyle = shade(wood, 1); g.fillRect(0, y, S, S - y); for (let x = 0; x < S; x += 128) { g.fillStyle = shade(wood, 0.8); g.fillRect(x + 14, y + 22, 100, S - y - 40); g.fillStyle = shade(wood, 1.12); g.fillRect(x + 20, y + 28, 88, S - y - 52); } g.fillStyle = shade(wood, 1.3); g.fillRect(0, y - 6, S, 10); g.fillStyle = shade(wood, 0.6); g.fillRect(0, S - 12, S, 12); };
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    if (kind === 'planks') {
      for (let r = 0; r < 8; r++) { let x = -R() * 200; while (x < S) { const w = 130 + R() * 160; g.fillStyle = shade(base, 0.82 + R() * 0.34); g.fillRect(x, r * 64, w - 2, 62); g.strokeStyle = 'rgba(0,0,0,0.10)'; for (let i = 0; i < 4; i++) { g.beginPath(); const y = r * 64 + 6 + R() * 50; g.moveTo(x, y); g.lineTo(x + w, y + (R() - 0.5) * 6); g.stroke(); } x += w; } g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, r * 64 + 62, S, 2); }
    } else if (kind === 'tiles') {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = shade(base, (i + j) % 2 ? 0.8 : 1.08); g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124); }
      g.strokeStyle = 'rgba(255,255,255,0.14)'; for (let i = 0; i < 26; i++) { g.beginPath(); const x = R() * S, y = R() * S; g.moveTo(x, y); g.bezierCurveTo(x + 40, y + R() * 60, x + 60, y - R() * 60, x + 130, y + (R() - 0.5) * 80); g.stroke(); }
    } else if (kind === 'flags' || kind === 'stone') {
      const rows = kind === 'flags' ? 4 : 8, rh = S / rows;
      g.fillStyle = shade(base, 0.5); g.fillRect(0, 0, S, S);
      for (let r = 0; r < rows; r++) { let x = -R() * 120; while (x < S) { const w = (kind === 'flags' ? 90 : 70) + R() * 90; g.fillStyle = shade(base, 0.82 + R() * 0.34); g.fillRect(x + 2, r * rh + 2, w - 4, rh - 4); x += w; } }
      mottle(60, 0.05);
    } else if (kind === 'panel') { mottle(70, 0.035); wainscot('#6a4a33'); }
    else if (kind === 'paper') {
      g.fillStyle = shade(base, 1.25); g.globalAlpha = 0.22;
      for (let y = 0; y < S * 0.66; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < S; x += 64) { g.beginPath(); g.moveTo(x + 32, y + 6); g.lineTo(x + 50, y + 32); g.lineTo(x + 32, y + 58); g.lineTo(x + 14, y + 32); g.fill(); g.fillRect(x + 30, y + 26, 4, 12); }
      g.globalAlpha = 1; wainscot('#3d2a1e');
    } else if (kind === 'ceiling') { mottle(40, 0.03); g.fillStyle = '#3d2a1e'; g.fillRect(0, 100, S, 46); g.fillRect(0, 356, S, 46); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 146, S, 8); g.fillRect(0, 402, S, 8); }
    else if (kind === 'spines') {
      g.fillStyle = '#1c130d'; g.fillRect(0, 0, S, S);
      const cols = ['#7a1f2b', '#254a5a', '#3f5a2c', '#8a6a2a', '#4a2f5a', '#2b2b33', '#a8763a', '#6b2f1e', '#d8cdb0'];
      for (let r = 0; r < 4; r++) { let x = 6; while (x < S - 14) { const w = 10 + R() * 18, h = 78 + R() * 34, top = r * 128 + 118 - h; g.fillStyle = shade(cols[Math.floor(R() * cols.length)], 0.8 + R() * 0.5); g.fillRect(x, top, w - 1.5, h); g.fillStyle = 'rgba(230,200,120,0.55)'; g.fillRect(x + 2, top + 10, w - 6, 3); g.fillRect(x + 2, top + h - 16, w - 6, 2); x += w; } g.fillStyle = '#3a271b'; g.fillRect(0, r * 128 + 118, S, 10); }
    } else mottle(70, 0.04);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    texCache.set(key, t);
  }
  const t = texCache.get(key).clone(); t.repeat.set(repX, repY); t.needsUpdate = true;
  return t;
}

// ---- furniture (origin at floor centre, "front" toward +z) -----------------------------------------
const F = {
  bed: (cover = '#7a1f2b', canopy = false) => {
    const g = G(b(8.4, 1.5, 10.4, DARK), rb(7.8, 1.3, 9.8, '#efe8d8', 0, 1.4), rb(8, 0.7, 6.4, cover, 0, 2.3, 1.8, 0.3), rb(8, 0.5, 1.4, '#efe8d8', 0, 2.5, -1.9, 0.2),
      b(8.4, 6, 0.6, DARK, 0, 0, -5.2), rb(7, 2.6, 0.3, cover, 0, 2.9, -4.85, 0.12), b(8.4, 2.6, 0.5, DARK, 0, 0, 5.2), rb(3, 0.9, 1.9, '#ffffff', -1.9, 2.6, -3.8, 0.4), rb(3, 0.9, 1.9, '#ffffff', 1.9, 2.6, -3.8, 0.4), rb(2, 0.8, 1.4, cover, 0, 2.9, -3.2, 0.35));
    if (canopy) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) { g.add(cyl(0.22, 9.4, DARK, sx * 4, 0, sz * 5)); g.add(rb(0.9, 7, 0.9, cover, sx * 4, 2.2, sz * 5, 0.4)); } g.add(b(8.6, 0.5, 10.6, DARK, 0, 9.2), rb(8.8, 1.2, 10.8, cover, 0, 8.2, 0, 0.3)); }
    return g;
  },
  table: (w = 8, d = 4, color = WOOD) => G(b(w, 0.35, d, color, 0, 2.65), b(w - 0.8, 0.5, d - 0.8, DARK, 0, 2.2), ...legs(w, d, 2.3, color, 0.24)),
  round: (r = 2.2, color = WOOD) => G(cyl(r, 0.3, color, 0, 2.7), cyl(0.3, 2.6, color), cyl(r * 0.5, 0.25, color)),
  chair: (color = WOOD, cushion = '#7a1f2b') => G(b(1.7, 0.25, 1.7, color, 0, 1.5), rb(1.5, 0.35, 1.5, cushion, 0, 1.7, 0, 0.15), b(1.7, 2.4, 0.25, color, 0, 1.6, -0.72), rb(1.3, 1.5, 0.2, cushion, 0, 2.2, -0.6, 0.1), ...legs(1.7, 1.7, 1.5, color, 0.12)),
  dining: (n = 4, len = 12) => { const g = G(F.table(len, 4.5), b(len - 2, 0.05, 1.2, '#efe8d8', 0, 3.0)); for (let i = 0; i < n; i++) { const x = -len / 2 + (i + 0.5) * (len / n); const a = F.chair(); a.position.set(x, 0, -3.2); const c = F.chair(); c.position.set(x, 0, 3.2); c.rotation.y = Math.PI; g.add(a, c, cyl(0.55, 0.06, '#f4f1e8', x, 3, -1.4), cyl(0.55, 0.06, '#f4f1e8', x, 3, 1.4), cyl(0.14, 0.5, GOLD, x + 0.9, 3, -1.2, { metalness: 0.7, roughness: 0.3 })); } return g; },
  shelf: (w = 8, h = 9, seed = 1) => {
    const t = surface('spines', '#1c130d', Math.max(1, Math.round(w / 9)), Math.max(1, Math.round(h / 9)));
    t.offset.x = (seed * 0.37) % 1;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.5, h - 0.7), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
    face.position.set(0, h / 2, 0.83);
    return G(b(w, h, 1.6, DARK), b(w + 0.4, 0.4, 1.9, DARK, 0, h), b(w + 0.3, 0.5, 1.8, DARK), face);
  },
  piano: () => G(b(6.6, 4.2, 2.4, '#111113', 0, 0, 0, { roughness: 0.2, metalness: 0.2 }), b(6.8, 0.25, 2.7, '#111113', 0, 4.2, 0, { roughness: 0.2 }), b(6.4, 0.3, 1.5, '#111113', 0, 2.5, 1.7, { roughness: 0.2 }), b(5.9, 0.12, 1.1, '#f6f3ea', 0, 2.8, 1.85), ...Array.from({ length: 14 }, (_, i) => b(0.16, 0.14, 0.65, '#111113', -2.7 + i * 0.41 + (i % 7 > 2 ? 0.1 : 0), 2.86, 1.65)), b(2, 1.4, 0.08, '#f4f1e8', 0, 3.3, 1.15), cyl(0.16, 2.5, '#111113', -3, 0, 2.2), cyl(0.16, 2.5, '#111113', 3, 0, 2.2), cyl(1.1, 0.4, '#5c1820', 0, 1.6, 4.3), cyl(0.2, 1.6, DARK, 0, 0, 4.3)),
  hearth: (w = 7) => {
    const flames = [0, 1, 2].map((i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5 + (i === 1 ? 0.25 : 0), 1.6 + (i === 1 ? 0.8 : 0), 7), glow(i === 1 ? '#ffd27a' : '#ff7a1f', 3)); f.position.set((i - 1) * 0.8, 1.2, 0.5); return f; });
    const g = G(b(w, 6.4, 1.8, '#8c877c'), b(w + 1.2, 0.5, 2.4, '#5a3d28', 0, 6.4), b(w - 2.4, 4, 0.6, '#0c0a09', 0, 0, 0.7), b(w + 0.6, 0.3, 3, '#6a665e', 0, 0, 0.8), cyl(0.3, w - 3.4, DARK, 0, 0.35, 0.6), cyl(0.3, w - 4, '#2a1c14', 0, 0.75, 0.8), ...flames, cyl(0.3, 1.2, GOLD, -w / 2 + 0.8, 6.9, 0, { metalness: 0.7, roughness: 0.3 }), cyl(0.3, 1.2, GOLD, w / 2 - 0.8, 6.9, 0, { metalness: 0.7, roughness: 0.3 }), b(1.6, 1.1, 0.5, '#254a5a', 0, 6.9, 0));
    g.children[4].rotation.z = g.children[5].rotation.z = Math.PI / 2; g.children[4].position.y = 0.6; g.children[5].position.y = 1.0;
    g.userData.flames = flames;
    return g;
  },
  rug: (w, d, color = '#6e1f26') => G(b(w, 0.08, d, color), b(w - 1.2, 0.1, d - 1.2, GOLD, 0, 0, 0, { roughness: 0.7 }), b(w - 1.8, 0.12, d - 1.8, color), b(w * 0.45, 0.14, d * 0.45, '#2a2233')),
  couch: (color = '#3f5348') => G(b(7.4, 0.5, 3.2, DARK, 0, 0.5), ...legs(7.4, 3.2, 0.5, DARK, 0.18), rb(3.4, 1.1, 2.8, color, -1.75, 1, 0.2), rb(3.4, 1.1, 2.8, color, 1.75, 1, 0.2), rb(7.4, 3, 1, color, 0, 1, -1.2, 0.45), rb(1, 2.3, 3.2, color, -3.6, 1, 0, 0.45), rb(1, 2.3, 3.2, color, 3.6, 1, 0, 0.45), rb(1.5, 1.5, 0.6, GOLD, -2.2, 2.1, -0.5, 0.28), rb(1.5, 1.5, 0.6, '#efe8d8', 2.2, 2.1, -0.5, 0.28)),
  billiards: () => G(b(9.4, 0.9, 5.4, WOOD, 0, 2.2), b(8.5, 0.2, 4.5, '#2f6b45', 0, 3.0), b(9.4, 0.35, 0.5, DARK, 0, 3.1, 2.45), b(9.4, 0.35, 0.5, DARK, 0, 3.1, -2.45), b(0.5, 0.35, 5.4, DARK, 4.45, 3.1), b(0.5, 0.35, 5.4, DARK, -4.45, 3.1), ...legs(9, 5, 2.2, DARK, 0.4), ball(0.19, '#f4f1e8', 1, 3.39, 0.5), ball(0.19, '#9e1b1b', -2, 3.39, -0.8), ball(0.19, '#1f3a5a', -2.5, 3.39, 0.3), ball(0.19, '#c9a440', -1.6, 3.39, 0.1), (() => { const c = cyl(0.07, 6, '#d8c49a', 2.5, 3.3, -1.2); c.rotation.z = Math.PI / 2; c.rotation.y = 0.4; return c; })()),
  tub: () => G(rb(6.4, 2.4, 3.6, '#f0ede6', 0, 0.5, 0, 0.9), (() => { const w = ball(1, M('#8fd0d6', { roughness: 0.05, metalness: 0.2 }), 0, 2.72, 0); w.scale.set(5.4, 0.25, 2.7); return w; })(), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => ball(0.3, GOLD, sx * 2.6, 0.3, sz * 1.3, { metalness: 0.8, roughness: 0.3 }))), cyl(0.12, 1.6, GOLD, -3, 2.4, 0, { metalness: 0.8, roughness: 0.3 }), rb(1.8, 0.3, 1.2, '#f4f1e8', 4.6, 1.6, 0, 0.1), b(1.6, 1.6, 1.4, WOOD, 4.6)),
  wardrobe: (w = 6) => G(b(w, 8.4, 2.2, DARK), b(w + 0.5, 0.5, 2.5, DARK, 0, 8.4), b(w / 2 - 0.25, 7.2, 0.15, WOOD, -w / 4, 0.7, 1.12), b(w / 2 - 0.25, 7.2, 0.15, WOOD, w / 4, 0.7, 1.12), ball(0.14, GOLD, -0.3, 4.4, 1.25, { metalness: 0.8 }), ball(0.14, GOLD, 0.3, 4.4, 1.25, { metalness: 0.8 })),
  gowns: (n = 8) => { const g = G(cyl(0.1, n * 1.3 + 1, GOLD, 0, 6.3, 0, { metalness: 0.7 })), cols = ['#7a1f2b', '#1f4a5a', '#d9c7e8', '#2c5a3c', '#e8d9a8', '#111118', '#b0507a', '#f1efe8']; g.children[0].rotation.z = Math.PI / 2; g.children[0].position.y = 6.4; for (let i = 0; i < n; i++) { const x = (i - (n - 1) / 2) * 1.3; g.add(rb(0.9, 1.6, 1.3, cols[i % cols.length], x, 4.6, 0, 0.3), rb(1.1, 3.4, 1.8, cols[i % cols.length], x, 1.3, 0, 0.4)); } return g; },
  pillar: (h, r = 1.2, color = '#cfcabb') => G(cyl(r, h, color), b(r * 3, 0.8, r * 3, color), cyl(r * 1.25, 0.5, color, 0, 0.8), b(r * 3, 0.8, r * 3, color, 0, h - 0.8), cyl(r * 1.25, 0.5, color, 0, h - 1.3)),
  banner: (color = '#9e1b1b', h = 12) => G(b(3.6, 0.3, 0.3, GOLD, 0, h), b(3.4, h, 0.12, color), b(3.4, 0.5, 0.14, GOLD, 0, 0.4), b(1.5, 1.5, 0.16, GOLD, 0, h * 0.55), b(0.9, 0.9, 0.2, '#17130f', 0, h * 0.55 + 0.3)),
  _win: (w, h, drape) => { const rod = cyl(0.12, w + 2.6, GOLD, 0, 0, 0.3); rod.rotation.z = Math.PI / 2; rod.position.y = h + 0.7; return G(b(w, h, 0.2, glow('#cfeaf2', 1.1)), b(w + 0.8, 0.5, 0.5, '#8c877c', 0, h), b(w + 0.8, 0.4, 0.7, '#8c877c', 0, -0.2), b(0.2, h, 0.3, '#5a544a'), b(w, 0.2, 0.3, '#5a544a', 0, h * 0.5), rb(1.1, h + 0.6, 0.5, drape, -w / 2 - 0.5, -0.2, 0.3, 0.22), rb(1.1, h + 0.6, 0.5, drape, w / 2 + 0.5, -0.2, 0.3, 0.22), rod); },
  torch: () => G(b(0.3, 1.6, 0.3, DARK, 0, 5), cyl(0.35, 0.7, glow('#ffb04a', 3), 0, 6.6)),
  candles: () => G(cyl(0.9, 0.2, GOLD, 0, 0, 0, { metalness: 0.7, roughness: 0.3 }), ...[-0.5, 0, 0.5].map((x, i) => cyl(0.12, 1 + i * 0.3, '#f4f1e8', x, 0.2)), ...[-0.5, 0, 0.5].map((x, i) => ball(0.17, glow('#ffc66a', 3), x, 1.35 + i * 0.3))),
  vase: (color = '#254a5a', bloom = '#b0507a') => G(cyl(0.45, 1.2, color, 0, 0, 0, { roughness: 0.3 }), ball(0.5, color, 0, 0.5, 0, { roughness: 0.3 }), ...[0, 1, 2, 3, 4].map((i) => ball(0.3, bloom, Math.cos(i * 1.3) * 0.45, 1.7 + (i % 2) * 0.3, Math.sin(i * 1.3) * 0.45)), cyl(0.05, 0.8, '#3f5a2c', 0, 1.1)),
  plant: () => G(cyl(0.9, 1.4, '#8a5a3c'), ...[0, 1, 2, 3, 4, 5].map((i) => { const l = ball(0.9, '#3f6a3c', Math.cos(i) * 0.7, 2.4 + (i % 3) * 0.7, Math.sin(i) * 0.7); l.scale.set(1.5, 2.2, 1.5); return l; })),
  painting: (w = 5, h = 3.6, sky = '#7fa6b8', land = '#4a6a3c') => G(b(w + 0.6, h + 0.6, 0.2, GOLD, 0, 0, 0, { metalness: 0.6, roughness: 0.4 }), b(w, h, 0.24, sky, 0, 0.3), b(w, h * 0.42, 0.26, land, 0, 0.3), b(w * 0.3, h * 0.3, 0.27, shadeC(land), -w * 0.18, 0.3 + h * 0.3)),
  rack: () => { const g = G(b(7, 5, 0.5, DARK, 0, 0.5), b(7.2, 0.4, 1, DARK)); for (let i = 0; i < 6; i++) g.add(b(0.22, 4.2, 0.1, '#c9ccd0', -2.8 + i * 1.1, 1.3, 0.35, { metalness: 0.9, roughness: 0.25 }), b(0.9, 0.16, 0.2, GOLD, -2.8 + i * 1.1, 1.3, 0.35), cyl(0.1, 0.9, DARK, -2.8 + i * 1.1, 0.4, 0.35)); return g; },
  dummy: () => G(cyl(0.25, 4, DARK), cyl(1.2, 0.3, DARK), rb(2, 2.8, 1.3, '#b89a6a', 0, 3, 0, 0.5), ball(0.6, '#b89a6a', 0, 6.4), b(4, 0.4, 0.4, DARK, 0, 5)),
  sarcophagus: (color = '#e4e2dc') => G(b(5.4, 0.8, 11.4, '#9a968c'), b(4.4, 2.6, 10.2, color, 0, 0.8), b(4.8, 0.3, 10.6, color, 0, 3.4), rb(2.4, 0.9, 7.6, color, 0, 3.6, 0.6, 0.4), ball(0.75, color, 0, 4.2, -3.9), rb(1.4, 0.5, 1.4, color, 0, 3.6, -3.9, 0.2)),
  cell: (w = 8, d = 8) => { const g = G(b(4, 0.6, 1.6, '#6a655c', -1.5, 0, -d / 2 + 1.2), rb(3.6, 0.3, 1.4, '#7a6a58', -1.5, 0.6, -d / 2 + 1.2, 0.1), b(w + 0.3, 0.3, 0.3, '#2c2c30', 0, 7.5, d / 2), b(w + 0.3, 0.3, 0.3, '#2c2c30', 0, 0, d / 2)); for (let x = -w / 2; x <= w / 2; x += 0.8) g.add(cyl(0.1, 7.5, '#2c2c30', x, 0, d / 2, { metalness: 0.8 })); return g; },
  desk: () => G(b(9, 3, 4.5, DARK), b(9.6, 0.3, 5, '#6b3f26', 0, 3), b(1.6, 0.06, 2.2, '#efe8d8', -2, 3.3, 0.3), b(1.5, 0.3, 2, '#7a1f2b', 1, 3.3, 0.6), cyl(0.25, 0.9, GOLD, 3, 3.3, -0.8, { metalness: 0.7 }), ball(0.2, glow('#ffc66a', 3), 3, 4.4, -0.8), cyl(0.2, 0.5, '#111113', -3.6, 3.3, -1), F.chairBig()),
  chairBig: () => { const g = G(rb(2.8, 1.8, 2.6, '#5c1820', 0, 0.3, 0, 0.4), rb(2.8, 5.2, 0.8, '#5c1820', 0, 0.3, -1.1, 0.35), rb(0.6, 1.2, 2.4, DARK, -1.5, 1.6, 0, 0.2), rb(0.6, 1.2, 2.4, DARK, 1.5, 1.6, 0, 0.2)); g.position.z = -4.2; return g; },
  throne: (mat) => G(b(18, 1.2, 13, '#b9b2a2'), b(14, 1.2, 10, '#b9b2a2', 0, 1.2), b(10, 1.2, 7, '#a9a292', 0, 2.4), b(5.4, 2.6, 4.6, mat, 0, 3.6), b(5.4, 14, 0.9, mat, 0, 3.6, -2.3), b(0.9, 5, 4.6, mat, -2.7, 3.6), b(0.9, 5, 4.6, mat, 2.7, 3.6), ...[-2.7, -1.35, 0, 1.35, 2.7].map((x, i) => { const s = mesh(new THREE.ConeGeometry(0.55, 4 + (2 - Math.abs(i - 2)) * 2.4, 6), mat); s.position.set(x, 17.6 + 2 + (2 - Math.abs(i - 2)) * 1.2, -2.3); return s; }), rb(4.4, 0.5, 3.6, '#7a1616', 0, 6.2, 0.2, 0.2)),
  stairs: (w, n, rise = 1, run = 1.6, color = '#8c877c') => { const g = G(); for (let i = 0; i < n; i++) g.add(b(w, rise * (n - i), run, color, 0, -rise * n, i * run)); return g; },
  counter: (w = 9) => G(b(w, 3, 2.4, '#7a6a58'), b(w + 0.2, 0.25, 2.6, '#d8d2c4', 0, 3), b(1.6, 1, 1.4, '#2c2c30', -w / 4, 3.25, 0, { metalness: 0.7, roughness: 0.4 }), cyl(0.5, 0.7, '#b0683c', w / 4, 3.25, 0, { metalness: 0.5, roughness: 0.4 }), ball(0.3, '#9e1b1b', w / 3, 3.5, 0.5), ball(0.3, '#c9a440', w / 3 + 0.5, 3.5, 0.2), b(w, 0.3, 1.2, '#7a6a58', 0, 6.2, -0.6), ...[0, 1, 2, 3].map((i) => cyl(0.3, 0.8, ['#d8d2c4', '#254a5a', '#8a5a3c'][i % 3], -w / 2 + 1 + i * 1.4, 6.5, -0.6))),
  crates: (seed = 3) => { const g = G(), R = rng(seed); for (let i = 0; i < 9; i++) { const s = 2 + R() * 1.6, c = b(s, s, s, '#8a6f4e', (R() - 0.5) * 10, i > 5 ? 2.6 : 0, (R() - 0.5) * 6); c.rotation.y = R(); g.add(c); } return g; },
  chandelier: () => G(cyl(0.1, 6, GOLD, 0, 3.4), cyl(2.6, 0.2, GOLD, 0, 3.2, 0, { metalness: 0.7, roughness: 0.3 }), cyl(1.4, 0.2, GOLD, 0, 4.2, 0, { metalness: 0.7, roughness: 0.3 }), ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((i) => [cyl(0.12, 0.7, '#f4f1e8', Math.cos(i * 0.785) * 2.4, 3.4, Math.sin(i * 0.785) * 2.4), ball(0.2, glow('#ffd58a', 3), Math.cos(i * 0.785) * 2.4, 4.3, Math.sin(i * 0.785) * 2.4)])),
  door: () => G(b(5.2, 9.2, 0.5, '#3d2a1e'), b(4.4, 8.6, 0.6, '#5a3d28'), b(1.6, 3.2, 0.7, '#4a3020', -1, 4.6), b(1.6, 3.2, 0.7, '#4a3020', 1, 4.6), b(1.6, 3.2, 0.7, '#4a3020', -1, 0.8), b(1.6, 3.2, 0.7, '#4a3020', 1, 0.8), ball(0.22, GOLD, 1.7, 4.2, 0.45, { metalness: 0.8, roughness: 0.3 })),
};
F.window = (w = 4, h = 8, drape = '#5c1820') => F._win(w, h, drape);
function shadeC(hex) { return '#' + new THREE.Color(hex).multiplyScalar(0.6).getHexString(); }

// ---- more furniture ------------------------------------------------------------------------------------
const N = Math.PI / 2, V = (x, y, z) => new THREE.Vector3(x, y, z);
const IRON = { metalness: 0.8, roughness: 0.45 };
const stackMats = new Map();
Object.assign(F, {
  // free-standing library stack: books on both long faces
  stack: (len = 24, h = 16) => {
    const k = len + '|' + h;
    if (!stackMats.has(k)) { const s = new THREE.MeshStandardMaterial({ map: surface('spines', '#1c130d', Math.max(1, Math.round(len / 9)), Math.max(1, Math.round(h / 9))), roughness: 0.8 }), d = M(DARK); stackMats.set(k, [d, d, d, d, s, s]); }
    const m = new THREE.Mesh(BOX, stackMats.get(k)); m.scale.set(len, h, 2.6); m.position.y = h / 2; m.castShadow = m.receiveShadow = true;
    return G(m, b(len + 0.5, 0.5, 3, DARK, 0, h));
  },
  frame: (w, h, color = '#3d2a1e') => G(b(0.7, h, 1, color, -w / 2 - 0.2), b(0.7, h, 1, color, w / 2 + 0.2), b(w + 1.8, 0.8, 1, color, 0, h)),
  hedge: (len, h = 4.5) => rb(len, h, 3, '#2f5a36', 0, 0, 0, 0.8),
  tree: (s = 1) => G(cyl(0.6 * s, 6 * s, '#5a4636'), ...[0, 1, 2, 3].map((i) => ball(3.2 * s, i % 2 ? '#3f6a3c' : '#2f5a36', Math.cos(i * 1.6) * 1.8 * s, (7.5 + (i % 2) * 2) * s, Math.sin(i * 1.6) * 1.8 * s))),
  fountain: () => G(cyl(7, 1.4, '#b9b2a2'), cyl(6.2, 0.3, M('#7fc4d2', { roughness: 0.05, metalness: 0.3 }), 0, 1.2), cyl(0.9, 6, '#b9b2a2'), cyl(3, 0.5, '#b9b2a2', 0, 5.6), cyl(0.5, 2.6, '#b9b2a2', 0, 6), ball(0.9, '#b9b2a2', 0, 9)),
  clock: (h = 80) => { const blk = { roughness: 0.3, metalness: 0.25 }, g = G(b(13, h, 13, '#141317', 0, 0, 0, blk), b(16, 3, 16, '#141317', 0, 0, 0, blk), b(15, 2, 15, '#141317', 0, h, 0, blk)); const cap = mesh(new THREE.ConeGeometry(10, 22, 4), M('#141317', blk)); cap.position.y = h + 13; cap.rotation.y = Math.PI / 4; g.add(cap);
    for (let i = 0; i < 4; i++) { const f = cyl(4.6, 0.4, glow('#e9e2c8', 0.9), 0, 0, 0); f.rotation.x = N; f.rotation.z = i * N; f.position.set(Math.sin(i * N) * 6.6, h * 0.82, Math.cos(i * N) * 6.6); if (i % 2) { f.rotation.set(0, 0, N); } g.add(f); }
    for (let i = 0; i < 4; i++) g.add(ball(1.1, '#0c0b0e', (i % 2 ? 1 : -1) * 6, h + 2.6, (i < 2 ? 1 : -1) * 6));
    return g; },
  bars: (w = 8, h = 9) => { const g = G(b(w, 0.4, 0.4, '#2c2c30', 0, h, 0, IRON), b(w, 0.4, 0.4, '#2c2c30', 0, 0, 0, IRON)); for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.9) g.add(cyl(0.13, h, '#2c2c30', x, 0, 0, IRON)); return g; },
  ironDoor: () => G(b(8, 12, 0.9, '#2a2c30', 0, 0, 0, IRON), ...[2, 6, 10].map((y) => b(8.4, 0.9, 1.1, '#1c1d20', 0, y, 0, IRON)), ...[-3, -1, 1, 3].flatMap((x) => [2.45, 6.45, 10.45].map((y) => ball(0.22, '#55585e', x, y, 0.6, IRON))), b(9.6, 13, 0.6, '#55514a', 0, 0, -0.3), cyl(0.9, 0.5, '#1c1d20', 2.6, 5.2, 0.5, IRON)),
  tapestry: (w = 9, h = 10, color = '#4a6a5a') => G(b(w + 0.8, 0.3, 0.3, GOLD, 0, h), b(w, h, 0.18, color), b(w - 1.4, h - 1.6, 0.22, shadeC(color), 0, 0.8), b(w * 0.35, h * 0.3, 0.26, GOLD, 0, h * 0.4, 0, { roughness: 0.6 }), b(w, 0.4, 0.22, GOLD, 0, 0.2)),
  cot: (cover = '#6a655c') => G(b(4.2, 1.2, 9, '#4a3a2c'), rb(3.9, 0.7, 8.6, '#d9d2c2', 0, 1.2, 0, 0.25), rb(3.9, 0.5, 5, cover, 0, 1.7, 1.6, 0.2), rb(2.6, 0.6, 1.5, '#efe8d8', 0, 1.8, -3.3, 0.25)),
  bunk: (cover = '#5a544a') => { const g = F.cot(cover), up = F.cot(cover); up.position.y = 5.2; g.add(up); for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(b(0.4, 8, 0.4, '#4a3a2c', sx * 2, 0, sz * 4.4)); return g; },
  bench: (len = 12) => G(b(len, 0.4, 1.6, WOOD, 0, 1.5), b(0.5, 1.5, 1.4, DARK, -len / 2 + 1), b(0.5, 1.5, 1.4, DARK, len / 2 - 1)),
  mess: (len = 26) => { const g = G(F.table(len, 4.4, '#4a3a2c')); for (const sz of [-1, 1]) { const s = F.bench(len - 1); s.position.z = sz * 3.4; g.add(s); } for (let x = -len / 2 + 2; x < len / 2 - 1; x += 3.4) g.add(cyl(0.6, 0.12, '#8c877c', x, 3, 0.9), cyl(0.28, 0.6, '#6a5a3c', x + 1.2, 3, -0.9)); return g; },
  barrel: () => G(cyl(1.5, 3.6, '#6a4a2e'), cyl(1.56, 0.25, '#2c2c30', 0, 0.6, 0, IRON), cyl(1.56, 0.25, '#2c2c30', 0, 2.8, 0, IRON)),
  anvil: () => G(b(2, 2.2, 2, '#4a3a2c'), b(3.4, 0.9, 1.4, '#2c2c30', 0, 2.2, 0, IRON), b(1.2, 0.5, 1.2, '#2c2c30', 2, 2.5, 0, IRON)),
  forge: () => { const flames = [0, 1, 2, 3].map((i) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 7), glow(i % 2 ? '#ffd27a' : '#ff5a1f', 3)); f.position.set((i - 1.5) * 1.3, 4.6, 0); return f; }); const g = G(b(9, 3.4, 6, '#3a3a3e'), b(7.4, 0.5, 4.4, glow('#ff6a1f', 2), 0, 3.2), ...flames, b(9, 7, 1.2, '#3a3a3e', 0, 7, -2.4), b(6, 6, 4, '#2a2a2e', 0, 14, -1)); g.userData.flames = flames; return g; },
  horse: (color = '#6a4a2e') => G(rb(2, 2.4, 5.6, color, 0, 3.4, 0, 0.9), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl(0.3, 3.6, color, sx * 0.7, 0, sz * 2.1))), (() => { const n = rb(1.2, 3.4, 1.4, color, 0, 4.6, 2.9, 0.5); n.rotation.x = 0.5; return n; })(), rb(1, 1.2, 2.4, color, 0, 7.2, 4.2, 0.4), cyl(0.14, 2.6, '#1c130d', 0, 2.6, -2.9)),
  stall: (w = 9, d = 11) => G(b(0.5, 5, d, WOOD, -w / 2, 0, 0), b(0.5, 5, d, WOOD, w / 2, 0, 0), b(w, 0.15, d, '#c9b27a')),
  cushion: (color = '#9e3a2a') => rb(2.6, 0.8, 2.6, color, 0, 0, 0, 0.35),
  post: () => G(cyl(0.5, 10, '#4a3a2c'), cyl(0.25, 0.3, '#2c2c30', 0, 8.6, 0.5, IRON), b(3, 0.5, 3, '#4a3a2c')),
  seats: (rows = 8, n = 12) => { const g = G(); for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) { if (i === n / 2 - 1 || i === n / 2) continue; g.add(rb(2, 1.6, 2, '#7a1616', (i - (n - 1) / 2) * 2.5, 0.4, r * 4.4, 0.3), rb(2, 2.4, 0.6, '#7a1616', (i - (n - 1) / 2) * 2.5, 1.6, r * 4.4 + 0.9, 0.2)); } return g; },
  pool: (w, d, color = '#5fa8b8') => b(w, 0.3, d, M(color, { roughness: 0.05, metalness: 0.3, emissive: color, emissiveIntensity: 0.15 })),
  // Mort: a bronze skull door-knocker on a slab of dark stone. Face toward +z.
  mort: () => {
    const bronze = M('#a9783c', { metalness: 0.85, roughness: 0.35 }), g = G(b(3.4, 4.8, 0.4, '#34363c', 0, -2.4, 0), ball(1.15, bronze, 0, 0.7, 0.9), b(1.4, 0.8, 0.9, bronze, 0, -0.9, 0.95));
    for (const sx of [-1, 1]) g.add(ball(0.3, '#08080a', sx * 0.45, 0.85, 1.95), ball(0.13, glow('#ffb04a', 2.5), sx * 0.45, 0.85, 2.12));
    g.add(b(0.3, 0.45, 0.2, '#08080a', 0, 0.05, 2.02));
    for (let i = -2; i <= 2; i++) g.add(b(0.18, 0.4, 0.1, '#e4dcc8', i * 0.27, -0.85, 1.43));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.11, 8, 22), bronze); ring.position.set(0, -1.9, 1.0); ring.castShadow = true; g.add(ring);
    // his name tag: an engraved brass plate under the slab
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const x = c.getContext('2d');
    x.fillStyle = '#b8873f'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#6e4a1c'; x.lineWidth = 6; x.strokeRect(7, 7, 242, 82);
    x.font = '600 58px "Fournier MT", Fournier, "Cormorant Garamond", Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#e8c27a'; x.fillText('MORT', 129, 52); x.fillStyle = '#3a240c'; x.fillText('MORT', 128, 50);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    g.add(b(2.8, 1.05, 0.14, bronze, 0, -3.75, 0.1));
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.98), new THREE.MeshStandardMaterial({ map: tex, metalness: 0.6, roughness: 0.4 }));
    tag.position.set(0, -3.225, 0.18); g.add(tag);
    return g;
  },
  bone: () => G(cyl(0.2, 3, '#d8d2c4', 0, 0.2, 0), ball(0.35, '#d8d2c4', 0, 0.3, 0), ball(0.35, '#d8d2c4', 0, 3.2, 0)),
  ring: (r = 9) => G(cyl(r, 0.25, '#c7ae80'), ...Array.from({ length: 12 }, (_, i) => cyl(0.3, 3.4, DARK, Math.cos(i * 0.5236) * r, 0, Math.sin(i * 0.5236) * r))),
  salt: (s = 3) => { const m = mesh(new THREE.DodecahedronGeometry(s, 0), M('#eeeae2', { roughness: 0.5, flatShading: true })); m.position.y = s * 0.5; m.scale.y = 0.7; return G(m); },
  cart: () => G(b(5, 2.4, 3.4, '#5a4636', 0, 1.2), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => { const w = cyl(0.9, 0.3, '#2c2c30', sx * 1.6, 0.9, sz * 1.9, IRON); w.rotation.x = N; return w; })), ball(1.6, '#eeeae2', 0, 3.2, 0)),
});

// ---- builder --------------------------------------------------------------------------------------------
const wmats = new Map(), tmats = new Map(), HID = new THREE.MeshBasicMaterial({ visible: false });
const GLASS = new THREE.MeshStandardMaterial({ color: '#cdeef2', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.38, emissive: '#5fb4c6', emissiveIntensity: 0.25, depthWrite: false });
const wallMat = (kind, color) => { if (kind === 'glass') return GLASS; const k = kind + color; if (!wmats.has(k)) wmats.set(k, new THREE.MeshStandardMaterial({ map: surface(kind, color), roughness: 0.9 })); return wmats.get(k); };
const tmat = (color) => { if (!tmats.has(color)) tmats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.95, side: THREE.BackSide })); return tmats.get(color); };
function quad(w, h, mat, us, vs, u0 = 0, v0 = 0) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * us, v0 + uv.getY(i) * vs);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; return m;
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Rooms are joined by real openings: link(a, b) cuts a doorway in both walls and builds the passage or stair between them.
class House {
  constructor(can = () => true, base = {}) {
    this.can = can; this.base = base; this.group = new THREE.Group(); this.pois = []; this.rooms = new Map(); this.zones = []; this.solids = []; this.flames = [];
    this.fire = new THREE.PointLight('#ff8a3a', 0, 70, 1.5); this.lamp = new THREE.PointLight('#ffd9a8', 0, 170, 1.3);
    this.backdrop = new THREE.Group(); this.backdrop.visible = false;
  }
  // A room centred at (x, z) with its floor at y. Returns a placer: put(thing, localX, localZ, turn, lift)
  room(id, name, [x, z, w, d, h = 12, y = 0], opts = {}) {
    const o = { ...this.base, ...opts };
    if (o.book !== undefined && !this.can(o.book)) return (thing) => thing;
    const r = { id, name, x, z, w, d, h, y, o, x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, holes: { n: [], s: [], w: [], e: [] } };
    const poi = { id, name, notes: o.notes || [], kind: o.label === false ? 'hidden' : 'landmark', pos: V(x, y + h + 3, z), focus: V(x, y + 3, z), size: Math.max(w, d), bounds: r,
      sky: !!o.sky, dark: o.dark ?? y < -4, light: o.light || '#ffd9a8', glow: o.sky ? 0 : o.glow ?? 1 };
    r.poi = poi; this.rooms.set(id, r); this.pois.push(poi);
    this.zones.push({ x0: r.x0 + 1.3, x1: r.x1 - 1.3, z0: r.z0 + 1.3, z1: r.z1 - 1.3, yAt: () => y, poi });
    return (thing, lx = 0, lz = 0, turn = 0, lift = 0) => {
      thing.position.set(x + lx, y + lift, z + lz); thing.rotation.y = turn; this.group.add(thing);
      if (thing.userData.flames) { this.flames.push(...thing.userData.flames); poi.fire = V(x + lx * 0.8, y + 3, z + lz * 0.8); }
      thing.updateMatrixWorld(true);
      const bx = new THREE.Box3().setFromObject(thing);
      if (bx.min.y < y + 5 && bx.max.y > y + 1.3 && (bx.max.x - bx.min.x) * (bx.max.z - bx.min.z) < w * d * 0.5) this.solids.push({ x0: bx.min.x, x1: bx.max.x, z0: bx.min.z, z1: bx.max.z, y });
      return thing;
    };
  }
  link(a, b2, { at, w = 6, h = 9.5, color, frame } = {}) {
    const A = this.rooms.get(a), B = this.rooms.get(b2);
    if (!A || !B) return;
    let axis, p0, p1;
    if (A.x1 <= B.x0 + 0.01) { axis = 'x'; p0 = A.x1; p1 = B.x0; } else if (B.x1 <= A.x0 + 0.01) { axis = 'x'; p0 = A.x0; p1 = B.x1; }
    else if (A.z1 <= B.z0 + 0.01) { axis = 'z'; p0 = A.z1; p1 = B.z0; } else { axis = 'z'; p0 = A.z0; p1 = B.z1; }
    const c = at ?? (axis === 'x' ? (Math.max(A.z0, B.z0) + Math.min(A.z1, B.z1)) / 2 : (Math.max(A.x0, B.x0) + Math.min(A.x1, B.x1)) / 2);
    h = Math.min(h, A.h, B.h);
    const lo = Math.min(p0, p1), hi = Math.max(p0, p1), L = hi - lo, ylo = p0 < p1 ? A.y : B.y, yhi = p0 < p1 ? B.y : A.y, dy = yhi - ylo;
    const col = color || shadeC(A.o.wallKind === 'glass' ? '#9a958a' : A.o.wall || '#d9d2c2'), g = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, h, L), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + h / 2 + ylo + dy * (pos.getZ(i) / L + 0.5));
    geo.computeVertexNormals();
    const tm = tmat(col), fm = tmat(shadeC(col));
    g.add(new THREE.Mesh(geo, [tm, tm, tm, fm, HID, HID]));
    const n = Math.round(Math.abs(dy) / 1.1);
    for (let i = 0; i < n; i++) g.add(b(w - 0.1, 0.7, L / n + 0.05, '#8c877c', 0, ylo + dy * ((i + 0.5) / n) - 0.45, -L / 2 + (i + 0.5) * (L / n)));
    const fc = frame || (A.o.wallKind === 'stone' || A.o.wallKind === 'plain' ? '#6a665e' : '#3d2a1e');
    const f0 = F.frame(w, h - 0.4, fc), f1 = F.frame(w, h - 0.4, fc); f0.position.set(0, ylo, -L / 2); f1.position.set(0, yhi, L / 2); g.add(f0, f1);
    g.position.set(axis === 'x' ? (lo + hi) / 2 : c, 0, axis === 'x' ? c : (lo + hi) / 2); if (axis === 'x') g.rotation.y = N;
    this.group.add(g);
    const side = (R, p) => (axis === 'x' ? (Math.abs(p - R.x1) < 0.02 ? 'e' : 'w') : Math.abs(p - R.z1) < 0.02 ? 's' : 'n');
    A.holes[side(A, p0)].push({ c, w, h }); B.holes[side(B, p1)].push({ c, w, h });
    const yAt = (x, z) => ylo + dy * clamp01(((axis === 'x' ? x : z) - lo) / L);
    this.zones.push(axis === 'x' ? { x0: lo - 3.2, x1: hi + 3.2, z0: c - w / 2 + 1, z1: c + w / 2 - 1, yAt, pass: true } : { x0: c - w / 2 + 1, x1: c + w / 2 - 1, z0: lo - 3.2, z1: hi + 3.2, yAt, pass: true });
  }
  done(extra = {}) {
    let minY = 0;
    for (const r of this.rooms.values()) {
      const { x, z, w, d, h, y, o } = r, add = (m) => { this.group.add(m); return m; };
      minY = Math.min(minY, y);
      const fl = add(quad(w, d, wallMat(o.floorKind || 'planks', o.floor || '#8a7458'), w / 14, d / 14)); fl.rotation.x = -N; fl.position.set(x, y, z);
      const under = add(b(w + 1.2, 0.6, d + 1.2, '#2a2622', x, y - 0.75, z)); under.castShadow = false;
      if (!o.sky) { const c = add(quad(w, d, wallMat('ceiling', o.ceil || '#d8d0c0'), w / 18, d / 18)); c.rotation.x = N; c.position.set(x, y + h, z); }
      const wm = wallMat(o.wallKind || 'panel', o.wall || '#d9d2c2');
      for (const [side, rot] of [['n', 0], ['s', Math.PI], ['w', N], ['e', -N]]) {
        const ns = side === 'n' || side === 's', fix = { n: r.z0, s: r.z1, w: r.x0, e: r.x1 }[side];
        const seg = (p, q, ya, yb) => {
          if (q - p < 0.01 || yb - ya < 0.01) return;
          const m = add(quad(q - p, yb - ya, wm, (q - p) / 15, (yb - ya) / h, p / 15, ya / h)), mid = (p + q) / 2;
          m.rotation.y = rot; m.position.set(ns ? mid : fix, y + (ya + yb) / 2, ns ? fix : mid);
        };
        let cur = ns ? r.x0 : r.z0;
        for (const hole of r.holes[side].sort((p, q) => p.c - q.c)) { seg(cur, hole.c - hole.w / 2, 0, h); seg(hole.c - hole.w / 2, hole.c + hole.w / 2, hole.h, h); cur = hole.c + hole.w / 2; }
        seg(cur, ns ? r.x1 : r.z1, 0, h);
      }
    }
    // nothing may stand in a doorway
    const passes = this.zones.filter((zn) => zn.pass);
    this.solids = this.solids.filter((s) => !passes.some((p) => s.x0 < p.x1 + 1 && s.x1 > p.x0 - 1 && s.z0 < p.z1 + 1 && s.z1 > p.z0 - 1 && Math.abs(p.yAt((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2) - s.y) < 4));
    const box = new THREE.Box3().setFromObject(this.group), c = box.getCenter(V(0, 0, 0)), s = box.getSize(V(0, 0, 0));
    const base = new THREE.Mesh(new THREE.BoxGeometry(s.x + 60, 2, s.z + 60), M('#14181a'));
    base.position.set(c.x, box.min.y - 1.6, c.z); base.receiveShadow = true;
    this.group.add(base, this.fire, this.lamp, this.backdrop);
    const update = (time, poi, cam) => {
      this.flames.forEach((f, i) => { const k = 0.8 + 0.35 * Math.sin(time * 9 + i * 2.1) * Math.sin(time * 5.3 + i); f.scale.set(1, k, 1); });
      if (cam && poi?.fire) { this.fire.position.copy(poi.fire); this.fire.intensity = 110 * (0.85 + 0.15 * Math.sin(time * 11) * Math.sin(time * 6.7)); } else this.fire.intensity = 0;
      if (cam && poi) { const B = poi.bounds; this.lamp.color.set(poi.light); this.lamp.intensity = 190 * poi.glow; this.lamp.position.set(cam.x * 0.7 + B.x * 0.3, cam.y - 6.4 + Math.min(B.h * 0.75, 15), cam.z * 0.7 + B.z * 0.3); } else this.lamp.intensity = 0;
      this.backdrop.visible = !!(cam && poi?.sky);
    };
    return { group: this.group, pois: this.pois, zones: this.zones, solids: this.solids, minY, center: V(c.x, 0, c.z), size: Math.max(s.x, s.z), update, ...extra };
  }
}

const PI = Math.PI;
const each = (n, fn) => { for (let i = 0; i < n; i++) fn(i); };

// ---- The Glass Castle ----------------------------------------------------------------------------------------
function castle(can) {
  const H = new House(can), glass = new THREE.MeshStandardMaterial({ color: '#cdeef2', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6, emissive: '#5fb4c6', emissiveIntensity: 0.3 });
  const stone = { floor: '#8f8a80', wall: '#bdb6a6', floorKind: 'flags', wallKind: 'stone', ceil: '#b3ac9c' };
  const soft = { floor: '#8a6444', wall: '#e2d6c2' };
  const deep = { floor: '#5a5a5c', wall: '#5e5e62', floorKind: 'flags', wallKind: 'stone', ceil: '#4c4c50', light: '#ffc48a' };

  // --- outside
  let put = H.room('courtyard', 'The Courtyard', [0, 147, 150, 70, 12], { floor: '#8d877a', wall: '#a8a294', floorKind: 'flags', wallKind: 'stone', sky: true, notes: [
    [1, 'The great courtyard inside the castle gates. Celaena rode in here from Endovier and looked up, and up, at the glass.'],
  ] });
  put(F.fountain(), 0, 2); put(F.bars(14, 11), 0, 34.6); put(F.frame(14, 11.4, '#8c877c'), 0, 34.4);
  for (const sx of [-1, 1]) { each(4, (i) => put(F.tree(1.2), sx * (30 + i * 13), 26)); put(F.bench(10), sx * 16, 2, sx * N); each(3, (i) => put(F.banner('#9e1b1b', 9), sx * (16 + i * 18), -34.8, 0, 2)); put(F.torch(), sx * 6, -34.6); }
  put(b(22, 0.12, 62, '#a39c8c'), 0, 0);

  put = H.room('gardens', 'The Royal Gardens', [-124, 147, 90, 70, 10], { floor: '#57804a', wall: '#8f9a84', floorKind: 'plain', wallKind: 'stone', sky: true, notes: [
    [1, 'Hedges, gravel paths and fountains, and at their edge the obsidian clock tower: black stone, four faces, and a chime that carries through the whole castle.'],
    [1, 'The final duel of the competition was fought on the veranda here, in the tower’s shadow.'],
  ] });
  put(b(8, 0.12, 66, '#c9c0a8'), 30, 0); put(b(80, 0.12, 8, '#c9c0a8'), 0, 0); put(F.clock(84), -20, -18);
  put(b(34, 0.5, 20, '#b9b2a2'), 22, -22); put(F.ring(7), 22, -22, 0, 0.5);
  for (const z of [14, 26]) { put(F.hedge(30), -22, z); put(F.hedge(22), 14, z + 0.01); }
  each(5, (i) => put(F.tree(1 + (i % 2) * 0.3), -38 + i * 17, 31)); put(F.fountain(), -4, 20).scale.setScalar(0.6);
  each(6, (i) => put(F.vase('#8c877c', ['#b0507a', '#f4f1e8', '#c9a440'][i % 3]), -40 + i * 7, 6)); put(F.bench(9), 38, 12, -N);

  put = H.room('kennels', 'The Kennels', [104, 147, 50, 40, 11], { floor: '#9a8a66', wall: '#8a7a66', floorKind: 'flags', wallKind: 'stone', light: '#ffe2b8', notes: [[1, 'Home of the royal hounds. Fleetfoot was born here, the runt nobody wanted.']] });
  each(5, (i) => { put(F.cell(8, 9), -18 + i * 9, -14); put(b(3, 0.3, 2, '#c9b27a'), -18 + i * 9, -17); });
  put(b(2.4, 1.4, 1, '#c9a86a'), 6, 8); put(b(0.9, 0.9, 0.9, '#c9a86a'), 7.4, 8.2, 0, 1.2); put(F.barrel(), 20, 15); put(F.crates(4), -14, 14);

  // --- the stone castle
  put = H.room('hall', 'The Great Hall', [0, 80, 80, 56, 26], { ...stone, floor: '#8d7c68', notes: [
    [1, 'Where the court gathers to dine beneath the banners of Adarlan.'],
  ] });
  for (const sx of [-1, 1]) { for (const z of [-10, 8]) put(F.dining(4, 24), sx * 21, z); put(F.hearth(12), sx * 39.2, -16, -sx * N); each(2, (i) => put(F.banner('#9e1b1b', 12), sx * (14 + i * 14), -27.8, 0, 9)); put(F.pillar(26, 1.4), sx * 8, 22); put(F.pillar(26, 1.4), sx * 8, -22); }
  each(3, (i) => put(F.chandelier(), -24 + i * 24, 0, 0, 15)); put(F.rug(8, 46, '#7a1616'), 0, 0);

  put = H.room('throne', 'The Throne Room', [0, 10, 56, 76, 32], { floor: '#8a8580', wall: '#c9c3b4', floorKind: 'tiles', wallKind: 'stone', ceil: '#c9c3b4', light: '#e8f4ff', notes: [
    [1, 'The seat of the King of Adarlan, and the glass throne. Celaena was marched in here on the day she arrived from Endovier.'],
  ] });
  put(F.throne(glass), 0, -28); put(F.rug(8, 48, '#7a1616'), 0, 8);
  for (const sx of [-1, 1]) { each(4, (i) => { put(F.pillar(28, 1.5), sx * 15, -14 + i * 14); if (i !== 1) put(F.banner('#9e1b1b', 14), sx * 27.7, -22 + i * 16, -sx * N, 10); }); put(F.window(5, 16), sx * 10, -37.7, 0, 9); }

  put = H.room('gallery', 'The Glass Gallery', [0, -52, 56, 40, 24], { floor: '#b9dfe6', wall: '#cdeef2', floorKind: 'tiles', wallKind: 'glass', ceil: '#cdeef2', light: '#dff6ff', notes: [
    [1, 'Above the stone castle everything is glass: walls, floors, stairs and bridges between the towers. Celaena has never trusted it to hold.'],
  ] });
  each(4, (i) => put(F.pillar(22, 1, '#dff3f6'), -21 + i * 14, -14)); put(F.plant(), -22, 14); put(F.plant(), 24, -4); put(F.bench(10), -6, -17); put(F.rug(30, 8, '#254a5a'), 0, 4);

  put = H.room('ballroom', 'The Ballroom', [-58, 4, 52, 64, 30], { floor: '#c9b28a', wall: '#cdeef2', floorKind: 'tiles', wallKind: 'glass', ceil: '#e4dccb', light: '#fff0c8', notes: [
    [1, 'Glass walls, a thousand candles, and the Yulemas ball. Celaena was not invited, and went anyway.'],
  ] });
  for (const z of [-18, 0, 18]) for (const x of [-12, 12]) put(F.chandelier(), x, z, 0, 18);
  put(b(22, 1.2, 9, '#8c877c'), 0, -26); put(F.piano(), -4, -26, 0, 1.2); each(3, (i) => put(F.chair(), 4 + i * 3, -26, 0, 1.2));
  for (const sx of [-1, 1]) each(4, (i) => put(F.candles(), sx * 23, -20 + i * 14)); put(F.round(2.4), -18, 24); put(F.vase(), -18, 24, 0, 3); put(F.round(2.4), 16, 26); put(F.candles(), 16, 26, 0, 3);

  put = H.room('council', 'The Council Chamber', [50, 0, 36, 36, 16], { ...stone, floor: '#6b5140', floorKind: 'planks', notes: [
    [1, 'Where the king’s councillors meet, and where Chaol makes his reports as Captain of the Guard.'],
  ] });
  put(F.dining(5, 22), 0, 2, N); put(F.chandelier(), 0, 2, 0, 8); put(F.hearth(8), 0, 17.2, PI); put(F.banner('#9e1b1b', 9), 17.7, 10, -N, 5); put(F.painting(7, 4.6, '#2a2a33', '#5c1820'), 17.8, -8, -N, 7);

  put = H.room('dorian', 'Dorian’s Tower', [50, -40, 36, 36, 18], { floor: '#6b5140', wall: '#a8a294', wallKind: 'stone', notes: [
    [1, 'The Crown Prince’s rooms, high in a stone tower of the old castle and buried in books.'],
  ] });
  put(F.bed('#1f3a5a', true), -9, -10); put(F.shelf(10, 12, 8), 9, -17.2); put(F.shelf(10, 12, 9), -17.2, 6, N); put(F.desk(), 6, 0, PI); put(F.rug(14, 10, '#1f3a5a'), -6, 4); put(F.hearth(7), 17.2, 10, -N);
  put(F.window(5, 9), -4, -17.8, 0, 4); each(6, (i) => put(b(1.6, 0.4 + i * 0.3, 1.2, ['#7a1f2b', '#254a5a', '#8a6a2a'][i % 3]), 11 + (i % 2) * 2, 12 - i * 1.5)); put(F.couch('#1f3a5a'), -8, 13, PI);

  put = H.room('chaol', 'Chaol’s Rooms', [88, -40, 32, 28, 14], { floor: '#7b5a3c', wall: '#bdb6a6', wallKind: 'stone', notes: [
    [1, 'The Captain of the Guard’s quarters: neat, plain, and barely lived in. He is on duty before dawn and long after dark.'],
  ] });
  put(F.bed('#2c3a2c'), 6, -7); put(F.rack(), -6, -13.5); put(F.table(8, 4), 4, 9); put(F.chair(), 4, 12.4, PI); put(F.wardrobe(6), 15, 2, -N); put(F.rug(12, 8, '#2c3a2c'), 2, 2); put(F.window(4, 8), 15.8, -8, -N, 4); put(F.candles(), 4, 9, 0, 3);

  put = H.room('nehemia', 'Princess Nehemia’s Rooms', [88, -2, 32, 28, 14], { floor: '#8a6444', wall: '#e2d0aa', wallKind: 'paper', notes: [
    [1, 'The Princess of Eyllwe’s suite. She and Celaena traded lessons here: the common tongue for Eyllwe, and later for stranger things.'],
  ] });
  put(F.bed('#c9a440', true), 7, -6); put(F.rug(16, 10, '#b0683c'), 0, 4); put(F.round(2), -8, 8); put(F.chair(), -8, 4.4); put(F.chair(), -8, 11.6, PI); put(F.vase('#b0683c', '#f4f1e8'), -8, 8, 0, 3); put(F.shelf(8, 9, 71), -6, -13.2); put(F.window(4, 8), 15.8, 6, -N, 4); put(F.plant(), 13, 11);

  put = H.room('training', 'The Training Hall', [-90, 80, 92, 56, 22], { floor: '#b59a6e', wall: '#a39c8e', wallKind: 'stone', ceil: '#a39c8e', notes: [
    [1, 'Where the would-be Champions trained under Weapons Master Brullo, and where Chaol put Celaena through her paces every dawn.'],
  ] });
  put(b(44, 0.3, 28, '#9a7f52'), 0, 2); put(b(40, 0.35, 24, '#c7ae80'), 0, 2);
  each(6, (i) => put(F.rack(), -36 + i * 10, 27.5, PI)); each(4, (i) => put(F.dummy(), 34, -18 + i * 9));
  each(3, (i) => { put(cyl(3, 0.4, '#e9e2d0'), -24 + i * 12, -27.4, 0, 6).rotation.x = N; put(cyl(1.2, 0.5, '#9e1b1b'), -24 + i * 12, -27.2, 0, 6).rotation.x = N; });
  put(F.bench(14), 12, -25); put(F.barrel(), -40, -22);

  // --- the library
  put = H.room('library', 'The Royal Library', [-163, -17, 150, 130, 38], { floor: '#6b4d38', wall: '#6e5a48', wallKind: 'paper', ceil: '#b9a88c', notes: [
    [1, 'A city of books: more than anyone could read in a thousand years, by the librarians’ own count. Dorian sent Celaena volumes from here, and she spent what hours she could among the stacks.'],
    [2, 'The further back you go, the older and stranger the shelves become. A stair in the far corner winds down to levels nobody visits.'],
  ] });
  for (let r = 0; r < 9; r++) for (const x of [-55, -24, 24, 55]) put(F.stack(26, 17), x, -52 + r * 10.5);
  for (const sx of [-1, 1]) {
    for (const z of [-50, -22, 42]) for (const lift of [0, 19.6]) put(F.stack(26, 15), sx * 73.6, z, N, lift);
    put(b(8, 0.6, 130, WOOD), sx * 71, 0, 0, 19); each(22, (i) => put(cyl(0.18, 3.4, GOLD), sx * 67.2, -62 + i * 6, 0, 19.6)); put(b(0.3, 0.3, 130, GOLD), sx * 67.2, 0, 0, 23);
    each(3, (i) => put(F.chandelier(), sx * 38, -40 + i * 38, 0, 26)); each(2, (i) => { put(F.table(14, 6), sx * (18 + i * 26), 54); put(F.candles(), sx * (18 + i * 26), 54, 0, 3); put(F.chair(), sx * (15 + i * 26), 58.2, PI); put(F.chair(), sx * (21 + i * 26), 49.8); });
  }
  each(5, (i) => { if (i) put(F.stack(26, 15), -56 + i * 28, -63.6); put(F.stack(26, 15), -56 + i * 28, -63.6, 0, 19.6); });
  put(b(150, 0.6, 8, WOOD), 0, -61, 0, 19); put(b(134, 0.3, 0.3, GOLD), 0, -57.2, 0, 23);
  put(F.rug(12, 96, '#3d2a4a'), 0, -6); put(F.rug(60, 9, '#3d2a4a'), 0, 54); put(F.hearth(12), 0, 64.2, PI);
  put(cyl(2.4, 0.4, DARK), 0, 40); put(ball(2.2, '#4a7a8a', 0, 0, 0, { roughness: 0.4 }), 0, 40, 0, 4.4); put(cyl(0.3, 2.4, DARK), 0, 40);
  put(F.desk(), -40, 40, PI);

  H.room('stackstair', 'The Library Stair', [-220, -112, 12, 12, 12, -12], { ...deep, label: false, book: 2 });
  put = H.room('lower', 'The Lower Levels', [-150, -118, 80, 56, 14, -24], { ...deep, floor: '#4f463c', wall: '#544a40', book: 2, notes: [
    [2, 'Beneath the library the catalogue runs out. Shelves sag with books in dead languages, the lamps are few, and the air smells of dust and something older.'],
  ] });
  for (let r = 0; r < 4; r++) for (const x of [-22, 6]) { if (r === 2) continue; put(F.stack(24, 11), x, -20 + r * 11); }
  each(4, (i) => put(F.torch(), -30 + i * 20, 27.6, PI)); put(F.table(8, 4), 28, 16); put(F.candles(), 28, 16, 0, 3); each(7, (i) => put(b(1.6, 0.5, 1.2, ['#3a2a22', '#2a3a3a', '#4a3a22'][i % 3]), 20 + (i % 3) * 2.2, -18 + i * 1.7, i));
  put = H.room('irondoor', 'The Iron Door', [-54, -118, 32, 28, 13, -32], { ...deep, floor: '#45454a', wall: '#4a4a50', glow: 0.6, book: 2, notes: [
    [2, 'A forgotten passage, sloping down and down, ends here: a door of solid iron, bolted and sealed. The scratches in the metal are on this side. Whatever is behind it has been left alone for a very long time.'],
  ] });
  put(F.ironDoor(), 15.4, 0, -N); put(F.torch(), 0, -13.6); put(F.bone(), 6, 8, 1).rotation.z = N; put(F.bone(), -4, -6, 2).rotation.z = N;

  // --- Celaena's suite
  put = H.room('foyer', 'Celaena’s Rooms: the Foyer', [58, 96, 28, 24, 14], { ...soft, notes: [
    [1, 'Her suite in the stone castle: bedchamber, bathing room, dining room and a gaming room, far finer than a prisoner had any right to expect. Guards stand outside the door.'],
  ] });
  put(F.rug(14, 10, '#7a1f2b'), 0, 0); put(F.round(1.8), -9, 8); put(F.vase(), -9, 8, 0, 3); put(F.painting(6, 4), -6, 11.85, PI, 6.5); put(F.chairBig(), 8, 13, PI); put(F.plant(), -11, -9);

  put = H.room('dining', 'The Dining Room', [92, 96, 32, 24, 14], { ...soft, notes: [
    [1, 'Where she breakfasts, often with Chaol scowling across the table, and later with Nehemia.'],
  ] });
  put(F.dining(3, 12), 2, 0); put(F.rug(18, 12, '#5a2a2a'), 2, 0); put(F.candles(), 2, 0, 0, 3); put(F.window(4, 8), 15.85, 0, -N, 4); put(F.painting(6, 4), 2, -11.85, 0, 6.5); put(F.shelf(7, 6, 12), 4, 11.2, PI); put(F.plant(), 13, 9);

  put = H.room('gaming', 'The Gaming Room', [61, 64, 34, 32, 14], { ...soft, notes: [
    [1, 'A billiards table she is determined to master, and a pianoforte she can hardly bear to touch, and then cannot stop playing.'],
  ] });
  put(F.billiards(), -6, -7); put(F.piano(), 8, -12); put(F.hearth(7), -16.2, 6, N); put(F.couch(), -7, 9, PI); put(F.rug(14, 9), -7, 5);
  put(F.shelf(8, 9, 4), 11, 15.2, PI); put(F.chandelier(), 0, 0, 0, 6); put(F.painting(6, 4, '#c9a86a', '#6a3a2a'), -4, -15.85, 0, 7); put(F.plant(), 14, -13); put(F.round(1.6), -13, -12); put(F.vase('#7a1f2b', '#f4f1e8'), -13, -12, 0, 3);

  put = H.room('bedroom', 'Celaena’s Bedchamber', [100, 64, 36, 32, 14], { ...soft, notes: [
    [1, 'A bed big enough to be lost in, a balcony, and a wall of tapestries.'],
    [1, 'Behind one tapestry, a hidden door opens on to a stair that winds down into the dark. Walk through it.'],
  ] });
  put(F.bed('#7a1f2b', true), -2, -9); put(F.rug(16, 12, '#2f4a5a'), -2, 5); put(F.wardrobe(7), -13, 14.8, PI);
  put(F.tapestry(9, 11), 17.8, -9, -N, 1.5); put(F.tapestry(7, 11, '#5a4a6a'), 17.8, 10, -N, 1.5);
  put(F.table(3, 3), 6, -13); put(F.candles(), 6, -13, 0, 3); put(F.window(5, 8), 10, -15.8, 0, 4);
  put(F.round(1.8), 6, 12); put(F.vase(), 6, 12, 0, 3); put(F.chair(), 6, 8.6); put(F.painting(5, 3.6), 2, 15.85, PI, 7); put(F.plant(), 15, 14);

  put = H.room('bath', 'The Bathing Chamber', [104, 30, 28, 28, 14], { floor: '#cfd6d6', wall: '#dfe6e4', floorKind: 'tiles', notes: [[1, 'Hot water, and as much of it as she likes. After Endovier, that is no small thing. Her dressing room opens off it.']] });
  put(F.tub(), -2, -6); put(F.gowns(8), -13.4, 4, N); put(F.wardrobe(6), 12.8, -2, -N); put(F.candles(), 8, -11); put(F.plant(), -11, -11);

  // --- the secret passages
  H.room('stair1', 'The Hidden Stair', [148, 64, 10, 10, 12, -12], { ...deep, label: false, glow: 0.6, notes: [[1, 'Cold stone steps behind the tapestry, older than the glass above by centuries.']] });
  put = H.room('cross', 'The Three Archways', [148, 105, 28, 24, 13, -24], { ...deep, glow: 0.7, notes: [
    [1, 'At the foot of the hidden stair the passage splits into three arches. One runs down to the sewers and out of the castle. One leads to a tomb. One climbs back up into the walls.'],
    [2, 'Beside the arch to the tomb hangs a bronze skull door-knocker named Mort. He has opinions, and he will share them.'],
  ] });
  put(F.torch(), -8, -11.6); put(F.torch(), 8, -11.6); put(F.bone(), 9, 6, 1).rotation.z = N;
  put(F.mort(), 13.8, -5.2, -N, 5.6); put(F.torch(), 13.6, 5.6, -N);
  if (can(2)) H.pois.push({ id: 'mort', name: 'Mort', kind: 'feature', notes: [[2, 'The bronze skull door-knocker beside the tomb arch. He has opinions, and he will share them.']], pos: V(161.4, -14.6, 99.8), focus: V(158, -19, 99.8), size: 14 });

  put = H.room('tomb', 'The Tomb', [196, 105, 44, 36, 18, -30], { floor: '#6a6d74', wall: '#70737a', floorKind: 'flags', wallKind: 'stone', ceil: '#3a4660', light: '#bcd6ff', notes: [
    [1, 'Far beneath her rooms: the resting place of Gavin and Elena, first King and Queen of Adarlan. Stars are set into the ceiling, and a shaft lets moonlight fall on the marble.'],
    [1, 'Damaris, Gavin’s sword, is displayed here.'],
  ] });
  put(F.sarcophagus(), 2, -8, N); put(F.sarcophagus('#d9dbe0'), 2, 8, N);
  put(b(2, 3, 5, '#7a7d84'), 19, 0); put(b(0.12, 5.5, 0.3, '#dfe4ea', 0, 0, 0, { metalness: 0.95, roughness: 0.2 }), 19, 0, 0, 3).rotation.x = 0.5;
  put(cyl(3, 0.3, glow('#cfe2ff', 1.2)), 2, 0, 0, 0.05); each(14, (i) => put(ball(0.3, glow('#e8f0ff', 2)), -18 + ((i * 37) % 36), -15 + ((i * 53) % 30), 0, 17.8));
  put(cyl(0.7, 0.4, M('#b08d57', { metalness: 0.8, roughness: 0.4 })), -21.6, 4.6, 0, 5).rotation.z = N;
  for (const sx of [-1, 1]) put(F.pillar(18, 1.1, '#8a8d94'), 12, sx * 15);

  put = H.room('sewer', 'The Way Out', [148, 165, 22, 48, 11, -32], { ...deep, glow: 0.55, light: '#9fc8d8', notes: [
    [1, 'The middle arch. It smells of the river long before you reach it: a sewer tunnel running out under the castle walls to the Avery. An iron grate, a channel of black water, and beyond it, Rifthold. Celaena found it in her first weeks, and stayed anyway.'],
  ] });
  put(F.pool(8, 44, '#3f6a78'), 5, 0, 0, 0.05); put(F.bars(20, 10), 0, 22.6); put(b(20, 10, 0.3, glow('#8fb7d1', 0.9)), 0, 23.7); put(F.pool(20, 0.6, '#8fb7d1'), 0, 23, 0, 0.1); put(F.torch(), -10.6, -10, N);

  put = H.room('spy', 'The Grating', [112, 105, 12, 12, 10, -16], { ...deep, glow: 0.5, notes: [
    [1, 'The third arch climbs to a dead end and a bronze grating set high in a wall, with a view down into a hall of the castle. Someone built these passages to watch as well as to escape.'],
  ] });
  put(b(0.3, 3.4, 5, glow('#ffd58a', 1.2)), -5.8, 0, 0, 4); put(F.bars(5, 3.4), -5.5, 0, N, 4);

  // --- below ground
  put = H.room('dungeon', 'The Dungeons', [-206, 84, 68, 40, 11, -18], { ...deep, notes: [[1, 'Cold cells under the castle, for those the king wants kept and forgotten.']] });
  each(7, (i) => put(F.cell(8, 9), -27 + i * 9, -15)); each(5, (i) => put(F.cell(8, 9), -27 + i * 9, 15, PI)); each(3, (i) => put(F.torch(), 33.6, -12 + i * 12, -N));
  put = H.room('healers', 'The Healers’ Catacombs', [-206, 129, 48, 42, 11, -18], { ...deep, floor: '#6a6458', wall: '#7a7468', light: '#ffd9a8', book: 3, notes: [
    [3, 'The castle’s healers keep their workrooms down here, among shelves of tonics, salves and dried herbs.'],
  ] });
  put(F.counter(14), -8, -19.6); put(F.table(12, 5), 0, 0); put(F.candles(), 0, 0, 0, 3); each(2, (i) => put(F.cot('#e4e2dc'), 14 + i * 6, 12)); put(F.shelf(10, 9, 91), -23.2, 6, N); put(F.shelf(10, 9, 92), 10, 20.2, PI); each(4, (i) => put(F.plant(), -18 + i * 5, 17).scale.setScalar(0.5));

  for (const [a, c, o] of [['courtyard', 'hall', { w: 9 }], ['courtyard', 'gardens'], ['courtyard', 'kennels'], ['hall', 'throne', { w: 9 }], ['hall', 'training'], ['hall', 'foyer'], ['throne', 'gallery', { at: 20 }], ['throne', 'council'], ['throne', 'ballroom'],
    ['council', 'dorian'], ['dorian', 'chaol'], ['council', 'nehemia'], ['ballroom', 'library', { w: 8 }], ['library', 'training', { w: 8 }], ['library', 'stackstair'], ['stackstair', 'lower'], ['lower', 'irondoor', { w: 5, h: 8.6 }],
    ['foyer', 'gaming'], ['foyer', 'dining'], ['gaming', 'bedroom'], ['bedroom', 'bath'], ['bedroom', 'stair1', { w: 5, h: 8.8, color: '#4a4a4e', frame: '#33231a' }], ['stair1', 'cross', { w: 5, h: 9 }], ['cross', 'tomb', { w: 5, h: 9 }], ['cross', 'sewer', { w: 5, h: 9 }], ['cross', 'spy', { w: 4.6, h: 8.6 }],
    ['training', 'dungeon'], ['dungeon', 'healers']]) H.link(a, c, o);

  // what you see over the walls from the courtyard and gardens
  const st = M('#b3ac9c'), far = new THREE.MeshStandardMaterial({ color: '#bfe6ee', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85, emissive: '#4fa6bc', emissiveIntensity: 0.25 });
  const face = new THREE.MeshStandardMaterial({ map: surface('stone', '#b3ac9c', 14, 4), roughness: 0.9 });
  const bd = H.backdrop; bd.add(b(250, 58, 10, face, 0, 12.2, 104), b(40, 46, 30, st, -150, 12, 96), b(40, 46, 30, st, 150, 12, 96));
  for (let i = 0; i < 15; i++) { if (i === 7) continue; for (const y of [22, 38, 54]) bd.add(b(3.4, 8, 0.6, glow('#ffe2a8', 0.9), -112 + i * 16, y, 109.2), b(4.6, 0.8, 1.2, '#8c877c', -112 + i * 16, y - 0.8, 109.4)); }
  for (let i = 0; i < 31; i++) bd.add(b(4, 3.4, 3, '#a8a294', -120 + i * 8, 70.2, 107));
  bd.add(b(30, 26, 3, '#8c877c', 0, 12.2, 109.6), b(12, 14, 0.8, glow('#cfeaf2', 0.9), 0, 20, 111.2));
  for (const [x, z, h, r] of [[-110, 96, 100, 12], [110, 96, 120, 12], [-45, 100, 82, 9], [45, 100, 82, 9]]) { bd.add(cyl(r, h, '#a8a294', x, 0, z)); const c = mesh(new THREE.ConeGeometry(r * 1.2, h * 0.3, 10), M('#46525d')); c.position.set(x, h * 1.15, z); bd.add(c); }
  bd.add(b(190, 80, 60, far, 0, 70, 50));
  for (const [x, z, h, r] of [[-60, 40, 260, 15], [56, 44, 320, 17], [0, 20, 430, 21], [-96, 60, 210, 12], [98, 56, 250, 13], [-28, 70, 290, 12], [30, 76, 230, 11]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, h, 6), far); t.position.set(x, 70 + h / 2, z); const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, h * 0.2, 6), far); s.position.set(x, 70 + h * 1.1, z); bd.add(t, s);
  }
  return H.done();
}

// ---- Celaena's apartment -----------------------------------------------------------------------------------------
function apartment(can) {
  const H = new House(can), soft = { floor: '#8a6444', wall: '#e6dcc8' };
  let put = H.room('warehouse', 'The Warehouse Below', [0, 62, 80, 54, 12, 0], { floor: '#6a5d4e', wall: '#6b5644', floorKind: 'flags', wallKind: 'plain', ceil: '#6b5644', light: '#ffcf8a', notes: [[2, 'Dusty crates and an unremarkable staircase. Nobody looking at it would guess what is upstairs.']] });
  each(8, (i) => put(F.crates(i + 2), 4 + (i % 4) * 9, i < 4 ? -14 : 14)); put(F.barrel(), -30, 20); put(F.barrel(), -33, 16); put(F.door(), -20, 26.8, PI);

  put = H.room('great', 'The Great Room', [0, -10, 46, 34, 13, 14], { ...soft, notes: [
    [2, 'The whole upper floor of a warehouse, hidden behind a plain door: kitchen, dining table, and a couch drawn up to the fire.'],
    [0, 'She paid for every stick of furniture herself. For a little while, she and Sam made a home of it.'],
  ] });
  put(F.hearth(8), -22.2, -2, N); put(F.couch('#6a2a3a'), -12, -2, -N); put(F.rug(14, 12, '#2a4a5a'), -13, -2);
  put(F.dining(3, 10), 6, 4); put(F.candles(), 6, 4, 0, 3); put(F.counter(12), 12, -15.2);
  put(F.shelf(9, 10, 21), -12, -16.2); put(F.shelf(9, 10, 22), -2, -16.2);
  put(F.window(5, 7), 8, 16.85, PI, 3); put(F.painting(6, 4, '#c9a86a', '#7a3a2a'), -22.85, -11, N, 6); put(F.plant(), 20, 13); put(F.vase(), 6, 4, 0, 3);

  put = H.room('bedroom', 'The Bedroom', [43, -12, 32, 30, 13, 14], { ...soft, floor: '#7a5238', wall: '#5a3a4a', wallKind: 'paper', notes: [[2, 'An enormous bed, good sheets, and no one to answer to.']] });
  put(F.bed('#3a2a5a', true), 2, -8); put(F.rug(16, 10, '#7a1f2b'), 2, 4); put(F.table(3, 3), -7, -12); put(F.candles(), -7, -12, 0, 3); put(F.window(5, 7, '#3a2a5a'), 9, -14.85, 0, 3);
  put(F.shelf(8, 9, 61), -15.2, 8, N); put(F.chairBig(), -10, 14, PI);

  put = H.room('closet', 'The Dressing Room', [43, 18, 32, 22, 13, 14], { ...soft, notes: [[2, 'Gowns, tunics, boots and slippers by the dozen. Her one great weakness after books, music and chocolate.']] });
  put(F.gowns(8), -4, 10.2, PI); put(F.gowns(6), -15.2, 0, N); put(F.wardrobe(7), 15, 0, -N); put(b(3, 6, 0.3, '#cfe4ea', 0, 0, 0, { metalness: 0.9, roughness: 0.1 }), 8, 10.7, PI, 1);
  each(5, (i) => put(b(0.9, 0.7, 1.6, ['#111118', '#7a1f2b', '#c9a440', '#5a3d28'][i % 4]), -8 + i * 2, 6));

  put = H.room('bath', 'The Bathing Room', [75, -12, 24, 20, 13, 14], { floor: '#d2d8d8', wall: '#dfe6e4', floorKind: 'tiles', notes: [[2, 'A deep tub, and peace.']] });
  put(F.tub(), 2, -4); put(F.candles(), 8, 6); put(F.plant(), -9, 7); put(F.window(4, 6), 11.85, 2, -N, 4);
  H.link('warehouse', 'great', { at: -16, w: 6, color: '#5a4636' }); H.link('great', 'bedroom'); H.link('bedroom', 'closet'); H.link('bedroom', 'bath');
  return H.done();
}

// ---- The Assassins' Keep -----------------------------------------------------------------------------------------
function keep(can) {
  const H = new House(can), fine = { floor: '#e2ddd2', wall: '#d6cfc0', floorKind: 'tiles' };
  let put = H.room('entry', 'The Entrance Hall', [0, 0, 40, 44, 22], { ...fine, notes: [
    [0, 'Marble floors, a sweeping staircase and a chandelier: the house of a very rich man, which is exactly what Arobynn Hamel wants visitors to see.'],
  ] });
  put(F.stairs(12, 10, 1, 1.5, '#efeadf'), 0, -21, 0, 10); put(F.rug(8, 26, '#7a1616'), 0, 6); put(F.chandelier(), 0, 4, 0, 12); put(F.door(), 0, 21.7, PI);
  for (const sx of [-1, 1]) { put(F.pillar(20, 1.2, '#efeadf'), sx * 12, 12); put(F.pillar(20, 1.2, '#efeadf'), sx * 12, -4); put(F.vase('#254a5a', '#f4f1e8'), sx * 16, 19); }

  put = H.room('study', 'Arobynn’s Study', [-42, -8, 36, 28, 15], { floor: '#5a3a28', wall: '#6e2a2a', wallKind: 'paper', notes: [
    [0, 'A vast desk, red carpets and a fire. Contracts are handed out here, and so are punishments.'],
    [1, 'The King of the Assassins found Celaena half-drowned on a riverbank when she was eight, and made her what she is.'],
  ] });
  put(F.desk(), -2, -4); put(F.rug(22, 16, '#7a1616'), -2, 2); put(F.hearth(8), -17.2, 2, N); put(F.shelf(10, 11, 31), 8, -13.2); put(F.shelf(10, 11, 32), -6, -13.2);
  put(F.chair(), -5, 5, PI); put(F.chair(), 1, 5, PI); put(F.painting(6, 4.4, '#2a2a33', '#5c1820'), 17.85, -9, -N, 6); put(F.plant(), -15, 11);

  put = H.room('dining', 'The Dining Room', [-42, 26, 36, 32, 15], { floor: '#6b4a34', wall: '#cfc6b2', notes: [[0, 'One long table. Arobynn at its head, his assassins ranged down either side, and Celaena at his right hand.']] });
  put(F.dining(5, 22), -2, 2); put(F.chandelier(), -2, 2, 0, 6); put(F.rug(28, 12, '#2a3a4a'), -2, 2); for (const x of [-8, 0, 6]) put(F.candles(), x, 2, 0, 3); put(F.painting(7, 4.4), 17.85, 0, -N, 6.5);

  put = H.room('room', 'Celaena’s Bedroom', [41, -8, 34, 28, 15], { floor: '#7b5a3c', wall: '#e2d6c2', notes: [
    [0, 'Her room for most of her life: fine clothes, shelves of books, and a window on to the roofs of Rifthold.'],
  ] });
  put(F.bed('#7a1f2b', true), 6, 4); put(F.wardrobe(7), 16, -6, -N); put(F.round(1.6), -8, 10); put(F.vase(), -8, 10, 0, 3); put(F.shelf(9, 10, 41), -10, -13.2); put(F.rug(14, 9, '#2f4a5a'), -2, 2); put(F.gowns(6), 4, 13.4, PI); put(F.window(5, 8), 16.85, 6, -N, 4);

  put = H.room('sam', 'Sam’s Room', [41, -42, 34, 30, 15], { floor: '#7b5a3c', wall: '#cfc6b2', book: 0, notes: [[0, 'Sam Cortland’s room, down the hall from hers. Her rival for as long as either can remember, and then something else.']] });
  put(F.bed('#2c3a2c'), -8, -6); put(F.rack(), 8, -14.5); put(F.table(7, 4), 10, 4); put(F.chair(), 10, 7.4, PI); put(F.wardrobe(6), -16, 6, N); put(F.rug(12, 8, '#3a3a2a'), 0, 2); put(F.window(4, 8), 16.85, -6, -N, 4);

  put = H.room('training', 'The Training Rooms', [41, 28, 34, 36, 15], { floor: '#b59a6e', wall: '#a39c8e', wallKind: 'stone', notes: [[0, 'Where she and Sam grew up trying to outdo each other.']] });
  put(b(22, 0.3, 22, '#c7ae80'), 2, 2); put(F.rack(), -4, 17.5, PI); put(F.rack(), 8, 17.5, PI); each(3, (i) => put(F.dummy(), 13, -10 + i * 9));

  put = H.room('cells', 'The Dungeons', [-30, 81, 60, 22, 10, -14], { floor: '#5a5a5c', wall: '#5e5e62', floorKind: 'flags', wallKind: 'stone', ceil: '#4c4c50', light: '#ff9a4a', notes: [[0, 'Beneath the fine carpets. Arobynn’s house has cellars the guests never see.']] });
  each(6, (i) => { if (i !== 1) put(F.cell(8, 8), -24 + i * 9.5, 6, PI); }); each(3, (i) => put(F.torch(), 29.6, -6 + i * 6, -N));
  for (const [a, c, o] of [['entry', 'study'], ['study', 'dining'], ['entry', 'room'], ['entry', 'training', { at: 16 }], ['room', 'sam'], ['dining', 'cells', { w: 5, color: '#4a4a4e' }]]) H.link(a, c, o);
  return H.done();
}

// ---- The Omega and the Northern Fang -----------------------------------------------------------------------------
function omega(can) {
  const H = new House(can, { floor: '#3e3e44', wall: '#4a4a50', floorKind: 'flags', wallKind: 'stone', ceil: '#3a3a40', light: '#ffbe84', dark: true, book: 3 });
  let put = H.room('gate', 'The Lower Halls', [0, 59, 40, 30, 14], { notes: [[3, 'The Omega is hollow: halls and stairs cut through the mountain, cold as the rock they are made of.']] });
  each(4, (i) => put(F.torch(), -15 + i * 10, 14.6, PI)); put(F.crates(7), -10, 4); put(F.barrel(), 14, 8); put(F.barrel(), 16, 4);

  put = H.room('mess', 'The Mess Hall', [0, 10, 70, 60, 18], { notes: [[3, 'Where the covens eat, clan by clan: Blackbeaks, Yellowlegs and Bluebloods, each watching the other two.']] });
  for (const x of [-22, 0, 22]) for (const z of [-16, 2, 20]) put(F.mess(18), x, z, 0); put(F.forge(), 0, -27, 0).scale.setScalar(0.8);
  each(6, (i) => put(F.torch(), i < 3 ? -34.6 : 34.6, -18 + (i % 3) * 18, i < 3 ? N : -N));

  put = H.room('barracks', 'The Thirteen’s Quarters', [-62, 10, 46, 40, 13], { notes: [[3, 'Manon Blackbeak’s coven: twelve witches who would follow their Wing Leader off any cliff, and have.']] });
  each(6, (i) => put(F.bunk('#3a3238'), -18 + i * 6.4, -14)); each(6, (i) => put(F.bunk('#3a3238'), -18 + i * 6.4, 14, PI)); put(F.rack(), -22.5, 0, N); put(F.torch(), 0, -19.6);

  put = H.room('manon', 'Manon’s Room', [-62, -28, 30, 28, 12], { notes: [[3, 'A cot, a table and a window on the Gap. The heir of the Blackbeak Clan has never needed more.']] });
  put(F.cot('#7a1616'), -8, -6); put(F.table(6, 3.4, '#4a3a2c'), 6, -8); put(F.chair('#4a3a2c', '#3a3238'), 6, -4.6, PI); put(b(5, 7, 0.3, glow('#8fa6b8', 0.8)), -14.8, 2, N, 3); put(F.rack(), 8, 13.5, PI); put(F.torch(), 14.6, 0, -N);

  put = H.room('sparring', 'The Sparring Hall', [64, 10, 50, 50, 16], { notes: [[3, 'Three clans under one roof, and every one of them armed. The sparring here is rarely friendly.']] });
  put(F.ring(14), 0, 0); each(4, (i) => put(F.rack(), -18 + i * 12, 24.5, PI)); each(3, (i) => put(F.dummy(), 20, -18 + i * 7)); each(4, (i) => put(F.torch(), -18 + i * 12, -24.6));

  put = H.room('forge', 'The Forges', [64, -39, 50, 40, 16], { light: '#ff7a3a', notes: [[3, 'Fires that never go out. An army in the air needs saddles, harness and a great deal of iron.']] });
  put(F.forge(), -12, -16); put(F.forge(), 12, -16); each(3, (i) => put(F.anvil(), -14 + i * 14, -4)); put(F.rack(), 24.5, 6, -N); put(F.barrel(), -20, 14); put(F.barrel(), -16, 16); put(F.crates(9), 12, 12);

  put = H.room('council', 'The Matrons’ Hall', [0, -44, 46, 40, 20], { notes: [[3, 'Where the High Witches of the three clans hold court, and where their heirs are summoned to answer to them.']] });
  each(3, (i) => { put(b(8, 1 + (i === 1 ? 0.8 : 0), 7, '#2e2e33'), -14 + i * 14, -13); put(F.chairBig(), -14 + i * 14, -9.5, 0, 1 + (i === 1 ? 0.8 : 0)); });
  for (const sx of [-1, 1]) { put(F.banner('#17130f', 12), sx * 22.7, -4, -sx * N, 5); put(F.torch(), sx * 22.6, 10, -sx * N); put(F.pillar(20, 1.3, '#55555c'), sx * 14, 8); }

  put = H.room('aerie', 'The Aerie', [0, -126, 80, 60, 9, 16], { floor: '#4a4a50', wall: '#3a3a40', sky: true, notes: [
    [3, 'A cavern mouth open to the sky, high on the Omega’s face. Riders mount here, and the wyverns drop off the edge into the wind over the Gap.'],
  ] });
  each(5, (i) => put(F.post(), -30 + i * 15, -22)); each(7, (i) => put(F.bone(), -30 + ((i * 29) % 60), -10 + ((i * 17) % 30), i).rotation.z = N); put(F.rack(), 39.5, 10, -N); each(3, (i) => put(F.barrel(), -34, 8 + i * 5));

  put = H.room('bridge', 'The Bridge', [123, 10, 60, 12, 5], { floor: '#55555c', wall: '#3a3a40', sky: true, notes: [[3, 'A span of bare stone between the Omega and the Northern Fang, with a very long drop on either side.']] });

  put = H.room('pens', 'The Pens', [190, 10, 66, 60, 20], { notes: [[3, 'The facing peak, where the wyverns are stabled, fed and trained. The smell reaches you before the noise does.']] });
  each(4, (i) => { put(F.bars(13, 14), -24 + i * 16, -16); put(F.bars(13, 14), -24 + i * 16, 18); put(b(13, 0.2, 12, '#6a5d3c'), -24 + i * 16, -23); put(b(13, 0.2, 12, '#6a5d3c'), -24 + i * 16, 24); });
  each(6, (i) => put(F.bone(), -26 + i * 10, (i % 2 ? 22 : -22), i).rotation.z = N); put(F.cart(), 24, 0); put(F.barrel(), -28, 2); put(F.torch(), 32.6, 6, -N);

  put = H.room('pit', 'The Pit', [190, -66, 66, 60, 26, -8], { light: '#ff8a3a', notes: [[3, 'Deep in the Fang, a pit of sand ringed with stone, where riders and wyverns are matched to one another. Not every pairing is the one the Matrons intended.']] });
  put(cyl(22, 0.3, '#8a7a5a'), 0, 0); each(16, (i) => put(F.post(), Math.cos(i * 0.3927) * 24, Math.sin(i * 0.3927) * 24)); each(5, (i) => put(F.bone(), -8 + i * 4, 6 - i * 3, i * 2).rotation.z = N);
  for (const [a, c, o] of [['gate', 'mess', { w: 8 }], ['mess', 'barracks'], ['barracks', 'manon'], ['mess', 'sparring'], ['sparring', 'forge'], ['mess', 'council', { w: 7 }], ['council', 'aerie', { w: 7, h: 9 }], ['sparring', 'bridge', { h: 5 }], ['bridge', 'pens', { h: 5 }], ['pens', 'pit', { w: 8 }]]) H.link(a, c, o);
  return H.done();
}

// ---- Mistward ----------------------------------------------------------------------------------------------------
function mistward(can) {
  const H = new House(can, { floor: '#7a7468', wall: '#8f918c', floorKind: 'flags', wallKind: 'stone', ceil: '#8a8478', book: 3 });
  let put = H.room('yard', 'The Courtyard', [0, 60, 80, 50, 11], { floor: '#6f7a5c', floorKind: 'plain', sky: true, notes: [[3, 'Inside the ring wall: packed earth, a well, and sentries drilling in the mist.']] });
  put(cyl(3, 2.6, '#8f918c'), -20, 4); put(F.pool(4, 4, '#3f6a78'), -20, 4, 0, 2.4).scale.set(4, 0.2, 4); each(3, (i) => put(F.dummy(), 14 + i * 7, 12)); put(F.rack(), 20, -24.5); put(F.crates(5), -28, -16); put(F.tree(1.1), -30, 18);

  put = H.room('hall', 'The Dining Hall', [0, 3, 60, 56, 18], { floor: '#6b5a48', floorKind: 'planks', notes: [[3, 'Long tables for the demi-Fae who garrison the fortress. Newcomers are stared at.']] });
  for (const x of [-16, 16]) for (const z of [-14, 4]) put(F.mess(22), x, z); put(F.hearth(12), 0, -27.2); each(2, (i) => put(F.chandelier(), -15 + i * 30, -4, 0, 8));

  put = H.room('kitchen', 'The Kitchens', [-56, 8, 44, 40, 13], { floor: '#6b5a48', light: '#ffc98a', notes: [
    [3, 'Emrys’s kingdom, shared with Malakai and young Luca. Celaena is put to work here: scrubbing pots, chopping vegetables, and listening to the old stories told by the fire at night.'],
  ] });
  put(F.hearth(12), -21.2, 0, N); put(F.counter(14), -4, -19.2); put(F.counter(10), 8, 19.2, PI); put(F.table(12, 5, '#6a4a33'), 0, 0); each(3, (i) => put(F.chair(), -4 + i * 4, 4, PI)); put(F.barrel(), 18, -15); put(F.barrel(), 14, -16); put(F.crates(6), -14, 14).scale.setScalar(0.6); put(F.candles(), 0, 0, 0, 3);

  put = H.room('baths', 'The Baths', [-56, -34, 44, 36, 12], { floor: '#8a8f8c', floorKind: 'tiles', light: '#cfe6ea', notes: [[3, 'Stone pools of hot water, the one comfort the fortress offers.']] });
  put(F.pool(22, 14, '#5fa8b8'), 0, -6, 0, 0.05); put(b(24, 0.8, 1, '#8f918c'), 0, 1.5); put(b(24, 0.8, 1, '#8f918c'), 0, -13.5); put(F.bench(10), 12, 14); each(3, (i) => put(F.candles(), -16 + i * 6, 14));

  put = H.room('room', 'Celaena’s Room', [44, 16, 20, 18, 11], { floor: '#6b5a48', floorKind: 'planks', glow: 0.7, notes: [[3, 'A narrow cot, a small window and no fire. Not much of a welcome.']] });
  put(F.cot('#5a544a'), 5, -3); put(F.table(3, 3), -4, -6); put(F.candles(), -4, -6, 0, 3); put(b(3, 4, 0.3, glow('#aebcc0', 0.8)), 9.8, 2, -N, 4); put(b(3, 2, 2, '#4a3a2c'), 4, 6.6);

  put = H.room('rowan', 'Rowan’s Rooms', [52, -22, 36, 28, 13], { floor: '#6b5a48', floorKind: 'planks', notes: [[3, 'A worktable, a hearth and a bed, and nothing that could be called decoration.']] });
  put(F.table(12, 5, '#4a3a2c'), 2, -2); put(F.chair('#4a3a2c', '#3a4a3a'), 2, 2, PI); put(F.hearth(9), 17.2, -2, -N); put(F.bed('#3a4a3a'), -8, -8); put(F.rack(), 6, 13.5, PI); put(F.rug(12, 8, '#3a4a3a'), 4, 4); put(b(3, 5, 0.3, glow('#aebcc0', 0.8)), 4, -13.8, 0, 4);

  put = H.room('walls', 'The Battlements', [79, 60, 30, 50, 6, 12], { sky: true, notes: [[3, 'From up here: forest, mist, the Cambrian Mountains, and the ring of ward-stones that has kept the fortress hidden for centuries.']] });
  each(5, (i) => put(b(3, 2.4, 2, '#8f918c'), 13.6, -20 + i * 10, 0, 6)); put(F.rack(), 0, -24.5); put(F.barrel(), -10, 20);
  for (const [a, c, o] of [['yard', 'hall', { w: 8 }], ['hall', 'kitchen'], ['kitchen', 'baths'], ['hall', 'room', { w: 5 }], ['hall', 'rowan', { at: -16 }], ['yard', 'walls', { w: 5, h: 6 }]]) H.link(a, c, o);
  return H.done();
}

// ---- Endovier ----------------------------------------------------------------------------------------------------
function mines(can) {
  const H = new House(can, { floor: '#bdb8ae', wall: '#d9d6cf', floorKind: 'flags', wallKind: 'stone', ceil: '#a9a69f', light: '#ffc98a' });
  let put = H.room('yard', 'The Yard', [0, 60, 70, 50, 11], { floor: '#8a8478', wall: '#5c4a3a', floorKind: 'plain', wallKind: 'plain', sky: true, notes: [
    [1, 'Inside the wall of Endovier: mud, salt dust and the whipping posts. Celaena Sardothien lasted a year here. Most last a month.'],
  ] });
  each(3, (i) => put(F.post(), -12 + i * 12, 6)); put(F.cart(), 20, -14); put(F.cart(), 26, -6, 0.6); each(4, (i) => put(F.salt(2.5 + i * 0.5), -26 + i * 4, -16 + (i % 2) * 4)); put(F.barrel(), -30, 18);

  put = H.room('barracks', 'The Slave Barracks', [-62, 60, 46, 44, 10], { floor: '#6a5d4e', wall: '#5c4a3a', floorKind: 'planks', wallKind: 'plain', ceil: '#5c4a3a', glow: 0.6, notes: [[1, 'Long unheated sheds, bunks packed wall to wall.']] });
  each(6, (i) => { put(F.bunk(), -18 + i * 6.4, -15); put(F.bunk(), -18 + i * 6.4, 15, PI); });

  put = H.room('hall', 'The Audience Hall', [60, 60, 42, 40, 16], { floor: '#6b5140', wall: '#a8a294', floorKind: 'planks', notes: [
    [1, 'The overseers’ building, and the one fine room in Endovier. A filthy, half-starved prisoner was brought here in chains to stand before the Crown Prince, and was offered a bargain.'],
  ] });
  put(b(14, 1.2, 9, '#8c877c'), 12, 0); put(F.chairBig(), 15, 4.2, -N, 1.2).position.x += 0; put(F.rug(6, 24, '#7a1616'), -4, 0, N); for (const sz of [-1, 1]) { put(F.banner('#9e1b1b', 9), 20.7, sz * 10, -N, 5); put(F.pillar(14, 1), 0, sz * 14); } put(F.chandelier(), 0, 0, 0, 7);

  put = H.room('upper', 'The Upper Tunnels', [0, -14, 30, 50, 12, -12], { dark: true, glow: 0.7, notes: [[1, 'Rock salt on every side, white where the lamps reach and grey where they do not. Picks ring all day.']] });
  each(4, (i) => put(F.salt(2 + (i % 2)), (i % 2 ? 10 : -10), -18 + i * 10)); put(F.cart(), 6, 4); each(3, (i) => put(F.torch(), -14.6, -16 + i * 16, N));

  put = H.room('gallery', 'The Salt Gallery', [0, -90, 80, 60, 20, -24], { dark: true, notes: [[1, 'A cavern hacked out by generations of slaves. The salt goes up in carts. The people who cut it mostly do not.']] });
  each(9, (i) => put(F.salt(2.5 + (i % 3) * 1.2), -32 + ((i * 23) % 64), -24 + ((i * 31) % 44))); each(4, (i) => put(F.pillar(20, 2, '#d9d6cf'), -24 + (i % 2) * 48, -14 + (i > 1 ? 28 : 0))); put(F.cart(), 10, 20); put(F.cart(), -20, 8, 1); each(4, (i) => put(F.torch(), -30 + i * 20, -29.6));

  put = H.room('deep', 'The Deep Workings', [-81, -90, 50, 36, 10, -32], { dark: true, glow: 0.45, floor: '#9a968c', notes: [[1, 'The lowest tunnels, where the air is bad and the overseers seldom bother to come down.']] });
  each(6, (i) => put(F.salt(2 + (i % 3)), -20 + i * 8, (i % 2 ? 12 : -12))); put(F.torch(), 0, -17.6); put(F.cart(), -10, 0);
  for (const [a, c, o] of [['yard', 'barracks'], ['yard', 'hall'], ['yard', 'upper', { w: 7, color: '#8a8780' }], ['upper', 'gallery', { w: 7, color: '#8a8780' }], ['gallery', 'deep', { w: 5, h: 8, color: '#8a8780' }]]) H.link(a, c, o);
  return H.done();
}

// ---- The Silent Assassins ------------------------------------------------------------------------------------------
function silent(can) {
  const H = new House(can, { floor: '#c9b086', wall: '#d8c29a', floorKind: 'flags', wallKind: 'stone', ceil: '#c9b086', book: 0 });
  let put = H.room('court', 'The Training Courtyard', [0, 50, 80, 50, 12], { sky: true, floor: '#d2b27c', floorKind: 'plain', notes: [[0, 'Open to the desert sun. The Master’s students drill here in pairs for hours, in near silence.']] });
  put(F.ring(12), -10, 0); each(4, (i) => put(F.dummy(), 22 + (i % 2) * 8, -12 + (i > 1 ? 16 : 0))); put(F.rack(), -20, -24.5); put(F.pool(30, 2, '#5fa8b8'), 0, 23, 0, 0.05); each(4, (i) => put(F.barrel(), -36, -10 + i * 4).scale.setScalar(0.6));

  put = H.room('hall', 'The Master’s Receiving Hall', [0, -6, 50, 54, 18], { notes: [[0, 'Pale stone, open arches and cushions on the floor. The Mute Master receives newcomers here, and decides in his own time whether to teach them.']] });
  put(b(14, 1, 10, '#c9b086'), 0, -20); each(3, (i) => put(F.cushion(['#f1efe8', '#9e3a2a', '#c9a440'][i]), -3 + i * 3, -20, 0, 1)); put(F.rug(10, 30, '#9e3a2a'), 0, 4);
  for (const sx of [-1, 1]) { each(3, (i) => put(F.pillar(16, 1.2, '#e2d0aa'), sx * 14, -14 + i * 14)); each(4, (i) => put(F.cushion(i % 2 ? '#254a5a' : '#b0683c'), sx * 20, -10 + i * 6)); }

  put = H.room('dining', 'The Dining Hall', [-54, 0, 50, 40, 14], { notes: [[0, 'Long tables, simple food, and conversation carried on almost entirely in gestures.']] });
  for (const z of [-10, 8]) put(F.mess(34), 0, z); each(3, (i) => put(F.vase('#b0683c', '#f4f1e8'), -16 + i * 16, 18));

  put = H.room('room', 'Celaena and Ansel’s Room', [44, -10, 30, 24, 12], { floor: '#b89468', floorKind: 'planks', notes: [[0, 'A small room shared with Ansel of Briarcliff: two cots, two trunks, and a window on to the dunes.']] });
  put(F.cot('#9e3a2a'), -8, -6); put(F.cot('#254a5a'), 6, -6); put(b(3.4, 2, 2, '#6a4a2e'), -8, 6); put(b(3.4, 2, 2, '#6a4a2e'), 6, 6); put(b(5, 5, 0.3, glow('#f2dca8', 1)), 14.8, 0, -N, 4); put(F.rug(10, 6, '#b0683c'), -1, 4);

  put = H.room('stables', 'The Stables', [66, 50, 44, 40, 12], { floor: '#b89468', floorKind: 'plain', notes: [[0, 'Home, briefly, to two Asterion mares that were not come by honestly.']] });
  each(4, (i) => put(F.stall(9, 12), -15 + i * 10, -13)); put(F.horse('#e9e2d0'), -15, -13); put(F.horse('#6a4a2e'), -5, -13); put(F.horse('#2a1c14'), 15, -13); put(F.barrel(), 16, 14); each(3, (i) => put(b(4, 2 + i, 3, '#c9b27a'), -12 + i * 5, 15));

  put = H.room('roof', 'The Parapets', [-79, 50, 30, 50, 6, 12], { sky: true, notes: [[0, 'Red dunes to the horizon. The nearest water is the oasis, a long, hot run away, and the students make that run with buckets.']] });
  each(5, (i) => put(b(2, 2.4, 3, '#d8c29a'), -13.6, -20 + i * 10, 0, 6)); put(F.cushion(), 4, 8); put(F.cushion('#254a5a'), 7, 5);
  for (const [a, c, o] of [['court', 'hall', { w: 9 }], ['hall', 'dining'], ['hall', 'room'], ['court', 'stables', { w: 8 }], ['court', 'roof', { w: 5, h: 6 }]]) H.link(a, c, o);
  return H.done();
}

// ---- The Vaults --------------------------------------------------------------------------------------------------
function vaults(can) {
  const H = new House(can, { floor: '#4a4038', wall: '#4f443a', floorKind: 'flags', wallKind: 'stone', ceil: '#3a322c', light: '#ffbe84', dark: true, book: 0 });
  let put = H.room('door', 'The Door on the Street', [0, 60, 20, 16, 11], { notes: [[0, 'An unmarked door in the slums, and a stair going down. If you have to ask what is at the bottom, you should not be here.']] });
  put(F.door(), 0, 7.7, PI); put(F.torch(), -9.6, 0, N);
  put = H.room('den', 'The Vaults', [0, -5, 80, 70, 16, -12], { notes: [
    [0, 'Rifthold’s underworld under one roof: fighting pits, a long bar, and alcoves where anything can be bought. Sam fought in the pits here for coin.'],
  ] });
  for (const x of [-18, 18]) { put(cyl(11, 0.3, '#8a7a5a'), x, -4); put(F.ring(11), x, -4); each(2, (i) => put(F.bench(14), x, -19 + i * 30)); }
  put(b(30, 3.4, 3, '#33231a'), -18, -31); each(8, (i) => put(cyl(0.3, 0.9, ['#254a5a', '#8a5a3c', '#3f5a2c'][i % 3]), -30 + i * 3.4, -31, 0, 3.4)); each(4, (i) => put(F.barrel(), 14 + i * 4, -32));
  each(4, (i) => put(F.round(1.8, '#33231a'), -34 + (i % 2) * 6, 10 + (i > 1 ? 12 : 0))); each(6, (i) => put(F.torch(), i < 3 ? -39.6 : 39.6, -22 + (i % 3) * 22, i < 3 ? N : -N));
  put = H.room('back', 'The Back Rooms', [62, -5, 36, 40, 12, -12], { floor: '#5a3a28', wall: '#5a2a2a', floorKind: 'planks', wallKind: 'paper', notes: [[0, 'Curtained alcoves for the business that even the Vaults prefers not to see.']] });
  put(F.round(2.2, '#33231a'), 0, 0); each(4, (i) => put(F.chair('#33231a', '#5c1820'), Math.cos(i * N) * 3.6, Math.sin(i * N) * 3.6, -i * N - N)); put(F.candles(), 0, 0, 0, 3); put(F.couch('#5c1820'), 0, -16, 0); put(F.rug(16, 14, '#5c1820'), 0, 0); put(F.shelf(8, 8, 55), 17.2, 8, -N);
  H.link('door', 'den', { w: 5, color: '#3a322c' }); H.link('den', 'back');
  return H.done();
}

// ---- The Royal Theatre -------------------------------------------------------------------------------------------
function theater(can) {
  const H = new House(can, { floor: '#7a1f2b', wall: '#e6dfcd', floorKind: 'plain', wallKind: 'panel', book: 2 });
  let put = H.room('foyer', 'The Foyer', [0, 50, 60, 30, 20], { floor: '#e2ddd2', floorKind: 'tiles', notes: [[2, 'Marble, gilt and candlelight. Half of Rifthold comes to be seen here; Celaena comes for the music.']] });
  each(2, (i) => put(F.chandelier(), -15 + i * 30, 0, 0, 10)); for (const sx of [-1, 1]) { put(F.pillar(20, 1.2, '#efeadf'), sx * 10, 6); put(F.vase('#c9a440', '#f4f1e8'), sx * 24, 10); put(F.couch('#7a1616'), sx * 22, -8, sx * -N); } put(F.rug(8, 26, '#7a1616'), 0, 0); put(F.door(), 0, 14.7, PI);

  put = H.room('hall', 'The Auditorium', [0, -9, 70, 80, 34], { wall: '#7a2a2a', wallKind: 'paper', ceil: '#c9a86a', notes: [
    [2, 'Red velvet and gold leaf, tier on tier of boxes, and the best orchestra on the continent.'],
    [0, 'Arobynn kept a box here, and brought her to it from childhood. Music was the one thing she never had to pretend about.'],
  ] });
  put(b(48, 4, 20, '#5a3d28'), 0, -30); for (const sx of [-1, 1]) { put(rb(6, 26, 3, '#7a1616', 0, 0, 0, 1), sx * 26, -21); each(3, (i) => { put(b(3, 6, 12, '#c9a440', 0, 0, 0, { roughness: 0.5 }), sx * 33.4, -8 + i * 16, 0, 14); put(b(2.4, 4, 10, '#7a1616'), sx * 33, -8 + i * 16, 0, 15); }); }
  put(rb(52, 5, 2, '#7a1616', 0, 0, 0, 0.8), 0, -21, 0, 26); put(F.seats(9, 16), 0, -12); put(F.piano(), -8, -32, 0.5, 4); each(3, (i) => put(F.chair(), 6 + i * 4, -32, 0, 4)); put(F.chandelier(), 0, 8, 0, 22).scale.setScalar(1.8);

  put = H.room('back', 'Backstage', [0, -73, 70, 40, 16], { floor: '#6b4d38', floorKind: 'planks', wall: '#6b5644', wallKind: 'plain', glow: 0.7, notes: [[2, 'Ropes, painted flats and racks of costumes: the other side of the magic.']] });
  put(F.gowns(10), -14, -19.4); put(F.gowns(8), 14, -19.4); put(F.crates(8), -22, 8); each(3, (i) => put(b(10, 12, 0.5, ['#4a6a5a', '#7fa6b8', '#c9a86a'][i]), -20 + i * 14, 2 + i * 3, 0.2)); put(b(3, 6, 0.3, '#cfe4ea', 0, 0, 0, { metalness: 0.9, roughness: 0.1 }), 20, -19.6, 0, 1); put(F.table(6, 3), 20, -17);
  H.link('foyer', 'hall', { w: 8 }); H.link('hall', 'back', { at: 30, w: 5 });
  return H.done();
}

// ---- Skull's Bay: Rolfe's tavern ---------------------------------------------------------------------------------
function tavern(can) {
  const H = new House(can, { floor: '#6b4d38', wall: '#7a6450', floorKind: 'planks', wallKind: 'plain', ceil: '#8a7458', light: '#ffc98a', book: 0 });
  let put = H.room('tap', 'The Taproom', [0, 20, 60, 44, 13], { notes: [[0, 'Low beams, spilled ale and every pirate in the Dead Islands. Nobody here is unarmed, and nobody is sober.']] });
  put(b(26, 3.4, 3, '#33231a'), -12, -19); each(7, (i) => put(cyl(0.3, 0.9, ['#254a5a', '#8a5a3c', '#3f5a2c'][i % 3]), -22 + i * 3.4, -19, 0, 3.4)); each(3, (i) => put(F.barrel(), 14 + i * 4, -19.5));
  each(6, (i) => { const x = -20 + (i % 3) * 16, z = (i > 2 ? 12 : -2); put(F.round(2, '#4a3a2c'), x, z); put(F.candles(), x, z, 0, 3).scale.setScalar(0.6); put(F.chair('#4a3a2c', '#5a4636'), x - 3.4, z, N); put(F.chair('#4a3a2c', '#5a4636'), x + 3.4, z, -N); });
  put(F.hearth(9), -29.2, 4, N); put(F.door(), 0, 21.7, PI);

  put = H.room('office', 'Rolfe’s Office', [0, -24, 40, 36, 13], { floor: '#5a3a28', wall: '#6b5140', notes: [
    [0, 'The Pirate Lord does business from behind this desk. The map of the world’s oceans is inked on his hands, and Celaena and Sam were sent here to bargain with him on Arobynn’s behalf.'],
  ] });
  put(F.desk(), 0, -6); put(F.rug(20, 14, '#1f3a5a'), 0, 0); put(F.chair(), -4, 4, PI); put(F.chair(), 4, 4, PI); put(F.shelf(9, 10, 81), -12, -17.2); put(F.painting(8, 5, '#3f6a78', '#254a5a'), 10, -17.85, 0, 6); put(F.hearth(7), 19.2, 0, -N); put(ball(1.6, '#4a7a8a', 0, 0, 0, { roughness: 0.4 }), -15, 12, 0, 4); put(cyl(0.3, 2.6, DARK), -15, 12);

  put = H.room('rooms', 'The Rooms Upstairs', [68, 20, 28, 30, 12, 12], { notes: [[0, 'Rooms for guests the Pirate Lord wants kept close, where he can watch them.']] });
  put(F.bed('#1f3a5a'), 6, -8); put(F.cot('#7a1f2b'), -8, 8, N); put(F.table(3, 3), -4, -12); put(F.candles(), -4, -12, 0, 3); put(b(5, 5, 0.3, glow('#bfe0ea', 0.9)), 13.8, 4, -N, 4); put(F.wardrobe(5), 4, 13.8, PI);
  H.link('tap', 'office'); H.link('tap', 'rooms', { w: 5, color: '#5a4636' });
  return H.done();
}

export const INTERIORS = { castle, apartment, keep, omega, mistward, mines, silent, vaults, theater, tavern };

// Procedural places: the tiny town models on the continent, and the full local scene you enter.
import * as THREE from 'three';
import { rng, fbm, ridged, clamp, mix, smoothstep } from './util.js';

const C = (hex) => new THREE.Color(hex);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const ROOF = (() => {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], T1 = [0, 1, -0.5], D = [-0.5, 0, 0.5], E = [0.5, 0, 0.5], T2 = [0, 1, 0.5];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([A, T1, B, D, E, T2, A, D, T2, A, T2, T1, B, T1, T2, B, T2, E].flat(), 3));
  g.computeVertexNormals();
  return g;
})();
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
const roofMat = (o = {}) => std('#ffffff', { side: THREE.DoubleSide, ...o });

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(BOX, mat);
  m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function tower(r, h, mat, capMat, x, z, y = 0, sides = 10, cap = 0.5) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, sides), mat);
  b.position.y = h / 2;
  const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.2, h * cap, sides), capMat);
  c.position.y = h + (h * cap) / 2;
  b.castShadow = c.castShadow = true;
  g.add(b, c); g.position.set(x, y, z);
  return g;
}
function gable(w, h, d, wallM, roofM, x, z, rh = 0.45) {
  const g = new THREE.Group();
  g.add(box(w, h, d, wallM));
  const r = new THREE.Mesh(ROOF, roofM);
  r.scale.set(w * 1.06, w * rh, d * 1.04); r.position.y = h; r.castShadow = true;
  g.add(r); g.position.set(x, 0, z);
  return g;
}
function curtain(w, d, h, mat, capMat, tr = 4.5) {
  const g = new THREE.Group();
  g.add(box(w, h, 2.5, mat, 0, 0, -d / 2), box(w, h, 2.5, mat, 0, 0, d / 2), box(2.5, h, d, mat, -w / 2, 0, 0), box(2.5, h, d, mat, w / 2, 0, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(tower(tr, h * 1.5, mat, capMat, (sx * w) / 2, (sz * d) / 2));
  return g;
}

// ---- landmarks ---------------------------------------------------------------------------------
const TONES = {
  default: ['#a9a295', '#4a5a63'], pale: ['#e9e6dc', '#6f8794'], dark: ['#3a383d', '#1d1c20'], sand: ['#d9c49a', '#b06a3c'],
};

const LANDMARKS = {
  // The old stone castle of Adarlan's kings, with the glass castle raised on top of it.
  glassCastle() {
    const g = new THREE.Group();
    const stone = std('#b3ac9c'), stone2 = std('#a29b8b'), slate = std('#46525d'), rf = roofMat({ color: '#46525d' });
    const glass = new THREE.MeshStandardMaterial({ color: '#b4e0ea', roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.8, envMapIntensity: 2.4, emissive: '#3f9fb8', emissiveIntensity: 0.22 });
    const edge = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 });
    const addGlass = (mesh) => { mesh.castShadow = true; g.add(mesh); const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), edge); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); g.add(e); };
    // outer ward
    g.add(curtain(196, 156, 15, stone2, slate, 8));
    for (const x of [-49, 49]) g.add(tower(6.5, 22, stone2, slate, x, -78), tower(6.5, 22, stone2, slate, x, 78));
    for (const z of [-26, 26]) g.add(tower(6.5, 22, stone2, slate, -98, z), tower(6.5, 22, stone2, slate, 98, z));
    g.add(box(26, 24, 12, stone, 0, 0, 78), box(10, 13, 13, std('#17130f'), 0, 0, 78.4));
    // the stone castle
    g.add(box(118, 40, 74, stone));
    g.add(gable(30, 34, 104, stone2, rf, -62, 0, 0.3), gable(30, 34, 104, stone2, rf, 62, 0, 0.3));
    g.add(gable(60, 26, 30, stone2, rf, 0, 50, 0.25));
    for (const [x, z, h, r] of [[-77, -52, 70, 9], [77, -52, 62, 9], [-77, 52, 58, 8], [77, 52, 84, 9.5], [-30, 66, 46, 6], [30, 66, 46, 6], [0, -40, 54, 8]]) g.add(tower(r, h, stone, slate, x, z, 0, 10, 0.32));
    for (let i = 0; i < 12; i++) { g.add(box(4, 3, 3, stone, -55 + i * 10, 40, 36)); g.add(box(4, 3, 3, stone, -55 + i * 10, 40, -36)); }
    // the glass castle
    const hall = new THREE.Mesh(new THREE.BoxGeometry(92, 52, 56), glass); hall.position.y = 66; addGlass(hall);
    const hall2 = new THREE.Mesh(new THREE.BoxGeometry(60, 40, 40), glass); hall2.position.y = 112; addGlass(hall2);
    const spires = [[-36, -20, 170, 9], [36, -18, 215, 10.5], [0, 8, 290, 13], [-42, 20, 150, 8], [42, 22, 185, 9], [-14, -26, 200, 8], [18, 26, 135, 7], [-58, 0, 112, 7], [58, -4, 124, 7], [-20, 6, 240, 8], [22, -4, 255, 8]];
    for (const [x, z, h, r] of spires) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, h, 6), glass); t.position.set(x, 40 + h / 2, z); addGlass(t);
      const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, h * 0.22, 6), glass); s.position.set(x, 40 + h + h * 0.11, z); addGlass(s);
    }
    const bridges = [[0, 5, 0.7], [1, 10, 0.62], [2, 9, 0.6], [2, 10, 0.72], [0, 3, 0.8], [4, 6, 0.75], [3, 7, 0.7], [4, 8, 0.6], [1, 4, 0.5], [5, 9, 0.85]];
    for (const [a, b, f] of bridges) {
      const [ax, az, ah] = spires[a], [bx, bz, bh] = spires[b], y = 40 + Math.min(ah, bh) * f;
      const m = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(bx - ax, bz - az), 2.2, 3), glass);
      m.position.set((ax + bx) / 2, y, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax); addGlass(m);
    }
    // the courtyard inside the gate, the gardens and the obsidian clock tower
    const flat = (w, d, color, x, z, y = 0.35) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(color)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; g.add(m); };
    flat(190, 150, '#7f8f6a', 0, 0, 0.25); flat(120, 36, '#9a9486', 0, 58); flat(16, 46, '#b3ad9e', 0, 58, 0.45);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 1.6, 16), stone); basin.position.set(0, 1, 56); g.add(basin);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 6, 8), stone); jet.position.set(0, 3.6, 56); g.add(jet);
    for (const x of [-52, -40, 40, 52]) { const t = new THREE.Mesh(new THREE.ConeGeometry(3, 10, 6), std('#2f5a36')); t.position.set(x, 5, 70); g.add(t); }
    flat(150, 40, '#57804a', 0, 102, 0.3); flat(6, 40, '#c9c0a8', 0, 102, 0.4); flat(150, 5, '#c9c0a8', 0, 102, 0.4);
    for (let i = 0; i < 14; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(3, 9, 6), std('#2f5a36')); t.position.set(-66 + i * 9.5 + (i > 9 ? 16 : 0), 4.5, 118); g.add(t); }
    for (const x of [-50, -22, 22]) g.add(box(20, 3, 2.4, std('#2f5a36'), x, 0, 92));
    const ct = LANDMARKS.clockTower().group; ct.scale.setScalar(1.35); ct.position.set(62, 0, 104); g.add(ct);
    return { group: g, top: 330 };
  },
  keep() {
    const g = new THREE.Group(), stone = std('#cfcabb'), rf = roofMat({ color: '#3c4148' }), dark = std('#3c4148');
    g.add(curtain(70, 56, 6, std('#a8a294'), dark, 3));
    g.add(gable(36, 17, 20, stone, rf, 0, 0, 0.3));
    g.add(gable(14, 13, 30, stone, rf, -16, 4, 0.4), gable(14, 13, 30, stone, rf, 16, 4, 0.4));
    g.add(tower(4.5, 26, stone, dark, -24, -8), tower(4.5, 26, stone, dark, 24, -8));
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(64, 50), std('#5d8450')); lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.2; g.add(lawn);
    return { group: g, top: 44 };
  },
  warehouse() {
    const g = new THREE.Group();
    g.add(gable(15, 6, 24, std('#6b5644'), roofMat({ color: '#3d3530' }), 0, 0, 0.01));
    const up = gable(15, 5, 24, std('#8a7460'), roofMat({ color: '#3d3530' }), 0, 0, 0.32); up.position.y = 6; g.add(up);
    const glow = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffb84a', emissiveIntensity: 1.6 });
    for (const z of [-7, 0, 7]) for (const sx of [-1, 1]) g.add(box(0.3, 2, 2.2, glow, sx * 7.6, 7.4, z));
    return { group: g, top: 26 };
  },
  theater() {
    const g = new THREE.Group(), stone = std('#e6dfcd'), gold = std('#c9a440', { metalness: 0.6, roughness: 0.35 });
    g.add(box(34, 13, 24, stone), box(38, 1.5, 28, stone, 0, 13, 0));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), gold); dome.position.y = 14.5; dome.castShadow = true; g.add(dome);
    for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 13, 8), stone); c.position.set(-15 + i * 5, 6.5, 13.5); c.castShadow = true; g.add(c); }
    return { group: g, top: 36 };
  },
  castle(lm) {
    const [wall, cap] = TONES[lm.tone || 'default'];
    const g = new THREE.Group(), stone = std(wall), capM = std(cap), rf = roofMat({ color: cap });
    g.add(curtain(84, 70, 10, stone, capM, 5));
    g.add(gable(34, 24, 26, stone, rf, 0, -4, 0.35));
    g.add(tower(6, 46, stone, capM, -18, -16), tower(5, 36, stone, capM, 19, -14), tower(7, 60, stone, capM, 4, 12, 0, 10, 0.4));
    g.add(gable(14, 10, 20, stone, rf, -26, 16), gable(14, 10, 20, stone, rf, 28, 14));
    return { group: g, top: 92 };
  },
  mistward() {
    const g = new THREE.Group(), stone = std('#8f918c'), capM = std('#4a5258'), rf = roofMat({ color: '#4a5258' });
    const R = 44, N = 28;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
      if (i === 7) continue; // gate, facing south
      const m = box((2 * Math.PI * R) / N + 0.6, 9, 2.6, stone, (Math.cos(a) + Math.cos(b)) * R / 2, 0, (Math.sin(a) + Math.sin(b)) * R / 2);
      m.rotation.y = -(a + b) / 2 + Math.PI / 2; g.add(m);
    }
    for (const a of [0.4, 1.95, 3.5, 5.0]) g.add(tower(5, 22, stone, capM, Math.cos(a) * R, Math.sin(a) * R));
    g.add(gable(28, 13, 18, stone, rf, 0, -12), gable(12, 7, 22, stone, rf, -22, 8), gable(14, 7, 12, stone, rf, 18, 14), tower(4.5, 30, stone, capM, 12, -18));
    const garden = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), std('#56803f')); garden.rotation.x = -Math.PI / 2; garden.position.set(-2, 0.2, 22); g.add(garden);
    return { group: g, top: 46, after(root, hAt, at) {
      const ward = std('#7d8a96', { emissive: '#7fd0e6', emissiveIntensity: 0.25 }), r2 = rng(5);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, x = at[0] + Math.cos(a) * 118, z = at[1] + Math.sin(a) * 118;
        const s = box(2.4, 8 + r2() * 4, 1.5, ward, x, hAt(x, z) - 0.5, z);
        s.rotation.set((r2() - 0.5) * 0.12, a, (r2() - 0.5) * 0.12); root.add(s);
      }
    } };
  },
  mine(lm, cfg) {
    const g = new THREE.Group(), wood = std('#5a4636'), pile = std(cfg.biome === 'dry' ? '#c9a777' : '#f1f1ec');
    return { group: g, top: 30, after(root, hAt, at) {
      const r2 = rng(cfg.seed);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3, x = at[0] + Math.cos(a) * 62, z = at[1] + Math.sin(a) * 62, y = hAt(x, z);
        const t = new THREE.Group();
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.add(box(0.5, 12, 0.5, wood, sx * 1.6, 0, sz * 1.6));
        t.add(box(5, 0.5, 5, wood, 0, 9, 0), gable(4.4, 2.4, 4.4, wood, roofMat({ color: '#3a302a' }), 0, 0)).children[5].position.y = 9.5;
        t.position.set(x, y, z); root.add(t);
      }
      for (let i = 0; i < 9; i++) {
        const a = r2() * 6.28, d = 52 + r2() * 30, x = at[0] + Math.cos(a) * d, z = at[1] + Math.sin(a) * d, s = 3 + r2() * 4;
        const c = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.9, 9), pile); c.position.set(x, hAt(x, z) + s * 0.4, z); c.castShadow = true; root.add(c);
      }
    } };
  },
  peakFort() {
    const g = new THREE.Group(), stone = std('#3d3b40'), capM = std('#222126');
    g.add(box(40, 22, 30, stone), box(26, 16, 22, stone, 0, 22, 0), tower(5, 52, stone, capM, -16, 8), tower(4, 44, stone, capM, 15, -9), tower(6, 66, stone, capM, 2, -2));
    g.add(box(12, 12, 2, std('#0b0b0d'), 0, 2, 15.2));
    return { group: g, top: 100 };
  },
  clockTower() {
    const g = new THREE.Group(), black = std('#141317', { roughness: 0.3, metalness: 0.25 }), face = new THREE.MeshStandardMaterial({ color: '#efe8d0', emissive: '#efe2b0', emissiveIntensity: 0.7 });
    g.add(box(13, 3, 13, black), box(10, 62, 10, black), box(12.5, 14, 12.5, black, 0, 56, 0), box(14, 1.6, 14, black, 0, 70, 0));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(9.4, 20, 4), black); cap.position.y = 81.6; cap.rotation.y = Math.PI / 4; cap.castShadow = true; g.add(cap);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.5, 24), face), a = i * Math.PI / 2;
      f.rotation.set(Math.PI / 2, 0, 0); if (i % 2) f.rotation.set(0, 0, Math.PI / 2);
      f.position.set(Math.sin(a) * 6.3, 63, Math.cos(a) * 6.3); g.add(f);
      const hand = box(0.5, 3.6, 0.3, black); hand.position.set(Math.sin(a) * 6.7, 63, Math.cos(a) * 6.7); hand.rotation.y = a; g.add(hand);
    }
    return { group: g, top: 100 };
  },
  oasis() {
    return { group: new THREE.Group(), top: 40, after(root, hAt, at) {
      const r2 = rng(41), trunk = std('#7a5a3c'), leaf = std('#3f7a3c', { side: THREE.DoubleSide });
      for (let i = 0; i < 26; i++) {
        const a = r2() * 6.28, d = 52 + r2() * 26, x = at[0] + Math.cos(a) * d, z = at[1] + Math.sin(a) * d, y = hAt(x, z), h = 12 + r2() * 8;
        if (y < 0.2) continue;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, h, 6), trunk); t.position.set(x, y + h / 2, z); t.rotation.z = (r2() - 0.5) * 0.3; t.castShadow = true; root.add(t);
        for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(1.5, 8, 4), leaf); f.position.set(x + Math.cos(k * 1.05) * 3.2, y + h - 0.6, z + Math.sin(k * 1.05) * 3.2); f.rotation.set(Math.sin(k * 1.05) * 1.9, 0, -Math.cos(k * 1.05) * 1.9); f.castShadow = true; root.add(f); }
      }
    } };
  },
  label() { return { group: new THREE.Group(), top: 22 }; },
  // a mossy outcrop of boulders with a black cave mouth in its face (the mouth looks toward +z, turned by lm.face)
  cave(lm) {
    const g = new THREE.Group(), r2 = rng(lm.at[0] * 7 + lm.at[1]), stone = std('#6f706a', { flatShading: true }), moss = std('#4f6b3c', { flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, d = i ? 10 + r2() * 8 : 0, s = i ? 7 + r2() * 6 : 16;
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), r2() < 0.35 ? moss : stone);
      m.position.set(Math.cos(a) * d, s * 0.55, Math.sin(a) * d - 4); m.scale.set(1.2, 0.8 + r2() * 0.4, 1); m.rotation.set(r2() * 3, r2() * 3, r2() * 3);
      m.castShadow = m.receiveShadow = true; g.add(m);
    }
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(6, 18, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#050506' }));
    mouth.position.set(0, 0.2, 10.6); mouth.scale.set(1, 1.25, 1); g.add(mouth);
    g.rotation.y = lm.face ?? 0;
    return { group: g, top: 30 };
  },
  chain() {
    const g = new THREE.Group(), stone = std('#8d8678'), capM = std('#4a4038');
    g.add(tower(8, 34, stone, capM, 0, -150), tower(8, 34, stone, capM, 0, 150));
    const links = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 300, 6), std('#2c2a28', { metalness: 0.7, roughness: 0.5 }));
    links.rotation.x = Math.PI / 2; links.position.y = 5; g.add(links);
    for (const z of [-150, 150]) { const isle = new THREE.Mesh(new THREE.CylinderGeometry(16, 24, 9, 9), std('#6f6a5e')); isle.position.set(0, -2, z); g.add(isle); }
    return { group: g, top: 50 };
  },
};

function ship(r) {
  const g = new THREE.Group(), wood = std('#4d3a2b');
  g.add(box(4.2, 2.4, 14, wood, 0, -0.6, 0), box(3, 1.6, 4, wood, 0, 1.8, -5));
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 17, 6), wood); mast.position.y = 9; g.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), std(r() < 0.3 ? '#9e2b2b' : '#ece4d0', { side: THREE.DoubleSide })); sail.position.set(0, 10.5, 0.4); sail.castShadow = true; g.add(sail);
  return g;
}

function instanced(geom, mat, items, shadow = true) {
  const m = new THREE.InstancedMesh(geom, mat, items.length), o = new THREE.Object3D();
  items.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z); o.rotation.set(0, it.rot || 0, 0); o.scale.set(it.sx, it.sy, it.sz); o.updateMatrix();
    m.setMatrixAt(i, o.matrix);
    if (it.color) m.setColorAt(i, it.color);
  });
  m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
  return m;
}

// ---- the local scene -----------------------------------------------------------------------------
export function buildSettlement(place, cfg, can) {
  const root = new THREE.Group(), R = rng(cfg.seed * 7 + 3), S = cfg.seed, rad = cfg.radius;
  const hills = [...(cfg.hills || [])];
  if (cfg.pass) hills.push([-170, 0, 150, 110], [170, 0, 150, 110]);
  const riverZ = (x, k = 0) => (k ? 120 - Math.sin(x * 0.006 + S + 2) * cfg.river.amp : Math.sin(x * 0.007 + S) * cfg.river.amp + Math.sin(x * 0.019 + S * 2) * cfg.river.amp * 0.25);
  const riverD = (x, z) => { if (!cfg.river) return 1e9; let d = Math.abs(z - riverZ(x)); if (cfg.river2) d = Math.min(d, Math.abs(z - riverZ(x, 1))); return d; };
  const coastS = (x, z) => { if (!cfg.coast) return -1e9; const cx = cfg.coast.x + (fbm(z * 0.006, 7.7, 3, S + 5) - 0.5) * 110 * (cfg.coast.flip ? -1 : 1); return cfg.coast.flip ? cx - x : x - cx; };

  const hAt = (x, z) => {
    const r = Math.hypot(x, z);
    let h = 3 + fbm(x * 0.004, z * 0.004, 4, S) * 9;
    if (cfg.dunes) h += (0.5 + 0.5 * Math.sin(x * 0.02 + fbm(x * 0.004, z * 0.004, 2, S + 6) * 9)) * 16 * smoothstep(rad * 1.2, rad * 3, r);
    h = mix(h, 4.5, (1 - smoothstep(rad * 0.9, rad * 1.6, r)) * 0.75);
    if (cfg.mountains) {
      const dir = cfg.mountainDir === undefined ? 1 : 0.25 + 0.75 * Math.max(0, Math.cos(Math.atan2(z, x) - cfg.mountainDir));
      const open = cfg.pass ? smoothstep(40, 200, Math.abs(x)) : 1;
      h += smoothstep(rad * 1.25, rad * 3.4 + 200, r) * (0.25 + ridged(x * 0.0035, z * 0.0035, 5, S + 1)) * cfg.mountains * dir * open;
    }
    for (const [hx, hz, hh, hr] of hills) { const dx = x - hx, dz = z - hz; h += hh * Math.min(1, Math.exp(-(dx * dx + dz * dz) / (hr * hr)) * 1.8); }
    for (const [px, pz, pr, pd] of cfg.pits || []) h -= pd * smoothstep(pr, pr * 0.35, Math.hypot(x - px, z - pz));
    if (cfg.river) h = mix(-3, h, smoothstep(cfg.river.w, cfg.river.w + 20, riverD(x, z)));
    if (cfg.lake) h = mix(h, -4, smoothstep(cfg.lake[2], cfg.lake[2] - 40, Math.hypot(x - cfg.lake[0], z - cfg.lake[1]) + (fbm(x * 0.01, z * 0.01, 2, S) - 0.5) * 50));
    if (cfg.coast) h = mix(h, -8, smoothstep(-25, 45, coastS(x, z)));
    return h;
  };
  const edge = (x, z) => { const a = Math.atan2(z, x); return rad * (0.8 + 0.34 * fbm(Math.cos(a) * 1.4 + 5, Math.sin(a) * 1.4 + 5, 2, S)); };
  const inCity = (x, z) => Math.hypot(x, z) < edge(x, z);

  // ground
  const SIZE = 2400, SEG = 240, geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), t = new THREE.Color();
  const grass = C({ dry: '#a3955f', warm: '#8d9a57', lush: '#548a4b', desert: '#d2975c' }[cfg.biome] || '#688650');
  const street = C(cfg.palisade ? '#7b6b58' : '#8d877a'), rock = C(cfg.mood === 'grim' ? '#454247' : '#77736e');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = hAt(x, z), n = fbm(x * 0.02, z * 0.02, 3, S + 9);
    p.setY(i, h);
    const slope = Math.hypot(hAt(x + 4, z) - h, hAt(x, z + 4) - h) / 4;
    if (h < 0) c.set('#b8b28a').lerp(t.set('#1c4353'), smoothstep(0, -5, h));
    else {
      c.copy(grass).multiplyScalar(0.8 + n * 0.4);
      if (cfg.mood === 'grim') c.lerp(rock, 0.7);
      c.lerp(street, 1 - smoothstep(edge(x, z) * 0.92, edge(x, z) * 1.08, Math.hypot(x, z)));
      c.lerp(t.set('#d6cc9e'), smoothstep(1.6, 0.3, h));
      c.lerp(rock, clamp(smoothstep(0.45, 1.0, slope) + smoothstep(60, 110, h)));
      if (cfg.snow) c.lerp(t.set('#eef2f6'), clamp(smoothstep(0.35, 0.65, n) * 0.75 + smoothstep(30, 70, h)) * (1 - smoothstep(0.9, 1.6, slope) * 0.7) * smoothstep(0.5, 2.5, h));
      else c.lerp(t.set('#eef2f6'), smoothstep(120, 170, h + n * 30));
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, std('#ffffff', { vertexColors: true, roughness: 0.96 }));
  ground.receiveShadow = true; root.add(ground);

  const water = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: '#3b8d98', roughness: 0.12, metalness: 0.55, transparent: true, opacity: 0.88 }));
  water.rotation.x = -Math.PI / 2; root.add(water);

  // landmarks (only those the reader has reached)
  const pois = [], lms = (cfg.landmarks || []).filter((l) => can(l.book));
  for (const lm of lms) {
    const built = LANDMARKS[lm.type](lm, cfg), y = Math.max(hAt(lm.at[0], lm.at[1]), 0.4);
    built.group.position.set(lm.at[0], lm.type === 'chain' ? 0 : y - 0.3, lm.at[1]);
    root.add(built.group);
    built.after?.(root, hAt, lm.at);
    pois.push({ id: lm.id, name: lm.name, notes: lm.notes, interior: lm.interior, kind: lm.type === 'label' ? 'feature' : 'landmark', pos: new THREE.Vector3(lm.at[0], y + built.top * 0.55, lm.at[1]), focus: new THREE.Vector3(lm.at[0], y + built.top * 0.3, lm.at[1]), size: clamp(built.top, 40, 190) });
  }
  const blocked = (x, z, pad = 0) => (cfg.landmarks || []).some((l) => l.clear && Math.hypot(x - l.at[0], z - l.at[1]) < l.clear + pad);

  // houses
  const walls = [], roofs = [], keepP = cfg.sparse ?? 1, STEP = 11;
  const pick = (arr) => arr[Math.floor(R() * arr.length)];
  for (let gz = -rad * 1.3; gz < rad * 1.3; gz += STEP) for (let gx = -rad * 1.3; gx < rad * 1.3; gx += STEP) {
    const x = gx + (R() - 0.5) * 4, z = gz + (R() - 0.5) * 4, keep = R(), tall = R(), turn = R();
    if (keep > keepP || !inCity(x, z) || blocked(x, z, 6)) continue;
    const u = x + (fbm(x * 0.008, z * 0.008, 2, S + 3) - 0.5) * 70, v = z + (fbm(x * 0.008, z * 0.008, 2, S + 4) - 0.5) * 70;
    if (((u % 46) + 46) % 46 < 7 || ((v % 40) + 40) % 40 < 6) continue;
    const h = hAt(x, z);
    if (h < 1.6 || riverD(x, z) < (cfg.river?.w || 0) + 12) continue;
    if (Math.abs(hAt(x + 5, z) - h) + Math.abs(hAt(x, z + 5) - h) > 4.5) continue;
    let pal = cfg.palette, sc = 1;
    for (const d of cfg.districts || []) if (Math.hypot(x - d.at[0], z - d.at[1]) < d.r * (0.8 + 0.4 * fbm(x * 0.02, z * 0.02, 2, S))) { pal = d.palette; sc = d.scale; }
    const w = (6 + R() * 3.5) * sc, d = (7.5 + R() * 4) * sc;
    const hh = (4 + tall * 4.5) * (1 + 0.7 * smoothstep(rad * 0.75, 0, Math.hypot(x, z))) * sc;
    const rot = (turn < 0.5 ? 0 : Math.PI / 2) + (fbm(x * 0.006, z * 0.006, 2, S + 8) - 0.5) * 0.9;
    walls.push({ x, y: h + hh / 2 - 0.4, z, sx: w, sy: hh + 0.8, sz: d, rot, color: C(pick(pal.walls)).multiplyScalar(0.88 + R() * 0.2) });
    roofs.push({ x, y: h + hh, z, sx: w * 1.1, sy: w * (0.42 + R() * 0.25), sz: d * 1.06, rot, color: C(pick(pal.roofs)).multiplyScalar(0.85 + R() * 0.25) });
  }
  if (walls.length) root.add(instanced(BOX, std('#ffffff'), walls), instanced(ROOF, roofMat(), roofs));

  // city wall or palisade
  if (cfg.walls || cfg.palisade) {
    const segs = [], towers = [], N = cfg.walls ? 110 : 80, stoneC = C(cfg.walls ? '#b3ab9b' : '#5c4a3a');
    const ht = cfg.walls ? 10 : 4.5, th = cfg.walls ? 3.2 : 1;
    const pt = (i) => { const a = (i / N) * Math.PI * 2, e = edge(Math.cos(a), Math.sin(a)) + 16; return [Math.cos(a) * e, Math.sin(a) * e]; };
    for (let i = 0; i < N; i++) {
      const [ax, az] = pt(i), [bx, bz] = pt(i + 1), mx = (ax + bx) / 2, mz = (az + bz) / 2, h = hAt(mx, mz);
      if (h < 1 || i % 27 === 13 || blocked(mx, mz, -25)) continue;
      segs.push({ x: mx, y: h + ht / 2 - 1, z: mz, sx: Math.hypot(bx - ax, bz - az) + 1, sy: ht + 2, sz: th, rot: -Math.atan2(bz - az, bx - ax), color: stoneC });
      if (i % (cfg.walls ? 5 : 10) === 0) towers.push({ x: ax, y: hAt(ax, az) + ht * 0.75 - 1, z: az, sx: cfg.walls ? 7 : 3.5, sy: ht * 1.5 + 2, sz: cfg.walls ? 7 : 3.5, rot: 0, color: stoneC });
    }
    root.add(instanced(BOX, std('#ffffff'), segs));
    if (towers.length) root.add(instanced(cfg.walls ? new THREE.CylinderGeometry(0.5, 0.55, 1, 10) : BOX, std('#ffffff'), towers));
  }

  // piers and ships
  const pierM = std('#5b4737'), piers = [], shipSpots = [];
  if (cfg.river) for (let x = -rad; x < rad * 1.1; x += 42) {
    const z = riverZ(x);
    if (!inCity(x, z + 30) || hAt(x, z) > -1) continue;
    const side = R() < 0.5 ? -1 : 1;
    piers.push({ x, y: 0.7, z: z + side * (cfg.river.w + 3), sx: 3, sy: 0.6, sz: 15, rot: 0 });
    if (R() < 0.45) shipSpots.push([x + 9, z, Math.PI / 2 + Math.cos(x * 0.007 + S) * 0.3]);
  }
  if (cfg.coast) {
    const dir = cfg.coast.flip ? -1 : 1;
    for (let z = -rad * 0.75; z < rad * 0.75; z += 36) {
      let x = 0; while (Math.abs(x) < 900 && hAt(x, z) > 0.4) x += dir * 6;
      if (Math.abs(x) >= 900 || coastS(x, z) < -45 || !inCity(x - dir * 60, z)) continue;
      piers.push({ x: x + dir * 12, y: 0.7, z, sx: 34, sy: 0.6, sz: 3.2, rot: 0 });
      shipSpots.push([x + dir * (22 + R() * 14), z + 8, R() * 0.3]);
    }
    for (let i = 0; i < 4; i++) shipSpots.push([(cfg.coast.x + dir * (160 + R() * 260)), (R() - 0.5) * 700, R() * 6.28]);
  }
  if (piers.length) root.add(instanced(BOX, pierM, piers));
  shipSpots.slice(0, (cfg.ships || 4) + 4).forEach(([x, z, rot]) => { if (hAt(x, z) < -1) { const s = ship(R); s.position.set(x, 0.9, z); s.rotation.y = rot; root.add(s); } });

  // trees
  if (!cfg.treeless) {
    const trees = [], dens = cfg.forest ?? 0.55, c1 = C(cfg.biome === 'dry' ? '#6f7a3c' : cfg.snow ? '#274236' : '#2f5a36'), c2 = C(cfg.biome === 'dry' ? '#8a8a48' : '#4f7a3c');
    for (let i = 0; i < 26000 && trees.length < 9000; i++) {
      const x = (R() - 0.5) * 2200, z = (R() - 0.5) * 2200, s = 0.8 + R() * 0.8, k = R();
      if (Math.hypot(x, z) < edge(x, z) + 30 || blocked(x, z, 30)) continue;
      const h = hAt(x, z);
      if (h < 1.5 || h > 95 || R() > dens * (0.2 + 1.2 * fbm(x * 0.004, z * 0.004, 3, S + 30))) continue;
      trees.push({ x, y: h + 7 * s, z, sx: 5.2 * s, sy: 15 * s, sz: 5.2 * s, color: c1.clone().lerp(c2, k) });
    }
    if (trees.length) root.add(instanced(new THREE.ConeGeometry(0.5, 1, 6), std('#ffffff', { flatShading: true }), trees));
  }

  return { group: root, heightAt: hAt, pois, radius: rad, mood: cfg.mood };
}

// ---- miniature towns for the continent view ----------------------------------------------------
export function buildMarkers(places, groundAt) {
  const group = new THREE.Group(), byId = new Map();
  const wallM = std('#ffffff'), rfM = roofMat();
  for (const pl of places) {
    const g = new THREE.Group(), R = rng(pl.pos[0] * 13 + pl.pos[1] * 7), [px, pz] = pl.pos;
    const count = { capital: 46, city: 26, town: 12, fortress: 4, mine: 8 }[pl.kind], spread = { capital: 6.5, city: 5, town: 3.4, fortress: 2, mine: 3 }[pl.kind];
    const dark = pl.kind === 'mine' || pl.id === 'morath' || pl.id === 'ferian';
    const walls = [], roofs = [];
    for (let i = 0; i < count; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * spread, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d, y = groundAt(x, z);
      if (y < 0.15) continue;
      const w = 0.5 + R() * 0.35, hh = 0.4 + R() * 0.5, rot = R() * 3.14;
      walls.push({ x, y: y + hh / 2, z, sx: w, sy: hh, sz: w * 1.3, rot, color: C(dark ? '#5a534c' : pl.pos[1] > 150 ? '#e2cfa4' : '#e2dccb').multiplyScalar(0.85 + R() * 0.25) });
      roofs.push({ x, y: y + hh, z, sx: w * 1.1, sy: w * 0.6, sz: w * 1.36, rot, color: C(dark ? '#2f2b28' : pl.pos[1] > 150 || pl.realm === 'Wendlyn' ? '#b5683f' : '#4f5d68').multiplyScalar(0.85 + R() * 0.3) });
    }
    g.add(instanced(BOX, wallM, walls, false), instanced(ROOF, rfM, roofs, false));
    const y0 = groundAt(px, pz);
    let mini = null;
    if (pl.id === 'rifthold') mini = LANDMARKS.glassCastle().group, mini.scale.setScalar(0.05), mini.position.set(px - 5, y0, pz - 5);
    else if (pl.kind === 'capital' || pl.kind === 'fortress') mini = LANDMARKS.castle({ tone: dark ? 'dark' : pl.realm === 'Eyllwe' ? 'sand' : pl.kind === 'capital' ? 'pale' : 'default' }).group, mini.scale.setScalar(0.07), mini.position.set(px, y0, pz - (pl.kind === 'capital' ? 4 : 0));
    if (pl.tower) { const ct = LANDMARKS.clockTower().group; ct.scale.setScalar(0.065); ct.position.set(px + 1.2, y0, pz - 0.9); g.add(ct); }
    if (mini) g.add(mini);
    group.add(g); byId.set(pl.id, g);
  }
  return { group, byId };
}

export { box, std, roofMat, tower, gable, instanced, BOX, ROOF, C };

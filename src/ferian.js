// The Ferian Gap: a sheer canyon between two peaks, built from the reader's own sketch.
// West wall: the launch ledge with a cavern mouth above it. Centre: a lone rock spire.
// East wall: the Omega, bulging out over the drop. Wyverns circle the spire.
import * as THREE from 'three';
import { rng, fbm, ridged, clamp, mix, smoothstep } from './util.js';
import { std, box } from './settlement.js';

const S = 91;
const strata = (y, n, out) => out.set(Math.floor(y / 19 + n * 2.2) % 2 ? '#5d5f62' : '#6c6661').multiplyScalar(0.8 + n * 0.4);

function rock(w, h, d, seed, { taper = [1, 1], amp = 0.16, rag = 0 } = {}) {
  const g = new THREE.BoxGeometry(w, h, d, 6, 12, 6), p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = y / h + 0.5, k = mix(taper[0], taper[1], t);
    const n = fbm(x * 0.035 + seed, y * 0.02 + z * 0.035, 3, seed) - 0.5, n2 = fbm(z * 0.04 - seed, y * 0.03 + x * 0.02, 3, seed + 9) - 0.5;
    x = x * k + n * w * amp * 2; z = z * k + n2 * d * amp * 2; y += (n + n2) * h * 0.03 + (n + n2) * rag * smoothstep(0.3, 0, t);
    p.setXYZ(i, x, y, z);
    strata(y + seed * 7, n + 0.5, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, std('#ffffff', { vertexColors: true, flatShading: true, roughness: 1 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}

function wyvern() {
  const g = new THREE.Group(), black = std('#0d0d10', { side: THREE.DoubleSide, roughness: 0.7 });
  const part = (geo, x, y, z, rx = Math.PI / 2) => { const m = new THREE.Mesh(geo, black); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
  part(new THREE.ConeGeometry(1.7, 9, 6), 0, 0, 0);                 // body, nose toward +z
  part(new THREE.ConeGeometry(0.8, 5, 5), 0, 0.9, 5.8, Math.PI / 2 - 0.35); // neck
  part(new THREE.ConeGeometry(0.9, 2.6, 4), 0, 1.6, 8.6);            // head
  part(new THREE.ConeGeometry(0.7, 12, 4), 0, -0.2, -9, -Math.PI / 2); // tail
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 3, 0, 0, -3, 8, 0, 1.5, 8, 0, 1.5, 0, 0, -3, 7, 0, -4.5, 8, 0, 1.5, 7, 0, -4.5, 15, 0, -1.5, 8, 0, 1.5, 15, 0, -1.5, 13, 0, 3.5], 3));
  wingGeo.computeVertexNormals();
  const wings = [1, -1].map((s) => { const w = new THREE.Mesh(wingGeo, black); w.scale.x = s; w.castShadow = true; g.add(w); return w; });
  g.userData.flap = (a) => { wings[0].rotation.z = a; wings[1].rotation.z = -a; };
  g.scale.setScalar(2.1);
  return g;
}

export function buildFerian(progress) {
  const root = new THREE.Group(), R = rng(S);
  const hAt = (x, z) => {
    const xw = x + (fbm(z * 0.008, 3.3, 3, S) - 0.5) * 50, ax = Math.abs(xw);
    const floor = 3 + ridged(x * 0.022, z * 0.022, 3, S) * 20 * smoothstep(-10, 70, ax);
    const top = 255 + ridged(x * 0.004, z * 0.004, 4, S + 2) * 150 - smoothstep(380, 1100, ax) * 140 + (xw > 0 ? 70 : 40);
    return floor + smoothstep(104, 148, ax + (fbm(x * 0.03, z * 0.03, 2, S + 4) - 0.5) * 14) * top;
  };

  const geo = new THREE.PlaneGeometry(2600, 2600, 300, 300);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), snow = new THREE.Color('#eef2f6'), dark = new THREE.Color('#3a3b3f');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = hAt(x, z), n = fbm(x * 0.02, z * 0.02, 3, S + 9);
    p.setY(i, h);
    strata(h, n, c);
    c.lerp(dark, smoothstep(40, 0, h) * 0.6);
    const slope = Math.abs(hAt(x + 5, z) - h) / 5;
    c.lerp(snow, smoothstep(300, 345, h + n * 40) * (1 - smoothstep(0.8, 2, slope)));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, std('#ffffff', { vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = ground.castShadow = true; root.add(ground);

  const add = (m, x, y, z, ry = 0) => { m.position.set(x, y, z); m.rotation.y = ry; root.add(m); return m; };
  // the spire: a pillar hanging from the sky with open air beneath its ragged foot
  add(rock(60, 370, 52, 1, { taper: [0.5, 1.08], amp: 0.12, rag: 70 }), 0, 300, 0);
  const shards = [[-18, 70, 12, 9, 21], [22, 50, -14, 6, 22], [4, 86, 20, 5, 23], [-28, 38, -10, 4, 24]].map(([x, y, z, r, sd]) => { const m = rock(r * 2, r * 2.6, r * 2, sd, { taper: [0.4, 1], amp: 0.2 }); add(m, x, y, z); return { m, y, ph: sd }; });
  // west wall: launch ledge, cavern, and the roof of rock over it
  add(rock(130, 30, 96, 3, { taper: [0.7, 1], amp: 0.07 }), -128, 203, 0);
  add(rock(110, 34, 110, 4, { taper: [1, 0.8], amp: 0.1 }), -150, 292, 0);
  add(box(10, 52, 58, new THREE.MeshBasicMaterial({ color: '#050506' })), -150, 220, 0);
  add(rock(30, 60, 26, 5), -160, 246, 44); add(rock(30, 60, 26, 6), -160, 246, -44);
  // east wall: the Omega leaning out over the gap
  add(rock(150, 150, 210, 7, { taper: [0.72, 1.05], amp: 0.1 }), 178, 300, 0);
  add(rock(90, 80, 150, 8, { taper: [0.6, 1], amp: 0.12 }), 172, 196, 10);
  const fire = new THREE.MeshStandardMaterial({ color: '#ffb35a', emissive: '#ff8a2a', emissiveIntensity: 2.2 });
  for (let i = 0; i < 16; i++) add(box(1.5, 4 + R() * 3, 3, fire), 98 + R() * 5, 270 + Math.floor(R() * 4) * 22, -85 + R() * 170);
  add(box(8, 30, 26, new THREE.MeshBasicMaterial({ color: '#050506' })), 104, 236, 0);
  // teeth on the canyon floor
  for (let i = 0; i < 90; i++) {
    const x = (R() - 0.5) * 190, z = (R() - 0.5) * 1100, s = 6 + R() * 12, hh = 14 + R() * 42;
    const m = new THREE.Mesh(new THREE.ConeGeometry(s, hh, 5), std(R() < 0.5 ? '#55565a' : '#625d58', { flatShading: true }));
    m.rotation.set((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4); m.castShadow = true;
    add(m, x, hAt(x, z) + hh * 0.35, z, m.rotation.y);
  }

  // wyverns
  const flock = [];
  for (let i = 0; i < 6; i++) {
    const w = wyvern();
    flock.push({ w, y: 45 + i * 42 + R() * 20, rx: 58 + R() * 14, rz: 170 + R() * 160, sp: (0.16 + R() * 0.1) * (i % 2 ? 1 : -1), ph: R() * 6.28 });
    root.add(w);
  }
  const perched = wyvern(); perched.position.set(-88, 221, 14); perched.rotation.y = Math.PI / 2; perched.userData.flap(0.9); root.add(perched);
  const update = (time) => {
    for (const d of shards) d.m.position.y = d.y + Math.sin(time * 0.5 + d.ph) * 3, d.m.rotation.y = time * 0.04 + d.ph;
    for (const f of flock) {
      const a = f.ph + time * f.sp, x = Math.cos(a) * f.rx, z = Math.sin(a) * f.rz;
      f.w.position.set(x, f.y + Math.sin(a * 2 + f.ph) * 14, z);
      f.w.rotation.set(0, Math.atan2(-Math.sin(a) * f.rx * Math.sign(f.sp), Math.cos(a) * f.rz * Math.sign(f.sp)), 0);
      f.w.rotateZ(-0.35 * Math.sign(f.sp));
      f.w.userData.flap(Math.sin(time * 3.2 + f.ph * 3) * 0.55);
    }
  };
  update(0);

  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const poi = (id, name, kind, pos, focus, size, text, interior) => ({ id, name, kind, pos, focus, size, interior, notes: [[3, text]] });
  const pois = progress < 3 ? [] : [
    poi('omega', 'The Omega', 'landmark', V(185, 400, 0), V(150, 300, 0), 120, 'The eastern peak, leaning out over the drop. The Ironteeth covens are quartered inside the mountain, and its fires show through the rock at night.', 'omega'),
    poi('fang', 'The Northern Fang', 'landmark', V(-230, 360, -60), V(-170, 280, 0), 120, 'The facing peak, where the wyverns are kept and trained.', 'omega'),
    poi('ledge', 'The Ledge', 'landmark', V(-95, 232, 0), V(-110, 220, 0), 70, 'A shelf of rock over the Gap. The Crossing begins here: rider and wyvern go off the edge together.'),
    poi('cavern', 'The Overlook', 'feature', V(-150, 268, 0), V(-140, 245, 0), 60, 'A cavern mouth above the ledge, under an overhang, from which the flight below can be watched and judged.'),
    poi('gap', 'The Ferian Gap', 'feature', V(0, 420, 0), V(0, 200, 0), 160, 'The pass between the White Fang and Ruhnn Mountains, split by a single spire of rock that hangs from the heights with open air beneath it.'),
  ];
  return { group: root, heightAt: hAt, pois, radius: 200, mood: 'grim', update, focusY: 190, startPolar: 1.32 };
}

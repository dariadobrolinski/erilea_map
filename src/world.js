import * as THREE from 'three';
import { rng, noise, fbm, ridged, clamp, mix, smoothstep, polygonSDF, distToPolyline, smoothLine } from './util.js';
import { BOUNDS, LANDS, ISLANDS, RIDGES, RIVERS, LAKES, FORESTS, DESERTS, WASTES, MARSH, PLACES } from './data.js';

const CELL = 3;
const C = (hex) => new THREE.Color(hex);
const COL = {
  north: C('#5d7355'), mid: C('#6f8a4a'), south: C('#a39a55'), desert: C('#c4673a'), dune: C('#dca468'),
  waste: C('#9c9072'), marsh: C('#4f6a52'), forest: C('#2c4a33'), sand: C('#d9cfa0'), rock: C('#77736e'),
  rockDark: C('#55524f'), snow: C('#eef2f6'), seabed: C('#b8b28a'), deep: C('#12303f'), uncharted: C('#565a66'),
};

const gauss = (x, z, bx, bz, r) => { const dx = x - bx, dz = z - bz; return Math.exp(-(dx * dx + dz * dz) / (r * r)); };

export function buildWorld() {
  const group = new THREE.Group();
  const W = BOUNDS.maxX - BOUNDS.minX, D = BOUNDS.maxZ - BOUNDS.minZ;
  const NX = Math.floor(W / CELL) + 1, NZ = Math.floor(D / CELL) + 1;

  const lands = LANDS.map((l) => ({ ...l, sdf: polygonSDF(l.pts) }));
  const ridges = RIDGES.map((r) => ({ ...r, pts: smoothLine(r.pts, 5) }));
  const rivers = RIVERS.map((r) => ({ ...r, pts: smoothLine(r.pts, 6) }));
  const lineBox = (pts, pad) => {
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
    return [a - pad, b - pad, c + pad, d + pad];
  };
  ridges.forEach((r) => (r.box = lineBox(r.pts, r.w * 2.6)));
  rivers.forEach((r) => (r.box = lineBox(r.pts, 14)));

  const H = new Float32Array(NX * NZ), SD = new Float32Array(NX * NZ), UNCH = new Uint8Array(NX * NZ);

  for (let j = 0; j < NZ; j++) {
    const z = BOUNDS.minZ + j * CELL;
    for (let i = 0; i < NX; i++) {
      const x = BOUNDS.minX + i * CELL;
      const wx = x + (fbm(x * 0.011, z * 0.011, 3, 11) - 0.5) * 46 + (fbm(x * 0.06, z * 0.06, 2, 12) - 0.5) * 9;
      const wz = z + (fbm(x * 0.011, z * 0.011, 3, 21) - 0.5) * 46 + (fbm(x * 0.06, z * 0.06, 2, 22) - 0.5) * 9;
      let d = -80, unch = 0;
      for (const l of lands) {
        const b = l.sdf.bbox;
        if (wx < b[0] - 80 || wx > b[2] + 80 || wz < b[1] - 80 || wz > b[3] + 80) continue;
        const v = l.sdf(wx, wz);
        if (v > d) { d = v; unch = l.uncharted ? 1 : 0; }
      }
      for (const [ix, iz, r] of ISLANDS) {
        const v = r - Math.hypot(wx - ix, wz - iz);
        if (v > d) { d = v; unch = 0; }
      }
      let lake = 0;
      for (const [lx, lz, r] of LAKES) lake = Math.max(lake, smoothstep(r + 3, r - 2, Math.hypot(wx - lx, wz - lz)));

      let h;
      if (d > 0) {
        let rd = 1e9;
        for (const r of rivers) {
          const b = r.box;
          if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
          rd = Math.min(rd, distToPolyline(r.pts, x, z));
        }
        const rf = smoothstep(1.5, 11, rd);
        let tf = 1;
        for (const p of PLACES) {
          const r = p.kind === 'capital' ? 9 : p.kind === 'fortress' || p.kind === 'mine' ? 3.5 : 6;
          const dd = Math.hypot(x - p.pos[0], z - p.pos[1]);
          if (dd < r * 3) tf = Math.min(tf, smoothstep(r, r * 3, dd));
        }
        let mount = 0;
        for (const r of ridges) {
          const b = r.box;
          if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
          const dd = distToPolyline(r.pts, x, z) + (fbm(x * 0.03, z * 0.03, 2, 5) - 0.5) * 18;
          const g = Math.exp(-(dd * dd) / (r.w * r.w));
          if (g > 0.01) mount = Math.max(mount, r.h * g * (0.3 + 0.7 * ridged(x * 0.028, z * 0.028, 4, 3)));
        }
        const inland = smoothstep(0, 45, d);
        const hills = fbm(x * 0.018, z * 0.018, 4, 7) * 9 * inland + ridged(x * 0.05, z * 0.05, 2, 9) * 2.2 * inland;
        const shore = smoothstep(0, 7, d);
        h = 0.25 + shore * (1.3 + hills * (0.2 + 0.8 * rf) * (0.5 + 0.5 * tf) + mount * rf * (0.35 + 0.65 * tf));
        if (rd < 3) h -= (1 - smoothstep(0, 3, rd)) * Math.min(h - 0.12, 0.9);
        if (lake > 0) h = mix(h, -1.6, lake);
        if (unch) h = 0.25 + shore * (2 + hills * 0.6);
      } else {
        h = -0.3 - Math.min(-d * 0.22, 13) - noise(x * 0.03, z * 0.03, 4) * 1.5 * smoothstep(0, -20, d);
      }
      H[j * NX + i] = h;
      SD[j * NX + i] = lake > 0.5 ? -4 * lake : d;
      UNCH[j * NX + i] = unch;
    }
  }

  const sample = (arr, x, z) => {
    const fx = clamp((x - BOUNDS.minX) / CELL, 0, NX - 1.001), fz = clamp((z - BOUNDS.minZ) / CELL, 0, NZ - 1.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * NX + i;
    return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + NX] * (1 - u) + arr[k + NX + 1] * u) * v;
  };
  const heightAt = (x, z) => sample(H, x, z);
  const groundAt = (x, z) => Math.max(0, sample(H, x, z));
  const forestAt = (x, z) => {
    let f = 0;
    for (const [bx, bz, r, dens] of FORESTS) f = Math.max(f, gauss(x, z, bx, bz, r) * dens);
    return f;
  };

  // ---- terrain mesh -------------------------------------------------------------------------
  const pos = new Float32Array(NX * NZ * 3), col = new Float32Array(NX * NZ * 3);
  const c = new THREE.Color(), t = new THREE.Color();
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i, x = BOUNDS.minX + i * CELL, z = BOUNDS.minZ + j * CELL, h = H[k], d = SD[k];
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      const i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, NX - 1), j0 = Math.max(j - 1, 0), j1 = Math.min(j + 1, NZ - 1);
      const slope = Math.hypot(H[j * NX + i1] - H[j * NX + i0], H[j1 * NX + i] - H[j0 * NX + i]) / (2 * CELL);
      const lat = clamp((z + 539) / 1080);
      const n = fbm(x * 0.05, z * 0.05, 3, 40);
      if (h < 0) {
        c.copy(COL.seabed).lerp(COL.deep, smoothstep(0, -7, h));
      } else if (UNCH[k]) {
        c.copy(COL.uncharted).multiplyScalar(0.8 + n * 0.3);
      } else {
        c.copy(COL.north).lerp(COL.mid, smoothstep(0.15, 0.5, lat)).lerp(COL.south, smoothstep(0.55, 0.95, lat));
        let waste = 0, desert = 0, marsh = 0;
        for (const [bx, bz, r] of WASTES) waste = Math.max(waste, gauss(x, z, bx, bz, r));
        for (const [bx, bz, r] of DESERTS) desert = Math.max(desert, gauss(x, z, bx, bz, r));
        for (const [bx, bz, r] of MARSH) marsh = Math.max(marsh, gauss(x, z, bx, bz, r));
        c.lerp(COL.waste, clamp(waste * 1.25 - 0.1));
        t.copy(COL.desert).lerp(COL.dune, fbm(x * 0.02, z * 0.035, 3, 60));
        c.lerp(t, smoothstep(0.25, 0.7, desert + (n - 0.5) * 0.25));
        c.lerp(COL.marsh, clamp(marsh * 1.4 - 0.2));
        c.lerp(COL.forest, clamp(forestAt(x, z) * 1.3 - 0.25 + (n - 0.5) * 0.5) * 0.75);
        c.multiplyScalar(0.82 + n * 0.36);
        c.lerp(COL.sand, smoothstep(4.5, 1, d) * 0.85);
        t.copy(COL.rock).lerp(COL.rockDark, n);
        c.lerp(t, clamp(smoothstep(0.35, 0.9, slope) + smoothstep(16, 34, h) * 0.7));
        const snowline = mix(17, 48, smoothstep(0, 0.75, lat)) + (n - 0.5) * 10;
        c.lerp(COL.snow, smoothstep(snowline, snowline + 9, h) * (1 - smoothstep(1.3, 2.2, slope) * 0.5));
        c.lerp(COL.snow, smoothstep(0.1, 0, lat) * smoothstep(0.35, 0.6, n) * 0.8);
      }
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
  }
  const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6);
  let q = 0;
  for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const a = j * NX + i, b = a + 1, cc = a + NX, dd = cc + 1;
    idx[q++] = a; idx[q++] = cc; idx[q++] = b; idx[q++] = b; idx[q++] = cc; idx[q++] = dd;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94, metalness: 0 }));
  group.add(terrain);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.MeshBasicMaterial({ color: COL.deep }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -15;
  group.add(floor);

  // ---- water ----------------------------------------------------------------------------------
  const sdfData = new Uint8Array(NX * NZ);
  for (let k = 0; k < NX * NZ; k++) sdfData[k] = clamp(SD[k] / 128 + 0.5) * 255;
  const sdfTex = new THREE.DataTexture(sdfData, NX, NZ, THREE.RedFormat, THREE.UnsignedByteType);
  sdfTex.magFilter = sdfTex.minFilter = THREE.LinearFilter;
  sdfTex.needsUpdate = true;
  const waterMat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uSdf: { value: null }, uBounds: { value: new THREE.Vector4(BOUNDS.minX, BOUNDS.minZ, W, D) }, uTime: { value: 0 },
      uDeep: { value: C('#14425a') }, uShallow: { value: C('#4fa7a8') }, uFoam: { value: C('#f2f7f4') }, uLight: { value: 1 },
    }]),
    vertexShader: `varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D uSdf; uniform vec4 uBounds; uniform float uTime, uLight; uniform vec3 uDeep, uShallow, uFoam;
      varying vec3 vW;
      #include <fog_pars_fragment>
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec2 uv = (vW.xz - uBounds.xy) / uBounds.zw;
        float d = (texture2D(uSdf, clamp(uv, 0.0, 1.0)).r - 0.5) * 128.0;
        float depth = clamp(-d / 42.0, 0.0, 1.0);
        vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 1.0, sqrt(depth)));
        float n = vn(vW.xz * 0.12 + uTime * 0.25) + 0.5 * vn(vW.xz * 0.37 - uTime * 0.18);
        col += (n - 0.75) * 0.05;
        float glint = smoothstep(1.32, 1.45, n) * 0.12;
        float bands = smoothstep(-7.0, -1.0, d) * (0.5 + 0.5 * sin(d * 1.5 + uTime * 1.3 + n * 3.0));
        float edge = smoothstep(-1.8, -0.3, d);
        col = mix(col, uFoam, clamp(bands * 0.28 + edge * 0.55 + glint, 0.0, 1.0));
        gl_FragColor = vec4(col * uLight, mix(0.8, 0.97, depth));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  waterMat.uniforms.uSdf.value = sdfTex;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set((BOUNDS.minX + BOUNDS.maxX) / 2, 0, (BOUNDS.minZ + BOUNDS.maxZ) / 2);
  group.add(water);

  // ---- rivers ---------------------------------------------------------------------------------
  const riverMat = new THREE.MeshStandardMaterial({ color: '#5fb0b8', roughness: 0.25, metalness: 0.1 });
  for (const r of rivers) {
    const pts = smoothLine(r.pts, 2), v = [], ix = [];
    pts.forEach(([x, z], i) => {
      const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)];
      let nx = -(b[1] - a[1]), nz = b[0] - a[0];
      const l = Math.hypot(nx, nz) || 1, w = mix(0.5, 1.5, i / pts.length);
      nx = (nx / l) * w; nz = (nz / l) * w;
      v.push(x - nx, groundAt(x - nx, z - nz) + 0.22, z - nz, x + nx, groundAt(x + nx, z + nz) + 0.22, z + nz);
      if (i) { const o = i * 2; ix.push(o - 2, o, o - 1, o - 1, o, o + 1); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(ix); g.computeVertexNormals();
    group.add(new THREE.Mesh(g, riverMat));
  }

  // ---- forests --------------------------------------------------------------------------------
  const R = rng(4242), pines = [], broad = [];
  for (let n = 0; n < 1100000 && pines.length + broad.length < 120000; n++) {
    const x = mix(BOUNDS.minX, BOUNDS.maxX, R()), z = mix(BOUNDS.minZ, BOUNDS.maxZ, R());
    if (sample(SD, x, z) < 3 || sample(UNCH, x, z) > 0.1) continue;
    const h = heightAt(x, z);
    if (h < 0.6 || h > 26) continue;
    let dry = 0;
    for (const [bx, bz, r] of DESERTS) dry = Math.max(dry, gauss(x, z, bx, bz, r));
    for (const [bx, bz, r] of WASTES) dry = Math.max(dry, gauss(x, z, bx, bz, r) * 0.9);
    const f = Math.max(forestAt(x, z) * (0.5 + 1.3 * fbm(x * 0.03, z * 0.03, 2, 70)), 0.05 * (1 - dry)) * (1 - dry * 0.9);
    if (R() > f) continue;
    let nearTown = false;
    for (const p of PLACES) if (Math.abs(x - p.pos[0]) < 7 && Math.abs(z - p.pos[1]) < 7) { nearTown = true; break; }
    if (nearTown) continue;
    const lat = clamp((z + 539) / 1080);
    (R() < smoothstep(0.6, 0.25, lat) + smoothstep(9, 18, h) * 0.5 ? pines : broad).push([x, h, z, 0.75 + R() * 0.7, R()]);
  }
  const treeMesh = (list, geom, baseCol, altCol) => {
    const m = new THREE.InstancedMesh(geom, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), list.length);
    const mat = new THREE.Matrix4(), cc = new THREE.Color();
    list.forEach(([x, y, z, s, r], i) => {
      mat.makeScale(s, s * (0.9 + r * 0.5), s).setPosition(x, y, z);
      m.setMatrixAt(i, mat);
      m.setColorAt(i, cc.copy(baseCol).lerp(altCol, r));
    });
    m.frustumCulled = false;
    group.add(m);
  };
  const cone = new THREE.ConeGeometry(0.85, 2.9, 5); cone.translate(0, 1.45, 0);
  const blob = new THREE.IcosahedronGeometry(1.05, 0); blob.scale(1, 1.15, 1); blob.translate(0, 1.1, 0);
  treeMesh(pines, cone, C('#1f4030'), C('#32583a'));
  treeMesh(broad, blob, C('#3c6a38'), C('#6a8a3c'));

  // ---- shrouds (Wendlyn until Heir of Fire; the southern coast always) -------------------------
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
  const puffTex = new THREE.CanvasTexture(cv);
  const shroud = (x0, x1, z0, z1, count, seed) => {
    const g = new THREE.Group(), r2 = rng(seed);
    const m = new THREE.SpriteMaterial({ map: puffTex, color: '#cfd6dc', transparent: true, opacity: 0.55, depthWrite: false, fog: false });
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(m), sc = 240 + r2() * 260;
      s.position.set(mix(x0, x1, r2()), 18 + r2() * 50, mix(z0, z1, r2()));
      s.scale.set(sc, sc * 0.6, 1);
      s.userData.drift = r2() * 6.28;
      g.add(s);
    }
    group.add(g);
    return g;
  };
  const southShroud = shroud(-420, 1100, 760, 1080, 70, 5);
  const wendShroud = shroud(900, 1760, -520, 420, 110, 6);

  return {
    group, heightAt, groundAt, terrain,
    setProgress(book) { wendShroud.visible = book < 3; },
    setLight(l) { waterMat.uniforms.uLight.value = l; },
    update(time) {
      waterMat.uniforms.uTime.value = time;
      for (const g of [southShroud, wendShroud]) if (g.visible) for (const s of g.children) s.position.x += Math.sin(time * 0.1 + s.userData.drift) * 0.03;
    },
  };
}

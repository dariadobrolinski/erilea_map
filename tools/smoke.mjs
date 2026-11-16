// Headless smoke test: builds the continent and every local scene without a browser.
const any = () => new Proxy(function () {}, { get: (t, k) => (k === 'canvas' ? {} : any()), apply: () => any(), set: () => true });
globalThis.document = { createElement: () => ({ getContext: () => any(), width: 0, height: 0 }) };
const { PLACES, sceneFor } = await import('../src/data.js');
const { buildWorld } = await import('../src/world.js');
const { buildSettlement, buildMarkers } = await import('../src/settlement.js');
let t = Date.now();
const w = buildWorld();
console.log('world built in', Date.now() - t, 'ms; children', w.group.children.length);
const trees = w.group.children.filter((c) => c.isInstancedMesh).map((c) => c.count);
console.log('trees', trees);
for (const p of PLACES) console.log(p.id.padEnd(11), 'ground', w.heightAt(...p.pos).toFixed(2));
buildMarkers(PLACES, w.groundAt);
for (const p of PLACES) {
  t = Date.now();
  const s = sceneFor(p).custom ? { group: { children: [] }, pois: [] } : buildSettlement(p, sceneFor(p), () => true);
  const houses = s.group.children.filter((c) => c.isInstancedMesh).map((c) => c.count);
  console.log(p.id.padEnd(11), Date.now() - t, 'ms', 'instances', houses.join('/'), 'pois', s.pois.map((o) => o.id + '@' + o.pos.y.toFixed(0)).join(','));
}
const { buildFerian } = await import('../src/ferian.js');
const f = buildFerian(3); f.update(3.2);
console.log('ferian ok; floor', f.heightAt(0, 0).toFixed(0), 'west wall', f.heightAt(-200, 0).toFixed(0), 'east wall', f.heightAt(200, 0).toFixed(0), 'pois', f.pois.length);
const { INTERIORS } = await import('../src/interiors.js');
for (const k in INTERIORS) { const r = INTERIORS[k](() => true); console.log('interior', k, 'rooms', r.pois.map((p) => p.id).join(','), 'size', r.size.toFixed(0)); }

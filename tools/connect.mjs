// Checks that every room of every interior can be reached on foot from the first one.
const any = () => new Proxy(function () {}, { get: (t, k) => (k === 'canvas' ? {} : any()), apply: () => any(), set: () => true });
globalThis.document = { createElement: () => ({ getContext: () => any(), width: 0, height: 0 }) };
const { INTERIORS } = await import('../src/interiors.js');
for (const k in INTERIORS) {
  const r = INTERIORS[k](() => true), Z = r.zones, seen = new Set([0]), q = [0];
  while (q.length) { const a = Z[q.pop()]; Z.forEach((b, j) => { if (seen.has(j)) return; const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1), z0 = Math.max(a.z0, b.z0), z1 = Math.min(a.z1, b.z1); if (x0 < x1 && z0 < z1 && Math.abs(a.yAt((x0 + x1) / 2, (z0 + z1) / 2) - b.yAt((x0 + x1) / 2, (z0 + z1) / 2)) < 3) { seen.add(j); q.push(j); } }); }
  const lost = Z.filter((z, j) => !seen.has(j)).map((z) => z.poi?.id || 'pass');
  console.log(k.padEnd(10), 'zones', Z.length, 'solids', r.solids.length, lost.length ? 'UNREACHABLE: ' + lost.join(',') : 'all connected');
}

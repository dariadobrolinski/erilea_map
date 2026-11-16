import * as THREE from 'three';

// HTML labels pinned to 3D points, with distance tiers and simple overlap rejection.
export class Labels {
  constructor(root) { this.root = root; this.items = []; this.v = new THREE.Vector3(); this.ray = new THREE.Raycaster(); this.occluders = null; this.tick = 0; }

  // Optional: meshes (walls, floors) that hide a label when they stand between the camera and its `at` point.
  // A few labels are re-checked each frame, so the cost stays flat however many rooms there are.
  occlude(camera) {
    if (!this.occluders || !this.items.length) return;
    for (let k = 0; k < 3; k++) {
      const it = this.items[this.tick++ % this.items.length];
      if (!it.at) { it.hidden = false; continue; }
      const dir = this.v.copy(it.at).sub(camera.position), len = dir.length();
      this.ray.set(camera.position, dir.normalize()); this.ray.far = len - 0.5;
      it.hidden = this.ray.intersectObjects(this.occluders, false).length > 0;
    }
  }

  set(items) {
    this.root.replaceChildren();
    this.items = items.map((it) => {
      const el = document.createElement(it.onClick ? 'button' : 'div');
      el.className = 'lbl ' + it.cls;
      const dot = document.createElement('i'), span = document.createElement('span');
      span.textContent = it.text;
      el.append(dot, span);
      if (it.onClick) el.addEventListener('click', (e) => { e.stopPropagation(); it.onClick(); });
      this.root.append(el);
      return { ...it, el, shown: false, hidden: false };
    });
    for (const it of this.items) { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; }
    this.items.sort((a, b) => b.pri - a.pri);
  }

  update(camera, dist, W, H) {
    this.occlude(camera);
    const placed = [], v = this.v;
    for (const it of this.items) {
      let vis = !it.hidden && dist >= (it.min ?? 0) && dist <= (it.max ?? Infinity), x = 0, y = 0;
      if (vis) {
        v.copy(it.pos).project(camera);
        vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        x = (v.x * 0.5 + 0.5) * W; y = (-v.y * 0.5 + 0.5) * H;
      }
      if (vis) {
        const r = [x - it.w / 2 - 4, y - it.h - 2, x + it.w / 2 + 4, y + 2];
        for (const q of placed) if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) { vis = false; break; }
        if (vis) placed.push(r);
      }
      if (vis) it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      if (vis !== it.shown) { it.shown = vis; it.el.classList.toggle('on', vis); }
    }
  }
}

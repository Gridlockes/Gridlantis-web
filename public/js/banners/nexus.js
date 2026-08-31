/**
 * Communication hub-and-spoke banner.
 * Icon markup was converted from Tabler Icons to Font Awesome 6, which is what
 * index.html actually loads — the original `ti ti-*` classes rendered nothing.
 */

import { fitCanvas, onResize, prefersReducedMotion } from "./canvas-util.js";

export function createNexusBanner(root) {
  const cv = root.querySelector("canvas");
  let ctx = fitCanvas(cv);

  const HUB = { x: 600, y: 200, c: "#FFD93D" };
  const CH = [
    { x: 185, y: 200, c: "#E01E5A", n: 0 },
    { x: 1015, y: 105, c: "#34AADF", n: 0 },
    { x: 1015, y: 295, c: "#7A85FF", n: 0 },
  ];
  const R = 34, HR = 36, W = 1200, H = 400;

  function ctrl(a, b, k) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    return { x: mx + (-dy / L) * k, y: my + (dx / L) * k };
  }
  CH.forEach((c, i) => { c.q = ctrl(HUB, c, [52, -46, 46][i]); });

  const pt = (a, q, b, t) => {
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * q.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * q.y + t * t * b.y,
    };
  };
  const trim = (a, b, r) => r / Math.hypot(b.x - a.x, b.y - a.y);

  let parts = [], ripples = [], amb = [];
  let t0 = 0, running = false, raf = null, rate = 0.45, dash = 0;
  const timers = new Set();

  for (let i = 0; i < 80; i++) {
    amb.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.4, s: Math.random() * 0.22 + 0.04,
      a: Math.random() * 0.35 + 0.08,
    });
  }

  /** setTimeout that can be cancelled on stop, so nothing fires after teardown. */
  function later(fn, ms) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  }

  function send(i, dir) {
    const c = CH[i];
    parts.push({
      i, dir, t: 0, sp: 0.5 + Math.random() * 0.35,
      c: dir > 0 ? HUB.c : c.c, r: 2.6 + Math.random() * 1.6,
    });
  }

  function burst() {
    CH.forEach((c, i) => {
      for (let k = 0; k < 4; k++) later(() => send(i, 1), k * 90 + i * 50);
    });
  }

  function badge(i) {
    const el = root.querySelector(`[data-badge="${i}"]`);
    CH[i].n++;
    if (!el) return;
    el.style.display = "block";
    el.textContent = CH[i].n > 99 ? "99+" : CH[i].n;
  }

  function clearBadges() {
    CH.forEach((c, i) => {
      c.n = 0;
      const el = root.querySelector(`[data-badge="${i}"]`);
      if (el) el.style.display = "none";
    });
  }

  function draw(ts) {
    const dt = Math.min(0.05, (ts - t0) / 1000 || 0.016);
    t0 = ts;

    ctx.fillStyle = "#0B1026";
    ctx.fillRect(0, 0, W, H);

    amb.forEach((p) => {
      p.x += p.s;
      if (p.x > W) p.x = -4;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = "#3C5A9A";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
    });
    ctx.globalAlpha = 1;

    dash -= dt * 34;

    CH.forEach((c) => {
      const t0c = trim(HUB, c.q, HR), t1c = 1 - trim(c, c.q, R);
      ctx.strokeStyle = c.c; ctx.globalAlpha = 0.28; ctx.lineWidth = 2;
      ctx.setLineDash([7, 9]); ctx.lineDashOffset = dash;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = t0c + ((t1c - t0c) * i) / 40;
        const p = pt(HUB, c.q, c, t);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    });

    parts.forEach((p) => { p.t += dt * p.sp; });
    parts.filter((p) => p.t >= 1).forEach((p) => {
      const c = CH[p.i], tgt = p.dir > 0 ? c : HUB;
      ripples.push({ x: tgt.x, y: tgt.y, a: 1, c: p.c });
      if (p.dir > 0) {
        if (Math.random() < 0.6) later(() => send(p.i, -1), 260 + Math.random() * 500);
      } else badge(p.i);
    });
    parts = parts.filter((p) => p.t < 1);
    ripples.forEach((r) => (r.a -= dt * 1.5));
    ripples = ripples.filter((r) => r.a > 0);
    if (Math.random() < rate * dt * 14) {
      send(Math.floor(Math.random() * 3), Math.random() < 0.5 ? 1 : -1);
    }

    parts.forEach((p) => {
      const c = CH[p.i], a = trim(HUB, c.q, HR), b = 1 - trim(c, c.q, R);
      for (let k = 5; k >= 0; k--) {
        const tt = p.t - k * 0.045;
        if (tt < 0) continue;
        const t = a + (b - a) * (p.dir > 0 ? Math.min(1, tt) : 1 - Math.min(1, tt));
        const q = pt(HUB, c.q, c, t);
        ctx.globalAlpha = (1 - k / 6) * 0.95;
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(q.x, q.y, p.r - k * 0.35, 0, 6.3); ctx.fill();
      }
    });

    ctx.globalAlpha = 1;
    ripples.forEach((r) => {
      ctx.globalAlpha = r.a * 0.55;
      ctx.strokeStyle = r.c; ctx.lineWidth = 2;
      const base = r.x === HUB.x && r.y === HUB.y ? HR : R;
      ctx.beginPath(); ctx.arc(r.x, r.y, base + (1 - r.a) * 20, 0, 6.3); ctx.stroke();
    });

    ctx.globalAlpha = 1;
    const spin = ts / 1000;
    ctx.strokeStyle = HUB.c; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 10]);
    ctx.lineDashOffset = -spin * 24;
    ctx.beginPath(); ctx.arc(HUB.x, HUB.y, 48, 0, 6.3); ctx.stroke();
    ctx.lineDashOffset = spin * 18; ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.arc(HUB.x, HUB.y, 60, 0, 6.3); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;

  }

  /** Frame scheduler. Kept separate from draw() so a stale callback that
   *  survives cancelAnimationFrame does nothing instead of painting. */
  function frame(ts) {
    if (!running) return;
    draw(ts);
    raf = requestAnimationFrame(frame);
  }

  function paintStatic() {
    const was = running;
    running = false;
    draw(performance.now());
    running = was;
  }

  const teardownResize = onResize(cv, (newCtx) => {
    ctx = newCtx;
    if (!running) paintStatic();
  });

  return {
    start() {
      if (running) return;
      if (prefersReducedMotion()) { paintStatic(); return; }
      running = true;
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      timers.forEach(clearTimeout);
      timers.clear();
    },
    destroy() { this.stop(); teardownResize(); },
    burst,
    clearBadges,
    setRate(v) { rate = v; },
    paintStatic,
  };
}

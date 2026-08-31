/**
 * Follower / post growth banner.
 * Refactored from the original standalone fragment into a module with explicit
 * lifecycle control, so the carousel can stop it when it scrolls out of view.
 */

import { fitCanvas, onResize, prefersReducedMotion } from "./canvas-util.js";

export function createFollowerBanner(root) {
  const cv = root.querySelector("canvas");
  let ctx = fitCanvas(cv);

  const W = 1200;
  const HUB = { x: 190, y: 288 };
  const HR = 30;
  const CH = { x: 760, y: 78, w: 400, h: 250 };
  const TG = { x: 462, y: 168, c: 5, r: 3, s: 38, g: 9 };

  const elF = root.querySelector("[data-role=followers]");
  const elP = root.querySelector("[data-role=posts]");
  const elD = root.querySelector("[data-role=delta]");

  let followers, dispF, posts, tiles, parts, ripples, hist, series;
  let t0 = 0, running = false, raf = null, spd = 1, acc = 0, sample = 0,
      pulse = 0, drift = 0;

  function reset() {
    followers = 1240; dispF = 1240; posts = 0;
    tiles = []; parts = []; ripples = []; hist = []; series = [];
    acc = 0; sample = 0; pulse = 0; drift = 0;
  }
  reset();

  const fmt = (n) => Math.round(n).toLocaleString();

  function setNum(el, str) {
    if (!el || el.dataset.v === str) return;
    el.dataset.v = str;
    const c = el.children;
    if (c.length !== str.length) {
      el.innerHTML = "";
      for (const ch of str) {
        const s = document.createElement("span");
        s.textContent = ch;
        el.appendChild(s);
      }
      return;
    }
    for (let i = 0; i < str.length; i++) {
      if (c[i].textContent !== str[i]) {
        const s = document.createElement("span");
        s.textContent = str[i];
        el.replaceChild(s, c[i]);
      }
    }
  }

  function spawn(n, fast) {
    for (let i = 0; i < n; i++) {
      const e = Math.random() * 6.2832;
      const d = 340 + Math.random() * 280;
      const sx = HUB.x + Math.cos(e) * d;
      const sy = HUB.y + Math.sin(e) * d * 0.55;
      parts.push({
        sx, sy, t: 0,
        sp: (fast ? 1.1 : 0.65) + Math.random() * 0.5,
        qx: (sx + HUB.x) / 2 + (Math.random() * 140 - 70),
        qy: (sy + HUB.y) / 2 + (Math.random() * 140 - 70),
        r: 2.2 + Math.random() * 1.8,
        dl: Math.random() * (fast ? 0.5 : 1.4),
      });
    }
  }

  function publish() {
    posts++;
    pulse = 1;
    tiles.push({ a: 0, h: Math.random() });
    if (tiles.length > TG.c * TG.r) tiles.shift();
    spawn(14 + Math.floor(Math.random() * 22), true);
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw(ts) {
    const dt = Math.min(0.05, (ts - t0) / 1000 || 0.016) * spd;
    t0 = ts;

    ctx.fillStyle = "#0B1026";
    ctx.fillRect(0, 0, 1200, 400);
    ctx.strokeStyle = "#1E3161";
    ctx.lineWidth = 1;
    [432, 722].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x, 350);
      ctx.stroke();
    });

    acc += dt;
    drift += dt;
    if (drift > 0.55) { drift = 0; spawn(1, false); }
    if (acc > 4.2) { acc = 0; publish(); }
    sample += dt;
    if (sample > 0.22) {
      sample = 0;
      series.push(followers);
      if (series.length > 170) series.shift();
    }
    parts.forEach((p) => {
      if (p.dl > 0) { p.dl -= dt; return; }
      p.t = Math.min(1, p.t + dt * p.sp);
    });
    parts.filter((p) => p.t >= 1).forEach(() => {
      followers++;
      hist.push(ts);
      ripples.push({ a: 1 });
    });
    parts = parts.filter((p) => p.t < 1);
    ripples.forEach((r) => (r.a -= dt * 2.2));
    ripples = ripples.filter((r) => r.a > 0);
    pulse = Math.max(0, pulse - dt * 1.4);
    tiles.forEach((t) => (t.a = Math.min(1, t.a + dt * 3.4)));

    dispF += (followers - dispF) * Math.min(1, dt * 7);
    while (hist.length && ts - hist[0] > 30000) hist.shift();

    ctx.globalAlpha = 1;
    const mx = Math.max(...series, followers);
    const mn = Math.min(...series, followers - 1);
    ctx.strokeStyle = "#1E3161";
    for (let i = 0; i <= 4; i++) {
      const y = CH.y + (CH.h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(CH.x, y);
      ctx.lineTo(CH.x + CH.w, y);
      ctx.stroke();
    }

    if (series.length > 1) {
      const N = series.length;
      const px = (i) => CH.x + (CH.w * i) / (N - 1);
      const py = (v) => CH.y + CH.h - ((v - mn) / ((mx - mn) || 1)) * CH.h;
      ctx.beginPath();
      ctx.moveTo(px(0), CH.y + CH.h);
      series.forEach((v, i) => ctx.lineTo(px(i), py(v)));
      ctx.lineTo(px(N - 1), CH.y + CH.h);
      ctx.closePath();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#4DD0E1";
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      series.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
      ctx.strokeStyle = "#4DD0E1";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.stroke();
      const ex = px(N - 1);
      const ey = py(series[N - 1]);
      ctx.fillStyle = "#0B1026";
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, 6.3); ctx.fill();
      ctx.strokeStyle = "#4DD0E1"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, 6.3); ctx.stroke();
    }

    tiles.forEach((t, i) => {
      const cx = TG.x + (i % TG.c) * (TG.s + TG.g);
      const cy = TG.y + Math.floor(i / TG.c) * (TG.s + TG.g);
      const e = 1 - Math.pow(1 - t.a, 3);
      const s = TG.s * (0.6 + 0.4 * e);
      ctx.globalAlpha = e;
      ctx.fillStyle = "#3A3417";
      rr(cx + (TG.s - s) / 2, cy + (TG.s - s) / 2, s, s, 6); ctx.fill();
      ctx.strokeStyle = "#FFD93D"; ctx.lineWidth = 1.5; ctx.globalAlpha = e * 0.8;
      rr(cx + (TG.s - s) / 2, cy + (TG.s - s) / 2, s, s, 6); ctx.stroke();
      ctx.globalAlpha = e * 0.55; ctx.fillStyle = "#FFD93D";
      ctx.fillRect(cx + 8, cy + TG.s - 14 - t.h * 8, TG.s - 16, 3);
    });

    ctx.globalAlpha = 1;
    parts.forEach((p) => {
      if (p.dl > 0) return;
      for (let k = 4; k >= 0; k--) {
        const tt = p.t - k * 0.05;
        if (tt < 0) continue;
        const u = 1 - tt;
        const x = u * u * p.sx + 2 * u * tt * p.qx + tt * tt * HUB.x;
        const y = u * u * p.sy + 2 * u * tt * p.qy + tt * tt * HUB.y;
        ctx.globalAlpha = (1 - k / 5) * 0.9;
        ctx.fillStyle = "#4DD0E1";
        ctx.beginPath(); ctx.arc(x, y, p.r - k * 0.3, 0, 6.3); ctx.fill();
      }
    });

    ctx.globalAlpha = 1;
    ripples.forEach((r) => {
      ctx.globalAlpha = r.a * 0.4;
      ctx.strokeStyle = "#4DD0E1";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(HUB.x, HUB.y, HR + (1 - r.a) * 22, 0, 6.3); ctx.stroke();
    });

    ctx.globalAlpha = 1;
    if (pulse > 0) {
      ctx.globalAlpha = pulse * 0.5;
      ctx.strokeStyle = "#FFD93D";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(HUB.x, HUB.y, HR + 8 + (1 - pulse) * 40, 0, 6.3); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#15224A";
    ctx.beginPath(); ctx.arc(HUB.x, HUB.y, HR + 6, 0, 6.3); ctx.fill();
    ctx.strokeStyle = "#4DD0E1"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(HUB.x, HUB.y, HR + 6, 0, 6.3); ctx.stroke();
    ctx.fillStyle = "#4DD0E1";
    ctx.beginPath(); ctx.arc(HUB.x, HUB.y - 8, 10, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(HUB.x, HUB.y + 22, 17, 3.34, 6.08); ctx.fill();

    setNum(elF, fmt(dispF));
    setNum(elP, fmt(posts));
    if (elD) elD.textContent = "+" + hist.length + " last 30s";

  }

  /** One static frame, for reduced-motion users. */
  /** Frame scheduler. Kept separate from draw() so a stale callback that
   *  survives cancelAnimationFrame does nothing instead of painting. */
  function frame(ts) {
    if (!running) return;
    draw(ts);
    raf = requestAnimationFrame(frame);
  }

  function paintStatic() {
    const wasRunning = running;
    running = false;
    for (let i = 0; i < 40; i++) { series.push(1240 + i * 3); }
    posts = 6;
    for (let i = 0; i < 6; i++) tiles.push({ a: 1, h: Math.random() });
    draw(performance.now());
    running = wasRunning;
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
    },
    reset,
    destroy() {
      this.stop();
      teardownResize();
    },
    setSpeed(v) { spd = v; },
    publish,
    paintStatic,
  };
}

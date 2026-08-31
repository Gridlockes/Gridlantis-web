/**
 * Business Solutions banner.
 *
 * Ported from the standalone fragment public/css/business_marketing_loop_9s_wordmark_only.html
 * (a 9s scripted loop with a headline, three KPI cards, a bar chart, a line
 * chart, a donut chart and a brand wordmark) into a module with explicit
 * lifecycle control, matching the other banners:
 *   - DOM lookups scoped to the slide root instead of document
 *   - the play/scrub controls (outside the export) dropped, replaced by
 *     start()/stop()
 *   - the 1920x1080 layout redrawn for the carousel's 1200x400 authoring
 *     space (see canvas-util.js)
 *   - the display/body webfonts dropped in favour of the system-ui stack the
 *     other banners use, so canvas text doesn't depend on a webfont load
 *
 * Unlike the other banners this one is a pure function of elapsed time rather
 * than an accumulated-dt simulation, so start()/stop() just track how far
 * into the reveal playback was when paused.
 *
 * The original fragment scripted a 9s loop that reveals the dashboard, holds,
 * then fades back out to blank before repeating. That loop length used to
 * exactly match AUTOPLAY_MS in banner-carousel.js, which meant every autoplay
 * pass landed here just in time to watch the dashboard dissolve to a blank
 * navy rectangle for its last ~1.4s before the carousel cut away — reading as
 * the slide breaking rather than looping. Elapsed time is now left unwrapped
 * and the exit fade dropped: the dashboard reveals once and then holds
 * (with the background dots and chart pulse still animating), matching how
 * the other banners loop indefinitely without ever going blank.
 */

import { fitCanvas, onResize, prefersReducedMotion } from "./canvas-util.js";

export function createKpiBanner(root) {
  const cv = root.querySelector("canvas");
  let ctx = fitCanvas(cv);

  const W = 1200, H = 400;
  const TEAL = "#4DD0E1", YEL = "#FFD93D", COR = "#FF7A6B", PUR = "#C084FC", POS = "#5DE8C0",
    BG = "#0B1026", PAN = "#16244E", BORDER = "#2A4079", GRID = "#243A73",
    TEXT = "#93A9D6", BRIGHT = "#EAF1FF", NAME = "GRIDLANTIS";
  const FD = (w, s) => `${w} ${s}px system-ui,-apple-system,'Segoe UI',sans-serif`;

  function mulb(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rn = mulb(41), dots = [];
  for (let i = 0; i < 60; i++) dots.push({ x: rn() * W, y: rn() * H, r: rn() * 2 + 0.6, s: rn() * 9 + 3, a: rn() * 0.3 + 0.08 });

  const BARS = [52, 61, 58, 74, 83, 96], QL = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"];
  const SEG = [
    { l: "Direct", c: TEAL, v: 38 },
    { l: "Partner", c: YEL, v: 27 },
    { l: "Online", c: COR, v: 21 },
    { l: "Other", c: PUR, v: 14 },
  ];
  const KPI = [
    { l: "REVENUE MTD", v: 184300, f: (n) => "$" + Math.round(n).toLocaleString(), d: "+18.4%" },
    { l: "ACTIVE ACCOUNTS", v: 412, f: (n) => Math.round(n).toLocaleString(), d: "+7.2%" },
    { l: "GROSS MARGIN", v: 62.4, f: (n) => n.toFixed(1) + "%", d: "+3.1 pts" },
  ];

  const LN = [], CS = [];
  {
    let a = 44, b = 31;
    const r2 = mulb(9);
    for (let i = 0; i < 64; i++) { a += (r2() - 0.35) * 3.1; b += (r2() - 0.5) * 2.0; LN.push(a); CS.push(Math.max(12, b)); }
  }

  const cl = (x, a, b) => (x < a ? a : x > b ? b : x);
  const sg = (t, s, d) => cl((t - s) / d, 0, 1);
  const eo = (x) => 1 - Math.pow(1 - x, 3);
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panel(x, y, w, h, p, title, out) {
    const o = (1 - eo(p)) * 22;
    ctx.globalAlpha = p * out;
    ctx.fillStyle = PAN; rr(x, y + o, w, h, 10); ctx.fill();
    ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; rr(x, y + o, w, h, 10); ctx.stroke();
    if (title) { ctx.fillStyle = TEXT; ctx.font = FD(600, 11); ctx.textAlign = "left"; ctx.fillText(title, x + 16, y + o + 22); }
    ctx.globalAlpha = 1;
    return o;
  }

  function draw(t) {
    const out = 1;

    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

    const gp = eo(sg(t, 0, 0.7));
    ctx.strokeStyle = "#16255280"; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 50) { ctx.globalAlpha = gp * out * 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * gp); ctx.stroke(); }
    for (let y = 0; y <= H; y += 50) { ctx.globalAlpha = gp * out * 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * gp, y); ctx.stroke(); }
    dots.forEach((d) => {
      const x = (d.x + t * d.s) % W;
      ctx.globalAlpha = d.a * gp * out; ctx.fillStyle = "#3C5A9A";
      ctx.beginPath(); ctx.arc(x, d.y, d.r, 0, 6.3); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // headline
    const hp = eo(sg(t, 0.25, 0.85)), ho = (1 - hp) * 16;
    ctx.globalAlpha = hp * out; ctx.textAlign = "left";
    ctx.fillStyle = BRIGHT; ctx.font = FD(700, 24); ctx.fillText("Q3 PERFORMANCE", 40, 34 + ho);
    ctx.fillStyle = TEXT; ctx.font = FD(500, 12); ctx.fillText("Every metric that matters, in one view", 40, 50 + ho);
    ctx.fillStyle = TEAL; rr(40, 57 + ho, 46, 3, 1.5); ctx.fill();
    ctx.globalAlpha = 1;

    // KPI cards
    KPI.forEach((k, i) => {
      const p = eo(sg(t, 0.9 + i * 0.15, 0.75)), x = 40 + i * 380, y = 74, w = 340, h = 62, o = (1 - p) * 20;
      ctx.globalAlpha = p * out;
      ctx.fillStyle = PAN; rr(x, y + o, w, h, 10); ctx.fill();
      ctx.strokeStyle = BORDER; ctx.lineWidth = 1.5; rr(x, y + o, w, h, 10); ctx.stroke();
      ctx.fillStyle = [TEAL, YEL, POS][i]; rr(x, y + o, 4, h, 2); ctx.fill();
      ctx.fillStyle = TEXT; ctx.font = FD(600, 10); ctx.textAlign = "left"; ctx.fillText(k.l, x + 18, y + o + 20);
      const cp = eio(sg(t, 1.05 + i * 0.15, 1.25));
      ctx.fillStyle = BRIGHT; ctx.font = FD(700, 24); ctx.fillText(k.f(k.v * cp), x + 18, y + o + 46);
      const bp = eo(sg(t, 1.95 + i * 0.12, 0.5)); ctx.globalAlpha = p * bp * out;
      ctx.fillStyle = POS; ctx.font = FD(600, 11); ctx.textAlign = "right"; ctx.fillText("▲ " + k.d, x + w - 16, y + o + 46);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    });

    const py = 148, ph = 226;

    // bar chart
    const p1 = eo(sg(t, 1.9, 0.7)), o1 = panel(40, py, 340, ph, p1, "REVENUE BY QUARTER", out);
    if (p1 > 0) {
      const base = py + o1 + 190, top = py + o1 + 62, bx = 62, bw = 34, gpx = 13;
      ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.globalAlpha = p1 * out * 0.9;
      for (let i = 0; i <= 3; i++) { const y = base - ((base - top) * i) / 3; ctx.beginPath(); ctx.moveTo(52, y); ctx.lineTo(360, y); ctx.stroke(); }
      BARS.forEach((v, i) => {
        const g = eo(sg(t, 2.15 + i * 0.08, 0.55)), x = bx + i * (bw + gpx), h = (base - top) * (v / 100) * g;
        ctx.globalAlpha = p1 * out; ctx.fillStyle = i === 5 ? TEAL : "#31699C"; rr(x, base - h, bw, h, 4); ctx.fill();
        ctx.globalAlpha = g * out; ctx.fillStyle = TEXT; ctx.font = FD(500, 10); ctx.textAlign = "center";
        ctx.fillText(QL[i], x + bw / 2, base + 16);
        ctx.fillStyle = "#CBDCFF"; ctx.font = FD(600, 10); ctx.fillText(Math.round(v * g), x + bw / 2, base - h - 6);
      });
      ctx.textAlign = "left"; ctx.globalAlpha = 1;
    }

    // line chart
    const p2 = eo(sg(t, 2.2, 0.7)), o2 = panel(420, py, 340, ph, p2, "REVENUE VS COST", out);
    if (p2 > 0) {
      const lx = 442, lw = 296, ly = py + o2 + 62, lh = 116,
        all = LN.concat(CS), mn = Math.min(...all), mx = Math.max(...all),
        rp = eio(sg(t, 2.5, 1.7)), N = Math.max(2, Math.floor(LN.length * rp));
      ctx.strokeStyle = GRID; ctx.lineWidth = 1; ctx.globalAlpha = p2 * out * 0.85;
      for (let i = 0; i <= 3; i++) { const y = ly + (lh * i) / 3; ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx + lw, y); ctx.stroke(); }
      const PX = (j) => lx + (lw * j) / (LN.length - 1);
      const PY = (v) => ly + lh - ((v - mn) / ((mx - mn) || 1)) * lh;
      ctx.globalAlpha = p2 * out * 0.17; ctx.fillStyle = TEAL;
      ctx.beginPath(); ctx.moveTo(PX(0), ly + lh);
      for (let j = 0; j < N; j++) ctx.lineTo(PX(j), PY(LN[j]));
      ctx.lineTo(PX(N - 1), ly + lh); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = p2 * out;
      ctx.beginPath();
      for (let j = 0; j < N; j++) (j ? ctx.lineTo(PX(j), PY(LN[j])) : ctx.moveTo(PX(j), PY(LN[j])));
      ctx.strokeStyle = TEAL; ctx.lineWidth = 2.4; ctx.lineJoin = "round"; ctx.stroke();
      ctx.beginPath();
      for (let j = 0; j < N; j++) (j ? ctx.lineTo(PX(j), PY(CS[j])) : ctx.moveTo(PX(j), PY(CS[j])));
      ctx.strokeStyle = COR; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
      const ex = PX(N - 1), ey = PY(LN[N - 1]), pu = 1 + Math.sin(t * 3.3) * 0.12;
      ctx.fillStyle = BG; ctx.beginPath(); ctx.arc(ex, ey, 5.5 * pu, 0, 6.3); ctx.fill();
      ctx.strokeStyle = TEAL; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ex, ey, 4.5 * pu, 0, 6.3); ctx.stroke();
      ctx.textAlign = "left"; ctx.font = FD(500, 10);
      ctx.fillStyle = TEAL; ctx.fillRect(lx, ly + lh + 24, 12, 3); ctx.fillText("Revenue", lx + 18, ly + lh + 29);
      ctx.fillStyle = COR; ctx.fillRect(lx + 90, ly + lh + 24, 12, 3); ctx.fillText("Cost", lx + 108, ly + lh + 29);
      ctx.globalAlpha = 1;
    }

    // donut chart
    const p3 = eo(sg(t, 2.5, 0.7)), o3 = panel(800, py, 340, ph, p3, "BY CHANNEL", out);
    if (p3 > 0) {
      const cx = 890, cy = py + o3 + 108, ro = 48, ri = 30, sw = eio(sg(t, 2.9, 1.2));
      let a0 = -Math.PI / 2; ctx.globalAlpha = p3 * out;
      SEG.forEach((g) => {
        const a = (g.v / 100) * 6.2832 * sw;
        ctx.beginPath(); ctx.arc(cx, cy, ro, a0, a0 + a); ctx.arc(cx, cy, ri, a0 + a, a0, true); ctx.closePath();
        ctx.fillStyle = g.c; ctx.fill();
        ctx.strokeStyle = PAN; ctx.lineWidth = 3; ctx.stroke(); a0 += a;
      });
      const lp = eo(sg(t, 3.8, 0.6)); ctx.globalAlpha = p3 * out * lp;
      ctx.textAlign = "center"; ctx.fillStyle = BRIGHT; ctx.font = FD(700, 19); ctx.fillText("38%", cx, cy + 4);
      ctx.fillStyle = TEXT; ctx.font = FD(600, 9); ctx.fillText("DIRECT", cx, cy + 17);
      ctx.textAlign = "left";
      SEG.forEach((g, i) => {
        const y = py + o3 + 172 + i * 17, q = eo(sg(t, 3.85 + i * 0.09, 0.45));
        ctx.globalAlpha = p3 * out * q;
        ctx.fillStyle = g.c; rr(824, y - 8, 8, 8, 2); ctx.fill();
        ctx.fillStyle = "#CBDCFF"; ctx.font = FD(500, 10); ctx.fillText(g.l, 838, y);
        ctx.textAlign = "right"; ctx.fillStyle = TEXT; ctx.fillText(g.v + "%", 1116, y); ctx.textAlign = "left";
      });
      ctx.globalAlpha = 1;
    }

    // footer
    const fp = eo(sg(t, 4.3, 0.7)); ctx.globalAlpha = fp * out;
    ctx.textAlign = "left"; ctx.fillStyle = TEXT; ctx.font = FD(500, 11);
    ctx.fillText("One dashboard. Every signal. Zero guesswork.", 40, 389);
    ctx.globalAlpha = 1;

    const wp = eo(sg(t, 4.55, 0.7));
    ctx.globalAlpha = wp * out; ctx.textAlign = "right"; ctx.fillStyle = BRIGHT;
    ctx.font = FD(600, 13); ctx.fillText(NAME, 1160, 389);
    ctx.textAlign = "left"; ctx.globalAlpha = 1;
  }

  // Default to a post-reveal timestamp, not 0: a static paint at t=0 would
  // render an empty frame before anything has faded in. t=6 sits well past
  // every element's reveal (~5.25s), so any static/paused/reduced-motion view
  // of this slide shows the fully-formed dashboard instead of a blank canvas.
  let running = false, raf = null, startPerf = 0, pausedElapsed = 6;

  function loopPos() {
    return (performance.now() - startPerf) / 1000;
  }

  function frame() {
    if (!running) return;
    draw(loopPos());
    raf = requestAnimationFrame(frame);
  }

  function paintStatic() {
    draw(pausedElapsed);
  }

  const teardownResize = onResize(cv, (newCtx) => {
    ctx = newCtx;
    if (!running) paintStatic();
  });

  paintStatic();

  return {
    start() {
      if (running) return;
      if (prefersReducedMotion()) { paintStatic(); return; }
      running = true;
      startPerf = performance.now() - pausedElapsed * 1000;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      if (running) pausedElapsed = loopPos();
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    },
    reset() {
      pausedElapsed = 0;
      if (running) startPerf = performance.now();
    },
    destroy() {
      this.stop();
      teardownResize();
    },
    paintStatic,
  };
}

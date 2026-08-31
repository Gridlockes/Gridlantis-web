/**
 * Shared helper for the banner animations.
 *
 * Every animation was authored against a fixed 1200x400 coordinate space with
 * hardcoded pixel positions. Rather than rewrite all that maths, this keeps the
 * drawing coordinates at 1200x400 and scales the backing store to the device
 * pixel ratio, so the canvas stays sharp on retina and ultrawide displays
 * without touching a single coordinate.
 */

export const BASE_W = 1200;
export const BASE_H = 400;

/**
 * Sizes the canvas backing store to its rendered size x DPR, then applies a
 * transform so ctx.fillRect(0,0,1200,400) covers it exactly.
 * Returns the 2D context.
 *
 * The authoring space is 3:1 but .banner-viewport is 2:1 (and never shorter
 * than 320px), so the two ratios only coincide around 1920px wide. Fitting to
 * width, as this used to do, left a band of dead canvas below the artwork at
 * every other size and — because the whole 1200px space was squeezed into a
 * ~350px phone — shrank the hardcoded 11px labels to about 3px.
 *
 * So scale to *cover* the box and centre the overflow, which is what the
 * stylesheet already asks for via object-fit. Wide screens are unchanged;
 * narrow ones crop the sides instead of shrinking everything to illegibility.
 */
export function fitCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2: 3x costs
                                                         // ~2.25x the fill rate
                                                         // for no visible gain
  const rect = canvas.getBoundingClientRect();
  const cssW = rect.width || BASE_W;
  const cssH = rect.height || BASE_H;

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // Cover: the larger of the two ratios, so neither axis leaves a gap.
  const scale = Math.max(cssW / BASE_W, cssH / BASE_H) * dpr;
  const offsetX = (cssW * dpr - BASE_W * scale) / 2;
  const offsetY = (cssH * dpr - BASE_H * scale) / 2;

  // Map the 1200x400 authoring space onto the real backing store.
  ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  return ctx;
}

/** Re-fits on resize, debounced to one call per animation frame. */
export function onResize(canvas, callback) {
  let queued = false;
  const handler = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      callback(fitCanvas(canvas));
    });
  };
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
}

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

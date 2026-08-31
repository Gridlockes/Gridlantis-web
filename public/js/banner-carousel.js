/**
 * Full-bleed banner carousel.
 *
 * The important behaviour: only ONE animation runs at a time. Each of these is
 * a requestAnimationFrame canvas loop; running three concurrently would burn
 * three times the CPU to render two invisible frames. The carousel starts the
 * active slide and stops every other one, and stops everything when the banner
 * scrolls out of view or the tab is hidden.
 */

import { createFollowerBanner } from "./banners/followers.js";
import { createNexusBanner } from "./banners/nexus.js";
import { createNeuronBanner } from "./banners/neuron.js";
import { createKpiBanner } from "./banners/kpi.js";

const FACTORIES = {
  followers: createFollowerBanner,
  nexus: createNexusBanner,
  neuron: createNeuronBanner,
  kpi: createKpiBanner,
};

const AUTOPLAY_MS = 9000;

export function initBannerCarousel(rootSelector = "[data-banner-carousel]") {
  const root = document.querySelector(rootSelector);
  if (!root) return null;

  const slides = [...root.querySelectorAll("[data-banner]")];
  const dots = [...root.querySelectorAll("[data-banner-dot]")];
  const prevBtn = root.querySelector("[data-banner-prev]");
  const nextBtn = root.querySelector("[data-banner-next]");
  const playBtn = root.querySelector("[data-banner-play]");
  const liveRegion = root.querySelector("[data-banner-live]");

  if (!slides.length) return null;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Build one instance per slide, lazily — constructing the neuron banner
  // generates L-system geometry, so we don't pay for it until it's shown.
  const instances = new Array(slides.length).fill(null);

  function instance(i) {
    if (instances[i]) return instances[i];
    const kind = slides[i].dataset.banner;
    const factory = FACTORIES[kind];
    if (!factory) {
      console.warn(`No banner factory for "${kind}"`);
      return null;
    }
    instances[i] = factory(slides[i]);
    return instances[i];
  }

  let index = 0;
  let autoplayId = null;
  let inView = false;
  let userPaused = false;

  function stopAll() {
    instances.forEach((inst) => inst && inst.stop());
  }

  function show(i, { announce = true } = {}) {
    index = (i + slides.length) % slides.length;

    slides.forEach((slide, n) => {
      const active = n === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      // inert would be ideal but support is uneven; this stops tab-focus
      // landing on off-screen slides.
      slide.querySelectorAll("button, a, input, select").forEach((el) => {
        el.tabIndex = active ? 0 : -1;
      });
    });

    dots.forEach((dot, n) => {
      const active = n === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", String(active));
      dot.tabIndex = active ? 0 : -1;
    });

    stopAll();
    const inst = instance(index);
    if (inst && inView && !userPaused) inst.start();
    else if (inst) inst.paintStatic(); // paint at least one frame so it isn't blank

    if (announce && liveRegion) {
      liveRegion.textContent = `Slide ${index + 1} of ${slides.length}: ${
        slides[index].dataset.label || slides[index].dataset.banner
      }`;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (reduceMotion.matches || userPaused || !inView) return;
    autoplayId = setInterval(() => show(index + 1, { announce: false }), AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayId !== null) {
      clearInterval(autoplayId);
      autoplayId = null;
    }
  }

  function setPaused(paused) {
    userPaused = paused;
    if (playBtn) {
      playBtn.setAttribute("aria-pressed", String(paused));
      playBtn.querySelector("[data-banner-play-label]").textContent = paused
        ? "Play"
        : "Pause";
      const icon = playBtn.querySelector("i");
      if (icon) icon.className = paused ? "fas fa-play" : "fas fa-pause";
    }
    if (paused) {
      stopAutoplay();
      stopAll();
    } else {
      const inst = instance(index);
      if (inst) inst.start();
      startAutoplay();
    }
  }

  // --- controls -------------------------------------------------------
  prevBtn?.addEventListener("click", () => { show(index - 1); startAutoplay(); });
  nextBtn?.addEventListener("click", () => { show(index + 1); startAutoplay(); });
  playBtn?.addEventListener("click", () => setPaused(!userPaused));

  dots.forEach((dot, n) =>
    dot.addEventListener("click", () => { show(n); startAutoplay(); })
  );

  // Arrow-key navigation on the dot group, per the tabs/carousel a11y pattern.
  root.querySelector("[data-banner-dots]")?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { show(index + 1); dots[index].focus(); }
    else if (e.key === "ArrowLeft") { show(index - 1); dots[index].focus(); }
    else return;
    e.preventDefault();
    startAutoplay();
  });

  // Pause on hover/focus so people can actually read a slide.
  root.addEventListener("mouseenter", stopAutoplay);
  root.addEventListener("mouseleave", startAutoplay);
  root.addEventListener("focusin", stopAutoplay);
  root.addEventListener("focusout", (e) => {
    if (!root.contains(e.relatedTarget)) startAutoplay();
  });

  // --- visibility -----------------------------------------------------
  // Off-screen canvases must not animate. This is the single biggest win for
  // scroll performance on a page that already has a hero carousel.
  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView) {
        if (!userPaused) { instance(index)?.start(); startAutoplay(); }
      } else {
        stopAll();
        stopAutoplay();
      }
    },
    { threshold: 0.15 }
  );
  observer.observe(root);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopAll(); stopAutoplay(); }
    else if (inView && !userPaused) { instance(index)?.start(); startAutoplay(); }
  });

  reduceMotion.addEventListener("change", () => {
    stopAll();
    stopAutoplay();
    instance(index)?.start();
    startAutoplay();
  });

  show(0, { announce: false });

  return {
    next: () => show(index + 1),
    prev: () => show(index - 1),
    goTo: (i) => show(i),
    destroy() {
      observer.disconnect();
      stopAutoplay();
      instances.forEach((inst) => inst && inst.destroy());
    },
  };
}

document.addEventListener("DOMContentLoaded", () => initBannerCarousel());

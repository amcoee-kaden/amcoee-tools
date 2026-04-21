/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Card interactions
   Apple Liquid Glass: no 3D rotation. CSS handles hover lift + press scale.
   This module retains its public API (init / applyTilt / initScrollReveal) for
   backward compatibility with existing call sites. It now only wires scroll
   reveal, since all other press/hover feedback lives in CSS.
   ══════════════════════════════════════════════════════════════════════════════ */

const CardTilt = (() => {
  let revealObserver = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // applyTilt is a no-op now — kept so old callers don't break.
  // Hover/press behavior lives in .card / .card-3d / .card-interactive CSS.
  function applyTilt(_root) { /* intentionally empty */ }

  function initScrollReveal(root) {
    if (prefersReducedMotion()) {
      // Skip animation entirely — mark items visible immediately.
      (root || document).querySelectorAll('.reveal').forEach(function(el) {
        el.classList.add('visible');
      });
      return;
    }

    if (revealObserver) revealObserver.disconnect();

    revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    (root || document).querySelectorAll('.reveal').forEach(function(el) {
      revealObserver.observe(el);
    });
  }

  function init() {
    initScrollReveal();
  }

  return { init, applyTilt, initScrollReveal };
})();

/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Liquid Glass specular sweep
   Tracks pointer position and updates --sx/--sy on the nearest glass surface
   under the cursor, so its ::after radial highlight follows the mouse.
   ══════════════════════════════════════════════════════════════════════════════ */

const LiquidGlass = (() => {
  var SELECTOR = '.card, .login-card, .lg-specular, .lg-surface';
  var running = false;
  var frame = null;
  var lastEvent = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function apply() {
    frame = null;
    if (!lastEvent) return;
    var e = lastEvent;
    // Find the nearest matching ancestor (supports hover on nested content).
    var el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (!el) return;
    var rect = el.getBoundingClientRect();
    el.style.setProperty('--sx', (e.clientX - rect.left) + 'px');
    el.style.setProperty('--sy', (e.clientY - rect.top) + 'px');
  }

  function onMove(e) {
    lastEvent = e;
    if (frame) return;
    frame = requestAnimationFrame(apply);
  }

  function init() {
    if (running || prefersReducedMotion()) return;
    running = true;
    // passive listener — we never preventDefault, so the browser can optimize.
    document.addEventListener('pointermove', onMove, { passive: true });
  }

  return { init };
})();

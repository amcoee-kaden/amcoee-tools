/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Liquid Glass motion
   Gives glass surfaces three interactive behaviors:
     1. Smoothed specular sweep — cursor position lerps into the element's
        --sx/--sy CSS vars over ~80-180ms, so the highlight "sloshes" behind
        the mouse like liquid instead of snapping to it.
     2. Click ripple — toggles .lg-pulse for 520ms, which triggers a
        refraction pulse animation defined in CSS.
     3. Passive by default; respects prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════════════════════ */

const LiquidGlass = (() => {
  // Surfaces big enough to benefit from the cursor-following specular.
  const SELECTOR = '.card, .login-card, .lg-specular, .lg-surface, .od-glass, .ed-glass, .modal';
  // Anything a user can press — broader set than SELECTOR so small controls pulse too.
  const PRESS_SELECTOR = '.card, .login-card, .lg-surface, .od-glass, .ed-glass, .modal, .btn, .sidebar-link, .login-user-btn, .login-submit, .pin-box';
  const LERP = 0.18;         // higher = snappier; lower = more slosh
  const IDLE_THRESHOLD = 0.4; // px difference below which we stop animating

  let running = false;
  let hoverEl = null;       // currently hovered glass surface
  let targetX = 0, targetY = 0;   // where the cursor actually is (px, local to el)
  let currentX = 0, currentY = 0; // where the specular highlight is drawn
  let raf = null;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function step() {
    raf = null;
    if (!hoverEl) return;
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    currentX += dx * LERP;
    currentY += dy * LERP;
    hoverEl.style.setProperty('--sx', currentX + 'px');
    hoverEl.style.setProperty('--sy', currentY + 'px');
    if (Math.abs(dx) > IDLE_THRESHOLD || Math.abs(dy) > IDLE_THRESHOLD) {
      raf = requestAnimationFrame(step);
    }
  }

  function onPointerMove(e) {
    const el = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
    if (el !== hoverEl) {
      hoverEl = el;
      if (el) {
        const rect = el.getBoundingClientRect();
        currentX = e.clientX - rect.left;
        currentY = e.clientY - rect.top;
        el.style.setProperty('--sx', currentX + 'px');
        el.style.setProperty('--sy', currentY + 'px');
      }
    }
    if (!hoverEl) return;
    const rect = hoverEl.getBoundingClientRect();
    targetX = e.clientX - rect.left;
    targetY = e.clientY - rect.top;
    if (!raf) raf = requestAnimationFrame(step);
  }

  function onPointerDown(e) {
    const el = e.target && e.target.closest ? e.target.closest(PRESS_SELECTOR) : null;
    if (!el) return;
    // Retrigger animation by removing + re-adding the class on next frame
    el.classList.remove('lg-pulse');
    void el.offsetWidth;                 // force reflow
    el.classList.add('lg-pulse');
    setTimeout(() => el.classList.remove('lg-pulse'), 560);
  }

  function init() {
    if (running || prefersReducedMotion()) return;
    running = true;
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
  }

  return { init };
})();

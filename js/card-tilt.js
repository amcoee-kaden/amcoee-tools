/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — CardTilt
   3D card hover tilt + IntersectionObserver scroll reveals.
   Desktop-only (hover: hover). Respects prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════════════════════ */

const CardTilt = (() => {
  const MAX_TILT = 6;
  const PERSPECTIVE = 1000;
  let enabled = false;

  function supportsHover() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function handleMouseMove(e) {
    var card = e.currentTarget;
    var rect = card.getBoundingClientRect();
    var x = (e.clientX - rect.left) / rect.width - 0.5;
    var y = (e.clientY - rect.top) / rect.height - 0.5;
    var tiltX = -y * MAX_TILT;
    var tiltY = x * MAX_TILT;
    card.style.transform = 'perspective(' + PERSPECTIVE + 'px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
  }

  function handleMouseLeave(e) {
    e.currentTarget.style.transform = '';
  }

  function applyTilt(root) {
    if (!enabled) return;
    var cards = (root || document).querySelectorAll('.card, .card-gradient, .stat-card');
    cards.forEach(function(card) {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = 'true';
      card.style.willChange = 'transform';
      card.style.transition = 'transform 150ms ease-out';
      card.addEventListener('mousemove', handleMouseMove);
      card.addEventListener('mouseleave', handleMouseLeave);
    });
  }

  var revealObserver = null;

  function initScrollReveal(root) {
    if (prefersReducedMotion()) return;
    if (revealObserver) revealObserver.disconnect();

    revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    var els = (root || document).querySelectorAll('.reveal');
    els.forEach(function(el) { revealObserver.observe(el); });
  }

  function init() {
    if (prefersReducedMotion()) return;
    enabled = supportsHover();
    if (enabled) applyTilt();
    initScrollReveal();
  }

  return { init, applyTilt, initScrollReveal };
})();

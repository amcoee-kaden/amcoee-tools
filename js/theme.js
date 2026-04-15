/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Theme Manager
   Hardcoded dark mode
   ══════════════════════════════════════════════════════════════════════════════ */

const Theme = (() => {
  function init() {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  return { init };
})();

/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Theme Manager
   Dark/light mode + accent color customization
   ══════════════════════════════════════════════════════════════════════════════ */

const Theme = (() => {
  function apply(prefs) {
    const theme = prefs.theme || 'dark';
    const accent = prefs.accentColor || '#f97316';

    document.documentElement.setAttribute('data-theme', theme);

    // Compute accent variants
    const r = parseInt(accent.slice(1, 3), 16);
    const g = parseInt(accent.slice(3, 5), 16);
    const b = parseInt(accent.slice(5, 7), 16);

    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-hover', darken(accent, 12));
    document.documentElement.style.setProperty('--accent-subtle', `rgba(${r}, ${g}, ${b}, 0.12)`);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.25)`);
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    return next;
  }

  function darken(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.max((num >> 16) - amt, 0);
    const g = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const b = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  // Accent color presets
  const ACCENT_PRESETS = [
    { name: 'Orange', value: '#f97316' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Amber', value: '#f59e0b' },
  ];

  return { apply, toggle, darken, ACCENT_PRESETS };
})();

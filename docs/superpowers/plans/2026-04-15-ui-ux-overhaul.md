# UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the AMCOEE Tools design system with AMCO brand colors, Outfit/JetBrains Mono typography, 3D card interactions, consolidated motion system, new component library pieces, and upgrade all 14 placeholder pages to module-ready tool templates with seed data.

**Architecture:** Vanilla JS SPA on GitHub Pages. CSS custom properties for theming. IIFE modules with globals. ToolRegistry for plugin architecture. No build step, no framework. All changes are additive/replacement to existing files.

**Tech Stack:** Vanilla CSS/JS, Google Fonts (Outfit, JetBrains Mono), IntersectionObserver, CSS transforms/transitions, requestAnimationFrame for 3D tilt.

---

## File Structure

```
amcoee-tools/
  css/
    design-system.css        ← REWRITE: consolidated tokens + components + animations
    dashboard.css            ← RENAME from owner-dashboard.css: page-specific styles only
    (enhancements.css)       ← DELETE: merged into design-system.css
  js/
    card-tilt.js             ← CREATE: global 3D tilt + scroll reveal system
    tools/
      job-board.js           ← CREATE: seed data + render
      scheduling.js          ← CREATE
      time-clock.js          ← CREATE
      tool-tracker.js        ← CREATE
      inventory-mgr.js       ← CREATE
      fleet-mgr.js           ← CREATE
      crm.js                 ← CREATE
      invoicing.js           ← CREATE
      expense-mgr.js         ← CREATE
      payroll-mgr.js         ← CREATE
      announcements.js       ← CREATE
      documents.js           ← CREATE
      safety-mgr.js          ← CREATE
  index.html                 ← MODIFY: new fonts, updated CSS refs
  (all 19 sub-pages)         ← MODIFY: updated CSS refs, tool scripts
```

---

### Task 1: Consolidate CSS — Design Tokens & Reset

**Files:**
- Rewrite: `css/design-system.css` (lines 1-120 — reset + variables section)

This task replaces the `:root` variable block with the spec's color system, adds new font imports, fluid type scale, consolidated easing curves, and new surface/amber/glow tokens.

- [ ] **Step 1: Replace the variable block in design-system.css**

Replace lines 1-120 of `css/design-system.css` with:

```css
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Design System
   Industrial-Premium aesthetic. AMCO brand blue + amber.
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Fonts ─────────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* ── CSS Reset ─────────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { height: 100%; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
body { height: 100%; font-family: 'Inter', system-ui, sans-serif; }
input, button, select, textarea { font-family: inherit; }
a { text-decoration: none; color: inherit; }
ul, ol { list-style: none; }
img { max-width: 100%; display: block; }
h1, h2, h3 { font-family: 'Outfit', system-ui, sans-serif; text-wrap: balance; }

/* ── Theme Variables ───────────────────────────────────────────────────────── */
:root {
  /* Font families */
  --font-display: 'Outfit', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Brand */
  --brand-black: #0a0a12;
  --brand-blue: #3b82f6;
  --brand-amber: #f59e0b;

  /* Backgrounds */
  --bg-primary: #06060a;
  --bg-secondary: #0c0c14;
  --bg-tertiary: #12121e;
  --bg-elevated: #161625;
  --bg-hover: #1c1c30;
  --bg-active: #24243a;

  /* Surfaces */
  --surface-card: #10101c;
  --surface-glass: rgba(16, 16, 28, 0.75);
  --surface-overlay: rgba(6, 6, 10, 0.85);

  /* Accent: Electric Blue */
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-subtle: rgba(59, 130, 246, 0.12);
  --accent-glow: rgba(59, 130, 246, 0.25);
  --accent-rgb: 59, 130, 246;

  /* Secondary: Amber */
  --amber: #f59e0b;
  --amber-hover: #fbbf24;
  --amber-subtle: rgba(245, 158, 11, 0.12);
  --amber-glow: rgba(245, 158, 11, 0.25);
  --amber-rgb: 245, 158, 11;

  /* Status */
  --status-success: #22c55e;
  --status-success-bg: rgba(34, 197, 94, 0.1);
  --status-warning: #f59e0b;
  --status-warning-bg: rgba(245, 158, 11, 0.1);
  --status-error: #ef4444;
  --status-error-bg: rgba(239, 68, 68, 0.1);
  --status-info: #3b82f6;
  --status-info-bg: rgba(59, 130, 246, 0.1);

  /* Text */
  --text-primary: #f0f0f5;
  --text-secondary: #8b8ba3;
  --text-tertiary: #5a5a78;
  --text-inverse: #06060a;

  /* Borders */
  --border-primary: rgba(255, 255, 255, 0.06);
  --border-secondary: rgba(255, 255, 255, 0.10);
  --border-subtle: rgba(255, 255, 255, 0.03);
  --border-accent: rgba(59, 130, 246, 0.3);
  --border-glow: rgba(59, 130, 246, 0.15);

  /* Gradients */
  --gradient-accent: linear-gradient(135deg, #3b82f6, #6366f1);
  --gradient-warm: linear-gradient(135deg, #f59e0b, #ef4444);
  --gradient-surface: linear-gradient(180deg, #12121e 0%, #0c0c14 100%);

  /* Easing (single source of truth) */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.65, 0.01, 0.05, 0.99);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-snap: cubic-bezier(0.85, 0, 0.15, 1);

  /* Durations */
  --dur-micro: 150ms;
  --dur-fast: 250ms;
  --dur-normal: 400ms;
  --dur-slow: 600ms;
  --dur-cinematic: 1000ms;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Fluid Type */
  --text-xs: clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem);
  --text-sm: clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem);
  --text-base: clamp(0.875rem, 0.85rem + 0.15vw, 1rem);
  --text-lg: clamp(1rem, 0.95rem + 0.2vw, 1.125rem);
  --text-xl: clamp(1.125rem, 1.05rem + 0.3vw, 1.25rem);
  --text-2xl: clamp(1.375rem, 1.2rem + 0.5vw, 1.75rem);
  --text-3xl: clamp(1.75rem, 1.5rem + 0.8vw, 2.25rem);
  --text-4xl: clamp(2.25rem, 1.8rem + 1.2vw, 3rem);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.25);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.3);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.35);
  --shadow-glow: 0 0 20px rgba(59,130,246,0.15);

  /* Z-index */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
}
```

- [ ] **Step 2: Verify the file parses**

Open `index.html` in a browser, open devtools, check that `getComputedStyle(document.documentElement).getPropertyValue('--accent')` returns `#3b82f6` (not `#6366f1`).

- [ ] **Step 3: Commit**

```bash
git add css/design-system.css
git commit -m "refactor: replace design tokens with AMCO brand palette + Outfit/JetBrains Mono fonts"
```

---

### Task 2: Consolidate CSS — Merge Components from enhancements.css

**Files:**
- Modify: `css/design-system.css` (append component styles)
- Delete: `css/enhancements.css`
- Modify: all HTML files (remove enhancements.css link)

This task takes unique component styles from enhancements.css, deduplicates them against design-system.css, appends the survivors, then deletes enhancements.css and updates all HTML `<link>` tags.

- [ ] **Step 1: Identify unique styles in enhancements.css not in design-system.css**

Read both files. The unique contributions from enhancements.css to keep:
- `.card-gradient`, `.card-gradient-success`, `.card-gradient-warning`, `.card-gradient-info`, `.card-gradient-accent`
- `.glass-heavy`, `.glass-glow` (but NOT `.glass` — design-system.css owns that)
- `.glow-accent`, `.glow-success`, `.glow-warning`
- Avatar ring pulse animation
- Timeline dot glow
- Tick up/down counter animations
- Page slide in/out transitions
- Search overlay styles (`.ed-search-*`)

Discard from enhancements.css (duplicates):
- `.glass` (conflicts with design-system.css)
- `gradientShift` keyframe (duplicate)
- `shimmer` keyframe (duplicate)
- `.btn-gradient` (duplicate)
- Any hardcoded `#f97316` (replace with `var(--amber)`)

- [ ] **Step 2: Append unique enhancements styles to design-system.css**

Append the unique gradient card, glow, avatar, timeline, counter, page transition, and search overlay styles to the end of `css/design-system.css`. Replace all hardcoded color values with CSS variables. Replace all hardcoded easing curves with `var(--ease-out)`, `var(--ease-spring)`, etc.

- [ ] **Step 3: Add new component styles per spec**

Append to `css/design-system.css` the following new components (full CSS from spec section 5):
- `.empty-state`, `.empty-state-icon`, `.empty-state-title`, `.empty-state-text`, `.empty-state-action`
- `.input-error`, `.input-success`, `.field-error`, `.field-hint`
- `.btn:disabled`, `.input:disabled`
- `[data-tooltip]` tooltip system
- `.dropdown`, `.dropdown-menu`, `.dropdown-item`
- `.tabs`, `.tab`, `.tab.active`
- `.pagination`, `.page-btn`
- `.progress`, `.progress-fill`
- `.breadcrumb`, `.breadcrumb-sep`, `.breadcrumb-link`, `.breadcrumb-current`

- [ ] **Step 4: Add stagger entrance utility**

Append to `css/design-system.css`:

```css
/* ── Stagger Entrance ──────────────────────────────────────────────────────── */
.stagger-enter > * {
  opacity: 0;
  transform: translateY(1.5rem);
  animation: staggerUp var(--dur-slow) var(--ease-out) forwards;
}
.stagger-enter > *:nth-child(1) { animation-delay: 0ms; }
.stagger-enter > *:nth-child(2) { animation-delay: 80ms; }
.stagger-enter > *:nth-child(3) { animation-delay: 160ms; }
.stagger-enter > *:nth-child(4) { animation-delay: 240ms; }
.stagger-enter > *:nth-child(5) { animation-delay: 320ms; }
.stagger-enter > *:nth-child(6) { animation-delay: 400ms; }
.stagger-enter > *:nth-child(7) { animation-delay: 480ms; }
.stagger-enter > *:nth-child(8) { animation-delay: 560ms; }

@keyframes staggerUp {
  to { opacity: 1; transform: translateY(0); }
}

/* ── Scroll Reveal ─────────────────────────────────────────────────────────── */
.reveal {
  opacity: 0;
  transform: translateY(2rem);
  transition: opacity var(--dur-slow) var(--ease-out),
              transform var(--dur-slow) var(--ease-out);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── Reduced Motion ────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Add 3D button press to .btn**

Find the existing `.btn` rule in design-system.css. Add physical depth:

```css
.btn {
  /* ...existing styles... */
  transform: translateY(0);
  box-shadow: 0 2px 0 rgba(0,0,0,0.3);
  transition: transform var(--dur-micro) ease,
              box-shadow var(--dur-micro) ease,
              background var(--dur-fast) ease,
              color var(--dur-fast) ease;
}
.btn:hover {
  transform: translateY(1px);
  box-shadow: 0 1px 0 rgba(0,0,0,0.3);
}
.btn:active {
  transform: translateY(2px) scale(0.97);
  box-shadow: none;
}
```

- [ ] **Step 6: Add glass morphism (single definition)**

```css
.glass {
  background: rgba(16, 16, 28, 0.65);
  backdrop-filter: blur(12px) saturate(1.3);
  -webkit-backdrop-filter: blur(12px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 1.5rem 3rem -0.75rem rgba(0, 0, 0, 0.25),
              inset 0 0.5px 0 rgba(255, 255, 255, 0.08);
}
```

Remove any other `.glass` definitions.

- [ ] **Step 7: Delete enhancements.css**

```bash
rm css/enhancements.css
```

- [ ] **Step 8: Update all HTML files to remove enhancements.css link**

In every `.html` file, remove the line:
```html
<link rel="stylesheet" href="css/enhancements.css"/>
```

Also in every HTML file, add Outfit and JetBrains Mono font preconnects if not present:
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
```

- [ ] **Step 9: Rename owner-dashboard.css to dashboard.css**

```bash
mv css/owner-dashboard.css css/dashboard.css
```

Update all HTML files: replace `href="css/owner-dashboard.css"` with `href="css/dashboard.css"`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: consolidate CSS — merge enhancements, add new components, delete duplicates"
```

---

### Task 3: Create 3D Card Tilt & Scroll Reveal System

**Files:**
- Create: `js/card-tilt.js`

This creates a global `CardTilt` module that applies 3D perspective tilt to `.card` elements on hover, and IntersectionObserver scroll reveals to `.reveal` elements.

- [ ] **Step 1: Create js/card-tilt.js**

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — CardTilt
   3D card hover tilt + IntersectionObserver scroll reveals.
   Desktop-only (hover: hover). Respects prefers-reduced-motion.
   ══════════════════════════════════════════════════════════════════════════════ */

const CardTilt = (() => {
  const MAX_TILT = 6; // degrees
  const PERSPECTIVE = 1000;
  let enabled = false;

  function supportsHover() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function handleMouseMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const tiltX = -y * MAX_TILT;
    const tiltY = x * MAX_TILT;
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

  // ── Scroll Reveal via IntersectionObserver ─────────────────────────────────

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

  // ── Init ───────────────────────────────────────────────────────────────────

  function init() {
    if (prefersReducedMotion()) return;
    enabled = supportsHover();
    if (enabled) applyTilt();
    initScrollReveal();
  }

  return { init, applyTilt, initScrollReveal };
})();
```

- [ ] **Step 2: Add card-tilt.js to shell.js initialization**

In `js/shell.js`, find the section where modules are initialized (around line 860-880 where `Theme.init()`, `Auth.startHeartbeat()`, etc. are called). Add after SecurityMonitor init:

```javascript
if (typeof CardTilt !== 'undefined' && CardTilt.init) {
  CardTilt.init();
}
```

- [ ] **Step 3: Add card-tilt.js script tag to all sub-pages**

In every HTML file that loads `shell.js`, add before the shell.js line:

```html
<script src="js/card-tilt.js"></script>
```

This goes after `security-monitor.js` and before `shell.js`.

- [ ] **Step 4: Commit**

```bash
git add js/card-tilt.js js/shell.js *.html
git commit -m "feat: add 3D card tilt on hover + IntersectionObserver scroll reveals"
```

---

### Task 4: Build Tool Page Template Pattern — Job Board

**Files:**
- Create: `js/tools/job-board.js`
- Modify: `jobs.html`

This establishes the pattern every tool page will follow. Job Board is first because it's the most prominent Operations tool.

- [ ] **Step 1: Create js/tools/ directory and job-board.js**

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Job Board
   Manage active jobs, dispatch crews, track project progress.
   ══════════════════════════════════════════════════════════════════════════════ */

const JobBoard = (() => {
  'use strict';

  const COLLECTION = 'jobs';

  const SEED_DATA = [
    { id: 'job_1', title: 'Panel Upgrade — 431 Oak St', client: 'Thompson Residence', status: 'in_progress', priority: 'high', crew: ['u3'], estimatedHours: 8, address: '431 Oak St, Braintree MA', description: '200A panel upgrade, replace Federal Pacific breakers', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'job_2', title: 'HVAC Wiring — Meridian Office', client: 'Meridian Corp', status: 'scheduled', priority: 'medium', crew: ['u5'], estimatedHours: 16, address: '100 Meridian Blvd, Quincy MA', description: 'New HVAC circuit installation, 3-phase', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'job_3', title: 'Emergency — No Power 2nd Floor', client: 'Davis Family', status: 'urgent', priority: 'critical', crew: ['u3', 'u5'], estimatedHours: 4, address: '19 Maple Ave, Weymouth MA', description: 'Total power loss on 2nd floor, likely breaker or wiring fault', createdAt: new Date().toISOString() },
  ];

  const STATUS_CONFIG = {
    urgent:      { label: 'Urgent',      color: 'var(--status-error)',   bg: 'var(--status-error-bg)' },
    in_progress: { label: 'In Progress', color: 'var(--amber)',          bg: 'var(--amber-subtle)' },
    scheduled:   { label: 'Scheduled',   color: 'var(--accent)',         bg: 'var(--accent-subtle)' },
    completed:   { label: 'Completed',   color: 'var(--status-success)', bg: 'var(--status-success-bg)' },
    invoiced:    { label: 'Invoiced',    color: 'var(--text-tertiary)',  bg: 'var(--bg-tertiary)' },
  };

  const PRIORITY_CONFIG = {
    critical: { label: 'Critical', color: 'var(--status-error)' },
    high:     { label: 'High',     color: 'var(--amber)' },
    medium:   { label: 'Medium',   color: 'var(--accent)' },
    low:      { label: 'Low',      color: 'var(--text-tertiary)' },
  };

  function s(str) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(String(str || '')) : String(str || '');
  }

  async function ensureSeedData() {
    var existing = await DataStore.list(COLLECTION);
    if (existing.length === 0) {
      for (var job of SEED_DATA) {
        await DataStore.create(COLLECTION, job);
      }
    }
  }

  function statusBadge(status) {
    var cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
    return '<span class="badge" style="background:' + cfg.bg + ';color:' + cfg.color + ';border:1px solid ' + cfg.color + '22">' + s(cfg.label) + '</span>';
  }

  function priorityDot(priority) {
    var cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
    return '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + cfg.color + '" title="' + s(cfg.label) + '"></span>';
  }

  function timeAgo(iso) {
    if (typeof dayjs !== 'undefined') return dayjs(iso).fromNow ? dayjs(iso).fromNow() : dayjs(iso).format('MMM D');
    var diff = Date.now() - new Date(iso).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  async function render(container, session) {
    if (!container) return;
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:48px"><div class="spinner"></div></div>';

    await ensureSeedData();
    var jobs = await DataStore.list(COLLECTION);

    var filterStatus = '';
    var search = '';

    function filtered() {
      return jobs.filter(function(j) {
        if (filterStatus && j.status !== filterStatus) return false;
        if (search) {
          var q = search.toLowerCase();
          if (!j.title.toLowerCase().includes(q) && !j.client.toLowerCase().includes(q) && !(j.address || '').toLowerCase().includes(q)) return false;
        }
        return true;
      }).sort(function(a, b) {
        var order = { urgent: 0, in_progress: 1, scheduled: 2, completed: 3, invoiced: 4 };
        return (order[a.status] || 9) - (order[b.status] || 9);
      });
    }

    function build() {
      var list = filtered();
      var statusOptions = Object.entries(STATUS_CONFIG).map(function(e) {
        return '<option value="' + e[0] + '" ' + (filterStatus === e[0] ? 'selected' : '') + '>' + s(e[1].label) + '</option>';
      }).join('');

      var urgentCount = jobs.filter(function(j) { return j.status === 'urgent'; }).length;
      var activeCount = jobs.filter(function(j) { return j.status === 'in_progress'; }).length;
      var scheduledCount = jobs.filter(function(j) { return j.status === 'scheduled'; }).length;

      container.innerHTML =
        '<div class="stagger-enter">' +

        /* Header */
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:24px">' +
          '<div>' +
            '<h2 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:800;color:var(--text-primary)">Job Board</h2>' +
            '<p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">' + list.length + ' of ' + jobs.length + ' jobs</p>' +
          '</div>' +
          '<button class="btn btn-primary" id="btn-add-job">+ New Job</button>' +
        '</div>' +

        /* Stat Cards */
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px">' +
          '<div class="card" style="padding:16px;border-left:3px solid var(--status-error)">' +
            '<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em">Urgent</div>' +
            '<div style="font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:700;color:var(--status-error);font-variant-numeric:tabular-nums">' + urgentCount + '</div>' +
          '</div>' +
          '<div class="card" style="padding:16px;border-left:3px solid var(--amber)">' +
            '<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em">In Progress</div>' +
            '<div style="font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:700;color:var(--amber);font-variant-numeric:tabular-nums">' + activeCount + '</div>' +
          '</div>' +
          '<div class="card" style="padding:16px;border-left:3px solid var(--accent)">' +
            '<div style="font-size:var(--text-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em">Scheduled</div>' +
            '<div style="font-family:var(--font-mono);font-size:var(--text-2xl);font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums">' + scheduledCount + '</div>' +
          '</div>' +
        '</div>' +

        /* Filters */
        '<div class="card" style="padding:16px;margin-bottom:20px">' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
            '<input class="input" id="job-search" placeholder="Search jobs, clients, addresses..." value="' + s(search) + '" style="flex:1;min-width:200px">' +
            '<select class="input" id="filter-status" style="min-width:150px">' +
              '<option value="">All Status</option>' + statusOptions +
            '</select>' +
          '</div>' +
        '</div>' +

        /* Job Cards */
        (list.length === 0
          ? '<div class="empty-state"><div class="empty-state-icon" style="font-size:48px;margin-bottom:16px">📋</div><div class="empty-state-title" style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;margin-bottom:8px">No jobs match</div><div class="empty-state-text">Try adjusting your filters or create a new job.</div></div>'
          : '<div style="display:grid;gap:12px">' +
            list.map(function(job) {
              var users = typeof Auth !== 'undefined' ? Auth.getUsers() : [];
              var crewNames = (job.crew || []).map(function(uid) {
                var u = users.find(function(x) { return x.id === uid; });
                return u ? s(u.name) : uid;
              }).join(', ');
              return '<div class="card" style="padding:20px;cursor:pointer;transition:transform var(--dur-fast) var(--ease-out),box-shadow var(--dur-fast) var(--ease-out)" onmouseenter="this.style.transform=\'translateY(-2px)\'" onmouseleave="this.style.transform=\'\'">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">' +
                  '<div style="flex:1;min-width:0">' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
                      priorityDot(job.priority) +
                      '<h3 style="font-weight:700;font-size:var(--text-base);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + s(job.title) + '</h3>' +
                    '</div>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:8px;font-size:var(--text-xs);color:var(--text-secondary)">' +
                      '<span>' + s(job.client) + '</span>' +
                      '<span style="color:var(--text-tertiary)">·</span>' +
                      '<span>' + s(job.address || '—') + '</span>' +
                    '</div>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">' +
                    statusBadge(job.status) +
                  '</div>' +
                '</div>' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle)">' +
                  '<div style="display:flex;gap:12px;font-size:var(--text-xs);color:var(--text-tertiary)">' +
                    '<span>Crew: ' + (crewNames || 'Unassigned') + '</span>' +
                    '<span>' + (job.estimatedHours || '?') + 'h est.</span>' +
                  '</div>' +
                  '<span style="font-size:var(--text-xs);color:var(--text-tertiary)">' + timeAgo(job.createdAt) + '</span>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>') +

        '</div>'; // end stagger-enter

      // Bindings
      container.querySelector('#job-search').addEventListener('input', function(e) { search = e.target.value; build(); });
      container.querySelector('#filter-status').addEventListener('change', function(e) { filterStatus = e.target.value; build(); });
      container.querySelector('#btn-add-job').addEventListener('click', function() {
        UI.toast('Job creation coming soon', 'info');
      });

      // Re-init card tilt for new cards
      if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
    }

    build();
  }

  // Register with ToolRegistry
  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({
      id: 'jobs',
      name: 'Job Board',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      permissions: ['jobs'],
      section: 'Operations',
    });
  }

  return { render };
})();
```

- [ ] **Step 2: Update jobs.html**

Replace the entire inline script block with:

```html
  <script src="js/card-tilt.js"></script>
  <script src="js/shell.js"></script>
  <script src="js/tools/job-board.js"></script>
  <script>
    Shell.init({ pageId: 'jobs', pageTitle: 'Job Board' });
    var main = document.getElementById('main-body');
    var session = Auth.getSession();
    if (main && session) JobBoard.render(main, session);
  </script>
```

Also remove the `enhancements.css` link and rename `owner-dashboard.css` to `dashboard.css` in the `<link>` tags (if not already done in Task 2).

- [ ] **Step 3: Test in browser**

Open `jobs.html`, log in. Verify:
- 3 seed jobs appear with status badges
- Search filters work
- Cards have 3D tilt on hover
- Stagger entrance animation plays
- Stat cards show correct counts
- No console errors

- [ ] **Step 4: Commit**

```bash
git add js/tools/job-board.js jobs.html
git commit -m "feat: add Job Board tool page with seed data, search, status cards"
```

---

### Task 5: Build Remaining 12 Tool Pages

**Files:**
- Create: `js/tools/scheduling.js`, `js/tools/time-clock.js`, `js/tools/tool-tracker.js`, `js/tools/inventory-mgr.js`, `js/tools/fleet-mgr.js`, `js/tools/crm.js`, `js/tools/invoicing.js`, `js/tools/expense-mgr.js`, `js/tools/payroll-mgr.js`, `js/tools/announcements.js`, `js/tools/documents.js`, `js/tools/safety-mgr.js`
- Modify: `schedule.html`, `timeclock.html`, `tools.html`, `inventory.html`, `fleet.html`, `crm.html`, `invoicing.html`, `expenses.html`, `payroll.html`, `announcements.html`, `documents.html`, `safety.html`

Each follows the exact same pattern as Task 4 (JobBoard). Each module:
1. Defines `COLLECTION`, `SEED_DATA`, status/priority configs
2. Has `ensureSeedData()`, `render(container, session)` with header, stat cards, filters, card list, empty state
3. Registers with `ToolRegistry`
4. Uses `stagger-enter`, `CardTilt.applyTilt()`, `var(--font-display)`, `var(--font-mono)`, CSS variable colors

**Seed data per tool:**

| Tool | Collection | Seed Records |
|------|-----------|-------------|
| Scheduling | `schedule_entries` | 5 entries this week (Mon install, Tue inspection, Wed emergency, Thu maintenance, Fri meeting) |
| Time Clock | `clock_entries` | Today's in/out for Mike Torres (6:45am in), Sarah Ochoa (8:00am in), James Bell (7:15am in) |
| Tool Tracker | `tracked_tools` | 8 tools: 2 DeWalt drills, Fluke multimeter, Klein wire strippers, Milwaukee sawzall, conduit bender, fish tape, voltage tester |
| Inventory | `inventory_items` | 10 items: Romex 12/2, EMT conduit, wire nuts, breakers, outlets, switches, junction boxes, PVC pipe, cable ties, electrical tape |
| Fleet | `vehicles` | 3 vehicles: 2019 Ford F-150 (active), 2021 Transit Van (active), 2017 F-250 (maintenance) |
| CRM | `customers` | 5 contacts: Thompson, Meridian Corp, Davis Family, Quincy School Dept, Harbor Point Condos |
| Invoicing | `invoices` | 3 invoices: INV-2026-039 (paid $2,400), INV-2026-040 (pending $5,800), INV-2026-041 (overdue $1,200) |
| Expenses | `expense_reports` | 4 reports: materials $342, fuel $89, tool rental $150, permit fees $75 |
| Payroll | `payroll_summary` | Current period summary with hours per employee |
| Announcements | `announcements` | 2: safety meeting Friday, new truck delivery Monday |
| Documents | `document_categories` | 5 categories: Safety Certs, Permits, Insurance, Training, Templates |
| Safety | `safety_checklists` | 3: daily vehicle inspection, job site hazard assessment, PPE compliance |

- [ ] **Step 1: Create all 12 tool JS files following the JobBoard pattern**

Each file is structured identically to `js/tools/job-board.js` from Task 4, with tool-specific `COLLECTION`, `SEED_DATA`, `STATUS_CONFIG`, `render()`, and `ToolRegistry.register()`.

- [ ] **Step 2: Update all 12 HTML files**

Replace each page's inline placeholder script with the pattern from Task 4 Step 2, loading the tool-specific JS file and calling `ToolName.render(main, session)`.

- [ ] **Step 3: Test each page loads and shows seed data**

Open each page, verify seed data renders, search works, cards tilt, stagger animates.

- [ ] **Step 4: Commit**

```bash
git add js/tools/ schedule.html timeclock.html tools.html inventory.html fleet.html crm.html invoicing.html expenses.html payroll.html announcements.html documents.html safety.html
git commit -m "feat: add all 12 tool pages with seed data, search, filters, 3D interactions"
```

---

### Task 6: Polish Working Pages — Login, Command Center, Dashboard

**Files:**
- Modify: `index.html` (login page)
- Modify: `js/owner-dashboard.js`
- Modify: `js/enhanced-dashboard.js`

- [ ] **Step 1: Login page — update fonts and colors**

In `index.html`:
- Add Outfit + JetBrains Mono font links in `<head>`
- Change the "AMCOEE Tools" title to use `font-family: 'Outfit', sans-serif`
- Update any hardcoded `#6366f1` to `var(--accent)` or `#3b82f6`
- Update any hardcoded `#f97316` to `var(--amber)` or `#f59e0b`
- Add grain texture overlay to login wrapper background:

```css
.login-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  pointer-events: none;
  opacity: 0.35;
  mix-blend-mode: overlay;
  z-index: 1;
}
```

- Add stagger-enter to user list rendering
- User select buttons: add glow ring on hover

- [ ] **Step 2: Command Center — update stat card values to use Outfit + mono**

In `js/owner-dashboard.js`, find stat card rendering. Update:
- Stat values: `font-family: var(--font-display)` for large numbers
- Trend percentages: `font-family: var(--font-mono); font-variant-numeric: tabular-nums`
- Replace any hardcoded indigo (#6366f1) with `var(--accent)`
- Add `class="stagger-enter"` to the stat cards container
- Add `class="reveal"` to panels below the fold (Row 3, Row 4)

- [ ] **Step 3: Dashboard — same font updates**

In `js/enhanced-dashboard.js`:
- Welcome heading: `font-family: var(--font-display)`
- Stat values: `font-family: var(--font-mono); font-variant-numeric: tabular-nums`
- Replace hardcoded indigo with `var(--accent)`
- Add stagger-enter to stats and cards

- [ ] **Step 4: Commit**

```bash
git add index.html js/owner-dashboard.js js/enhanced-dashboard.js
git commit -m "polish: update login + command center + dashboard with Outfit font, AMCO colors, stagger animations"
```

---

### Task 7: Polish Working Pages — Employees, Reports, Settings

**Files:**
- Modify: `js/org-manager.js`
- Modify: `js/report-builder.js`
- Modify: `settings.html`

- [ ] **Step 1: Employees page — font + color updates**

In `js/org-manager.js`:
- Page titles (`<h2>`): add `font-family:var(--font-display)`
- Replace hardcoded `#6366f1` with `var(--accent)` in any inline styles
- Employee table: add `font-variant-numeric: tabular-nums` on ID columns
- Onboarding wizard: step indicator uses `var(--accent)` not hardcoded indigo
- Add `class="stagger-enter"` to employee table body
- Department cards: already have colored top border, just ensure they use CSS variables

- [ ] **Step 2: Reports page — font + color updates**

In `js/report-builder.js`:
- Page title: `font-family:var(--font-display)`
- Chart type buttons: use `var(--accent)` for active state
- Template cards: ensure they respond to CardTilt
- Replace any hardcoded `#6366f1` with `var(--accent)`

- [ ] **Step 3: Settings page — font + stagger**

In `settings.html` inline script:
- Settings heading: `font-family:var(--font-display)`
- Tab bar: use `.tabs` / `.tab` classes from new component library
- Storage progress bar: use `.progress` / `.progress-fill` classes
- Add `stagger-enter` to department/group grids

- [ ] **Step 4: Commit**

```bash
git add js/org-manager.js js/report-builder.js settings.html
git commit -m "polish: update employees + reports + settings with Outfit font, AMCO colors, stagger"
```

---

### Task 8: Update Service Worker + Push

**Files:**
- Modify: `sw.js`

- [ ] **Step 1: Update service worker cache list**

In `sw.js`, add the new Google Fonts URLs to the cache list:

```javascript
'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap',
'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap',
```

- [ ] **Step 2: Bump cache version**

Change the cache name string (e.g., `amcoee-v2` → `amcoee-v3`) to force a cache refresh on existing installations.

- [ ] **Step 3: Final commit and push**

```bash
git add sw.js
git commit -m "chore: update service worker cache for new fonts + bump cache version"
git push origin master
```

---

## Execution Notes

- **Tasks 1-2** (CSS consolidation) must run sequentially — Task 2 depends on Task 1's new variables.
- **Task 3** (card-tilt.js) can run after Task 2 (needs the new CSS classes).
- **Tasks 4-5** (tool pages) depend on Tasks 1-3 being complete.
- **Tasks 6-7** (polish) depend on Tasks 1-3 being complete.
- **Task 4-5 and Tasks 6-7** can run in parallel.
- **Task 8** runs last after everything else is committed.

Total estimated files touched: 3 CSS, 1 new JS module, 13 new tool JS files, 20 HTML files, 3 existing JS files, 1 service worker.

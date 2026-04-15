# AMCOEE Tools — UI/UX Overhaul Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Scope:** Full visual overhaul of design system, motion architecture, 3D interactions, component library, and all 20 pages (6 working + 14 placeholder)

**Mood:** Industrial-Premium. A luxury control center for a trade company. Not sterile SaaS, not toy-like. The app should feel like the cockpit of a well-run electrical operation.

**Signature Move:** Every interactive surface has physical depth. Cards tilt, buttons press, panels float. The whole app feels like you could reach in and touch it.

**Inspiration:** Dribbble shot by Mahmud Arif (SaaS Website Mobile), amcoee.com brand identity, SVZ Design 3D patterns, Superlist's glow effects.

---

## 1. Color System

### Brand Colors (from amcoee.com)

The AMCO brand uses black, white, and a service blue. We electrify that palette for the dark dashboard context.

```css
:root[data-theme="dark"] {
  /* ── Brand ────────────────────────────────────────── */
  --brand-black: #0a0a12;
  --brand-blue: #3b82f6;
  --brand-amber: #f59e0b;

  /* ── Backgrounds (warm undertone, not pure black) ── */
  --bg-primary: #06060a;
  --bg-secondary: #0c0c14;
  --bg-tertiary: #12121e;
  --bg-elevated: #161625;
  --bg-hover: #1c1c30;
  --bg-active: #24243a;

  /* ── Surfaces ─────────────────────────────────────── */
  --surface-card: #10101c;
  --surface-glass: rgba(16, 16, 28, 0.75);
  --surface-overlay: rgba(6, 6, 10, 0.85);

  /* ── Accent: Electric Blue (primary action) ────────── */
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --accent-subtle: rgba(59, 130, 246, 0.12);
  --accent-glow: rgba(59, 130, 246, 0.25);
  --accent-rgb: 59, 130, 246;

  /* ── Secondary Accent: Amber (energy/warnings) ────── */
  --amber: #f59e0b;
  --amber-hover: #fbbf24;
  --amber-subtle: rgba(245, 158, 11, 0.12);
  --amber-glow: rgba(245, 158, 11, 0.25);
  --amber-rgb: 245, 158, 11;

  /* ── Status ───────────────────────────────────────── */
  --status-success: #22c55e;
  --status-success-bg: rgba(34, 197, 94, 0.1);
  --status-warning: #f59e0b;
  --status-warning-bg: rgba(245, 158, 11, 0.1);
  --status-error: #ef4444;
  --status-error-bg: rgba(239, 68, 68, 0.1);
  --status-info: #3b82f6;
  --status-info-bg: rgba(59, 130, 246, 0.1);

  /* ── Text ─────────────────────────────────────────── */
  --text-primary: #f0f0f5;
  --text-secondary: #8b8ba3;
  --text-tertiary: #5a5a78;
  --text-inverse: #06060a;

  /* ── Borders ──────────────────────────────────────── */
  --border-primary: rgba(255, 255, 255, 0.06);
  --border-secondary: rgba(255, 255, 255, 0.10);
  --border-subtle: rgba(255, 255, 255, 0.03);
  --border-accent: rgba(59, 130, 246, 0.3);
  --border-glow: rgba(59, 130, 246, 0.15);

  /* ── Gradients ────────────────────────────────────── */
  --gradient-accent: linear-gradient(135deg, #3b82f6, #6366f1);
  --gradient-warm: linear-gradient(135deg, #f59e0b, #ef4444);
  --gradient-surface: linear-gradient(180deg, #12121e 0%, #0c0c14 100%);
}
```

### Key Change from Current
- Primary accent shifts from indigo `#6366f1` to electric blue `#3b82f6` (matches AMCO brand)
- Amber `#f59e0b` becomes a first-class secondary accent (not just warning color)
- Orange (`#f97316`) hardcodes eliminated, replaced with amber variable
- All surfaces gain warm undertones (`#0a0a12` not `#050507`)

---

## 2. Typography

### Font Stack

```css
/* Display headings: Outfit — geometric, modern, wide */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

/* Body/UI: Inter — best-in-class for data-dense dashboards */
/* Already loaded */

/* Monospace: JetBrains Mono — for data values, PINs, IDs */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:root {
  --font-display: 'Outfit', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Usage Rules
- `--font-display`: page titles, section headings (h1, h2), stat card values, login title, empty state headings
- `--font-body`: everything else (nav, body text, labels, buttons, table cells, form inputs)
- `--font-mono`: data values, employee IDs, session tokens, PINs, timestamps, currency amounts

### Type Scale (fluid)
```css
--text-xs: clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem);    /* 11-12px */
--text-sm: clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem);   /* 13-14px */
--text-base: clamp(0.875rem, 0.85rem + 0.15vw, 1rem);       /* 14-16px */
--text-lg: clamp(1rem, 0.95rem + 0.2vw, 1.125rem);          /* 16-18px */
--text-xl: clamp(1.125rem, 1.05rem + 0.3vw, 1.25rem);       /* 18-20px */
--text-2xl: clamp(1.375rem, 1.2rem + 0.5vw, 1.75rem);       /* 22-28px */
--text-3xl: clamp(1.75rem, 1.5rem + 0.8vw, 2.25rem);        /* 28-36px */
--text-4xl: clamp(2.25rem, 1.8rem + 1.2vw, 3rem);           /* 36-48px */
```

### Polish Rules
- `-webkit-font-smoothing: antialiased` globally
- `font-variant-numeric: tabular-nums` on all counters, prices, tables, clocks
- `text-wrap: balance` on h1, h2, h3
- Never change font-weight on hover (causes layout shift)

---

## 3. Motion System

### Easing Curves (consolidated, replacing 3 competing sets)

```css
:root {
  /* Primary curves */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* Entrances, reveals */
  --ease-in-out: cubic-bezier(0.65, 0.01, 0.05, 0.99); /* Weighty movement */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* Playful overshoot */
  --ease-snap: cubic-bezier(0.85, 0, 0.15, 1);       /* UI state changes */

  /* Durations */
  --dur-micro: 150ms;    /* Button press, checkbox */
  --dur-fast: 250ms;     /* Hover states, tooltips */
  --dur-normal: 400ms;   /* Panel open, tab switch */
  --dur-slow: 600ms;     /* Page entrance, card reveal */
  --dur-cinematic: 1000ms; /* Hero animations, login */
}
```

### Animation Rules (per design-engineering skill)
1. Every animation needs a job: ENTER, STATE, CONTINUITY, or DELIGHT
2. High-frequency interactions (100+ daily): NO animation
3. Only animate `transform` and `opacity` (GPU-composited)
4. Always respect `prefers-reduced-motion`
5. Exits shorter than entries (150ms vs 250ms, 12px vs 20px)
6. Interactive elements use transitions (interruptible), not keyframes

### Stagger Pattern (global standard)
```css
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
/* Max 6 children staggered. Total under 400ms + animation duration */

@keyframes staggerUp {
  to { opacity: 1; transform: translateY(0); }
}
```

### Page Entrance
Every page gets a staggered entrance on Shell.init():
1. Header fades in (0ms)
2. Page title + breadcrumb (80ms)
3. Primary content cards stagger in (160ms+)
4. Secondary panels stagger in (320ms+)

### Scroll Reveals
IntersectionObserver at threshold 0.15, rootMargin -50px bottom. Elements below the fold get `.reveal` class, animate on enter, unobserve after first trigger.

---

## 4. 3D Interaction System

### Card Tilt (on every `.card` with hover capability)

```css
.card-3d {
  perspective: 1000px;
}
.card-3d-inner {
  transition: transform var(--dur-micro) ease-out;
  transform-style: preserve-3d;
  will-change: transform;
}
```

```js
// Applied via a global CardTilt.init() on Shell.init()
// Only on @media (hover: hover) and (pointer: fine)
// Max rotation: 8deg (subtle, not carnival)
// Resets smoothly on mouseleave
```

### Stat Cards (Command Center, Dashboard)
- Float above surface with layered shadows
- Subtle glow border matching accent color
- Counter values tick up with animated digits
- Micro sparklines animate on entrance
- 3D tilt on hover (4deg max for stat cards, they're small)

### Button Press (physical depth)
```css
.btn {
  transform: translateY(0);
  box-shadow: 0 2px 0 var(--btn-shadow);
  transition: transform var(--dur-micro) ease, box-shadow var(--dur-micro) ease;
}
.btn:hover {
  transform: translateY(1px);
  box-shadow: 0 1px 0 var(--btn-shadow);
}
.btn:active {
  transform: translateY(2px);
  box-shadow: none;
}
```

### Glass Morphism (consolidated, ONE definition)
```css
.glass {
  background: rgba(16, 16, 28, 0.65);
  backdrop-filter: blur(12px) saturate(1.3);
  -webkit-backdrop-filter: blur(12px) saturate(1.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 1.5rem 3rem -0.75rem rgba(0, 0, 0, 0.25),
    inset 0 0.5px 0 rgba(255, 255, 255, 0.08);
}
```

### Login Card (signature piece)
- 3D tilt following cursor (full card, not just hover)
- Animated gradient mesh background orbs (existing, keep)
- Frosted glass card with depth shadow
- Typed tagline animation (existing, keep)
- User select cards lift on hover with glow ring

### 3D Rules
- Desktop only: `@media (hover: hover)`
- One 3D effect per element max
- Never on text-heavy content
- `prefers-reduced-motion` disables all 3D transforms
- Keep tilt angles subtle (4-8deg) for dashboard context

---

## 5. Component Library Additions

### Missing Components to Add

**Empty States**
```css
.empty-state {
  text-align: center;
  padding: var(--space-12) var(--space-4);
}
.empty-state-icon { /* 80x80 rounded container with subtle bg */ }
.empty-state-title { font-family: var(--font-display); font-weight: 700; }
.empty-state-text { color: var(--text-secondary); max-width: 320px; margin: 0 auto; }
.empty-state-action { margin-top: var(--space-4); }
```

**Form Validation States**
```css
.input-error { border-color: var(--status-error); }
.input-error:focus { box-shadow: 0 0 0 3px var(--status-error-bg); }
.input-success { border-color: var(--status-success); }
.field-error { color: var(--status-error); font-size: var(--text-xs); margin-top: 4px; }
.field-hint { color: var(--text-tertiary); font-size: var(--text-xs); margin-top: 4px; }
```

**Disabled States**
```css
.btn:disabled, .input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

**Tooltips**
```css
[data-tooltip] {
  position: relative;
}
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  opacity: 0;
  transition: opacity var(--dur-fast) ease, transform var(--dur-fast) ease;
  /* Glass styling, small text, rounded */
}
[data-tooltip]:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
```

**Dropdown Menu**
```css
.dropdown { position: relative; }
.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  min-width: 180px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  transform: translateY(-8px);
  opacity: 0;
  transition: transform var(--dur-fast) var(--ease-out), opacity var(--dur-fast) ease;
  pointer-events: none;
}
.dropdown.open .dropdown-menu {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
.dropdown-item { /* hover, active, disabled states */ }
```

**Tabs (reusable, replacing 4 inline implementations)**
```css
.tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border-primary); }
.tab {
  padding: 8px 16px;
  font-weight: 500;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
}
.tab.active, .tab:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
```

**Pagination**
```css
.pagination { display: flex; gap: 4px; align-items: center; }
.page-btn { /* numbered buttons, prev/next arrows */ }
.page-btn.active { background: var(--accent); color: white; }
```

**Progress Bar**
```css
.progress { height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; }
.progress-fill {
  height: 100%;
  background: var(--gradient-accent);
  border-radius: 3px;
  transition: width var(--dur-normal) var(--ease-out);
}
```

**Breadcrumbs**
```css
.breadcrumb { display: flex; gap: 8px; align-items: center; font-size: var(--text-sm); }
.breadcrumb-sep { color: var(--text-tertiary); }
.breadcrumb-link { color: var(--text-secondary); }
.breadcrumb-current { color: var(--text-primary); font-weight: 600; }
```

---

## 6. Placeholder Page Architecture

### Current Problem
14 pages show identical static "Under Development" placeholders with no interactivity or modular readiness.

### Solution: Module-Ready Tool Templates

Every placeholder page gets replaced with a **functional skeleton** that:
1. Registers with `ToolRegistry` for automatic nav/permission/analytics integration
2. Shows a rich empty state with the tool's icon, description, and "coming soon" timeline
3. Has a working search bar (wired to Fuse.js) that returns "no results yet" gracefully
4. Has a header with page title, description, and action button placeholder
5. Has a content area that the future tool module renders into
6. Has sample seed data so the page isn't completely empty
7. Uses the stagger entrance animation

### Template Structure (per page)
```
js/tools/<tool-id>.js  ← ToolRegistry.register() + render function + seed data
<tool-id>.html         ← Updated to load the tool script and call render
```

### Seed Data per Tool
Each tool gets 3-5 realistic demo records so users see what the tool will look like:

| Tool | Seed Records |
|------|-------------|
| Job Board | 3 sample jobs (HVAC install, panel upgrade, emergency call) |
| Scheduling | 5 calendar entries this week |
| Time Clock | Today's clock-in/out for 3 employees |
| Tool Tracker | 8 tools (drills, meters, saws) with checkout status |
| Inventory | 10 material items with quantities |
| Fleet | 3 vehicles with mileage/status |
| CRM | 5 customer contacts |
| Invoicing | 3 invoices (paid, pending, overdue) |
| Expenses | 4 expense reports |
| Payroll | Current pay period summary |
| Announcements | 2 company announcements |
| Documents | 5 document categories |
| Safety | 3 safety checklists |

### Tool Module Pattern
```javascript
// js/tools/job-board.js
const JobBoard = (() => {
  const SEED_DATA = [ /* ... */ ];

  async function ensureSeedData() {
    const existing = await DataStore.list('jobs');
    if (existing.length === 0) {
      for (const job of SEED_DATA) await DataStore.create('jobs', job);
    }
  }

  async function render(container, session) {
    await ensureSeedData();
    // Full render with header, filters, card grid, empty state fallback
  }

  // Register with ToolRegistry
  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({
      id: 'jobs',
      name: 'Job Board',
      icon: '/* SVG */',
      permissions: ['jobs'],
      section: 'Operations',
      init: () => {},
    });
  }

  return { render };
})();
```

---

## 7. CSS Consolidation

### Current Problem
3 CSS files (4,505 lines) with:
- Duplicate `.glass` definitions (different values)
- Duplicate `gradientShift` and `shimmer` keyframes
- Duplicate `.btn-gradient` class
- 3 competing easing implementations
- Hardcoded colors instead of variables

### Solution: Consolidate to 2 Files

**`css/design-system.css`** (foundation + components):
- All CSS custom properties
- Reset/base styles
- Component library (btn, card, input, badge, table, modal, toast, etc.)
- New components (empty-state, tooltip, dropdown, tabs, pagination, progress, breadcrumb)
- Utility classes
- All keyframe animations (single source of truth)
- Responsive breakpoints
- `prefers-reduced-motion` media query

**`css/dashboard.css`** (page-specific):
- Owner dashboard panels (alert strip, command stats, activity feed, approval queue, FAB)
- Org tree visualization
- Profile header/banner
- Reauth modal
- Any page-specific overrides

**Delete `css/enhancements.css`** -- merge its unique contributions into design-system.css, discard duplicates.

### Deduplication Checklist
- [ ] Single `.glass` definition
- [ ] Single set of easing curves (CSS variables only)
- [ ] Single `gradientShift` keyframe
- [ ] Single `shimmer` keyframe
- [ ] All colors via CSS variables (no hardcoded hex in component styles)
- [ ] Single `.btn-gradient` definition
- [ ] Orange accent → `--amber` variable everywhere

---

## 8. Page-Specific Polish

### Login Page (index.html)
- Keep 3D tilt card, orb background, typed tagline
- Upgrade user-select cards: add glow ring on hover, 3D lift
- Add stagger animation to user list
- Swap "AMCOEE Tools" title to Outfit font
- Add subtle grain texture overlay on background

### Command Center (command-center.html)
- Stat cards: 3D tilt, glowing accent borders, animated counters with Outfit font
- Activity feed: stagger-enter each entry, anomaly cards pulse glow
- Approval queue: card lift on hover, approve/reject buttons with physical press
- FAB: scale + rotate entrance, radial menu items stagger in
- Add scroll-triggered reveals for panels below the fold

### Dashboard (dashboard.html)
- Welcome greeting in Outfit
- Stat cards match command center pattern
- Chart tabs: tab indicator slides (not instant swap)
- Activity feed: same stagger pattern
- Quick action pills: physical press buttons

### Employees (employees.html)
- Employee table rows: subtle hover lift (2px)
- Profile cards: 3D tilt, avatar with glow ring
- Onboarding wizard: step indicator animates between steps
- Offboarding: red-tinted glass cards for destructive flow

### Reports (reports.html)
- Chart type selector: active state with glow underline
- Generated charts: fade-in on render
- Template cards: 3D tilt, click ripple

### Settings (settings.html)
- Tab bar: sliding indicator
- Department cards: colored top border + 3D tilt
- Data usage progress bar: animated fill
- Export/import buttons: physical press

---

## 9. Global Polish Checklist (per ui-design-polish skill)

Apply to EVERY component across all pages:

- [ ] `text-wrap: balance` on all h1, h2, h3
- [ ] Concentric border radius on nested rounded elements (outer = inner + padding)
- [ ] Icon transitions: opacity + scale + blur (200ms spring easing)
- [ ] `-webkit-font-smoothing: antialiased` globally
- [ ] `font-variant-numeric: tabular-nums` on all dynamic numbers
- [ ] Interactive animations use CSS transitions, not keyframes
- [ ] Stagger on all list/grid entrances (80ms gap)
- [ ] Exit animations subtler than entries
- [ ] Optical alignment checks (buttons, badges, icons)
- [ ] Shadows for depth instead of borders on cards
- [ ] `transform: scale(0.97)` on button `:active`
- [ ] All forms: labels linked to inputs, 16px min font, submit on Enter
- [ ] Minimum 44px tap targets on mobile
- [ ] `@media (prefers-reduced-motion: reduce)` kills all animations

---

## 10. Performance Budget

- First paint: < 1 second on 4G
- Total CSS: < 50KB (currently ~85KB across 3 files, target 45KB after consolidation)
- Font loading: Outfit + JetBrains Mono preconnected, display=swap
- 3D transforms: desktop only, will-change applied lazily
- Scroll handlers: IntersectionObserver only, no scroll event listeners
- Chart.js: loaded only on pages that use it (command-center, dashboard, reports)
- Animations pause when tab is backgrounded (visibilitychange)

---

## 11. Constraints

- Static hosting (GitHub Pages), no server-side code
- Vanilla JS, no framework, no build step
- CDN dependencies only (with SRI hashes)
- Must not break existing functionality (auth, data, permissions)
- Service worker caches new fonts and updated CSS
- All 3D/animation enhancements are progressive (app works without them)

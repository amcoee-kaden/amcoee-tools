/* ══════════════════════════════════════════════════════════════════════════════
   AMCO ATLAS — Runtime
   Tool catalog, page bootstrap, helpers (h/fmt/on).
   Every tool HTML page loads this AFTER the data layer; shell.js is the renderer.
   ══════════════════════════════════════════════════════════════════════════════ */

const Atlas = (() => {

  /* ─── Tool Catalog ──────────────────────────────────────────────────────
     Single source of truth for every tool: id, label, icon, section, page.
     The rail/command-palette/home-tiles all read from this.
  ───────────────────────────────────────────────────────────────────────── */
  const TOOLS = [
    { id: 'home',          name: 'Home',          icon: '⌂', section: 'Atlas',     page: 'home.html',          permission: 'dashboard',   collection: null,            tagline: 'Today, at a glance' },

    { id: 'jobs',          name: 'Jobs',          icon: '▤', section: 'Field',     page: 'jobs.html',          permission: 'jobs',        collection: 'jobs',          tagline: 'Work board' },
    { id: 'schedule',      name: 'Schedule',      icon: '◉', section: 'Field',     page: 'schedule.html',      permission: 'scheduling',  collection: 'schedule',      tagline: 'Dispatch & calendar' },
    { id: 'timeclock',     name: 'Time Clock',    icon: '◴', section: 'Field',     page: 'timeclock.html',     permission: 'timeclock',   collection: 'clock_entries', tagline: 'Clock in & hours' },
    { id: 'safety',        name: 'Safety',        icon: '▲', section: 'Field',     page: 'safety.html',        permission: 'safety',      collection: 'safety',        tagline: 'Incidents & toolbox' },

    { id: 'tools',         name: 'Tool Tracker',  icon: '✦', section: 'Shop',      page: 'tools.html',         permission: 'tool-tracker',collection: 'tool_assets',   tagline: 'Checkouts & assets' },
    { id: 'inventory',     name: 'Inventory',     icon: '▣', section: 'Shop',      page: 'inventory.html',     permission: 'inventory',   collection: 'inventory',     tagline: 'Materials & stock' },
    { id: 'fleet',         name: 'Fleet',         icon: '▨', section: 'Shop',      page: 'fleet.html',         permission: 'fleet',       collection: 'fleet',         tagline: 'Vehicles & service' },

    { id: 'crm',           name: 'CRM',           icon: '♁', section: 'Business',  page: 'crm.html',           permission: 'crm',         collection: 'crm',           tagline: 'Clients & pipeline' },
    { id: 'invoicing',     name: 'Invoicing',     icon: '$', section: 'Business',  page: 'invoicing.html',     permission: 'invoicing',   collection: 'invoices',      tagline: 'Invoices & payments' },
    { id: 'expenses',      name: 'Expenses',      icon: '⬇', section: 'Business',  page: 'expenses.html',      permission: 'expenses',    collection: 'expenses',      tagline: 'Receipts & reimb.' },
    { id: 'payroll',       name: 'Payroll',       icon: '⚖', section: 'Business',  page: 'payroll.html',       permission: 'payroll',     collection: 'payroll',       tagline: 'Pay periods & totals' },

    { id: 'announcements', name: 'Announcements', icon: '✎', section: 'Team',      page: 'announcements.html', permission: 'announcements',collection: 'announcements',tagline: 'Memos & briefings' },
    { id: 'documents',     name: 'Documents',     icon: '❒', section: 'Team',      page: 'documents.html',     permission: 'documents',   collection: 'documents',     tagline: 'Manuals & PDFs' },
    { id: 'employees',     name: 'Employees',     icon: '◊', section: 'Team',      page: 'employees.html',     permission: 'employees.view',collection: null,          tagline: 'Org & people' },

    { id: 'profile',       name: 'My Profile',    icon: '●', section: 'System',    page: 'profile.html',       permission: null,          collection: null,            tagline: 'You' },
    { id: 'settings',      name: 'Settings',      icon: '◎', section: 'System',    page: 'settings.html',      permission: 'settings',    collection: null,            tagline: 'Config & data' },
  ];

  function getTool(id) { return TOOLS.find(t => t.id === id) || null; }
  function allTools() { return TOOLS.slice(); }

  function visibleTools(role) {
    return TOOLS.filter(t => !t.permission || (typeof PermissionGuard !== 'undefined' && PermissionGuard.hasPermission(role, t.permission)));
  }

  function visibleBySection(role) {
    const byS = new Map();
    for (const t of visibleTools(role)) {
      if (!byS.has(t.section)) byS.set(t.section, []);
      byS.get(t.section).push(t);
    }
    return byS;
  }

  /* ─── Tool Renderer Registry ─────────────────────────────────────────────
     Each tool's JS file calls Atlas.registerRenderer(id, fn). Shell invokes
     the renderer for the page's declared tool id.
  ───────────────────────────────────────────────────────────────────────── */
  const renderers = new Map();
  function registerRenderer(id, fn) {
    if (typeof fn !== 'function') return;
    renderers.set(id, fn);
  }
  function getRenderer(id) { return renderers.get(id) || null; }

  /* ─── HTML helpers ──────────────────────────────────────────────────────── */

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str == null ? '' : str));
    return escapeHTML(str);
  }

  /* Tagged template: first variadic then interpolations escaped, ${raw.X} passes through */
  function h(strings, ...values) {
    let out = '';
    strings.forEach((s, i) => {
      out += s;
      if (i < values.length) {
        const v = values[i];
        if (v == null) { /* nothing */ }
        else if (Array.isArray(v)) out += v.join('');
        else if (v && v.__raw) out += String(v.__raw);
        else out += escapeHTML(v);
      }
    });
    return out;
  }
  h.raw = (v) => ({ __raw: v });

  /* ─── Formatters ────────────────────────────────────────────────────────── */

  const fmt = {
    money(n, { sign = true } = {}) {
      const v = Number(n) || 0;
      const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return (sign ? '$' : '') + (v < 0 ? '-' + s : s);
    },
    num(n) {
      const v = Number(n) || 0;
      return v.toLocaleString('en-US');
    },
    hours(h) {
      if (h == null || isNaN(h)) return '0h';
      const hh = Math.floor(h);
      const mm = Math.round((h - hh) * 60);
      return mm ? `${hh}h ${mm}m` : `${hh}h`;
    },
    date(iso) {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
      catch { return '—'; }
    },
    dateShort(iso) {
      if (!iso) return '—';
      try { return new Date(iso).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }); }
      catch { return '—'; }
    },
    time(iso) {
      if (!iso) return '—';
      try {
        const use24 = (_prefs && _prefs.timeFormat === '24h');
        return new Date(iso).toLocaleTimeString('en-US', use24 ? { hour: '2-digit', minute: '2-digit', hour12: false } : { hour: 'numeric', minute: '2-digit' });
      } catch { return '—'; }
    },
    datetime(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        const use24 = (_prefs && _prefs.timeFormat === '24h');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', use24 ? { hour: '2-digit', minute: '2-digit', hour12: false } : { hour: 'numeric', minute: '2-digit' });
      } catch { return '—'; }
    },
    timeAgo(iso) {
      if (!iso) return '';
      const diff = (Date.now() - new Date(iso).getTime()) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
      return fmt.date(iso);
    },
    duration(iso) {
      if (!iso) return '';
      const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      return `${h}h ${m}m`;
    },
  };

  /* ─── DOM helpers ───────────────────────────────────────────────────────── */

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== false && v != null) node.setAttribute(k, v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  function $(sel, root = document) { return root.querySelector(sel); }
  function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  /* ─── Sync helpers: subscribe to DataStore events ───────────────────────── */

  function onData(collection, handler) {
    const off1 = AppEvents.on(`data:${collection}:create`, handler);
    const off2 = AppEvents.on(`data:${collection}:update`, handler);
    return () => { off1(); off2(); };
  }

  /* ─── Nav ──────────────────────────────────────────────────────────────── */

  function nav(toolId, query) {
    const t = getTool(toolId);
    if (!t) return;
    const url = t.page + (query ? '?' + new URLSearchParams(query).toString() : '');
    window.location.href = url;
  }

  /* ─── Empty-state illustrations ─────────────────────────────────────────── */

  const ART = {
    // Breaker panel (jobs)
    jobs: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="40" y="10" width="60" height="72" rx="3"/><line x1="70" y1="22" x2="70" y2="80"/><rect x="48" y="22" width="14" height="6" rx="1" fill="currentColor" fill-opacity="0.15"/><rect x="48" y="32" width="14" height="6" rx="1" fill="currentColor" fill-opacity="0.15"/><rect x="48" y="42" width="14" height="6" rx="1"/><rect x="48" y="52" width="14" height="6" rx="1"/><rect x="48" y="62" width="14" height="6" rx="1"/><rect x="78" y="22" width="14" height="6" rx="1" fill="currentColor" fill-opacity="0.15"/><rect x="78" y="32" width="14" height="6" rx="1"/><rect x="78" y="42" width="14" height="6" rx="1"/><rect x="78" y="52" width="14" height="6" rx="1"/><rect x="78" y="62" width="14" height="6" rx="1"/><circle cx="70" cy="10" r="2"/></svg>`,
    // Clock (timeclock)
    clock: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="70" cy="45" r="30"/><line x1="70" y1="45" x2="70" y2="28"/><line x1="70" y1="45" x2="82" y2="52"/><circle cx="70" cy="45" r="1.5" fill="currentColor"/></svg>`,
    // Inventory box
    box: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M30 30l40-18 40 18v34l-40 18-40-18z"/><path d="M30 30l40 18 40-18"/><line x1="70" y1="48" x2="70" y2="82"/></svg>`,
    // Invoice
    invoice: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M45 10h40l10 10v60H45z"/><path d="M85 10v10h10"/><line x1="55" y1="35" x2="80" y2="35"/><line x1="55" y1="45" x2="75" y2="45"/><line x1="55" y1="55" x2="80" y2="55"/><line x1="55" y1="65" x2="70" y2="65"/></svg>`,
    // Truck
    truck: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 60V30h55v30"/><path d="M75 42h20l15 10v8H75z"/><circle cx="42" cy="62" r="6"/><circle cx="92" cy="62" r="6"/></svg>`,
    // Calendar
    calendar: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="40" y="18" width="60" height="54" rx="3"/><line x1="40" y1="32" x2="100" y2="32"/><line x1="50" y1="12" x2="50" y2="24"/><line x1="90" y1="12" x2="90" y2="24"/><rect x="50" y="40" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.2"/><rect x="66" y="40" width="8" height="8" rx="1"/><rect x="82" y="40" width="8" height="8" rx="1" fill="currentColor" fill-opacity="0.4"/><rect x="50" y="54" width="8" height="8" rx="1"/><rect x="66" y="54" width="8" height="8" rx="1"/><rect x="82" y="54" width="8" height="8" rx="1"/></svg>`,
    // People
    people: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="55" cy="36" r="8"/><path d="M40 68v-4a10 10 0 0 1 10-10h10a10 10 0 0 1 10 10v4"/><circle cx="90" cy="40" r="6"/><path d="M78 68v-2a8 8 0 0 1 8-8h8a8 8 0 0 1 8 8v2"/></svg>`,
    // Wrench (tools)
    wrench: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M95 24a12 12 0 0 0-15 15l-38 38a4 4 0 0 0 0 6l6 6a4 4 0 0 0 6 0l38-38a12 12 0 0 0 15-15l-8 8-6-6z"/></svg>`,
    // Document
    doc: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M50 12h30l12 12v54H50z"/><path d="M80 12v12h12"/><line x1="58" y1="38" x2="82" y2="38"/><line x1="58" y1="48" x2="78" y2="48"/><line x1="58" y1="58" x2="82" y2="58"/><line x1="58" y1="68" x2="72" y2="68"/></svg>`,
    // Shield (safety)
    shield: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M70 10l30 10v22c0 18-13 28-30 38-17-10-30-20-30-38V20z"/><path d="M58 45l9 9 15-15"/></svg>`,
    // Generic spark
    spark: `<svg viewBox="0 0 140 90" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M70 10l6 22 22 6-22 6-6 22-6-22-22-6 22-6z"/></svg>`,
  };

  function illustration(kind) {
    return ART[kind] || ART.spark;
  }

  /* ─── Sparkline SVG ─────────────────────────────────────────────────────── */

  function sparkline(values, { width = 120, height = 28, stroke = 'currentColor', fill = true } = {}) {
    if (!Array.isArray(values) || values.length < 2) return '';
    const pad = 1.5;
    const w = width, h = height;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = (max - min) || 1;
    const xStep = (w - pad * 2) / (values.length - 1);
    const toY = (v) => pad + (h - pad * 2) * (1 - (v - min) / span);
    const pts = values.map((v, i) => [pad + i * xStep, toY(v)]);
    const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ',' + p[1].toFixed(2)).join(' ');
    const area = d + ` L${w - pad},${h - pad} L${pad},${h - pad} Z`;
    return `
      <svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" aria-hidden="true" preserveAspectRatio="none">
        ${fill ? `<path d="${area}" fill="${stroke}" fill-opacity="0.12"/>` : ''}
        <path d="${d}" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="2.2" fill="${stroke}"/>
      </svg>
    `;
  }

  /* Bucket records by day for the last N days → array of counts for sparkline */
  function bucketByDay(records, days = 14, field = 'createdAt') {
    const now = Date.now();
    const buckets = new Array(days).fill(0);
    for (const r of records) {
      const t = new Date(r[field] || r.createdAt || r.timestamp || 0).getTime();
      if (!t) continue;
      const dayIdx = days - 1 - Math.floor((now - t) / 86400000);
      if (dayIdx >= 0 && dayIdx < days) buckets[dayIdx]++;
    }
    return buckets;
  }

  /* Running cumulative (handy for "total so far" sparklines) */
  function cumulative(buckets) {
    let sum = 0;
    return buckets.map(v => (sum += v));
  }

  /* ─── Count-up animation ────────────────────────────────────────────────── */

  function tweenNum(el, from, to, { duration = 700, formatter } = {}) {
    const start = performance.now();
    const dx = to - from;
    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + dx * e;
      el.textContent = formatter ? formatter(v) : Math.round(v).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ─── Icon shortcuts (single-glyph SVGs for the shell) ─────────────────── */

  const ICONS = {
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    chevron: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    arrowRight: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
    logout: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    bell: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    sun: '<svg class="theme-sun" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg class="theme-moon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    system: '<svg class="theme-system" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    upload: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
    download: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  };

  /* ─── Prefs ─────────────────────────────────────────────────────────────── */
  const PREFS_KEY = 'amcoee_prefs_v2';
  const ACCENTS = ['copper', 'electric', 'emerald', 'amber', 'violet', 'crimson'];

  const DEFAULT_PREFS = {
    theme:       'dark',        // 'dark' | 'light' | 'system'
    accent:      'copper',      // see ACCENTS
    animations:  true,
    density:     'comfortable', // 'comfortable' | 'compact'
    timeFormat:  '12h',         // '12h' | '24h'
  };

  let _prefs = null;
  let _mqSystem = null;

  function _readLS() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); }
    catch { return {}; }
  }
  function _writeLS(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
  }

  function _sysTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function _apply(prefs) {
    const html = document.documentElement;
    const effectiveTheme = prefs.theme === 'system' ? _sysTheme() : prefs.theme;
    html.setAttribute('data-theme', effectiveTheme);
    html.setAttribute('data-theme-mode', prefs.theme);
    html.setAttribute('data-accent', prefs.accent);
    html.setAttribute('data-density', prefs.density);
    html.setAttribute('data-animations', prefs.animations ? 'on' : 'off');
  }

  function _ensureMQListener() {
    if (_mqSystem || !window.matchMedia) return;
    _mqSystem = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => {
      const p = Prefs.all();
      if (p.theme === 'system') {
        document.documentElement.setAttribute('data-theme', _sysTheme());
        if (typeof AppEvents !== 'undefined') AppEvents.emit('prefs:changed', { key: 'theme', value: 'system', effective: _sysTheme() });
      }
    };
    if (_mqSystem.addEventListener) _mqSystem.addEventListener('change', handler);
    else _mqSystem.addListener(handler);
  }

  const Prefs = {
    ACCENTS,
    DEFAULTS: DEFAULT_PREFS,

    all() {
      if (!_prefs) _prefs = { ...DEFAULT_PREFS, ..._readLS() };
      return { ..._prefs };
    },
    get(key) { return Prefs.all()[key]; },
    set(key, value) {
      if (!(key in DEFAULT_PREFS)) return;
      if (!_prefs) _prefs = { ...DEFAULT_PREFS, ..._readLS() };
      _prefs[key] = value;
      _writeLS(_prefs);
      _apply(_prefs);
      if (typeof AppEvents !== 'undefined') AppEvents.emit('prefs:changed', { key, value, all: { ..._prefs } });
    },
    setMany(patch) {
      if (!_prefs) _prefs = { ...DEFAULT_PREFS, ..._readLS() };
      for (const k of Object.keys(patch)) if (k in DEFAULT_PREFS) _prefs[k] = patch[k];
      _writeLS(_prefs);
      _apply(_prefs);
      if (typeof AppEvents !== 'undefined') AppEvents.emit('prefs:changed', { key: '*', all: { ..._prefs } });
    },
    effectiveTheme() {
      return Prefs.get('theme') === 'system' ? _sysTheme() : Prefs.get('theme');
    },
    cycleTheme() {
      const order = ['dark', 'light', 'system'];
      const cur = Prefs.get('theme');
      const next = order[(order.indexOf(cur) + 1) % order.length];
      Prefs.set('theme', next);
      return next;
    },
    init() {
      _prefs = { ...DEFAULT_PREFS, ..._readLS() };
      _apply(_prefs);
      _ensureMQListener();
    },
  };

  // Keep a Theme alias for backward compat
  const Theme = {
    get: () => Prefs.effectiveTheme(),
    set: (t) => Prefs.set('theme', t),
    toggle: () => Prefs.cycleTheme(),
  };

  // Hydrate prefs immediately (runs after atlas.js loads, before shell.boot)
  Prefs.init();

  /* ─── Public API ────────────────────────────────────────────────────────── */

  return {
    TOOLS, getTool, allTools, visibleTools, visibleBySection,
    registerRenderer, getRenderer,
    h, safe, escapeHTML, fmt,
    el, $, $$,
    onData, nav, tweenNum,
    sparkline, bucketByDay, cumulative,
    illustration,
    ICONS, Theme, Prefs,
  };
})();

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
      try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
      catch { return '—'; }
    },
    datetime(iso) {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
  };

  /* ─── Public API ────────────────────────────────────────────────────────── */

  return {
    TOOLS, getTool, allTools, visibleTools, visibleBySection,
    registerRenderer, getRenderer,
    h, safe, escapeHTML, fmt,
    el, $, $$,
    onData, nav, tweenNum,
    ICONS,
  };
})();

/* ==============================================================================
   AMCOEE TOOLS — Enhanced Dashboard & Global Search
   Role-specific dashboards with charts, activity feed, and Ctrl+K search
   ============================================================================== */

const EnhancedDashboard = (() => {
  'use strict';

  /* ── State ─────────────────────────────────────────────────────────────── */
  const charts = {};
  let clockInterval = null;
  let activityInterval = null;
  let searchFuse = null;
  let searchOverlayEl = null;
  let selectedResultIdx = -1;
  let stylesInjected = false;
  let eventUnsubs = [];

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function san(t) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(String(t)) : String(t);
  }

  function isAdmin(role) {
    return ['owner', 'head_admin', 'admin'].includes(role);
  }

  function greetingText() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  function formatTime(d) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function relativeTime(iso) {
    if (typeof dayjs !== 'undefined' && dayjs(iso).fromNow) return dayjs(iso).fromNow();
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function animateCounter(el, target, duration) {
    duration = duration || 1000;
    const isCurrency = el.dataset.format === 'currency';
    const isDecimal = el.dataset.format === 'decimal';
    const start = 0;
    const t0 = performance.now();
    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
    function step(now) {
      const elapsed = Math.min((now - t0) / duration, 1);
      const val = start + (target - start) * easeOutExpo(elapsed);
      if (isCurrency) {
        el.textContent = '$' + val.toFixed(1) + 'K';
      } else if (isDecimal) {
        el.textContent = val.toFixed(1);
      } else {
        el.textContent = Math.round(val);
      }
      if (elapsed < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ── Cleanup ────────────────────────────────────────────────────────────── */

  function cleanup() {
    Object.keys(charts).forEach(k => {
      if (charts[k] && typeof charts[k].destroy === 'function') charts[k].destroy();
      delete charts[k];
    });
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    if (activityInterval) { clearInterval(activityInterval); activityInterval = null; }
    eventUnsubs.forEach(fn => { try { fn(); } catch (_) {} });
    eventUnsubs = [];
  }

  /* ── Inject Styles (once) ───────────────────────────────────────────────── */

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.id = 'enhanced-dash-styles';
    style.textContent = `
      /* Dashboard container */
      .ed-wrap { position:relative;padding:0 0 2rem 0; }
      .ed-content { position:relative;z-index:1; }

      /* Welcome */
      .ed-welcome { margin-bottom:1.5rem; }
      .ed-welcome h1 { font-size:1.75rem;font-weight:700;margin:0 0 0.25rem 0;display:flex;align-items:center;gap:0.5rem; }
      .ed-role-badge {
        font-size:0.7rem;font-weight:600;padding:0.15rem 0.6rem;border-radius:999px;
        background:var(--accent,#6366f1);color:#fff;text-transform:uppercase;letter-spacing:0.04em;
      }
      .ed-subtitle { color:var(--text-secondary,#94a3b8);font-size:0.92rem;margin:0; }
      .ed-quick-actions { display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap; }
      .ed-action-pill {
        padding:0.35rem 0.85rem;border-radius:999px;font-size:0.8rem;font-weight:500;
        border:1px solid var(--border,#334155);background:var(--surface,#1e293b);
        color:var(--text-primary,#e2e8f0);cursor:pointer;
        transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),box-shadow 0.25s cubic-bezier(0.16,1,0.3,1),background 0.25s,border-color 0.25s,color 0.2s;
        will-change:transform;
      }
      .ed-action-pill:hover {
        border-color:var(--accent,#6366f1);background:var(--accent,#6366f1);color:#fff;
        transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,0.25);
      }

      /* Stats row */
      .ed-stats { display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem; }
      @media(max-width:900px){ .ed-stats{grid-template-columns:repeat(2,1fr);} }
      @media(max-width:500px){ .ed-stats{grid-template-columns:1fr;} }

      /* Glass card */
      .ed-glass {
        background:var(--surface,#1e293b);border:1px solid var(--border,#334155);
        border-radius:0.75rem;padding:1.25rem;
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        box-shadow:inset 0 1px 0 0 rgba(255,255,255,0.04);
        will-change:transform;
        transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),box-shadow 0.25s cubic-bezier(0.16,1,0.3,1),border-color 0.25s;
      }
      .ed-glass:hover {
        transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.15);
        border-color:var(--accent,#6366f1);
      }

      /* Stat card */
      .ed-stat {
        display:flex;align-items:center;gap:1rem;
        opacity:0;transform:translateY(16px);
        animation:ed-fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) forwards;
        will-change:transform,opacity;
      }
      .ed-stat:nth-child(1){animation-delay:0s}
      .ed-stat:nth-child(2){animation-delay:0.1s}
      .ed-stat:nth-child(3){animation-delay:0.2s}
      .ed-stat:nth-child(4){animation-delay:0.3s}
      @keyframes ed-fadeUp { to{opacity:1;transform:translateY(0)} }
      .ed-stat-icon {
        width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;
        font-size:1.4rem;flex-shrink:0;
      }
      .ed-stat-value { font-size:1.6rem;font-weight:700;line-height:1.2; }
      .ed-stat-label { font-size:0.78rem;color:var(--text-secondary,#94a3b8);margin-top:0.1rem; }
      .ed-stat-trend { font-size:0.72rem;margin-top:0.1rem; }
      .ed-trend-up { color:#22c55e; }
      .ed-trend-down { color:#ef4444; }

      /* Two column */
      .ed-two-col { display:grid;grid-template-columns:3fr 2fr;gap:1rem;margin-bottom:1.5rem; }
      @media(max-width:800px){ .ed-two-col{grid-template-columns:1fr;} }

      /* Chart tabs */
      .ed-tab-bar {
        display:flex;gap:0.25rem;margin-bottom:1rem;
        border-bottom:1px solid var(--border,#334155);padding-bottom:0.5rem;
        position:relative;
      }
      .ed-tab {
        padding:0.35rem 0.75rem;border-radius:0.4rem;font-size:0.8rem;font-weight:500;
        background:transparent;border:none;color:var(--text-secondary,#94a3b8);cursor:pointer;
        transition:color 0.25s cubic-bezier(0.16,1,0.3,1);
        position:relative;z-index:1;
      }
      .ed-tab:hover { color:var(--text-primary,#e2e8f0); }
      .ed-tab.active { color:#fff; }
      .ed-tab-indicator {
        position:absolute;bottom:0;height:calc(100% - 0.5rem);border-radius:0.4rem;
        background:var(--accent,#6366f1);
        transition:transform 0.3s cubic-bezier(0.16,1,0.3,1),opacity 0.3s cubic-bezier(0.16,1,0.3,1);
        will-change:transform;z-index:0;pointer-events:none;
      }

      /* Chart wrap — overflow hidden prevents Chart.js resize loop */
      .ed-chart-wrap { position:relative;height:280px;overflow:hidden; }

      /* Activity feed */
      .ed-activity-list {
        list-style:none;padding:0;margin:0;max-height:340px;overflow-y:auto;
        scrollbar-width:thin;scrollbar-color:var(--border,#334155) transparent;
      }
      .ed-activity-list::-webkit-scrollbar { width:5px; }
      .ed-activity-list::-webkit-scrollbar-track { background:transparent; }
      .ed-activity-list::-webkit-scrollbar-thumb { background:var(--border,#334155);border-radius:999px; }
      .ed-activity-list::-webkit-scrollbar-thumb:hover { background:var(--text-secondary,#94a3b8); }

      .ed-activity-item {
        display:flex;align-items:flex-start;gap:0.65rem;padding:0.6rem 0.5rem;
        border-bottom:1px solid var(--border,#334155);
        border-left:2px solid transparent;
        transition:border-color 0.2s cubic-bezier(0.16,1,0.3,1),background 0.2s;
        border-radius:0 4px 4px 0;
      }
      .ed-activity-item:last-child { border-bottom:none; }
      .ed-activity-item:hover {
        border-left-color:var(--accent,#6366f1);
        background:rgba(99,102,241,0.04);
      }
      .ed-avatar-sm {
        width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
        font-size:0.75rem;font-weight:600;color:#fff;flex-shrink:0;
      }
      .ed-activity-text { font-size:0.82rem;color:var(--text-primary,#e2e8f0);line-height:1.35; }
      .ed-activity-time { font-size:0.7rem;color:var(--text-secondary,#94a3b8); }
      .ed-live-dot {
        width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;
        animation:ed-pulse 2s ease-in-out infinite;margin-left:0.4rem;
      }
      @keyframes ed-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

      /* Quick links */
      .ed-links { display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem; }
      @media(max-width:700px){ .ed-links{grid-template-columns:repeat(2,1fr);} }
      .ed-link-card {
        display:flex;flex-direction:column;align-items:center;gap:0.5rem;padding:1.25rem;
        cursor:pointer;text-align:center;position:relative;overflow:hidden;
        transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),box-shadow 0.25s cubic-bezier(0.16,1,0.3,1),border-color 0.25s;
        will-change:transform;
      }
      .ed-link-card::after {
        content:'';position:absolute;inset:0;opacity:0;
        background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06));
        transition:opacity 0.25s cubic-bezier(0.16,1,0.3,1);
        pointer-events:none;
      }
      .ed-link-card:hover { transform:scale(1.02); }
      .ed-link-card:hover::after { opacity:1; }
      .ed-link-icon { font-size:1.6rem;position:relative;z-index:1; }
      .ed-link-label { font-size:0.85rem;font-weight:600;position:relative;z-index:1; }
      .ed-link-desc { font-size:0.72rem;color:var(--text-secondary,#94a3b8);position:relative;z-index:1; }

      /* Ctrl+K Search overlay */
      .ed-search-overlay {
        position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);
        backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
        display:flex;justify-content:center;padding-top:15vh;
        opacity:0;pointer-events:none;
        transition:opacity 0.25s cubic-bezier(0.16,1,0.3,1);
      }
      .ed-search-overlay.open { opacity:1;pointer-events:all; }
      .ed-search-box {
        width:560px;max-width:90vw;background:var(--surface,#1e293b);border:1px solid var(--border,#334155);
        border-radius:0.75rem;overflow:hidden;max-height:420px;display:flex;flex-direction:column;
        box-shadow:0 24px 48px rgba(0,0,0,0.3);
        transform:scale(0.97);
        transition:transform 0.25s cubic-bezier(0.16,1,0.3,1);
        will-change:transform;
      }
      .ed-search-overlay.open .ed-search-box { transform:scale(1); }
      .ed-search-input {
        width:100%;padding:1rem 1.25rem;font-size:1rem;border:none;outline:none;
        background:transparent;color:var(--text-primary,#e2e8f0);
      }
      .ed-search-input::placeholder { color:var(--text-secondary,#64748b); }
      .ed-search-results { overflow-y:auto;border-top:1px solid var(--border,#334155); }
      .ed-search-result {
        padding:0.65rem 1.25rem;font-size:0.88rem;cursor:pointer;display:flex;align-items:center;gap:0.6rem;
        color:var(--text-primary,#e2e8f0);
        transition:background 0.15s cubic-bezier(0.16,1,0.3,1),color 0.15s;
      }
      .ed-search-result:hover, .ed-search-result.selected { background:var(--accent,#6366f1);color:#fff; }
      .ed-search-result-icon { font-size:1rem;opacity:0.7; }
      .ed-search-hint {
        font-size:0.65rem;padding:0.15rem 0.4rem;border-radius:4px;
        border:1px solid var(--border,#334155);color:var(--text-secondary,#94a3b8);
        font-family:monospace;cursor:pointer;
        transition:transform 0.25s cubic-bezier(0.16,1,0.3,1),box-shadow 0.25s;
        will-change:transform;
      }
      .ed-search-hint:hover {
        transform:translateY(-1px);
        box-shadow:0 2px 8px rgba(99,102,241,0.15);
      }

      /* Section headers */
      .ed-section-hdr {
        display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;
      }
      .ed-section-hdr h3 { font-size:0.95rem;font-weight:600;margin:0; }
    `;
    document.head.appendChild(style);
  }

  /* ── Stats data by role ─────────────────────────────────────────────────── */

  async function getStats(role) {
    if (isAdmin(role)) {
      let activeJobs = 12;
      let pendingApprovals = 0;
      try {
        if (typeof DataStore !== 'undefined') {
          const jobs = await DataStore.list('jobs');
          if (jobs && jobs.length > 0) activeJobs = jobs.length;
          const approvals = await DataStore.list('approvals');
          if (approvals && approvals.length > 0) pendingApprovals = approvals.length;
        }
      } catch (_) {}
      return [
        { emoji: '\uD83D\uDCCB', label: 'Active Jobs', value: activeJobs, trend: '+3', up: true, bg: 'linear-gradient(135deg,#6366f1,#818cf8)' },
        { emoji: '\uD83D\uDC65', label: 'Team Size', value: 6, trend: '+1', up: true, bg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
        { emoji: '\uD83D\uDD27', label: 'Tools Tracked', value: 24, trend: '0', up: true, bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' },
        { emoji: '\uD83D\uDCB0', label: 'Revenue MTD', value: 48.2, trend: '+12%', up: true, bg: 'linear-gradient(135deg,#22c55e,#4ade80)', format: 'currency' },
      ];
    }
    if (role === 'office') {
      let activeJobs = 12;
      try {
        if (typeof DataStore !== 'undefined') {
          const jobs = await DataStore.list('jobs');
          if (jobs && jobs.length > 0) activeJobs = jobs.length;
        }
      } catch (_) {}
      return [
        { emoji: '\uD83D\uDCCB', label: 'Active Jobs', value: activeJobs, trend: '+3', up: true, bg: 'linear-gradient(135deg,#6366f1,#818cf8)' },
        { emoji: '\uD83D\uDCC4', label: 'Open Invoices', value: 8, trend: '-2', up: false, bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
        { emoji: '\uD83D\uDC64', label: 'Customers', value: 45, trend: '+5', up: true, bg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
        { emoji: '\u23F3', label: 'Pending Tasks', value: 3, trend: '-1', up: false, bg: 'linear-gradient(135deg,#ef4444,#f87171)' },
      ];
    }
    // field
    return [
      { emoji: '\uD83D\uDEE0\uFE0F', label: 'My Jobs', value: 3, trend: '+1', up: true, bg: 'linear-gradient(135deg,#6366f1,#818cf8)' },
      { emoji: '\u23F1\uFE0F', label: 'Hours Today', value: 7.5, trend: '', up: true, bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', format: 'decimal' },
      { emoji: '\uD83E\uDDF0', label: 'Tools Out', value: 4, trend: '0', up: true, bg: 'linear-gradient(135deg,#f59e0b,#fbbf24)' },
      { emoji: '\u27A1\uFE0F', label: 'Next Job', value: 2, trend: 'in 2h', up: true, bg: 'linear-gradient(135deg,#22c55e,#4ade80)' },
    ];
  }

  /* ── Quick Actions by role ──────────────────────────────────────────────── */

  function getQuickActions(role) {
    if (isAdmin(role)) {
      return [
        { label: 'New Job', route: 'jobs' },
        { label: 'Add Employee', route: 'employees' },
        { label: 'View Reports', route: 'reports' },
        { label: 'Invoicing', route: 'invoicing' },
      ];
    }
    if (role === 'office') {
      return [
        { label: 'New Invoice', route: 'invoicing' },
        { label: 'Schedule', route: 'schedule' },
        { label: 'CRM', route: 'crm' },
      ];
    }
    return [
      { label: 'Clock In', route: 'timeclock' },
      { label: 'My Schedule', route: 'schedule' },
      { label: 'Report Issue', route: 'safety' },
    ];
  }

  /* ── Quick Links by role ────────────────────────────────────────────────── */

  function getQuickLinks(role) {
    if (isAdmin(role)) {
      return [
        { icon: '\uD83D\uDCCB', label: 'Job Board', desc: 'Manage active jobs', route: 'jobs' },
        { icon: '\uD83D\uDCB3', label: 'Invoicing', desc: 'Bills & payments', route: 'invoicing' },
        { icon: '\uD83D\uDC64', label: 'CRM', desc: 'Customer relations', route: 'crm' },
        { icon: '\uD83D\uDCC5', label: 'Schedule', desc: 'Team calendar', route: 'schedule' },
        { icon: '\uD83D\uDCCA', label: 'Reports', desc: 'Analytics & data', route: 'reports' },
        { icon: '\uD83D\uDC65', label: 'Employees', desc: 'Team management', route: 'employees' },
      ];
    }
    return [
      { icon: '\uD83D\uDCCB', label: 'Job Board', desc: 'View assigned jobs', route: 'jobs' },
      { icon: '\uD83D\uDCC5', label: 'Schedule', desc: 'My schedule', route: 'schedule' },
      { icon: '\u23F0', label: 'Time Clock', desc: 'Clock in/out', route: 'timeclock' },
      { icon: '\uD83D\uDD27', label: 'Tool Tracker', desc: 'Equipment status', route: 'tools' },
      { icon: '\uD83D\uDCC4', label: 'Documents', desc: 'Files & forms', route: 'documents' },
      { icon: '\u26A0\uFE0F', label: 'Safety', desc: 'Reports & alerts', route: 'safety' },
    ];
  }

  /* ── Charts ─────────────────────────────────────────────────────────────── */

  function destroyChart(key) {
    if (charts[key] && typeof charts[key].destroy === 'function') {
      charts[key].destroy();
      delete charts[key];
    }
  }

  /** Prepare a canvas element for Chart.js rendering (prevents resize loop) */
  function prepCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    canvas.style.display = 'block';
    canvas.style.maxHeight = '100%';
    return canvas;
  }

  function renderOverviewChart(canvasId) {
    destroyChart('main');
    const ctx = prepCanvas(canvasId);
    if (!ctx) return;
    charts.main = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Owner', 'Head Admin', 'Admin', 'Office', 'Field'],
        datasets: [{
          data: [1, 1, 2, 3, 5],
          backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#0ea5e9', '#22c55e'],
          borderWidth: 0,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#94a3b8', padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1, cornerRadius: 8 },
        },
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const { ctx: c, chartArea: { top, bottom, left, right } } = chart;
          const cx = (left + right) / 2;
          const cy = (top + bottom) / 2;
          c.save();
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.font = 'bold 1.5rem system-ui';
          c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#e2e8f0';
          c.fillText('12', cx, cy - 6);
          c.font = '0.7rem system-ui';
          c.fillStyle = '#94a3b8';
          c.fillText('employees', cx, cy + 16);
          c.restore();
        }
      }],
    });
  }

  function renderWeeklyChart(canvasId) {
    destroyChart('main');
    const ctx = prepCanvas(canvasId);
    if (!ctx) return;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    charts.main = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Activity',
          data: [14, 18, 12, 22, 19, 8, 5],
          backgroundColor: (c) => {
            const g = c.chart.ctx.createLinearGradient(0, 0, 0, 280);
            g.addColorStop(0, '#6366f1'); g.addColorStop(1, '#818cf8');
            return g;
          },
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1, cornerRadius: 8 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', font: { size: 11 } }, beginAtZero: true },
        },
      },
    });
  }

  function renderRevenueChart(canvasId) {
    destroyChart('main');
    const ctx = prepCanvas(canvasId);
    if (!ctx) return;
    const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    charts.main = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue ($K)',
          data: [32, 38, 35, 42, 45, 48.2],
          borderColor: '#6366f1',
          backgroundColor: (c) => {
            const g = c.chart.ctx.createLinearGradient(0, 0, 0, 280);
            g.addColorStop(0, 'rgba(99,102,241,0.25)'); g.addColorStop(1, 'rgba(99,102,241,0)');
            return g;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#6366f1',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1e293b', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1, cornerRadius: 8 },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '$' + v + 'K' }, beginAtZero: false },
        },
        interaction: { intersect: false, mode: 'index' },
      },
    });
  }

  /* ── Activity feed data ─────────────────────────────────────────────────── */

  async function getActivityItems(name) {
    const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

    // Try live DataStore first
    try {
      if (typeof DataStore !== 'undefined') {
        const logs = await DataStore.list('audit_log');
        if (logs && logs.length > 0) {
          return logs.slice(0, 15).map((entry, i) => {
            const who = entry.user || entry.actor || entry.name || 'System';
            return {
              name: who,
              initial: who.charAt(0),
              color: colors[i % colors.length],
              action: entry.action || entry.message || entry.description || 'performed an action',
              time: entry.timestamp || entry.created_at || entry.time || new Date().toISOString(),
            };
          });
        }
      }
    } catch (_) {}

    // Fallback to seed data
    const actions = [
      'completed job #1042', 'clocked in', 'uploaded safety report',
      'updated invoice #308', 'assigned tool to crew', 'approved time-off request',
      'added new customer', 'submitted daily log', 'updated schedule',
      'checked out tool #T-19',
    ];
    const names = [name, 'Alex R.', 'Maria S.', 'Jordan T.', 'Sam K.'];
    const items = [];
    const now = Date.now();
    for (let i = 0; i < 10; i++) {
      const n = names[i % names.length];
      items.push({
        name: n,
        initial: n.charAt(0),
        color: colors[i % colors.length],
        action: actions[i % actions.length],
        time: new Date(now - i * 420000).toISOString(),
      });
    }
    return items;
  }

  /* ── Render activity list HTML ─────────────────────────────────────────── */

  function renderActivityHTML(activities) {
    return activities.map(a =>
      '<li class="ed-activity-item">' +
        '<div class="ed-avatar-sm" style="background:' + a.color + '">' + san(a.initial) + '</div>' +
        '<div>' +
          '<div class="ed-activity-text"><strong>' + san(a.name) + '</strong> ' + san(a.action) + '</div>' +
          '<div class="ed-activity-time">' + san(relativeTime(a.time)) + '</div>' +
        '</div>' +
      '</li>'
    ).join('');
  }

  /* ── Refresh helpers for real-time updates ──────────────────────────────── */

  async function refreshActivity(name) {
    const list = document.getElementById('ed-activity-list');
    if (!list) return;
    const items = await getActivityItems(name);
    list.innerHTML = renderActivityHTML(items);
  }

  async function refreshStats(role) {
    const stats = await getStats(role);
    const statEls = document.querySelectorAll('.ed-stat-value');
    statEls.forEach((el, i) => {
      if (stats[i]) {
        const target = stats[i].value;
        el.dataset.target = target;
        if (stats[i].format) el.dataset.format = stats[i].format;
        animateCounter(el, target, 600);
      }
    });
  }

  /* ── Search ─────────────────────────────────────────────────────────────── */

  function buildSearchIndex() {
    const pages = [
      { name: 'Dashboard', route: 'dashboard', icon: '\uD83C\uDFE0' },
      { name: 'Job Board', route: 'jobs', icon: '\uD83D\uDCCB' },
      { name: 'Schedule', route: 'schedule', icon: '\uD83D\uDCC5' },
      { name: 'Time Clock', route: 'timeclock', icon: '\u23F0' },
      { name: 'Tool Tracker', route: 'tools', icon: '\uD83D\uDD27' },
      { name: 'Employees', route: 'employees', icon: '\uD83D\uDC65' },
      { name: 'Invoicing', route: 'invoicing', icon: '\uD83D\uDCB3' },
      { name: 'CRM', route: 'crm', icon: '\uD83D\uDC64' },
      { name: 'Reports', route: 'reports', icon: '\uD83D\uDCCA' },
      { name: 'Documents', route: 'documents', icon: '\uD83D\uDCC4' },
      { name: 'Safety', route: 'safety', icon: '\u26A0\uFE0F' },
      { name: 'Settings', route: 'settings', icon: '\u2699\uFE0F' },
      { name: 'Profile', route: 'profile', icon: '\uD83D\uDC64' },
      { name: 'Audit Log', route: 'audit', icon: '\uD83D\uDCDD' },
    ];
    if (typeof Fuse !== 'undefined') {
      searchFuse = new Fuse(pages, { keys: ['name'], threshold: 0.4 });
    }
    return pages;
  }

  function openSearch() {
    if (!searchOverlayEl) return;
    searchOverlayEl.classList.add('open');
    const inp = searchOverlayEl.querySelector('.ed-search-input');
    if (inp) { inp.value = ''; inp.focus(); }
    selectedResultIdx = -1;
    renderSearchResults('');
  }

  function closeSearch() {
    if (searchOverlayEl) searchOverlayEl.classList.remove('open');
  }

  function renderSearchResults(query) {
    const container = searchOverlayEl && searchOverlayEl.querySelector('.ed-search-results');
    if (!container) return;
    const pages = buildSearchIndex();
    let results = [];
    if (!query) {
      results = pages.slice(0, 6);
    } else if (searchFuse) {
      results = searchFuse.search(query).map(r => r.item).slice(0, 8);
    } else {
      const q = query.toLowerCase();
      results = pages.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
    }
    container.innerHTML = results.map((r, i) =>
      '<div class="ed-search-result' + (i === selectedResultIdx ? ' selected' : '') + '" data-route="' + san(r.route) + '">' +
        '<span class="ed-search-result-icon">' + san(r.icon) + '</span>' +
        '<span>' + san(r.name) + '</span>' +
      '</div>'
    ).join('');
    container.querySelectorAll('.ed-search-result').forEach(el => {
      el.addEventListener('click', () => {
        closeSearch();
        if (typeof Router !== 'undefined') Router.navigate(el.dataset.route);
      });
    });
  }

  function handleSearchKeydown(e) {
    const results = searchOverlayEl ? searchOverlayEl.querySelectorAll('.ed-search-result') : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedResultIdx = Math.min(selectedResultIdx + 1, results.length - 1);
      updateSearchSelection(results);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedResultIdx = Math.max(selectedResultIdx - 1, 0);
      updateSearchSelection(results);
    } else if (e.key === 'Enter' && results[selectedResultIdx]) {
      e.preventDefault();
      closeSearch();
      if (typeof Router !== 'undefined') Router.navigate(results[selectedResultIdx].dataset.route);
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  }

  function updateSearchSelection(results) {
    results.forEach((el, i) => el.classList.toggle('selected', i === selectedResultIdx));
  }

  /* ── Tab indicator positioning ─────────────────────────────────────────── */

  function positionTabIndicator(tabBar, activeTab) {
    let indicator = tabBar.querySelector('.ed-tab-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'ed-tab-indicator';
      tabBar.style.position = 'relative';
      tabBar.appendChild(indicator);
    }
    const barRect = tabBar.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    indicator.style.width = tabRect.width + 'px';
    indicator.style.transform = 'translateX(' + (tabRect.left - barRect.left) + 'px)';
    indicator.style.opacity = '1';
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  async function render() {
    cleanup();
    injectStyles();

    const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
    const name = session && session.name ? session.name.split(' ')[0] : 'User';
    const role = session ? session.role : 'field';

    const main = document.getElementById('main-body');
    if (!main) return;

    const stats = await getStats(role);
    const quickActions = getQuickActions(role);
    const quickLinks = getQuickLinks(role);
    const activities = await getActivityItems(name);

    const now = new Date();
    const dateStr = typeof dayjs !== 'undefined'
      ? dayjs().format('dddd, MMMM D, YYYY')
      : now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    main.innerHTML = '<div class="ed-wrap">' +
      '<div class="ed-content">' +

      /* Welcome */
      '<div class="ed-welcome">' +
        '<h1>' + san(greetingText()) + ', ' + san(name) +
          ' <span class="ed-role-badge">' + san(role) + '</span>' +
          ' <span class="ed-search-hint" id="ed-search-hint" title="Search">Ctrl+K</span>' +
        '</h1>' +
        '<p class="ed-subtitle" id="ed-clock">' + san(dateStr) + ' &middot; ' + san(formatTime(now)) + '</p>' +
        '<div class="ed-quick-actions">' +
          quickActions.map(a =>
            '<button class="ed-action-pill" data-route="' + san(a.route) + '">' + san(a.label) + '</button>'
          ).join('') +
        '</div>' +
      '</div>' +

      /* Stats */
      '<div class="ed-stats">' +
        stats.map((s, i) =>
          '<div class="ed-glass ed-stat">' +
            '<div class="ed-stat-icon" style="background:' + s.bg + '">' + san(s.emoji) + '</div>' +
            '<div>' +
              '<div class="ed-stat-value" data-target="' + s.value + '"' +
                (s.format ? ' data-format="' + s.format + '"' : '') + '>0</div>' +
              '<div class="ed-stat-label">' + san(s.label) + '</div>' +
              (s.trend ? '<div class="ed-stat-trend ' + (s.up ? 'ed-trend-up' : 'ed-trend-down') + '">' +
                (s.up ? '\u25B2 ' : '\u25BC ') + san(s.trend) + '</div>' : '') +
            '</div>' +
          '</div>'
        ).join('') +
      '</div>' +

      /* Two columns */
      '<div class="ed-two-col">' +
        /* Charts panel */
        '<div class="ed-glass">' +
          '<div class="ed-section-hdr"><h3>Analytics</h3></div>' +
          '<div class="ed-tab-bar">' +
            '<button class="ed-tab active" data-chart="overview">Overview</button>' +
            '<button class="ed-tab" data-chart="weekly">Weekly</button>' +
            (isAdmin(role) ? '<button class="ed-tab" data-chart="revenue">Revenue</button>' : '') +
          '</div>' +
          '<div class="ed-chart-wrap"><canvas id="ed-chart-canvas" style="display:block;width:100%;max-height:100%"></canvas></div>' +
        '</div>' +

        /* Activity Feed */
        '<div class="ed-glass">' +
          '<div class="ed-section-hdr">' +
            '<h3>Recent Activity <span class="ed-live-dot"></span></h3>' +
          '</div>' +
          '<ul class="ed-activity-list" id="ed-activity-list">' +
            renderActivityHTML(activities) +
          '</ul>' +
        '</div>' +
      '</div>' +

      /* Quick Links */
      '<div class="ed-links">' +
        quickLinks.map(l =>
          '<div class="ed-glass ed-link-card" data-route="' + san(l.route) + '">' +
            '<div class="ed-link-icon">' + san(l.icon) + '</div>' +
            '<div class="ed-link-label">' + san(l.label) + '</div>' +
            '<div class="ed-link-desc">' + san(l.desc) + '</div>' +
          '</div>'
        ).join('') +
      '</div>' +

      '</div>' + /* ed-content */
    '</div>';   /* ed-wrap */

    /* ── Post-render setup ──────────────────────────────────────────────── */

    // Counter animations
    main.querySelectorAll('.ed-stat-value').forEach(el => {
      const target = parseFloat(el.dataset.target);
      if (!isNaN(target)) animateCounter(el, target);
    });

    // Clock interval
    clockInterval = setInterval(() => {
      const el = document.getElementById('ed-clock');
      if (el) {
        const n = new Date();
        const d = typeof dayjs !== 'undefined'
          ? dayjs().format('dddd, MMMM D, YYYY')
          : n.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        el.innerHTML = san(d) + ' &middot; ' + san(formatTime(n));
      }
    }, 60000);

    // Initial chart
    renderOverviewChart('ed-chart-canvas');

    // Position the sliding tab indicator after first paint
    requestAnimationFrame(() => {
      const tabBar = main.querySelector('.ed-tab-bar');
      const activeTab = tabBar && tabBar.querySelector('.ed-tab.active');
      if (tabBar && activeTab) positionTabIndicator(tabBar, activeTab);
    });

    // Tab switching
    main.querySelectorAll('.ed-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        main.querySelectorAll('.ed-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Slide the indicator
        const tabBar = tab.closest('.ed-tab-bar');
        if (tabBar) positionTabIndicator(tabBar, tab);

        // Recreate the canvas to avoid stale state
        const wrap = main.querySelector('.ed-chart-wrap');
        if (wrap) {
          wrap.innerHTML = '<canvas id="ed-chart-canvas" style="display:block;width:100%;max-height:100%"></canvas>';
        }

        const which = tab.dataset.chart;
        if (which === 'overview') renderOverviewChart('ed-chart-canvas');
        else if (which === 'weekly') renderWeeklyChart('ed-chart-canvas');
        else if (which === 'revenue') renderRevenueChart('ed-chart-canvas');
      });
    });

    // Quick action pills
    main.querySelectorAll('.ed-action-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof Router !== 'undefined') Router.navigate(btn.dataset.route);
      });
    });

    // Quick link cards
    main.querySelectorAll('.ed-link-card').forEach(card => {
      card.addEventListener('click', () => {
        if (typeof Router !== 'undefined') Router.navigate(card.dataset.route);
      });
    });

    // Activity auto-refresh (async, re-queries DataStore)
    activityInterval = setInterval(async () => {
      await refreshActivity(name);
    }, 30000);

    // Real-time subscriptions via AppEvents
    if (typeof AppEvents !== 'undefined') {
      eventUnsubs.push(AppEvents.on('data:audit_log:create', () => refreshActivity(name)));
      eventUnsubs.push(AppEvents.on('data:approvals:update', () => refreshStats(role)));
      eventUnsubs.push(AppEvents.on('auth:login', () => refreshActivity(name)));
    }

    // Search overlay
    setupSearch();

    // Search hint click
    const hint = document.getElementById('ed-search-hint');
    if (hint) hint.addEventListener('click', openSearch);
  }

  /* ── Search overlay setup ───────────────────────────────────────────────── */

  function setupSearch() {
    // Remove old overlay if present
    const old = document.getElementById('ed-search-overlay');
    if (old) old.remove();

    searchOverlayEl = document.createElement('div');
    searchOverlayEl.id = 'ed-search-overlay';
    searchOverlayEl.className = 'ed-search-overlay';
    searchOverlayEl.innerHTML =
      '<div class="ed-search-box">' +
        '<input class="ed-search-input" placeholder="Search pages, tools, actions..." />' +
        '<div class="ed-search-results"></div>' +
      '</div>';
    document.body.appendChild(searchOverlayEl);

    // Close on backdrop click
    searchOverlayEl.addEventListener('click', (e) => {
      if (e.target === searchOverlayEl) closeSearch();
    });

    // Input
    const inp = searchOverlayEl.querySelector('.ed-search-input');
    if (inp) {
      inp.addEventListener('input', () => {
        selectedResultIdx = -1;
        renderSearchResults(inp.value.trim());
      });
      inp.addEventListener('keydown', handleSearchKeydown);
    }

    // Build index
    buildSearchIndex();

    // Global keyboard shortcut
    document.removeEventListener('keydown', globalSearchKeyHandler);
    document.addEventListener('keydown', globalSearchKeyHandler);
  }

  function globalSearchKeyHandler(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchOverlayEl && searchOverlayEl.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
    }
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */

  return { render };
})();

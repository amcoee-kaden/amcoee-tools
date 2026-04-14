/* ==============================================================================
   AMCOEE TOOLS — Owner Dashboard (Command Center)
   Head Admin dashboard: stat cards, activity feed, approval queue,
   people overview, financial snapshot, security panel, analytics, FAB
   ============================================================================== */

const OwnerDashboard = (() => {

  // ── Chart instance registry (destroyed on re-render) ──────────────────────
  const charts = {};
  let alertInterval = null;
  let feedInterval = null;
  let snoozedAlerts = {};

  // ── Mock / seed data ──────────────────────────────────────────────────────
  const MOCK_STATS = {
    activeJobs: { value: 12, trend: +8, label: 'Active Jobs', icon: 'briefcase' },
    revenueMTD: { value: 48200, trend: +72, label: 'Revenue MTD', icon: 'dollar-sign' },
    toolsOut: { value: 18, overdue: 2, label: 'Tools Out', icon: 'wrench' },
    openInvoices: { value: 12400, label: 'Open Invoices', icon: 'file-text' },
  };

  const MOCK_FINANCIALS = {
    revenue: 48200, expenses: 31100, profitMargin: 35.5,
    topJobs: [
      { name: 'Riverside Office Buildout', revenue: 14200 },
      { name: 'Main St Renovation', revenue: 9800 },
      { name: 'Parkview Electrical', revenue: 7600 },
    ],
    overdueInvoices: 3,
  };

  const SEED_APPROVALS = [
    { id: 'apr_1', type: 'pay', title: 'Overtime Pay — Marcus Rivera', meta: 'Week of Apr 7 · 6.5 hrs OT · $487.50', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), overdue: true },
    { id: 'apr_2', type: 'expenses', title: 'Fuel Reimbursement — Jake Torres', meta: '$132.40 · Receipts attached', createdAt: new Date(Date.now() - 86400000).toISOString(), overdue: false },
    { id: 'apr_3', type: 'time_off', title: 'PTO Request — Sarah Kim', meta: 'Apr 21–25 · 5 days', createdAt: new Date(Date.now() - 3600000).toISOString(), overdue: false },
    { id: 'apr_4', type: 'pay', title: 'Bonus — Derek Hall', meta: 'Q1 performance bonus · $1,200', createdAt: new Date(Date.now() - 7200000).toISOString(), overdue: false },
  ];

  const SEED_ACTIVITY = [
    { id: 'act_1', userId: 'u1', userName: 'Marcus Rivera', role: 'field', action: 'Clocked in at Riverside Office site', timestamp: new Date(Date.now() - 300000).toISOString() },
    { id: 'act_2', userId: 'u2', userName: 'Sarah Kim', role: 'admin', action: 'Submitted PTO request (Apr 21–25)', timestamp: new Date(Date.now() - 900000).toISOString() },
    { id: 'act_3', userId: 'u3', userName: 'Jake Torres', role: 'field', action: 'Uploaded fuel receipt ($132.40)', timestamp: new Date(Date.now() - 1800000).toISOString() },
    { id: 'act_4', userId: 'u4', userName: 'Derek Hall', role: 'manager', action: 'Approved time entry for crew B', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: 'act_5', userId: 'sys', userName: 'System', role: 'system', action: 'Nightly backup completed', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 'act_6', userId: 'u5', userName: 'Anonymous', role: 'unknown', action: 'Failed login attempt from 192.168.1.44', timestamp: new Date(Date.now() - 10800000).toISOString(), anomaly: true },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────

  function san(text) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(text) : text;
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  function fmtCurrency(n) {
    if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
    return '$' + n.toFixed(0);
  }

  function animateCounter(el, target, duration = 800) {
    const start = parseInt(el.textContent.replace(/[^0-9.-]/g, ''), 10) || 0;
    const startTime = performance.now();
    const isCurrency = el.dataset.format === 'currency';
    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      el.textContent = isCurrency ? fmtCurrency(current) : current.toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initials(name) {
    return (name || '??').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function roleColor(role) {
    const map = { owner: '#6366f1', admin: '#8b5cf6', manager: '#f59e0b', field: '#10b981', system: '#64748b', unknown: '#ef4444' };
    return map[role] || '#94a3b8';
  }

  // ── Priority alerts ───────────────────────────────────────────────────────

  async function gatherAlerts(session) {
    const alerts = [];
    try {
      const approvals = await DataStore.list('approvals');
      const pending = (approvals || []).filter(a => !a.resolved);
      if (pending.length > 0) {
        const overdue = pending.filter(a => a.overdue);
        if (overdue.length > 0) {
          alerts.push({ level: 'red', text: `${overdue.length} overdue approval(s) need attention`, target: '#approval-queue' });
        } else {
          alerts.push({ level: 'amber', text: `${pending.length} pending approval(s) waiting`, target: '#approval-queue' });
        }
      }
    } catch (_) { /* DataStore might not have approvals yet */ }
    try {
      const failed = await SecurityMonitor.getFailedAttempts(24);
      if (failed && failed.length >= 3) {
        alerts.push({ level: 'red', text: `${failed.length} failed login attempts in the last 24h`, target: '#security-panel' });
      }
    } catch (_) {}
    // Cert expiry check (mock — no real cert store yet)
    alerts.push({ level: 'blue', text: 'SSL certificate renews in 12 days', target: '#security-panel' });
    return alerts.filter(a => !snoozedAlerts[a.text]);
  }

  function renderAlertStrip(container, alerts) {
    if (alertInterval) { clearInterval(alertInterval); alertInterval = null; }
    const strip = document.createElement('div');
    strip.className = 'alert-strip';
    if (!alerts.length) { strip.style.display = 'none'; container.prepend(strip); return strip; }

    let idx = 0;
    function show() {
      const a = alerts[idx % alerts.length];
      strip.className = 'alert-strip alert-strip--' + a.level;
      strip.innerHTML = `
        <span class="alert-strip-text">${san(a.text)}</span>
        <button class="alert-strip-dismiss" title="Snooze">&times;</button>`;
      strip.querySelector('.alert-strip-text').addEventListener('click', () => {
        if (a.target.startsWith('#')) {
          const el = document.querySelector(a.target) || document.getElementById(a.target.slice(1));
          if (el) el.scrollIntoView({ behavior: 'smooth' });
          else if (typeof Router !== 'undefined') Router.navigate(a.target);
        }
      });
      strip.querySelector('.alert-strip-dismiss').addEventListener('click', (e) => {
        e.stopPropagation();
        snoozedAlerts[a.text] = true;
        alerts.splice(idx % alerts.length, 1);
        if (!alerts.length) { strip.style.display = 'none'; clearInterval(alertInterval); }
        else show();
      });
    }
    show();
    if (alerts.length > 1) {
      alertInterval = setInterval(() => { idx++; show(); }, 5000);
    }
    container.prepend(strip);
    return strip;
  }

  // ── Row 1: Command Stat Cards ─────────────────────────────────────────────

  async function renderStatCards(session) {
    const row = document.createElement('div');
    row.className = 'dashboard-row stat-cards-row';

    // Crew in field — live
    let crewInField = 0, totalField = 0;
    try {
      const sessions = await DataStore.list('sessions');
      const users = await DataStore.list('users');
      const fieldUsers = (users || []).filter(u => u.role === 'field' || u.department === 'field');
      totalField = fieldUsers.length || 8;
      const activeThreshold = Date.now() - 8 * 3600000;
      crewInField = (sessions || []).filter(s => new Date(s.lastActivity || s.createdAt).getTime() > activeThreshold).length;
    } catch (_) { crewInField = 5; totalField = 8; }

    // Pending approvals — live
    let pendingCount = 0;
    try {
      const approvals = await DataStore.list('approvals');
      pendingCount = (approvals || []).filter(a => !a.resolved).length;
    } catch (_) { pendingCount = SEED_APPROVALS.length; }

    const cards = [
      { icon: '&#128188;', value: MOCK_STATS.activeJobs.value, label: 'Active Jobs', sub: '+8% vs last week', target: '#jobs', format: 'number' },
      { icon: '&#128104;&#8205;&#128295;', value: crewInField, label: 'Crew in Field', sub: `${crewInField} / ${totalField} field users`, target: '#timeclock', format: 'number' },
      { icon: '&#128176;', value: MOCK_STATS.revenueMTD.value, label: 'Revenue MTD', sub: '72% to target', target: '#reporting', format: 'currency' },
      { icon: '&#9201;', value: pendingCount, label: 'Pending Approvals', sub: pendingCount > 0 ? 'Action needed' : 'All clear', target: '#approval-queue', format: 'number', pulse: pendingCount > 0 },
      { icon: '&#128295;', value: MOCK_STATS.toolsOut.value, label: 'Tools Out', sub: `${MOCK_STATS.toolsOut.overdue} overdue`, target: '#tool-tracker', format: 'number' },
      { icon: '&#128196;', value: MOCK_STATS.openInvoices.value, label: 'Open Invoices', sub: 'Outstanding', target: '#invoicing', format: 'currency' },
    ];

    cards.forEach(c => {
      const card = document.createElement('div');
      card.className = 'command-stat' + (c.pulse ? ' command-stat--pulse' : '');
      card.innerHTML = `
        <div class="command-stat-icon">${c.icon}</div>
        <div class="command-stat-value" data-format="${c.format}" data-target-value="${c.value}">${c.format === 'currency' ? '$0' : '0'}</div>
        <div class="command-stat-label">${san(c.label)}</div>
        <div class="command-stat-sub">${san(c.sub)}</div>`;
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        const el = document.querySelector(c.target) || document.getElementById(c.target.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else if (typeof Router !== 'undefined') Router.navigate(c.target);
      });
      row.appendChild(card);
    });

    // Animate counters after paint
    requestAnimationFrame(() => {
      $$('.command-stat-value', row).forEach(el => {
        animateCounter(el, parseInt(el.dataset.targetValue, 10));
      });
    });
    return row;
  }

  // ── Row 2 Left: Activity Feed ─────────────────────────────────────────────

  async function renderActivityFeed() {
    const wrap = document.createElement('div');
    wrap.className = 'panel activity-feed-panel';
    wrap.id = 'activity-feed';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<h3 class="panel-title">Activity Feed</h3>
      <button class="panel-collapse-btn" title="Collapse">&#9660;</button>`;
    wrap.appendChild(header);

    // Filter bar
    const filters = document.createElement('div');
    filters.className = 'feed-filters';
    ['All', 'Logins', 'Data Changes', 'Security'].forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm' + (f === 'All' ? ' btn-primary' : ' btn-secondary');
      btn.textContent = f;
      btn.dataset.filter = f.toLowerCase().replace(' ', '_');
      btn.addEventListener('click', () => {
        $$('.feed-filters .btn', wrap).forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
        btn.classList.replace('btn-secondary', 'btn-primary');
        renderEntries(btn.dataset.filter);
      });
      filters.appendChild(btn);
    });
    wrap.appendChild(filters);

    const listEl = document.createElement('div');
    listEl.className = 'feed-list';
    wrap.appendChild(listEl);

    async function renderEntries(filter) {
      let entries = [];
      try {
        entries = await AuditLog.getEntries({ limit: 50 });
      } catch (_) {}
      if (!entries || entries.length === 0) entries = SEED_ACTIVITY;

      if (filter && filter !== 'all') {
        entries = entries.filter(e => {
          const a = (e.action || '').toLowerCase();
          if (filter === 'logins') return a.includes('login') || a.includes('logged') || a.includes('session');
          if (filter === 'data_changes') return a.includes('create') || a.includes('update') || a.includes('delete');
          if (filter === 'security') return a.includes('fail') || a.includes('lock') || a.includes('anomal') || e.anomaly;
          return true;
        });
      }

      listEl.innerHTML = '';
      entries.forEach(e => {
        const row = document.createElement('div');
        row.className = 'feed-entry' + (e.anomaly ? ' anomaly' : '');
        const avatarColor = roleColor(e.role);
        row.innerHTML = `
          <div class="feed-avatar" style="background:${avatarColor}">${initials(e.userName)}</div>
          <div class="feed-body">
            <span class="feed-name">${san(e.userName || 'Unknown')}</span>
            <span class="feed-action">${san(e.action || e.description || '')}</span>
          </div>
          <div class="feed-time">${UI.timeAgo(e.timestamp)}</div>`;
        listEl.appendChild(row);
      });
      if (entries.length === 0) {
        listEl.innerHTML = '<div class="empty-state">No activity to show</div>';
      }
    }

    await renderEntries('all');

    // Collapse toggle
    header.querySelector('.panel-collapse-btn').addEventListener('click', () => {
      wrap.classList.toggle('collapsed');
    });

    // Auto-refresh every 30s
    if (feedInterval) clearInterval(feedInterval);
    feedInterval = setInterval(() => {
      const activeFilter = ($('.feed-filters .btn-primary', wrap) || {}).dataset;
      renderEntries((activeFilter && activeFilter.filter) || 'all');
    }, 30000);

    return wrap;
  }

  // ── Row 2 Right: Approval Queue ───────────────────────────────────────────

  async function renderApprovalQueue() {
    const wrap = document.createElement('div');
    wrap.className = 'panel approval-queue-panel';
    wrap.id = 'approval-queue';

    let approvals = [];
    try {
      approvals = await DataStore.list('approvals');
    } catch (_) {}
    if (!approvals || approvals.length === 0) {
      // Seed sample approvals so the dashboard isn't empty
      approvals = SEED_APPROVALS;
      try { for (const a of approvals) await DataStore.create('approvals', a); } catch (_) {}
    }

    const tabs = [
      { key: 'all', label: 'All' },
      { key: 'pay', label: 'Pay' },
      { key: 'expenses', label: 'Expenses' },
      { key: 'time_off', label: 'Time Off' },
    ];

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<h3 class="panel-title">Approval Queue</h3>
      <button class="panel-collapse-btn" title="Collapse">&#9660;</button>`;
    wrap.appendChild(header);

    const tabBar = document.createElement('div');
    tabBar.className = 'approval-tabs';
    tabs.forEach(t => {
      const count = t.key === 'all' ? approvals.filter(a => !a.resolved).length : approvals.filter(a => !a.resolved && a.type === t.key).length;
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm' + (t.key === 'all' ? ' btn-primary' : ' btn-secondary');
      btn.innerHTML = `${san(t.label)} <span class="badge">${count}</span>`;
      btn.dataset.tab = t.key;
      btn.addEventListener('click', () => {
        $$('.approval-tabs .btn', wrap).forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
        btn.classList.replace('btn-secondary', 'btn-primary');
        renderCards(t.key);
      });
      tabBar.appendChild(btn);
    });
    wrap.appendChild(tabBar);

    const listEl = document.createElement('div');
    listEl.className = 'approval-list';
    wrap.appendChild(listEl);

    function renderCards(filter) {
      let items = approvals.filter(a => !a.resolved);
      if (filter !== 'all') items = items.filter(a => a.type === filter);

      listEl.innerHTML = '';
      if (items.length === 0) {
        listEl.innerHTML = '<div class="empty-state">No pending approvals</div>';
        return;
      }
      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'approval-card' + (item.overdue ? ' overdue' : '');
        card.innerHTML = `
          <div class="approval-card-body">
            <div class="approval-title">${san(item.title)}</div>
            <div class="approval-meta">${san(item.meta || '')}</div>
          </div>
          <div class="approval-actions">
            <button class="btn btn-sm btn-primary" data-action="approve">Approve</button>
            <button class="btn btn-sm btn-danger" data-action="reject">Reject</button>
          </div>`;
        card.querySelector('[data-action="approve"]').addEventListener('click', async () => {
          item.resolved = true; item.resolution = 'approved';
          try { await DataStore.update('approvals', item.id, { resolved: true, resolution: 'approved' }); } catch (_) {}
          UI.toast('Approved: ' + item.title, 'success');
          renderCards(filter);
          updateApprovalBadges();
        });
        card.querySelector('[data-action="reject"]').addEventListener('click', async () => {
          item.resolved = true; item.resolution = 'rejected';
          try { await DataStore.update('approvals', item.id, { resolved: true, resolution: 'rejected' }); } catch (_) {}
          UI.toast('Rejected: ' + item.title, 'warning');
          renderCards(filter);
          updateApprovalBadges();
        });
        listEl.appendChild(card);
      });
    }

    function updateApprovalBadges() {
      $$('.approval-tabs .btn', wrap).forEach(btn => {
        const key = btn.dataset.tab;
        const count = key === 'all' ? approvals.filter(a => !a.resolved).length : approvals.filter(a => !a.resolved && a.type === key).length;
        const badge = btn.querySelector('.badge');
        if (badge) badge.textContent = count;
      });
    }

    renderCards('all');

    header.querySelector('.panel-collapse-btn').addEventListener('click', () => {
      wrap.classList.toggle('collapsed');
    });

    return wrap;
  }

  // ── Row 3 Col 1: People Overview ──────────────────────────────────────────

  async function renderPeopleOverview() {
    const wrap = document.createElement('div');
    wrap.className = 'panel people-panel';

    let users = [];
    try { users = await DataStore.list('users') || []; } catch (_) {}
    const totalEmployees = users.length || 14;
    const fieldCount = users.filter(u => u.role === 'field' || u.department === 'field').length || 8;
    const officeCount = totalEmployees - fieldCount;

    // Department breakdown
    const depts = {};
    users.forEach(u => { const d = u.department || 'Unassigned'; depts[d] = (depts[d] || 0) + 1; });
    if (Object.keys(depts).length === 0) {
      depts['Field Ops'] = 8; depts['Office'] = 4; depts['Management'] = 2;
    }

    wrap.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">People Overview</h3>
        <button class="panel-collapse-btn" title="Collapse">&#9660;</button>
      </div>
      <div class="people-stats">
        <div class="people-stat"><strong>${totalEmployees}</strong><span>Total</span></div>
        <div class="people-stat"><strong>${fieldCount}</strong><span>Field</span></div>
        <div class="people-stat"><strong>${officeCount}</strong><span>Office</span></div>
      </div>
      <div class="dept-breakdown">${Object.entries(depts).map(([d, c]) => `<div class="dept-row"><span>${san(d)}</span><span>${c}</span></div>`).join('')}</div>
      <h4 class="section-sub">Attendance</h4>
      <div class="attendance-grid">${Array.from({ length: totalEmployees }, () => {
        const r = Math.random();
        const color = r < 0.65 ? 'var(--success, #10b981)' : r < 0.85 ? 'var(--danger, #ef4444)' : '#94a3b8';
        return `<span class="att-dot" style="background:${color}"></span>`;
      }).join('')}</div>`;

    wrap.querySelector('.panel-collapse-btn').addEventListener('click', () => wrap.classList.toggle('collapsed'));
    return wrap;
  }

  // ── Row 3 Col 2: Financial Snapshot ───────────────────────────────────────

  function renderFinancialSnapshot() {
    const wrap = document.createElement('div');
    wrap.className = 'panel financial-panel';
    const f = MOCK_FINANCIALS;

    wrap.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Financial Snapshot</h3>
        <button class="panel-collapse-btn" title="Collapse">&#9660;</button>
      </div>
      <div class="financial-kpis">
        <div class="fin-kpi"><span class="fin-kpi-val">${fmtCurrency(f.revenue)}</span><span class="fin-kpi-label">Revenue</span></div>
        <div class="fin-kpi"><span class="fin-kpi-val">${fmtCurrency(f.expenses)}</span><span class="fin-kpi-label">Expenses</span></div>
        <div class="fin-kpi"><span class="fin-kpi-val">${f.profitMargin}%</span><span class="fin-kpi-label">Margin</span></div>
      </div>
      <h4 class="section-sub">Top Jobs by Revenue</h4>
      <div class="top-jobs">${f.topJobs.map(j => `<div class="top-job-row"><span>${san(j.name)}</span><span>${fmtCurrency(j.revenue)}</span></div>`).join('')}</div>
      <div class="overdue-invoices">Overdue invoices: <strong>${f.overdueInvoices}</strong></div>`;

    wrap.querySelector('.panel-collapse-btn').addEventListener('click', () => wrap.classList.toggle('collapsed'));
    return wrap;
  }

  // ── Row 3 Col 3: Security Panel ───────────────────────────────────────────

  async function renderSecurityPanel() {
    const wrap = document.createElement('div');
    wrap.className = 'panel security-panel';
    wrap.id = 'security-panel';

    let activeSessions = 0, failedAttempts = [], anomalies = [], storageUsage = null;
    try { activeSessions = ((await SecurityMonitor.getActiveSessions()) || []).length; } catch (_) { activeSessions = 3; }
    try { failedAttempts = (await SecurityMonitor.getFailedAttempts(24)) || []; } catch (_) { failedAttempts = [{ ts: new Date().toISOString() }]; }
    try { anomalies = (await SecurityMonitor.getAnomalies()) || []; } catch (_) { anomalies = []; }
    try { storageUsage = await DataStore.getStorageUsage(); } catch (_) { storageUsage = { used: '2.4 MB', total: '5 MB', percent: 48 }; }

    const pct = storageUsage && storageUsage.percent != null ? storageUsage.percent : 48;
    const usedLabel = storageUsage && storageUsage.used ? storageUsage.used : '2.4 MB';

    wrap.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Security</h3>
        <button class="panel-collapse-btn" title="Collapse">&#9660;</button>
      </div>
      <div class="sec-stats">
        <div class="sec-stat"><strong>${activeSessions}</strong><span>Active Sessions</span></div>
        <div class="sec-stat"><strong>${failedAttempts.length}</strong><span>Failed Logins (24h)</span></div>
        <div class="sec-stat"><strong>${anomalies.length}</strong><span>Anomalies</span></div>
      </div>
      <div class="storage-bar-wrap">
        <div class="storage-label">Storage: ${san(usedLabel)} (${pct}%)</div>
        <div class="storage-bar"><div class="storage-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <button class="btn btn-secondary btn-sm verify-integrity-btn" style="margin-top:12px;width:100%">Verify Integrity</button>`;

    wrap.querySelector('.verify-integrity-btn').addEventListener('click', async () => {
      const btn = wrap.querySelector('.verify-integrity-btn');
      btn.disabled = true; btn.textContent = 'Verifying...';
      try {
        const result = await AuditLog.verifyIntegrity();
        UI.toast(result && result.valid !== false ? 'Integrity check passed' : 'Integrity issues found — check audit log', result && result.valid !== false ? 'success' : 'error');
      } catch (err) {
        UI.toast('Integrity check failed: ' + (err.message || err), 'error');
      }
      btn.disabled = false; btn.textContent = 'Verify Integrity';
    });

    wrap.querySelector('.panel-collapse-btn').addEventListener('click', () => wrap.classList.toggle('collapsed'));
    return wrap;
  }

  // ── Row 4: Analytics Panel (tabbed with Chart.js) ─────────────────────────

  async function renderAnalyticsPanel() {
    const wrap = document.createElement('div');
    wrap.className = 'panel analytics-panel';
    wrap.id = 'analytics-panel';

    const tabDefs = [
      { key: 'usage', label: 'Usage' },
      { key: 'sessions', label: 'Sessions' },
      { key: 'adoption', label: 'Adoption' },
      { key: 'bottlenecks', label: 'Bottlenecks' },
    ];

    let dateRange = '30d';

    wrap.innerHTML = `
      <div class="panel-header">
        <h3 class="panel-title">Analytics</h3>
        <button class="panel-collapse-btn" title="Collapse">&#9660;</button>
      </div>
      <div class="analytics-controls">
        <div class="analytics-tabs">${tabDefs.map((t, i) => `<button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}" data-tab="${t.key}">${t.label}</button>`).join('')}</div>
        <div class="analytics-range">${['7d', '30d', '90d'].map(r => `<button class="btn btn-sm ${r === dateRange ? 'btn-primary' : 'btn-secondary'}" data-range="${r}">${r}</button>`).join('')}</div>
      </div>
      <div class="analytics-canvas-wrap"><canvas id="analytics-chart"></canvas></div>
      <div class="analytics-table-wrap" style="display:none"></div>`;

    function destroyCharts() {
      Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch (_) {} delete charts[k]; });
    }

    async function renderTab(tab) {
      destroyCharts();
      const canvasWrap = wrap.querySelector('.analytics-canvas-wrap');
      const tableWrap = wrap.querySelector('.analytics-table-wrap');
      canvasWrap.style.display = 'block';
      tableWrap.style.display = 'none';

      // Replace canvas to avoid Chart.js reuse issues
      canvasWrap.innerHTML = '<canvas id="analytics-chart"></canvas>';
      const canvas = canvasWrap.querySelector('canvas');
      const ctx = canvas.getContext('2d');

      if (typeof Chart === 'undefined') {
        canvasWrap.innerHTML = '<div class="empty-state">Chart.js not loaded</div>';
        return;
      }

      let aggregates = {};
      try { aggregates = await Analytics.getAggregates({ range: dateRange }) || {}; } catch (_) {}

      if (tab === 'usage') {
        const labels = aggregates.pageViews ? Object.keys(aggregates.pageViews) : ['TimeClock', 'Jobs', 'Invoicing', 'Tools', 'Payroll', 'Reports'];
        const data = aggregates.pageViews ? Object.values(aggregates.pageViews) : [120, 95, 72, 68, 45, 38];
        charts.usage = new Chart(ctx, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Page Views', data, backgroundColor: '#6366f1' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
        });
      } else if (tab === 'sessions') {
        const labels = aggregates.sessionsByRole ? Object.keys(aggregates.sessionsByRole) : ['Owner', 'Admin', 'Manager', 'Field'];
        const data = aggregates.sessionsByRole ? Object.values(aggregates.sessionsByRole) : [42, 35, 28, 18];
        charts.sessions = new Chart(ctx, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Avg Session (min)', data, backgroundColor: '#10b981' }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
        });
      } else if (tab === 'adoption') {
        const labels = aggregates.adoption ? Object.keys(aggregates.adoption) : ['TimeClock', 'Jobs', 'Invoicing', 'Tool Tracker', 'Payroll'];
        const data = aggregates.adoption ? Object.values(aggregates.adoption) : [92, 78, 65, 58, 41];
        charts.adoption = new Chart(ctx, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Adoption %', data, backgroundColor: '#f59e0b' }] },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } },
        });
      } else if (tab === 'bottlenecks') {
        canvasWrap.style.display = 'none';
        tableWrap.style.display = 'block';
        const rows = aggregates.bottlenecks || [
          { page: 'Payroll > Run Payroll', avgDwell: '4m 12s', visits: 34 },
          { page: 'Invoicing > New Invoice', avgDwell: '3m 48s', visits: 52 },
          { page: 'Employees > Edit Profile', avgDwell: '2m 55s', visits: 28 },
          { page: 'Reports > Generate', avgDwell: '2m 30s', visits: 19 },
        ];
        tableWrap.innerHTML = `<table class="data-table"><thead><tr><th>Page</th><th>Avg Dwell</th><th>Visits</th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${san(r.page)}</td><td>${san(r.avgDwell)}</td><td>${r.visits}</td></tr>`).join('')}</tbody></table>`;
      }
    }

    // Tab clicks
    wrap.querySelectorAll('.analytics-tabs .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.analytics-tabs .btn').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
        btn.classList.replace('btn-secondary', 'btn-primary');
        renderTab(btn.dataset.tab);
      });
    });

    // Range clicks
    wrap.querySelectorAll('.analytics-range .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wrap.querySelectorAll('.analytics-range .btn').forEach(b => b.classList.replace('btn-primary', 'btn-secondary'));
        btn.classList.replace('btn-secondary', 'btn-primary');
        dateRange = btn.dataset.range;
        const activeTab = (wrap.querySelector('.analytics-tabs .btn-primary') || {}).dataset;
        renderTab((activeTab && activeTab.tab) || 'usage');
      });
    });

    await renderTab('usage');
    wrap.querySelector('.panel-collapse-btn').addEventListener('click', () => wrap.classList.toggle('collapsed'));
    return wrap;
  }

  // ── FAB (Floating Action Button) ──────────────────────────────────────────

  function renderFAB() {
    const fab = document.createElement('div');
    fab.className = 'fab-container';
    fab.innerHTML = `
      <div class="fab-menu" style="display:none">
        <button class="fab-item" data-action="add-employee"><span>&#128100;</span> Add Employee</button>
        <button class="fab-item" data-action="create-announcement"><span>&#128227;</span> Create Announcement</button>
        <button class="fab-item" data-action="run-payroll"><span>&#128176;</span> Run Payroll</button>
        <button class="fab-item" data-action="generate-report"><span>&#128202;</span> Generate Report</button>
        <button class="fab-item" data-action="export-data"><span>&#128230;</span> Export Data</button>
        <button class="fab-item danger" data-action="emergency-lockdown"><span>&#128680;</span> Emergency Lockdown</button>
      </div>
      <button class="fab-trigger" title="Quick Actions">+</button>`;

    let open = false;
    const trigger = fab.querySelector('.fab-trigger');
    const menu = fab.querySelector('.fab-menu');

    trigger.addEventListener('click', () => {
      open = !open;
      menu.style.display = open ? 'flex' : 'none';
      trigger.textContent = open ? '\u00D7' : '+';
      trigger.classList.toggle('fab-open', open);
    });

    const actions = {
      'add-employee': () => { if (typeof Router !== 'undefined') Router.navigate('#employees'); },
      'create-announcement': () => { if (typeof Router !== 'undefined') Router.navigate('#announcements'); },
      'run-payroll': () => { if (typeof Router !== 'undefined') Router.navigate('#payroll'); },
      'generate-report': () => { if (typeof Router !== 'undefined') Router.navigate('#reporting'); },
      'export-data': async () => {
        try { await DataStore.exportAll(); UI.toast('Data export started', 'success'); }
        catch (err) { UI.toast('Export failed: ' + (err.message || err), 'error'); }
      },
      'emergency-lockdown': async () => {
        const confirmed = await UI.confirm('Emergency Lockdown', 'This will immediately lock all non-owner sessions. Proceed?', { confirmLabel: 'Activate Lockdown', danger: true });
        if (confirmed) {
          try { await SecurityMonitor.activateLockdown(); UI.toast('Lockdown activated', 'error'); }
          catch (err) { UI.toast('Lockdown failed: ' + (err.message || err), 'error'); }
        }
      },
    };

    fab.querySelectorAll('.fab-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const fn = actions[btn.dataset.action];
        if (fn) fn();
        open = false; menu.style.display = 'none';
        trigger.textContent = '+'; trigger.classList.remove('fab-open');
      });
    });

    return fab;
  }

  // ── Seed data helper ──────────────────────────────────────────────────────

  async function seedSampleData() {
    // Seed approvals if empty
    try {
      const existing = await DataStore.list('approvals');
      if (!existing || existing.length === 0) {
        for (const a of SEED_APPROVALS) {
          await DataStore.create('approvals', a);
        }
      }
    } catch (_) {}

    // Seed a few activity entries if audit log is empty
    try {
      const entries = await AuditLog.getEntries({ limit: 1 });
      if (!entries || entries.length === 0) {
        for (const act of SEED_ACTIVITY) {
          await AuditLog.log(act.action, { metadata: { seeded: true } });
        }
      }
    } catch (_) {}
  }

  // ── Main render ───────────────────────────────────────────────────────────

  async function render(container, session) {
    // Clean up previous render
    if (alertInterval) { clearInterval(alertInterval); alertInterval = null; }
    if (feedInterval) { clearInterval(feedInterval); feedInterval = null; }
    Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch (_) {} delete charts[k]; });

    container.innerHTML = '';
    const dashboard = document.createElement('div');
    dashboard.className = 'owner-dashboard';

    // Seed sample data on first render
    await seedSampleData();

    // Row 0: Alert strip
    const alerts = await gatherAlerts(session);
    renderAlertStrip(dashboard, alerts);

    // Row 1: Stat cards
    const statRow = await renderStatCards(session);
    dashboard.appendChild(statRow);

    // Row 2: Activity Feed + Approval Queue (60/40)
    const row2 = document.createElement('div');
    row2.className = 'dashboard-row dashboard-row--split-60-40';
    const feedPanel = await renderActivityFeed();
    const approvalPanel = await renderApprovalQueue();
    row2.appendChild(feedPanel);
    row2.appendChild(approvalPanel);
    dashboard.appendChild(row2);

    // Row 3: People + Financial + Security (3 columns)
    const row3 = document.createElement('div');
    row3.className = 'dashboard-row dashboard-row--three-col';
    const peoplePanel = await renderPeopleOverview();
    const financialPanel = renderFinancialSnapshot();
    const securityPanel = await renderSecurityPanel();
    row3.appendChild(peoplePanel);
    row3.appendChild(financialPanel);
    row3.appendChild(securityPanel);
    dashboard.appendChild(row3);

    // Row 4: Analytics
    const analyticsPanel = await renderAnalyticsPanel();
    dashboard.appendChild(analyticsPanel);

    container.appendChild(dashboard);

    // FAB
    container.appendChild(renderFAB());
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return { render };

})();

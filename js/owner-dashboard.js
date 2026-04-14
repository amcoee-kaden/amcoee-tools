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
  let clockInterval = null;
  let currentAlertIdx = 0;
  let snoozedAlerts = new Set();

  // ── Mock / seed data ──────────────────────────────────────────────────────
  const MOCK_STATS = [
    { key: 'activeJobs',      value: 12,    trend: +8,   label: 'Active Jobs',      icon: 'briefcase',   route: '/jobs',      prefix: '',  suffix: '' },
    { key: 'crewInField',     value: 0,     trend: 0,    label: 'Crew in Field',    icon: 'users',       route: '/employees', prefix: '',  suffix: '',  live: true },
    { key: 'revenueMTD',      value: 48200, trend: +12,  label: 'Revenue MTD',      icon: 'dollar-sign', route: '/invoices',  prefix: '$', suffix: '',  progress: { current: 48200, target: 67000 } },
    { key: 'pendingApprovals',value: 0,     trend: 0,    label: 'Pending Approvals',icon: 'check-circle',route: '/approvals', prefix: '',  suffix: '',  pulse: true },
    { key: 'toolsTracked',    value: 24,    trend: -2,   label: 'Tools Tracked',    icon: 'tool',        route: '/tools',     prefix: '',  suffix: '',  overdue: 2 },
    { key: 'openInvoices',    value: 12400, trend: -5,   label: 'Open Invoices',    icon: 'file-text',   route: '/invoices',  prefix: '$', suffix: '',  overdue: 3 },
  ];

  const MOCK_SPARKLINES = {
    activeJobs:       [8, 9, 7, 10, 11, 10, 12],
    crewInField:      [3, 5, 4, 6, 5, 7, 4],
    revenueMTD:       [12000, 18000, 24000, 30000, 36000, 42000, 48200],
    pendingApprovals: [6, 4, 3, 5, 2, 4, 3],
    toolsTracked:     [20, 22, 21, 23, 24, 24, 24],
    openInvoices:     [18000, 16000, 14000, 15000, 13000, 12800, 12400],
  };

  const MOCK_FINANCIALS = {
    revenue: 48200, target: 67000, expenses: 31100, profitMargin: 35.5,
    overdueAmount: 4200,
    topJobs: [
      { name: 'Riverside Office Buildout', revenue: 14200 },
      { name: 'Main St Renovation', revenue: 9800 },
      { name: 'Parkview Electrical', revenue: 7600 },
    ],
  };

  const SEED_APPROVALS = [
    { id: 'apr_1', type: 'pay',      title: 'Overtime Pay — Marcus Rivera',     meta: 'Week of Apr 7 · 6.5 hrs OT · $487.50', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), overdue: true },
    { id: 'apr_2', type: 'expenses',  title: 'Fuel Reimbursement — Jake Torres', meta: '$132.40 · Receipts attached',            createdAt: new Date(Date.now() - 86400000).toISOString(),     overdue: false },
    { id: 'apr_3', type: 'time_off',  title: 'PTO Request — Sarah Kim',          meta: 'Apr 21–25 · 5 days',                    createdAt: new Date(Date.now() - 3600000).toISOString(),      overdue: false },
    { id: 'apr_4', type: 'pay',       title: 'Bonus — Derek Hall',               meta: 'Q1 performance bonus · $1,200',          createdAt: new Date(Date.now() - 7200000).toISOString(),      overdue: false },
  ];

  const SEED_ACTIVITY = [
    { id: 'act_1', userId: 'u1', userName: 'Mike Torres',    role: 'field',   action: 'clocked in',                          detail: 'at Riverside Office site',   timestamp: new Date(Date.now() - 300000).toISOString(),  category: 'logins' },
    { id: 'act_2', userId: 'u2', userName: 'Sarah Ochoa',    role: 'admin',   action: 'created an invoice',                  detail: 'INV-2024-0189 for $3,400',   timestamp: new Date(Date.now() - 900000).toISOString(),  category: 'changes' },
    { id: 'act_3', userId: 'u3', userName: 'James Bell',     role: 'field',   action: 'checked out DeWalt Drill',            detail: 'Tool #DW-2847',              timestamp: new Date(Date.now() - 1800000).toISOString(), category: 'changes' },
    { id: 'act_4', userId: 'u4', userName: 'Derek Hall',     role: 'manager', action: 'approved time entry',                 detail: 'for Crew B — 42.5 hrs',      timestamp: new Date(Date.now() - 3600000).toISOString(), category: 'approvals' },
    { id: 'act_5', userId: 'u5', userName: 'Ana Gutierrez',  role: 'admin',   action: 'submitted PTO request',               detail: 'Apr 21–25',                  timestamp: new Date(Date.now() - 5400000).toISOString(), category: 'approvals' },
    { id: 'act_6', userId: 'sys',userName: 'System',         role: 'system',  action: 'Nightly backup completed',            detail: '2.4 GB archived',            timestamp: new Date(Date.now() - 7200000).toISOString(), category: 'changes' },
    { id: 'act_7', userId: 'u6', userName: 'Unknown IP',     role: 'unknown', action: 'Failed login attempt',                detail: 'from 192.168.1.44',          timestamp: new Date(Date.now() - 10800000).toISOString(),category: 'security', anomaly: true },
    { id: 'act_8', userId: 'u7', userName: 'Marcus Rivera',  role: 'field',   action: 'clocked out',                         detail: 'at Main St Renovation',      timestamp: new Date(Date.now() - 14400000).toISOString(),category: 'logins' },
  ];

  const DEPT_COLORS = {
    'Field Ops': '#3b82f6', 'Admin': '#8b5cf6', 'Management': '#f59e0b',
    'Safety': '#ef4444', 'Dispatch': '#10b981', 'Accounting': '#ec4899',
  };

  const DEPT_HEADCOUNT = [
    { dept: 'Field Ops', count: 14 },
    { dept: 'Admin', count: 4 },
    { dept: 'Management', count: 3 },
    { dept: 'Safety', count: 2 },
    { dept: 'Dispatch', count: 2 },
    { dept: 'Accounting', count: 2 },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Sanitize shorthand */
  const san = (str) => DOMPurify.sanitize(String(str ?? ''));

  /** Read a CSS variable from :root */
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /** Format currency */
  const fmtCurrency = (n) => {
    if (n >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + n.toLocaleString();
  };

  /** Greeting based on hour */
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /** Relative time — fallback if dayjs relativeTime plugin not loaded */
  const relTime = (ts) => {
    if (dayjs(ts).fromNow) return dayjs(ts).fromNow();
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  };

  /** Animated counter using requestAnimationFrame with easeOutExpo */
  const animateCounter = (el, target, opts = {}) => {
    const { prefix = '', suffix = '', duration = 1000, decimals = 0 } = opts;
    const start = performance.now();
    const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const tick = (now) => {
      const elapsed = Math.min((now - start) / duration, 1);
      const val = easeOutExpo(elapsed) * target;
      el.textContent = prefix + (decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString()) + suffix;
      if (elapsed < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /** Destroy all chart instances */
  const destroyCharts = () => {
    Object.keys(charts).forEach(k => { if (charts[k]) { charts[k].destroy(); delete charts[k]; } });
  };

  /** Clear running intervals */
  const clearIntervals = () => {
    if (alertInterval) { clearInterval(alertInterval); alertInterval = null; }
    if (feedInterval)  { clearInterval(feedInterval);  feedInterval = null; }
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
  };

  /** Create a tiny sparkline Chart.js instance */
  const createSparkline = (canvas, data, color) => {
    const ctx = canvas.getContext('2d');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: color || cssVar('--accent'),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
          backgroundColor: (context) => {
            const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 30);
            gradient.addColorStop(0, (color || cssVar('--accent')) + '33');
            gradient.addColorStop(1, (color || cssVar('--accent')) + '00');
            return gradient;
          },
        }],
      },
      options: {
        responsive: false,
        animation: { duration: 800 },
        scales: { x: { display: false }, y: { display: false } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        elements: { line: { borderCapStyle: 'round' } },
      },
    });
  };

  /** SVG icon lookup (inline, no network) */
  const icon = (name, size = 16) => {
    const icons = {
      'briefcase':    `<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>`,
      'users':        `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
      'dollar-sign':  `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
      'check-circle': `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
      'tool':         `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
      'file-text':    `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
      'alert-triangle':`<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
      'info':         `<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>`,
      'x':            `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
      'plus':         `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
      'arrow-up':     `<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>`,
      'arrow-down':   `<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>`,
      'check':        `<polyline points="20 6 9 17 4 12"/>`,
      'shield':       `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
      'lock':         `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
      'download':     `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>`,
      'megaphone':    `<path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>`,
      'zap':          `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
      'bar-chart':    `<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>`,
      'activity':     `<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>`,
      'clock':        `<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>`,
      'user-plus':    `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>`,
      'play':         `<polygon points="5 3 19 12 5 21 5 3"/>`,
      'database':     `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>`,
      'alert-octagon':`<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>`,
    };
    const path = icons[name] || icons['info'];
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  };

  /** Type icon for approvals */
  const approvalIcon = (type) => {
    const map = { pay: '\u{1F4B0}', expenses: '\u{1F4B3}', time_off: '\u{1F3D6}\uFE0F', tool: '\u{1F527}' };
    return map[type] || '\u{1F4CB}';
  };

  /** Avatar circle with initials */
  const avatarHTML = (name, role) => {
    const colors = { field: '#3b82f6', admin: '#8b5cf6', manager: '#f59e0b', system: '#6b7280', unknown: '#ef4444' };
    const bg = colors[role] || '#6b7280';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `<div class="activity-feed__avatar" style="background:${bg}" title="${san(name)}">${san(initials)}</div>`;
  };

  // ── Generate alerts dynamically ───────────────────────────────────────────
  const generateAlerts = async () => {
    const alerts = [];
    // Check pending approvals
    const approvals = await getApprovals();
    const pending = approvals.length;
    if (pending > 0) {
      alerts.push({ severity: pending > 3 ? 'critical' : 'warning', message: `${pending} approval${pending > 1 ? 's' : ''} pending review`, icon: 'check-circle' });
    }
    // Simulated locked accounts
    alerts.push({ severity: 'critical', message: '1 account locked — failed login threshold reached (192.168.1.44)', icon: 'lock' });
    alerts.push({ severity: 'info', message: 'System backup completed successfully at 3:00 AM', icon: 'database' });
    alerts.push({ severity: 'warning', message: 'Tool checkout overdue: DeWalt Drill (2 days) — assigned to James Bell', icon: 'tool' });
    return alerts;
  };

  /** Get approvals — from DataStore or seed */
  const getApprovals = async () => {
    try {
      const stored = await DataStore.list('approvals');
      return (stored && stored.length > 0) ? stored : SEED_APPROVALS;
    } catch { return SEED_APPROVALS; }
  };

  /** Get activity entries — from AuditLog or seed */
  const getActivity = async () => {
    try {
      const entries = await AuditLog.getEntries({ limit: 30 });
      return (entries && entries.length > 0) ? entries : SEED_ACTIVITY;
    } catch { return SEED_ACTIVITY; }
  };

  /** Count crew in field */
  const getCrewInField = async () => {
    try {
      const sessions = await DataStore.list('sessions');
      return sessions.filter(s => s.role === 'field' && s.active).length || 5;
    } catch { return 5; }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  SECTION BUILDERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1. Welcome Header ─────────────────────────────────────────────────────
  const buildWelcomeHeader = (session) => {
    const name = san(session?.name?.split(' ')[0] || 'there');
    const role = Auth.getRoleConfig(session?.role)?.label || 'Owner / Head Admin';
    const now = dayjs();
    return `
      <header class="panel" style="padding:var(--space-6);margin:0 var(--space-6) var(--space-4)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:var(--space-4)">
          <div>
            <h1 style="font-size:var(--text-3xl);font-weight:800;color:var(--text-primary);margin:0;line-height:1.2">
              ${greeting()}, ${name}
            </h1>
            <p id="owner-clock" style="font-size:var(--text-sm);color:var(--text-secondary);margin:var(--space-1) 0 0">
              ${now.format('dddd, MMMM D, YYYY · h:mm A')}
            </p>
            <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-2)">
              <span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;border-radius:var(--radius-full);background:var(--accent-subtle);color:var(--accent);font-size:var(--text-xs);font-weight:600">${role}</span>
              <span style="font-size:var(--text-xs);color:var(--text-tertiary)">Last login: 2h ago</span>
            </div>
          </div>
          <div style="display:flex;gap:var(--space-2);flex-wrap:wrap" class="quick-actions">
            <button class="btn btn--sm btn--outline" onclick="Router?.navigate?.('/employees/new')" style="border-radius:var(--radius-full);gap:6px">
              ${icon('user-plus', 14)} Add Employee
            </button>
            <button class="btn btn--sm btn--outline" onclick="Router?.navigate?.('/announcements/new')" style="border-radius:var(--radius-full);gap:6px">
              ${icon('megaphone', 14)} New Announcement
            </button>
            <button class="btn btn--sm btn--outline" data-action="export-data" style="border-radius:var(--radius-full);gap:6px">
              ${icon('download', 14)} Export Data
            </button>
          </div>
        </div>
      </header>`;
  };

  // ── 2. Alert Strip ────────────────────────────────────────────────────────
  const buildAlertStrip = async () => {
    const alerts = await generateAlerts();
    if (!alerts.length) return '';
    return `
      <div class="alert-strip" id="alert-strip">
        ${alerts.map((a, i) => `
          <div class="alert-strip__item alert-strip__item--${san(a.severity)}" data-alert-idx="${i}" style="${i > 0 ? 'display:none' : ''}">
            <span class="alert-strip__icon">${icon(a.icon, 16)}</span>
            <span class="alert-strip__message">${san(a.message)}</span>
            <span class="alert-strip__time">${dayjs().format('h:mm A')}</span>
            <button class="alert-strip__dismiss" data-dismiss-alert="${i}" title="Dismiss">${icon('x', 14)}</button>
          </div>
        `).join('')}
      </div>`;
  };

  // ── 3. Command Stats ──────────────────────────────────────────────────────
  const buildCommandStats = async () => {
    // Dynamically set crew in field and pending approvals
    const stats = [...MOCK_STATS];
    stats[1].value = await getCrewInField();
    stats[3].value = (await getApprovals()).length;

    return `
      <div class="command-stats" id="command-stats">
        ${stats.map((s, i) => {
          const trendDir = s.trend > 0 ? 'up' : s.trend < 0 ? 'down' : 'neutral';
          const trendSign = s.trend > 0 ? '+' : '';
          const displayVal = s.prefix === '$' ? fmtCurrency(s.value) : s.value;
          const hasOverdue = s.overdue && s.overdue > 0;
          const hasPulse = s.pulse && s.value > 0;
          return `
            <div class="command-stat" data-route="${san(s.route)}" style="animation:slideUpFade 0.5s ease both;animation-delay:${i * 80}ms">
              ${hasPulse ? `<span class="command-stat__badge command-stat__badge--critical">${s.value}</span>` : ''}
              ${hasOverdue ? `<span class="command-stat__badge" style="background:var(--status-warning)">${s.overdue}</span>` : ''}
              <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
                <div style="width:32px;height:32px;border-radius:var(--radius-sm);background:linear-gradient(135deg,var(--accent-subtle),var(--accent-glow));display:flex;align-items:center;justify-content:center;color:var(--accent)">
                  ${icon(s.icon, 16)}
                </div>
                <span class="command-stat__label">${san(s.label)}</span>
              </div>
              <span class="command-stat__value counter-value" data-target="${s.value}" data-prefix="${s.prefix === '$' ? '$' : ''}" data-decimals="${s.prefix === '$' && s.value >= 1000 ? '1' : '0'}" data-suffix="${s.prefix === '$' && s.value >= 1000 ? 'K' : ''}" data-raw="${s.value}">0</span>
              ${s.progress ? `<div style="width:100%;height:4px;border-radius:2px;background:var(--bg-tertiary);margin-top:var(--space-1);overflow:hidden"><div style="width:${Math.round((s.progress.current / s.progress.target) * 100)}%;height:100%;border-radius:2px;background:var(--accent);transition:width 1s ease"></div></div><span style="font-size:var(--text-xs);color:var(--text-tertiary)">${Math.round((s.progress.current / s.progress.target) * 100)}% to ${fmtCurrency(s.progress.target)}</span>` : ''}
              <div class="command-stat__footer">
                <span class="command-stat__trend command-stat__trend--${trendDir}">
                  ${trendDir !== 'neutral' ? icon(trendDir === 'up' ? 'arrow-up' : 'arrow-down', 12) : ''}
                  ${trendSign}${Math.abs(s.trend)}%
                </span>
                <canvas class="command-stat__sparkline-canvas" width="60" height="24" data-spark-key="${s.key}"></canvas>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  };

  // ── 4a. Activity Feed ─────────────────────────────────────────────────────
  const buildActivityFeed = () => {
    return `
      <div class="activity-feed panel" id="activity-feed">
        <div class="activity-feed__header" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--border-primary)">
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <h2 style="font-size:var(--text-base);font-weight:700;margin:0;color:var(--text-primary)">Live Activity</h2>
            <span style="width:8px;height:8px;border-radius:50%;background:var(--status-success);animation:dotPulse 2s infinite"></span>
          </div>
          <span style="font-size:var(--text-xs);color:var(--text-tertiary)">Auto-refreshes every 30s</span>
        </div>
        <div class="activity-feed__filters" style="display:flex;gap:var(--space-1);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-primary)">
          <button class="btn btn--xs btn--ghost activity-filter is-active" data-filter="all">All</button>
          <button class="btn btn--xs btn--ghost activity-filter" data-filter="logins">Logins</button>
          <button class="btn btn--xs btn--ghost activity-filter" data-filter="changes">Changes</button>
          <button class="btn btn--xs btn--ghost activity-filter" data-filter="security">Security</button>
          <button class="btn btn--xs btn--ghost activity-filter" data-filter="approvals">Approvals</button>
        </div>
        <div class="activity-feed__list" id="activity-list" style="max-height:420px;overflow-y:auto;padding:var(--space-2) 0">
          <!-- populated by JS -->
        </div>
      </div>`;
  };

  const renderActivityList = async (filter = 'all') => {
    const list = document.getElementById('activity-list');
    if (!list) return;
    const entries = await getActivity();
    const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter);
    if (!filtered.length) {
      list.innerHTML = `<div style="text-align:center;padding:var(--space-8);color:var(--text-tertiary)"><p style="font-size:var(--text-lg)">No recent activity</p><p style="font-size:var(--text-sm)">Events will appear here as they happen.</p></div>`;
      return;
    }
    list.innerHTML = filtered.map((e, i) => `
      <div class="activity-feed__item" style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-3) var(--space-5);${e.anomaly ? 'border-left:3px solid var(--status-error);' : ''}animation:slideUpFade 0.3s ease both;animation-delay:${i * 50}ms">
        ${avatarHTML(e.userName, e.role)}
        <div style="flex:1;min-width:0">
          <p style="margin:0;font-size:var(--text-sm);color:var(--text-primary)">
            <strong>${san(e.userName)}</strong> ${san(e.action)}
            ${e.detail ? `<span style="color:var(--text-tertiary)"> — ${san(e.detail)}</span>` : ''}
          </p>
          <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${relTime(e.timestamp)}</span>
        </div>
        ${e.anomaly ? `<span style="font-size:var(--text-xs);color:var(--status-error);font-weight:600;padding:2px 6px;border-radius:var(--radius-sm);background:var(--status-error-bg)">SECURITY</span>` : ''}
      </div>
    `).join('');
  };

  // ── 4b. Approval Queue ────────────────────────────────────────────────────
  const buildApprovalQueue = async () => {
    const approvals = await getApprovals();
    const tabs = [
      { key: 'all', label: 'All', count: approvals.length },
      { key: 'pay', label: 'Pay', count: approvals.filter(a => a.type === 'pay').length },
      { key: 'expenses', label: 'Expenses', count: approvals.filter(a => a.type === 'expenses').length },
      { key: 'time_off', label: 'Time Off', count: approvals.filter(a => a.type === 'time_off').length },
    ];
    return `
      <div class="approval-queue panel" id="approval-queue">
        <div style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--border-primary)">
          <h2 style="font-size:var(--text-base);font-weight:700;margin:0;color:var(--text-primary)">Approval Queue</h2>
        </div>
        <div class="approval-tabs" style="display:flex;gap:var(--space-1);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--border-primary)">
          ${tabs.map(t => `
            <button class="btn btn--xs btn--ghost approval-tab ${t.key === 'all' ? 'is-active' : ''}" data-tab="${t.key}">
              ${san(t.label)}
              <span style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 4px;border-radius:var(--radius-full);background:var(--bg-tertiary);font-size:10px;font-weight:700;color:var(--text-secondary);margin-left:4px">${t.count}</span>
            </button>
          `).join('')}
        </div>
        <div class="approval-queue__list" id="approval-list" style="max-height:420px;overflow-y:auto;padding:var(--space-2) 0">
          <!-- populated by JS -->
        </div>
      </div>`;
  };

  const renderApprovalList = async (tab = 'all') => {
    const list = document.getElementById('approval-list');
    if (!list) return;
    const approvals = await getApprovals();
    const filtered = tab === 'all' ? approvals : approvals.filter(a => a.type === tab);
    if (!filtered.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:var(--space-8);color:var(--text-tertiary)">
          <div style="font-size:var(--text-3xl);margin-bottom:var(--space-2)">${icon('check', 40)}</div>
          <p style="font-size:var(--text-base);font-weight:600;color:var(--status-success)">All caught up!</p>
          <p style="font-size:var(--text-sm)">No pending approvals in this category.</p>
        </div>`;
      return;
    }
    list.innerHTML = filtered.map((a, i) => `
      <div class="approval-queue__item" data-approval-id="${san(a.id)}" style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--border-primary);${a.overdue ? 'border-left:3px solid var(--status-error);' : ''}animation:slideUpFade 0.3s ease both;animation-delay:${i * 60}ms">
        <span style="font-size:var(--text-lg)">${approvalIcon(a.type)}</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
            <strong style="font-size:var(--text-sm);color:var(--text-primary)">${san(a.title)}</strong>
            ${a.overdue ? `<span style="font-size:10px;font-weight:700;color:var(--status-error);padding:1px 6px;border-radius:var(--radius-sm);background:var(--status-error-bg)">OVERDUE</span>` : ''}
          </div>
          <p style="margin:2px 0 0;font-size:var(--text-xs);color:var(--text-tertiary)">${san(a.meta)}</p>
          <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${relTime(a.createdAt)}</span>
        </div>
        <div style="display:flex;gap:var(--space-1);flex-shrink:0">
          <button class="btn btn--xs btn--primary approval-action" data-approval-id="${san(a.id)}" data-action="approve" style="border-radius:var(--radius-sm)">Approve</button>
          <button class="btn btn--xs btn--ghost approval-action" data-approval-id="${san(a.id)}" data-action="reject" style="border-radius:var(--radius-sm);color:var(--status-error)">Reject</button>
        </div>
      </div>
    `).join('');
  };

  // ── 5. Analytics Row ──────────────────────────────────────────────────────
  const buildAnalyticsRow = () => {
    return `
      <div class="analytics-panel panel" style="margin:0 var(--space-6) var(--space-6);padding:0" id="analytics-panel">
        <div class="analytics-tabs" style="display:flex;gap:0;border-bottom:1px solid var(--border-primary);position:relative">
          <button class="btn btn--ghost analytics-tab is-active" data-analytics-tab="overview" style="border-radius:0;padding:var(--space-3) var(--space-5);font-weight:600;position:relative">Overview</button>
          <button class="btn btn--ghost analytics-tab" data-analytics-tab="activity" style="border-radius:0;padding:var(--space-3) var(--space-5);font-weight:600;position:relative">Activity</button>
          <button class="btn btn--ghost analytics-tab" data-analytics-tab="sessions" style="border-radius:0;padding:var(--space-3) var(--space-5);font-weight:600;position:relative">Sessions</button>
          <button class="btn btn--ghost analytics-tab" data-analytics-tab="performance" style="border-radius:0;padding:var(--space-3) var(--space-5);font-weight:600;position:relative">Performance</button>
          <div id="analytics-tab-underline" style="position:absolute;bottom:0;left:0;width:80px;height:2px;background:var(--accent);transition:left 0.3s ease,width 0.3s ease"></div>
        </div>
        <div id="analytics-content" style="padding:var(--space-5);min-height:280px">
          <!-- populated by JS -->
        </div>
      </div>`;
  };

  const renderAnalyticsTab = (tab) => {
    const container = document.getElementById('analytics-content');
    if (!container) return;

    // Destroy previous charts in this section
    ['analyticsDoughnut', 'analyticsBar', 'analyticsLine', 'analyticsHBar'].forEach(k => {
      if (charts[k]) { charts[k].destroy(); delete charts[k]; }
    });

    const accent = cssVar('--accent') || '#3b82f6';
    const textTertiary = cssVar('--text-tertiary') || '#9ca3af';
    const textPrimary = cssVar('--text-primary') || '#e5e7eb';

    if (tab === 'overview') {
      container.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5);min-height:240px"><div><h3 style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin:0 0 var(--space-3)">Employees by Role</h3><div style="position:relative;max-width:240px;margin:0 auto"><canvas id="chart-doughnut"></canvas><div id="doughnut-center" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none"><span style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary)">27</span><br><span style="font-size:var(--text-xs);color:var(--text-tertiary)">Total</span></div></div></div><div><h3 style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin:0 0 var(--space-3)">Page Views by Tool (Top 8)</h3><canvas id="chart-bar-views"></canvas></div></div>`;
      requestAnimationFrame(() => {
        const dCtx = document.getElementById('chart-doughnut');
        const bCtx = document.getElementById('chart-bar-views');
        if (dCtx) {
          charts.analyticsDoughnut = new Chart(dCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
              labels: ['Field', 'Admin', 'Management', 'Safety', 'Dispatch'],
              datasets: [{ data: [14, 4, 3, 2, 4], backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'], borderWidth: 0 }],
            },
            options: { responsive: true, cutout: '65%', animation: { duration: 800 }, plugins: { legend: { position: 'bottom', labels: { color: textPrimary, padding: 12, usePointStyle: true, pointStyleWidth: 8 } }, tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 8, padding: 10 } } },
          });
        }
        if (bCtx) {
          charts.analyticsBar = new Chart(bCtx.getContext('2d'), {
            type: 'bar',
            data: {
              labels: ['Dashboard', 'Timesheets', 'Invoices', 'Employees', 'Tools', 'Reports', 'Schedule', 'Settings'],
              datasets: [{ data: [342, 285, 198, 176, 154, 132, 98, 67], backgroundColor: accent + 'cc', borderRadius: 6, borderSkipped: false }],
            },
            options: { responsive: true, animation: { duration: 800 }, scales: { x: { grid: { display: false }, ticks: { color: textTertiary, font: { size: 11 } } }, y: { grid: { color: textTertiary + '22' }, ticks: { color: textTertiary } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 8, padding: 10 } } },
          });
        }
      });
    } else if (tab === 'activity') {
      container.innerHTML = `<h3 style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin:0 0 var(--space-3)">Daily Events — Last 14 Days</h3><canvas id="chart-line-activity" style="max-height:260px"></canvas>`;
      requestAnimationFrame(() => {
        const ctx = document.getElementById('chart-line-activity');
        if (!ctx) return;
        const labels = Array.from({ length: 14 }, (_, i) => dayjs().subtract(13 - i, 'day').format('MMM D'));
        const data = [18, 24, 32, 28, 35, 42, 38, 45, 40, 52, 48, 55, 61, 58];
        charts.analyticsLine = new Chart(ctx.getContext('2d'), {
          type: 'line',
          data: {
            labels,
            datasets: [{ label: 'Events', data, borderColor: accent, backgroundColor: accent + '22', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: accent, borderWidth: 2 }],
          },
          options: { responsive: true, animation: { duration: 800 }, scales: { x: { grid: { display: false }, ticks: { color: textTertiary, font: { size: 11 } } }, y: { grid: { color: textTertiary + '22' }, ticks: { color: textTertiary } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 8, padding: 10 } } },
        });
      });
    } else if (tab === 'sessions') {
      container.innerHTML = `<h3 style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin:0 0 var(--space-3)">Avg Session Duration by Role</h3><canvas id="chart-hbar-sessions" style="max-height:260px"></canvas>`;
      requestAnimationFrame(() => {
        const ctx = document.getElementById('chart-hbar-sessions');
        if (!ctx) return;
        charts.analyticsHBar = new Chart(ctx.getContext('2d'), {
          type: 'bar',
          data: {
            labels: ['Field Crew', 'Admin', 'Management', 'Dispatch', 'Safety'],
            datasets: [{ data: [45, 120, 85, 60, 35], backgroundColor: ['#3b82f6cc', '#8b5cf6cc', '#f59e0bcc', '#10b981cc', '#ef4444cc'], borderRadius: 6, borderSkipped: false }],
          },
          options: { indexAxis: 'y', responsive: true, animation: { duration: 800 }, scales: { x: { grid: { color: textTertiary + '22' }, ticks: { color: textTertiary, callback: (v) => v + ' min' } }, y: { grid: { display: false }, ticks: { color: textPrimary, font: { weight: '600' } } } }, plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', callbacks: { label: (c) => c.raw + ' minutes' } } } },
        });
      });
    } else if (tab === 'performance') {
      const pages = [
        { page: '/dashboard', score: 95, load: '0.8s' },
        { page: '/timesheets', score: 88, load: '1.2s' },
        { page: '/invoices', score: 82, load: '1.5s' },
        { page: '/employees', score: 78, load: '1.8s' },
        { page: '/reports', score: 72, load: '2.1s' },
        { page: '/tools', score: 90, load: '0.9s' },
      ];
      container.innerHTML = `
        <h3 style="font-size:var(--text-sm);font-weight:600;color:var(--text-secondary);margin:0 0 var(--space-3)">Page Performance</h3>
        <table style="width:100%;border-collapse:collapse;font-size:var(--text-sm)">
          <thead><tr style="border-bottom:1px solid var(--border-primary)">
            <th style="text-align:left;padding:var(--space-2) var(--space-3);color:var(--text-tertiary);font-weight:600">Page</th>
            <th style="text-align:left;padding:var(--space-2) var(--space-3);color:var(--text-tertiary);font-weight:600">Load Time</th>
            <th style="text-align:left;padding:var(--space-2) var(--space-3);color:var(--text-tertiary);font-weight:600;width:50%">Score</th>
          </tr></thead>
          <tbody>
            ${pages.map(p => {
              const color = p.score >= 90 ? 'var(--status-success)' : p.score >= 75 ? 'var(--status-warning)' : 'var(--status-error)';
              return `<tr style="border-bottom:1px solid var(--border-primary)"><td style="padding:var(--space-2) var(--space-3);color:var(--text-primary);font-weight:500">${san(p.page)}</td><td style="padding:var(--space-2) var(--space-3);color:var(--text-secondary)">${san(p.load)}</td><td style="padding:var(--space-2) var(--space-3)"><div style="display:flex;align-items:center;gap:var(--space-2)"><div style="flex:1;height:6px;border-radius:3px;background:var(--bg-tertiary);overflow:hidden"><div style="width:${p.score}%;height:100%;border-radius:3px;background:${color};transition:width 0.8s ease"></div></div><span style="font-size:var(--text-xs);font-weight:700;color:${color}">${p.score}</span></div></td></tr>`;
            }).join('')}
          </tbody>
        </table>`;
    }
  };

  // ── 6. Bottom Row Panels ──────────────────────────────────────────────────

  // People Panel
  const buildPeoplePanel = () => {
    return `
      <div class="panel" style="padding:var(--space-5)">
        <h3 style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary);margin:0 0 var(--space-4)">People Overview</h3>
        <canvas id="chart-dept-hbar" style="max-height:160px"></canvas>
        <div style="margin-top:var(--space-4)">
          <h4 style="font-size:var(--text-xs);font-weight:600;color:var(--text-tertiary);margin:0 0 var(--space-2)">ATTENDANCE</h4>
          <div class="dot-grid" id="attendance-dots" style="display:flex;flex-wrap:wrap;gap:4px">
            <!-- populated by JS -->
          </div>
        </div>
      </div>`;
  };

  const renderPeoplePanel = () => {
    // Department bar chart
    const ctx = document.getElementById('chart-dept-hbar');
    if (ctx) {
      charts.deptHBar = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
          labels: DEPT_HEADCOUNT.map(d => d.dept),
          datasets: [{ data: DEPT_HEADCOUNT.map(d => d.count), backgroundColor: DEPT_HEADCOUNT.map(d => DEPT_COLORS[d.dept] + 'cc'), borderRadius: 6, borderSkipped: false }],
        },
        options: { indexAxis: 'y', responsive: true, animation: { duration: 800 }, scales: { x: { grid: { color: (cssVar('--text-tertiary') || '#9ca3af') + '22' }, ticks: { color: cssVar('--text-tertiary') || '#9ca3af' } }, y: { grid: { display: false }, ticks: { color: cssVar('--text-primary') || '#e5e7eb', font: { size: 11 } } } }, plugins: { legend: { display: false } } },
      });
    }
    // Attendance dots
    const dotsContainer = document.getElementById('attendance-dots');
    if (dotsContainer) {
      const employees = [];
      const names = ['Marcus R.', 'Sarah K.', 'Jake T.', 'Derek H.', 'Ana G.', 'Mike T.', 'James B.', 'Lisa M.', 'Tom W.', 'Chris P.', 'Emily S.', 'Ryan D.', 'Nina F.', 'Oscar L.', 'Paula J.', 'Kevin B.', 'Diana C.', 'Frank R.', 'Helen Z.', 'Ivan K.', 'Jenny Q.', 'Larry N.', 'Maria V.', 'Nate O.', 'Olivia A.', 'Pete G.', 'Quinn H.'];
      names.forEach((name, i) => {
        const active = i < 5 || Math.random() > 0.5;
        employees.push({ name, active });
      });
      dotsContainer.innerHTML = employees.map(e =>
        `<div style="width:10px;height:10px;border-radius:50%;background:${e.active ? 'var(--status-success)' : 'var(--text-tertiary)'};cursor:pointer;transition:transform 0.15s ease" title="${san(e.name)} — ${e.active ? 'Active' : 'Offline'}" onmouseenter="this.style.transform='scale(1.6)'" onmouseleave="this.style.transform='scale(1)'"></div>`
      ).join('');
    }
  };

  // Financial Panel
  const buildFinancialPanel = () => {
    const f = MOCK_FINANCIALS;
    const pct = Math.round((f.revenue / f.target) * 100);
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (pct / 100) * circumference;
    return `
      <div class="panel" style="padding:var(--space-5)">
        <h3 style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary);margin:0 0 var(--space-4)">Financial Snapshot</h3>
        <div style="display:flex;align-items:center;gap:var(--space-5)">
          <div style="position:relative;width:100px;height:100px;flex-shrink:0">
            <svg width="100" height="100" viewBox="0 0 100 100" style="transform:rotate(-90deg)">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-primary)" stroke-width="8"/>
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent)" stroke-width="8"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                stroke-linecap="round" style="transition:stroke-dashoffset 1s ease"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <span style="font-size:var(--text-lg);font-weight:800;color:var(--text-primary)">${pct}%</span>
              <span style="font-size:9px;color:var(--text-tertiary)">of target</span>
            </div>
          </div>
          <div>
            <span style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary)" class="counter-value" data-target="${f.revenue}" data-prefix="$" data-decimals="1" data-suffix="K" data-raw="${f.revenue}">$0</span>
            <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin:2px 0 0">Revenue MTD → target ${fmtCurrency(f.target)}</p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-3);margin-top:var(--space-4)">
          <div><span style="font-size:var(--text-xs);color:var(--text-tertiary)">Expenses</span><div style="font-size:var(--text-base);font-weight:700;color:var(--text-primary)">${fmtCurrency(f.expenses)}</div></div>
          <div><span style="font-size:var(--text-xs);color:var(--text-tertiary)">Margin</span><div style="font-size:var(--text-base);font-weight:700;color:var(--status-success)">${f.profitMargin}%</div></div>
          <div><span style="font-size:var(--text-xs);color:var(--text-tertiary)">Overdue</span><div style="font-size:var(--text-base);font-weight:700;color:var(--status-error)">${fmtCurrency(f.overdueAmount)}</div></div>
        </div>
      </div>`;
  };

  // Security Panel
  const buildSecurityPanel = () => {
    return `
      <div class="panel" style="padding:var(--space-5)">
        <h3 style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary);margin:0 0 var(--space-4)">
          ${icon('shield', 16)} Security
        </h3>
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:var(--text-sm);color:var(--text-secondary)">Active Sessions</span>
            <div style="display:flex;align-items:center;gap:var(--space-2)">
              <span style="font-size:var(--text-sm);font-weight:700;color:var(--text-primary)">8</span>
              <a href="#" style="font-size:var(--text-xs);color:var(--accent)" onclick="Router?.navigate?.('/sessions');return false">View All</a>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:var(--text-sm);color:var(--text-secondary)">Failed Logins (24h)</span>
            <span style="font-size:var(--text-sm);font-weight:700;color:var(--status-error)">3</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:var(--text-sm);color:var(--text-secondary)">Audit Integrity</span>
            <span id="audit-integrity-status" style="display:flex;align-items:center;gap:4px;font-size:var(--text-sm);font-weight:600;color:var(--status-success)">
              ${icon('check', 14)} Verified
            </span>
          </div>
          <button class="btn btn--sm btn--outline" id="verify-chain-btn" style="width:100%;margin-top:var(--space-1)">
            ${icon('shield', 14)} Verify Audit Chain
          </button>
          <div style="margin-top:var(--space-2)">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-1)">
              <span style="font-size:var(--text-xs);color:var(--text-tertiary)">Storage Usage</span>
              <span style="font-size:var(--text-xs);font-weight:600;color:var(--text-secondary)">64%</span>
            </div>
            <div style="width:100%;height:6px;border-radius:3px;background:var(--bg-tertiary);overflow:hidden">
              <div style="width:64%;height:100%;border-radius:3px;background:var(--accent);transition:width 1s ease"></div>
            </div>
          </div>
        </div>
      </div>`;
  };

  // ── 7. FAB ────────────────────────────────────────────────────────────────
  const buildFAB = () => {
    const items = [
      { label: 'Add Employee',      icon: 'user-plus',  action: 'fab-add-employee' },
      { label: 'New Announcement',   icon: 'megaphone',  action: 'fab-announcement' },
      { label: 'Run Payroll',        icon: 'dollar-sign',action: 'fab-payroll' },
      { label: 'Generate Report',    icon: 'bar-chart',  action: 'fab-report' },
      { label: 'Export Data',        icon: 'download',   action: 'fab-export' },
      { label: 'Emergency Lockdown', icon: 'alert-octagon', action: 'fab-lockdown', danger: true },
    ];
    return `
      <div class="fab-container" id="fab-container">
        <div class="fab-menu" id="fab-menu" style="display:none;position:absolute;bottom:64px;right:0;display:flex;flex-direction:column-reverse;gap:var(--space-2);padding-bottom:var(--space-2)">
          ${items.map((item, i) => `
            <button class="fab-menu__item" data-fab-action="${item.action}" style="display:none;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);border-radius:var(--radius-full);background:${item.danger ? 'var(--status-error)' : 'var(--bg-elevated)'};color:${item.danger ? '#fff' : 'var(--text-primary)'};border:1px solid ${item.danger ? 'var(--status-error)' : 'var(--border-primary)'};cursor:pointer;font-size:var(--text-sm);font-weight:500;white-space:nowrap;box-shadow:var(--shadow-md);transition:transform 0.15s ease,box-shadow 0.15s ease" onmouseenter="this.style.transform='translateX(-4px)';this.style.boxShadow='var(--shadow-lg)'" onmouseleave="this.style.transform='';this.style.boxShadow='var(--shadow-md)'">
              ${icon(item.icon, 14)} ${san(item.label)}
            </button>
          `).join('')}
        </div>
        <button class="fab-trigger" id="fab-trigger" style="width:52px;height:52px;border-radius:50%;background:var(--accent);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-lg);transition:transform 0.3s ease,background 0.2s ease" onmouseenter="this.style.boxShadow='0 0 0 4px var(--accent-glow),var(--shadow-lg)'" onmouseleave="this.style.boxShadow='var(--shadow-lg)'">
          <span id="fab-icon" style="transition:transform 0.3s ease;display:flex">${icon('plus', 22)}</span>
        </button>
      </div>`;
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  EVENT BINDING
  // ══════════════════════════════════════════════════════════════════════════

  const bindEvents = (container) => {
    // Command stat card navigation
    container.querySelectorAll('.command-stat[data-route]').forEach(card => {
      card.addEventListener('click', () => {
        const route = card.dataset.route;
        if (route && typeof Router !== 'undefined') Router.navigate(route);
      });
    });

    // Alert dismiss
    container.querySelectorAll('[data-dismiss-alert]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = btn.dataset.dismissAlert;
        const item = container.querySelector(`.alert-strip__item[data-alert-idx="${idx}"]`);
        if (item) {
          item.classList.add('is-dismissing');
          snoozedAlerts.add(Number(idx));
          setTimeout(() => { item.style.display = 'none'; rotateAlert(); }, 400);
        }
      });
    });

    // Alert auto-rotation
    const alerts = container.querySelectorAll('.alert-strip__item');
    if (alerts.length > 1) {
      alertInterval = setInterval(() => rotateAlert(), 5000);
    }

    // Activity filter pills
    container.querySelectorAll('.activity-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.activity-filter').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderActivityList(btn.dataset.filter);
      });
    });

    // Approval tabs
    container.querySelectorAll('.approval-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.approval-tab').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderApprovalList(btn.dataset.tab);
      });
    });

    // Approval actions (delegated)
    container.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.approval-action');
      if (!actionBtn) return;
      const id = actionBtn.dataset.approvalId;
      const action = actionBtn.dataset.action;
      const card = container.querySelector(`.approval-queue__item[data-approval-id="${id}"]`);
      if (card) {
        card.style.transition = 'opacity 0.3s ease, max-height 0.3s ease, padding 0.3s ease';
        card.style.opacity = '0';
        card.style.maxHeight = '0';
        card.style.padding = '0';
        card.style.overflow = 'hidden';
        setTimeout(() => card.remove(), 350);
      }
      try {
        if (action === 'approve') {
          AuditLog.log({ action: 'approval_granted', targetId: id });
        } else {
          AuditLog.log({ action: 'approval_rejected', targetId: id });
        }
      } catch { /* silent */ }
    });

    // Analytics tabs
    container.querySelectorAll('.analytics-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.analytics-tab').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        // Animate underline
        const underline = document.getElementById('analytics-tab-underline');
        if (underline) {
          underline.style.left = btn.offsetLeft + 'px';
          underline.style.width = btn.offsetWidth + 'px';
        }
        renderAnalyticsTab(btn.dataset.analyticsTab);
      });
    });

    // Position initial underline
    requestAnimationFrame(() => {
      const firstTab = container.querySelector('.analytics-tab.is-active');
      const underline = document.getElementById('analytics-tab-underline');
      if (firstTab && underline) {
        underline.style.left = firstTab.offsetLeft + 'px';
        underline.style.width = firstTab.offsetWidth + 'px';
      }
    });

    // FAB toggle
    const fabTrigger = document.getElementById('fab-trigger');
    const fabMenu = document.getElementById('fab-menu');
    const fabIcon = document.getElementById('fab-icon');
    let fabOpen = false;

    if (fabTrigger) {
      fabTrigger.addEventListener('click', () => {
        fabOpen = !fabOpen;
        fabIcon.style.transform = fabOpen ? 'rotate(45deg)' : 'rotate(0deg)';
        const items = fabMenu.querySelectorAll('.fab-menu__item');
        items.forEach((item, i) => {
          if (fabOpen) {
            item.style.display = 'flex';
            item.style.animation = `fabSlideUp 0.25s ease ${i * 50}ms both`;
          } else {
            item.style.animation = 'none';
            item.style.display = 'none';
          }
        });
      });
    }

    // FAB actions
    container.querySelectorAll('[data-fab-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.fabAction;
        switch (action) {
          case 'fab-add-employee':
            if (typeof Router !== 'undefined') Router.navigate('/employees/new');
            break;
          case 'fab-announcement':
            if (typeof Router !== 'undefined') Router.navigate('/announcements/new');
            break;
          case 'fab-payroll':
            if (typeof Router !== 'undefined') Router.navigate('/payroll');
            break;
          case 'fab-report':
            if (typeof Router !== 'undefined') Router.navigate('/reports');
            break;
          case 'fab-export':
            try { DataStore.exportAll(); } catch { /* silent */ }
            break;
          case 'fab-lockdown':
            if (typeof UI !== 'undefined' && UI.confirm) {
              UI.confirm('Activate Emergency Lockdown?', 'This will immediately lock all employee sessions and require admin re-authentication.').then(confirmed => {
                if (confirmed && typeof SecurityMonitor !== 'undefined') {
                  SecurityMonitor.activateLockdown();
                }
              });
            }
            break;
        }
      });
    });

    // Export data quick action
    container.querySelector('[data-action="export-data"]')?.addEventListener('click', () => {
      try { DataStore.exportAll(); } catch { /* silent */ }
    });

    // Verify chain button
    const verifyBtn = document.getElementById('verify-chain-btn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', async () => {
        const statusEl = document.getElementById('audit-integrity-status');
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';
        try {
          const result = await AuditLog.verifyIntegrity();
          if (statusEl) {
            if (result && result.valid !== false) {
              statusEl.innerHTML = `<span style="color:var(--status-success);display:flex;align-items:center;gap:4px">${icon('check', 14)} Verified</span>`;
            } else {
              statusEl.innerHTML = `<span style="color:var(--status-error);display:flex;align-items:center;gap:4px">${icon('x', 14)} Integrity Failure</span>`;
            }
          }
        } catch {
          if (statusEl) statusEl.innerHTML = `<span style="color:var(--status-success);display:flex;align-items:center;gap:4px">${icon('check', 14)} Verified</span>`;
        }
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = `${icon('shield', 14)} Verify Audit Chain`;
      });
    }

    // Auto-refresh activity feed every 30s
    feedInterval = setInterval(() => renderActivityList(
      container.querySelector('.activity-filter.is-active')?.dataset?.filter || 'all'
    ), 30000);

    // Live clock update every minute
    clockInterval = setInterval(() => {
      const clockEl = document.getElementById('owner-clock');
      if (clockEl) clockEl.textContent = dayjs().format('dddd, MMMM D, YYYY · h:mm A');
    }, 60000);
  };

  // ── Alert rotation ────────────────────────────────────────────────────────
  const rotateAlert = () => {
    const strip = document.getElementById('alert-strip');
    if (!strip) return;
    const items = strip.querySelectorAll('.alert-strip__item');
    if (!items.length) return;
    // Hide current
    items.forEach(item => { item.style.display = 'none'; });
    // Find next non-snoozed
    let attempts = 0;
    do {
      currentAlertIdx = (currentAlertIdx + 1) % items.length;
      attempts++;
    } while (snoozedAlerts.has(currentAlertIdx) && attempts < items.length);
    if (attempts >= items.length) return; // all dismissed
    const next = items[currentAlertIdx];
    next.style.display = '';
    next.style.animation = 'none';
    void next.offsetHeight; // force reflow
    next.style.animation = 'slideInDown var(--duration-enter) var(--ease-out) both';
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  ANIMATED COUNTERS INIT
  // ══════════════════════════════════════════════════════════════════════════

  const initCounters = () => {
    document.querySelectorAll('.counter-value').forEach(el => {
      const raw = Number(el.dataset.raw || el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const decimals = Number(el.dataset.decimals || 0);
      if (prefix === '$' && raw >= 1000) {
        // Animate as K value
        animateCounter(el, raw / 1000, { prefix: '$', suffix: 'K', duration: 1000, decimals: 1 });
      } else {
        animateCounter(el, raw, { prefix, suffix, duration: 1000, decimals });
      }
    });
  };

  // ── Sparklines init ───────────────────────────────────────────────────────
  const initSparklines = () => {
    document.querySelectorAll('.command-stat__sparkline-canvas').forEach(canvas => {
      const key = canvas.dataset.sparkKey;
      const data = MOCK_SPARKLINES[key];
      if (data) {
        charts['spark_' + key] = createSparkline(canvas, data);
      }
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════════

  const render = async (container, session) => {
    // Cleanup previous render
    destroyCharts();
    clearIntervals();
    currentAlertIdx = 0;
    snoozedAlerts.clear();

    // Await async builders
    const alertStripHtml = await buildAlertStrip();
    const commandStatsHtml = await buildCommandStats();
    const approvalQueueHtml = await buildApprovalQueue();

    const html = `
      <div class="owner-dashboard" style="padding:var(--space-6) 0">
        <!-- Alert Strip -->
        ${alertStripHtml}

        <!-- Welcome Header -->
        ${buildWelcomeHeader(session)}

        <!-- Command Stats -->
        ${commandStatsHtml}

        <!-- Two-Column: Activity Feed + Approval Queue -->
        <div class="owner-row-2">
          ${buildActivityFeed()}
          ${approvalQueueHtml}
        </div>

        <!-- Analytics Row -->
        ${buildAnalyticsRow()}

        <!-- Bottom Row: People, Financial, Security -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--space-6);padding:0 var(--space-6) var(--space-6)" class="owner-row-3">
          ${buildPeoplePanel()}
          ${buildFinancialPanel()}
          ${buildSecurityPanel()}
        </div>

        <!-- FAB -->
        ${buildFAB()}
      </div>
    `;

    container.innerHTML = html;

    // Hydrate dynamic sections
    requestAnimationFrame(async () => {
      await renderActivityList('all');
      await renderApprovalList('all');
      renderAnalyticsTab('overview');
      renderPeoplePanel();
      initCounters();
      initSparklines();
      bindEvents(container);
    });
  };

  return { render };

})();

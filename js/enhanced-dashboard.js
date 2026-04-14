/* ==============================================================================
   AMCOEE TOOLS — Enhanced Dashboard & Global Search
   Role-specific dashboards with charts, activity feed, schedule, and Ctrl+K search
   ============================================================================== */

const EnhancedDashboard = (() => {
  'use strict';

  const charts = {};
  let clockInterval = null;
  let typingDone = false;
  let searchFuse = null;
  let searchOverlayEl = null;
  let selectedResultIdx = -1;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function san(t) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(t) : t;
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
    if (typeof dayjs !== 'undefined') return dayjs(iso).fromNow ? dayjs(iso).fromNow() : dayjs(iso).format('h:mm A');
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function animateCounter(el, target, duration = 900) {
    const isCurrency = el.dataset.format === 'currency';
    const start = 0;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(start + (target - start) * eased);
      el.textContent = isCurrency
        ? (val >= 1000 ? '$' + (val / 1000).toFixed(1) + 'K' : '$' + val)
        : val.toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function typeWriter(el, text, speed = 45) {
    el.textContent = '';
    let i = 0;
    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(tick, speed);
      }
    }
    tick();
  }

  // ── Mock Data ────────────────────────────────────────────────────────────

  const MOCK_SCHEDULE = [
    { time: '8:00 AM', name: 'Riverside Office Buildout', status: 'In Progress' },
    { time: '10:30 AM', name: 'Main St Renovation — Electrical', status: 'Scheduled' },
    { time: '1:00 PM', name: 'Parkview HVAC Install', status: 'Scheduled' },
    { time: '3:30 PM', name: 'Downtown Retail Fit-out', status: 'Pending' },
  ];

  const MOCK_ANNOUNCEMENTS = [
    { title: 'Safety Refresher Training', body: 'All field staff must complete the online module by Friday.', time: '2h ago' },
    { title: 'New Tool Checkout Policy', body: 'All power tools require supervisor sign-off starting next week.', time: '1d ago' },
    { title: 'Q2 Kickoff Meeting', body: 'Company-wide meeting scheduled for Monday at 9 AM.', time: '3d ago' },
  ];

  const MOCK_FIELD_JOBS = [
    { name: 'Riverside Office Buildout', address: '142 River Rd, Suite 3', time: '8:00 AM - 12:00 PM', status: 'active' },
    { name: 'Main St Renovation', address: '88 Main St', time: '1:00 PM - 5:00 PM', status: 'upcoming' },
  ];

  const MOCK_TOOLS_OUT = [
    { name: 'DeWalt Impact Driver', id: 'TL-0042', since: 'Today 7:45 AM' },
    { name: 'Fluke Multimeter', id: 'TL-0087', since: 'Today 7:45 AM' },
    { name: 'Milwaukee Sawzall', id: 'TL-0031', since: 'Yesterday' },
  ];

  const MOCK_WEEKLY_DATA = [4, 7, 5, 8, 12, 6, 9];

  // ── Stats by Role ────────────────────────────────────────────────────────

  function getStats(role) {
    if (isAdmin(role)) {
      return [
        { key: 'activeJobs', value: 12, label: 'Active Jobs', icon: 'briefcase', color: 'var(--status-success)', bg: 'var(--status-success-bg)', trend: +8 },
        { key: 'team', value: 8, label: 'Team Members', icon: 'users', color: 'var(--status-info)', bg: 'var(--status-info-bg)', trend: 0 },
        { key: 'tools', value: 24, label: 'Tools Tracked', icon: 'wrench', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', trend: +3 },
        { key: 'revenue', value: 48200, label: 'Revenue MTD', icon: 'dollar', color: 'var(--accent)', bg: 'var(--accent-subtle)', trend: +12, currency: true },
      ];
    }
    if (role === 'office') {
      return [
        { key: 'invoices', value: 7, label: 'Pending Invoices', icon: 'file-text', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', trend: -2 },
        { key: 'scheduled', value: 14, label: 'Scheduled Jobs', icon: 'calendar', color: 'var(--status-success)', bg: 'var(--status-success-bg)', trend: +4 },
        { key: 'estimates', value: 5, label: 'Open Estimates', icon: 'clipboard', color: 'var(--status-info)', bg: 'var(--status-info-bg)', trend: +1 },
        { key: 'inquiries', value: 3, label: 'Customer Inquiries', icon: 'message', color: 'var(--accent)', bg: 'var(--accent-subtle)', trend: 0 },
      ];
    }
    // field
    return [
      { key: 'myJobs', value: 2, label: 'My Jobs Today', icon: 'briefcase', color: 'var(--status-success)', bg: 'var(--status-success-bg)', trend: 0 },
      { key: 'hours', value: 6, label: 'Hours Worked', icon: 'clock', color: 'var(--status-info)', bg: 'var(--status-info-bg)', trend: 0 },
      { key: 'toolsOut', value: 3, label: 'Tools Checked Out', icon: 'wrench', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', trend: 0 },
      { key: 'nextJob', value: 1, label: 'Next Assignment', icon: 'map-pin', color: 'var(--accent)', bg: 'var(--accent-subtle)', trend: 0 },
    ];
  }

  function iconSVG(name) {
    const icons = {
      briefcase: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
      users: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      wrench: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      dollar: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      'file-text': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      calendar: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      clipboard: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>',
      message: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      clock: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      'map-pin': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      page: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      person: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      tool: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      job: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    };
    return icons[name] || '';
  }

  function trendArrow(val) {
    if (val > 0) return '<span style="color:var(--status-success);font-size:0.75rem;font-weight:600">&#9650; ' + val + '%</span>';
    if (val < 0) return '<span style="color:var(--status-error);font-size:0.75rem;font-weight:600">&#9660; ' + Math.abs(val) + '%</span>';
    return '<span style="color:var(--text-tertiary);font-size:0.75rem">&#8212;</span>';
  }

  // ── Render: Main Entry ───────────────────────────────────────────────────

  function render(container, session) {
    cleanup();
    const role = session.role;

    if (role === 'field') {
      renderFieldDashboard(container, session);
    } else {
      renderFullDashboard(container, session);
    }

    initGlobalSearch(session);
    injectSearchHint();
  }

  // ── Full Dashboard (Admin / Office) ──────────────────────────────────────

  function renderFullDashboard(container, session) {
    const role = session.role;
    const firstName = san(session.name.split(' ')[0]);
    const stats = getStats(role);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const quickActions = getQuickActions(role);
    const jobCount = role === 'office' ? 14 : 12;
    const statusText = jobCount > 0 ? jobCount + ' active jobs today' : 'All caught up';
    const statusEmoji = jobCount > 0 ? '&#9889;' : '&#9989;';

    container.innerHTML = san(`
      <div class="page-enter enh-dash">
        <!-- Welcome -->
        <div class="enh-welcome" style="margin-bottom:var(--space-6)">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <div>
              <h2 class="enh-greeting" style="font-size:var(--text-2xl);font-weight:800;letter-spacing:-0.02em"></h2>
              <p style="color:var(--text-tertiary);margin-top:4px">
                <span id="enh-date">${dateStr}</span>
                <span style="margin-left:12px;opacity:0.6" id="enh-clock">${formatTime(now)}</span>
              </p>
            </div>
            <div class="enh-status-pill" style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:var(--radius-full);background:var(--bg-tertiary);font-size:var(--text-sm);color:var(--text-secondary)">
              <span>${statusEmoji}</span> ${statusText}
            </div>
          </div>
          <div class="enh-quick-pills" style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
            ${quickActions.map(a => `
              <button class="btn btn-secondary" style="border-radius:var(--radius-full);padding:6px 18px;font-size:var(--text-sm);font-weight:600;transition:all 200ms" onclick="Router.navigate('${san(a.route)}')">
                ${a.emoji} ${san(a.label)}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-4 stagger-children" style="margin-bottom:var(--space-6)" id="enh-stats">
          ${stats.map((s, i) => `
            <div class="stat-card enh-stat-card" style="animation-delay:${i * 60}ms">
              <div class="stat-card-icon" style="background:${s.bg};color:${s.color};border-radius:var(--radius-lg);width:44px;height:44px;display:flex;align-items:center;justify-content:center">
                ${iconSVG(s.icon)}
              </div>
              <div class="stat-card-value enh-counter" data-target="${s.value}" ${s.currency ? 'data-format="currency"' : ''}>${s.currency ? '$0' : '0'}</div>
              <div class="stat-card-label">${san(s.label)}</div>
              <div style="margin-top:4px">${trendArrow(s.trend)}</div>
            </div>
          `).join('')}
        </div>

        <!-- Activity -->
        <div class="card" style="margin-bottom:var(--space-6)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)">
            <h3 style="font-weight:700;font-size:var(--text-base)">Recent Activity</h3>
            <button class="btn btn-ghost" style="font-size:var(--text-sm)" onclick="Router.navigate('reporting')">View All</button>
          </div>
          <div id="enh-activity" class="enh-timeline"></div>
        </div>

        <!-- Quick Access Grid -->
        <div class="grid grid-2" style="margin-bottom:var(--space-6);gap:var(--space-5)">
          <div class="card">
            <h3 style="font-weight:700;font-size:var(--text-base);margin-bottom:var(--space-4)">
              ${role === 'office' ? "Today's Calls" : 'My Schedule Today'}
            </h3>
            <div class="enh-schedule-list">
              ${MOCK_SCHEDULE.map(s => `
                <div class="enh-schedule-item" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
                  <span style="color:var(--text-tertiary);font-size:var(--text-sm);min-width:72px;font-weight:500">${san(s.time)}</span>
                  <span style="flex:1;font-weight:500">${san(s.name)}</span>
                  <span class="badge ${s.status === 'In Progress' ? 'badge-success' : s.status === 'Pending' ? 'badge-warning' : 'badge-info'}" style="font-size:0.7rem">${san(s.status)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="card">
            <h3 style="font-weight:700;font-size:var(--text-base);margin-bottom:var(--space-4)">
              ${role === 'office' ? 'Pending Approvals' : 'Team Updates'}
            </h3>
            ${MOCK_ANNOUNCEMENTS.map(a => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border-subtle)">
                <div style="font-weight:600;font-size:var(--text-sm)">${san(a.title)}</div>
                <div style="color:var(--text-tertiary);font-size:var(--text-xs);margin-top:2px">${san(a.body)}</div>
                <div style="color:var(--text-tertiary);font-size:0.7rem;margin-top:4px;opacity:0.7">${san(a.time)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Charts (admin+ only) -->
        ${isAdmin(role) ? `
        <div class="grid grid-2" style="gap:var(--space-5);margin-bottom:var(--space-6)">
          <div class="card">
            <h3 style="font-weight:700;font-size:var(--text-base);margin-bottom:var(--space-4)">Weekly Activity</h3>
            <canvas id="enh-chart-weekly" height="220"></canvas>
          </div>
          <div class="card">
            <h3 style="font-weight:700;font-size:var(--text-base);margin-bottom:var(--space-4)">Role Distribution</h3>
            <canvas id="enh-chart-roles" height="220"></canvas>
          </div>
        </div>
        ` : ''}
      </div>
    `);

    // Typing greeting
    const greetEl = container.querySelector('.enh-greeting');
    if (greetEl) {
      const fullText = greetingText() + ', ' + firstName;
      if (!typingDone) {
        typeWriter(greetEl, fullText, 40);
        typingDone = true;
      } else {
        greetEl.textContent = fullText;
      }
    }

    // Animate counters
    container.querySelectorAll('.enh-counter').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      setTimeout(() => animateCounter(el, target, 900), 200);
    });

    // Live clock
    clockInterval = setInterval(() => {
      const clockEl = document.getElementById('enh-clock');
      if (clockEl) clockEl.textContent = formatTime(new Date());
    }, 60000);

    // Activity feed
    loadActivityFeed(session);

    // Charts
    if (isAdmin(session.role)) {
      setTimeout(() => {
        renderWeeklyChart();
        renderRolesChart();
      }, 300);
    }
  }

  // ── Field Dashboard ──────────────────────────────────────────────────────

  function renderFieldDashboard(container, session) {
    const firstName = san(session.name.split(' ')[0]);
    const stats = getStats('field');
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    container.innerHTML = san(`
      <div class="page-enter enh-dash enh-field">
        <!-- Welcome -->
        <div style="margin-bottom:var(--space-5)">
          <h2 class="enh-greeting" style="font-size:var(--text-xl);font-weight:800;letter-spacing:-0.02em"></h2>
          <p style="color:var(--text-tertiary);margin-top:4px;font-size:var(--text-sm)">
            ${dateStr} <span style="margin-left:8px;opacity:0.6" id="enh-clock">${formatTime(now)}</span>
          </p>
        </div>

        <!-- Clock In/Out -->
        <button class="btn btn-primary enh-clock-btn" id="enh-clock-in-btn"
          style="width:100%;padding:18px;font-size:var(--text-lg);font-weight:800;border-radius:var(--radius-lg);margin-bottom:var(--space-5);letter-spacing:0.02em;transition:all 200ms">
          &#9201; Clock In
        </button>

        <!-- Stats -->
        <div class="grid grid-4 stagger-children" style="margin-bottom:var(--space-5)" id="enh-stats">
          ${stats.map((s, i) => `
            <div class="stat-card enh-stat-card" style="animation-delay:${i * 60}ms">
              <div class="stat-card-icon" style="background:${s.bg};color:${s.color};border-radius:var(--radius-lg);width:40px;height:40px;display:flex;align-items:center;justify-content:center">
                ${iconSVG(s.icon)}
              </div>
              <div class="stat-card-value enh-counter" data-target="${s.value}">${s.currency ? '$0' : '0'}</div>
              <div class="stat-card-label" style="font-size:var(--text-xs)">${san(s.label)}</div>
            </div>
          `).join('')}
        </div>

        <!-- Today's Jobs -->
        <div class="card" style="margin-bottom:var(--space-5)">
          <h3 style="font-weight:700;font-size:var(--text-base);margin-bottom:var(--space-4)">Today's Jobs</h3>
          ${MOCK_FIELD_JOBS.map(j => `
            <div class="enh-job-card" style="padding:14px;background:var(--bg-tertiary);border-radius:var(--radius-md);margin-bottom:8px;border:1px solid var(--border-subtle);transition:all 200ms;cursor:pointer">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-weight:700;font-size:var(--text-sm)">${san(j.name)}</span>
                <span class="badge ${j.status === 'active' ? 'badge-success' : 'badge-info'}" style="font-size:0.65rem">${j.status === 'active' ? 'Active' : 'Upcoming'}</span>
              </div>
              <div style="color:var(--text-tertiary);font-size:var(--text-xs)">${san(j.address)}</div>
              <div style="color:var(--text-tertiary);font-size:var(--text-xs);margin-top:2px">${san(j.time)}</div>
            </div>
          `).join('')}
        </div>

        <!-- Tools Checked Out -->
        <div class="card" style="margin-bottom:var(--space-5)">
          <h3 style="font-weight:700;font-size:var(--text-base);margin-bottom:var(--space-4)">Tools Checked Out</h3>
          ${MOCK_TOOLS_OUT.map(t => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
              <div>
                <div style="font-weight:500;font-size:var(--text-sm)">${san(t.name)}</div>
                <div style="color:var(--text-tertiary);font-size:var(--text-xs)">${san(t.id)}</div>
              </div>
              <span style="color:var(--text-tertiary);font-size:var(--text-xs)">${san(t.since)}</span>
            </div>
          `).join('')}
        </div>

        <!-- Quick Links -->
        <div class="grid grid-2" style="gap:8px">
          ${[
            { label: 'Safety Docs', emoji: '&#128737;', route: 'safety' },
            { label: 'Submit Expense', emoji: '&#128179;', route: 'expenses' },
            { label: 'Request Tool', emoji: '&#128295;', route: 'tool-tracker' },
            { label: 'Documents', emoji: '&#128196;', route: 'documents' },
          ].map(l => `
            <button class="btn btn-secondary" style="width:100%;padding:14px;font-weight:600;border-radius:var(--radius-md);transition:all 200ms" onclick="Router.navigate('${l.route}')">
              ${l.emoji} ${l.label}
            </button>
          `).join('')}
        </div>
      </div>
    `);

    // Typing greeting
    const greetEl = container.querySelector('.enh-greeting');
    if (greetEl) {
      const fullText = greetingText() + ', ' + firstName;
      if (!typingDone) {
        typeWriter(greetEl, fullText, 40);
        typingDone = true;
      } else {
        greetEl.textContent = fullText;
      }
    }

    // Animate counters
    container.querySelectorAll('.enh-counter').forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      setTimeout(() => animateCounter(el, target, 900), 200);
    });

    // Clock button toggle
    const clockBtn = document.getElementById('enh-clock-in-btn');
    let clockedIn = false;
    if (clockBtn) {
      clockBtn.addEventListener('click', () => {
        clockedIn = !clockedIn;
        clockBtn.innerHTML = clockedIn ? '&#9209; Clock Out' : '&#9201; Clock In';
        clockBtn.style.background = clockedIn ? 'var(--status-error)' : '';
        if (typeof AuditLog !== 'undefined') {
          AuditLog.log(clockedIn ? 'clock_in' : 'clock_out');
        }
        UI.toast(clockedIn ? 'Clocked in successfully' : 'Clocked out', 'success');
      });
    }

    // Live clock
    clockInterval = setInterval(() => {
      const clockEl = document.getElementById('enh-clock');
      if (clockEl) clockEl.textContent = formatTime(new Date());
    }, 60000);
  }

  // ── Quick Actions by Role ────────────────────────────────────────────────

  function getQuickActions(role) {
    if (isAdmin(role)) {
      return [
        { label: 'New Job', emoji: '&#128194;', route: 'jobs' },
        { label: 'Schedule', emoji: '&#128197;', route: 'scheduling' },
        { label: 'Approvals', emoji: '&#9989;', route: 'owner-dashboard' },
        { label: 'Reports', emoji: '&#128202;', route: 'reporting' },
      ];
    }
    if (role === 'office') {
      return [
        { label: 'New Invoice', emoji: '&#128176;', route: 'invoicing' },
        { label: 'Customers', emoji: '&#128101;', route: 'crm' },
        { label: 'Schedule', emoji: '&#128197;', route: 'scheduling' },
      ];
    }
    return [
      { label: 'Clock In', emoji: '&#9201;', route: 'timeclock' },
      { label: 'My Tools', emoji: '&#128295;', route: 'tool-tracker' },
      { label: 'Safety', emoji: '&#128737;', route: 'safety' },
    ];
  }

  // ── Activity Feed ────────────────────────────────────────────────────────

  async function loadActivityFeed(session) {
    const feedEl = document.getElementById('enh-activity');
    if (!feedEl) return;

    let entries = [];
    try {
      if (typeof AuditLog !== 'undefined' && typeof DataStore !== 'undefined') {
        entries = await DataStore.query('audit_log', { orderBy: 'timestamp:desc', limit: 10 });
      }
    } catch (e) {
      // fallback
    }

    if (!entries || entries.length === 0) {
      entries = [
        { userName: session.name, action: 'Logged in', timestamp: new Date().toISOString(), role: session.role },
        { userName: 'System', action: 'Dashboard loaded', timestamp: new Date(Date.now() - 60000).toISOString(), role: 'system' },
        { userName: session.name, action: 'Viewed dashboard', timestamp: new Date(Date.now() - 120000).toISOString(), role: session.role },
      ];
    }

    feedEl.innerHTML = entries.slice(0, 10).map(e => `
      <div class="enh-timeline-item" style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);margin-top:6px;flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:var(--text-sm);font-weight:500">${san(e.userName || 'Unknown')}</div>
          <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px">${san(e.action || '')}</div>
        </div>
        <span style="font-size:var(--text-xs);color:var(--text-tertiary);white-space:nowrap;flex-shrink:0">${relativeTime(e.timestamp)}</span>
      </div>
    `).join('');
  }

  // ── Charts ───────────────────────────────────────────────────────────────

  function renderWeeklyChart() {
    const canvas = document.getElementById('enh-chart-weekly');
    if (!canvas || typeof Chart === 'undefined') return;

    if (charts.weekly) charts.weekly.destroy();

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#f97316';
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }

    charts.weekly = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Events',
          data: MOCK_WEEKLY_DATA,
          backgroundColor: accent + '99',
          borderColor: accent,
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: 'rgba(128,128,128,0.6)' } },
          x: { grid: { display: false }, ticks: { color: 'rgba(128,128,128,0.6)' } },
        },
      },
    });
  }

  function renderRolesChart() {
    const canvas = document.getElementById('enh-chart-roles');
    if (!canvas || typeof Chart === 'undefined') return;

    if (charts.roles) charts.roles.destroy();

    const users = typeof Auth !== 'undefined' ? Auth.getUsers() : [];
    const roleCounts = { owner: 0, head_admin: 0, admin: 0, office: 0, field: 0 };
    users.forEach(u => { if (roleCounts.hasOwnProperty(u.role)) roleCounts[u.role]++; });

    const roleColors = ['#ef4444', '#f97316', '#a855f7', '#3b82f6', '#22c55e'];
    const roleLabels = ['Owner', 'Head Admin', 'Admin', 'Office', 'Field'];

    charts.roles = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: roleLabels,
        datasets: [{
          data: Object.values(roleCounts),
          backgroundColor: roleColors.map(c => c + 'cc'),
          borderColor: roleColors,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: 'rgba(128,128,128,0.8)', padding: 16, usePointStyle: true, pointStyleWidth: 10 },
          },
        },
      },
    });
  }

  // ── Global Search (Ctrl+K / Cmd+K) ──────────────────────────────────────

  function buildSearchIndex(session) {
    const items = [];

    // Pages from nav
    const pages = [
      { name: 'Dashboard', desc: 'Main dashboard overview', route: 'dashboard' },
      { name: 'Command Center', desc: 'Owner command center', route: 'owner-dashboard' },
      { name: 'Job Board', desc: 'Manage active jobs and dispatch crews', route: 'jobs' },
      { name: 'Scheduling', desc: 'Calendar view of jobs and assignments', route: 'scheduling' },
      { name: 'Time Clock', desc: 'Clock in/out and view timesheets', route: 'timeclock' },
      { name: 'Tool Tracker', desc: 'Check in/out tools and equipment', route: 'tool-tracker' },
      { name: 'Inventory', desc: 'Materials and supplies management', route: 'inventory' },
      { name: 'Fleet', desc: 'Vehicles and mileage tracking', route: 'fleet' },
      { name: 'Customers', desc: 'Client database and CRM', route: 'crm' },
      { name: 'Invoicing', desc: 'Estimates and billing', route: 'invoicing' },
      { name: 'Expenses', desc: 'Submit and track receipts', route: 'expenses' },
      { name: 'Announcements', desc: 'Company news and updates', route: 'announcements' },
      { name: 'Documents', desc: 'Files, permits, and document hub', route: 'documents' },
      { name: 'Safety', desc: 'Safety protocols and compliance', route: 'safety' },
      { name: 'Reports', desc: 'Analytics and metrics', route: 'reporting' },
      { name: 'Employees', desc: 'Team and employee management', route: 'employees' },
      { name: 'Payroll', desc: 'Pay periods and payroll management', route: 'payroll' },
      { name: 'Settings', desc: 'App preferences and account', route: 'settings' },
    ];
    pages.forEach(p => items.push({ ...p, category: 'Pages', icon: 'page' }));

    // Users
    const users = typeof Auth !== 'undefined' ? Auth.getUsers() : [];
    users.forEach(u => {
      const roleLabel = typeof Auth !== 'undefined' && Auth.getRoleConfig ? Auth.getRoleConfig(u.role).label : u.role;
      items.push({ name: u.name, desc: u.email + ' - ' + roleLabel, route: 'employees', category: 'People', icon: 'person' });
    });

    // Placeholder tools
    const tools = [
      { name: 'DeWalt Impact Driver', desc: 'Tool #TL-0042 - Checked out' },
      { name: 'Fluke Multimeter', desc: 'Tool #TL-0087 - Available' },
      { name: 'Milwaukee Sawzall', desc: 'Tool #TL-0031 - Checked out' },
      { name: 'Hilti Rotary Hammer', desc: 'Tool #TL-0055 - Available' },
      { name: 'Klein Wire Stripper Set', desc: 'Tool #TL-0012 - Available' },
    ];
    tools.forEach(t => items.push({ ...t, route: 'tool-tracker', category: 'Tools', icon: 'tool' }));

    // Placeholder jobs
    const jobs = [
      { name: 'Riverside Office Buildout', desc: 'Active - 142 River Rd' },
      { name: 'Main St Renovation', desc: 'Active - 88 Main St' },
      { name: 'Parkview HVAC Install', desc: 'Scheduled - 23 Park Ave' },
      { name: 'Downtown Retail Fit-out', desc: 'Pending - 501 Commerce Dr' },
    ];
    jobs.forEach(j => items.push({ ...j, route: 'jobs', category: 'Jobs', icon: 'job' }));

    return items;
  }

  function initGlobalSearch(session) {
    const index = buildSearchIndex(session);
    if (typeof Fuse !== 'undefined') {
      searchFuse = new Fuse(index, {
        keys: ['name', 'desc', 'category'],
        threshold: 0.35,
        includeScore: true,
      });
    }

    // Keyboard shortcut
    document.removeEventListener('keydown', handleSearchShortcut);
    document.addEventListener('keydown', handleSearchShortcut);
  }

  function handleSearchShortcut(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearchOverlay();
    }
  }

  function openSearchOverlay() {
    if (searchOverlayEl) return;
    selectedResultIdx = -1;

    const overlay = document.createElement('div');
    overlay.className = 'enh-search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;justify-content:center;padding-top:min(20vh,160px);opacity:0;transition:opacity 200ms';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSearchOverlay(); });

    const modal = document.createElement('div');
    modal.className = 'enh-search-modal';
    modal.style.cssText = 'width:100%;max-width:580px;max-height:70vh;background:var(--bg-secondary);border:1px solid var(--border-primary);border-radius:var(--radius-xl);box-shadow:var(--shadow-xl);display:flex;flex-direction:column;overflow:hidden;transform:translateY(-8px);transition:transform 200ms';

    modal.innerHTML = `
      <div style="padding:16px 20px;border-bottom:1px solid var(--border-primary);display:flex;align-items:center;gap:10px">
        ${iconSVG('search')}
        <input id="enh-search-input" type="text" placeholder="Search pages, people, tools, jobs..."
          style="flex:1;background:none;border:none;outline:none;font-size:var(--text-base);color:var(--text-primary);font-family:inherit" autocomplete="off"/>
        <kbd style="font-size:0.7rem;padding:2px 8px;border:1px solid var(--border-primary);border-radius:4px;color:var(--text-tertiary);background:var(--bg-tertiary)">ESC</kbd>
      </div>
      <div id="enh-search-results" style="overflow-y:auto;padding:8px;flex:1"></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    searchOverlayEl = overlay;

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'translateY(0)';
    });

    const input = document.getElementById('enh-search-input');
    input.focus();

    input.addEventListener('input', () => {
      const q = input.value.trim();
      renderSearchResults(q);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeSearchOverlay(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveSelection(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveSelection(-1); return; }
      if (e.key === 'Enter') { e.preventDefault(); activateSelection(); return; }
    });

    // Show initial categories
    renderSearchResults('');
  }

  function closeSearchOverlay() {
    if (!searchOverlayEl) return;
    searchOverlayEl.style.opacity = '0';
    setTimeout(() => {
      if (searchOverlayEl) { searchOverlayEl.remove(); searchOverlayEl = null; }
      document.body.style.overflow = '';
    }, 200);
  }

  function renderSearchResults(query) {
    const container = document.getElementById('enh-search-results');
    if (!container) return;

    selectedResultIdx = -1;

    if (!query) {
      container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-tertiary);font-size:var(--text-sm)">Type to search across pages, people, tools, and jobs</div>';
      return;
    }

    let results = [];
    if (searchFuse) {
      results = searchFuse.search(query).slice(0, 12).map(r => r.item);
    }

    if (results.length === 0) {
      container.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-tertiary);font-size:var(--text-sm)">No results found</div>';
      return;
    }

    // Group by category
    const groups = {};
    results.forEach(r => {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    });

    const categoryColors = { Pages: 'var(--accent)', People: 'var(--status-info)', Tools: 'var(--status-warning)', Jobs: 'var(--status-success)' };

    let idx = 0;
    let html = '';
    Object.entries(groups).forEach(([cat, items]) => {
      html += `<div style="padding:4px 12px;font-size:0.7rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;margin-top:4px">${san(cat)}</div>`;
      items.forEach(item => {
        html += `
          <div class="enh-search-result" data-idx="${idx}" data-route="${san(item.route)}"
            style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--radius-md);cursor:pointer;transition:background 120ms">
            <div style="color:var(--text-tertiary);flex-shrink:0">${iconSVG(item.icon)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:var(--text-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${san(item.name)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${san(item.desc)}</div>
            </div>
            <span style="font-size:0.65rem;padding:2px 8px;border-radius:var(--radius-full);background:${categoryColors[cat] || 'var(--accent)'};color:#fff;font-weight:600;opacity:0.85;flex-shrink:0">${san(cat)}</span>
          </div>
        `;
        idx++;
      });
    });

    container.innerHTML = html;

    // Click handlers
    container.querySelectorAll('.enh-search-result').forEach(el => {
      el.addEventListener('click', () => {
        const route = el.dataset.route;
        closeSearchOverlay();
        if (route) Router.navigate(route);
      });
      el.addEventListener('mouseenter', () => {
        selectedResultIdx = parseInt(el.dataset.idx, 10);
        highlightSelection();
      });
    });
  }

  function moveSelection(dir) {
    const items = document.querySelectorAll('.enh-search-result');
    if (!items.length) return;
    selectedResultIdx = Math.max(-1, Math.min(items.length - 1, selectedResultIdx + dir));
    if (selectedResultIdx < 0) selectedResultIdx = items.length - 1;
    if (selectedResultIdx >= items.length) selectedResultIdx = 0;
    highlightSelection();
  }

  function highlightSelection() {
    const items = document.querySelectorAll('.enh-search-result');
    items.forEach((el, i) => {
      el.style.background = i === selectedResultIdx ? 'var(--bg-tertiary)' : '';
    });
    if (selectedResultIdx >= 0 && items[selectedResultIdx]) {
      items[selectedResultIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function activateSelection() {
    const items = document.querySelectorAll('.enh-search-result');
    if (selectedResultIdx >= 0 && items[selectedResultIdx]) {
      items[selectedResultIdx].click();
    }
  }

  // ── Search Hint in Header ────────────────────────────────────────────────

  function injectSearchHint() {
    if (document.getElementById('enh-search-hint')) return;

    const header = document.querySelector('.topbar') || document.querySelector('header');
    if (!header) return;

    const hint = document.createElement('button');
    hint.id = 'enh-search-hint';
    hint.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:6px 14px;background:var(--bg-tertiary);border:1px solid var(--border-primary);border-radius:var(--radius-md);color:var(--text-tertiary);font-size:var(--text-sm);cursor:pointer;margin-left:auto;margin-right:12px;transition:all 200ms;font-family:inherit';
    hint.innerHTML = iconSVG('search') + ' <span>Search</span><kbd style="font-size:0.65rem;padding:1px 6px;border:1px solid var(--border-primary);border-radius:3px;margin-left:4px;opacity:0.7">Ctrl+K</kbd>';
    hint.addEventListener('click', openSearchOverlay);

    // Insert before the last child (usually user avatar/menu)
    const rightSection = header.querySelector('.topbar-right') || header.lastElementChild;
    if (rightSection && rightSection.parentNode === header) {
      header.insertBefore(hint, rightSection);
    } else {
      header.appendChild(hint);
    }
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  function cleanup() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) { /* noop */ } });
    Object.keys(charts).forEach(k => delete charts[k]);
  }

  // ── Inline Styles ────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('enh-dash-styles')) return;
    const style = document.createElement('style');
    style.id = 'enh-dash-styles';
    style.textContent = `
      .enh-stat-card {
        transition: transform 200ms, box-shadow 200ms;
      }
      .enh-stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }
      .enh-clock-btn:hover {
        transform: scale(1.01);
        box-shadow: 0 4px 24px rgba(var(--accent-rgb, 249,115,22), 0.3);
      }
      .enh-job-card:hover {
        border-color: var(--accent) !important;
        transform: translateY(-1px);
      }
      .enh-search-result:hover {
        background: var(--bg-tertiary) !important;
      }
      #enh-search-hint:hover {
        border-color: var(--accent);
        color: var(--text-primary);
      }
      [data-theme="dark"] .enh-stat-card {
        background: linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary));
      }
      .enh-quick-pills .btn:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-sm);
      }
      @media (max-width: 768px) {
        .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
        .grid-2 { grid-template-columns: 1fr !important; }
        .enh-search-modal { max-width: 95vw !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // Inject styles on load
  injectStyles();

  // ── Public API ───────────────────────────────────────────────────────────

  return { render };

})();

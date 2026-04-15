/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Job Board
   Full tool module: seed data, search/filter, status tracking, crew dispatch.
   ══════════════════════════════════════════════════════════════════════════════ */

const JobBoard = (() => {

  /* ─── Seed Data ──────────────────────────────────────────────────────────── */

  const SEED_DATA = [
    {
      id: 'job_001',
      title: '200A Panel Upgrade',
      client: 'Martinez Residence',
      address: '4821 Elm Creek Dr, Houston, TX 77084',
      status: 'in_progress',
      priority: 'high',
      crew: ['D. Reyes', 'M. Okafor'],
      estimatedHours: 8,
      notes: 'Replace 100A Zinsco panel with 200A Square D. Verify grounding rod and bond.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
    },
    {
      id: 'job_002',
      title: 'HVAC Electrical Wiring — New Build',
      client: 'Greenfield Developers LLC',
      address: '902 Pinebrook Cir, Katy, TX 77494',
      status: 'scheduled',
      priority: 'medium',
      crew: ['T. Nguyen', 'B. Castillo', 'L. Webb'],
      estimatedHours: 14,
      notes: 'Wire 3-ton Lennox split system + dedicated 240V 30A circuit. Rough-in day 1, final day 2.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: 'job_003',
      title: 'Emergency No-Power — Total Loss',
      client: 'Rivera Auto Body',
      address: '1107 Industrial Pkwy, Pasadena, TX 77501',
      status: 'urgent',
      priority: 'critical',
      crew: ['D. Reyes'],
      estimatedHours: 4,
      notes: 'Tripped main breaker, suspected service entrance fault. Utility notified. Business down.',
      createdAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
    },
  ];

  /* ─── Config ─────────────────────────────────────────────────────────────── */

  const COLLECTION = 'jobs';

  const STATUS_CONFIG = {
    urgent:      { label: 'Urgent',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: '#ef4444' },
    in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: '#f59e0b' },
    scheduled:   { label: 'Scheduled',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   border: '#3b82f6' },
    completed:   { label: 'Completed',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    border: '#22c55e' },
    invoiced:    { label: 'Invoiced',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)',  border: '#6b7280' },
  };

  const PRIORITY_CONFIG = {
    critical: { label: 'Critical', color: '#ef4444' },
    high:     { label: 'High',     color: '#f59e0b' },
    medium:   { label: 'Medium',   color: '#3b82f6' },
    low:      { label: 'Low',      color: '#22c55e' },
  };

  /* ─── Seed ───────────────────────────────────────────────────────────────── */

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const job of SEED_DATA) {
        await DataStore.create(COLLECTION, job);
      }
    } catch (e) {
      console.warn('[JobBoard] ensureSeedData failed:', e);
    }
  }

  /* ─── Helpers ────────────────────────────────────────────────────────────── */

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function timeAgo(isoString) {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60)  return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function statusCfg(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  }

  function priorityCfg(priority) {
    return PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  }

  /* ─── Count helpers ──────────────────────────────────────────────────────── */

  function countByStatus(jobs, status) {
    return jobs.filter(j => j.status === status).length;
  }

  /* ─── Render helpers ─────────────────────────────────────────────────────── */

  function renderStatCards(jobs) {
    const urgent     = countByStatus(jobs, 'urgent');
    const inProgress = countByStatus(jobs, 'in_progress');
    const scheduled  = countByStatus(jobs, 'scheduled');

    const stats = [
      { label: 'Urgent',      value: urgent,     borderColor: STATUS_CONFIG.urgent.border,      textColor: STATUS_CONFIG.urgent.color },
      { label: 'In Progress', value: inProgress,  borderColor: STATUS_CONFIG.in_progress.border, textColor: STATUS_CONFIG.in_progress.color },
      { label: 'Scheduled',   value: scheduled,   borderColor: STATUS_CONFIG.scheduled.border,   textColor: STATUS_CONFIG.scheduled.color },
    ];

    return stats.map(s => `
      <div class="stat-card" style="
        background: var(--surface-2, #1a1a2e);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-left: 3px solid ${s.borderColor};
        border-radius: 12px;
        padding: 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        min-width: 140px;
        flex: 1;
      ">
        <span style="
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          font-size: 2rem;
          font-weight: 700;
          color: ${s.textColor};
          line-height: 1;
        ">${s.value}</span>
        <span style="
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted, #6b7280);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        ">${safe(s.label)}</span>
      </div>
    `).join('');
  }

  function renderStatusBadge(status) {
    const cfg = statusCfg(status);
    return `<span style="
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      background: ${cfg.bg};
      color: ${cfg.color};
      border: 1px solid ${cfg.color}33;
    ">${safe(cfg.label)}</span>`;
  }

  function renderPriorityDot(priority) {
    const cfg = priorityCfg(priority);
    return `<span title="${safe(cfg.label)} priority" style="
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: ${cfg.color};
      flex-shrink: 0;
      margin-top: 2px;
      box-shadow: 0 0 6px ${cfg.color}88;
    "></span>`;
  }

  function renderJobCard(job) {
    const sc = statusCfg(job.status);
    const crew = Array.isArray(job.crew) ? job.crew : [];
    return `
      <div class="card job-card" data-job-id="${safe(job.id)}" style="
        background: var(--surface-2, #1a1a2e);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        cursor: default;
        transition: transform 150ms ease-out, box-shadow 150ms ease-out;
        will-change: transform;
      ">
        <!-- Top row: priority dot + title + status badge -->
        <div style="display: flex; align-items: flex-start; gap: 0.6rem;">
          ${renderPriorityDot(job.priority)}
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-family: var(--font-display, Outfit, sans-serif);
              font-size: 1rem;
              font-weight: 700;
              color: var(--text-primary, #f0f0f5);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${safe(job.title)}</div>
          </div>
          ${renderStatusBadge(job.status)}
        </div>

        <!-- Client + address -->
        <div style="display: flex; flex-direction: column; gap: 0.2rem;">
          <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-secondary, #a0a0b8);">${safe(job.client)}</span>
          <span style="font-size: 0.78rem; color: var(--text-muted, #6b7280);">${safe(job.address)}</span>
        </div>

        <!-- Crew + estimated hours + time ago -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-top: 0.6rem;
          border-top: 1px solid var(--border, rgba(255,255,255,0.07));
          flex-wrap: wrap;
        ">
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span style="font-size: 0.72rem; color: var(--text-muted, #6b7280); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Crew:</span>
            ${crew.map(c => `<span style="
              font-size: 0.75rem;
              font-weight: 600;
              color: var(--text-secondary, #a0a0b8);
              background: var(--surface-3, rgba(255,255,255,0.05));
              border: 1px solid var(--border, rgba(255,255,255,0.07));
              border-radius: 6px;
              padding: 0.15rem 0.5rem;
            ">${safe(c)}</span>`).join('')}
          </div>
          <div style="display: flex; align-items: center; gap: 1rem; flex-shrink: 0;">
            <span style="
              font-family: var(--font-mono, 'JetBrains Mono', monospace);
              font-size: 0.78rem;
              color: var(--text-muted, #6b7280);
            ">${safe(String(job.estimatedHours))}h est.</span>
            <span style="font-size: 0.72rem; color: var(--text-muted, #6b7280);">${safe(timeAgo(job.createdAt))}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        gap: 1rem;
      ">
        <div style="font-size: 2.5rem; opacity: 0.4;">🔍</div>
        <p style="color: var(--text-muted, #6b7280); font-size: 0.95rem; max-width: 320px; line-height: 1.6;">
          ${query ? `No jobs match <strong style="color: var(--text-secondary, #a0a0b8);">"${safe(query)}"</strong>` : 'No jobs found. Create one to get started.'}
        </p>
      </div>
    `;
  }

  /* ─── Main render ────────────────────────────────────────────────────────── */

  async function render(container, session) {
    if (!container) return;

    // Load seed data first
    await ensureSeedData();

    // Load all jobs from DataStore
    let jobs = [];
    try {
      jobs = await DataStore.list(COLLECTION);
    } catch (e) {
      console.warn('[JobBoard] Failed to load jobs from DataStore:', e);
    }

    // Sort: urgent first, then in_progress, then by createdAt desc
    const statusOrder = { urgent: 0, in_progress: 1, scheduled: 2, completed: 3, invoiced: 4 };
    jobs.sort((a, b) => {
      const so = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (so !== 0) return so;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // State for filtering
    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return jobs.filter(job => {
        const matchesStatus = currentStatus === 'all' || job.status === currentStatus;
        if (!matchesStatus) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (
          (job.title   || '').toLowerCase().includes(q) ||
          (job.client  || '').toLowerCase().includes(q) ||
          (job.address || '').toLowerCase().includes(q) ||
          (Array.isArray(job.crew) ? job.crew.join(' ') : '').toLowerCase().includes(q)
        );
      });
    }

    function buildHTML(filtered) {
      return `
        <div class="stagger-enter" style="display: flex; flex-direction: column; gap: 1rem;">
          ${filtered.length > 0
            ? filtered.map(renderJobCard).join('')
            : renderEmptyState(currentQuery)
          }
        </div>
      `;
    }

    // Full initial render
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.75rem; padding: 1.5rem 0;">

        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <h1 style="
            font-family: var(--font-display, Outfit, sans-serif);
            font-size: 1.6rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--text-primary, #f0f0f5);
            margin: 0;
          ">Job Board</h1>
          <button id="jb-new-btn" style="
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.55rem 1.2rem;
            background: var(--accent, #3b82f6);
            color: #fff;
            border: none;
            border-radius: 10px;
            font-size: 0.875rem;
            font-weight: 700;
            cursor: pointer;
            transition: opacity 150ms ease;
          " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
            ＋ New Job
          </button>
        </div>

        <!-- Stat cards -->
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          ${renderStatCards(jobs)}
        </div>

        <!-- Search + filter -->
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <input
            id="jb-search"
            type="search"
            placeholder="Search jobs, clients, crew…"
            value=""
            style="
              flex: 1;
              min-width: 200px;
              background: var(--surface-2, #1a1a2e);
              border: 1px solid var(--border, rgba(255,255,255,0.1));
              border-radius: 10px;
              padding: 0.6rem 1rem;
              color: var(--text-primary, #f0f0f5);
              font-size: 0.875rem;
              outline: none;
              font-family: inherit;
            "
          />
          <select
            id="jb-status-filter"
            style="
              background: var(--surface-2, #1a1a2e);
              border: 1px solid var(--border, rgba(255,255,255,0.1));
              border-radius: 10px;
              padding: 0.6rem 1rem;
              color: var(--text-primary, #f0f0f5);
              font-size: 0.875rem;
              outline: none;
              cursor: pointer;
              font-family: inherit;
            "
          >
            <option value="all">All Statuses</option>
            <option value="urgent">Urgent</option>
            <option value="in_progress">In Progress</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="invoiced">Invoiced</option>
          </select>
        </div>

        <!-- Job list -->
        <div id="jb-list">
          ${buildHTML(getFiltered())}
        </div>

      </div>
    `;

    // Wire up search and filter
    const searchInput  = container.querySelector('#jb-search');
    const statusSelect = container.querySelector('#jb-status-filter');
    const listEl       = container.querySelector('#jb-list');

    function updateList() {
      const filtered = getFiltered();
      listEl.innerHTML = buildHTML(filtered);
      if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl);
    }

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        currentQuery = e.target.value.trim();
        updateList();
      });
    }

    if (statusSelect) {
      statusSelect.addEventListener('change', e => {
        currentStatus = e.target.value;
        updateList();
      });
    }

    // New Job button — placeholder toast/alert
    const newBtn = container.querySelector('#jb-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        if (typeof UI !== 'undefined' && typeof UI.toast === 'function') {
          UI.toast('New job form coming soon.', 'info');
        } else {
          alert('New job form coming soon.');
        }
      });
    }

    // Apply tilt to initial render
    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  /* ─── Register ───────────────────────────────────────────────────────────── */

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({
      id:      'jobs',
      name:    'Job Board',
      emoji:   '📋',
      section: 'Operations',
      routes:  {},
      dashboardWidgets: [],
    });
  }

  return { render, ensureSeedData };

})();

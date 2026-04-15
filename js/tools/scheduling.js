/* ==============================================================================
   AMCOEE TOOLS — Scheduling
   Full tool module: seed data, search/filter, status tracking, crew dispatch.
   ============================================================================== */

const Scheduling = (() => {

  /* --- Seed Data ---------------------------------------------------------- */

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  function dayAt(offset, h, m) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + offset);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  const SEED_DATA = [
    {
      id: 'sched_001',
      title: '200A Panel Install',
      location: '431 Oak St, Braintree',
      date: dayAt(0, 8, 0),
      time: '8:00 AM',
      status: 'confirmed',
      crew: ['Mike Torres', 'James Bell'],
      notes: 'Full panel upgrade — customer confirmed access.',
    },
    {
      id: 'sched_002',
      title: 'Fire Alarm Inspection',
      location: 'Meridian Corp, Quincy',
      date: dayAt(1, 9, 0),
      time: '9:00 AM',
      status: 'confirmed',
      crew: ['Sarah Ochoa'],
      notes: 'Annual fire alarm system inspection — bring NFPA docs.',
    },
    {
      id: 'sched_003',
      title: 'Emergency Backup Generator',
      location: 'Harbor Point Condos, Dorchester',
      date: dayAt(2, 7, 30),
      time: '7:30 AM',
      status: 'tentative',
      crew: ['Mike Torres', 'Dana Clark'],
      notes: 'Generator transfer switch wiring — awaiting permit confirmation.',
    },
    {
      id: 'sched_004',
      title: 'Preventive Maintenance',
      location: 'Harbor Point Condos, Dorchester',
      date: dayAt(3, 10, 0),
      time: '10:00 AM',
      status: 'confirmed',
      crew: ['James Bell'],
      notes: 'Quarterly panel inspection + thermal imaging.',
    },
    {
      id: 'sched_005',
      title: 'Team Meeting + Safety Training',
      location: 'AMCOEE Office',
      date: dayAt(4, 15, 0),
      time: '3:00 PM',
      status: 'confirmed',
      crew: ['All Crew'],
      notes: 'Weekly sync — new arc-flash PPE demo.',
    },
  ];

  /* --- Config ------------------------------------------------------------- */

  const COLLECTION = 'schedule_entries';

  const STATUS_CONFIG = {
    confirmed: { label: 'Confirmed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: '#22c55e' },
    tentative: { label: 'Tentative', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: '#f59e0b' },
    cancelled: { label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: '#ef4444' },
  };

  /* --- Seed --------------------------------------------------------------- */

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const entry of SEED_DATA) {
        await DataStore.create(COLLECTION, entry);
      }
    } catch (e) {
      console.warn('[Scheduling] ensureSeedData failed:', e);
    }
  }

  /* --- Helpers ------------------------------------------------------------- */

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusCfg(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.confirmed;
  }

  function formatDate(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (_) { return ''; }
  }

  /* --- Render helpers ------------------------------------------------------ */

  function renderStatCards(entries) {
    const confirmed = entries.filter(e => e.status === 'confirmed').length;
    const tentative = entries.filter(e => e.status === 'tentative').length;
    const cancelled = entries.filter(e => e.status === 'cancelled').length;

    const stats = [
      { label: 'Confirmed',  value: confirmed, borderColor: STATUS_CONFIG.confirmed.border, textColor: STATUS_CONFIG.confirmed.color },
      { label: 'Tentative',  value: tentative,  borderColor: STATUS_CONFIG.tentative.border, textColor: STATUS_CONFIG.tentative.color },
      { label: 'Cancelled',  value: cancelled,  borderColor: STATUS_CONFIG.cancelled.border, textColor: STATUS_CONFIG.cancelled.color },
    ];

    return stats.map(s => `
      <div class="stat-card" style="
        background: var(--surface-2, #1a1a2e);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-left: 3px solid ${s.borderColor};
        border-radius: 12px;
        padding: 1.25rem 1.5rem;
        display: flex; flex-direction: column; gap: 0.35rem;
        min-width: 140px; flex: 1;
      ">
        <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:2rem;font-weight:700;color:${s.textColor};line-height:1;">${s.value}</span>
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.05em;">${safe(s.label)}</span>
      </div>
    `).join('');
  }

  function renderStatusBadge(status) {
    const cfg = statusCfg(status);
    return `<span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.65rem;border-radius:999px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}33;">${safe(cfg.label)}</span>`;
  }

  function renderCard(entry) {
    const crew = Array.isArray(entry.crew) ? entry.crew : [];
    return `
      <div class="card" style="
        background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));
        border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;
        cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;
      ">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(entry.title)}</div>
          </div>
          ${renderStatusBadge(entry.status)}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.2rem;">
          <span style="font-size:0.875rem;font-weight:600;color:var(--text-secondary,#a0a0b8);">${safe(entry.location)}</span>
          <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(formatDate(entry.date))} at ${safe(entry.time)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
            <span style="font-size:0.72rem;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Crew:</span>
            ${crew.map(c => `<span style="font-size:0.75rem;font-weight:600;color:var(--text-secondary,#a0a0b8);background:var(--surface-3,rgba(255,255,255,0.05));border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:6px;padding:0.15rem 0.5rem;">${safe(c)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;">
        <div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div>
        <p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">
          ${query ? 'No entries match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No schedule entries found. Create one to get started.'}
        </p>
      </div>
    `;
  }

  /* --- Main render --------------------------------------------------------- */

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let entries = [];
    try { entries = await DataStore.list(COLLECTION); } catch (e) { console.warn('[Scheduling] load failed:', e); }

    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return entries.filter(e => {
        const matchesStatus = currentStatus === 'all' || e.status === currentStatus;
        if (!matchesStatus) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (e.title || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q) || (Array.isArray(e.crew) ? e.crew.join(' ') : '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Scheduling</h1>
          <button id="sched-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ New Entry</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(entries)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="sched-search" type="search" placeholder="Search schedule..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="sched-status-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="tentative">Tentative</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div id="sched-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#sched-search');
    const statusSelect = container.querySelector('#sched-status-filter');
    const listEl = container.querySelector('#sched-list');

    function updateList() {
      listEl.innerHTML = buildHTML(getFiltered());
      if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl);
    }

    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (statusSelect) statusSelect.addEventListener('change', e => { currentStatus = e.target.value; updateList(); });

    const newBtn = container.querySelector('#sched-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => {
      if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('New entry form coming soon.', 'info');
      else alert('New entry form coming soon.');
    });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  /* --- Register ----------------------------------------------------------- */

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'scheduling', name: 'Scheduling', emoji: '\u{1F4C5}', section: 'Operations', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };

})();

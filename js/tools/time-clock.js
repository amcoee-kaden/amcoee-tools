/* ==============================================================================
   AMCOEE TOOLS — Time Clock
   Full tool module: seed data, search/filter, clock-in/out tracking.
   ============================================================================== */

const TimeClock = (() => {

  /* --- Seed Data ---------------------------------------------------------- */

  const todayStr = new Date().toISOString().slice(0, 10);

  const SEED_DATA = [
    {
      id: 'clock_001',
      employee: 'Mike Torres',
      clockIn: todayStr + 'T06:45:00',
      clockOut: null,
      status: 'in',
    },
    {
      id: 'clock_002',
      employee: 'Sarah Ochoa',
      clockIn: todayStr + 'T08:00:00',
      clockOut: null,
      status: 'in',
    },
    {
      id: 'clock_003',
      employee: 'James Bell',
      clockIn: todayStr + 'T07:15:00',
      clockOut: null,
      status: 'in',
    },
  ];

  /* --- Config ------------------------------------------------------------- */

  const COLLECTION = 'clock_entries';

  const STATUS_CONFIG = {
    in:  { label: 'Clocked In',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  border: '#22c55e' },
    out: { label: 'Clocked Out', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', border: '#6b7280' },
  };

  /* --- Seed --------------------------------------------------------------- */

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const entry of SEED_DATA) await DataStore.create(COLLECTION, entry);
    } catch (e) { console.warn('[TimeClock] ensureSeedData failed:', e); }
  }

  /* --- Helpers ------------------------------------------------------------- */

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusCfg(status) { return STATUS_CONFIG[status] || STATUS_CONFIG.in; }

  function formatTime(iso) {
    try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch (_) { return ''; }
  }

  function getDuration(clockIn) {
    const diff = Math.floor((Date.now() - new Date(clockIn).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    return h + 'h ' + m + 'm';
  }

  function getHours(clockIn) {
    return Math.round(((Date.now() - new Date(clockIn).getTime()) / 3600000) * 10) / 10;
  }

  /* --- Render helpers ------------------------------------------------------ */

  function renderStatCards(entries) {
    const currentlyIn = entries.filter(e => e.status === 'in').length;
    const hoursToday = entries.reduce((sum, e) => sum + (e.status === 'in' ? getHours(e.clockIn) : 0), 0).toFixed(1);
    const late = entries.filter(e => { const h = new Date(e.clockIn).getHours(); return h >= 8; }).length;

    const stats = [
      { label: 'Currently In', value: currentlyIn, borderColor: '#22c55e', textColor: '#22c55e' },
      { label: 'Hours Today',  value: hoursToday,  borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'Late',         value: late,         borderColor: '#f59e0b', textColor: '#f59e0b' },
    ];

    return stats.map(s => `
      <div class="stat-card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-left:3px solid ${s.borderColor};border-radius:12px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.35rem;min-width:140px;flex:1;">
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
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(entry.employee)}</div>
          </div>
          ${renderStatusBadge(entry.status)}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:1rem;">
            <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">In: <strong style="color:var(--text-secondary,#a0a0b8);">${safe(formatTime(entry.clockIn))}</strong></span>
            ${entry.clockOut ? '<span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Out: <strong style="color:var(--text-secondary,#a0a0b8);">' + safe(formatTime(entry.clockOut)) + '</strong></span>' : ''}
          </div>
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(getDuration(entry.clockIn))}</span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No entries match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No clock entries found.'}</p></div>`;
  }

  /* --- Main render --------------------------------------------------------- */

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let entries = [];
    try { entries = await DataStore.list(COLLECTION); } catch (e) { console.warn('[TimeClock] load failed:', e); }

    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return entries.filter(e => {
        if (currentStatus !== 'all' && e.status !== currentStatus) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (e.employee || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Time Clock</h1>
          <button id="tc-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Clock In</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(entries)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="tc-search" type="search" placeholder="Search employees..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="tc-status-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Statuses</option>
            <option value="in">Clocked In</option>
            <option value="out">Clocked Out</option>
          </select>
        </div>
        <div id="tc-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#tc-search');
    const statusSelect = container.querySelector('#tc-status-filter');
    const listEl = container.querySelector('#tc-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (statusSelect) statusSelect.addEventListener('change', e => { currentStatus = e.target.value; updateList(); });

    const newBtn = container.querySelector('#tc-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('Clock-in form coming soon.', 'info'); else alert('Clock-in form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'timeclock', name: 'Time Clock', emoji: '\u23F0', section: 'Operations', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

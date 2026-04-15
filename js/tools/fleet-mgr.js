/* ==============================================================================
   AMCOEE TOOLS — Fleet Manager
   Full tool module: seed data, search/filter, vehicle tracking.
   ============================================================================== */

const FleetManager = (() => {

  const SEED_DATA = [
    { id: 'veh_001', year: 2019, make: 'Ford', model: 'F-150',       license: 'MA-4521', mileage: 67234,  status: 'active',      driver: 'Mike Torres' },
    { id: 'veh_002', year: 2021, make: 'Ford', model: 'Transit Van', license: 'MA-8903', mileage: 31456,  status: 'active',      driver: 'Sarah Ochoa' },
    { id: 'veh_003', year: 2017, make: 'Ford', model: 'F-250',       license: 'MA-2187', mileage: 112890, status: 'maintenance', driver: null },
  ];

  const COLLECTION = 'vehicles';

  const STATUS_CONFIG = {
    active:      { label: 'Active',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    border: '#22c55e' },
    maintenance: { label: 'Maintenance', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: '#f59e0b' },
    retired:     { label: 'Retired',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: '#ef4444' },
  };

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const v of SEED_DATA) await DataStore.create(COLLECTION, v);
    } catch (e) { console.warn('[FleetManager] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusCfg(s) { return STATUS_CONFIG[s] || STATUS_CONFIG.active; }

  function fmtMileage(m) { return Number(m || 0).toLocaleString(); }

  function renderStatCards(vehicles) {
    const active = vehicles.filter(v => v.status === 'active').length;
    const maint = vehicles.filter(v => v.status === 'maintenance').length;
    const retired = vehicles.filter(v => v.status === 'retired').length;

    return [
      { label: 'Active',      value: active,  borderColor: STATUS_CONFIG.active.border,      textColor: STATUS_CONFIG.active.color },
      { label: 'Maintenance', value: maint,   borderColor: STATUS_CONFIG.maintenance.border, textColor: STATUS_CONFIG.maintenance.color },
      { label: 'Retired',     value: retired,  borderColor: STATUS_CONFIG.retired.border,     textColor: STATUS_CONFIG.retired.color },
    ].map(s => `
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

  function renderCard(v) {
    const title = v.year + ' ' + v.make + ' ' + v.model;
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(title)}</div>
          </div>
          ${renderStatusBadge(v.status)}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.2rem;">
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.82rem;color:var(--text-secondary,#a0a0b8);">${safe(v.license)}</span>
          ${v.driver ? '<span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Driver: <strong style="color:var(--text-secondary,#a0a0b8);">' + safe(v.driver) + '</strong></span>' : ''}
        </div>
        <div style="display:flex;align-items:center;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));">
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(fmtMileage(v.mileage))} mi</span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No vehicles match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No vehicles found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let vehicles = [];
    try { vehicles = await DataStore.list(COLLECTION); } catch (e) { console.warn('[FleetManager] load failed:', e); }

    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return vehicles.filter(v => {
        if (currentStatus !== 'all' && v.status !== currentStatus) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        const title = (v.year + ' ' + v.make + ' ' + v.model).toLowerCase();
        return title.includes(q) || (v.license || '').toLowerCase().includes(q) || (v.driver || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Fleet Management</h1>
          <button id="fm-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Add Vehicle</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(vehicles)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="fm-search" type="search" placeholder="Search vehicles, plates, drivers..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="fm-status-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        <div id="fm-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#fm-search');
    const statusSelect = container.querySelector('#fm-status-filter');
    const listEl = container.querySelector('#fm-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (statusSelect) statusSelect.addEventListener('change', e => { currentStatus = e.target.value; updateList(); });

    const newBtn = container.querySelector('#fm-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('Add vehicle form coming soon.', 'info'); else alert('Add vehicle form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'fleet', name: 'Fleet Management', emoji: '\u{1F69B}', section: 'Operations', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

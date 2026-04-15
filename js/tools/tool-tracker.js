/* ==============================================================================
   AMCOEE TOOLS — Tool Tracker
   Full tool module: seed data, search/filter, status tracking.
   ============================================================================== */

const ToolTracker = (() => {

  const SEED_DATA = [
    { id: 'tool_001', name: 'DeWalt 20V Drill', serial: 'DW-20V-4821', status: 'available', checkedOutTo: null, condition: 'Good' },
    { id: 'tool_002', name: 'DeWalt 20V Drill', serial: 'DW-20V-4822', status: 'checked_out', checkedOutTo: 'Mike Torres', condition: 'Good' },
    { id: 'tool_003', name: 'Fluke 87V Multimeter', serial: 'FL-87V-1190', status: 'checked_out', checkedOutTo: 'Sarah Ochoa', condition: 'Excellent' },
    { id: 'tool_004', name: 'Klein Wire Strippers', serial: 'KL-WS-3345', status: 'available', checkedOutTo: null, condition: 'Good' },
    { id: 'tool_005', name: 'Milwaukee M18 Sawzall', serial: 'MW-M18-7702', status: 'maintenance', checkedOutTo: null, condition: 'Needs blade replacement' },
    { id: 'tool_006', name: 'Greenlee Conduit Bender', serial: 'GL-CB-5501', status: 'available', checkedOutTo: null, condition: 'Good' },
    { id: 'tool_007', name: 'Klein Fish Tape 50ft', serial: 'KL-FT50-2208', status: 'checked_out', checkedOutTo: 'James Bell', condition: 'Good' },
    { id: 'tool_008', name: 'Fluke T6 Voltage Tester', serial: 'FL-T6-0093', status: 'available', checkedOutTo: null, condition: 'Excellent' },
  ];

  const COLLECTION = 'tracked_tools';

  const STATUS_CONFIG = {
    available:    { label: 'Available',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    border: '#22c55e' },
    checked_out:  { label: 'Checked Out',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: '#f59e0b' },
    maintenance:  { label: 'Maintenance',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: '#ef4444' },
  };

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const t of SEED_DATA) await DataStore.create(COLLECTION, t);
    } catch (e) { console.warn('[ToolTracker] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusCfg(s) { return STATUS_CONFIG[s] || STATUS_CONFIG.available; }

  function renderStatCards(tools) {
    const available = tools.filter(t => t.status === 'available').length;
    const checkedOut = tools.filter(t => t.status === 'checked_out').length;
    const maintenance = tools.filter(t => t.status === 'maintenance').length;

    return [
      { label: 'Available', value: available, borderColor: STATUS_CONFIG.available.border, textColor: STATUS_CONFIG.available.color },
      { label: 'Checked Out', value: checkedOut, borderColor: STATUS_CONFIG.checked_out.border, textColor: STATUS_CONFIG.checked_out.color },
      { label: 'Maintenance', value: maintenance, borderColor: STATUS_CONFIG.maintenance.border, textColor: STATUS_CONFIG.maintenance.color },
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

  function renderCard(tool) {
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(tool.name)}</div>
          </div>
          ${renderStatusBadge(tool.status)}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.2rem;">
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(tool.serial)}</span>
          ${tool.checkedOutTo ? '<span style="font-size:0.875rem;font-weight:600;color:var(--text-secondary,#a0a0b8);">Checked out to: ' + safe(tool.checkedOutTo) + '</span>' : ''}
        </div>
        <div style="display:flex;align-items:center;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));">
          <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Condition: <strong style="color:var(--text-secondary,#a0a0b8);">${safe(tool.condition)}</strong></span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No tools match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No tools found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let tools = [];
    try { tools = await DataStore.list(COLLECTION); } catch (e) { console.warn('[ToolTracker] load failed:', e); }

    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return tools.filter(t => {
        if (currentStatus !== 'all' && t.status !== currentStatus) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (t.name || '').toLowerCase().includes(q) || (t.serial || '').toLowerCase().includes(q) || (t.checkedOutTo || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Tool Tracker</h1>
          <button id="tt-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Add Tool</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(tools)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="tt-search" type="search" placeholder="Search tools, serial numbers..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="tt-status-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="checked_out">Checked Out</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div id="tt-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#tt-search');
    const statusSelect = container.querySelector('#tt-status-filter');
    const listEl = container.querySelector('#tt-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (statusSelect) statusSelect.addEventListener('change', e => { currentStatus = e.target.value; updateList(); });

    const newBtn = container.querySelector('#tt-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('Add tool form coming soon.', 'info'); else alert('Add tool form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'tool-tracker', name: 'Tool Tracker', emoji: '\u{1F527}', section: 'Operations', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

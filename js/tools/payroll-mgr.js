/* ==============================================================================
   AMCOEE TOOLS — Payroll Manager
   Full tool module: seed data, search/filter, payroll tracking.
   ============================================================================== */

const PayrollManager = (() => {

  const SEED_DATA = [
    { id: 'pay_001', employee: 'Mike Torres',  regularHours: 40, overtimeHours: 2, total: 42, status: 'pending' },
    { id: 'pay_002', employee: 'Sarah Ochoa',  regularHours: 40, overtimeHours: 0, total: 40, status: 'pending' },
    { id: 'pay_003', employee: 'James Bell',   regularHours: 38, overtimeHours: 0, total: 38, status: 'pending' },
    { id: 'pay_004', employee: 'Dana Clark',   regularHours: 40, overtimeHours: 0, total: 40, status: 'pending' },
  ];

  const COLLECTION = 'payroll_summary';

  const STATUS_CONFIG = {
    processed: { label: 'Processed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: '#22c55e' },
    pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: '#f59e0b' },
  };

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const p of SEED_DATA) await DataStore.create(COLLECTION, p);
    } catch (e) { console.warn('[PayrollManager] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusCfg(s) { return STATUS_CONFIG[s] || STATUS_CONFIG.pending; }

  function renderStatCards(records) {
    const totalRegular = records.reduce((s, r) => s + (r.regularHours || 0), 0);
    const totalOT = records.reduce((s, r) => s + (r.overtimeHours || 0), 0);
    const employees = records.length;

    return [
      { label: 'Regular Hours', value: totalRegular, borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'Overtime Hours', value: totalOT,     borderColor: '#f59e0b', textColor: '#f59e0b' },
      { label: 'Employees',      value: employees,    borderColor: '#22c55e', textColor: '#22c55e' },
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

  function renderCard(rec) {
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(rec.employee)}</div>
          </div>
          ${renderStatusBadge(rec.status)}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:1.5rem;">
            <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Regular: <strong style="font-family:var(--font-mono,'JetBrains Mono',monospace);color:var(--text-secondary,#a0a0b8);">${safe(String(rec.regularHours))}h</strong></span>
            <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">OT: <strong style="font-family:var(--font-mono,'JetBrains Mono',monospace);color:${rec.overtimeHours > 0 ? '#f59e0b' : 'var(--text-secondary,#a0a0b8)'};">${safe(String(rec.overtimeHours))}h</strong></span>
          </div>
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(String(rec.total))}h total</span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No records match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No payroll records found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let records = [];
    try { records = await DataStore.list(COLLECTION); } catch (e) { console.warn('[PayrollManager] load failed:', e); }

    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return records.filter(r => {
        if (currentStatus !== 'all' && r.status !== currentStatus) return false;
        if (!currentQuery) return true;
        return (r.employee || '').toLowerCase().includes(currentQuery.toLowerCase());
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Payroll</h1>
          <button id="pay-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Process Payroll</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(records)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="pay-search" type="search" placeholder="Search employees..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="pay-status-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Statuses</option>
            <option value="processed">Processed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div id="pay-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#pay-search');
    const statusSelect = container.querySelector('#pay-status-filter');
    const listEl = container.querySelector('#pay-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (statusSelect) statusSelect.addEventListener('change', e => { currentStatus = e.target.value; updateList(); });

    const newBtn = container.querySelector('#pay-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('Payroll processing coming soon.', 'info'); else alert('Payroll processing coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'payroll', name: 'Payroll', emoji: '\u{1F4BC}', section: 'Finance', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

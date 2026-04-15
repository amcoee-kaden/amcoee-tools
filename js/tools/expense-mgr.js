/* ==============================================================================
   AMCOEE TOOLS — Expense Manager
   Full tool module: seed data, search/filter, expense tracking.
   ============================================================================== */

const ExpenseManager = (() => {

  const SEED_DATA = [
    { id: 'exp_001', category: 'Materials',    amount: 342.50, submittedBy: 'Mike Torres',  date: '2026-04-12', status: 'approved' },
    { id: 'exp_002', category: 'Fuel',         amount: 89.00,  submittedBy: 'James Bell',   date: '2026-04-14', status: 'pending'  },
    { id: 'exp_003', category: 'Tool Rental',  amount: 150.00, submittedBy: 'Mike Torres',  date: '2026-04-10', status: 'approved' },
    { id: 'exp_004', category: 'Permit Fees',  amount: 75.00,  submittedBy: 'Sarah Ochoa',  date: '2026-04-13', status: 'pending'  },
  ];

  const COLLECTION = 'expense_reports';

  const STATUS_CONFIG = {
    approved: { label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: '#22c55e' },
    pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: '#f59e0b' },
    rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: '#ef4444' },
  };

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const exp of SEED_DATA) await DataStore.create(COLLECTION, exp);
    } catch (e) { console.warn('[ExpenseManager] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusCfg(s) { return STATUS_CONFIG[s] || STATUS_CONFIG.pending; }
  function fmtCurrency(n) { return '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function renderStatCards(expenses) {
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const approved = expenses.filter(e => e.status === 'approved').reduce((s, e) => s + (e.amount || 0), 0);
    const pending = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + (e.amount || 0), 0);

    return [
      { label: 'Total',    value: fmtCurrency(total),    borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'Approved', value: fmtCurrency(approved),  borderColor: '#22c55e', textColor: '#22c55e' },
      { label: 'Pending',  value: fmtCurrency(pending),   borderColor: '#f59e0b', textColor: '#f59e0b' },
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

  function renderCard(exp) {
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(exp.category)}</div>
          </div>
          ${renderStatusBadge(exp.status)}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.2rem;">
          <span style="font-size:0.875rem;font-weight:600;color:var(--text-secondary,#a0a0b8);">Submitted by ${safe(exp.submittedBy)}</span>
          <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(exp.date)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));">
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:1.1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(fmtCurrency(exp.amount))}</span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No expenses match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No expenses found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let expenses = [];
    try { expenses = await DataStore.list(COLLECTION); } catch (e) { console.warn('[ExpenseManager] load failed:', e); }

    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return expenses.filter(exp => {
        if (currentStatus !== 'all' && exp.status !== currentStatus) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (exp.category || '').toLowerCase().includes(q) || (exp.submittedBy || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Expenses</h1>
          <button id="exp-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ New Expense</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(expenses)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="exp-search" type="search" placeholder="Search expenses..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="exp-status-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div id="exp-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#exp-search');
    const statusSelect = container.querySelector('#exp-status-filter');
    const listEl = container.querySelector('#exp-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (statusSelect) statusSelect.addEventListener('change', e => { currentStatus = e.target.value; updateList(); });

    const newBtn = container.querySelector('#exp-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('New expense form coming soon.', 'info'); else alert('New expense form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'expenses', name: 'Expenses', emoji: '\u{1F4B3}', section: 'Finance', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

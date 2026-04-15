/* ==============================================================================
   AMCOEE TOOLS — Invoicing
   Full tool module: seed data, search/filter, invoice tracking.
   ============================================================================== */

const Invoicing = (() => {

  const SEED_DATA = [
    { id: 'inv_i_001', invoiceNumber: 'INV-2026-039', client: 'Thompson Residence', amount: 2400,  status: 'paid',    date: '2026-03-28', daysOutstanding: 0  },
    { id: 'inv_i_002', invoiceNumber: 'INV-2026-040', client: 'Meridian Corp',      amount: 5800,  status: 'pending', date: '2026-03-31', daysOutstanding: 15 },
    { id: 'inv_i_003', invoiceNumber: 'INV-2026-041', client: 'Davis Family',       amount: 1200,  status: 'overdue', date: '2026-03-01', daysOutstanding: 45 },
  ];

  const COLLECTION = 'invoices';

  const STATUS_CONFIG = {
    paid:    { label: 'Paid',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    border: '#22c55e' },
    pending: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   border: '#f59e0b' },
    overdue: { label: 'Overdue', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    border: '#ef4444' },
    draft:   { label: 'Draft',   color: '#6b7280', bg: 'rgba(107,114,128,0.12)',  border: '#6b7280' },
  };

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const inv of SEED_DATA) await DataStore.create(COLLECTION, inv);
    } catch (e) { console.warn('[Invoicing] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function statusCfg(s) { return STATUS_CONFIG[s] || STATUS_CONFIG.pending; }
  function fmtCurrency(n) { return '$' + Number(n || 0).toLocaleString(); }

  function renderStatCards(invoices) {
    const outstanding = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + (i.amount || 0), 0);
    const overdueAmt = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount || 0), 0);
    const paidMonth = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);

    return [
      { label: 'Outstanding',   value: fmtCurrency(outstanding), borderColor: '#f59e0b', textColor: '#f59e0b' },
      { label: 'Overdue',       value: fmtCurrency(overdueAmt),  borderColor: '#ef4444', textColor: '#ef4444' },
      { label: 'Paid This Month', value: fmtCurrency(paidMonth), borderColor: '#22c55e', textColor: '#22c55e' },
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

  function renderCard(inv) {
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.9rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(inv.invoiceNumber)}</div>
          </div>
          ${renderStatusBadge(inv.status)}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.2rem;">
          <span style="font-family:var(--font-display,Outfit,sans-serif);font-size:0.95rem;font-weight:600;color:var(--text-secondary,#a0a0b8);">${safe(inv.client)}</span>
          <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(inv.date)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:1.1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(fmtCurrency(inv.amount))}</span>
          ${inv.daysOutstanding > 0 ? '<span style="font-size:0.72rem;color:var(--text-muted,#6b7280);">' + safe(String(inv.daysOutstanding)) + ' days outstanding</span>' : ''}
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No invoices match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No invoices found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let invoices = [];
    try { invoices = await DataStore.list(COLLECTION); } catch (e) { console.warn('[Invoicing] load failed:', e); }

    let currentQuery = '';
    let currentStatus = 'all';

    function getFiltered() {
      return invoices.filter(inv => {
        if (currentStatus !== 'all' && inv.status !== currentStatus) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (inv.invoiceNumber || '').toLowerCase().includes(q) || (inv.client || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Invoicing</h1>
          <button id="inv-new-btn2" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ New Invoice</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(invoices)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="inv-search2" type="search" placeholder="Search invoices, clients..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="inv-status-filter2" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div id="inv-list2">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#inv-search2');
    const statusSelect = container.querySelector('#inv-status-filter2');
    const listEl = container.querySelector('#inv-list2');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (statusSelect) statusSelect.addEventListener('change', e => { currentStatus = e.target.value; updateList(); });

    const newBtn = container.querySelector('#inv-new-btn2');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('New invoice form coming soon.', 'info'); else alert('New invoice form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'invoicing', name: 'Invoicing', emoji: '\u{1F4B0}', section: 'Finance', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

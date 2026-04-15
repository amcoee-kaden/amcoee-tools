/* ==============================================================================
   AMCOEE TOOLS — CRM (Customer Relationship Management)
   Full tool module: seed data, search/filter, customer tracking.
   ============================================================================== */

const CRM = (() => {

  const SEED_DATA = [
    { id: 'cust_001', name: 'Thompson Residence',       type: 'residential', address: '18 Maple Ave, Braintree, MA',    phone: '(617) 555-0142', lastService: '2026-03-28', totalRevenue: 4800  },
    { id: 'cust_002', name: 'Meridian Corp',             type: 'commercial',  address: '500 Congress St, Quincy, MA',    phone: '(617) 555-0291', lastService: '2026-04-10', totalRevenue: 23500 },
    { id: 'cust_003', name: 'Davis Family',              type: 'residential', address: '7 Pond St, Weymouth, MA',        phone: '(781) 555-0388', lastService: '2026-02-15', totalRevenue: 1200  },
    { id: 'cust_004', name: 'Quincy School Department',  type: 'municipal',   address: '70 Coddington St, Quincy, MA',   phone: '(617) 555-0500', lastService: '2026-04-01', totalRevenue: 18200 },
    { id: 'cust_005', name: 'Harbor Point Condos',       type: 'commercial',  address: '1 Harbor Point Blvd, Dorchester, MA', phone: '(617) 555-0619', lastService: '2026-03-15', totalRevenue: 31000 },
  ];

  const COLLECTION = 'customers';

  const TYPE_CONFIG = {
    residential: { label: 'Residential', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    commercial:  { label: 'Commercial',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    municipal:   { label: 'Municipal',   color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  };

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const c of SEED_DATA) await DataStore.create(COLLECTION, c);
    } catch (e) { console.warn('[CRM] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function typeCfg(t) { return TYPE_CONFIG[t] || TYPE_CONFIG.residential; }

  function fmtCurrency(n) { return '$' + Number(n || 0).toLocaleString(); }

  function renderStatCards(customers) {
    const total = customers.length;
    const totalRev = customers.reduce((s, c) => s + (c.totalRevenue || 0), 0);
    const types = [...new Set(customers.map(c => c.type))].length;

    return [
      { label: 'Total Clients', value: total,                borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'Total Revenue', value: fmtCurrency(totalRev), borderColor: '#22c55e', textColor: '#22c55e' },
      { label: 'Types',         value: types,                 borderColor: '#a855f7', textColor: '#a855f7' },
    ].map(s => `
      <div class="stat-card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-left:3px solid ${s.borderColor};border-radius:12px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.35rem;min-width:140px;flex:1;">
        <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:2rem;font-weight:700;color:${s.textColor};line-height:1;">${s.value}</span>
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.05em;">${safe(s.label)}</span>
      </div>
    `).join('');
  }

  function renderTypeBadge(type) {
    const cfg = typeCfg(type);
    return `<span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.65rem;border-radius:999px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}33;">${safe(cfg.label)}</span>`;
  }

  function renderCard(c) {
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(c.name)}</div>
          </div>
          ${renderTypeBadge(c.type)}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.2rem;">
          <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(c.address)}</span>
          <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(c.phone)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Last Service: <strong style="color:var(--text-secondary,#a0a0b8);">${safe(c.lastService)}</strong></span>
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.85rem;font-weight:700;color:#22c55e;">${safe(fmtCurrency(c.totalRevenue))}</span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No customers match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No customers found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let customers = [];
    try { customers = await DataStore.list(COLLECTION); } catch (e) { console.warn('[CRM] load failed:', e); }

    let currentQuery = '';
    let currentType = 'all';

    function getFiltered() {
      return customers.filter(c => {
        if (currentType !== 'all' && c.type !== currentType) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (c.name || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Customers</h1>
          <button id="crm-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Add Customer</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(customers)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="crm-search" type="search" placeholder="Search customers..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="crm-type-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="municipal">Municipal</option>
          </select>
        </div>
        <div id="crm-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#crm-search');
    const typeSelect = container.querySelector('#crm-type-filter');
    const listEl = container.querySelector('#crm-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (typeSelect) typeSelect.addEventListener('change', e => { currentType = e.target.value; updateList(); });

    const newBtn = container.querySelector('#crm-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('Add customer form coming soon.', 'info'); else alert('Add customer form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'crm', name: 'Customers', emoji: '\u{1F465}', section: 'Management', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

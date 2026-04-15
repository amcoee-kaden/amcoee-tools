/* ==============================================================================
   AMCOEE TOOLS — Inventory Manager
   Full tool module: seed data, search/filter, stock level tracking.
   ============================================================================== */

const InventoryManager = (() => {

  const SEED_DATA = [
    { id: 'inv_001', name: 'Romex 12/2 (250ft)',      category: 'Wire & Cable',  quantity: 12, unit: 'rolls',  reorderPoint: 5  },
    { id: 'inv_002', name: '3/4" EMT Conduit (10ft)',  category: 'Conduit',       quantity: 45, unit: 'sticks', reorderPoint: 15 },
    { id: 'inv_003', name: 'Wire Nuts Assorted',       category: 'Connectors',    quantity: 30, unit: 'bags',   reorderPoint: 10 },
    { id: 'inv_004', name: '20A Breakers',             category: 'Breakers',      quantity: 24, unit: 'each',   reorderPoint: 8  },
    { id: 'inv_005', name: 'Duplex Outlets',           category: 'Devices',       quantity: 50, unit: 'each',   reorderPoint: 15 },
    { id: 'inv_006', name: 'Light Switches',           category: 'Devices',       quantity: 35, unit: 'each',   reorderPoint: 10 },
    { id: 'inv_007', name: '4x4 Junction Boxes',       category: 'Boxes',         quantity: 20, unit: 'each',   reorderPoint: 10 },
    { id: 'inv_008', name: '1" PVC Pipe (10ft)',       category: 'Conduit',       quantity: 15, unit: 'sticks', reorderPoint: 8  },
    { id: 'inv_009', name: 'Cable Ties 8"',            category: 'Accessories',   quantity: 40, unit: 'bags',   reorderPoint: 10 },
    { id: 'inv_010', name: 'Electrical Tape',          category: 'Accessories',   quantity: 25, unit: 'rolls',  reorderPoint: 8  },
  ];

  const COLLECTION = 'inventory_items';

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const item of SEED_DATA) await DataStore.create(COLLECTION, item);
    } catch (e) { console.warn('[InventoryManager] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderStatCards(items) {
    const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0);
    const lowStock = items.filter(i => i.quantity < 10).length;
    const categories = [...new Set(items.map(i => i.category))].length;

    return [
      { label: 'Total Items', value: totalItems, borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'Low Stock',   value: lowStock,   borderColor: '#ef4444', textColor: '#ef4444' },
      { label: 'Categories',  value: categories,  borderColor: '#22c55e', textColor: '#22c55e' },
    ].map(s => `
      <div class="stat-card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-left:3px solid ${s.borderColor};border-radius:12px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.35rem;min-width:140px;flex:1;">
        <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:2rem;font-weight:700;color:${s.textColor};line-height:1;">${s.value}</span>
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.05em;">${safe(s.label)}</span>
      </div>
    `).join('');
  }

  function renderCard(item) {
    const isLow = item.quantity < item.reorderPoint;
    const qtyColor = isLow ? '#ef4444' : '#22c55e';
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safe(item.name)}</div>
          </div>
          <span style="display:inline-flex;align-items:center;padding:0.25rem 0.65rem;border-radius:999px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.2);">${safe(item.category)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:1rem;">
            <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:1.1rem;font-weight:700;color:${qtyColor};">${safe(String(item.quantity))}</span>
            <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(item.unit)}</span>
          </div>
          <span style="font-size:0.72rem;color:var(--text-muted,#6b7280);">Reorder at: <strong style="color:var(--text-secondary,#a0a0b8);">${safe(String(item.reorderPoint))}</strong></span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No items match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No inventory items found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let items = [];
    try { items = await DataStore.list(COLLECTION); } catch (e) { console.warn('[InventoryManager] load failed:', e); }

    const categories = ['all', ...new Set(items.map(i => i.category))];
    let currentQuery = '';
    let currentCategory = 'all';

    function getFiltered() {
      return items.filter(i => {
        if (currentCategory !== 'all' && i.category !== currentCategory) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (i.name || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Inventory</h1>
          <button id="inv-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Add Item</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(items)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="inv-search" type="search" placeholder="Search inventory..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="inv-cat-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            ${categories.map(c => '<option value="' + safe(c) + '">' + (c === 'all' ? 'All Categories' : safe(c)) + '</option>').join('')}
          </select>
        </div>
        <div id="inv-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#inv-search');
    const catSelect = container.querySelector('#inv-cat-filter');
    const listEl = container.querySelector('#inv-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (catSelect) catSelect.addEventListener('change', e => { currentCategory = e.target.value; updateList(); });

    const newBtn = container.querySelector('#inv-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('Add item form coming soon.', 'info'); else alert('Add item form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'inventory', name: 'Inventory', emoji: '\u{1F4E6}', section: 'Operations', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

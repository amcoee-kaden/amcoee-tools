/* ==============================================================================
   AMCOEE TOOLS — Documents
   Full tool module: seed data, search/filter, document category management.
   ============================================================================== */

const Documents = (() => {

  const SEED_DATA = [
    { id: 'doc_001', name: 'Safety Certifications',  icon: '\u{1F6E1}\uFE0F', documentCount: 12, lastUpdated: '2026-04-10' },
    { id: 'doc_002', name: 'Permits & Licenses',     icon: '\u{1F4DC}',        documentCount: 8,  lastUpdated: '2026-04-08' },
    { id: 'doc_003', name: 'Insurance Documents',     icon: '\u{1F4CB}',        documentCount: 4,  lastUpdated: '2026-03-15' },
    { id: 'doc_004', name: 'Training Materials',      icon: '\u{1F4DA}',        documentCount: 15, lastUpdated: '2026-04-12' },
    { id: 'doc_005', name: 'Templates & Forms',       icon: '\u{1F4C4}',        documentCount: 9,  lastUpdated: '2026-04-05' },
  ];

  const COLLECTION = 'document_categories';

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const d of SEED_DATA) await DataStore.create(COLLECTION, d);
    } catch (e) { console.warn('[Documents] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderStatCards(docs) {
    const totalDocs = docs.reduce((s, d) => s + (d.documentCount || 0), 0);
    const categories = docs.length;

    return [
      { label: 'Total Documents', value: totalDocs,   borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'Categories',      value: categories,   borderColor: '#22c55e', textColor: '#22c55e' },
    ].map(s => `
      <div class="stat-card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-left:3px solid ${s.borderColor};border-radius:12px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.35rem;min-width:140px;flex:1;">
        <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:2rem;font-weight:700;color:${s.textColor};line-height:1;">${s.value}</span>
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.05em;">${safe(s.label)}</span>
      </div>
    `).join('');
  }

  function renderCard(doc) {
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.75rem;">
          <div style="width:42px;height:42px;border-radius:10px;background:var(--surface-3,rgba(255,255,255,0.05));border:1px solid var(--border,rgba(255,255,255,0.07));display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;">${doc.icon || '\u{1F4C1}'}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(doc.name)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.85rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(String(doc.documentCount))} documents</span>
          <span style="font-size:0.72rem;color:var(--text-muted,#6b7280);">Updated: ${safe(doc.lastUpdated)}</span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No categories match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No document categories found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let docs = [];
    try { docs = await DataStore.list(COLLECTION); } catch (e) { console.warn('[Documents] load failed:', e); }

    let currentQuery = '';

    function getFiltered() {
      if (!currentQuery) return docs;
      const q = currentQuery.toLowerCase();
      return docs.filter(d => (d.name || '').toLowerCase().includes(q));
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Documents</h1>
          <button id="doc-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ Upload Document</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(docs)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="doc-search" type="search" placeholder="Search document categories..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
        </div>
        <div id="doc-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#doc-search');
    const listEl = container.querySelector('#doc-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });

    const newBtn = container.querySelector('#doc-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('Upload form coming soon.', 'info'); else alert('Upload form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'documents', name: 'Documents', emoji: '\u{1F4C4}', section: 'Administration', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

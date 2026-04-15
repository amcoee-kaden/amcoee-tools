/* ==============================================================================
   AMCOEE TOOLS — Safety Manager
   Full tool module: seed data, search/filter, safety checklist tracking.
   ============================================================================== */

const SafetyManager = (() => {

  const SEED_DATA = [
    { id: 'safe_001', name: 'Daily Vehicle Inspection',     itemCount: 8,  frequency: 'Daily',      lastCompleted: '2026-04-15', compliance: 94 },
    { id: 'safe_002', name: 'Job Site Hazard Assessment',   itemCount: 12, frequency: 'Per Job',    lastCompleted: '2026-04-14', compliance: 87 },
    { id: 'safe_003', name: 'PPE Compliance Check',         itemCount: 6,  frequency: 'Weekly',     lastCompleted: '2026-04-12', compliance: 100 },
  ];

  const COLLECTION = 'safety_checklists';

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const s of SEED_DATA) await DataStore.create(COLLECTION, s);
    } catch (e) { console.warn('[SafetyManager] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function complianceColor(pct) {
    if (pct >= 95) return '#22c55e';
    if (pct >= 80) return '#f59e0b';
    return '#ef4444';
  }

  function renderStatCards(checklists) {
    const total = checklists.length;
    const avgCompliance = checklists.length > 0 ? Math.round(checklists.reduce((s, c) => s + (c.compliance || 0), 0) / checklists.length) : 0;
    const totalItems = checklists.reduce((s, c) => s + (c.itemCount || 0), 0);

    return [
      { label: 'Checklists',     value: total,           borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'Avg Compliance', value: avgCompliance + '%', borderColor: complianceColor(avgCompliance), textColor: complianceColor(avgCompliance) },
      { label: 'Total Items',    value: totalItems,       borderColor: '#22c55e', textColor: '#22c55e' },
    ].map(s => `
      <div class="stat-card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-left:3px solid ${s.borderColor};border-radius:12px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.35rem;min-width:140px;flex:1;">
        <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:2rem;font-weight:700;color:${s.textColor};line-height:1;">${s.value}</span>
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.05em;">${safe(s.label)}</span>
      </div>
    `).join('');
  }

  function renderCard(checklist) {
    const cc = complianceColor(checklist.compliance);
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(checklist.name)}</div>
          </div>
          <span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.65rem;border-radius:999px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.2);">${safe(checklist.frequency)}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:1rem;">
            <span style="font-size:0.78rem;color:var(--text-muted,#6b7280);">${safe(String(checklist.itemCount))} items</span>
            <span style="font-size:0.72rem;color:var(--text-muted,#6b7280);">Last: ${safe(checklist.lastCompleted)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <div style="width:60px;height:6px;border-radius:3px;background:var(--surface-3,rgba(255,255,255,0.05));overflow:hidden;">
              <div style="width:${checklist.compliance}%;height:100%;border-radius:3px;background:${cc};"></div>
            </div>
            <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:0.78rem;font-weight:700;color:${cc};">${safe(String(checklist.compliance))}%</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No checklists match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No safety checklists found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let checklists = [];
    try { checklists = await DataStore.list(COLLECTION); } catch (e) { console.warn('[SafetyManager] load failed:', e); }

    let currentQuery = '';

    function getFiltered() {
      if (!currentQuery) return checklists;
      const q = currentQuery.toLowerCase();
      return checklists.filter(c => (c.name || '').toLowerCase().includes(q) || (c.frequency || '').toLowerCase().includes(q));
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Safety</h1>
          <button id="safe-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ New Checklist</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(checklists)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="safe-search" type="search" placeholder="Search checklists..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
        </div>
        <div id="safe-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#safe-search');
    const listEl = container.querySelector('#safe-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });

    const newBtn = container.querySelector('#safe-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('New checklist form coming soon.', 'info'); else alert('New checklist form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'safety', name: 'Safety', emoji: '\u{1F6E1}\uFE0F', section: 'Compliance', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

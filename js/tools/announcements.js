/* ==============================================================================
   AMCOEE TOOLS — Announcements
   Full tool module: seed data, search/filter, company announcements.
   ============================================================================== */

const Announcements = (() => {

  const SEED_DATA = [
    {
      id: 'ann_001',
      title: 'Mandatory Safety Meeting — Friday 3PM',
      body: 'All field crew must attend the safety meeting this Friday at 3 PM in the main office. We will cover new arc-flash PPE requirements and updated lockout/tagout procedures. Attendance is mandatory.',
      author: 'Jeremy Silva',
      date: '2026-04-14',
      priority: 'high',
      readCount: 8,
    },
    {
      id: 'ann_002',
      title: 'New Service Truck Arriving Monday',
      body: 'A new 2026 Ford Transit service van will arrive Monday morning. It will be assigned to the South Shore route. Fleet decals and tool setup will be completed by Wednesday.',
      author: 'Kaden DaSilva',
      date: '2026-04-13',
      priority: 'normal',
      readCount: 12,
    },
  ];

  const COLLECTION = 'company_announcements';

  const PRIORITY_CONFIG = {
    high:   { label: 'High Priority', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    normal: { label: 'Normal',        color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  };

  async function ensureSeedData() {
    try {
      const existing = await DataStore.list(COLLECTION);
      if (existing.length > 0) return;
      for (const a of SEED_DATA) await DataStore.create(COLLECTION, a);
    } catch (e) { console.warn('[Announcements] ensureSeedData failed:', e); }
  }

  function safe(str) {
    if (typeof DOMPurify !== 'undefined') return DOMPurify.sanitize(String(str || ''));
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function prioCfg(p) { return PRIORITY_CONFIG[p] || PRIORITY_CONFIG.normal; }

  function renderStatCards(announcements) {
    const total = announcements.length;
    const highPriority = announcements.filter(a => a.priority === 'high').length;

    return [
      { label: 'Announcements', value: total,        borderColor: '#3b82f6', textColor: '#3b82f6' },
      { label: 'High Priority', value: highPriority,  borderColor: '#ef4444', textColor: '#ef4444' },
    ].map(s => `
      <div class="stat-card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-left:3px solid ${s.borderColor};border-radius:12px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.35rem;min-width:140px;flex:1;">
        <span style="font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:2rem;font-weight:700;color:${s.textColor};line-height:1;">${s.value}</span>
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-muted,#6b7280);text-transform:uppercase;letter-spacing:0.05em;">${safe(s.label)}</span>
      </div>
    `).join('');
  }

  function renderPriorityBadge(priority) {
    const cfg = prioCfg(priority);
    return `<span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.65rem;border-radius:999px;font-size:0.72rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}33;">${safe(cfg.label)}</span>`;
  }

  function renderCard(ann) {
    const preview = (ann.body || '').length > 120 ? ann.body.substring(0, 120) + '...' : ann.body;
    return `
      <div class="card" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem 1.5rem;display:flex;flex-direction:column;gap:0.85rem;cursor:default;transition:transform 150ms ease-out,box-shadow 150ms ease-out;will-change:transform;">
        <div style="display:flex;align-items:flex-start;gap:0.6rem;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:var(--font-display,Outfit,sans-serif);font-size:1rem;font-weight:700;color:var(--text-primary,#f0f0f5);">${safe(ann.title)}</div>
          </div>
          ${renderPriorityBadge(ann.priority)}
        </div>
        <p style="font-size:0.85rem;color:var(--text-secondary,#a0a0b8);line-height:1.6;margin:0;">${safe(preview)}</p>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;padding-top:0.6rem;border-top:1px solid var(--border,rgba(255,255,255,0.07));flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:1rem;">
            <span style="font-size:0.78rem;font-weight:600;color:var(--text-secondary,#a0a0b8);">${safe(ann.author)}</span>
            <span style="font-size:0.72rem;color:var(--text-muted,#6b7280);">${safe(ann.date)}</span>
          </div>
          <span style="font-size:0.72rem;color:var(--text-muted,#6b7280);">${safe(String(ann.readCount))} reads</span>
        </div>
      </div>
    `;
  }

  function renderEmptyState(query) {
    return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 2rem;text-align:center;gap:1rem;"><div style="font-size:2.5rem;opacity:0.4;">&#x1F50D;</div><p style="color:var(--text-muted,#6b7280);font-size:0.95rem;max-width:320px;line-height:1.6;">${query ? 'No announcements match <strong style="color:var(--text-secondary,#a0a0b8);">"' + safe(query) + '"</strong>' : 'No announcements found.'}</p></div>`;
  }

  async function render(container, session) {
    if (!container) return;
    await ensureSeedData();

    let announcements = [];
    try { announcements = await DataStore.list(COLLECTION); } catch (e) { console.warn('[Announcements] load failed:', e); }

    announcements.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return new Date(b.date) - new Date(a.date);
    });

    let currentQuery = '';
    let currentPriority = 'all';

    function getFiltered() {
      return announcements.filter(a => {
        if (currentPriority !== 'all' && a.priority !== currentPriority) return false;
        if (!currentQuery) return true;
        const q = currentQuery.toLowerCase();
        return (a.title || '').toLowerCase().includes(q) || (a.body || '').toLowerCase().includes(q) || (a.author || '').toLowerCase().includes(q);
      });
    }

    function buildHTML(filtered) {
      return `<div class="stagger-enter" style="display:flex;flex-direction:column;gap:1rem;">${filtered.length > 0 ? filtered.map(renderCard).join('') : renderEmptyState(currentQuery)}</div>`;
    }

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1.75rem;padding:1.5rem 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <h1 style="font-family:var(--font-display,Outfit,sans-serif);font-size:1.6rem;font-weight:800;letter-spacing:-0.02em;color:var(--text-primary,#f0f0f5);margin:0;">Announcements</h1>
          <button id="ann-new-btn" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.55rem 1.2rem;background:var(--accent,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 150ms ease;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">+ New Announcement</button>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;">${renderStatCards(announcements)}</div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
          <input id="ann-search" type="search" placeholder="Search announcements..." value="" style="flex:1;min-width:200px;background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;font-family:inherit;"/>
          <select id="ann-prio-filter" style="background:var(--surface-2,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:0.6rem 1rem;color:var(--text-primary,#f0f0f5);font-size:0.875rem;outline:none;cursor:pointer;font-family:inherit;">
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal</option>
          </select>
        </div>
        <div id="ann-list">${buildHTML(getFiltered())}</div>
      </div>
    `;

    const searchInput = container.querySelector('#ann-search');
    const prioSelect = container.querySelector('#ann-prio-filter');
    const listEl = container.querySelector('#ann-list');

    function updateList() { listEl.innerHTML = buildHTML(getFiltered()); if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(listEl); }
    if (searchInput) searchInput.addEventListener('input', e => { currentQuery = e.target.value.trim(); updateList(); });
    if (prioSelect) prioSelect.addEventListener('change', e => { currentPriority = e.target.value; updateList(); });

    const newBtn = container.querySelector('#ann-new-btn');
    if (newBtn) newBtn.addEventListener('click', () => { if (typeof UI !== 'undefined' && typeof UI.toast === 'function') UI.toast('New announcement form coming soon.', 'info'); else alert('New announcement form coming soon.'); });

    if (typeof CardTilt !== 'undefined') CardTilt.applyTilt(container);
  }

  if (typeof ToolRegistry !== 'undefined') {
    ToolRegistry.register({ id: 'announcements', name: 'Announcements', emoji: '\u{1F514}', section: 'Communication', routes: {}, dashboardWidgets: [] });
  }

  return { render, ensureSeedData };
})();

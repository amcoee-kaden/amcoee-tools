/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Documents
   Manuals, permits, spec sheets — links + metadata.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'documents';

  const TYPE = {
    pdf:      { label: 'PDF', accent: 'red' },
    spec:     { label: 'Spec', accent: 'blue' },
    manual:   { label: 'Manual', accent: 'amber' },
    permit:   { label: 'Permit', accent: 'green' },
    contract: { label: 'Contract', accent: 'electric' },
    safety:   { label: 'Safety', accent: 'amber' },
    other:    { label: 'Doc', accent: 'muted' },
  };

  const SEED = [
    { id: 'd_001', title: 'NEC 2023 Handbook — Excerpts',  type: 'manual',   link: '#', owner: 'Shop',       size: '12.4 MB', addedAt: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: 'd_002', title: 'Square D QO Panel Spec Sheet',  type: 'spec',     link: '#', owner: 'Jeremy',    size: '480 KB',  addedAt: new Date(Date.now() - 86400000 * 32).toISOString() },
    { id: 'd_003', title: 'COH Permit #P-2026-04-318',     type: 'permit',   link: '#', owner: 'Sarah',     size: '210 KB',  addedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'd_004', title: 'Greenfield MSA (Executed)',     type: 'contract', link: '#', owner: 'Jeremy',    size: '1.8 MB',  addedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'd_005', title: 'Arc Flash PPE — Field Guide',   type: 'safety',   link: '#', owner: 'Sarah',     size: '3.2 MB',  addedAt: new Date(Date.now() - 86400000 * 90).toISOString() },
    { id: 'd_006', title: 'Blue Oak Lighting Cut Sheet',   type: 'spec',     link: '#', owner: 'Kaden',     size: '1.1 MB',  addedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const d of SEED) await DataStore.create(COLLECTION, d); }

  function renderCard(d) {
    const t = TYPE[d.type] || TYPE.other;
    return `
      <article class="card" data-accent="${t.accent}" data-id="${Atlas.safe(d.id)}">
        <div class="card__row">
          <div>
            <div class="card__title"><a href="${Atlas.safe(d.link || '#')}" target="_blank" rel="noreferrer" style="color:inherit">${Atlas.safe(d.title)}</a></div>
            <div class="card__sub">${Atlas.safe(d.owner)} · <span class="mono">${Atlas.safe(d.size || '—')}</span></div>
          </div>
          <span class="badge badge--${t.accent}">${Atlas.safe(t.label)}</span>
        </div>
        <div class="card__meta">
          <span>Added <strong>${Atlas.fmt.date(d.addedAt)}</strong></span>
          <a href="${Atlas.safe(d.link || '#')}" target="_blank" rel="noreferrer" class="btn btn--sm" style="margin-left:auto">Open →</a>
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    return `
      <div class="stat-strip">
        <div class="stat"><span class="stat__label">Total docs</span><span class="stat__value">${items.length}</span></div>
        <div class="stat stat--green"><span class="stat__label">Permits</span><span class="stat__value stat__value--green">${items.filter(i => i.type === 'permit').length}</span></div>
        <div class="stat stat--electric"><span class="stat__label">Contracts</span><span class="stat__value stat__value--electric">${items.filter(i => i.type === 'contract').length}</span></div>
        <div class="stat stat--amber"><span class="stat__label">Safety</span><span class="stat__value stat__value--amber">${items.filter(i => i.type === 'safety').length}</span></div>
      </div>
    `;
  }

  function openModal(onSaved, session) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Add a <em>document</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="field"><label class="field__label">Title</label><input class="input" name="title" required/></div>
        <div class="field"><label class="field__label">Link (URL)</label><input class="input" name="link" type="url" placeholder="https://…"/></div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Type</label><select class="select" name="type">${Object.entries(TYPE).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
          <div class="field"><label class="field__label">Size</label><input class="input" name="size" placeholder="e.g. 1.2 MB"/></div>
        </div>
        <div class="field"><label class="field__label">Owner</label><input class="input" name="owner" value="${Atlas.safe((session?.name || '').split(' ')[0])}"/></div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Save</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html);
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.addedAt = new Date().toISOString();
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Added', 'success'); onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('documents', async function (root, session) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';

    function filtered() {
      return items.filter(i => {
        if (filter !== 'all' && i.type !== filter) return false;
        if (!query) return true;
        return (i.title + ' ' + (i.owner || '')).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">❒ DOCS</span><span>Library · links</span></div>
            <h1 class="page-head__title">Every <em>document</em>, one search away.</h1>
            <p class="page-head__sub">Manuals, specs, permits, contracts — tagged and searchable.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Add doc</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search titles, owners…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new').addEventListener('click', () => openModal(reload, session));
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      const pairs = [['all','All'], ...Object.entries(TYPE).map(([k, v]) => [k, v.label])];
      el.innerHTML = pairs.map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); }));
    }
    function paintList() {
      const f = filtered();
      root.querySelector('#list').innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__icon">❒</div><div class="empty__title">No documents</div><div class="empty__msg">Drop your first link in.</div></div>`;
    }
    async function reload() { items = await DataStore.list(COLLECTION); root.querySelector('#stats-slot').innerHTML = renderStats(items); paintList(); }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

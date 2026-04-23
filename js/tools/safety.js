/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Safety
   Incidents, toolbox talks, "days since last".
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'safety';

  const KIND = {
    incident: { label: 'Incident', accent: 'red' },
    near_miss:{ label: 'Near miss', accent: 'amber' },
    toolbox:  { label: 'Toolbox talk', accent: 'electric' },
    audit:    { label: 'Audit', accent: 'blue' },
    training: { label: 'Training', accent: 'green' },
  };

  const STATUS = {
    open:     { label: 'Open',     accent: 'red' },
    investigating: { label: 'Investigating', accent: 'amber' },
    resolved: { label: 'Resolved', accent: 'green' },
    logged:   { label: 'Logged',   accent: 'muted' },
  };

  const SEED = [
    { id: 'sf_001', title: 'Near miss — ladder slip at Blue Oak', kind: 'near_miss', status: 'resolved', reporter: 'B. Castillo', occurredAt: new Date(Date.now() - 86400000 * 4).toISOString(), notes: 'Ladder footing on wet floor. Added rubber mat to SOP. Tailgated with crew.' },
    { id: 'sf_002', title: 'Toolbox — Arc Flash Refresher',      kind: 'toolbox',   status: 'logged',   reporter: 'Sarah O.',    occurredAt: new Date(Date.now() - 86400000 * 7).toISOString(), notes: 'All 5 crew members attended. Signed roster filed.' },
    { id: 'sf_003', title: 'Audit — PPE Inventory',               kind: 'audit',     status: 'resolved', reporter: 'Kaden D.',    occurredAt: new Date(Date.now() - 86400000 * 18).toISOString(), notes: 'Replaced 2 expired FR shirts. Ordered new lot.' },
    { id: 'sf_004', title: 'Incident — minor cut on #12 copper',  kind: 'incident',  status: 'investigating', reporter: 'M. Okafor', occurredAt: new Date(Date.now() - 86400000 * 1).toISOString(), notes: 'Small laceration. First aid on site. Reviewing glove spec.' },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const s of SEED) await DataStore.create(COLLECTION, s); }

  function renderCard(e) {
    const k = KIND[e.kind] || KIND.incident;
    const s = STATUS[e.status] || STATUS.open;
    return `
      <article class="card" data-accent="${k.accent}" data-id="${Atlas.safe(e.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(e.title)}</div>
            <div class="card__sub">${Atlas.safe(e.reporter)} · ${Atlas.fmt.datetime(e.occurredAt)}</div>
          </div>
          <div class="col col--gap-sm" style="align-items:flex-end">
            <span class="badge badge--${k.accent}">${Atlas.safe(k.label)}</span>
            <span class="badge badge--${s.accent}">${Atlas.safe(s.label)}</span>
          </div>
        </div>
        <div class="card__body">
          <p style="color:var(--ink-2);font-size:0.9rem;line-height:1.55">${Atlas.safe(e.notes || '')}</p>
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const incidents = items.filter(i => i.kind === 'incident');
    const lastIncident = incidents.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))[0];
    const daysSince = lastIncident ? Math.floor((Date.now() - new Date(lastIncident.occurredAt).getTime()) / 86400000) : 999;
    const open = items.filter(i => i.kind === 'incident' && i.status !== 'resolved').length;
    const toolbox = items.filter(i => i.kind === 'toolbox').length;
    return `
      <div class="stat-strip">
        <div class="stat stat--${daysSince >= 30 ? 'green' : daysSince >= 7 ? 'amber' : 'red'}">
          <span class="stat__label">Days since last incident</span>
          <span class="stat__value stat__value--${daysSince >= 30 ? 'green' : daysSince >= 7 ? 'amber' : 'red'}">${daysSince > 365 ? '365+' : daysSince}</span>
        </div>
        <div class="stat stat--red"><span class="stat__label">Open incidents</span><span class="stat__value stat__value--red">${open}</span></div>
        <div class="stat stat--electric"><span class="stat__label">Toolbox talks</span><span class="stat__value stat__value--electric">${toolbox}</span></div>
        <div class="stat"><span class="stat__label">All logs</span><span class="stat__value">${items.length}</span></div>
      </div>
    `;
  }

  function openModal(onSaved, session) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Log a <em>safety</em> entry</h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="field"><label class="field__label">Title</label><input class="input" name="title" required/></div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Kind</label><select class="select" name="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
          <div class="field"><label class="field__label">Status</label><select class="select" name="status"><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option><option value="logged" selected>Logged</option></select></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Reporter</label><input class="input" name="reporter" value="${Atlas.safe(session?.name || '')}" required/></div>
          <div class="field"><label class="field__label">When</label><input class="input" name="occurredAt" type="datetime-local" required/></div>
        </div>
        <div class="field"><label class="field__label">Notes</label><textarea class="textarea" name="notes"></textarea></div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Log</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('[name="occurredAt"]').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.occurredAt = new Date(d.occurredAt).toISOString();
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Logged', 'success'); onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('safety', async function (root, session) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';

    function filtered() {
      return items.filter(i => {
        if (filter !== 'all' && i.kind !== filter) return false;
        if (!query) return true;
        return (i.title + ' ' + i.reporter + ' ' + (i.notes || '')).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">▲ SAFETY</span><span>Incidents · toolbox</span></div>
            <h1 class="page-head__title">Keep the crew <em>home at night</em>.</h1>
            <p class="page-head__sub">Log it early, review it together. Every near-miss is a chance to not have an incident tomorrow.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Log entry</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search logs…" autocomplete="off"/></div>
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
      const pairs = [['all','All'], ...Object.entries(KIND).map(([k, v]) => [k, v.label])];
      el.innerHTML = pairs.map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); }));
    }
    function paintList() {
      const f = filtered();
      root.querySelector('#list').innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__icon">▲</div><div class="empty__title">No safety logs</div><div class="empty__msg">Log your first entry.</div></div>`;
    }
    async function reload() { items = await DataStore.list(COLLECTION); root.querySelector('#stats-slot').innerHTML = renderStats(items); paintList(); }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · CRM
   Pipeline and contacts — can convert leads into jobs.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'crm';

  const STAGE = {
    lead:      { label: 'Lead',       accent: 'muted' },
    qualified: { label: 'Qualified',  accent: 'blue' },
    quoted:    { label: 'Quoted',     accent: 'amber' },
    won:       { label: 'Won',        accent: 'green' },
    lost:      { label: 'Lost',       accent: 'red' },
    client:    { label: 'Client',     accent: 'electric' },
  };

  const SEED = [
    { id: 'c_001', company: 'Thompson Family',          contact: 'Rick Thompson', phone: '(713) 555-0181', email: 'rick@t-family.com', stage: 'client',    value: 12400, lastTouch: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'c_002', company: 'Greenfield Developers LLC',contact: 'Luisa Greenfield', phone: '(832) 555-0422', email: 'luisa@greenfield.dev', stage: 'won',       value: 86400, lastTouch: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'c_003', company: 'Blue Oak Medical Center',  contact: 'Dr. Sanjay Patel', phone: '(281) 555-0340', email: 'spatel@blueoak.health', stage: 'quoted',    value: 38500, lastTouch: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 'c_004', company: 'Martinez Residence',        contact: 'Carla Martinez', phone: '(713) 555-0677', email: 'cmartinez@gmail.com', stage: 'client',    value: 4800,  lastTouch: new Date(Date.now() - 86400000 * 6).toISOString() },
    { id: 'c_005', company: 'Rivera Auto Body',          contact: 'Jon Rivera', phone: '(713) 555-0910', email: 'ops@riveraauto.com', stage: 'qualified', value: 0,     lastTouch: new Date(Date.now() - 86400000 * 8).toISOString() },
    { id: 'c_006', company: 'Holden Logistics',          contact: 'Emma Holden', phone: '(832) 555-0144', email: 'ehold@holdenlog.com', stage: 'lead',      value: 0,     lastTouch: new Date(Date.now() - 86400000 * 14).toISOString() },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const c of SEED) await DataStore.create(COLLECTION, c); }

  function renderCard(c) {
    const s = STAGE[c.stage] || STAGE.lead;
    return `
      <article class="card" data-accent="${s.accent}" data-id="${Atlas.safe(c.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(c.company)}</div>
            <div class="card__sub">${Atlas.safe(c.contact)} · <span class="mono">${Atlas.safe(c.phone || '')}</span></div>
          </div>
          <div class="col col--gap-sm" style="align-items:flex-end">
            <span class="badge badge--${s.accent}">${Atlas.safe(s.label)}</span>
            <span class="mono tnum" style="font-size:0.95rem;color:var(--copper)">${Atlas.fmt.money(c.value || 0, { sign: true })}</span>
          </div>
        </div>
        <div class="card__meta">
          ${c.email ? `<span>${Atlas.safe(c.email)}</span>` : ''}
          <span style="margin-left:auto">Last touch ${Atlas.safe(Atlas.fmt.timeAgo(c.lastTouch))}</span>
          <button class="btn btn--sm" data-convert="${Atlas.safe(c.id)}">→ New job</button>
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const counts = Object.keys(STAGE).reduce((a, k) => { a[k] = items.filter(i => i.stage === k).length; return a; }, {});
    const pipeline = items.filter(i => ['qualified','quoted'].includes(i.stage)).reduce((a, i) => a + (i.value || 0), 0);
    return `
      <div class="stat-strip">
        <div class="stat"><span class="stat__label">Leads</span><span class="stat__value">${counts.lead || 0}</span></div>
        <div class="stat stat--amber"><span class="stat__label">Quoted</span><span class="stat__value stat__value--amber">${counts.quoted || 0}</span></div>
        <div class="stat stat--green"><span class="stat__label">Won</span><span class="stat__value stat__value--green">${counts.won || 0}</span></div>
        <div class="stat stat--electric"><span class="stat__label">Active pipeline</span><span class="stat__value stat__value--electric">${Atlas.fmt.money(pipeline)}</span></div>
      </div>
    `;
  }

  function openModal(onSaved) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Add a <em>contact</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="form-grid">
          <div class="field"><label class="field__label">Company</label><input class="input" name="company" required/></div>
          <div class="field"><label class="field__label">Contact name</label><input class="input" name="contact"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Phone</label><input class="input" name="phone"/></div>
          <div class="field"><label class="field__label">Email</label><input class="input" name="email" type="email"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Stage</label><select class="select" name="stage"><option value="lead">Lead</option><option value="qualified">Qualified</option><option value="quoted">Quoted</option><option value="won">Won</option><option value="client">Client</option><option value="lost">Lost</option></select></div>
          <div class="field"><label class="field__label">Est. value ($)</label><input class="input" name="value" type="number" step="1" min="0" value="0"/></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Add</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.value = Number(d.value) || 0;
      d.lastTouch = new Date().toISOString();
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Contact added', 'success'); onSaved && onSaved();
    });
  }

  async function convertToJob(contact) {
    await DataStore.create('jobs', {
      title: `New work — ${contact.company}`,
      client: contact.company,
      address: '',
      status: 'scheduled',
      priority: 'medium',
      crew: [],
      estimatedHours: 0,
      notes: `Converted from CRM · ${contact.contact || ''} · ${contact.phone || ''}`,
    });
    await DataStore.update(COLLECTION, contact.id, { stage: 'client', lastTouch: new Date().toISOString() });
    UI.toast('Job created from contact', 'success');
  }

  Atlas.registerRenderer('crm', async function (root) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';

    function filtered() {
      return items.filter(i => {
        if (filter !== 'all' && i.stage !== filter) return false;
        if (!query) return true;
        return (i.company + ' ' + (i.contact || '') + ' ' + (i.email || '') + ' ' + (i.phone || '')).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.lastTouch || 0) - new Date(a.lastTouch || 0));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">♁ CRM</span><span>Pipeline · contacts</span></div>
            <h1 class="page-head__title">Every lead, every <em>handshake</em>.</h1>
            <p class="page-head__sub">Move a lead from qualified → quoted → won, then convert straight into a job with one click.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Add contact</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search companies, contacts…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new').addEventListener('click', () => openModal(reload));
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['lead','Leads'],['qualified','Qualified'],['quoted','Quoted'],['won','Won'],['client','Clients']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); }));
    }
    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__icon">♁</div><div class="empty__title">No contacts</div><div class="empty__msg">Add your first lead.</div></div>`;
      listEl.querySelectorAll('[data-convert]').forEach(btn => btn.addEventListener('click', async () => {
        const c = items.find(x => x.id === btn.dataset.convert);
        if (!c) return;
        if (await UI.confirm('Convert to job?', `Create a scheduled job for "${c.company}" and mark them as a client.`)) convertToJob(c);
      }));
    }
    async function reload() { items = await DataStore.list(COLLECTION); root.querySelector('#stats-slot').innerHTML = renderStats(items); paintList(); }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

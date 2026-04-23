/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Invoicing
   Issue, track, and collect. Pulls clients from CRM + jobs.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'invoices';

  const STATUS = {
    draft:    { label: 'Draft',    accent: 'muted' },
    sent:     { label: 'Sent',     accent: 'blue' },
    overdue:  { label: 'Overdue',  accent: 'red' },
    paid:     { label: 'Paid',     accent: 'green' },
    voided:   { label: 'Voided',   accent: 'muted' },
  };

  const SEED = [
    { id: 'inv_001', number: '2026-0142', client: 'Thompson Family',           status: 'paid',    amount: 1480.00, issued: new Date(Date.now() - 86400000 * 14).toISOString().slice(0,10), due: new Date(Date.now() - 86400000 * 4).toISOString().slice(0,10),  jobId: 'job_005' },
    { id: 'inv_002', number: '2026-0143', client: 'Greenfield Developers LLC', status: 'sent',    amount: 12600.00,issued: new Date(Date.now() - 86400000 * 3).toISOString().slice(0,10),  due: new Date(Date.now() + 86400000 * 11).toISOString().slice(0,10), jobId: 'job_002' },
    { id: 'inv_003', number: '2026-0144', client: 'Rivera Auto Body',          status: 'overdue', amount: 2480.00, issued: new Date(Date.now() - 86400000 * 42).toISOString().slice(0,10), due: new Date(Date.now() - 86400000 * 12).toISOString().slice(0,10), jobId: 'job_003' },
    { id: 'inv_004', number: '2026-0145', client: 'Blue Oak Medical Center',   status: 'draft',   amount: 38500.00,issued: new Date().toISOString().slice(0,10),                           due: new Date(Date.now() + 86400000 * 30).toISOString().slice(0,10), jobId: 'job_004' },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const i of SEED) await DataStore.create(COLLECTION, i); }

  function renderCard(i) {
    const s = STATUS[i.status] || STATUS.draft;
    const daysPastDue = Math.floor((Date.now() - new Date(i.due).getTime()) / 86400000);
    const pastDue = i.status === 'overdue' ? daysPastDue : null;
    return `
      <article class="card" data-accent="${s.accent}" data-id="${Atlas.safe(i.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">Invoice <span class="mono">${Atlas.safe(i.number)}</span></div>
            <div class="card__sub">${Atlas.safe(i.client)}</div>
          </div>
          <div class="col col--gap-sm" style="align-items:flex-end">
            <span class="badge badge--${s.accent}">${Atlas.safe(s.label)}${pastDue && pastDue > 0 ? ` · ${pastDue}d` : ''}</span>
            <span class="mono tnum" style="font-size:1.15rem;color:var(--copper)">${Atlas.fmt.money(i.amount)}</span>
          </div>
        </div>
        <div class="card__meta">
          <span>Issued <strong>${Atlas.fmt.date(i.issued)}</strong></span>
          <span>Due <strong>${Atlas.fmt.date(i.due)}</strong></span>
          ${i.status !== 'paid' && i.status !== 'voided' ? `<button class="btn btn--sm" data-paid="${Atlas.safe(i.id)}" style="margin-left:auto">Mark paid</button>` : '<span style="margin-left:auto" class="badge badge--green">Settled</span>'}
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const openAmt = items.filter(i => ['sent','overdue','draft'].includes(i.status)).reduce((a, i) => a + (i.amount || 0), 0);
    const overdueAmt = items.filter(i => i.status === 'overdue').reduce((a, i) => a + (i.amount || 0), 0);
    const paidAmt = items.filter(i => i.status === 'paid').reduce((a, i) => a + (i.amount || 0), 0);

    const paidByDay = new Array(14).fill(0);
    const now = Date.now();
    items.filter(i => i.status === 'paid').forEach(i => {
      const t = new Date(i.issued || i.createdAt || 0).getTime();
      const idx = 13 - Math.floor((now - t) / 86400000);
      if (idx >= 0 && idx < 14) paidByDay[idx] += (i.amount || 0);
    });
    const paidCum = Atlas.cumulative(paidByDay);

    return `
      <div class="stat-strip">
        <div class="stat" data-filter="open-all"><span class="stat__label">Outstanding</span><span class="stat__value stat__value--copper">${Atlas.fmt.money(openAmt)}</span></div>
        <div class="stat stat--red" data-filter="overdue"><span class="stat__label">Overdue</span><span class="stat__value stat__value--red">${Atlas.fmt.money(overdueAmt)}</span></div>
        <div class="stat stat--green" data-filter="paid"><span class="stat__label">Collected</span><span class="stat__value stat__value--green">${Atlas.fmt.money(paidAmt)}</span><span class="stat__spark">${Atlas.sparkline(paidCum)}</span></div>
        <div class="stat"><span class="stat__label">Total invoices</span><span class="stat__value">${items.length}</span></div>
      </div>
    `;
  }

  async function openModal(onSaved) {
    const jobs = await DataStore.list('jobs').catch(() => []);
    const html = `
      <div class="modal__head"><h2 class="modal__title">New <em>invoice</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="form-grid">
          <div class="field"><label class="field__label">Invoice number</label><input class="input" name="number" required value="2026-${String(Math.floor(Math.random()*9000)+1000)}"/></div>
          <div class="field"><label class="field__label">Job (optional)</label>
            <select class="select" name="jobId"><option value="">— none —</option>${jobs.map(j => `<option value="${Atlas.safe(j.id)}">${Atlas.safe(j.title)} · ${Atlas.safe(j.client)}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Client</label><input class="input" name="client" required/></div>
          <div class="field"><label class="field__label">Amount ($)</label><input class="input" name="amount" type="number" step="0.01" min="0" required/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Issued</label><input class="input" name="issued" type="date" required value="${new Date().toISOString().slice(0,10)}"/></div>
          <div class="field"><label class="field__label">Due</label><input class="input" name="due" type="date" required value="${new Date(Date.now() + 30*86400000).toISOString().slice(0,10)}"/></div>
          <div class="field"><label class="field__label">Status</label><select class="select" name="status"><option value="draft">Draft</option><option value="sent">Sent</option></select></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Create</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    const sel = modal.querySelector('[name="jobId"]');
    sel.addEventListener('change', () => { const j = jobs.find(x => x.id === sel.value); if (j) modal.querySelector('[name="client"]').value = j.client; });
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.amount = Number(d.amount) || 0;
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Invoice created', 'success'); onSaved && onSaved();
    });
  }

  function openInvoiceDetail(inv) {
    const s = STATUS[inv.status] || STATUS.draft;
    Shell.openDetail({
      record: inv,
      collection: COLLECTION,
      eyebrow: 'Invoice · ' + inv.number,
      title: inv.client,
      subtitle: 'Invoice ' + inv.number,
      accent: s.accent,
      badges: [{ label: s.label, variant: s.accent }],
      fields: [
        { label: 'Invoice #', key: 'number' },
        { label: 'Status', key: 'status', type: 'select', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]) },
        { label: 'Amount', key: 'amount', type: 'money' },
        { label: 'Client', key: 'client' },
        { label: 'Job', value: inv.jobId ? inv.jobId : '—' },
        { label: 'Issued', key: 'issued', type: 'date' },
        { label: 'Due', key: 'due', type: 'date' },
      ],
      actions: [
        (inv.status !== 'paid' && inv.status !== 'voided') ? {
          id: 'paid', label: 'Mark paid', variant: 'primary',
          onClick: async (rec) => { await DataStore.update(COLLECTION, rec.id, { status: 'paid' }); Object.assign(rec, { status: 'paid' }); UI.toast('Marked paid', 'success'); },
        } : null,
        (inv.status === 'draft') ? {
          id: 'send', label: 'Send', variant: 'electric',
          onClick: async (rec) => { await DataStore.update(COLLECTION, rec.id, { status: 'sent' }); Object.assign(rec, { status: 'sent' }); UI.toast('Invoice sent', 'success'); },
        } : null,
      ].filter(Boolean),
    });
  }

  Atlas.registerRenderer('invoicing', async function (root, session) {
    await seed();
    let items = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));

    const canCreate = PermissionGuard.canCreate(session, COLLECTION);
    let query = '', filter = 'all';
    let syncStats;

    function filtered() {
      return items.filter(i => {
        if (filter === 'open-all' && !['sent','overdue','draft'].includes(i.status)) return false;
        if (filter !== 'all' && filter !== 'open-all' && i.status !== filter) return false;
        if (!query) return true;
        return (i.number + ' ' + i.client).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.issued) - new Date(a.issued));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">$ INVOICING</span><span>AR · live</span></div>
            <h1 class="page-head__title">Send it, <em>collect it</em>.</h1>
            <p class="page-head__sub">Track every dollar owed. Overdue invoices flag themselves and roll up to the Home dashboard.</p>
          </div>
          <div class="page-head__actions">${canCreate ? `<button class="btn btn--primary" id="new">${Atlas.ICONS.plus}New invoice</button>` : ''}</div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search invoices, clients…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new')?.addEventListener('click', () => openModal(reload));
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      root.querySelector('#list').addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        const card = e.target.closest('.card[data-id]');
        if (!card) return;
        const rec = items.find(i => i.id === card.dataset.id);
        if (rec) openInvoiceDetail(rec);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), {
        getFilter: () => filter,
        setFilter: (f) => { filter = f; paintChips(); paintList(); },
      });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['draft','Draft'],['sent','Sent'],['overdue','Overdue'],['paid','Paid']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }
    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__art">${Atlas.illustration('invoice')}</div><div class="empty__title">No invoices</div><div class="empty__msg">Create your first invoice.</div></div>`;
      listEl.querySelectorAll('[data-paid]').forEach(btn => btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await DataStore.update(COLLECTION, btn.dataset.paid, { status: 'paid' });
        UI.toast('Marked paid', 'success');
      }));
    }
    async function reload() {
      items = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));
      root.querySelector('#stats-slot').innerHTML = renderStats(items);
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintList();
    }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

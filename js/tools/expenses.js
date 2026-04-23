/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Expenses
   Receipts and reimbursements.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'expenses';

  const STATUS = {
    submitted: { label: 'Submitted', accent: 'blue' },
    approved:  { label: 'Approved',  accent: 'green' },
    reimbursed:{ label: 'Reimbursed',accent: 'electric' },
    rejected:  { label: 'Rejected',  accent: 'red' },
  };

  const SEED = [
    { id: 'e_001', vendor: 'Home Depot',        category: 'Materials', amount: 412.38, status: 'approved',  submittedBy: 'D. Reyes',  date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0,10), jobId: 'job_001' },
    { id: 'e_002', vendor: 'Shell (fuel)',      category: 'Fuel',      amount: 64.21,  status: 'submitted', submittedBy: 'T. Nguyen', date: new Date(Date.now() - 86400000 * 1).toISOString().slice(0,10), jobId: null },
    { id: 'e_003', vendor: 'Milwaukee',         category: 'Tools',     amount: 239.00, status: 'submitted', submittedBy: 'M. Okafor', date: new Date().toISOString().slice(0,10), jobId: null },
    { id: 'e_004', vendor: 'City of Houston',   category: 'Permit',    amount: 185.00, status: 'reimbursed',submittedBy: 'S. Ochoa',  date: new Date(Date.now() - 86400000 * 20).toISOString().slice(0,10), jobId: 'job_004' },
    { id: 'e_005', vendor: 'Whataburger',       category: 'Meals',     amount: 48.10,  status: 'rejected',  submittedBy: 'B. Castillo',date: new Date(Date.now() - 86400000 * 8).toISOString().slice(0,10), jobId: null },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const x of SEED) await DataStore.create(COLLECTION, x); }

  function renderCard(e) {
    const s = STATUS[e.status] || STATUS.submitted;
    return `
      <article class="card" data-accent="${s.accent}" data-id="${Atlas.safe(e.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(e.vendor)}</div>
            <div class="card__sub">${Atlas.safe(e.category)} · ${Atlas.safe(e.submittedBy)} · ${Atlas.fmt.date(e.date)}</div>
          </div>
          <div class="col col--gap-sm" style="align-items:flex-end">
            <span class="badge badge--${s.accent}">${Atlas.safe(s.label)}</span>
            <span class="mono tnum" style="font-size:1.1rem;color:var(--copper)">${Atlas.fmt.money(e.amount)}</span>
          </div>
        </div>
        ${e.status === 'submitted' ? `
          <div class="card__meta">
            <button class="btn btn--sm" data-approve="${Atlas.safe(e.id)}">Approve</button>
            <button class="btn btn--sm btn--ghost" data-reject="${Atlas.safe(e.id)}">Reject</button>
          </div>
        ` : ''}
      </article>
    `;
  }

  function renderStats(items) {
    const total = items.reduce((a, i) => a + (i.amount || 0), 0);
    const pending = items.filter(i => i.status === 'submitted').reduce((a, i) => a + i.amount, 0);
    const approved = items.filter(i => i.status === 'approved').reduce((a, i) => a + i.amount, 0);
    const thisMonth = items.filter(i => (i.date || '').slice(0, 7) === new Date().toISOString().slice(0, 7)).reduce((a, i) => a + i.amount, 0);
    return `
      <div class="stat-strip">
        <div class="stat stat--electric" data-filter="submitted"><span class="stat__label">Pending</span><span class="stat__value stat__value--electric">${Atlas.fmt.money(pending)}</span></div>
        <div class="stat stat--green" data-filter="approved"><span class="stat__label">Approved</span><span class="stat__value stat__value--green">${Atlas.fmt.money(approved)}</span></div>
        <div class="stat"><span class="stat__label">This month</span><span class="stat__value stat__value--copper">${Atlas.fmt.money(thisMonth)}</span></div>
        <div class="stat"><span class="stat__label">All time</span><span class="stat__value">${Atlas.fmt.money(total)}</span></div>
      </div>
    `;
  }

  function openExpenseDetail(e) {
    const s = STATUS[e.status] || STATUS.submitted;
    Shell.openDetail({
      record: e,
      collection: COLLECTION,
      eyebrow: 'Expense',
      title: e.vendor,
      subtitle: e.category + ' · ' + e.submittedBy,
      accent: s.accent,
      badges: [{ label: s.label, variant: s.accent }],
      fields: [
        { label: 'Vendor', key: 'vendor' },
        { label: 'Amount', key: 'amount', type: 'money' },
        { label: 'Category', key: 'category', type: 'select', options: [['Materials','Materials'],['Fuel','Fuel'],['Tools','Tools'],['Permit','Permit'],['Meals','Meals'],['Other','Other']] },
        { label: 'Submitted by', key: 'submittedBy' },
        { label: 'Date', key: 'date', type: 'date' },
        { label: 'Status', key: 'status', type: 'select', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]) },
        { label: 'Job link', value: e.jobId || '—' },
      ],
      actions: [
        e.status === 'submitted' ? { id: 'approve', label: 'Approve', variant: 'primary', onClick: async (rec) => { await DataStore.update(COLLECTION, rec.id, { status: 'approved' }); Object.assign(rec, { status: 'approved' }); UI.toast('Approved', 'success'); } } : null,
        e.status === 'submitted' ? { id: 'reject', label: 'Reject', variant: 'ghost', onClick: async (rec) => { await DataStore.update(COLLECTION, rec.id, { status: 'rejected' }); Object.assign(rec, { status: 'rejected' }); UI.toast('Rejected', 'info'); } } : null,
        e.status === 'approved' ? { id: 'reimburse', label: 'Mark reimbursed', variant: 'primary', onClick: async (rec) => { await DataStore.update(COLLECTION, rec.id, { status: 'reimbursed' }); Object.assign(rec, { status: 'reimbursed' }); UI.toast('Reimbursed', 'success'); } } : null,
      ].filter(Boolean),
    });
  }

  function openModal(onSaved, session) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Submit an <em>expense</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="form-grid">
          <div class="field"><label class="field__label">Vendor</label><input class="input" name="vendor" required/></div>
          <div class="field"><label class="field__label">Amount ($)</label><input class="input" name="amount" type="number" step="0.01" min="0" required/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Category</label><select class="select" name="category"><option>Materials</option><option>Fuel</option><option>Tools</option><option>Permit</option><option>Meals</option><option>Other</option></select></div>
          <div class="field"><label class="field__label">Date</label><input class="input" name="date" type="date" required value="${new Date().toISOString().slice(0,10)}"/></div>
        </div>
        <div class="form-grid form-grid--full">
          <div class="field"><label class="field__label">Submitted by</label><input class="input" name="submittedBy" value="${Atlas.safe(session?.name || '')}" required/></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Submit</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.amount = Number(d.amount) || 0;
      d.status = 'submitted';
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Expense submitted', 'success'); onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('expenses', async function (root, session) {
    await seed();
    let items = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));

    const canCreate = PermissionGuard.canCreate(session, COLLECTION);
    let query = '', filter = 'all';
    let syncStats;

    function filtered() {
      return items.filter(i => {
        if (filter !== 'all' && i.status !== filter) return false;
        if (!query) return true;
        return (i.vendor + ' ' + i.category + ' ' + i.submittedBy).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">⬇ EXPENSES</span><span>Receipts · reimb.</span></div>
            <h1 class="page-head__title">Every <em>receipt</em>, accounted for.</h1>
            <p class="page-head__sub">The crew submits, the office approves, the books close clean.</p>
          </div>
          <div class="page-head__actions">${canCreate ? `<button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Submit</button>` : ''}</div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search vendors, categories, names…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new')?.addEventListener('click', () => openModal(reload, session));
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      root.querySelector('#list').addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        const card = e.target.closest('.card[data-id]');
        if (!card) return;
        const rec = items.find(i => i.id === card.dataset.id);
        if (rec) openExpenseDetail(rec);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['submitted','Pending'],['approved','Approved'],['reimbursed','Reimbursed'],['rejected','Rejected']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }
    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__art">${Atlas.illustration('doc')}</div><div class="empty__title">No expenses</div><div class="empty__msg">Submit your first receipt.</div></div>`;
      listEl.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', async (e) => { e.stopPropagation(); await DataStore.update(COLLECTION, b.dataset.approve, { status: 'approved' }); UI.toast('Approved', 'success'); }));
      listEl.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', async (e) => { e.stopPropagation(); await DataStore.update(COLLECTION, b.dataset.reject, { status: 'rejected' }); UI.toast('Rejected', 'info'); }));
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

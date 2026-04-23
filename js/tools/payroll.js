/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Payroll
   Pay periods + live hours from the Time Clock.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'payroll';

  const STATUS = {
    open:    { label: 'Open',    accent: 'electric' },
    pending: { label: 'Pending', accent: 'amber' },
    paid:    { label: 'Paid',    accent: 'green' },
  };

  const now = new Date();
  const fmtD = (d) => new Date(d).toISOString().slice(0, 10);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  const SEED = [
    { id: 'pp_001', label: 'Pay Period #014', start: fmtD(addDays(now, -28)), end: fmtD(addDays(now, -15)), status: 'paid',    gross: 24816.40, employees: 5, payDate: fmtD(addDays(now, -12)) },
    { id: 'pp_002', label: 'Pay Period #015', start: fmtD(addDays(now, -14)), end: fmtD(addDays(now, -1)),  status: 'pending', gross: 26430.12, employees: 5, payDate: fmtD(addDays(now, 2)) },
    { id: 'pp_003', label: 'Pay Period #016', start: fmtD(now),               end: fmtD(addDays(now, 13)),  status: 'open',    gross: 0,        employees: 5, payDate: fmtD(addDays(now, 16)) },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const p of SEED) await DataStore.create(COLLECTION, p); }

  function renderCard(p) {
    const s = STATUS[p.status] || STATUS.open;
    return `
      <article class="card" data-accent="${s.accent}" data-id="${Atlas.safe(p.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(p.label)}</div>
            <div class="card__sub">${Atlas.fmt.date(p.start)} → ${Atlas.fmt.date(p.end)} · <span class="mono">Pay ${Atlas.fmt.date(p.payDate)}</span></div>
          </div>
          <div class="col col--gap-sm" style="align-items:flex-end">
            <span class="badge badge--${s.accent}">${Atlas.safe(s.label)}</span>
            <span class="mono tnum" style="font-size:1.2rem;color:var(--copper)">${Atlas.fmt.money(p.gross || 0)}</span>
          </div>
        </div>
        <div class="card__meta">
          <span>EMPLOYEES: <strong>${p.employees || 0}</strong></span>
          ${p.status === 'pending' ? `<button class="btn btn--sm" style="margin-left:auto" data-pay="${Atlas.safe(p.id)}">Mark paid</button>` : ''}
        </div>
      </article>
    `;
  }

  async function renderStats(items) {
    // Live hours from time clock
    let liveHours = 0, liveGross = 0;
    try {
      const clocks = await DataStore.list('clock_entries');
      const payRate = 42; // Flat demo rate per hour
      const onClock = clocks.filter(c => c.status === 'in');
      for (const c of onClock) liveHours += Math.max(0, (Date.now() - new Date(c.clockIn).getTime()) / 3600000);
      liveGross = liveHours * payRate;
    } catch {}

    const nextPay = items.find(p => p.status === 'pending');
    const mtdGross = items.filter(p => p.status === 'paid' && new Date(p.payDate).getMonth() === new Date().getMonth()).reduce((a, p) => a + (p.gross || 0), 0);
    return `
      <div class="stat-strip">
        <div class="stat stat--electric" data-filter="open"><span class="stat__label">Hours on clock NOW</span><span class="stat__value stat__value--electric">${liveHours.toFixed(1)}</span></div>
        <div class="stat"><span class="stat__label">Live gross estimate</span><span class="stat__value stat__value--copper">${Atlas.fmt.money(liveGross)}</span></div>
        <div class="stat stat--amber" data-filter="pending"><span class="stat__label">Next pay</span><span class="stat__value stat__value--amber" style="font-size:1.2rem">${nextPay ? Atlas.fmt.money(nextPay.gross) : '—'}</span></div>
        <div class="stat stat--green" data-filter="paid"><span class="stat__label">Paid (month)</span><span class="stat__value stat__value--green">${Atlas.fmt.money(mtdGross)}</span></div>
      </div>
    `;
  }

  function openPeriodDetail(p) {
    const s = STATUS[p.status] || STATUS.open;
    Shell.openDetail({
      record: p,
      collection: COLLECTION,
      eyebrow: 'Pay period',
      title: p.label,
      subtitle: Atlas.fmt.date(p.start) + ' → ' + Atlas.fmt.date(p.end),
      accent: s.accent,
      badges: [{ label: s.label, variant: s.accent }],
      fields: [
        { label: 'Label', key: 'label' },
        { label: 'Start', key: 'start', type: 'date' },
        { label: 'End', key: 'end', type: 'date' },
        { label: 'Pay date', key: 'payDate', type: 'date' },
        { label: 'Employees', key: 'employees', type: 'number' },
        { label: 'Gross', key: 'gross', type: 'money' },
        { label: 'Status', key: 'status', type: 'select', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]) },
      ],
      actions: [
        p.status === 'pending' ? { id: 'pay', label: 'Mark paid', variant: 'primary', onClick: async (rec) => { await DataStore.update(COLLECTION, rec.id, { status: 'paid' }); Object.assign(rec, { status: 'paid' }); UI.toast('Period closed', 'success'); } } : null,
        p.status === 'open' ? { id: 'lock', label: 'Lock → Pending', variant: 'primary', onClick: async (rec) => { await DataStore.update(COLLECTION, rec.id, { status: 'pending' }); Object.assign(rec, { status: 'pending' }); UI.toast('Period locked', 'success'); } } : null,
      ].filter(Boolean),
    });
  }

  Atlas.registerRenderer('payroll', async function (root, session) {
    await seed();
    let items = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));

    const canCreate = PermissionGuard.canCreate(session, COLLECTION);
    let query = '', filter = 'all';
    let syncStats;

    function filtered() {
      return items.filter(p => {
        if (filter !== 'all' && p.status !== filter) return false;
        if (!query) return true;
        return (p.label || '').toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.end) - new Date(a.end));
    }

    async function paintShell() {
      const stats = await renderStats(items);
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">⚖ PAYROLL</span><span>Pay periods · live</span></div>
            <h1 class="page-head__title">Hours in, <em>dollars out</em>.</h1>
            <p class="page-head__sub">Clock entries flow right into the period that's open. When you're ready, approve and pay.</p>
          </div>
        </header>
        <div id="stats-slot">${stats}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search periods…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      root.querySelector('#list').addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        const card = e.target.closest('.card[data-id]');
        if (!card) return;
        const rec = items.find(i => i.id === card.dataset.id);
        if (rec) openPeriodDetail(rec);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['open','Open'],['pending','Pending'],['paid','Paid']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }
    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__icon">⚖</div><div class="empty__title">No pay periods</div><div class="empty__msg">Periods appear once you start clocking hours.</div></div>`;
      listEl.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', async (e) => { e.stopPropagation(); await DataStore.update(COLLECTION, b.dataset.pay, { status: 'paid' }); UI.toast('Period closed', 'success'); }));
    }
    async function reload() {
      items = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));
      root.querySelector('#stats-slot').innerHTML = await renderStats(items);
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintList();
    }
    Atlas.onData(COLLECTION, reload);
    Atlas.onData('clock_entries', reload);
    // Re-render live hours every 30s
    setInterval(async () => { if (document.body.contains(root)) { root.querySelector('#stats-slot').innerHTML = await renderStats(items); } }, 30000);
    await paintShell();
  });
})();

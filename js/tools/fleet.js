/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Fleet
   Vehicle roster and service.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'fleet';

  const STATUS = {
    active: { label: 'Active', accent: 'green' },
    service: { label: 'In service', accent: 'amber' },
    out: { label: 'Out of service', accent: 'red' },
    spare: { label: 'Spare', accent: 'muted' },
  };

  const SEED = [
    { id: 'v_001', vehicle: '2023 Ford Transit 250', unit: 'AMCO-01', vin: '1FTBR1Y86NKA12345', driver: 'D. Reyes',   mileage: 38421, plate: 'TX-ELC-01', status: 'active',  nextService: new Date(Date.now() + 20 * 86400000).toISOString().slice(0,10) },
    { id: 'v_002', vehicle: '2022 Ram ProMaster 2500', unit: 'AMCO-02', vin: '3C6URVJG0NE123456', driver: 'M. Okafor',  mileage: 52108, plate: 'TX-ELC-02', status: 'active',  nextService: new Date(Date.now() + 4 * 86400000).toISOString().slice(0,10) },
    { id: 'v_003', vehicle: '2021 Chevy Express 3500', unit: 'AMCO-03', vin: '1GCZGDFG2M1234567', driver: 'T. Nguyen',  mileage: 64902, plate: 'TX-ELC-03', status: 'service', nextService: new Date().toISOString().slice(0,10) },
    { id: 'v_004', vehicle: '2020 Ford F-250',         unit: 'AMCO-04', vin: '1FT7W2B64LEA87654', driver: null,         mileage: 71300, plate: 'TX-ELC-04', status: 'spare',   nextService: new Date(Date.now() + 45 * 86400000).toISOString().slice(0,10) },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const v of SEED) await DataStore.create(COLLECTION, v); }

  function renderCard(v) {
    const s = STATUS[v.status] || STATUS.active;
    const daysToService = Math.floor((new Date(v.nextService) - Date.now()) / 86400000);
    const svcAccent = daysToService < 0 ? 'red' : daysToService < 7 ? 'amber' : 'green';
    return `
      <article class="card" data-accent="${s.accent}" data-id="${Atlas.safe(v.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(v.vehicle)}</div>
            <div class="card__sub"><strong class="mono">${Atlas.safe(v.unit)}</strong> · ${Atlas.safe(v.plate || '—')} · VIN <span class="mono">${Atlas.safe((v.vin || '').slice(-6))}</span></div>
          </div>
          <span class="badge badge--${s.accent}">${Atlas.safe(s.label)}</span>
        </div>
        <div class="card__meta">
          <span>DRIVER: <strong>${Atlas.safe(v.driver || 'Unassigned')}</strong></span>
          <span>MILEAGE: <strong class="mono tnum">${Atlas.fmt.num(v.mileage)}</strong></span>
          <span class="badge badge--${svcAccent}" style="margin-left:auto">Service ${daysToService < 0 ? 'overdue' : 'in ' + daysToService + 'd'}</span>
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const active = items.filter(i => i.status === 'active').length;
    const service = items.filter(i => i.status === 'service').length;
    const out = items.filter(i => i.status === 'out').length;
    const totalMi = items.reduce((a, v) => a + (Number(v.mileage) || 0), 0);
    return `
      <div class="stat-strip">
        <div class="stat stat--green" data-filter="active"><span class="stat__label">Active</span><span class="stat__value stat__value--green">${active}</span></div>
        <div class="stat stat--amber" data-filter="service"><span class="stat__label">In service</span><span class="stat__value stat__value--amber">${service}</span></div>
        <div class="stat stat--red" data-filter="out"><span class="stat__label">Out</span><span class="stat__value stat__value--red">${out}</span></div>
        <div class="stat stat--electric"><span class="stat__label">Fleet miles</span><span class="stat__value stat__value--electric">${Atlas.fmt.num(totalMi)}</span></div>
      </div>
    `;
  }

  function openVehicleDetail(v) {
    const s = STATUS[v.status] || STATUS.active;
    Shell.openDetail({
      record: v,
      collection: COLLECTION,
      eyebrow: 'Vehicle · ' + (v.unit || v.id),
      title: v.vehicle,
      subtitle: (v.plate || '—') + ' · ' + (v.driver || 'Unassigned'),
      accent: s.accent,
      badges: [{ label: s.label, variant: s.accent }],
      fields: [
        { label: 'Vehicle', key: 'vehicle' },
        { label: 'Unit #', key: 'unit' },
        { label: 'VIN', key: 'vin' },
        { label: 'Plate', key: 'plate' },
        { label: 'Driver', key: 'driver' },
        { label: 'Mileage', key: 'mileage', type: 'number' },
        { label: 'Status', key: 'status', type: 'select', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]) },
        { label: 'Next service', key: 'nextService', type: 'date' },
      ],
    });
  }

  function openModal(onSaved) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Add a <em>vehicle</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="form-grid">
          <div class="field"><label class="field__label">Vehicle</label><input class="input" name="vehicle" required placeholder="Year Make Model"/></div>
          <div class="field"><label class="field__label">Unit #</label><input class="input" name="unit" required placeholder="AMCO-##"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">VIN</label><input class="input" name="vin"/></div>
          <div class="field"><label class="field__label">Plate</label><input class="input" name="plate"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Driver</label><input class="input" name="driver"/></div>
          <div class="field"><label class="field__label">Mileage</label><input class="input" name="mileage" type="number" min="0" value="0"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Status</label><select class="select" name="status"><option value="active">Active</option><option value="service">In service</option><option value="out">Out</option><option value="spare">Spare</option></select></div>
          <div class="field"><label class="field__label">Next service</label><input class="input" name="nextService" type="date"/></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Add</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.mileage = Number(d.mileage) || 0;
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Vehicle added', 'success'); onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('fleet', async function (root, session) {
    await seed();
    let items = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));

    const canCreate = PermissionGuard.canCreate(session, COLLECTION);
    let query = '', filter = 'all';
    let syncStats;

    function filtered() {
      return items.filter(v => {
        if (filter !== 'all' && v.status !== filter) return false;
        if (!query) return true;
        return (v.vehicle + ' ' + v.unit + ' ' + (v.driver || '') + ' ' + (v.plate || '') + ' ' + (v.vin || '')).toLowerCase().includes(query.toLowerCase());
      });
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">▨ FLEET</span><span>Vehicle roster</span></div>
            <h1 class="page-head__title">Every truck, every <em>service interval</em>.</h1>
            <p class="page-head__sub">Unit numbers, drivers, mileage, next service — all in one place, updated live.</p>
          </div>
          <div class="page-head__actions">${canCreate ? `<button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Add vehicle</button>` : ''}</div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search vehicles, drivers, plates…" autocomplete="off"/></div>
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
        if (rec) openVehicleDetail(rec);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['active','Active'],['service','In service'],['spare','Spare'],['out','Out']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }
    function paintList() {
      const f = filtered();
      root.querySelector('#list').innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__art">${Atlas.illustration('truck')}</div><div class="empty__title">No vehicles</div><div class="empty__msg">Add your first truck to get started.</div></div>`;
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

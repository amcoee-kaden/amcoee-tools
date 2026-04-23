/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Tool Tracker
   Shop assets — who has what, where.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'tool_assets';

  const STATUS = {
    available: { label: 'Available', accent: 'green' },
    checked_out: { label: 'Checked out', accent: 'amber' },
    maintenance: { label: 'Maintenance', accent: 'blue' },
    lost: { label: 'Lost', accent: 'red' },
  };

  const SEED = [
    { id: 'tool_001', asset: 'Milwaukee M18 Hammer Drill',       serial: 'MW-3721',  category: 'Drill',    status: 'checked_out', checkedOutTo: 'D. Reyes',  since: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'tool_002', asset: 'Klein Tools Wire Stripper',        serial: 'KL-0984',  category: 'Hand',     status: 'available',  checkedOutTo: null, since: null },
    { id: 'tool_003', asset: 'Fluke 87V Digital Multimeter',     serial: 'FL-87-221',category: 'Meter',    status: 'checked_out', checkedOutTo: 'M. Okafor', since: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'tool_004', asset: 'Greenlee 855 Bender',              serial: 'GR-1102',  category: 'Bender',   status: 'available',  checkedOutTo: null, since: null },
    { id: 'tool_005', asset: 'Makita XGT Rotary Hammer',         serial: 'MK-XG-88', category: 'Drill',    status: 'maintenance', checkedOutTo: null, since: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'tool_006', asset: 'Klein Non-Contact Voltage Tester', serial: 'KL-NCV-6', category: 'Meter',    status: 'lost',       checkedOutTo: 'Last seen with T. Nguyen', since: new Date(Date.now() - 86400000 * 12).toISOString() },
  ];

  async function seed() {
    const existing = await DataStore.list(COLLECTION);
    if (existing.length) return;
    for (const a of SEED) await DataStore.create(COLLECTION, a);
  }

  function renderCard(a) {
    const s = STATUS[a.status] || STATUS.available;
    return `
      <article class="card" data-accent="${s.accent}" data-id="${Atlas.safe(a.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(a.asset)}</div>
            <div class="card__sub"><span class="mono">${Atlas.safe(a.serial || '—')}</span> · ${Atlas.safe(a.category)}</div>
          </div>
          <span class="badge badge--${s.accent}">${Atlas.safe(s.label)}</span>
        </div>
        <div class="card__meta">
          ${a.checkedOutTo ? `<span>WITH <strong>${Atlas.safe(a.checkedOutTo)}</strong></span>` : '<span>In shop</span>'}
          ${a.since ? `<span style="margin-left:auto">${Atlas.safe(Atlas.fmt.timeAgo(a.since))}</span>` : ''}
          ${a.status === 'checked_out' ? `<button class="btn btn--sm" data-return="${Atlas.safe(a.id)}">Mark returned</button>` : ''}
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const count = (st) => items.filter(i => i.status === st).length;
    return `
      <div class="stat-strip">
        <div class="stat stat--green"><span class="stat__label">Available</span><span class="stat__value stat__value--green">${count('available')}</span></div>
        <div class="stat stat--amber"><span class="stat__label">Checked out</span><span class="stat__value stat__value--amber">${count('checked_out')}</span></div>
        <div class="stat"><span class="stat__label">Maintenance</span><span class="stat__value">${count('maintenance')}</span></div>
        <div class="stat stat--red"><span class="stat__label">Lost / missing</span><span class="stat__value stat__value--red">${count('lost')}</span></div>
      </div>
    `;
  }

  function openModal(onSaved) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Add an <em>asset</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="field"><label class="field__label">Asset name</label><input class="input" name="asset" required/></div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Serial</label><input class="input" name="serial"/></div>
          <div class="field"><label class="field__label">Category</label><input class="input" name="category" placeholder="Drill, Meter, Hand, …"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Status</label><select class="select" name="status"><option value="available">Available</option><option value="checked_out">Checked out</option><option value="maintenance">Maintenance</option><option value="lost">Lost</option></select></div>
          <div class="field"><label class="field__label">Checked out to</label><input class="input" name="checkedOutTo" placeholder="Name (if applicable)"/></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Add asset</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html);
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      if (d.status === 'checked_out' && !d.since) d.since = new Date().toISOString();
      await DataStore.create(COLLECTION, d);
      close();
      UI.toast('Asset added', 'success');
      onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('tools', async function (root) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';

    function filtered() {
      return items.filter(i => {
        if (filter !== 'all' && i.status !== filter) return false;
        if (!query) return true;
        return (i.asset + ' ' + (i.serial || '') + ' ' + (i.checkedOutTo || '') + ' ' + i.category).toLowerCase().includes(query.toLowerCase());
      });
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">✦ TOOLS</span><span>Shop asset ledger</span></div>
            <h1 class="page-head__title">Know where <em>every tool</em> is.</h1>
            <p class="page-head__sub">Who checked it out, when, and whether it's back. Lose fewer drills; bill with confidence.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Add asset</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search assets, serials, who has it…" autocomplete="off"/></div>
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
      el.innerHTML = [['all','All'],['available','Available'],['checked_out','Checked out'],['maintenance','Maintenance'],['lost','Lost']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); }));
    }
    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__icon">✦</div><div class="empty__title">No assets</div><div class="empty__msg">Add your first tool to start tracking.</div></div>`;
      listEl.querySelectorAll('[data-return]').forEach(btn => btn.addEventListener('click', async () => {
        await DataStore.update(COLLECTION, btn.dataset.return, { status: 'available', checkedOutTo: null, since: null });
        UI.toast('Returned to shop', 'success');
      }));
    }
    async function reload() { items = await DataStore.list(COLLECTION); root.querySelector('#stats-slot').innerHTML = renderStats(items); paintChips(); paintList(); }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

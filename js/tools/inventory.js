/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Inventory
   Materials and consumables. Low-stock alerts cross to Home KPIs.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'inventory';

  const SEED = [
    { id: 'inv_001', item: '12 AWG THHN (Black)',          unit: 'ft',  stock: 1800, threshold: 500, category: 'Wire',      location: 'Rack A2', sku: 'W-12T-BK' },
    { id: 'inv_002', item: '12 AWG THHN (White)',          unit: 'ft',  stock: 320,  threshold: 500, category: 'Wire',      location: 'Rack A2', sku: 'W-12T-WH' },
    { id: 'inv_003', item: '200A Square D QO Panel',       unit: 'ea',  stock: 4,    threshold: 2,   category: 'Panel',     location: 'Rack D1', sku: 'P-QO200' },
    { id: 'inv_004', item: '½" EMT Conduit',               unit: 'ft',  stock: 260,  threshold: 200, category: 'Conduit',   location: 'Rack B3', sku: 'C-EMT-0.5' },
    { id: 'inv_005', item: 'Leviton 20A Decora Receptacle',unit: 'ea',  stock: 64,   threshold: 40,  category: 'Device',    location: 'Bin C1', sku: 'D-DEC-20A' },
    { id: 'inv_006', item: '#6 Bare Copper Ground',        unit: 'ft',  stock: 0,    threshold: 100, category: 'Wire',      location: 'Rack A4', sku: 'W-6-GND' },
    { id: 'inv_007', item: '4/0 Al SER Cable',             unit: 'ft',  stock: 120,  threshold: 50,  category: 'Wire',      location: 'Rack A5', sku: 'W-4/0-SER' },
  ];

  async function seed() {
    const existing = await DataStore.list(COLLECTION);
    if (existing.length) return;
    for (const i of SEED) await DataStore.create(COLLECTION, i);
  }

  function level(i) {
    if (i.stock === 0) return { label: 'Out', accent: 'red' };
    if (i.stock <= i.threshold) return { label: 'Low', accent: 'amber' };
    return { label: 'OK', accent: 'green' };
  }

  function renderCard(i) {
    const l = level(i);
    const pct = i.threshold > 0 ? Math.min(100, Math.round((i.stock / (i.threshold * 2)) * 100)) : 100;
    return `
      <article class="card" data-accent="${l.accent}" data-id="${Atlas.safe(i.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(i.item)}</div>
            <div class="card__sub"><span class="mono">${Atlas.safe(i.sku || '—')}</span> · ${Atlas.safe(i.category)} · ${Atlas.safe(i.location)}</div>
          </div>
          <span class="badge badge--${l.accent}">${Atlas.safe(l.label)}</span>
        </div>
        <div class="card__body">
          <div class="row" style="gap:0.85rem">
            <span class="mono tnum" style="font-size:1.25rem;color:var(--ink)"><strong>${Atlas.fmt.num(i.stock)}</strong> <span class="mute-2" style="font-size:0.7rem">${Atlas.safe(i.unit)}</span></span>
            <span class="mute-2" style="font-size:0.72rem">threshold ${Atlas.fmt.num(i.threshold)}</span>
            <div style="flex:1;height:4px;background:var(--surface-3);border-radius:2px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:var(--${l.accent === 'green' ? 'signal-green' : l.accent === 'amber' ? 'signal-amber' : 'signal-red'});"></div>
            </div>
          </div>
        </div>
        <div class="card__meta">
          <button class="btn btn--sm" data-adj="${Atlas.safe(i.id)}" data-dir="down">− Pull</button>
          <button class="btn btn--sm" data-adj="${Atlas.safe(i.id)}" data-dir="up">+ Receive</button>
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const out = items.filter(i => i.stock === 0).length;
    const low = items.filter(i => i.stock > 0 && i.stock <= i.threshold).length;
    const total = items.reduce((a, i) => a + (Number(i.stock) || 0), 0);
    return `
      <div class="stat-strip">
        <div class="stat"><span class="stat__label">Line items</span><span class="stat__value">${items.length}</span></div>
        <div class="stat stat--amber"><span class="stat__label">Low stock</span><span class="stat__value stat__value--amber">${low}</span></div>
        <div class="stat stat--red"><span class="stat__label">Out of stock</span><span class="stat__value stat__value--red">${out}</span></div>
        <div class="stat stat--electric"><span class="stat__label">Total units</span><span class="stat__value stat__value--electric">${Atlas.fmt.num(total)}</span></div>
      </div>
    `;
  }

  function openModal(onSaved) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">New <em>inventory</em> line</h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="field"><label class="field__label">Item</label><input class="input" name="item" required/></div>
        <div class="form-grid">
          <div class="field"><label class="field__label">SKU</label><input class="input" name="sku"/></div>
          <div class="field"><label class="field__label">Category</label><input class="input" name="category"/></div>
          <div class="field"><label class="field__label">Location</label><input class="input" name="location"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Stock</label><input class="input" name="stock" type="number" min="0" value="0"/></div>
          <div class="field"><label class="field__label">Unit</label><input class="input" name="unit" value="ea"/></div>
          <div class="field"><label class="field__label">Low-stock threshold</label><input class="input" name="threshold" type="number" min="0" value="10"/></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Add</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.stock = Number(d.stock) || 0; d.threshold = Number(d.threshold) || 0;
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Added', 'success'); onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('inventory', async function (root) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';

    function filtered() {
      return items.filter(i => {
        if (filter === 'low' && !(i.stock > 0 && i.stock <= i.threshold)) return false;
        if (filter === 'out' && i.stock !== 0) return false;
        if (!query) return true;
        return (i.item + ' ' + (i.sku || '') + ' ' + i.category + ' ' + i.location).toLowerCase().includes(query.toLowerCase());
      });
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">▣ INVENTORY</span><span>Materials ledger</span></div>
            <h1 class="page-head__title">Always know <em>what's on the shelf</em>.</h1>
            <p class="page-head__sub">Pull, receive, and watch thresholds. Low stock lights up the Home dashboard the moment it happens.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Add line</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search items, SKUs, location…" autocomplete="off"/></div>
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
      el.innerHTML = [['all','All'],['low','Low stock'],['out','Out']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); }));
    }
    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__art">${Atlas.illustration('box')}</div><div class="empty__title">No items</div><div class="empty__msg">${query ? 'No matches.' : 'Add your first line to get started.'}</div></div>`;
      listEl.querySelectorAll('[data-adj]').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.adj;
        const item = items.find(x => x.id === id); if (!item) return;
        const delta = btn.dataset.dir === 'up' ? 1 : -1;
        const amt = prompt(`${btn.dataset.dir === 'up' ? 'Receive' : 'Pull'} how many ${item.unit}?`, '1');
        if (!amt) return;
        const next = Math.max(0, (item.stock || 0) + delta * (Number(amt) || 0));
        await DataStore.update(COLLECTION, id, { stock: next });
        UI.toast(`${btn.dataset.dir === 'up' ? 'Received' : 'Pulled'} ${amt} ${item.unit}`, 'success');
      }));
    }
    async function reload() { items = await DataStore.list(COLLECTION); root.querySelector('#stats-slot').innerHTML = renderStats(items); paintList(); }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

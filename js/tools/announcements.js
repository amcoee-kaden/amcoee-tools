/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Announcements
   Team memos and briefings.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'announcements';

  const PRIORITY = {
    info:    { label: 'Info',    accent: 'electric' },
    notice:  { label: 'Notice',  accent: 'blue' },
    urgent:  { label: 'Urgent',  accent: 'red' },
    praise:  { label: 'Praise',  accent: 'green' },
  };

  const SEED = [
    { id: 'a_001', title: 'Shop closed Friday 5/3 — staff development day', author: 'Jeremy Silva', body: 'We\'ll be running a half-day training at the warehouse. If you\'re on an active job, Mike will reach out with coverage. Expense meals as normal.', priority: 'notice', postedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
    { id: 'a_002', title: 'Company record: Greenfield Developers multi-house deal', author: 'Jeremy Silva', body: 'Big win for the crew. This pushes our Q2 to +38% over last year. Coffee + donuts on Monday morning. Thank you.', priority: 'praise', postedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'a_003', title: 'New PPE rule — arc-rated gloves on 480V panels', author: 'Sarah Ochoa', body: 'Effective immediately. Gloves are in the supply room; check them out through Tool Tracker. Any questions, see Sarah.', priority: 'urgent', postedAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const a of SEED) await DataStore.create(COLLECTION, a); }

  function renderCard(a) {
    const p = PRIORITY[a.priority] || PRIORITY.info;
    return `
      <article class="card" data-accent="${p.accent}" data-id="${Atlas.safe(a.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(a.title)}</div>
            <div class="card__sub">${Atlas.safe(a.author)} · ${Atlas.fmt.timeAgo(a.postedAt)}</div>
          </div>
          <span class="badge badge--${p.accent}">${Atlas.safe(p.label)}</span>
        </div>
        <div class="card__body">
          <p style="color:var(--ink-2);font-size:0.95rem;line-height:1.6">${Atlas.safe(a.body)}</p>
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const thisWeek = items.filter(a => Date.now() - new Date(a.postedAt).getTime() < 7 * 86400000).length;
    const urgent = items.filter(a => a.priority === 'urgent').length;
    return `
      <div class="stat-strip">
        <div class="stat"><span class="stat__label">All memos</span><span class="stat__value">${items.length}</span></div>
        <div class="stat stat--electric" data-filter="week"><span class="stat__label">This week</span><span class="stat__value stat__value--electric">${thisWeek}</span></div>
        <div class="stat stat--red" data-filter="urgent"><span class="stat__label">Urgent</span><span class="stat__value stat__value--red">${urgent}</span></div>
      </div>
    `;
  }

  function openMemoDetail(a) {
    const p = PRIORITY[a.priority] || PRIORITY.info;
    Shell.openDetail({
      record: a,
      collection: COLLECTION,
      eyebrow: 'Memo',
      title: a.title,
      subtitle: a.author + ' · ' + Atlas.fmt.timeAgo(a.postedAt),
      accent: p.accent,
      badges: [{ label: p.label, variant: p.accent }],
      fields: [
        { label: 'Title', key: 'title' },
        { label: 'Priority', key: 'priority', type: 'select', options: Object.entries(PRIORITY).map(([k, v]) => [k, v.label]) },
        { label: 'Author', key: 'author' },
        { label: 'Posted', value: Atlas.fmt.datetime(a.postedAt) },
        { label: 'Body', key: 'body', type: 'longtext' },
      ],
    });
  }

  function openModal(onSaved, session) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Post an <em>announcement</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="field"><label class="field__label">Title</label><input class="input" name="title" required/></div>
        <div class="field"><label class="field__label">Body</label><textarea class="textarea" name="body" required></textarea></div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Priority</label><select class="select" name="priority"><option value="info">Info</option><option value="notice" selected>Notice</option><option value="urgent">Urgent</option><option value="praise">Praise</option></select></div>
          <div class="field"><label class="field__label">Author</label><input class="input" name="author" value="${Atlas.safe(session?.name || '')}" required/></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Post</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      d.postedAt = new Date().toISOString();
      await DataStore.create(COLLECTION, d);
      close(); UI.toast('Posted', 'success'); onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('announcements', async function (root, session) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';
    let syncStats;

    function filtered() {
      return items.filter(a => {
        if (filter === 'week' && Date.now() - new Date(a.postedAt).getTime() > 7 * 86400000) return false;
        if (filter !== 'all' && filter !== 'week' && a.priority !== filter) return false;
        if (!query) return true;
        return (a.title + ' ' + a.body + ' ' + a.author).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">✎ MEMO</span><span>Team briefings</span></div>
            <h1 class="page-head__title">What the whole team <em>needs to know</em>.</h1>
            <p class="page-head__sub">Shop-wide messages from Jeremy and the office. Read it here or on your phone.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Post</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search memos…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new').addEventListener('click', () => openModal(reload, session));
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      root.querySelector('#list').addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        const card = e.target.closest('.card[data-id]');
        if (!card) return;
        const rec = items.find(i => i.id === card.dataset.id);
        if (rec) openMemoDetail(rec);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['urgent','Urgent'],['notice','Notice'],['info','Info'],['praise','Praise']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }
    function paintList() {
      const f = filtered();
      root.querySelector('#list').innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__icon">✎</div><div class="empty__title">No memos</div><div class="empty__msg">Post your first message.</div></div>`;
    }
    async function reload() {
      items = await DataStore.list(COLLECTION);
      root.querySelector('#stats-slot').innerHTML = renderStats(items);
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintList();
    }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

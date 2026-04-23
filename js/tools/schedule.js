/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Schedule
   Dispatch board. Syncs with jobs + employees.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'schedule';
  const today = () => new Date().toISOString().slice(0,10);
  const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0,10); };

  const SEED = [
    { id: 's_001', title: '200A Panel Upgrade',   jobId: 'job_001', date: today(),          start: '07:00', end: '15:00', crew: ['D. Reyes', 'M. Okafor'], location: '4821 Elm Creek Dr', status: 'confirmed' },
    { id: 's_002', title: 'HVAC Wiring',           jobId: 'job_002', date: plus(today(), 1), start: '07:30', end: '17:30', crew: ['T. Nguyen', 'B. Castillo', 'L. Webb'], location: '902 Pinebrook Cir', status: 'confirmed' },
    { id: 's_003', title: 'Emergency — Rivera Auto', jobId: 'job_003', date: today(),       start: '14:00', end: '18:00', crew: ['D. Reyes'], location: '1107 Industrial Pkwy', status: 'confirmed' },
    { id: 's_004', title: 'LED Retrofit (Night)',  jobId: 'job_004', date: plus(today(), 2), start: '20:00', end: '04:00', crew: ['B. Castillo'], location: '330 Medical Plaza Dr', status: 'tentative' },
    { id: 's_005', title: 'EV Charger Install',    jobId: 'job_005', date: plus(today(), 3), start: '09:00', end: '12:00', crew: ['M. Okafor'], location: '128 Maplewood Ln', status: 'tentative' },
  ];

  async function seed() {
    const existing = await DataStore.list(COLLECTION);
    if (existing.length) return;
    for (const s of SEED) await DataStore.create(COLLECTION, s);
  }

  const STATUS = {
    confirmed: { label: 'Confirmed', accent: 'green' },
    tentative: { label: 'Tentative', accent: 'amber' },
    canceled:  { label: 'Canceled',  accent: 'muted' },
  };

  function renderCard(s) {
    const cfg = STATUS[s.status] || STATUS.confirmed;
    const crew = Array.isArray(s.crew) ? s.crew : [];
    return `
      <article class="card" data-accent="${cfg.accent}" data-id="${Atlas.safe(s.id)}">
        <div class="card__row">
          <div class="row" style="align-items:center;gap:1.1rem">
            <div style="font-family:var(--font-display);font-style:italic;font-size:2.25rem;line-height:1;color:var(--copper)">${Atlas.escapeHTML(new Date(s.date).getDate())}</div>
            <div style="font-family:var(--font-mono);font-size:0.65rem;letter-spacing:0.16em;text-transform:uppercase;color:var(--ink-4);line-height:1.3">
              ${Atlas.escapeHTML(new Date(s.date).toLocaleDateString('en-US', { month: 'short' }))}<br/>
              ${Atlas.escapeHTML(new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }))}
            </div>
            <div>
              <div class="card__title">${Atlas.safe(s.title)}</div>
              <div class="card__sub">${Atlas.safe(s.location)} · <span class="mono">${Atlas.safe(s.start)} – ${Atlas.safe(s.end)}</span></div>
            </div>
          </div>
          <span class="badge badge--${cfg.accent}">${Atlas.safe(cfg.label)}</span>
        </div>
        <div class="card__meta">
          <span>CREW:</span>
          ${crew.map(c => `<span class="badge badge--muted">${Atlas.safe(c)}</span>`).join('') || '<span class="mute-2">Unassigned</span>'}
        </div>
      </article>
    `;
  }

  function renderStats(items) {
    const t = today();
    const todayCount = items.filter(s => s.date === t).length;
    const weekCount = items.filter(s => { const dd = new Date(s.date); const now = new Date(); return dd >= now && (dd - now) <= 7 * 86400000; }).length;
    const tentative = items.filter(s => s.status === 'tentative').length;
    return `
      <div class="stat-strip">
        <div class="stat" data-filter="today"><span class="stat__label">Today</span><span class="stat__value stat__value--copper">${todayCount}</span></div>
        <div class="stat stat--electric" data-filter="week"><span class="stat__label">Next 7 days</span><span class="stat__value stat__value--electric">${weekCount}</span></div>
        <div class="stat stat--amber" data-filter="tentative"><span class="stat__label">Tentative</span><span class="stat__value stat__value--amber">${tentative}</span></div>
        <div class="stat"><span class="stat__label">Total scheduled</span><span class="stat__value">${items.length}</span></div>
      </div>
    `;
  }

  function openEntryDetail(s) {
    const st = STATUS[s.status] || STATUS.confirmed;
    Shell.openDetail({
      record: s,
      collection: COLLECTION,
      eyebrow: 'Schedule',
      title: s.title,
      subtitle: s.location + ' · ' + s.start + ' → ' + s.end,
      accent: st.accent,
      badges: [{ label: st.label, variant: st.accent }],
      fields: [
        { label: 'Title', key: 'title' },
        { label: 'Date', key: 'date', type: 'date' },
        { label: 'Start', key: 'start', type: 'time' },
        { label: 'End', key: 'end', type: 'time' },
        { label: 'Location', key: 'location' },
        { label: 'Crew', key: 'crew', type: 'tags' },
        { label: 'Status', key: 'status', type: 'select', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]) },
        { label: 'Job link', value: s.jobId || '—' },
      ],
    });
  }

  async function openModal(onSaved) {
    const jobs = await DataStore.list('jobs').catch(() => []);
    const html = `
      <div class="modal__head">
        <h2 class="modal__title">Schedule a <em>dispatch</em></h2>
        <button class="modal__close" data-action="close">${Atlas.ICONS.close}</button>
      </div>
      <form class="modal__body" id="f">
        <div class="form-grid form-grid--full">
          <div class="field"><label class="field__label">Job / title</label>
            <select class="select" name="jobId" id="jobSel">
              <option value="">— none (free-form) —</option>
              ${jobs.map(j => `<option value="${Atlas.safe(j.id)}">${Atlas.safe(j.title)} · ${Atlas.safe(j.client || '')}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label class="field__label">Title override</label><input class="input" name="title" placeholder="(optional) override"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Date</label><input class="input" name="date" type="date" required value="${today()}"/></div>
          <div class="field"><label class="field__label">Start</label><input class="input" name="start" type="time" required value="07:00"/></div>
          <div class="field"><label class="field__label">End</label><input class="input" name="end" type="time" required value="15:00"/></div>
        </div>
        <div class="field"><label class="field__label">Location</label><input class="input" name="location" placeholder="Site address"/></div>
        <div class="field"><label class="field__label">Crew (comma-separated)</label><input class="input" name="crew"/></div>
        <div class="field"><label class="field__label">Status</label>
          <select class="select" name="status"><option value="confirmed">Confirmed</option><option value="tentative">Tentative</option></select>
        </div>
        <div class="modal__foot">
          <button type="button" class="btn btn--ghost" data-action="close">Cancel</button>
          <button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Schedule</button>
        </div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    const sel = modal.querySelector('#jobSel');
    sel.addEventListener('change', () => {
      const j = jobs.find(x => x.id === sel.value);
      if (j) {
        modal.querySelector('[name="title"]').placeholder = j.title;
        if (j.address) modal.querySelector('[name="location"]').value = j.address;
        if (Array.isArray(j.crew)) modal.querySelector('[name="crew"]').value = j.crew.join(', ');
      }
    });
    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const d = Object.fromEntries(fd);
      d.crew = String(d.crew || '').split(',').map(s => s.trim()).filter(Boolean);
      if (!d.title && d.jobId) { const j = jobs.find(x => x.id === d.jobId); if (j) d.title = j.title; }
      await DataStore.create(COLLECTION, d);
      close();
      UI.toast('Scheduled', 'success');
      onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('schedule', async function (root) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';
    let syncStats;

    function filtered() {
      return items.filter(s => {
        if (filter === 'today' && s.date !== today()) return false;
        if (filter === 'week' && new Date(s.date) - new Date() > 7 * 86400000) return false;
        if (filter === 'tentative' && s.status !== 'tentative') return false;
        if (!query) return true;
        return (s.title + ' ' + s.location + ' ' + (s.crew || []).join(' ')).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(a.date + 'T' + a.start) - new Date(b.date + 'T' + b.start));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">◉ SCHEDULE</span><span>Dispatch board</span></div>
            <h1 class="page-head__title">Who's where, <em>when</em>.</h1>
            <p class="page-head__sub">Connect a job to a crew and a clock, and the whole system lines up.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Schedule</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search titles, sites, crew…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new').addEventListener('click', () => openModal(reload));
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      root.querySelector('#list').addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        const card = e.target.closest('.card[data-id]');
        if (!card) return;
        const rec = items.find(i => i.id === card.dataset.id);
        if (rec) openEntryDetail(rec);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['today','Today'],['week','This week'],['tentative','Tentative']].map(([k, label]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${label}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }
    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__art">${Atlas.illustration('calendar')}</div><div class="empty__title">Nothing scheduled</div><div class="empty__msg">${query ? 'No matches.' : 'Add a dispatch to kick off the week.'}</div></div>`;
    }
    async function reload() {
      items = await DataStore.list(COLLECTION);
      root.querySelector('#stats-slot').innerHTML = renderStats(items);
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintChips(); paintList();
    }
    Atlas.onData(COLLECTION, reload);
    paintShell();
  });
})();

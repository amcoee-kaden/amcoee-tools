/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Jobs
   Work board. Cross-syncs with schedule, timeclock, invoicing, crm.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'jobs';

  const STATUS = {
    urgent:      { label: 'Urgent',      accent: 'red' },
    in_progress: { label: 'In Progress', accent: 'amber' },
    scheduled:   { label: 'Scheduled',   accent: 'blue' },
    completed:   { label: 'Completed',   accent: 'green' },
    invoiced:    { label: 'Invoiced',    accent: 'muted' },
  };
  const STATUS_ORDER = ['scheduled', 'in_progress', 'completed', 'invoiced'];

  const PRIORITY = {
    critical: { label: 'Critical', dot: 'red' },
    high:     { label: 'High',     dot: 'amber' },
    medium:   { label: 'Medium',   dot: 'blue' },
    low:      { label: 'Low',      dot: 'green' },
  };

  const SEED = [
    { id: 'job_001', title: '200A Panel Upgrade', client: 'Martinez Residence', address: '4821 Elm Creek Dr, Houston, TX 77084', status: 'in_progress', priority: 'high', crew: ['D. Reyes', 'M. Okafor'], estimatedHours: 8, notes: 'Replace 100A Zinsco panel with 200A Square D. Verify grounding rod and bond.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString() },
    { id: 'job_002', title: 'HVAC Electrical Wiring — New Build', client: 'Greenfield Developers LLC', address: '902 Pinebrook Cir, Katy, TX 77494', status: 'scheduled', priority: 'medium', crew: ['T. Nguyen', 'B. Castillo', 'L. Webb'], estimatedHours: 14, notes: 'Wire 3-ton Lennox split system + dedicated 240V 30A circuit.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
    { id: 'job_003', title: 'Emergency No-Power — Total Loss', client: 'Rivera Auto Body', address: '1107 Industrial Pkwy, Pasadena, TX 77501', status: 'urgent', priority: 'critical', crew: ['D. Reyes'], estimatedHours: 4, notes: 'Tripped main breaker, suspected service entrance fault. Utility notified. Business down.', createdAt: new Date(Date.now() - 1000 * 60 * 43).toISOString() },
    { id: 'job_004', title: 'Commercial Lighting Retrofit', client: 'Blue Oak Medical Center', address: '330 Medical Plaza Dr, Sugar Land, TX 77479', status: 'scheduled', priority: 'low', crew: ['B. Castillo'], estimatedHours: 22, notes: 'Retrofit 68 troffers to LED. Night shift.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
    { id: 'job_005', title: 'EV Charger Install — Tesla Wall Connector', client: 'Thompson Family', address: '128 Maplewood Ln, The Woodlands, TX 77380', status: 'completed', priority: 'medium', crew: ['M. Okafor'], estimatedHours: 3, notes: 'NEMA 14-50 240V, 60A breaker. Complete with load calc.', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  ];

  async function seed() {
    const existing = await DataStore.list(COLLECTION);
    if (existing.length) return;
    for (const j of SEED) await DataStore.create(COLLECTION, j);
  }

  function renderBadge(status) {
    const s = STATUS[status] || STATUS.scheduled;
    return `<span class="badge badge--${s.accent}">${Atlas.safe(s.label)}</span>`;
  }

  function renderCard(job) {
    const pr = PRIORITY[job.priority] || PRIORITY.medium;
    const s = STATUS[job.status] || STATUS.scheduled;
    const crew = Array.isArray(job.crew) ? job.crew : [];
    return `
      <article class="card" data-accent="${s.accent}" data-id="${Atlas.safe(job.id)}">
        <div class="card__row">
          <div class="row" style="align-items:flex-start">
            <span class="dot dot--${pr.dot} dot--pulse" style="margin-top:8px" title="${Atlas.safe(pr.label)} priority"></span>
            <div>
              <div class="card__title">${Atlas.safe(job.title)}</div>
              <div class="card__sub">${Atlas.safe(job.client)} · <span class="mute-2">${Atlas.safe(job.address)}</span></div>
            </div>
          </div>
          ${renderBadge(job.status)}
        </div>
        <div class="card__meta">
          <span>CREW:</span>
          ${crew.map(c => `<span class="badge badge--muted">${Atlas.safe(c)}</span>`).join('') || '<span class="mute-2">Unassigned</span>'}
          <span style="margin-left:auto">EST <strong>${Atlas.safe(String(job.estimatedHours || 0))}h</strong></span>
          <span>${Atlas.safe(Atlas.fmt.timeAgo(job.createdAt))}</span>
        </div>
      </article>
    `;
  }

  function renderStats(jobs) {
    const count = (st) => jobs.filter(j => j.status === st).length;
    const buckets = Atlas.bucketByDay(jobs, 14);
    const data = [
      { label: 'Urgent',      value: count('urgent'),      accent: 'red',      filter: 'urgent',      spark: false },
      { label: 'In Progress', value: count('in_progress'), accent: 'amber',    filter: 'in_progress', spark: false },
      { label: 'Scheduled',   value: count('scheduled'),   accent: 'electric', filter: 'scheduled',   spark: true  },
      { label: 'Completed',   value: count('completed'),   accent: 'green',    filter: 'completed',   spark: true  },
    ];
    return `
      <div class="stat-strip">
        ${data.map(d => `
          <div class="stat stat--${d.accent}" data-filter="${d.filter}">
            <div class="stat__accent" style="width:${Math.min(100, d.value * 20)}%"></div>
            <span class="stat__label">${d.label}</span>
            <span class="stat__value stat__value--${d.accent}">${d.value}</span>
            ${d.spark ? `<span class="stat__spark">${Atlas.sparkline(buckets)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function openNewJobModal(onSaved) {
    const html = `
      <div class="modal__head">
        <h2 class="modal__title">New <em>job</em></h2>
        <button class="modal__close" data-action="close">${Atlas.ICONS.close}</button>
      </div>
      <form class="modal__body" id="new-job-form">
        <div class="form-grid form-grid--full">
          <div class="field"><label class="field__label">Title</label><input class="input" name="title" required placeholder="e.g. Service upgrade at…"/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Client</label><input class="input" name="client" required placeholder="Client name"/></div>
          <div class="field"><label class="field__label">Priority</label>
            <select class="select" name="priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
          </div>
        </div>
        <div class="field"><label class="field__label">Address</label><input class="input" name="address" placeholder="Site address"/></div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Status</label>
            <select class="select" name="status"><option value="scheduled">Scheduled</option><option value="urgent">Urgent</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select>
          </div>
          <div class="field"><label class="field__label">Estimated hours</label><input class="input" name="estimatedHours" type="number" step="0.5" min="0" value="4"/></div>
        </div>
        <div class="field"><label class="field__label">Crew (comma-separated)</label><input class="input" name="crew" placeholder="D. Reyes, M. Okafor"/></div>
        <div class="field"><label class="field__label">Notes</label><textarea class="textarea" name="notes"></textarea></div>
        <div class="modal__foot">
          <button type="button" class="btn btn--ghost" data-action="close">Cancel</button>
          <button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Create job</button>
        </div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#new-job-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.crew = String(data.crew || '').split(',').map(s => s.trim()).filter(Boolean);
      data.estimatedHours = Number(data.estimatedHours) || 0;
      await DataStore.create(COLLECTION, data);
      close();
      UI.toast('Job created', 'success');
      onSaved && onSaved();
    });
  }

  function openJobDetail(job, session) {
    const s = STATUS[job.status] || STATUS.scheduled;
    const pr = PRIORITY[job.priority] || PRIORITY.medium;
    Shell.openDetail({
      record: job,
      collection: COLLECTION,
      canEdit: PermissionGuard.canEdit(session, COLLECTION, job),
      canDelete: PermissionGuard.canDelete(session, COLLECTION, job),
      eyebrow: 'Job · ' + (job.id || ''),
      title: job.title,
      subtitle: job.client + (job.address ? ' · ' + job.address : ''),
      accent: s.accent,
      badges: [
        { label: s.label, variant: s.accent },
        { label: pr.label + ' priority', variant: pr.dot },
      ],
      fields: [
        { label: 'Status', key: 'status', type: 'select', options: Object.entries(STATUS).map(([k, v]) => [k, v.label]) },
        { label: 'Priority', key: 'priority', type: 'select', options: Object.entries(PRIORITY).map(([k, v]) => [k, v.label]) },
        { label: 'Est. hours', key: 'estimatedHours', type: 'number', step: 0.5 },
        { label: 'Crew', key: 'crew', type: 'tags' },
        { label: 'Client', key: 'client' },
        { label: 'Address', key: 'address' },
        { label: 'Notes', key: 'notes', type: 'longtext' },
        { label: 'Created', value: Atlas.fmt.datetime(job.createdAt) },
      ],
      actions: [
        (job.status !== 'completed' && job.status !== 'invoiced') ? {
          id: 'advance', label: 'Advance status', variant: 'primary',
          onClick: async (rec) => {
            const idx = STATUS_ORDER.indexOf(rec.status);
            const next = idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : 'completed';
            await DataStore.update(COLLECTION, rec.id, { status: next });
            Object.assign(rec, { status: next });
            UI.toast('Status → ' + STATUS[next].label, 'success');
          },
        } : null,
        (job.status === 'completed') ? {
          id: 'invoice', label: 'Send to Invoicing', variant: 'electric',
          onClick: async (rec) => {
            await DataStore.create('invoices', {
              number: '2026-' + String(Math.floor(Math.random()*9000)+1000),
              client: rec.client,
              status: 'draft',
              amount: Math.round((rec.estimatedHours || 0) * 120 * 100) / 100,
              issued: new Date().toISOString().slice(0,10),
              due: new Date(Date.now() + 30*86400000).toISOString().slice(0,10),
              jobId: rec.id,
            });
            await DataStore.update(COLLECTION, rec.id, { status: 'invoiced' });
            Object.assign(rec, { status: 'invoiced' });
            UI.toast('Invoice drafted and linked', 'success');
          },
        } : null,
      ].filter(Boolean),
    });
  }

  Atlas.registerRenderer('jobs', async function (root, session) {
    await seed();
    let jobs = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));
    let query = '', filter = 'all';
    let syncStats;

    const canCreate = PermissionGuard.canCreate(session, COLLECTION);

    const order = { urgent: 0, in_progress: 1, scheduled: 2, completed: 3, invoiced: 4 };
    const sorted = () => jobs.slice().sort((a, b) => {
      const so = (order[a.status] ?? 9) - (order[b.status] ?? 9);
      if (so) return so;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    function filtered() {
      return sorted().filter(j => {
        if (filter !== 'all' && j.status !== filter) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return (j.title + ' ' + j.client + ' ' + j.address + ' ' + (j.crew || []).join(' ')).toLowerCase().includes(q);
      });
    }

    function listHTML() {
      const f = filtered();
      if (!f.length) return `
        <div class="empty">
          <div class="empty__art">${Atlas.illustration('jobs')}</div>
          <div class="empty__title">${query ? 'No matches' : 'The board is clear'}</div>
          <div class="empty__msg">${query ? 'Try a different search or clear the filters.' : 'Add your first job and get the crew moving.'}</div>
        </div>`;
      return f.map(renderCard).join('');
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric">
              <span class="page-head__rubric-chip">▤ JOBS</span>
              <span>Work board · live</span>
            </div>
            <h1 class="page-head__title">Every job <em>on the wall</em>.</h1>
            <p class="page-head__sub">The board all crews read from. Sort by status, flag urgency, and push a completed job straight to invoicing.</p>
          </div>
          <div class="page-head__actions">
            ${canCreate ? `<button class="btn btn--primary" id="new-job">${Atlas.ICONS.plus}New job</button>` : ''}
          </div>
        </header>
        <div id="stats-slot">${renderStats(jobs)}</div>
        <div class="toolbar">
          <div class="toolbar__search">
            ${Atlas.ICONS.search}
            <input type="search" id="search" placeholder="Search jobs, clients, crew…" autocomplete="off"/>
          </div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      const newBtn = root.querySelector('#new-job');
      if (newBtn) newBtn.addEventListener('click', () => openNewJobModal(reload));
      root.querySelector('#search').addEventListener('input', (e) => { query = e.target.value; paintList(); });
      root.querySelector('#list').addEventListener('click', (e) => {
        if (e.target.closest('button, a')) return;
        const card = e.target.closest('.card[data-id]');
        if (!card) return;
        const rec = jobs.find(j => j.id === card.dataset.id);
        if (rec) openJobDetail(rec, session);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), {
        getFilter: () => filter,
        setFilter: (f) => { filter = f; paintChips(); paintList(); },
      });
      paintChips();
      paintList();
    }

    function paintChips() {
      const chipsEl = root.querySelector('#chips');
      chipsEl.innerHTML = ['all','urgent','in_progress','scheduled','completed','invoiced'].map(k => {
        const n = k === 'all' ? jobs.length : jobs.filter(j => j.status === k).length;
        const label = k === 'all' ? 'All' : (STATUS[k]?.label || k);
        return `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${Atlas.safe(label)}<span class="chip__count">${n}</span></button>`;
      }).join('');
      chipsEl.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }

    function paintList() {
      root.querySelector('#list').innerHTML = listHTML();
    }

    async function reload() {
      jobs = PermissionGuard.filterByCanView(session, COLLECTION, await DataStore.list(COLLECTION));
      root.querySelector('#stats-slot').innerHTML = renderStats(jobs);
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), {
        getFilter: () => filter,
        setFilter: (f) => { filter = f; paintChips(); paintList(); },
      });
      paintChips();
      paintList();
    }

    Atlas.onData(COLLECTION, reload);

    paintShell();
  });
})();

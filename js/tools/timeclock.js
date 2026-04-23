/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Time Clock
   Clocks crew in/out, feeds payroll live.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'clock_entries';
  const today = () => new Date().toISOString().slice(0,10);

  const SEED = [
    { id: 'clk_001', employee: 'Mike Torres',  clockIn: today() + 'T06:45:00', clockOut: null, status: 'in' },
    { id: 'clk_002', employee: 'Sarah Ochoa',  clockIn: today() + 'T08:00:00', clockOut: null, status: 'in' },
    { id: 'clk_003', employee: 'James Bell',   clockIn: today() + 'T07:15:00', clockOut: null, status: 'in' },
    { id: 'clk_004', employee: 'Dana Clark',   clockIn: today() + 'T08:05:00', clockOut: today() + 'T12:02:00', status: 'out' },
  ];

  async function seed() {
    const existing = await DataStore.list(COLLECTION);
    if (existing.length) return;
    for (const e of SEED) await DataStore.create(COLLECTION, e);
  }

  function hoursBetween(a, b) {
    const end = b ? new Date(b) : new Date();
    return (end - new Date(a)) / 3600000;
  }

  function renderCard(e) {
    const elapsed = hoursBetween(e.clockIn, e.clockOut);
    const late = new Date(e.clockIn).getHours() >= 8;
    return `
      <article class="card" data-accent="${e.status === 'in' ? 'green' : 'muted'}" data-id="${Atlas.safe(e.id)}">
        <div class="card__row">
          <div>
            <div class="card__title">${Atlas.safe(e.employee)}</div>
            <div class="card__sub">Clocked ${e.status === 'in' ? 'in' : 'out'}${late ? ' · <span class="mute-2">started after 8:00</span>' : ''}</div>
          </div>
          <span class="badge badge--${e.status === 'in' ? 'green' : 'muted'}">${e.status === 'in' ? 'ON CLOCK' : 'OFF'}</span>
        </div>
        <div class="card__meta">
          <span>IN <strong>${Atlas.safe(Atlas.fmt.time(e.clockIn))}</strong></span>
          ${e.clockOut ? `<span>OUT <strong>${Atlas.safe(Atlas.fmt.time(e.clockOut))}</strong></span>` : ''}
          <span style="margin-left:auto" class="mono tnum">${Atlas.fmt.hours(elapsed)}</span>
          ${e.status === 'in' ? `<button class="btn btn--sm" data-clock-out="${Atlas.safe(e.id)}">Clock out</button>` : ''}
        </div>
      </article>
    `;
  }

  function renderStats(entries) {
    const onClock = entries.filter(e => e.status === 'in').length;
    const hoursToday = entries.reduce((a, e) => a + hoursBetween(e.clockIn, e.clockOut), 0);
    const late = entries.filter(e => new Date(e.clockIn).getHours() >= 8).length;
    // Hours by day for last 14 days
    const hoursByDay = new Array(14).fill(0);
    const now = Date.now();
    entries.forEach(e => {
      const t = new Date(e.clockIn || 0).getTime();
      const idx = 13 - Math.floor((now - t) / 86400000);
      if (idx >= 0 && idx < 14) hoursByDay[idx] += hoursBetween(e.clockIn, e.clockOut);
    });

    return `
      <div class="stat-strip">
        <div class="stat stat--green">
          <div class="stat__accent" style="width:${Math.min(100, onClock * 20)}%"></div>
          <span class="stat__label">On the clock</span>
          <span class="stat__value stat__value--green">${onClock}</span>
        </div>
        <div class="stat stat--electric">
          <div class="stat__accent" style="width:${Math.min(100, hoursToday * 2)}%"></div>
          <span class="stat__label">Hours today</span>
          <span class="stat__value stat__value--electric">${hoursToday.toFixed(1)}</span>
          <span class="stat__spark">${Atlas.sparkline(hoursByDay)}</span>
        </div>
        <div class="stat stat--amber">
          <span class="stat__label">Late starts</span>
          <span class="stat__value stat__value--amber">${late}</span>
        </div>
        <div class="stat">
          <span class="stat__label">Total entries</span>
          <span class="stat__value">${entries.length}</span>
        </div>
      </div>
    `;
  }

  function openClockInModal(onSaved) {
    const users = (Auth.getUsers() || []).filter(u => u.status === 'active');
    const html = `
      <div class="modal__head">
        <h2 class="modal__title">Clock <em>someone in</em></h2>
        <button class="modal__close" data-action="close">${Atlas.ICONS.close}</button>
      </div>
      <form class="modal__body" id="clock-in-form">
        <div class="field">
          <label class="field__label">Employee</label>
          <select class="select" name="employee" required>
            ${users.map(u => `<option value="${Atlas.safe(u.name)}">${Atlas.safe(u.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label class="field__label">Start time</label><input class="input" name="clockIn" type="datetime-local" required/></div>
        <div class="modal__foot">
          <button type="button" class="btn btn--ghost" data-action="close">Cancel</button>
          <button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Clock in</button>
        </div>
      </form>
    `;
    const { modal, close } = UI.showModal(html);
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('input[name="clockIn"]').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    modal.querySelector('#clock-in-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      await DataStore.create(COLLECTION, { employee: data.employee, clockIn: new Date(data.clockIn).toISOString(), clockOut: null, status: 'in' });
      close();
      UI.toast('Clocked in', 'success');
      onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('timeclock', async function (root) {
    await seed();
    let entries = await DataStore.list(COLLECTION);
    let query = '', statusFilter = 'all';

    function filtered() {
      return entries.filter(e => {
        if (statusFilter !== 'all' && e.status !== statusFilter) return false;
        if (!query) return true;
        return e.employee.toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">◴ TIME</span><span>Live punch clock</span></div>
            <h1 class="page-head__title">Who's <em>on the clock</em>.</h1>
            <p class="page-head__sub">Feeds hours straight into payroll. Any clock-in here updates the payroll totals in real time.</p>
          </div>
          <div class="page-head__actions">
            <button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Clock in</button>
          </div>
        </header>
        <div id="stats-slot">${renderStats(entries)}</div>
        <div class="toolbar">
          <div class="toolbar__search">
            ${Atlas.ICONS.search}
            <input type="search" id="search" placeholder="Search employees…" autocomplete="off"/>
          </div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new').addEventListener('click', () => openClockInModal(reload));
      root.querySelector('#search').addEventListener('input', (e) => { query = e.target.value; paintList(); });
      paintChips(); paintList();
    }

    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [
        { k: 'all', label: 'All', n: entries.length },
        { k: 'in', label: 'On clock', n: entries.filter(e => e.status === 'in').length },
        { k: 'out', label: 'Off', n: entries.filter(e => e.status === 'out').length },
      ].map(c => `<button class="chip" data-s="${c.k}" aria-pressed="${statusFilter === c.k}">${Atlas.safe(c.label)}<span class="chip__count">${c.n}</span></button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { statusFilter = c.dataset.s; paintChips(); paintList(); }));
    }

    function paintList() {
      const listEl = root.querySelector('#list');
      const f = filtered();
      if (!f.length) {
        listEl.innerHTML = `<div class="empty"><div class="empty__art">${Atlas.illustration('clock')}</div><div class="empty__title">No entries</div><div class="empty__msg">${query ? 'Nothing matches your search.' : 'Clock the crew in to start the day.'}</div></div>`;
        return;
      }
      listEl.innerHTML = f.map(renderCard).join('');
      listEl.querySelectorAll('[data-clock-out]').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.clockOut;
        await DataStore.update(COLLECTION, id, { clockOut: new Date().toISOString(), status: 'out' });
        UI.toast('Clocked out', 'success');
      }));
    }

    async function reload() {
      entries = await DataStore.list(COLLECTION);
      root.querySelector('#stats-slot').innerHTML = renderStats(entries);
      paintChips(); paintList();
    }

    Atlas.onData(COLLECTION, reload);

    paintShell();

    // Live hour counter — retick every 30s so ongoing hours advance
    setInterval(() => { if (document.body.contains(root)) paintList(); }, 30000);
  });
})();

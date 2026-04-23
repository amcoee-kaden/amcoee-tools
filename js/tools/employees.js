/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Employees
   The people side of the shop.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {

  const ROLE_ACCENT = {
    owner: 'red',
    head_admin: 'copper',
    admin: 'violet',
    office: 'electric',
    field: 'green',
  };

  function renderCard(u) {
    const role = Auth.getRoleConfig(u.role);
    return `
      <article class="card" data-accent="${ROLE_ACCENT[u.role] || 'muted'}" data-id="${Atlas.safe(u.id)}">
        <div class="card__row">
          <div class="row" style="gap:1rem;align-items:center">
            <div style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--surface-3);font-family:var(--font-mono);font-weight:700;font-size:0.85rem;color:var(--ink)">${Atlas.safe(u.avatar || u.name.split(' ').map(p => p[0]).join('').slice(0,2))}</div>
            <div>
              <div class="card__title">${Atlas.safe(u.name)}</div>
              <div class="card__sub">${Atlas.safe(u.email)}</div>
            </div>
          </div>
          <div class="col col--gap-sm" style="align-items:flex-end">
            <span class="badge badge--${ROLE_ACCENT[u.role] || 'muted'}">${Atlas.safe(role.label)}</span>
            <span class="badge badge--${u.status === 'active' ? 'green' : 'muted'}">${Atlas.safe((u.status || 'active').toUpperCase())}</span>
          </div>
        </div>
        <div class="card__meta">
          <span>DEPT: <strong>${Atlas.safe(u.department || '—')}</strong></span>
          <span style="margin-left:auto">ID <span class="mono">${Atlas.safe(u.id)}</span></span>
        </div>
      </article>
    `;
  }

  function renderStats(users, depts) {
    const active = users.filter(u => u.status === 'active').length;
    const byRole = (r) => users.filter(u => u.role === r).length;
    return `
      <div class="stat-strip">
        <div class="stat stat--green"><span class="stat__label">Active</span><span class="stat__value stat__value--green">${active}</span></div>
        <div class="stat"><span class="stat__label">Field</span><span class="stat__value">${byRole('field')}</span></div>
        <div class="stat stat--electric"><span class="stat__label">Office</span><span class="stat__value stat__value--electric">${byRole('office')}</span></div>
        <div class="stat"><span class="stat__label">Departments</span><span class="stat__value stat__value--copper">${depts.length}</span></div>
      </div>
    `;
  }

  function openAddModal(onSaved) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Onboard an <em>employee</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="form-grid">
          <div class="field"><label class="field__label">Full name</label><input class="input" name="name" required/></div>
          <div class="field"><label class="field__label">Email</label><input class="input" name="email" type="email" required/></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Role</label><select class="select" name="role"><option value="field">Field Technician</option><option value="office">Office Staff</option><option value="admin">Administrator</option><option value="head_admin">Head Administrator</option></select></div>
          <div class="field"><label class="field__label">Department</label><input class="input" name="department" placeholder="e.g. Field Operations"/></div>
          <div class="field"><label class="field__label">Initial PIN</label><input class="input" name="pin" type="text" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" value="123456" required/></div>
        </div>
        <p class="mute-2" style="font-size:0.75rem;line-height:1.5">New employee can change their PIN from their profile after signing in.</p>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Onboard</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const users = Auth.getUsers();
      const avatar = d.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
      const u = { id: 'u' + (users.length + 1) + '_' + Date.now(), name: d.name, email: d.email, role: d.role, department: d.department || null, avatar, status: 'active', pin: Auth.hashPin(d.pin) };
      users.push(u);
      Auth.saveUsers(users);
      close(); UI.toast(`${d.name} onboarded`, 'success'); onSaved && onSaved();
    });
  }

  Atlas.registerRenderer('employees', async function (root) {
    let users = Auth.getUsers();
    let depts = await DataStore.list('departments').catch(() => []);
    let query = '', filter = 'all';

    function filtered() {
      return users.filter(u => {
        if (filter === 'active' && u.status !== 'active') return false;
        if (filter !== 'all' && filter !== 'active' && u.role !== filter) return false;
        if (!query) return true;
        return (u.name + ' ' + u.email + ' ' + (u.department || '')).toLowerCase().includes(query.toLowerCase());
      });
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">◊ PEOPLE</span><span>Org · roles</span></div>
            <h1 class="page-head__title">The crew, on <em>paper</em>.</h1>
            <p class="page-head__sub">Roles, departments, who has what access. Edit the shop org in one place.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.plus}Onboard</button></div>
        </header>
        <div id="stats-slot">${renderStats(users, depts)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search names, email, dept…" autocomplete="off"/></div>
          <div class="toolbar__chips" id="chips"></div>
        </div>
        <div id="list" class="list stagger"></div>
      `;
      root.querySelector('#new').addEventListener('click', () => openAddModal(reload));
      root.querySelector('#search').addEventListener('input', e => { query = e.target.value; paintList(); });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      el.innerHTML = [['all','All'],['active','Active'],['field','Field'],['office','Office'],['admin','Admin'],['head_admin','Head Admin'],['owner','Owner']].map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); }));
    }
    function paintList() {
      const f = filtered();
      root.querySelector('#list').innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__art">${Atlas.illustration('people')}</div><div class="empty__title">No employees match</div><div class="empty__msg">Try a different search.</div></div>`;
    }
    function reload() { users = Auth.getUsers(); root.querySelector('#stats-slot').innerHTML = renderStats(users, depts); paintList(); }
    paintShell();
  });
})();

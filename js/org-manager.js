/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — OrgManager
   Departments, groups, employee profiles, onboarding, offboarding
   ══════════════════════════════════════════════════════════════════════════════ */

const OrgManager = (() => {

  const DEFAULT_DEPARTMENTS = [
    { id: 'dept_ops',    name: 'Operations', color: '#22c55e', icon: '🔧', description: 'Field operations and service delivery', head: null },
    { id: 'dept_office', name: 'Office',     color: '#3b82f6', icon: '🏢', description: 'Administrative and office staff',       head: null },
    { id: 'dept_mgmt',   name: 'Management', color: '#f97316', icon: '👔', description: 'Leadership and management team',        head: null },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function s(str) {
    return DOMPurify.sanitize(String(str ?? ''));
  }

  function roleBadge(role) {
    const rc = Auth.getRoleConfig(role);
    return `<span class="badge" style="background:${rc.color}22;color:${rc.color};border:1px solid ${rc.color}44">${s(rc.label)}</span>`;
  }

  function statusBadge(status) {
    const map = {
      active:   { label: 'Active',   cls: 'badge-success' },
      inactive: { label: 'Inactive', cls: 'badge-warning' },
      suspended:{ label: 'Suspended',cls: 'badge-danger'  },
    };
    const cfg = map[status] || { label: s(status), cls: '' };
    return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
  }

  function avatarEl(user, size = 40) {
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${size * 0.36}px;
      background:var(--accent-subtle);color:var(--accent);border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">${s(user.avatar || user.name?.slice(0,2).toUpperCase() || '?')}</div>`;
  }

  function canManageOrg(session) {
    return session && (session.role === 'owner' || session.role === 'head_admin');
  }

  async function ensureDefaultDepts() {
    const existing = await DataStore.list('departments');
    if (existing.length === 0) {
      for (const d of DEFAULT_DEPARTMENTS) {
        await DataStore.create('departments', d);
      }
    }
  }

  // ── renderEmployees ──────────────────────────────────────────────────────────

  async function renderEmployees(container, session) {
    container.innerHTML = `<div class="page-loading" style="display:flex;align-items:center;justify-content:center;padding:48px">
      <div class="spinner"></div></div>`;

    const [users, depts] = await Promise.all([
      Promise.resolve(Auth.getUsers()),
      DataStore.list('departments'),
    ]);

    const deptMap = Object.fromEntries(depts.map(d => [d.id, d]));

    let filterRole = '';
    let filterDept = '';
    let filterStatus = '';
    let search = '';

    function filtered() {
      return users.filter(u => {
        if (filterRole   && u.role       !== filterRole)   return false;
        if (filterDept   && u.department !== filterDept)   return false;
        if (filterStatus && u.status     !== filterStatus) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
        }
        return true;
      });
    }

    function render() {
      const list = filtered();
      const deptOptions = depts.map(d => `<option value="${s(d.id)}" ${filterDept === d.id ? 'selected' : ''}>${s(d.name)}</option>`).join('');
      const roleOptions = Object.entries(Auth.ROLE_CONFIG).map(([k, v]) =>
        `<option value="${k}" ${filterRole === k ? 'selected' : ''}>${s(v.label)}</option>`).join('');

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:24px">
          <div>
            <h2 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);font-family:var(--font-display)">Employees</h2>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">${list.length} of ${users.length} members</p>
          </div>
          ${canManageOrg(session) ? `<button class="btn btn-primary" id="btn-add-emp">+ Add Employee</button>` : ''}
        </div>

        <div class="card" style="padding:16px;margin-bottom:20px">
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <input class="input" id="emp-search" placeholder="Search name or email…" value="${s(search)}"
              style="flex:1;min-width:180px">
            <select class="input" id="filter-role" style="min-width:150px">
              <option value="">All Roles</option>${roleOptions}
            </select>
            <select class="input" id="filter-dept" style="min-width:150px">
              <option value="">All Departments</option>${deptOptions}
            </select>
            <select class="input" id="filter-status" style="min-width:130px">
              <option value="">All Status</option>
              <option value="active"    ${filterStatus==='active'    ?'selected':''}>Active</option>
              <option value="inactive"  ${filterStatus==='inactive'  ?'selected':''}>Inactive</option>
              <option value="suspended" ${filterStatus==='suspended' ?'selected':''}>Suspended</option>
            </select>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table">
            <thead><tr>
              <th>Employee</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${list.length === 0 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:32px">No employees match filters.</td></tr>` :
              list.map(u => `
                <tr class="table-row-hover" data-user-id="${s(u.id)}" style="cursor:pointer">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${avatarEl(u, 36)}
                      <div>
                        <div style="font-weight:600;color:var(--text-primary)">${s(u.name)}</div>
                        <div style="font-size:var(--text-xs);color:var(--text-tertiary)">${s(u.email)}</div>
                      </div>
                    </div>
                  </td>
                  <td>${roleBadge(u.role)}</td>
                  <td style="color:var(--text-secondary)">
                    ${u.department && deptMap[u.department]
                      ? `<span style="display:inline-flex;align-items:center;gap:6px">
                           <span style="width:8px;height:8px;border-radius:50%;background:${s(deptMap[u.department].color)};flex-shrink:0"></span>
                           ${s(deptMap[u.department].name)}</span>`
                      : '<span style="color:var(--text-tertiary)">—</span>'}
                  </td>
                  <td>${statusBadge(u.status)}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm" data-view-user="${s(u.id)}">View</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

      // Event bindings
      container.querySelector('#emp-search')?.addEventListener('input', e => { search = e.target.value; render(); });
      container.querySelector('#filter-role')?.addEventListener('change', e => { filterRole = e.target.value; render(); });
      container.querySelector('#filter-dept')?.addEventListener('change', e => { filterDept = e.target.value; render(); });
      container.querySelector('#filter-status')?.addEventListener('change', e => { filterStatus = e.target.value; render(); });
      container.querySelector('#btn-add-emp')?.addEventListener('click', () => renderOnboarding(container, session));
      container.querySelectorAll('[data-view-user]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          renderEmployeeProfile(container, btn.dataset.viewUser, session);
        });
      });
      container.querySelectorAll('tr[data-user-id]').forEach(row => {
        row.addEventListener('click', () => renderEmployeeProfile(container, row.dataset.userId, session));
      });
    }

    render();
  }

  // ── renderEmployeeProfile ────────────────────────────────────────────────────

  async function renderEmployeeProfile(container, userId, session) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:48px"><div class="spinner"></div></div>`;

    const user = Auth.getUserById(userId);
    if (!user) { container.innerHTML = `<div class="card" style="padding:32px;text-align:center;color:var(--text-secondary)">User not found.</div>`; return; }

    const [depts, auditEntries] = await Promise.all([
      DataStore.list('departments'),
      AuditLog.getEntries({ userId, limit: 50 }),
    ]);

    const deptMap   = Object.fromEntries(depts.map(d => [d.id, d]));
    const dept      = user.department ? deptMap[user.department] : null;
    let activeTab   = 'overview';

    const mockCerts = [
      { id: 'c1', name: 'OSHA 10',          expiry: '2027-03-15', status: 'valid'   },
      { id: 'c2', name: 'First Aid / CPR',  expiry: '2026-09-01', status: 'valid'   },
      { id: 'c3', name: 'Forklift Operator',expiry: '2025-11-20', status: 'expired' },
    ];

    const mockJobs  = [
      { id: 'j1', title: 'HVAC Install — 431 Oak St',  status: 'in_progress' },
      { id: 'j2', title: 'Roof Repair — 19 Maple Ave', status: 'scheduled'   },
    ];

    const mockLoginHistory = [
      { device: 'Chrome / Windows', time: new Date(Date.now() - 3600000).toISOString() },
      { device: 'Edge / Windows',   time: new Date(Date.now() - 86400000 * 2).toISOString() },
    ];

    function tabContent() {
      if (activeTab === 'overview') return `
        <div class="card" style="padding:20px">
          <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Contact Info</h4>
          <div style="display:grid;gap:10px">
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-secondary)">Email</span><span style="font-weight:500">${s(user.email)}</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-secondary)">Phone</span><span style="color:var(--text-tertiary)">—</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-secondary)">Hire Date</span><span style="color:var(--text-tertiary)">—</span></div>
            <div style="display:flex;justify-content:space-between"><span style="color:var(--text-secondary)">Employee ID</span><span style="font-weight:500;font-family:var(--font-mono)">${s(user.id)}</span></div>
          </div>
        </div>
        <div class="card" style="padding:20px;margin-top:16px">
          <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Emergency Contact</h4>
          <p style="color:var(--text-tertiary);font-size:var(--text-sm)">No emergency contact on file.</p>
        </div>`;

      if (activeTab === 'work') return `
        <div class="card" style="padding:20px;margin-bottom:16px">
          <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Assigned Jobs</h4>
          ${mockJobs.map(j => `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border-primary)">
            <span style="font-size:var(--text-sm)">${s(j.title)}</span>
            <span class="badge ${j.status === 'in_progress' ? 'badge-info' : ''}">${s(j.status.replace('_',' '))}</span>
          </div>`).join('')}
        </div>
        <div class="card" style="padding:20px">
          <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Hours This Week</h4>
          <div style="font-size:var(--text-3xl);font-weight:800;color:var(--accent)">38.5 <span style="font-size:var(--text-base);color:var(--text-secondary)">hrs</span></div>
          <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:4px">Regular: 38.5 &nbsp;·&nbsp; Overtime: 0</p>
        </div>`;

      if (activeTab === 'certs') return `
        <div class="card" style="padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em">Certifications</h4>
            ${canManageOrg(session) ? `<button class="btn btn-ghost btn-sm">+ Add Cert</button>` : ''}
          </div>
          ${mockCerts.map(c => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-primary)">
              <div>
                <div style="font-weight:600;font-size:var(--text-sm)">${s(c.name)}</div>
                <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Expires ${UI.formatDate(c.expiry)}</div>
              </div>
              <span class="badge ${c.status === 'valid' ? 'badge-success' : 'badge-danger'}">${s(c.status)}</span>
            </div>`).join('')}
        </div>`;

      if (activeTab === 'activity') return `
        <div class="card" style="padding:20px">
          <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Recent Activity</h4>
          ${auditEntries.length === 0
            ? `<p style="color:var(--text-tertiary);text-align:center;padding:24px">No activity recorded.</p>`
            : auditEntries.slice(0,20).map(e => `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
                <div>
                  <span style="font-size:var(--text-sm);font-weight:500">${s(e.action)}</span>
                  ${e.collection ? `<span style="font-size:var(--text-xs);color:var(--text-tertiary);margin-left:6px">${s(e.collection)}</span>` : ''}
                </div>
                <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${UI.timeAgo(e.timestamp)}</span>
              </div>`).join('')}
        </div>`;

      if (activeTab === 'security') return `
        <div class="card" style="padding:20px;margin-bottom:16px">
          <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Login History</h4>
          ${mockLoginHistory.map(h => `
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-primary)">
              <span style="font-size:var(--text-sm)">${s(h.device)}</span>
              <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${UI.timeAgo(h.time)}</span>
            </div>`).join('')}
        </div>
        <div class="card" style="padding:20px">
          <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Active Sessions</h4>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:var(--text-sm);color:var(--text-secondary)">Current session active</span>
            ${canManageOrg(session) && userId !== session.userId
              ? `<button class="btn btn-danger btn-sm" id="btn-force-logout">Force Logout</button>`
              : ''}
          </div>
        </div>`;
      return '';
    }

    function render() {
      const tabs = [
        { id: 'overview',  label: 'Overview'      },
        { id: 'work',      label: 'Work'          },
        { id: 'certs',     label: 'Certifications'},
        { id: 'activity',  label: 'Activity'      },
        { id: 'security',  label: 'Security'      },
      ];

      container.innerHTML = `
        <button class="btn btn-ghost btn-sm" id="back-to-employees" style="margin-bottom:20px">← Back to Employees</button>

        <div class="card" style="padding:28px;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
            ${avatarEl(user, 72)}
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <h2 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);font-family:var(--font-display)">${s(user.name)}</h2>
                ${roleBadge(user.role)}
                ${statusBadge(user.status)}
              </div>
              <div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">${s(user.email)}</div>
              ${dept ? `<div style="display:inline-flex;align-items:center;gap:6px;margin-top:8px;font-size:var(--text-xs);color:var(--text-secondary)">
                <span style="width:8px;height:8px;border-radius:50%;background:${s(dept.color)}"></span>${s(dept.name)}</div>` : ''}
            </div>
            ${canManageOrg(session) && user.status === 'active' && userId !== session.userId
              ? `<button class="btn btn-danger btn-sm" id="btn-offboard" style="flex-shrink:0;margin-left:auto">Offboard</button>`
              : ''}
          </div>
        </div>

        <div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:1px solid var(--border-primary);padding-bottom:0">
          ${tabs.map(t => `<button class="btn btn-ghost btn-sm tab-btn ${activeTab === t.id ? 'tab-active' : ''}"
            data-tab="${t.id}" style="${activeTab === t.id ? 'color:var(--accent);border-bottom:2px solid var(--accent);border-radius:0' : ''}">${t.label}</button>`).join('')}
        </div>

        <div id="tab-content">${tabContent()}</div>`;

      container.querySelector('#back-to-employees').addEventListener('click', () => renderEmployees(container, session));

      container.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          activeTab = btn.dataset.tab;
          render();
        });
      });

      container.querySelector('#btn-force-logout')?.addEventListener('click', async () => {
        const ok = await UI.confirm('Force Logout', `Force logout ${user.name}? Their session will be invalidated immediately.`, { confirmLabel: 'Force Logout', danger: true });
        if (ok) {
          await AuditLog.log('force_logout', { collection: 'users', recordId: userId, metadata: { targetUser: user.name } });
          UI.toast(`${user.name} has been logged out.`, 'success');
        }
      });

      container.querySelector('#btn-offboard')?.addEventListener('click', () => {
        renderOffboarding(container, userId, session);
      });
    }

    render();
  }

  // ── renderDepartments ────────────────────────────────────────────────────────

  async function renderDepartments(container, session) {
    await ensureDefaultDepts();
    let editing = null;

    async function render() {
      const [depts, users] = await Promise.all([
        DataStore.list('departments'),
        Promise.resolve(Auth.getUsers()),
      ]);
      const activeUsers = users.filter(u => u.status !== 'inactive');

      function deptHeadcount(deptId) {
        return users.filter(u => u.department === deptId).length;
      }

      const userOptions = activeUsers.map(u =>
        `<option value="${s(u.id)}">${s(u.name)} (${s(Auth.getRoleConfig(u.role).label)})</option>`).join('');

      const editingDept = editing ? depts.find(d => d.id === editing) : null;

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:24px">
          <div>
            <h2 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);font-family:var(--font-display)">Departments</h2>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">${depts.length} department${depts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:32px">
          ${depts.map(d => `
            <div class="card" style="padding:20px;border-top:3px solid ${s(d.color)}">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <span style="font-size:1.4rem">${s(d.icon || '📁')}</span>
                    <h3 style="font-size:var(--text-lg);font-weight:700">${s(d.name)}</h3>
                  </div>
                  <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px">${s(d.description || '')}</p>
                  <div style="font-size:var(--text-xs);color:var(--text-tertiary)">
                    ${deptHeadcount(d.id)} member${deptHeadcount(d.id) !== 1 ? 's' : ''}
                    ${d.head ? ` · Head: ${s(users.find(u => u.id === d.head)?.name || '—')}` : ''}
                  </div>
                </div>
                ${canManageOrg(session) ? `<div style="display:flex;gap:4px;flex-shrink:0">
                  <button class="btn btn-ghost btn-sm" data-edit-dept="${s(d.id)}">Edit</button>
                  <button class="btn btn-ghost btn-sm" data-delete-dept="${s(d.id)}" style="color:var(--status-error)">Del</button>
                </div>` : ''}
              </div>

              ${editing === d.id ? `
                <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-primary)">
                  <div style="display:grid;gap:10px">
                    <input class="input input-sm" id="edit-name-${s(d.id)}"  value="${s(d.name)}"        placeholder="Department name">
                    <input class="input input-sm" id="edit-icon-${s(d.id)}"  value="${s(d.icon||'')}"    placeholder="Icon (emoji)">
                    <input class="input input-sm" id="edit-desc-${s(d.id)}"  value="${s(d.description||'')}" placeholder="Description">
                    <div style="display:flex;align-items:center;gap:8px">
                      <label style="font-size:var(--text-sm);color:var(--text-secondary)">Color</label>
                      <input type="color" id="edit-color-${s(d.id)}" value="${s(d.color)}" style="width:36px;height:28px;border:none;background:none;cursor:pointer;padding:0">
                    </div>
                    <select class="input input-sm" id="edit-head-${s(d.id)}">
                      <option value="">No department head</option>${userOptions}
                    </select>
                    <div style="display:flex;gap:8px">
                      <button class="btn btn-primary btn-sm" data-save-dept="${s(d.id)}">Save</button>
                      <button class="btn btn-ghost btn-sm"   data-cancel-dept>Cancel</button>
                    </div>
                  </div>
                </div>` : ''}
            </div>`).join('')}
        </div>

        ${canManageOrg(session) ? `
          <div class="card" style="padding:20px">
            <h4 style="font-size:var(--text-base);font-weight:700;color:var(--text-primary);margin-bottom:16px">Create Department</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <input class="input" id="new-dept-name"  placeholder="Department name *">
              <input class="input" id="new-dept-icon"  placeholder="Icon (emoji)">
              <input class="input" id="new-dept-desc"  placeholder="Description" style="grid-column:1/-1">
              <div style="display:flex;align-items:center;gap:10px">
                <label style="font-size:var(--text-sm);color:var(--text-secondary)">Color</label>
                <input type="color" id="new-dept-color" value="var(--accent)" style="width:40px;height:32px;border:none;background:none;cursor:pointer;padding:0">
              </div>
              <select class="input" id="new-dept-head">
                <option value="">No department head</option>${userOptions}
              </select>
            </div>
            <button class="btn btn-primary" id="btn-create-dept" style="margin-top:14px">Create Department</button>
          </div>` : ''}`;

      // Bindings
      container.querySelectorAll('[data-edit-dept]').forEach(btn => {
        btn.addEventListener('click', () => {
          editing = btn.dataset.editDept;
          render();
          setTimeout(() => {
            const sel = container.querySelector(`#edit-head-${editing}`);
            const d = depts.find(x => x.id === editing);
            if (sel && d?.head) sel.value = d.head;
          }, 0);
        });
      });

      container.querySelectorAll('[data-cancel-dept]').forEach(btn => {
        btn.addEventListener('click', () => { editing = null; render(); });
      });

      container.querySelectorAll('[data-save-dept]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.saveDept;
          const patch = {
            name:        DOMPurify.sanitize(container.querySelector(`#edit-name-${id}`)?.value.trim()  || ''),
            icon:        DOMPurify.sanitize(container.querySelector(`#edit-icon-${id}`)?.value.trim()  || ''),
            description: DOMPurify.sanitize(container.querySelector(`#edit-desc-${id}`)?.value.trim()  || ''),
            color:       DOMPurify.sanitize(container.querySelector(`#edit-color-${id}`)?.value        || 'var(--accent)'),
            head:        DOMPurify.sanitize(container.querySelector(`#edit-head-${id}`)?.value         || ''),
          };
          if (!patch.name) { UI.toast('Department name is required', 'error'); return; }
          await DataStore.update('departments', id, patch);
          editing = null;
          UI.toast('Department updated', 'success');
          render();
        });
      });

      container.querySelectorAll('[data-delete-dept]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id   = btn.dataset.deleteDept;
          const dept = depts.find(d => d.id === id);
          const ok   = await UI.confirm('Delete Department', `Delete "${dept?.name}"? Members will be unassigned.`, { confirmLabel: 'Delete', danger: true });
          if (!ok) return;
          await DataStore.remove('departments', id);
          UI.toast('Department deleted', 'success');
          render();
        });
      });

      container.querySelector('#btn-create-dept')?.addEventListener('click', async () => {
        const name  = DOMPurify.sanitize(container.querySelector('#new-dept-name')?.value.trim()  || '');
        const icon  = DOMPurify.sanitize(container.querySelector('#new-dept-icon')?.value.trim()  || '📁');
        const desc  = DOMPurify.sanitize(container.querySelector('#new-dept-desc')?.value.trim()  || '');
        const color = DOMPurify.sanitize(container.querySelector('#new-dept-color')?.value        || 'var(--accent)');
        const head  = DOMPurify.sanitize(container.querySelector('#new-dept-head')?.value         || '');
        if (!name) { UI.toast('Department name is required', 'error'); return; }
        await DataStore.create('departments', { name, icon, description: desc, color, head: head || null });
        UI.toast('Department created', 'success');
        container.querySelector('#new-dept-name').value  = '';
        container.querySelector('#new-dept-icon').value  = '';
        container.querySelector('#new-dept-desc').value  = '';
        render();
      });
    }

    await render();
  }

  // ── renderGroups ─────────────────────────────────────────────────────────────

  async function renderGroups(container, session) {
    async function render() {
      const [groups, members, users] = await Promise.all([
        DataStore.list('groups'),
        DataStore.list('group_members'),
        Promise.resolve(Auth.getUsers()),
      ]);

      function groupMembers(gid) {
        return members.filter(m => m.groupId === gid)
          .map(m => users.find(u => u.id === m.userId))
          .filter(Boolean);
      }

      const userOptions = users.map(u => `<option value="${s(u.id)}">${s(u.name)}</option>`).join('');

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:24px">
          <div>
            <h2 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);font-family:var(--font-display)">Groups</h2>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">${groups.length} group${groups.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:32px">
          ${groups.length === 0 ? `<div class="card" style="padding:32px;text-align:center;color:var(--text-tertiary);grid-column:1/-1">No groups yet. Create one below.</div>` :
          groups.map(g => {
            const mList = groupMembers(g.id);
            const typeBadge = g.type === 'temporary'
              ? `<span class="badge badge-warning">Temporary</span>`
              : `<span class="badge badge-info">Permanent</span>`;
            return `
              <div class="card" style="padding:20px;border-left:4px solid ${s(g.color || 'var(--accent)')}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                  <div>
                    <h3 style="font-weight:700;font-size:var(--text-base)">${s(g.name)}</h3>
                    <div style="margin-top:4px">${typeBadge}</div>
                  </div>
                  ${canManageOrg(session) ? `<button class="btn btn-ghost btn-sm btn-icon" data-delete-group="${s(g.id)}" style="color:var(--status-error)">✕</button>` : ''}
                </div>
                <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:10px">
                  ${g.startDate ? `Starts ${UI.formatDate(g.startDate)}` : ''}
                  ${g.endDate   ? ` · Ends ${UI.formatDate(g.endDate)}` : ''}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:4px">
                  ${mList.length === 0
                    ? `<span style="font-size:var(--text-xs);color:var(--text-tertiary)">No members</span>`
                    : mList.map(u => `<span class="badge">${s(u.avatar)}</span>`).join('')}
                </div>
                <div style="font-size:var(--text-xs);color:var(--text-secondary);margin-top:8px">${mList.length} member${mList.length !== 1 ? 's' : ''}</div>
              </div>`;
          }).join('')}
        </div>

        ${canManageOrg(session) ? `
          <div class="card" style="padding:20px">
            <h4 style="font-size:var(--text-base);font-weight:700;color:var(--text-primary);margin-bottom:16px">Create Group</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <input class="input" id="new-grp-name" placeholder="Group name *">
              <select class="input" id="new-grp-type">
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </select>
              <div style="display:flex;align-items:center;gap:10px">
                <label style="font-size:var(--text-sm);color:var(--text-secondary)">Color</label>
                <input type="color" id="new-grp-color" value="var(--accent)" style="width:40px;height:32px;border:none;background:none;cursor:pointer;padding:0">
              </div>
              <div style="display:flex;gap:8px">
                <input class="input" id="new-grp-start" type="date" placeholder="Start date">
                <input class="input" id="new-grp-end"   type="date" placeholder="End date">
              </div>
              <div style="grid-column:1/-1">
                <label style="font-size:var(--text-sm);color:var(--text-secondary);display:block;margin-bottom:6px">Members</label>
                <select class="input" id="new-grp-members" multiple style="min-height:100px">${userOptions}</select>
              </div>
            </div>
            <button class="btn btn-primary" id="btn-create-grp" style="margin-top:14px">Create Group</button>
          </div>` : ''}`;

      container.querySelectorAll('[data-delete-group]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await UI.confirm('Delete Group', 'Delete this group? Members will be removed.', { confirmLabel: 'Delete', danger: true });
          if (!ok) return;
          const gid = btn.dataset.deleteGroup;
          await DataStore.remove('groups', gid);
          const mToDelete = members.filter(m => m.groupId === gid);
          await Promise.all(mToDelete.map(m => DataStore.remove('group_members', m.id)));
          UI.toast('Group deleted', 'success');
          render();
        });
      });

      container.querySelector('#btn-create-grp')?.addEventListener('click', async () => {
        const name      = DOMPurify.sanitize(container.querySelector('#new-grp-name')?.value.trim() || '');
        const type      = DOMPurify.sanitize(container.querySelector('#new-grp-type')?.value       || 'permanent');
        const color     = DOMPurify.sanitize(container.querySelector('#new-grp-color')?.value      || 'var(--accent)');
        const startDate = DOMPurify.sanitize(container.querySelector('#new-grp-start')?.value      || '');
        const endDate   = DOMPurify.sanitize(container.querySelector('#new-grp-end')?.value        || '');
        const selOpts   = Array.from(container.querySelector('#new-grp-members')?.selectedOptions || []);
        const selectedUsers = selOpts.map(o => o.value);

        if (!name) { UI.toast('Group name is required', 'error'); return; }

        const group = await DataStore.create('groups', { name, type, color, startDate: startDate || null, endDate: endDate || null });
        await Promise.all(selectedUsers.map(uid =>
          DataStore.create('group_members', { groupId: group.id, userId: uid })
        ));
        UI.toast('Group created', 'success');
        container.querySelector('#new-grp-name').value = '';
        render();
      });
    }

    await render();
  }

  // ── renderOnboarding ─────────────────────────────────────────────────────────

  async function renderOnboarding(container, session) {
    if (!canManageOrg(session)) {
      container.innerHTML = `<div class="card" style="padding:32px;text-align:center;color:var(--text-secondary)">You do not have permission to onboard employees.</div>`;
      return;
    }

    const [depts, groups] = await Promise.all([
      DataStore.list('departments'),
      DataStore.list('groups'),
    ]);

    const state = {
      step: 1,
      name: '', email: '', phone: '',
      role: 'field', department: '',
      groups: [],
      pin: '',
    };

    function generatePin() {
      const arr = new Uint8Array(3);
      crypto.getRandomValues(arr);
      return Array.from(arr).map(b => b % 10).join('').padStart(6, '0');
    }

    const TOTAL_STEPS = 5;
    const STEP_LABELS  = ['Basic Info', 'Role & Dept', 'Groups', 'Credentials', 'Review'];

    function stepIndicator() {
      return `<div style="display:flex;justify-content:center;gap:8px;margin-bottom:28px">
        ${STEP_LABELS.map((lbl, i) => {
          const n = i + 1;
          const active   = n === state.step;
          const complete = n < state.step;
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:700;
              background:${complete ? 'var(--accent)' : active ? 'var(--accent-subtle)' : 'var(--bg-tertiary)'};
              color:${complete ? 'white' : active ? 'var(--accent)' : 'var(--text-tertiary)'};
              border:2px solid ${active || complete ? 'var(--accent)' : 'var(--border-primary)'}">
              ${complete ? '✓' : n}
            </div>
            <span style="font-size:var(--text-xs);color:${active ? 'var(--accent)' : 'var(--text-tertiary)'};white-space:nowrap">${lbl}</span>
          </div>
          ${i < TOTAL_STEPS - 1 ? `<div style="height:2px;background:${n < state.step ? 'var(--accent)' : 'var(--border-primary)'};flex:1;margin-top:15px"></div>` : ''}`;
        }).join('')}
      </div>`;
    }

    function stepContent() {
      if (state.step === 1) return `
        <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px">Basic Information</h3>
        <div style="display:grid;gap:14px">
          <div>
            <label class="label">Full Name *</label>
            <input class="input" id="ob-name" value="${s(state.name)}" placeholder="John Smith">
          </div>
          <div>
            <label class="label">Email Address *</label>
            <input class="input" id="ob-email" type="email" value="${s(state.email)}" placeholder="john@amcoee.com">
          </div>
          <div>
            <label class="label">Phone</label>
            <input class="input" id="ob-phone" type="tel" value="${s(state.phone)}" placeholder="(555) 000-0000">
          </div>
        </div>`;

      if (state.step === 2) return `
        <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px">Role & Department</h3>
        <div style="display:grid;gap:14px">
          <div>
            <label class="label">Role *</label>
            <select class="input" id="ob-role">
              ${Object.entries(Auth.ROLE_CONFIG).map(([k, v]) =>
                `<option value="${k}" ${state.role === k ? 'selected' : ''}>${s(v.label)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">Department</label>
            <select class="input" id="ob-dept">
              <option value="">No department</option>
              ${depts.map(d => `<option value="${s(d.id)}" ${state.department === d.id ? 'selected' : ''}>${s(d.name)}</option>`).join('')}
            </select>
          </div>
        </div>`;

      if (state.step === 3) return `
        <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px">Assign Groups</h3>
        ${groups.length === 0
          ? `<p style="color:var(--text-tertiary);font-size:var(--text-sm)">No groups available. You can assign groups later.</p>`
          : `<div style="display:grid;gap:8px">
            ${groups.map(g => `
              <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);border:1px solid var(--border-primary);cursor:pointer;hover:background:var(--bg-hover)">
                <input type="checkbox" class="ob-group-chk" value="${s(g.id)}" ${state.groups.includes(g.id) ? 'checked' : ''}>
                <span style="border-left:3px solid ${s(g.color||'var(--accent)')};padding-left:8px">
                  <strong style="font-size:var(--text-sm)">${s(g.name)}</strong>
                  <span class="badge" style="margin-left:6px;font-size:10px">${s(g.type)}</span>
                </span>
              </label>`).join('')}
          </div>`}`;

      if (state.step === 4) {
        if (!state.pin) state.pin = generatePin();
        return `
          <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px">Credentials</h3>
          <div class="card" style="padding:24px;text-align:center;background:var(--accent-subtle);border:1px solid var(--accent-glow)">
            <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:12px">Auto-generated PIN — share this once and securely</p>
            <div style="font-size:2.5rem;font-weight:900;letter-spacing:.3em;color:var(--accent);font-family:monospace">${s(state.pin)}</div>
            <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:10px">This PIN will not be shown again after this step.</p>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-regen-pin" style="margin-top:12px;width:100%">↻ Regenerate PIN</button>`;
      }

      if (state.step === 5) {
        const dept = depts.find(d => d.id === state.department);
        const rc   = Auth.getRoleConfig(state.role);
        const grpNames = state.groups.map(gid => groups.find(g => g.id === gid)?.name).filter(Boolean);
        return `
          <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px">Review & Create</h3>
          <div class="card" style="padding:20px;margin-bottom:16px">
            <div style="display:grid;gap:10px">
              ${[
                ['Name',       s(state.name)],
                ['Email',      s(state.email)],
                ['Phone',      s(state.phone) || '—'],
                ['Role',       `<span class="badge" style="background:${rc.color}22;color:${rc.color}">${s(rc.label)}</span>`],
                ['Department', s(dept?.name || '—')],
                ['Groups',     grpNames.length > 0 ? grpNames.map(n => `<span class="badge">${s(n)}</span>`).join(' ') : '—'],
                ['PIN',        `<span style="font-family:monospace;letter-spacing:.15em">${s(state.pin)}</span>`],
              ].map(([label, val]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
                  <span style="color:var(--text-secondary);font-size:var(--text-sm)">${label}</span>
                  <span style="font-size:var(--text-sm)">${val}</span>
                </div>`).join('')}
            </div>
          </div>
          <button class="btn btn-primary btn-full" id="btn-create-account">Create Account</button>`;
      }
      return '';
    }

    function render() {
      container.innerHTML = `
        <button class="btn btn-ghost btn-sm" id="back-from-onboard" style="margin-bottom:20px">← Back to Employees</button>
        <div class="card" style="padding:28px;max-width:580px;margin:0 auto">
          ${stepIndicator()}
          <div id="ob-step-content">${stepContent()}</div>
          <div style="display:flex;justify-content:space-between;gap:12px;margin-top:24px">
            ${state.step > 1
              ? `<button class="btn btn-secondary" id="ob-prev">← Previous</button>`
              : `<div></div>`}
            ${state.step < TOTAL_STEPS
              ? `<button class="btn btn-primary" id="ob-next">Next →</button>`
              : ''}
          </div>
        </div>`;

      container.querySelector('#back-from-onboard').addEventListener('click', () => renderEmployees(container, session));

      container.querySelector('#ob-prev')?.addEventListener('click', () => {
        collectStep();
        state.step--;
        render();
      });

      container.querySelector('#ob-next')?.addEventListener('click', () => {
        if (!validateStep()) return;
        collectStep();
        state.step++;
        render();
      });

      container.querySelector('#btn-regen-pin')?.addEventListener('click', () => {
        state.pin = generatePin();
        render();
      });

      container.querySelector('#btn-create-account')?.addEventListener('click', async () => {
        const users = Auth.getUsers();
        if (users.find(u => u.email === state.email)) {
          UI.toast('An account with this email already exists', 'error');
          return;
        }

        const newUser = {
          id:         'u_' + Date.now(),
          name:       DOMPurify.sanitize(state.name),
          email:      DOMPurify.sanitize(state.email),
          phone:      DOMPurify.sanitize(state.phone),
          role:       state.role,
          department: state.department || null,
          pin:        Auth.hashPin(state.pin),
          avatar:     state.name.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase(),
          status:     'active',
          hireDate:   new Date().toISOString().split('T')[0],
        };
        users.push(newUser);
        Auth.saveUsers(users);

        for (const gid of state.groups) {
          await DataStore.create('group_members', { groupId: gid, userId: newUser.id });
        }

        await AuditLog.log('employee_create', {
          collection: 'users',
          recordId:   newUser.id,
          metadata:   { name: newUser.name, email: newUser.email, role: newUser.role },
        });

        UI.toast(`${newUser.name} has been onboarded!`, 'success');
        renderEmployees(container, session);
      });
    }

    function collectStep() {
      if (state.step === 1) {
        state.name  = container.querySelector('#ob-name')?.value.trim()  || state.name;
        state.email = container.querySelector('#ob-email')?.value.trim() || state.email;
        state.phone = container.querySelector('#ob-phone')?.value.trim() || state.phone;
      } else if (state.step === 2) {
        state.role       = container.querySelector('#ob-role')?.value  || state.role;
        state.department = container.querySelector('#ob-dept')?.value  || state.department;
      } else if (state.step === 3) {
        state.groups = Array.from(container.querySelectorAll('.ob-group-chk:checked')).map(c => c.value);
      }
    }

    function validateStep() {
      collectStep();
      if (state.step === 1) {
        if (!state.name)  { UI.toast('Name is required', 'error'); return false; }
        if (!state.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
          UI.toast('Valid email is required', 'error');
          return false;
        }
      }
      return true;
    }

    render();
  }

  // ── renderOffboarding ────────────────────────────────────────────────────────

  async function renderOffboarding(container, userId, session) {
    if (!canManageOrg(session)) {
      container.innerHTML = `<div class="card" style="padding:32px;text-align:center;color:var(--text-secondary)">You do not have permission to offboard employees.</div>`;
      return;
    }

    const user = Auth.getUserById(userId);
    if (!user) { container.innerHTML = `<div class="card" style="padding:32px;text-align:center">User not found.</div>`; return; }

    const state = {
      step: 1,
      reason: '',
      effectiveDate: new Date().toISOString().split('T')[0],
      revokeAccess: true,
      reassignTools: true,
      archiveData: true,
    };

    const TOTAL_STEPS = 4;
    const STEP_LABELS = ['Reason', 'Revoke Access', 'Reassign', 'Confirm'];

    function stepIndicator() {
      return `<div style="display:flex;justify-content:center;gap:8px;margin-bottom:28px">
        ${STEP_LABELS.map((lbl, i) => {
          const n = i + 1;
          const active = n === state.step;
          const complete = n < state.step;
          return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
            <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-sm);font-weight:700;
              background:${complete ? 'var(--status-error)' : active ? 'rgba(239,68,68,0.15)' : 'var(--bg-tertiary)'};
              color:${complete ? 'white' : active ? 'var(--status-error)' : 'var(--text-tertiary)'};
              border:2px solid ${active || complete ? 'var(--status-error)' : 'var(--border-primary)'}">
              ${complete ? '✓' : n}
            </div>
            <span style="font-size:var(--text-xs);color:${active ? 'var(--status-error)' : 'var(--text-tertiary)'};white-space:nowrap">${lbl}</span>
          </div>
          ${i < TOTAL_STEPS - 1 ? `<div style="height:2px;background:${n < state.step ? 'var(--status-error)' : 'var(--border-primary)'};flex:1;margin-top:15px"></div>` : ''}`;
        }).join('')}
      </div>`;
    }

    function stepContent() {
      if (state.step === 1) return `
        <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px;color:var(--status-error)">Offboard ${s(user.name)}</h3>
        <div style="display:grid;gap:14px">
          <div>
            <label class="label">Reason for Separation *</label>
            <select class="input" id="off-reason">
              <option value="">Select reason…</option>
              <option value="resignation" ${state.reason==='resignation'?'selected':''}>Resignation</option>
              <option value="termination" ${state.reason==='termination'?'selected':''}>Termination</option>
              <option value="layoff"      ${state.reason==='layoff'?'selected':''}>Layoff</option>
              <option value="retirement"  ${state.reason==='retirement'?'selected':''}>Retirement</option>
              <option value="other"       ${state.reason==='other'?'selected':''}>Other</option>
            </select>
          </div>
          <div>
            <label class="label">Effective Date</label>
            <input class="input" id="off-date" type="date" value="${s(state.effectiveDate)}">
          </div>
        </div>`;

      if (state.step === 2) return `
        <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px">Access Revocation</h3>
        <div class="card" style="padding:20px;border-left:3px solid var(--status-error)">
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
            <input type="checkbox" id="off-revoke" ${state.revokeAccess ? 'checked' : ''}>
            <div>
              <div style="font-weight:600">Disable Login & Clear Sessions</div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Immediately prevents ${s(user.name)} from logging in and terminates all active sessions.</div>
            </div>
          </label>
        </div>`;

      if (state.step === 3) return `
        <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px">Reassign Assets</h3>
        <div style="display:grid;gap:12px">
          <div class="card" style="padding:16px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="off-tools" ${state.reassignTools ? 'checked' : ''}>
              <div>
                <div style="font-weight:600">Check In All Tools</div>
                <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Mark all tools checked out by this employee as returned.</div>
              </div>
            </label>
          </div>
          <div class="card" style="padding:16px">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
              <input type="checkbox" id="off-archive" ${state.archiveData ? 'checked' : ''}>
              <div>
                <div style="font-weight:600">Archive Employee Data</div>
                <div style="font-size:var(--text-xs);color:var(--text-tertiary)">Profile becomes read-only. Data preserved for audit and compliance (3-year minimum).</div>
              </div>
            </label>
          </div>
        </div>`;

      if (state.step === 4) {
        const rc = Auth.getRoleConfig(user.role);
        return `
          <h3 style="font-size:var(--text-xl);font-weight:800;margin-bottom:20px;color:var(--status-error)">Confirm Offboarding</h3>
          <div class="card" style="padding:20px;margin-bottom:16px;border:1px solid rgba(239,68,68,0.3)">
            <div style="display:grid;gap:10px">
              ${[
                ['Employee',    `${s(user.name)} <span class="badge" style="background:${rc.color}22;color:${rc.color}">${s(rc.label)}</span>`],
                ['Reason',      s(state.reason || '—')],
                ['Effective',   s(state.effectiveDate)],
                ['Revoke Access', state.revokeAccess ? '<span style="color:var(--status-error)">Yes</span>' : 'No'],
                ['Check In Tools', state.reassignTools ? 'Yes' : 'No'],
                ['Archive Data',   state.archiveData  ? 'Yes' : 'No'],
              ].map(([label, val]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
                  <span style="color:var(--text-secondary);font-size:var(--text-sm)">${label}</span>
                  <span style="font-size:var(--text-sm)">${val}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="card" style="padding:16px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);margin-bottom:16px">
            <p style="font-size:var(--text-sm);color:var(--status-error);font-weight:600">This action cannot be easily undone.</p>
          </div>
          <button class="btn btn-danger btn-full" id="btn-confirm-offboard">Confirm Offboarding</button>`;
      }
      return '';
    }

    function render() {
      container.innerHTML = `
        <button class="btn btn-ghost btn-sm" id="back-from-offboard" style="margin-bottom:20px">← Back to Profile</button>
        <div class="card" style="padding:28px;max-width:580px;margin:0 auto">
          ${stepIndicator()}
          <div id="off-step-content">${stepContent()}</div>
          <div style="display:flex;justify-content:space-between;gap:12px;margin-top:24px">
            ${state.step > 1
              ? `<button class="btn btn-secondary" id="off-prev">← Previous</button>`
              : `<div></div>`}
            ${state.step < TOTAL_STEPS
              ? `<button class="btn btn-primary" id="off-next">Next →</button>`
              : ''}
          </div>
        </div>`;

      container.querySelector('#back-from-offboard').addEventListener('click', () => renderEmployeeProfile(container, userId, session));

      container.querySelector('#off-prev')?.addEventListener('click', () => {
        collectStep();
        state.step--;
        render();
      });

      container.querySelector('#off-next')?.addEventListener('click', () => {
        if (!validateStep()) return;
        collectStep();
        state.step++;
        render();
      });

      container.querySelector('#btn-confirm-offboard')?.addEventListener('click', async () => {
        const ok = await UI.confirm('Offboard Employee', `Are you sure you want to offboard ${user.name}? This will revoke their access.`, { confirmLabel: 'Offboard', danger: true });
        if (!ok) return;

        const users = Auth.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
          users[idx].status = 'inactive';
          users[idx].offboardedAt = new Date().toISOString();
          users[idx].offboardReason = state.reason;
          Auth.saveUsers(users);
        }

        // Remove from groups
        const members = await DataStore.list('group_members');
        const userMembers = members.filter(m => m.userId === userId);
        await Promise.all(userMembers.map(m => DataStore.remove('group_members', m.id)));

        await AuditLog.log('employee_offboard', {
          collection: 'users',
          recordId: userId,
          metadata: {
            name: user.name,
            reason: state.reason,
            effectiveDate: state.effectiveDate,
            revokedAccess: state.revokeAccess,
          },
        });

        UI.toast(`${user.name} has been offboarded.`, 'success');
        renderEmployees(container, session);
      });
    }

    function collectStep() {
      if (state.step === 1) {
        state.reason = container.querySelector('#off-reason')?.value || state.reason;
        state.effectiveDate = container.querySelector('#off-date')?.value || state.effectiveDate;
      } else if (state.step === 2) {
        state.revokeAccess = container.querySelector('#off-revoke')?.checked ?? state.revokeAccess;
      } else if (state.step === 3) {
        state.reassignTools = container.querySelector('#off-tools')?.checked ?? state.reassignTools;
        state.archiveData = container.querySelector('#off-archive')?.checked ?? state.archiveData;
      }
    }

    function validateStep() {
      collectStep();
      if (state.step === 1 && !state.reason) {
        UI.toast('Please select a reason', 'error');
        return false;
      }
      return true;
    }

    render();
  }

  // ── renderOrgChart ──────────────────────────────────────────────────────────

  async function renderOrgChart(container, session) {
    const [depts, users] = await Promise.all([
      DataStore.list('departments'),
      Promise.resolve(Auth.getUsers()),
    ]);

    const activeUsers = users.filter(u => u.status !== 'inactive');
    const owner = activeUsers.find(u => u.role === 'owner');
    const headAdmin = activeUsers.find(u => u.role === 'head_admin');

    function userNode(u, indent) {
      const rc = Auth.getRoleConfig(u.role);
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-left:${indent}px;border-left:2px solid ${rc.color}44;margin-top:4px">
        ${avatarEl(u, 28)}
        <div>
          <span style="font-weight:600;font-size:var(--text-sm)">${s(u.name)}</span>
          <span class="badge" style="margin-left:6px;background:${rc.color}22;color:${rc.color};font-size:10px">${s(rc.label)}</span>
        </div>
      </div>`;
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:24px">
        <div>
          <h2 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);font-family:var(--font-display)">Organization Chart</h2>
          <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">${activeUsers.length} active members across ${depts.length} departments</p>
        </div>
      </div>

      <div class="card" style="padding:24px;margin-bottom:24px">
        <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Leadership</h4>
        ${owner ? userNode(owner, 0) : ''}
        ${headAdmin ? userNode(headAdmin, 24) : ''}
      </div>`;

    for (const dept of depts) {
      const deptUsers = activeUsers.filter(u => u.department === dept.id);
      const head = dept.head ? activeUsers.find(u => u.id === dept.head) : null;
      const others = deptUsers.filter(u => u.id !== dept.head);

      html += `
        <div class="card" style="padding:20px;margin-bottom:16px;border-top:3px solid ${s(dept.color)}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <span style="font-size:1.3rem">${s(dept.icon || '📁')}</span>
            <div>
              <h3 style="font-weight:700">${s(dept.name)}</h3>
              <span style="font-size:var(--text-xs);color:var(--text-tertiary)">${deptUsers.length} member${deptUsers.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          ${head ? `<div style="margin-bottom:8px"><span style="font-size:var(--text-xs);color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em">Department Head</span>${userNode(head, 0)}</div>` : ''}
          ${others.length > 0 ? others.map(u => userNode(u, head ? 24 : 0)).join('') : deptUsers.length === 0 ? `<p style="font-size:var(--text-sm);color:var(--text-tertiary);padding:12px 0">No members assigned</p>` : ''}
        </div>`;
    }

    // Unassigned users
    const unassigned = activeUsers.filter(u => !u.department && u.role !== 'owner' && u.role !== 'head_admin');
    if (unassigned.length > 0) {
      html += `
        <div class="card" style="padding:20px;border-top:3px solid var(--text-tertiary)">
          <h3 style="font-weight:700;margin-bottom:12px;color:var(--text-secondary)">Unassigned</h3>
          ${unassigned.map(u => userNode(u, 0)).join('')}
        </div>`;
    }

    container.innerHTML = html;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  return {
    renderEmployees,
    renderEmployeeProfile,
    renderDepartments,
    renderGroups,
    renderOnboarding,
    renderOffboarding,
    renderOrgChart,
  };

})();

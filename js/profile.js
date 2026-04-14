/* ==============================================================================
   AMCOEE TOOLS — Personal Profile & Account Settings
   Profile header, personal info, security (PIN change, sessions), preferences,
   activity feed with timeline view
   ============================================================================== */

const Profile = (() => {

  // ── Helpers ───────────────────────────────────────────────────────────────

  function san(text) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(String(text ?? '')) : String(text ?? '');
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  const TABS = [
    { id: 'personal',    label: 'Personal Info',  icon: 'user' },
    { id: 'security',    label: 'Security',        icon: 'shield' },
    { id: 'preferences', label: 'Preferences',     icon: 'sliders' },
    { id: 'activity',    label: 'Activity',         icon: 'activity' },
  ];

  const TIMEOUT_OPTIONS = [
    { label: '1 hour',   value: 60 },
    { label: '4 hours',  value: 240 },
    { label: '8 hours',  value: 480 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440 },
  ];

  const ACTION_TYPES = [
    'login', 'logout', 'create', 'update', 'delete',
    'login_failed', 'lockout', 'force_logout', 'pin_change',
  ];

  let activeTab = 'personal';
  let currentUser = null;
  let currentSession = null;

  // ── Render entry point ────────────────────────────────────────────────────

  function render(container, session) {
    currentSession = session;
    const user = Auth.getUserById(session.userId);
    if (!user) {
      container.innerHTML = '<p style="padding:40px;text-align:center;color:var(--text-secondary)">User not found.</p>';
      return;
    }
    currentUser = { ...user };

    container.innerHTML = `
      <div class="profile-page">
        ${renderHero(currentUser, session)}
        <div class="profile-tabs">
          <div class="profile-tab-bar">${TABS.map(t =>
            `<button class="profile-tab-btn ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">
              <i data-feather="${t.icon}" style="width:15px;height:15px"></i>
              <span>${t.label}</span>
            </button>`
          ).join('')}</div>
          <div class="profile-tab-content" id="profile-tab-content"></div>
        </div>
      </div>
    `;

    // Feather icons
    if (typeof feather !== 'undefined') feather.replace();

    // Wire tab clicks
    $$('.profile-tab-btn', container).forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        $$('.profile-tab-btn', container).forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
        renderTabContent(container, session);
      });
    });

    // Wire inline editing on hero
    wireHeroInlineEditing(container, session);

    renderTabContent(container, session);
  }

  // ── Hero Section ──────────────────────────────────────────────────────────

  function renderHero(user, session) {
    const rc = Auth.getRoleConfig(user.role);
    const prefs = Auth.getPrefs(session.userId);
    const memberSince = user.createdAt
      ? dayjs(user.createdAt).format('MMM D, YYYY')
      : 'Since launch';

    return `
      <div class="profile-hero">
        <div class="profile-avatar" style="background:${rc.color}">
          <span>${san(user.avatar || initials(user.name))}</span>
        </div>

        <div class="profile-hero-name" data-field="name">
          <span class="profile-hero-text">${san(user.name)}</span>
          <button class="profile-inline-edit-btn" title="Edit name"><i data-feather="edit-2" style="width:14px;height:14px"></i></button>
          <input type="text" class="input profile-inline-input" value="${san(user.name)}" style="display:none" />
        </div>

        <div class="profile-hero-email" data-field="email">
          <span class="profile-hero-text">${san(user.email)}</span>
          <button class="profile-inline-edit-btn" title="Edit email"><i data-feather="edit-2" style="width:14px;height:14px"></i></button>
          <input type="email" class="input profile-inline-input" value="${san(user.email)}" style="display:none" />
        </div>

        <div class="profile-hero-badges">
          <span class="badge" style="background:${rc.color};color:#fff">${san(rc.label)}</span>
          ${user.department ? `<span class="badge badge-outline">${san(user.department)}</span>` : ''}
          <span class="profile-status-badge"><span class="profile-status-dot"></span> Active</span>
        </div>

        <div class="profile-hero-meta">Member since ${san(memberSince)}</div>
      </div>
    `;
  }

  function initials(name) {
    if (!name) return '??';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Inline Editing Wiring ─────────────────────────────────────────────────

  function wireHeroInlineEditing(container, session) {
    $$('[data-field]', container).forEach(wrapper => {
      const field = wrapper.dataset.field;
      const textEl = $('.profile-hero-text', wrapper);
      const editBtn = $('.profile-inline-edit-btn', wrapper);
      const inputEl = $('.profile-inline-input', wrapper);
      if (!editBtn || !inputEl || !textEl) return;

      editBtn.addEventListener('click', () => {
        textEl.style.display = 'none';
        editBtn.style.display = 'none';
        inputEl.style.display = 'block';
        inputEl.focus();
        inputEl.select();
      });

      const save = () => {
        const val = inputEl.value.trim();
        if (!val) { cancel(); return; }
        textEl.textContent = val;
        textEl.style.display = '';
        editBtn.style.display = '';
        inputEl.style.display = 'none';

        // Persist
        const users = Auth.getUsers();
        const idx = users.findIndex(u => u.id === session.userId);
        if (idx !== -1) {
          users[idx][field] = val;
          if (field === 'name') users[idx].avatar = initials(val);
          Auth.saveUsers(users);
          currentUser = { ...users[idx] };
          AuditLog.log('profile_update', { metadata: { field, value: val } });
          UI.toast('Profile updated');
        }
      };

      const cancel = () => {
        inputEl.value = textEl.textContent;
        textEl.style.display = '';
        editBtn.style.display = '';
        inputEl.style.display = 'none';
      };

      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') cancel();
      });
      inputEl.addEventListener('blur', save);
    });
  }

  // ── Tab Content Dispatcher ────────────────────────────────────────────────

  function renderTabContent(container, session) {
    const target = $('#profile-tab-content', container);
    if (!target) return;

    target.style.opacity = '0';
    target.style.transform = 'translateY(6px)';

    setTimeout(() => {
      switch (activeTab) {
        case 'personal':    renderPersonalTab(target, session); break;
        case 'security':    renderSecurityTab(target, session); break;
        case 'preferences': renderPreferencesTab(target, session); break;
        case 'activity':    renderActivityTab(target, session); break;
      }
      if (typeof feather !== 'undefined') feather.replace();
      requestAnimationFrame(() => {
        target.style.transition = 'opacity 300ms ease, transform 300ms ease';
        target.style.opacity = '1';
        target.style.transform = 'translateY(0)';
      });
    }, 120);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 1 — Personal Information
  // ═══════════════════════════════════════════════════════════════════════════

  function renderPersonalTab(target, session) {
    const user = Auth.getUserById(session.userId) || currentUser;

    target.innerHTML = `
      <div class="card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:20px">Personal Information</h3>
        <div class="profile-form">
          <label class="profile-field">
            <span class="profile-field-label">Full Name</span>
            <input type="text" class="input" id="pf-name" value="${san(user.name)}" />
          </label>
          <label class="profile-field">
            <span class="profile-field-label">Email</span>
            <input type="email" class="input" id="pf-email" value="${san(user.email)}" />
          </label>
          <label class="profile-field">
            <span class="profile-field-label">Phone</span>
            <input type="tel" class="input" id="pf-phone" value="${san(user.phone || '')}" placeholder="(555) 123-4567" />
          </label>
          <label class="profile-field">
            <span class="profile-field-label">Emergency Contact Name</span>
            <input type="text" class="input" id="pf-ec-name" value="${san(user.emergencyContactName || '')}" placeholder="Contact name" />
          </label>
          <label class="profile-field">
            <span class="profile-field-label">Emergency Contact Phone</span>
            <input type="tel" class="input" id="pf-ec-phone" value="${san(user.emergencyContactPhone || '')}" placeholder="(555) 987-6543" />
          </label>
        </div>
        <button class="btn btn-primary" id="pf-save" style="margin-top:20px">
          <i data-feather="save" style="width:15px;height:15px;margin-right:6px"></i>Save Changes
        </button>
      </div>
    `;

    // Format phone inputs
    ['pf-phone', 'pf-ec-phone'].forEach(id => {
      const el = $(`#${id}`, target);
      if (el) el.addEventListener('input', () => { el.value = formatPhone(el.value); });
    });

    $('#pf-save', target).addEventListener('click', () => {
      const users = Auth.getUsers();
      const idx = users.findIndex(u => u.id === session.userId);
      if (idx === -1) return;

      users[idx].name = $('#pf-name', target).value.trim();
      users[idx].email = $('#pf-email', target).value.trim();
      users[idx].phone = $('#pf-phone', target).value.trim();
      users[idx].emergencyContactName = $('#pf-ec-name', target).value.trim();
      users[idx].emergencyContactPhone = $('#pf-ec-phone', target).value.trim();
      users[idx].avatar = initials(users[idx].name);

      Auth.saveUsers(users);
      currentUser = { ...users[idx] };

      AuditLog.log('profile_update', {
        metadata: { fields: ['name', 'email', 'phone', 'emergencyContactName', 'emergencyContactPhone'] }
      });
      UI.toast('Profile updated');
    });
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 2 — Security
  // ═══════════════════════════════════════════════════════════════════════════

  function renderSecurityTab(target, session) {
    target.innerHTML = `
      <div class="profile-security-grid">
        ${renderPinChangeCard()}
        ${renderActiveSessionsCard(session)}
        ${renderLoginHistoryCard()}
      </div>
    `;

    wirePinChange(target, session);
    loadActiveSessions(target, session);
    loadLoginHistory(target, session);
  }

  // ── PIN Change ────────────────────────────────────────────────────────────

  function renderPinChangeCard() {
    return `
      <div class="card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">
          <i data-feather="lock" style="width:16px;height:16px;margin-right:6px"></i>Change PIN
        </h3>
        <div class="profile-form" style="gap:12px">
          <label class="profile-field">
            <span class="profile-field-label">Current PIN</span>
            <input type="password" class="input" id="pin-current" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Enter current PIN" />
          </label>
          <label class="profile-field">
            <span class="profile-field-label">New PIN</span>
            <input type="password" class="input" id="pin-new" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Min 4 digits (6+ recommended)" />
            <div id="pin-strength" class="profile-pin-strength" style="display:none">
              <div class="profile-pin-strength-bar"></div>
              <span class="profile-pin-strength-label"></span>
            </div>
          </label>
          <label class="profile-field">
            <span class="profile-field-label">Confirm New PIN</span>
            <input type="password" class="input" id="pin-confirm" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="Re-enter new PIN" />
          </label>
          <div id="pin-error" style="color:var(--status-error);font-size:0.8125rem;display:none"></div>
          <button class="btn btn-primary" id="pin-save" style="margin-top:4px">
            <i data-feather="check" style="width:15px;height:15px;margin-right:6px"></i>Update PIN
          </button>
        </div>
      </div>
    `;
  }

  function wirePinChange(container, session) {
    const newInput = $('#pin-new', container);
    const strengthEl = $('#pin-strength', container);
    const barEl = $('.profile-pin-strength-bar', container);
    const labelEl = $('.profile-pin-strength-label', container);
    const errEl = $('#pin-error', container);

    if (newInput) {
      newInput.addEventListener('input', () => {
        const len = newInput.value.length;
        if (len === 0) { strengthEl.style.display = 'none'; return; }
        strengthEl.style.display = 'flex';

        let level, color, width;
        if (len < 4) {
          level = 'Too short'; color = 'var(--status-error)'; width = '20%';
        } else if (len <= 4) {
          level = 'Weak'; color = '#f59e0b'; width = '40%';
        } else if (len <= 5) {
          level = 'Fair'; color = '#f59e0b'; width = '55%';
        } else if (len <= 6) {
          level = 'Good'; color = '#3b82f6'; width = '75%';
        } else {
          level = 'Strong'; color = '#22c55e'; width = '100%';
        }
        barEl.style.width = width;
        barEl.style.background = color;
        labelEl.textContent = level;
        labelEl.style.color = color;
      });
    }

    const saveBtn = $('#pin-save', container);
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        errEl.style.display = 'none';
        const current = $('#pin-current', container).value;
        const newPin = $('#pin-new', container).value;
        const confirm = $('#pin-confirm', container).value;

        // Validate current PIN
        if (!Auth.reauth(current)) {
          showPinError(errEl, 'Current PIN is incorrect.');
          return;
        }

        // Validate new PIN length
        if (newPin.length < 4) {
          showPinError(errEl, 'New PIN must be at least 4 digits.');
          return;
        }

        // Validate match
        if (newPin !== confirm) {
          showPinError(errEl, 'New PINs do not match.');
          return;
        }

        // Validate it's only digits
        if (!/^\d+$/.test(newPin)) {
          showPinError(errEl, 'PIN must contain only digits.');
          return;
        }

        // Save
        const users = Auth.getUsers();
        const idx = users.findIndex(u => u.id === session.userId);
        if (idx === -1) return;

        users[idx].pin = Auth.hashPin(newPin);
        Auth.saveUsers(users);

        AuditLog.log('pin_change', { metadata: { userId: session.userId } });
        UI.toast('PIN changed successfully');

        // Clear inputs
        $('#pin-current', container).value = '';
        $('#pin-new', container).value = '';
        $('#pin-confirm', container).value = '';
        strengthEl.style.display = 'none';
      });
    }
  }

  function showPinError(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
    el.animate([
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(0)' },
    ], { duration: 300 });
  }

  // ── Active Sessions ───────────────────────────────────────────────────────

  function renderActiveSessionsCard(session) {
    return `
      <div class="card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">
          <i data-feather="monitor" style="width:16px;height:16px;margin-right:6px"></i>Active Sessions
        </h3>
        <div id="sessions-list" class="profile-sessions-list">
          <div class="profile-loading">Loading sessions...</div>
        </div>
      </div>
    `;
  }

  async function loadActiveSessions(container, session) {
    const listEl = $('#sessions-list', container);
    if (!listEl) return;

    try {
      const sessions = await SecurityMonitor.getActiveSessions(session.userId);
      if (!sessions.length) {
        listEl.innerHTML = '<div style="color:var(--text-secondary);font-size:0.875rem">No active sessions found.</div>';
        return;
      }

      listEl.innerHTML = sessions.map(s => {
        const isCurrent = s.sessionToken === session.sessionToken;
        const loginAgo = UI.timeAgo(s.loginTime);
        return `
          <div class="profile-session-item">
            <div class="profile-session-info">
              <div class="profile-session-device">
                <i data-feather="monitor" style="width:14px;height:14px;margin-right:6px;opacity:0.5"></i>
                ${san(s.deviceInfo || 'Unknown device')}
                ${isCurrent ? '<span class="badge badge-sm" style="background:var(--status-success);color:#fff;margin-left:8px">Current</span>' : ''}
              </div>
              <div class="profile-session-time">Logged in ${san(loginAgo)}</div>
            </div>
            ${!isCurrent ? `<button class="btn btn-secondary btn-sm profile-session-logout" data-token="${san(s.sessionToken)}">Sign out</button>` : ''}
          </div>
        `;
      }).join('');

      if (typeof feather !== 'undefined') feather.replace();

      // Wire sign-out buttons
      $$('.profile-session-logout', listEl).forEach(btn => {
        btn.addEventListener('click', async () => {
          const token = btn.dataset.token;
          const ok = await UI.confirm('End Session', 'Sign out this device?', { confirmLabel: 'Sign Out', danger: true });
          if (!ok) return;
          const result = await SecurityMonitor.forceLogout(token);
          if (result.success) {
            UI.toast('Session ended');
            loadActiveSessions(container, session);
          } else {
            UI.toast(result.error || 'Failed to end session', 'error');
          }
        });
      });
    } catch (err) {
      listEl.innerHTML = '<div style="color:var(--status-error);font-size:0.875rem">Failed to load sessions.</div>';
    }
  }

  // ── Login History ─────────────────────────────────────────────────────────

  function renderLoginHistoryCard() {
    return `
      <div class="card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">
          <i data-feather="clock" style="width:16px;height:16px;margin-right:6px"></i>Login History
        </h3>
        <div id="login-history-list" class="profile-login-history">
          <div class="profile-loading">Loading history...</div>
        </div>
      </div>
    `;
  }

  async function loadLoginHistory(container, session) {
    const listEl = $('#login-history-list', container);
    if (!listEl) return;

    try {
      const entries = await AuditLog.getEntries({ userId: session.userId, limit: 10 });
      const loginEntries = entries.filter(e =>
        e.action === 'login' || e.action === 'login_failed' || e.action === 'logout'
      ).slice(0, 10);

      if (!loginEntries.length) {
        listEl.innerHTML = '<div style="color:var(--text-secondary);font-size:0.875rem">No login history found.</div>';
        return;
      }

      listEl.innerHTML = `
        <div class="profile-history-table">
          ${loginEntries.map(e => {
            const date = dayjs(e.timestamp).format('MMM D, YYYY');
            const time = dayjs(e.timestamp).format('h:mm A');
            const device = e.deviceInfo || 'Unknown';
            const isSuccess = e.action !== 'login_failed';
            const actionLabel = e.action === 'login' ? 'Login' : e.action === 'logout' ? 'Logout' : 'Failed';
            const badgeColor = isSuccess ? 'var(--status-success)' : 'var(--status-error)';
            return `
              <div class="profile-history-row">
                <div class="profile-history-date">${san(date)}<br/><span style="opacity:0.6">${san(time)}</span></div>
                <div class="profile-history-device">${san(device)}</div>
                <span class="badge badge-sm" style="background:${badgeColor};color:#fff">${actionLabel}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch {
      listEl.innerHTML = '<div style="color:var(--status-error);font-size:0.875rem">Failed to load history.</div>';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 3 — Preferences
  // ═══════════════════════════════════════════════════════════════════════════

  function renderPreferencesTab(target, session) {
    const prefs = Auth.getPrefs(session.userId);
    const accentPresets = Theme.ACCENT_PRESETS;

    target.innerHTML = `
      <div class="profile-prefs-grid">
        <!-- Theme -->
        <div class="card" style="padding:24px">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">
            <i data-feather="sun" style="width:16px;height:16px;margin-right:6px"></i>Theme
          </h3>
          <div class="profile-theme-toggle">
            <button class="btn ${prefs.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" data-theme="dark">
              <i data-feather="moon" style="width:15px;height:15px;margin-right:6px"></i>Dark
            </button>
            <button class="btn ${prefs.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" data-theme="light">
              <i data-feather="sun" style="width:15px;height:15px;margin-right:6px"></i>Light
            </button>
          </div>
        </div>

        <!-- Accent Color -->
        <div class="card" style="padding:24px">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">
            <i data-feather="droplet" style="width:16px;height:16px;margin-right:6px"></i>Accent Color
          </h3>
          <div class="profile-accent-picker">
            ${accentPresets.map(p => `
              <button class="profile-accent-circle ${prefs.accentColor === p.value ? 'active' : ''}"
                      style="background:${p.value}" data-color="${p.value}" title="${san(p.name)}">
                ${prefs.accentColor === p.value ? '<i data-feather="check" style="width:14px;height:14px;color:#fff"></i>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Notifications -->
        <div class="card" style="padding:24px">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">
            <i data-feather="bell" style="width:16px;height:16px;margin-right:6px"></i>Notifications
          </h3>
          <div class="profile-toggle-row">
            <span style="font-size:0.875rem;color:var(--text-secondary)">Enable notifications</span>
            <label class="profile-switch">
              <input type="checkbox" id="pref-notifications" ${prefs.notifications ? 'checked' : ''} />
              <span class="profile-switch-slider"></span>
            </label>
          </div>
        </div>

        <!-- Session Timeout -->
        <div class="card" style="padding:24px">
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">
            <i data-feather="clock" style="width:16px;height:16px;margin-right:6px"></i>Session Timeout
          </h3>
          <select class="input" id="pref-timeout" style="max-width:200px">
            ${TIMEOUT_OPTIONS.map(o =>
              `<option value="${o.value}" ${prefs.sessionTimeout === o.value ? 'selected' : ''}>${o.label}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    `;

    wirePreferences(target, session);
  }

  function wirePreferences(container, session) {
    // Theme toggle
    $$('[data-theme]', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        Auth.savePrefs(session.userId, { theme });
        Theme.apply(Auth.getPrefs(session.userId));
        UI.toast('Theme updated');
        renderPreferencesTab(container, session);
        if (typeof feather !== 'undefined') feather.replace();
      });
    });

    // Accent color
    $$('.profile-accent-circle', container).forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        Auth.savePrefs(session.userId, { accentColor: color });
        Theme.apply(Auth.getPrefs(session.userId));
        UI.toast('Accent color updated');
        renderPreferencesTab(container, session);
        if (typeof feather !== 'undefined') feather.replace();
      });
    });

    // Notifications toggle
    const notifEl = $('#pref-notifications', container);
    if (notifEl) {
      notifEl.addEventListener('change', () => {
        Auth.savePrefs(session.userId, { notifications: notifEl.checked });
        UI.toast(notifEl.checked ? 'Notifications enabled' : 'Notifications disabled');
      });
    }

    // Timeout select
    const timeoutEl = $('#pref-timeout', container);
    if (timeoutEl) {
      timeoutEl.addEventListener('change', () => {
        Auth.savePrefs(session.userId, { sessionTimeout: parseInt(timeoutEl.value, 10) });
        UI.toast('Session timeout updated');
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab 4 — Activity
  // ═══════════════════════════════════════════════════════════════════════════

  function renderActivityTab(target, session) {
    target.innerHTML = `
      <div class="card" style="padding:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <h3 style="font-size:1rem;font-weight:700;margin:0">
            <i data-feather="activity" style="width:16px;height:16px;margin-right:6px"></i>Activity Feed
          </h3>
          <select class="input" id="activity-filter" style="max-width:180px;font-size:0.8125rem">
            <option value="">All Actions</option>
            ${ACTION_TYPES.map(a => `<option value="${a}">${san(a.replace(/_/g, ' '))}</option>`).join('')}
          </select>
        </div>
        <div id="activity-timeline" class="profile-timeline">
          <div class="profile-loading">Loading activity...</div>
        </div>
      </div>
    `;

    loadActivityFeed(target, session, '');

    const filterEl = $('#activity-filter', target);
    if (filterEl) {
      filterEl.addEventListener('change', () => {
        loadActivityFeed(target, session, filterEl.value);
      });
    }
  }

  async function loadActivityFeed(container, session, actionFilter) {
    const timeline = $('#activity-timeline', container);
    if (!timeline) return;

    try {
      const filters = { userId: session.userId, limit: 50 };
      if (actionFilter) filters.action = actionFilter;
      const entries = await AuditLog.getEntries(filters);

      if (!entries.length) {
        timeline.innerHTML = '<div style="color:var(--text-secondary);font-size:0.875rem;padding:12px 0">No activity found.</div>';
        return;
      }

      timeline.innerHTML = entries.map((e, i) => {
        const time = dayjs(e.timestamp).format('MMM D, h:mm A');
        const relTime = UI.timeAgo(e.timestamp);
        const actionLabel = san((e.action || 'unknown').replace(/_/g, ' '));
        const targetLabel = e.collection ? ` on ${san(e.collection)}` : '';
        const dotColor = getActionColor(e.action);

        return `
          <div class="profile-timeline-item" style="animation-delay:${i * 30}ms">
            <div class="profile-timeline-dot" style="background:${dotColor}"></div>
            <div class="profile-timeline-content">
              <div class="profile-timeline-action">
                <strong style="text-transform:capitalize">${actionLabel}</strong>${targetLabel}
              </div>
              <div class="profile-timeline-meta" title="${san(time)}">${san(relTime)}</div>
            </div>
          </div>
        `;
      }).join('');
    } catch {
      timeline.innerHTML = '<div style="color:var(--status-error);font-size:0.875rem">Failed to load activity.</div>';
    }
  }

  function getActionColor(action) {
    const map = {
      login: 'var(--status-success)',
      logout: 'var(--text-secondary)',
      create: '#3b82f6',
      update: '#f59e0b',
      delete: 'var(--status-error)',
      login_failed: 'var(--status-error)',
      lockout: 'var(--status-error)',
      force_logout: '#f97316',
      pin_change: '#a855f7',
      profile_update: '#06b6d4',
    };
    return map[action] || 'var(--text-secondary)';
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return { render };

})();

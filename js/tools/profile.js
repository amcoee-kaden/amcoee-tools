/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Profile
   The "you" page. Change PIN, manage prefs, see session info.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {

  function openChangePinModal(session) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Change <em>PIN</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f">
        <div class="field"><label class="field__label">Current PIN</label><input class="input" type="password" name="curr" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required autofocus/></div>
        <div class="field"><label class="field__label">New PIN</label><input class="input" type="password" name="pin1" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required/></div>
        <div class="field"><label class="field__label">Confirm</label><input class="input" type="password" name="pin2" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required/></div>
        <div class="login-error" id="err"></div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">Change PIN</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html);
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));
    modal.querySelector('#f').addEventListener('submit', (e) => {
      e.preventDefault();
      const err = modal.querySelector('#err');
      const d = Object.fromEntries(new FormData(e.target));
      if (!Auth.reauth(d.curr)) { err.textContent = 'Current PIN is incorrect.'; err.classList.add('show'); return; }
      if (d.pin1 !== d.pin2) { err.textContent = 'New PINs do not match.'; err.classList.add('show'); return; }
      if (d.pin1.length < 4) { err.textContent = 'PIN must be at least 4 digits.'; err.classList.add('show'); return; }
      const users = Auth.getUsers();
      const me = users.find(u => u.id === session.userId);
      if (!me) { err.textContent = 'User not found.'; err.classList.add('show'); return; }
      me.pin = Auth.hashPin(d.pin1);
      Auth.saveUsers(users);
      close(); UI.toast('PIN updated', 'success');
    });
  }

  Atlas.registerRenderer('profile', async function (root, session) {
    const user = Auth.getUserById(session.userId) || session;
    const prefs = Auth.getPrefs(session.userId);
    const role = Auth.getRoleConfig(session.role);

    root.innerHTML = `
      <header class="page-head">
        <div class="page-head__meta">
          <div class="page-head__rubric"><span class="page-head__rubric-chip">● YOU</span><span>Your account</span></div>
          <h1 class="page-head__title">Hello, <em>${Atlas.safe(user.name.split(' ')[0])}</em>.</h1>
          <p class="page-head__sub">Your role, your preferences, your sign-in security — all in one place.</p>
        </div>
        <div class="page-head__actions">
          <button class="btn" id="logout">${Atlas.ICONS.logout} Sign out</button>
        </div>
      </header>

      <div class="list stagger">
        <article class="card" data-accent="copper">
          <div class="card__row">
            <div class="row" style="gap:1.2rem;align-items:center">
              <div style="width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--copper),var(--copper-3));color:#0B0B0D;font-family:var(--font-mono);font-size:1.2rem;font-weight:700">${Atlas.safe(user.avatar || user.name.split(' ').map(p => p[0]).join('').slice(0,2))}</div>
              <div>
                <div class="card__title" style="font-size:1.35rem">${Atlas.safe(user.name)}</div>
                <div class="card__sub">${Atlas.safe(user.email)}</div>
              </div>
            </div>
            <span class="badge badge--copper">${Atlas.safe(role.label)}</span>
          </div>
          <div class="card__meta">
            <span>DEPT: <strong>${Atlas.safe(user.department || '—')}</strong></span>
            <span>USER ID: <span class="mono">${Atlas.safe(user.id)}</span></span>
          </div>
        </article>

        <article class="card" data-accent="electric">
          <div class="card__row">
            <div>
              <div class="card__title">Security</div>
              <div class="card__sub">PIN, sessions, and lockout settings.</div>
            </div>
            <button class="btn" id="change-pin">Change PIN</button>
          </div>
          <div class="card__meta">
            <span>Signed in: <strong>${Atlas.fmt.datetime(session.loginTime)}</strong></span>
            <span>Device: <strong>${Atlas.safe(session.deviceInfo)}</strong></span>
            <span>Last active: <strong>${Atlas.fmt.timeAgo(session.lastActivity || session.loginTime)}</strong></span>
          </div>
        </article>

        <article class="card" data-accent="copper">
          <div class="card__row">
            <div>
              <div class="card__title">Appearance & feel</div>
              <div class="card__sub">Theme, accent color, density, animations — tailor the experience.</div>
            </div>
            <button class="btn btn--primary" id="open-prefs">Open Preferences</button>
          </div>
          <div class="card__body">
            <div id="prefs-summary" class="row wrap" style="gap:1.2rem;padding-top:0.5rem;border-top:1px dashed var(--border)"></div>
          </div>
        </article>

        <article class="card">
          <div class="card__row">
            <div>
              <div class="card__title">Session & notifications</div>
              <div class="card__sub">Tweak how long you stay signed in.</div>
            </div>
            <button class="btn btn--primary btn--sm" id="save-prefs">Save</button>
          </div>
          <div class="card__body">
            <div class="form-grid">
              <div class="field"><label class="field__label">Session timeout (min)</label><input class="input" id="p-timeout" type="number" min="15" max="1440" step="15" value="${Number(prefs.sessionTimeout) || 480}"/></div>
              <div class="field"><label class="field__label">Notifications</label><select class="select" id="p-notif"><option value="true" ${prefs.notifications ? 'selected' : ''}>On</option><option value="false" ${!prefs.notifications ? 'selected' : ''}>Off</option></select></div>
            </div>
          </div>
        </article>
      </div>
    `;

    function renderPrefsSummary() {
      const p = Atlas.Prefs.all();
      const summary = root.querySelector('#prefs-summary');
      if (!summary) return;
      summary.innerHTML = `
        <span class="row row--gap-sm"><span class="eyebrow">Theme</span><span class="badge badge--copper">${Atlas.safe(p.theme)}</span></span>
        <span class="row row--gap-sm"><span class="eyebrow">Accent</span><span class="swatch swatch--${p.accent}" style="width:20px;height:20px;pointer-events:none"></span><span class="mono" style="font-size:0.78rem">${Atlas.safe(p.accent)}</span></span>
        <span class="row row--gap-sm"><span class="eyebrow">Density</span><span class="badge badge--muted">${Atlas.safe(p.density)}</span></span>
        <span class="row row--gap-sm"><span class="eyebrow">Animations</span><span class="badge badge--${p.animations === 'full' ? 'green' : p.animations === 'reduced' ? 'amber' : 'muted'}">${Atlas.safe((p.animations || 'full').toUpperCase())}</span></span>
        <span class="row row--gap-sm"><span class="eyebrow">Time</span><span class="badge badge--electric">${Atlas.safe(p.timeFormat)}</span></span>
      `;
    }

    root.querySelector('#logout').addEventListener('click', () => Auth.logout());
    root.querySelector('#change-pin').addEventListener('click', () => openChangePinModal(session));
    root.querySelector('#open-prefs').addEventListener('click', () => Shell.openPreferences());
    root.querySelector('#save-prefs').addEventListener('click', () => {
      const t = Number(root.querySelector('#p-timeout').value) || 480;
      const n = root.querySelector('#p-notif').value === 'true';
      Auth.savePrefs(session.userId, { sessionTimeout: t, notifications: n });
      UI.toast('Saved', 'success');
    });

    renderPrefsSummary();
    AppEvents.on('prefs:changed', renderPrefsSummary);
  });
})();

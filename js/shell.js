/* ══════════════════════════════════════════════════════════════════════════════
   AMCO ATLAS — Shell
   Renders the topbar + nav rail on every tool page, wires Ctrl+K palette +
   global search across all DataStore collections.
   ══════════════════════════════════════════════════════════════════════════════ */

const Shell = (() => {

  const RAIL_STATE_KEY = 'amcoee_rail_open';
  let session = null;
  let currentToolId = null;

  /* ─── Auth gate ─────────────────────────────────────────────────────────── */

  function requireSession() {
    session = Auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  /* ─── Render topbar ─────────────────────────────────────────────────────── */

  function renderTopbar() {
    const tool = Atlas.getTool(currentToolId);
    const roleCfg = Auth.getRoleConfig(session.role);

    const html = `
      <nav class="topbar" id="topbar">
        <div class="topbar__crumb">
          <span>AMCO / Atlas</span>
          <span class="topbar__crumb--sep">›</span>
          <span class="topbar__crumb--current">${Atlas.safe(tool ? tool.name : 'Home')}</span>
        </div>
        <div class="topbar__right">
          <button class="topbar__search" id="open-palette" title="Search everything  ·  Ctrl+K">
            ${Atlas.ICONS.search}
            <span>Search everything…</span>
            <kbd>⌘K</kbd>
          </button>
          <div class="topbar__clock hide-mobile" id="topbar-clock">LIVE</div>
          <button class="topbar__avatar" id="avatar-btn" title="${Atlas.safe(session.name + ' — ' + roleCfg.label)}">${Atlas.safe(session.avatar || session.name.split(' ').map(p => p[0]).join('').slice(0,2))}</button>
        </div>
        <div class="topbar__scan"></div>
      </nav>
    `;
    document.body.insertAdjacentHTML('afterbegin', html);

    document.getElementById('open-palette').addEventListener('click', openPalette);
    document.getElementById('avatar-btn').addEventListener('click', openAvatarMenu);

    const clock = document.getElementById('topbar-clock');
    function tick() {
      const d = new Date();
      clock.textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    tick();
    setInterval(tick, 30000);
  }

  /* ─── Render nav rail ───────────────────────────────────────────────────── */

  function renderRail() {
    const bySection = Atlas.visibleBySection(session.role);
    let sectionsHTML = '';
    for (const [section, items] of bySection) {
      sectionsHTML += `<div class="rail__section">${Atlas.safe(section)}</div>`;
      for (const t of items) {
        const active = t.id === currentToolId ? ' aria-current="page"' : '';
        sectionsHTML += `
          <a class="rail__item" href="${t.page}" data-tool="${t.id}"${active} title="${Atlas.safe(t.name)}">
            <span class="rail__icon">${Atlas.safe(t.icon)}</span>
            <span class="rail__label">${Atlas.safe(t.name)}</span>
            <span class="rail__tip">${Atlas.safe(t.name)}</span>
          </a>
        `;
      }
    }

    const html = `
      <aside class="rail" id="rail">
        <div class="rail__brand" id="rail-brand">
          <div class="rail__logo">A</div>
          <div class="rail__wordmark">Atl<em>a</em>s</div>
        </div>
        <div class="rail__scroll">
          ${sectionsHTML}
        </div>
        <button class="rail__toggle" id="rail-toggle" title="Toggle nav">≡  Toggle rail</button>
      </aside>
    `;
    document.body.insertAdjacentHTML('afterbegin', html);

    document.getElementById('rail-toggle').addEventListener('click', toggleRail);
    document.getElementById('rail-brand').addEventListener('click', () => Atlas.nav('home'));
  }

  function toggleRail() {
    const open = document.body.getAttribute('data-rail') === 'open';
    document.body.setAttribute('data-rail', open ? 'closed' : 'open');
    try { localStorage.setItem(RAIL_STATE_KEY, open ? 'closed' : 'open'); } catch {}
  }

  function restoreRailState() {
    let state = 'open';
    try { state = localStorage.getItem(RAIL_STATE_KEY) || 'open'; } catch {}
    if (window.innerWidth < 900) state = 'closed';
    document.body.setAttribute('data-rail', state);
  }

  /* ─── Render main container ─────────────────────────────────────────────── */

  function ensureMain() {
    let main = document.getElementById('atlas-main');
    if (!main) {
      main = document.createElement('main');
      main.id = 'atlas-main';
      main.className = 'main page-enter';
      document.body.appendChild(main);
    } else {
      main.className = 'main page-enter';
    }
    return main;
  }

  /* ─── Avatar menu ───────────────────────────────────────────────────────── */

  function openAvatarMenu() {
    const existing = document.getElementById('avatar-menu');
    if (existing) { existing.remove(); return; }

    const roleCfg = Auth.getRoleConfig(session.role);
    const menu = document.createElement('div');
    menu.id = 'avatar-menu';
    menu.style.cssText = 'position:fixed;top:56px;right:18px;background:var(--surface-1);border:1px solid var(--border-strong);border-radius:12px;padding:6px;z-index:60;min-width:240px;box-shadow:0 20px 50px rgba(0,0,0,0.5);animation:pop-in .2s var(--ease-spring);';
    menu.innerHTML = `
      <div style="padding:14px 16px 12px;border-bottom:1px solid var(--border);">
        <div style="font-family:var(--font-display);font-style:italic;font-size:1.2rem;color:var(--ink);line-height:1.1">${Atlas.safe(session.name)}</div>
        <div style="font-family:var(--font-mono);font-size:0.65rem;color:var(--ink-4);letter-spacing:0.14em;text-transform:uppercase;margin-top:6px">${Atlas.safe(roleCfg.label)}</div>
      </div>
      <a class="kpalette__item" href="profile.html" style="text-decoration:none;color:inherit;margin-top:4px"><span class="kpalette__icon">●</span><div class="kpalette__label"><div class="kpalette__title">Profile</div><div class="kpalette__sub">Your account settings</div></div></a>
      <a class="kpalette__item" href="settings.html" style="text-decoration:none;color:inherit;"><span class="kpalette__icon">◎</span><div class="kpalette__label"><div class="kpalette__title">Settings</div><div class="kpalette__sub">Organization & data</div></div></a>
      <div style="height:1px;background:var(--border);margin:4px 8px"></div>
      <button class="kpalette__item" id="av-logout" style="width:100%;text-align:left;border:0;background:transparent;margin:0;"><span class="kpalette__icon" style="color:var(--signal-red);border-color:rgba(232,76,61,0.35)">↩</span><div class="kpalette__label"><div class="kpalette__title" style="color:var(--signal-red)">Sign out</div><div class="kpalette__sub">End this session</div></div></button>
    `;
    document.body.appendChild(menu);

    document.getElementById('av-logout').addEventListener('click', () => Auth.logout());

    setTimeout(() => {
      const close = (e) => {
        if (!menu.contains(e.target) && e.target.id !== 'avatar-btn') {
          menu.remove();
          document.removeEventListener('click', close);
        }
      };
      document.addEventListener('click', close);
    }, 50);
  }

  /* ─── Command Palette / Global Search ───────────────────────────────────── */

  let paletteIndex = [];
  let paletteIndexDirty = true;
  let paletteBuildPromise = null;

  async function buildPaletteIndex(force = false) {
    if (!force && !paletteIndexDirty && paletteIndex.length) return paletteIndex;
    if (paletteBuildPromise) return paletteBuildPromise;
    paletteBuildPromise = (async () => {
      const idx = [];

      for (const t of Atlas.visibleTools(session.role)) {
        idx.push({
          kind: 'tool',
          icon: t.icon,
          title: t.name,
          sub: t.tagline,
          section: 'Navigate',
          action: () => Atlas.nav(t.id),
        });
      }

      const fields = ['title', 'name', 'client', 'label', 'subject', 'employee', 'description', 'vendor', 'vehicle', 'asset', 'company'];
      const catalog = Atlas.allTools().filter(t => t.collection);
      for (const t of catalog) {
        try {
          const rows = await DataStore.list(t.collection);
          for (const r of rows) {
            let title = '';
            for (const f of fields) { if (r[f]) { title = r[f]; break; } }
            if (!title) title = r.id;
            const sub = [r.status, r.client, r.company, r.vendor, r.tag, r.category]
              .filter(Boolean).slice(0, 2).join(' · ');
            idx.push({
              kind: t.name.toLowerCase(),
              icon: t.icon,
              title: String(title),
              sub: sub || t.tagline,
              section: t.name,
              action: () => Atlas.nav(t.id, { focus: r.id }),
            });
          }
        } catch {}
      }

      paletteIndex = idx;
      paletteIndexDirty = false;
      paletteBuildPromise = null;
      return idx;
    })();
    return paletteBuildPromise;
  }

  // Any data change invalidates the index for next open
  AppEvents.on('data:create', () => { paletteIndexDirty = true; });
  AppEvents.on('data:update', () => { paletteIndexDirty = true; });

  let paletteOpen = false;
  let paletteQuery = '';
  let paletteSelected = 0;
  let paletteFiltered = [];

  async function openPalette() {
    if (paletteOpen) return;
    paletteOpen = true;
    await buildPaletteIndex();
    paletteQuery = '';
    paletteSelected = 0;

    const back = document.createElement('div');
    back.className = 'kpalette-back';
    back.id = 'kpalette-back';
    back.innerHTML = `
      <div class="kpalette" role="dialog" aria-modal="true">
        <div class="kpalette__search">
          <span class="kpalette__search-icon">${Atlas.ICONS.search}</span>
          <input id="kp-input" type="text" placeholder="Jump to a tool · find a job, a client, an invoice…" autocomplete="off" spellcheck="false"/>
          <span class="kpalette__close">ESC</span>
        </div>
        <div class="kpalette__list" id="kp-list"></div>
        <div class="kpalette__foot">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
          <span style="margin-left:auto">${paletteIndex.length.toLocaleString()} indexed</span>
        </div>
      </div>
    `;
    document.body.appendChild(back);

    const input = document.getElementById('kp-input');
    const listEl = document.getElementById('kp-list');

    function render() {
      const q = paletteQuery.trim().toLowerCase();
      if (!q) {
        paletteFiltered = paletteIndex.filter(i => i.kind === 'tool').slice(0, 20);
      } else {
        paletteFiltered = paletteIndex
          .map(i => {
            const hay = (i.title + ' ' + (i.sub || '')).toLowerCase();
            let score = 0;
            if (hay.startsWith(q)) score = 100;
            else if (hay.includes(q)) score = 50;
            else return null;
            if (i.kind === 'tool') score += 10;
            return { ...i, _score: score };
          })
          .filter(Boolean)
          .sort((a, b) => b._score - a._score)
          .slice(0, 40);
      }

      if (paletteSelected >= paletteFiltered.length) paletteSelected = Math.max(0, paletteFiltered.length - 1);

      const bySection = new Map();
      paletteFiltered.forEach((item, i) => {
        const s = item.section;
        if (!bySection.has(s)) bySection.set(s, []);
        bySection.get(s).push({ ...item, _idx: i });
      });

      let html = '';
      if (!paletteFiltered.length) {
        html = `<div class="kpalette__empty">No matches for <strong style="color:var(--ink-2)">"${Atlas.escapeHTML(paletteQuery)}"</strong></div>`;
      } else {
        for (const [section, items] of bySection) {
          html += `<div class="kpalette__section">${Atlas.safe(section)}</div>`;
          for (const i of items) {
            const sel = i._idx === paletteSelected ? ' aria-selected="true"' : '';
            html += `
              <div class="kpalette__item" data-idx="${i._idx}"${sel}>
                <span class="kpalette__icon">${Atlas.safe(i.icon || '·')}</span>
                <div class="kpalette__label">
                  <div class="kpalette__title">${Atlas.safe(i.title)}</div>
                  <div class="kpalette__sub">${Atlas.safe(i.sub || '')}</div>
                </div>
                <span class="kpalette__kind">${Atlas.safe(i.kind.toUpperCase())}</span>
              </div>
            `;
          }
        }
      }
      listEl.innerHTML = html;
      listEl.querySelectorAll('.kpalette__item').forEach(node => {
        node.addEventListener('mousemove', () => {
          const idx = +node.dataset.idx;
          if (idx !== paletteSelected) {
            paletteSelected = idx;
            listEl.querySelectorAll('.kpalette__item').forEach(n => n.removeAttribute('aria-selected'));
            node.setAttribute('aria-selected', 'true');
          }
        });
        node.addEventListener('click', () => commitSelection());
      });
    }

    function commitSelection() {
      const item = paletteFiltered[paletteSelected];
      closePalette();
      if (item && item.action) item.action();
    }

    function closePalette() {
      paletteOpen = false;
      const b = document.getElementById('kpalette-back');
      if (b) b.remove();
      document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); paletteSelected = Math.min(paletteFiltered.length - 1, paletteSelected + 1); render(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); paletteSelected = Math.max(0, paletteSelected - 1); render(); return; }
      if (e.key === 'Enter') { e.preventDefault(); commitSelection(); return; }
    }

    back.addEventListener('click', (e) => { if (e.target === back) closePalette(); });
    input.addEventListener('input', (e) => { paletteQuery = e.target.value; paletteSelected = 0; render(); });
    document.addEventListener('keydown', handleKey);

    render();
    setTimeout(() => input.focus(), 30);
  }

  /* ─── Keyboard shortcuts ────────────────────────────────────────────────── */

  function wireShortcuts() {
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (paletteOpen) return;
        openPalette();
        return;
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openPalette();
      }
    });
  }

  /* ─── Boot ─────────────────────────────────────────────────────────────── */

  async function boot(toolId) {
    currentToolId = toolId;
    session = requireSession();
    if (!session) return;

    Auth.startHeartbeat();

    document.body.classList.add('app');
    restoreRailState();
    renderRail();
    renderTopbar();
    const main = ensureMain();

    wireShortcuts();

    const renderer = Atlas.getRenderer(toolId);
    if (renderer) {
      try {
        await renderer(main, session);
      } catch (e) {
        console.error('[Shell] renderer failed:', e);
        main.innerHTML = `<div class="empty"><div class="empty__icon">⚠</div><div class="empty__title">Something went sideways</div><div class="empty__msg">${Atlas.safe(e.message || String(e))}</div></div>`;
      }
    }

    AppEvents.on('auth:session-warning', () => {
      if (typeof UI !== 'undefined' && UI.toast) UI.toast('Session expires in 5 minutes. Any activity keeps you signed in.', 'warning', 6000);
    });

    buildPaletteIndex();
  }

  return { boot, openPalette, toggleRail, session: () => session };
})();

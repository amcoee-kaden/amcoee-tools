/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Settings
   Org config, data export/import, storage + integrity.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {

  async function exportJSON() {
    const dump = await DataStore.exportAll();
    dump._users = Auth.getUsers();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `amcoee-atlas-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast('Backup downloaded', 'success');
  }

  function importJSON() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'application/json';
    inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return;
      const ok = await UI.confirm('Import backup?', 'This will replace ALL current data with the backup contents. Cannot be undone.', { danger: true, confirmLabel: 'Import' });
      if (!ok) return;
      try {
        const dump = JSON.parse(await f.text());
        if (dump._users) { Auth.saveUsers(dump._users); delete dump._users; }
        await DataStore.importAll(dump);
        UI.toast('Import complete — reloading', 'success');
        setTimeout(() => window.location.reload(), 700);
      } catch (e) { UI.toast('Import failed: ' + e.message, 'error'); }
    });
    inp.click();
  }

  async function wipeData() {
    const ok = await UI.confirm('Wipe all data?', 'Every tool\'s data — including uploaded files — will be cleared, and the app will reload with seed data. This is destructive.', { danger: true, confirmLabel: 'Wipe everything' });
    if (!ok) return;
    const keys = Object.keys(localStorage).filter(k => k.startsWith('amcoee_'));
    for (const k of keys) localStorage.removeItem(k);
    const wipe = (name) => new Promise((resolve) => {
      try { const req = indexedDB.deleteDatabase(name); req.onsuccess = () => resolve(); req.onerror = () => resolve(); req.onblocked = () => resolve(); }
      catch { resolve(); }
    });
    await wipe('amcoee_db');
    await wipe('amcoee_blobs');
    UI.toast('Data wiped — reloading', 'info');
    setTimeout(() => window.location.reload(), 700);
  }

  Atlas.registerRenderer('settings', async function (root, session) {
    const usage = DataStore.getStorageUsage();
    const users = Auth.getUsers();
    const depts = await DataStore.list('departments').catch(() => []);
    const groups = await DataStore.list('groups').catch(() => []);

    // Collection counts
    const counts = {};
    for (const c of [...DataStore.LS_COLLECTIONS, ...DataStore.IDB_COLLECTIONS]) {
      try { counts[c] = (await DataStore.list(c)).length; } catch { counts[c] = 0; }
    }
    const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);

    // Blob storage
    let blobCount = 0, blobSize = 0;
    try {
      if (typeof Blobs !== 'undefined') {
        const list = await Blobs.listAll();
        blobCount = list.length;
        blobSize = list.reduce((a, b) => a + (b.size || 0), 0);
      }
    } catch {}

    root.innerHTML = `
      <header class="page-head">
        <div class="page-head__meta">
          <div class="page-head__rubric"><span class="page-head__rubric-chip">◎ SYSTEM</span><span>Config · data · integrity</span></div>
          <h1 class="page-head__title">Atlas, <em>under the hood</em>.</h1>
          <p class="page-head__sub">Org config, data export, storage usage. Owner + head admin only.</p>
        </div>
      </header>

      <div class="stat-strip">
        <div class="stat stat--electric"><span class="stat__label">Total records</span><span class="stat__value stat__value--electric">${Atlas.fmt.num(totalRecords)}</span></div>
        <div class="stat"><span class="stat__label">Employees</span><span class="stat__value">${users.length}</span></div>
        <div class="stat stat--amber"><span class="stat__label">Uploaded files</span><span class="stat__value stat__value--amber">${blobCount}</span></div>
        <div class="stat stat--green"><span class="stat__label">Storage used</span><span class="stat__value stat__value--green" style="font-size:1.4rem">${typeof Blobs !== 'undefined' ? Blobs.formatSize(blobSize) : usage.localStorageMB + 'MB'}</span></div>
      </div>

      <div class="list stagger">
        <article class="card" data-accent="electric">
          <div class="card__row">
            <div>
              <div class="card__title">Backup & restore</div>
              <div class="card__sub">Export everything to JSON. Import to restore. Do this before any big change.</div>
            </div>
            <div class="row" style="gap:0.5rem">
              <button class="btn" id="import">Import…</button>
              <button class="btn btn--primary" id="export">Download backup</button>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card__row">
            <div>
              <div class="card__title">Collections</div>
              <div class="card__sub">Record counts per DataStore collection.</div>
            </div>
          </div>
          <div class="card__body">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.5rem 1rem;font-family:var(--font-mono);font-size:0.8rem">
              ${Object.entries(counts).map(([k, v]) => `
                <div class="row spaced" style="padding:0.3rem 0;border-bottom:1px dashed var(--border)">
                  <span class="mute-2">${Atlas.safe(k)}</span>
                  <strong style="color:var(--copper)">${Atlas.fmt.num(v)}</strong>
                </div>
              `).join('')}
            </div>
          </div>
        </article>

        <article class="card" data-accent="amber">
          <div class="card__row">
            <div>
              <div class="card__title">Departments & groups</div>
              <div class="card__sub">${depts.length} departments · ${groups.length} groups</div>
            </div>
            <span class="badge badge--muted">Edit via Employees</span>
          </div>
        </article>

        <article class="card" data-accent="red">
          <div class="card__row">
            <div>
              <div class="card__title">Danger zone</div>
              <div class="card__sub">Wipe all data and reload with seed data. Only do this in testing.</div>
            </div>
            <button class="btn btn--danger" id="wipe">Wipe all data</button>
          </div>
        </article>
      </div>
    `;

    root.querySelector('#export').addEventListener('click', exportJSON);
    root.querySelector('#import').addEventListener('click', importJSON);
    root.querySelector('#wipe').addEventListener('click', wipeData);
  });
})();

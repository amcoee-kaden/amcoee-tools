/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Documents
   File uploads (IndexedDB Blob storage) OR URL links — tagged, searchable,
   previewable.
   ══════════════════════════════════════════════════════════════════════════════ */

(() => {
  const COLLECTION = 'documents';

  const TYPE = {
    pdf:      { label: 'PDF', accent: 'red' },
    spec:     { label: 'Spec', accent: 'blue' },
    manual:   { label: 'Manual', accent: 'amber' },
    permit:   { label: 'Permit', accent: 'green' },
    contract: { label: 'Contract', accent: 'electric' },
    safety:   { label: 'Safety', accent: 'amber' },
    image:    { label: 'Image', accent: 'violet' },
    other:    { label: 'Doc', accent: 'muted' },
  };

  // Guess type from extension or MIME
  function guessType(file) {
    const n = (file.name || '').toLowerCase();
    const m = (file.type || '').toLowerCase();
    if (m.startsWith('image/')) return 'image';
    if (n.endsWith('.pdf') || m.includes('pdf')) return 'pdf';
    if (/\.(doc|docx|rtf|txt|md)$/i.test(n)) return 'manual';
    if (/\.(xls|xlsx|csv)$/i.test(n)) return 'spec';
    return 'other';
  }

  const SEED = [
    { id: 'd_001', title: 'NEC 2023 Handbook — Excerpts',  type: 'manual',   link: '#', owner: 'Shop',       size: '12.4 MB', addedAt: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: 'd_002', title: 'Square D QO Panel Spec Sheet',  type: 'spec',     link: '#', owner: 'Jeremy',    size: '480 KB',  addedAt: new Date(Date.now() - 86400000 * 32).toISOString() },
    { id: 'd_003', title: 'COH Permit #P-2026-04-318',     type: 'permit',   link: '#', owner: 'Sarah',     size: '210 KB',  addedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'd_004', title: 'Greenfield MSA (Executed)',     type: 'contract', link: '#', owner: 'Jeremy',    size: '1.8 MB',  addedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: 'd_005', title: 'Arc Flash PPE — Field Guide',   type: 'safety',   link: '#', owner: 'Sarah',     size: '3.2 MB',  addedAt: new Date(Date.now() - 86400000 * 90).toISOString() },
    { id: 'd_006', title: 'Blue Oak Lighting Cut Sheet',   type: 'spec',     link: '#', owner: 'Kaden',     size: '1.1 MB',  addedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  ];

  async function seed() { const e = await DataStore.list(COLLECTION); if (!e.length) for (const d of SEED) await DataStore.create(COLLECTION, d); }

  function renderCard(d) {
    const t = TYPE[d.type] || TYPE.other;
    const hasFile = !!d.blobId;
    const hasLink = !!d.link && d.link !== '#';
    return `
      <article class="card" data-accent="${t.accent}" data-id="${Atlas.safe(d.id)}">
        <div class="card__row">
          <div class="row" style="gap:0.85rem;align-items:center">
            <div class="doc-icon doc-icon--${t.accent}">
              ${renderTypeIcon(d.type, hasFile)}
            </div>
            <div>
              <div class="card__title">${Atlas.safe(d.title)}</div>
              <div class="card__sub">${Atlas.safe(d.owner || '—')} · <span class="mono">${Atlas.safe(d.size || '—')}</span>${hasFile ? ' · <span class="mono" style="color:var(--signal-green)">uploaded</span>' : hasLink ? ' · <span class="mono" style="color:var(--electric)">link</span>' : ''}</div>
            </div>
          </div>
          <span class="badge badge--${t.accent}">${Atlas.safe(t.label)}</span>
        </div>
        <div class="card__meta">
          <span>Added <strong>${Atlas.fmt.date(d.addedAt)}</strong></span>
          ${hasFile ? `<button class="btn btn--sm" data-view="${Atlas.safe(d.id)}" style="margin-left:auto">${Atlas.ICONS.search} View</button><button class="btn btn--sm btn--primary" data-dl="${Atlas.safe(d.id)}">${Atlas.ICONS.download} Download</button>` : hasLink ? `<a href="${Atlas.safe(d.link)}" target="_blank" rel="noreferrer" class="btn btn--sm" style="margin-left:auto">Open link →</a>` : '<span class="mute-2" style="margin-left:auto">no file</span>'}
          <button class="btn btn--sm btn--ghost" data-del="${Atlas.safe(d.id)}" title="Delete">×</button>
        </div>
      </article>
    `;
  }

  function renderTypeIcon(type, isFile) {
    const common = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
    if (type === 'image')   return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
    if (type === 'pdf')     return `<svg ${common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/></svg>`;
    if (type === 'permit')  return `<svg ${common}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
    if (type === 'contract')return `<svg ${common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/><path d="M10 9h1"/></svg>`;
    if (type === 'safety')  return `<svg ${common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`;
    if (type === 'spec')    return `<svg ${common}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
    if (type === 'manual')  return `<svg ${common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
    return `<svg ${common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`;
  }

  function renderStats(items) {
    const uploaded = items.filter(i => i.blobId).length;
    return `
      <div class="stat-strip">
        <div class="stat"><span class="stat__label">Total docs</span><span class="stat__value">${items.length}</span></div>
        <div class="stat stat--green" data-filter="permit"><span class="stat__label">Permits</span><span class="stat__value stat__value--green">${items.filter(i => i.type === 'permit').length}</span></div>
        <div class="stat stat--electric" data-filter="contract"><span class="stat__label">Contracts</span><span class="stat__value stat__value--electric">${items.filter(i => i.type === 'contract').length}</span></div>
        <div class="stat stat--amber" data-filter="uploaded"><span class="stat__label">Uploaded files</span><span class="stat__value stat__value--amber">${uploaded}</span></div>
      </div>
    `;
  }

  function openDocDetail(d) {
    const t = TYPE[d.type] || TYPE.other;
    Shell.openDetail({
      record: d,
      collection: COLLECTION,
      eyebrow: 'Document',
      title: d.title,
      subtitle: (d.owner || '—') + (d.filename ? ' · ' + d.filename : ''),
      accent: t.accent,
      badges: [{ label: t.label, variant: t.accent }, ...(d.blobId ? [{ label: 'UPLOADED', variant: 'green' }] : [])],
      fields: [
        { label: 'Title', key: 'title' },
        { label: 'Type', key: 'type', type: 'select', options: Object.entries(TYPE).map(([k, v]) => [k, v.label]) },
        { label: 'Owner', key: 'owner' },
        { label: 'Size', key: 'size' },
        { label: 'Filename', key: 'filename' },
        { label: 'MIME', key: 'mime' },
        { label: 'Link', key: 'link' },
        { label: 'Added', value: Atlas.fmt.datetime(d.addedAt) },
      ],
      actions: [
        d.blobId ? { id: 'download', label: 'Download', variant: 'primary', onClick: async (rec) => { await Blobs.download(rec.blobId); UI.toast('Downloaded', 'success'); } } : null,
        d.blobId ? { id: 'view', label: 'Open in tab', variant: 'ghost', onClick: async (rec) => { await Blobs.openInTab(rec.blobId); } } : null,
        (d.link && d.link !== '#') ? { id: 'openlink', label: 'Open link', variant: 'ghost', onClick: async (rec) => { window.open(rec.link, '_blank', 'noopener'); } } : null,
      ].filter(Boolean),
    });
  }

  function openModal(onSaved, session) {
    const html = `
      <div class="modal__head"><h2 class="modal__title">Add a <em>document</em></h2><button class="modal__close" data-action="close">${Atlas.ICONS.close}</button></div>
      <form class="modal__body" id="f" enctype="multipart/form-data">

        <div class="doc-dropzone" id="dropzone">
          <input type="file" id="fileInput" hidden accept="*/*"/>
          <div class="doc-dropzone__hint">${Atlas.ICONS.upload}<span>Drop a file here, or <strong style="color:var(--copper)">click to browse</strong></span><span class="mute-2" style="font-size:0.72rem">Max 25 MB · PDF, images, docs, anything</span></div>
          <div class="doc-dropzone__picked" id="picked" hidden></div>
        </div>

        <div class="divider--dashed" style="margin:0.5rem 0"><span style="display:inline-block;padding:0 0.5rem;background:var(--surface-1);font-family:var(--font-mono);font-size:0.68rem;color:var(--ink-4);letter-spacing:0.12em;text-transform:uppercase;position:relative;top:-0.6rem">or</span></div>

        <div class="field"><label class="field__label">Link to document (URL)</label><input class="input" name="link" type="url" placeholder="https://…"/></div>

        <div class="divider"></div>

        <div class="field"><label class="field__label">Title</label><input class="input" name="title" required/></div>
        <div class="form-grid">
          <div class="field"><label class="field__label">Type</label><select class="select" name="type" id="typeSel">${Object.entries(TYPE).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
          <div class="field"><label class="field__label">Owner</label><input class="input" name="owner" value="${Atlas.safe((session?.name || '').split(' ')[0])}"/></div>
        </div>
        <div class="modal__foot"><button type="button" class="btn btn--ghost" data-action="close">Cancel</button><button type="submit" class="btn btn--primary">${Atlas.ICONS.plus}Save</button></div>
      </form>
    `;
    const { modal, close } = UI.showModal(html, { className: 'modal--wide' });
    modal.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', close));

    const dz = modal.querySelector('#dropzone');
    const fileInput = modal.querySelector('#fileInput');
    const picked = modal.querySelector('#picked');
    const titleInput = modal.querySelector('[name="title"]');
    const typeSel = modal.querySelector('#typeSel');
    let pickedFile = null;

    function showPicked(file) {
      pickedFile = file;
      picked.hidden = false;
      dz.querySelector('.doc-dropzone__hint').hidden = true;
      picked.innerHTML = `
        <div class="row" style="gap:0.85rem;align-items:center;width:100%">
          <div class="doc-icon doc-icon--copper" style="flex-shrink:0">${renderTypeIcon(guessType(file), true)}</div>
          <div class="col col--gap-sm" style="min-width:0;flex:1">
            <strong style="color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Atlas.safe(file.name)}</strong>
            <span class="mono" style="font-size:0.75rem;color:var(--ink-4)">${Blobs.formatSize(file.size)} · ${Atlas.safe(file.type || 'file')}</span>
          </div>
          <button type="button" class="btn btn--sm btn--ghost" id="clearFile">Remove</button>
        </div>
      `;
      picked.querySelector('#clearFile').addEventListener('click', clearFile);
      if (!titleInput.value) titleInput.value = file.name.replace(/\.[^.]+$/, '');
      typeSel.value = guessType(file);
    }

    function clearFile() {
      pickedFile = null;
      fileInput.value = '';
      picked.hidden = true;
      dz.querySelector('.doc-dropzone__hint').hidden = false;
    }

    dz.addEventListener('click', (e) => {
      if (e.target.closest('button, #picked')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const f = e.target.files[0];
      if (f) showPicked(f);
    });

    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('is-drag');
    }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === 'dragleave' && dz.contains(e.relatedTarget)) return;
      dz.classList.remove('is-drag');
    }));
    dz.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files[0];
      if (f) showPicked(f);
    });

    modal.querySelector('#f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = modal.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
      try {
        const d = Object.fromEntries(new FormData(e.target));
        d.addedAt = new Date().toISOString();
        if (pickedFile) {
          const blobId = await Blobs.put(pickedFile);
          d.blobId = blobId;
          d.size = Blobs.formatSize(pickedFile.size);
          d.mime = pickedFile.type;
          d.filename = pickedFile.name;
        }
        await DataStore.create(COLLECTION, d);
        close();
        UI.toast(pickedFile ? 'File uploaded' : 'Document saved', 'success');
        onSaved && onSaved();
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${Atlas.ICONS.plus}Save`;
        UI.toast('Save failed: ' + err.message, 'error', 5000);
      }
    });
  }

  Atlas.registerRenderer('documents', async function (root, session) {
    await seed();
    let items = await DataStore.list(COLLECTION);
    let query = '', filter = 'all';
    let syncStats;

    function filtered() {
      return items.filter(i => {
        if (filter === 'uploaded' && !i.blobId) return false;
        if (filter !== 'all' && filter !== 'uploaded' && i.type !== filter) return false;
        if (!query) return true;
        return (i.title + ' ' + (i.owner || '')).toLowerCase().includes(query.toLowerCase());
      }).sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    }

    function paintShell() {
      root.innerHTML = `
        <header class="page-head">
          <div class="page-head__meta">
            <div class="page-head__rubric"><span class="page-head__rubric-chip">❒ DOCS</span><span>Uploads · links</span></div>
            <h1 class="page-head__title">Every <em>document</em>, one search away.</h1>
            <p class="page-head__sub">Upload PDFs, permits, cut sheets, contracts, or photos — or drop a link. Stored in your browser, searchable from Ctrl+K.</p>
          </div>
          <div class="page-head__actions"><button class="btn btn--primary" id="new">${Atlas.ICONS.upload}Add document</button></div>
        </header>
        <div id="stats-slot">${renderStats(items)}</div>
        <div class="toolbar">
          <div class="toolbar__search">${Atlas.ICONS.search}<input id="search" type="search" placeholder="Search titles, owners…" autocomplete="off"/></div>
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
        if (rec) openDocDetail(rec);
      });
      syncStats = Atlas.wireStats(root.querySelector('.stat-strip'), { getFilter: () => filter, setFilter: (f) => { filter = f; paintChips(); paintList(); } });
      paintChips(); paintList();
    }
    function paintChips() {
      const el = root.querySelector('#chips');
      const pairs = [['all','All'], ['uploaded','Uploaded'], ...Object.entries(TYPE).map(([k, v]) => [k, v.label])];
      el.innerHTML = pairs.map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${filter === k}">${l}</button>`).join('');
      el.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { filter = c.dataset.s; paintChips(); paintList(); syncStats && syncStats(); }));
    }
    function paintList() {
      const f = filtered();
      const listEl = root.querySelector('#list');
      listEl.innerHTML = f.length ? f.map(renderCard).join('') : `<div class="empty"><div class="empty__art">${Atlas.illustration('doc')}</div><div class="empty__title">No documents</div><div class="empty__msg">Drop your first file in.</div></div>`;
      listEl.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', async () => {
        const doc = items.find(x => x.id === b.dataset.dl);
        if (doc && doc.blobId) { await Blobs.download(doc.blobId); UI.toast('Downloaded', 'success'); }
      }));
      listEl.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', async () => {
        const doc = items.find(x => x.id === b.dataset.view);
        if (doc && doc.blobId) await Blobs.openInTab(doc.blobId);
      }));
      listEl.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
        const doc = items.find(x => x.id === b.dataset.del);
        if (!doc) return;
        if (!await UI.confirm('Delete document?', `Remove "${doc.title}"${doc.blobId ? ' and its uploaded file' : ''}.`, { danger: true, confirmLabel: 'Delete' })) return;
        if (doc.blobId) { try { await Blobs.remove(doc.blobId); } catch {} }
        await DataStore.remove(COLLECTION, doc.id);
        UI.toast('Deleted', 'info');
      }));
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

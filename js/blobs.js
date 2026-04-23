/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · Blobs
   Direct IndexedDB blob storage for file uploads.
   Separate database from amcoee_db to keep binary data isolated.
   ══════════════════════════════════════════════════════════════════════════════ */

const Blobs = (() => {
  const DB = 'amcoee_blobs';
  const VERSION = 1;
  const STORE = 'files';
  let db = null;

  // Per-file upload cap (25 MB) and total recommended (~400 MB)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  function open() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => { reject(e.target.error); };
    });
  }

  async function put(file) {
    if (!(file instanceof Blob)) throw new Error('Blobs.put requires a Blob or File');
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large (${(file.size / 1048576).toFixed(1)} MB). Max ${MAX_FILE_SIZE / 1048576} MB.`);
    }
    const d = await open();
    const id = 'blob_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    const rec = {
      id,
      blob: file,
      name: file.name || 'file',
      mime: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = () => resolve(id);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function get(id) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function remove(id) {
    const d = await open();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function objectUrl(id) {
    const rec = await get(id);
    if (!rec) return null;
    return URL.createObjectURL(rec.blob);
  }

  async function download(id) {
    const rec = await get(id);
    if (!rec) { console.warn('[Blobs] blob not found:', id); return; }
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = rec.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function openInTab(id) {
    const rec = await get(id);
    if (!rec) return;
    const url = URL.createObjectURL(rec.blob);
    window.open(url, '_blank', 'noopener');
    // Don't revoke immediately — the new tab needs the URL
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function formatSize(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
  }

  async function totalSize() {
    const d = await open();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.reduce((a, r) => a + (r.size || 0), 0));
      req.onerror = () => resolve(0);
    });
  }

  async function listAll() {
    const d = await open();
    return new Promise((resolve) => {
      const tx = d.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  // Kick off DB open on module load so the schema is ready
  open().catch(() => {});

  return { put, get, remove, objectUrl, download, openInTab, formatSize, totalSize, listAll, MAX_FILE_SIZE };
})();

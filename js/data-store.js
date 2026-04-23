/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — DataStore
   Abstraction layer: localStorage + IndexedDB now, Firebase later
   ══════════════════════════════════════════════════════════════════════════════ */

const DataStore = (() => {
  const DB_NAME = 'amcoee_db';
  const DB_VERSION = 2;
  let db = null;

  const LS_COLLECTIONS = ['users', 'departments', 'groups', 'group_members',
    'dashboard_layouts', 'app_config', 'sessions'];

  const IDB_COLLECTIONS = [
    // Core
    'audit_log', 'analytics_events', 'approvals', 'notifications', 'certifications',
    // Atlas tool collections
    'jobs', 'schedule', 'clock_entries', 'tool_assets',
    'inventory', 'fleet', 'crm', 'invoices', 'expenses',
    'payroll', 'pay_periods', 'announcements', 'documents', 'safety',
  ];

  const BUDGETS = {
    analytics_events: 10000,
    audit_log: 5000,
    sessions: 500,
    notifications: 1000,
  };

  function lsKey(collection) { return `amcoee_${collection}`; }

  function lsRead(collection) {
    try {
      return JSON.parse(localStorage.getItem(lsKey(collection)) || '[]');
    } catch { return []; }
  }

  function lsWrite(collection, data) {
    try {
      localStorage.setItem(lsKey(collection), JSON.stringify(data));
    } catch (e) {
      console.error(`[DataStore] localStorage write failed for ${collection}:`, e);
    }
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const d = e.target.result;
        IDB_COLLECTIONS.forEach(name => {
          if (!d.objectStoreNames.contains(name)) {
            const store = d.createObjectStore(name, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('userId', 'userId', { unique: false });
          }
        });
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => {
        console.error('[DataStore] IndexedDB open failed, falling back to localStorage');
        reject(e);
      };
    });
  }

  async function idbRead(collection) {
    try {
      const d = await openDB();
      return new Promise((resolve) => {
        const tx = d.transaction(collection, 'readonly');
        const store = tx.objectStore(collection);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch { return lsRead(collection); }
  }

  async function idbWrite(collection, records) {
    try {
      const d = await openDB();
      return new Promise((resolve) => {
        const tx = d.transaction(collection, 'readwrite');
        const store = tx.objectStore(collection);
        store.clear();
        records.forEach(r => store.put(r));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch { lsWrite(collection, records); }
  }

  async function idbPut(collection, record) {
    try {
      const d = await openDB();
      return new Promise((resolve) => {
        const tx = d.transaction(collection, 'readwrite');
        tx.objectStore(collection).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch { /* fallback handled by caller */ }
  }

  const MAX_RECORD_SIZE = 50 * 1024; // 50KB

  function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    // Log suspicious content
    if (str.length > 10000) {
      console.warn('[DataStore] Suspiciously long string detected:', str.length, 'chars');
    }
    if (/<script[\s>]/i.test(str) || /javascript:/i.test(str) || /on\w+\s*=/i.test(str)) {
      console.warn('[DataStore] Potential XSS content detected in data');
    }
    // Use DOMPurify if available, otherwise basic sanitization
    if (typeof DOMPurify !== 'undefined') {
      return DOMPurify.sanitize(str);
    }
    // Fallback: strip script tags and event handlers
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
  }

  function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[sanitizeString(key)] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  }

  function checkRecordSize(data) {
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_RECORD_SIZE) {
      throw new Error(`[DataStore] Record exceeds max size of ${MAX_RECORD_SIZE} bytes (got ${serialized.length})`);
    }
  }

  function isLS(collection) { return LS_COLLECTIONS.includes(collection); }

  async function list(collection, filters) {
    let records = isLS(collection) ? lsRead(collection) : await idbRead(collection);
    records = records.filter(r => !r._deleted);
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        records = records.filter(r => r[key] === val);
      });
    }
    return records;
  }

  async function get(collection, id) {
    const records = await list(collection);
    return records.find(r => r.id === id) || null;
  }

  async function create(collection, data) {
    const sanitizedData = sanitizeObject(data);
    checkRecordSize(sanitizedData);

    const record = {
      ...sanitizedData,
      id: data.id || ('id_' + Date.now() + '_' + Math.floor(Math.random() * 9999)),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      _schemaVersion: 1,
    };

    if (isLS(collection)) {
      const records = lsRead(collection);
      records.push(record);
      lsWrite(collection, records);
    } else {
      await idbPut(collection, record);
      await enforceBudget(collection);
    }

    AppEvents.emit('data:create', { collection, record });
    AppEvents.emit(`data:${collection}:create`, record);
    return record;
  }

  async function update(collection, id, patch) {
    const sanitizedPatch = sanitizeObject(patch);
    checkRecordSize(sanitizedPatch);

    if (isLS(collection)) {
      const records = lsRead(collection);
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;
      const old = { ...records[idx] };
      records[idx] = { ...records[idx], ...sanitizedPatch, modifiedAt: new Date().toISOString() };
      lsWrite(collection, records);
      AppEvents.emit('data:update', { collection, record: records[idx], old });
      AppEvents.emit(`data:${collection}:update`, { record: records[idx], old });
      return records[idx];
    } else {
      const records = await idbRead(collection);
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;
      const old = { ...records[idx] };
      records[idx] = { ...records[idx], ...sanitizedPatch, modifiedAt: new Date().toISOString() };
      await idbPut(collection, records[idx]);
      AppEvents.emit('data:update', { collection, record: records[idx], old });
      AppEvents.emit(`data:${collection}:update`, { record: records[idx], old });
      return records[idx];
    }
  }

  async function remove(collection, id) {
    return update(collection, id, { _deleted: true, deletedAt: new Date().toISOString() });
  }

  async function query(collection, { where, orderBy, limit: lim } = {}) {
    let records = await list(collection);
    if (where) {
      Object.entries(where).forEach(([key, val]) => {
        if (typeof val === 'object' && val !== null) {
          if (val.$gt !== undefined) records = records.filter(r => r[key] > val.$gt);
          if (val.$lt !== undefined) records = records.filter(r => r[key] < val.$lt);
          if (val.$gte !== undefined) records = records.filter(r => r[key] >= val.$gte);
          if (val.$lte !== undefined) records = records.filter(r => r[key] <= val.$lte);
          if (val.$in !== undefined) records = records.filter(r => val.$in.includes(r[key]));
        } else {
          records = records.filter(r => r[key] === val);
        }
      });
    }
    if (orderBy) {
      const [field, dir] = orderBy.split(':');
      records.sort((a, b) => {
        if (a[field] < b[field]) return dir === 'desc' ? 1 : -1;
        if (a[field] > b[field]) return dir === 'desc' ? -1 : 1;
        return 0;
      });
    }
    if (lim) records = records.slice(0, lim);
    return records;
  }

  async function enforceBudget(collection) {
    const budget = BUDGETS[collection];
    if (!budget) return;
    const records = await idbRead(collection);
    if (records.length > budget) {
      records.sort((a, b) => (a.timestamp || a.createdAt || '').localeCompare(b.timestamp || b.createdAt || ''));
      const trimmed = records.slice(records.length - budget);
      await idbWrite(collection, trimmed);
    }
  }

  async function exportAll() {
    const dump = {};
    for (const c of [...LS_COLLECTIONS, ...IDB_COLLECTIONS]) {
      dump[c] = isLS(c) ? lsRead(c) : await idbRead(c);
    }
    dump._exportedAt = new Date().toISOString();
    dump._schemaVersion = 1;
    return dump;
  }

  async function importAll(dump) {
    for (const c of [...LS_COLLECTIONS, ...IDB_COLLECTIONS]) {
      if (!dump[c]) continue;
      if (isLS(c)) {
        lsWrite(c, dump[c]);
      } else {
        await idbWrite(c, dump[c]);
      }
    }
    AppEvents.emit('data:imported');
  }

  function getStorageUsage() {
    let lsBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('amcoee_')) {
        lsBytes += localStorage.getItem(key).length * 2;
      }
    }
    return {
      localStorageBytes: lsBytes,
      localStorageMB: (lsBytes / 1048576).toFixed(2),
      localStoragePercent: ((lsBytes / 5242880) * 100).toFixed(1),
    };
  }

  openDB().catch(() => {});

  return {
    list, get, create, update, remove, query,
    exportAll, importAll, getStorageUsage,
    LS_COLLECTIONS, IDB_COLLECTIONS, BUDGETS
  };
})();

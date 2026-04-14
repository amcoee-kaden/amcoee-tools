# Owner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Owner/Head Admin command center dashboard with 5-tier role hierarchy, DataStore abstraction, analytics engine, audit system, org management, approval queue, and security hardening.

**Architecture:** Vanilla JS SPA on GitHub Pages. All state in localStorage/IndexedDB via a DataStore abstraction layer. Modules communicate via an event bus. Each file is a self-contained IIFE exposing a global. CDN libraries loaded with SRI hashes. No build step — push to deploy.

**Tech Stack:** Vanilla JS, CSS custom properties, Chart.js 4.x, CryptoJS 4.x, DOMPurify 3.x, Sortable.js 1.x, Day.js 1.x, Fuse.js 7.x, SheetJS 0.18, html2canvas 1.x

---

## File Structure

```
amcoee-tools/
  index.html                     # SPA entry — modify: add CDN scripts, CSP meta, notification bell, owner-dashboard route
  css/
    design-system.css            # Existing — modify: add owner dashboard component styles
    owner-dashboard.css          # Create: all owner dashboard panel/grid styles
  js/
    auth.js                      # Existing — REWRITE: 5-tier roles, PIN hashing, lockout, session tokens, fingerprinting
    router.js                    # Existing — no changes needed
    theme.js                     # Existing — no changes needed
    ui.js                        # Existing — modify: add re-auth modal, notification dropdown
    data-store.js                # Create: localStorage + IndexedDB abstraction with storage budgets
    event-bus.js                 # Create: pub/sub cross-module communication
    permission-guard.js          # Create: cascading dot-notation permission checks
    audit-log.js                 # Create: append-only log with hash chain integrity
    analytics-engine.js          # Create: event tracking, aggregation, behavioral signals
    security-monitor.js          # Create: session tracking, lockout, anomaly detection, fingerprinting
    owner-dashboard.js           # Create: command center renderer (all 4 rows + FAB + alerts)
    org-manager.js               # Create: departments, groups, employee lifecycle, onboarding/offboarding
    approval-queue.js            # Create: approval workflow engine with inline actions
    report-builder.js            # Create: custom report generation with Chart.js
    tool-registry.js             # Create: plugin registration system for future tools
    schema-migrations.js         # Create: versioned data migration runner
  sw.js                          # Create: service worker for offline CDN caching
```

---

### Task 1: Event Bus

**Files:**
- Create: `js/event-bus.js`

This is a dependency for almost every other module. Zero dependencies itself.

- [ ] **Step 1: Create event bus module**

Create `js/event-bus.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Event Bus
   Pub/sub system for cross-module communication
   ══════════════════════════════════════════════════════════════════════════════ */

const AppEvents = (() => {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    // Return unsubscribe function
    return () => {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    };
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    if (callback) {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    } else {
      delete listeners[event];
    }
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[AppEvents] Error in listener for "${event}":`, e); }
    });
  }

  function once(event, callback) {
    const unsub = on(event, (data) => {
      unsub();
      callback(data);
    });
    return unsub;
  }

  return { on, off, emit, once };
})();
```

- [ ] **Step 2: Verify in browser console**

Open `index.html` in browser, open devtools console, paste:
```javascript
const unsub = AppEvents.on('test', (d) => console.log('Got:', d));
AppEvents.emit('test', { hello: 'world' });
// Expected: "Got: {hello: 'world'}"
unsub();
AppEvents.emit('test', { hello: 'gone' });
// Expected: nothing logged
```

- [ ] **Step 3: Add script tag to index.html**

In `index.html`, add before the existing `<script src="js/auth.js">` line:

```html
<script src="js/event-bus.js"></script>
```

- [ ] **Step 4: Commit**

```bash
git add js/event-bus.js index.html
git commit -m "feat: add event bus for cross-module pub/sub"
```

---

### Task 2: DataStore Abstraction Layer

**Files:**
- Create: `js/data-store.js`

All data reads/writes go through this. Uses localStorage for small/hot data and IndexedDB for bulk storage. Every mutation emits an event on the bus and returns the affected record.

- [ ] **Step 1: Create DataStore module**

Create `js/data-store.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — DataStore
   Abstraction layer: localStorage + IndexedDB now, Firebase later
   ══════════════════════════════════════════════════════════════════════════════ */

const DataStore = (() => {
  const DB_NAME = 'amcoee_db';
  const DB_VERSION = 1;
  let db = null;

  // Collections that stay in localStorage (hot, small)
  const LS_COLLECTIONS = ['users', 'departments', 'groups', 'group_members',
    'dashboard_layouts', 'app_config', 'sessions'];

  // Collections that go to IndexedDB (bulk, large)
  const IDB_COLLECTIONS = ['audit_log', 'analytics_events', 'approvals',
    'announcements', 'notifications', 'pay_periods', 'certifications'];

  // Storage budgets (max records before rotation)
  const BUDGETS = {
    analytics_events: 10000,
    audit_log: 5000,
    sessions: 500,
    notifications: 1000,
  };

  // ── localStorage helpers ──────────────────────────────────────────────
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

  // ── IndexedDB helpers ─────────────────────────────────────────────────
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
    } catch { return lsRead(collection); } // fallback
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

  function isLS(collection) { return LS_COLLECTIONS.includes(collection); }

  // ── Public API ─────────────────────────────────────────────────────────
  async function list(collection, filters) {
    let records = isLS(collection) ? lsRead(collection) : await idbRead(collection);
    // Filter out soft-deleted
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
    const record = {
      ...data,
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
      await enforeBudget(collection);
    }

    AppEvents.emit('data:create', { collection, record });
    AppEvents.emit(`data:${collection}:create`, record);
    return record;
  }

  async function update(collection, id, patch) {
    if (isLS(collection)) {
      const records = lsRead(collection);
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;
      const old = { ...records[idx] };
      records[idx] = { ...records[idx], ...patch, modifiedAt: new Date().toISOString() };
      lsWrite(collection, records);
      AppEvents.emit('data:update', { collection, record: records[idx], old });
      AppEvents.emit(`data:${collection}:update`, { record: records[idx], old });
      return records[idx];
    } else {
      const records = await idbRead(collection);
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;
      const old = { ...records[idx] };
      records[idx] = { ...records[idx], ...patch, modifiedAt: new Date().toISOString() };
      await idbPut(collection, records[idx]);
      AppEvents.emit('data:update', { collection, record: records[idx], old });
      AppEvents.emit(`data:${collection}:update`, { record: records[idx], old });
      return records[idx];
    }
  }

  async function remove(collection, id) {
    // Soft delete
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

  async function enforeBudget(collection) {
    const budget = BUDGETS[collection];
    if (!budget) return;
    const records = await idbRead(collection);
    if (records.length > budget) {
      // Sort by timestamp ascending, keep newest
      records.sort((a, b) => (a.timestamp || a.createdAt || '').localeCompare(b.timestamp || b.createdAt || ''));
      const trimmed = records.slice(records.length - budget);
      await idbWrite(collection, trimmed);
    }
  }

  // ── Bulk operations ────────────────────────────────────────────────────
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
        lsBytes += localStorage.getItem(key).length * 2; // UTF-16
      }
    }
    return {
      localStorageBytes: lsBytes,
      localStorageMB: (lsBytes / 1048576).toFixed(2),
      localStoragePercent: ((lsBytes / 5242880) * 100).toFixed(1), // 5MB assumed limit
    };
  }

  // Init IndexedDB on load
  openDB().catch(() => {});

  return {
    list, get, create, update, remove, query,
    exportAll, importAll, getStorageUsage,
    LS_COLLECTIONS, IDB_COLLECTIONS, BUDGETS
  };
})();
```

- [ ] **Step 2: Add script tag to index.html**

In `index.html`, add after the event-bus script and before auth.js:

```html
<script src="js/data-store.js"></script>
```

- [ ] **Step 3: Verify in browser**

Open devtools console:
```javascript
await DataStore.create('departments', { name: 'Operations', color: '#22c55e' });
const depts = await DataStore.list('departments');
console.log(depts); // Should show the department with auto-generated id and timestamps
await DataStore.remove('departments', depts[0].id);
```

- [ ] **Step 4: Commit**

```bash
git add js/data-store.js index.html
git commit -m "feat: add DataStore abstraction layer with localStorage + IndexedDB"
```

---

### Task 3: Permission Guard

**Files:**
- Create: `js/permission-guard.js`

Cascading dot-notation permission system. Depends on nothing except the role config (which we'll update in auth.js later).

- [ ] **Step 1: Create PermissionGuard module**

Create `js/permission-guard.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Permission Guard
   Cascading dot-notation permission system with 5-tier roles
   ══════════════════════════════════════════════════════════════════════════════ */

const PermissionGuard = (() => {

  // Permission sets per role
  const ROLE_PERMISSIONS = {
    owner: ['*'], // Wildcard: all permissions
    head_admin: ['*'],
    admin: [
      'dashboard', 'jobs', 'timeclock', 'crm', 'invoicing', 'scheduling',
      'inventory', 'documents', 'safety', 'fleet', 'announcements',
      'expenses', 'reporting', 'employees.view', 'employees.edit.own-dept',
      'payroll.view.own-dept', 'settings', 'tool-tracker'
    ],
    office: [
      'dashboard', 'jobs', 'timeclock', 'crm', 'invoicing', 'scheduling',
      'inventory', 'documents', 'safety', 'fleet', 'announcements',
      'expenses', 'reporting.limited', 'tool-tracker'
    ],
    field: [
      'dashboard', 'jobs.own', 'timeclock', 'scheduling.own',
      'inventory.request', 'documents.safety', 'safety',
      'fleet.assigned', 'announcements', 'expenses.submit', 'tool-tracker'
    ]
  };

  // Tier numbers for comparison
  const ROLE_TIERS = {
    owner: 0,
    head_admin: 1,
    admin: 2,
    office: 3,
    field: 4
  };

  // Owner-only permissions (Head Admin cannot use these)
  const OWNER_ONLY = ['data.wipe', 'owner.modify-head-admin'];

  /**
   * Check if a role has a specific permission.
   * Cascade rule: 'org' grants 'org.departments', 'org.departments.create', etc.
   * Wildcard: '*' grants everything.
   */
  function hasPermission(role, permission) {
    if (!role || !permission) return false;
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;

    // Check owner-only restrictions
    if (OWNER_ONLY.includes(permission) && role !== 'owner') return false;

    // Wildcard check
    if (perms.includes('*')) return true;

    // Exact match
    if (perms.includes(permission)) return true;

    // Cascade: check if any granted permission is a parent of the requested one
    // e.g., granted 'org' should match request for 'org.departments.create'
    for (const p of perms) {
      if (permission.startsWith(p + '.')) return true;
    }

    // Reverse: check if requested permission is a parent of a granted sub-permission
    // e.g., request 'jobs' should match if 'jobs.own' is granted (they have some access)
    for (const p of perms) {
      if (p.startsWith(permission + '.')) return true;
    }

    return false;
  }

  /**
   * Check permission for the current session user.
   */
  function check(permission) {
    const session = Auth.getSession();
    if (!session) return false;
    return hasPermission(session.role, permission);
  }

  /**
   * Get the tier number for a role (lower = more powerful).
   */
  function getTier(role) {
    return ROLE_TIERS[role] !== undefined ? ROLE_TIERS[role] : 999;
  }

  /**
   * Can userA modify userB? (based on tier hierarchy)
   */
  function canModify(roleA, roleB) {
    const tierA = getTier(roleA);
    const tierB = getTier(roleB);
    // Can only modify users at a lower tier (higher number)
    // Exception: owner can modify anyone
    if (roleA === 'owner') return true;
    // Head admin can modify anyone except owner
    if (roleA === 'head_admin' && roleB !== 'owner') return true;
    // Others can only modify strictly lower tiers
    return tierA < tierB;
  }

  /**
   * Check if role has owner-level dashboard access.
   */
  function hasOwnerDashboard(role) {
    return role === 'owner' || role === 'head_admin';
  }

  /**
   * Get all permissions for a role (resolved, not raw).
   */
  function getPermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Get all available roles.
   */
  function getRoles() {
    return Object.entries(ROLE_TIERS)
      .sort(([, a], [, b]) => a - b)
      .map(([role, tier]) => ({ role, tier, permissions: ROLE_PERMISSIONS[role] }));
  }

  return {
    hasPermission, check, getTier, canModify,
    hasOwnerDashboard, getPermissions, getRoles,
    ROLE_PERMISSIONS, ROLE_TIERS, OWNER_ONLY
  };
})();
```

- [ ] **Step 2: Add script tag to index.html**

In `index.html`, add after `data-store.js` and before `auth.js`:

```html
<script src="js/permission-guard.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add js/permission-guard.js index.html
git commit -m "feat: add PermissionGuard with cascading dot-notation permissions"
```

---

### Task 4: Rewrite Auth with 5-Tier Roles, PIN Hashing, Lockout, Sessions

**Files:**
- Modify: `js/auth.js` (full rewrite)
- Modify: `index.html` (add CryptoJS CDN, update login flow for lockout + variable PIN length)

This is the biggest foundational change. The existing auth.js is replaced entirely.

- [ ] **Step 1: Add CDN scripts to index.html head**

In `index.html` `<head>`, after the Google Fonts link, add:

```html
<!-- Security & Utility Libraries -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js" integrity="sha512-a+SUDuwNzXDvz4XrIcXHuCf089/iJAoN4lmrXJg18XnduKK6YlDHNRalv4yd1N40OKI80tFidF+rqTFKGPoWFQ==" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
```

- [ ] **Step 2: Rewrite auth.js**

Replace the entire contents of `js/auth.js` with:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Auth & Session Management
   5-tier roles, PIN hashing, lockout, session tokens, fingerprinting
   ══════════════════════════════════════════════════════════════════════════════ */

const Auth = (() => {
  const SESSION_KEY = 'amcoee_session';
  const USERS_KEY = 'amcoee_users';
  const PREFS_KEY = 'amcoee_prefs';
  const LOCKOUT_KEY = 'amcoee_lockouts';
  const RECOVERY_KEY = 'amcoee_recovery';

  // ── Role Configuration ──────────────────────────────────────────────────
  const ROLE_CONFIG = {
    owner:      { label: 'Owner',              color: '#ef4444', tier: 0 },
    head_admin: { label: 'Head Administrator', color: '#f97316', tier: 1 },
    admin:      { label: 'Administrator',      color: '#a855f7', tier: 2 },
    office:     { label: 'Office Staff',       color: '#3b82f6', tier: 3 },
    field:      { label: 'Field Technician',   color: '#22c55e', tier: 4 },
  };

  // ── Default Users (PINs will be hashed on first load) ───────────────────
  const DEFAULT_USERS = [
    { id: 'u1', name: 'Jeremy Silva',   email: 'jeremy@amcoee.com', role: 'owner',      pin: null, rawPin: '567890', avatar: 'JS', department: null, status: 'active' },
    { id: 'u2', name: 'Kaden DaSilva',  email: 'kaden@amcoee.com',  role: 'head_admin', pin: null, rawPin: '123456', avatar: 'KD', department: null, status: 'active' },
    { id: 'u3', name: 'Mike Torres',    email: 'mike@amcoee.com',   role: 'field',      pin: null, rawPin: '1111',   avatar: 'MT', department: null, status: 'active' },
    { id: 'u4', name: 'Sarah Ochoa',    email: 'sarah@amcoee.com',  role: 'office',     pin: null, rawPin: '2222',   avatar: 'SO', department: null, status: 'active' },
    { id: 'u5', name: 'James Bell',     email: 'james@amcoee.com',  role: 'field',      pin: null, rawPin: '3333',   avatar: 'JB', department: null, status: 'active' },
    { id: 'u6', name: 'Dana Clark',     email: 'dana@amcoee.com',   role: 'office',     pin: null, rawPin: '4444',   avatar: 'DC', department: null, status: 'active' },
  ];

  const DEFAULT_PREFS = {
    theme: 'dark',
    accentColor: '#f97316',
    sidebarCollapsed: false,
    dashboardLayout: 'default',
    notifications: true,
    sessionTimeout: 480, // minutes (8 hours)
    pinLength: 4, // minimum PIN length for this user
  };

  // ── PIN Hashing ─────────────────────────────────────────────────────────
  function hashPin(pin) {
    return CryptoJS.SHA256(pin + '_amcoee_salt_2026').toString();
  }

  // ── User Management ─────────────────────────────────────────────────────
  function getUsers() {
    try {
      let users = JSON.parse(localStorage.getItem(USERS_KEY));
      if (!users) {
        // First load: hash default PINs
        users = DEFAULT_USERS.map(u => {
          const hashed = { ...u, pin: hashPin(u.rawPin) };
          delete hashed.rawPin;
          return hashed;
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      return users;
    } catch {
      return DEFAULT_USERS;
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getUserById(id) {
    return getUsers().find(u => u.id === id) || null;
  }

  // ── Lockout Management ──────────────────────────────────────────────────
  function getLockouts() {
    try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveLockouts(lockouts) {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockouts));
  }

  function isLockedOut(userId) {
    const lockouts = getLockouts();
    const entry = lockouts[userId];
    if (!entry) return false;
    if (entry.lockedUntil && new Date(entry.lockedUntil) > new Date()) {
      return true;
    }
    // Lockout expired, reset
    if (entry.lockedUntil) {
      entry.attempts = 0;
      entry.lockedUntil = null;
      saveLockouts(lockouts);
    }
    return false;
  }

  function recordFailedAttempt(userId) {
    const lockouts = getLockouts();
    if (!lockouts[userId]) lockouts[userId] = { attempts: 0, lockedUntil: null };
    lockouts[userId].attempts++;
    if (lockouts[userId].attempts >= 5) {
      lockouts[userId].lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
    }
    saveLockouts(lockouts);
    return lockouts[userId];
  }

  function clearLockout(userId) {
    const lockouts = getLockouts();
    delete lockouts[userId];
    saveLockouts(lockouts);
  }

  // ── Device Fingerprint ──────────────────────────────────────────────────
  function getDeviceFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const renderer = gl ? gl.getParameter(gl.UNMASKED_RENDERER_WEBGL) : 'unknown';
    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      renderer
    ].join('|');
    return CryptoJS.SHA256(raw).toString().slice(0, 16);
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} / ${os}`;
  }

  // ── Session Management ──────────────────────────────────────────────────
  function generateSessionToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  function getSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored);

      // Check expiration
      const prefs = getPrefs(session.userId);
      const timeoutMs = (prefs.sessionTimeout || 480) * 60 * 1000;
      const lastActivity = new Date(session.lastActivity || session.loginTime);
      if (Date.now() - lastActivity.getTime() > timeoutMs) {
        logout();
        return null;
      }
      return session;
    } catch { return null; }
  }

  function touchSession() {
    const session = getSession();
    if (session) {
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  // ── Login ───────────────────────────────────────────────────────────────
  function login(userId, pin) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.status !== 'active') return { success: false, error: 'Account is inactive' };

    // Check lockout
    if (isLockedOut(userId)) {
      const lockouts = getLockouts();
      const until = new Date(lockouts[userId].lockedUntil);
      const mins = Math.ceil((until - Date.now()) / 60000);
      AppEvents.emit('auth:lockout', { userId, minutes: mins });
      return { success: false, error: `Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` };
    }

    // Verify PIN
    const hashedInput = hashPin(pin);
    if (user.pin !== hashedInput) {
      const lockout = recordFailedAttempt(userId);
      const remaining = 5 - lockout.attempts;
      AppEvents.emit('auth:failed', { userId, attempts: lockout.attempts });
      if (lockout.lockedUntil) {
        return { success: false, error: 'Too many attempts. Account locked for 15 minutes.' };
      }
      return { success: false, error: `Invalid PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
    }

    // Success — clear any lockout
    clearLockout(userId);

    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      department: user.department,
      sessionToken: generateSessionToken(),
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      deviceFingerprint: getDeviceFingerprint(),
      deviceInfo: getDeviceInfo(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    AppEvents.emit('auth:login', { userId: user.id, role: user.role, deviceInfo: session.deviceInfo });
    return { success: true, session };
  }

  function logout() {
    const session = getSession();
    if (session) {
      AppEvents.emit('auth:logout', { userId: session.userId });
    }
    localStorage.removeItem(SESSION_KEY);
    window.location.hash = '';
    window.location.reload();
  }

  // ── Re-authentication (for sensitive actions) ───────────────────────────
  function reauth(pin) {
    const session = getSession();
    if (!session) return false;
    const user = getUserById(session.userId);
    if (!user) return false;
    return user.pin === hashPin(pin);
  }

  // ── Permission check (delegates to PermissionGuard) ─────────────────────
  function hasPermission(permission) {
    const session = getSession();
    if (!session) return false;
    return PermissionGuard.hasPermission(session.role, permission);
  }

  function getRoleConfig(role) {
    return ROLE_CONFIG[role] || ROLE_CONFIG.field;
  }

  // ── Preferences ─────────────────────────────────────────────────────────
  function getPrefs(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      return { ...DEFAULT_PREFS, ...(all[userId] || {}) };
    } catch { return { ...DEFAULT_PREFS }; }
  }

  function savePrefs(userId, prefs) {
    try {
      const all = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      all[userId] = { ...DEFAULT_PREFS, ...(all[userId] || {}), ...prefs };
      localStorage.setItem(PREFS_KEY, JSON.stringify(all));
    } catch {}
  }

  // Activity heartbeat — resets session timeout on user interaction
  let heartbeatTimer = null;
  function startHeartbeat() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const beat = () => {
      touchSession();
      clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        // Warn 5 min before expiry
        AppEvents.emit('auth:session-warning');
      }, ((getPrefs(getSession()?.userId)?.sessionTimeout || 480) - 5) * 60 * 1000);
    };
    events.forEach(e => document.addEventListener(e, beat, { passive: true }));
    beat();
  }

  return {
    getUsers, saveUsers, getUserById, getSession, login, logout, reauth,
    hasPermission, getRoleConfig, getPrefs, savePrefs,
    hashPin, getDeviceFingerprint, getDeviceInfo, generateSessionToken,
    isLockedOut, startHeartbeat, touchSession,
    ROLE_CONFIG, DEFAULT_PREFS
  };
})();
```

- [ ] **Step 3: Update login UI in index.html for new PINs**

In `index.html`, find the `DEFAULT_USERS` references in the inline script bootstrap and update the `renderLoginUsers`, `selectUser`, and `attemptLogin` functions to work with the new Auth API. The key changes:

1. The default PINs for Owner/Head Admin are now 6 digits (567890 and 123456), so the PIN input needs to support variable length.
2. Replace the 4 fixed pin-digit inputs with a single password input field.

In the `<style>` section, add after the existing `.pin-digit.filled` rule:

```css
.pin-input-single {
  width: 100%;
  max-width: 240px;
  margin: 20px auto;
  display: block;
  padding: 16px;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-primary);
  border-radius: var(--radius-md);
  text-align: center;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0.5em;
  color: var(--text-primary);
  outline: none;
  caret-color: var(--accent);
  transition: border-color 200ms, box-shadow 200ms;
}
.pin-input-single:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}
.lockout-message {
  text-align: center;
  padding: 12px 16px;
  background: var(--status-error-bg);
  border: 1px solid var(--status-error);
  border-radius: var(--radius-md);
  color: var(--status-error);
  font-size: 0.8125rem;
  font-weight: 600;
  margin-top: 12px;
  animation: fadeInUp 300ms ease both;
}
```

Replace the PIN input HTML (the `div#login-step-pin` contents):

```html
<div id="login-step-pin" style="display:none">
  <button class="btn btn-ghost" id="back-to-users" style="margin-bottom:12px;padding:4px 0;font-size:0.8125rem">
    ← Back to users
  </button>
  <div style="text-align:center;margin-bottom:8px">
    <span id="pin-user-name" style="font-weight:700;font-size:1rem"></span>
  </div>
  <label class="input-label" style="text-align:center;margin-bottom:4px">Enter your PIN</label>
  <input type="password" id="pin-input" class="pin-input-single" inputmode="numeric" autocomplete="off" placeholder="------" maxlength="8"/>
  <div id="login-error" class="login-error" style="display:none"></div>
  <div id="lockout-msg" class="lockout-message" style="display:none"></div>
  <button class="btn btn-primary btn-full btn-lg" id="login-btn" style="margin-top:16px" disabled>
    Sign In
  </button>
</div>
```

Replace the entire inline `<script>` at the bottom of `index.html` with the updated bootstrap that uses the new Auth module. The key changes to the bootstrap:
- Remove the old `pinDigits` forEach logic
- Add single input handler for the new `#pin-input` field
- Update `attemptLogin` to pass the full PIN string
- Add lockout display
- Update `initApp` to call `Auth.startHeartbeat()`
- Add `owner-dashboard` to the nav items for Owner/Head Admin roles
- Update `hasPermission` calls to use `Auth.hasPermission` (which delegates to PermissionGuard)

The full updated bootstrap script is large. Key function changes:

**`selectUser`** — show lockout message if locked:
```javascript
function selectUser(user) {
  selectedUserId = user.id;
  document.getElementById('login-step-user').style.display = 'none';
  document.getElementById('login-step-pin').style.display = 'block';
  document.getElementById('pin-user-name').textContent = user.name;
  document.getElementById('pin-input').value = '';
  document.getElementById('pin-input').focus();
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-btn').disabled = true;

  // Check lockout
  const lockoutEl = document.getElementById('lockout-msg');
  if (Auth.isLockedOut(user.id)) {
    lockoutEl.textContent = 'Account temporarily locked due to failed attempts.';
    lockoutEl.style.display = 'block';
    document.getElementById('login-btn').disabled = true;
  } else {
    lockoutEl.style.display = 'none';
  }
}
```

**PIN input handler:**
```javascript
const pinInput = document.getElementById('pin-input');
pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g, '');
  document.getElementById('login-btn').disabled = pinInput.value.length < 4;
});
pinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptLogin();
});
```

**`attemptLogin`:**
```javascript
function attemptLogin() {
  const pin = document.getElementById('pin-input').value;
  if (pin.length < 4 || !selectedUserId) return;

  const result = Auth.login(selectedUserId, pin);
  if (result.success) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'block';
    initApp(result.session);
  } else {
    const errEl = document.getElementById('login-error');
    errEl.textContent = result.error;
    errEl.style.display = 'block';
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
    document.getElementById('login-btn').disabled = true;
    // Shake
    const card = document.querySelector('.login-card');
    card.style.animation = 'none';
    requestAnimationFrame(() => { card.style.animation = 'shake 400ms ease'; });
    // Check if now locked out
    if (result.error.includes('locked')) {
      document.getElementById('lockout-msg').textContent = result.error;
      document.getElementById('lockout-msg').style.display = 'block';
    }
  }
}
```

**`initApp`** — add heartbeat and owner dashboard nav:
```javascript
// At the end of initApp:
Auth.startHeartbeat();
```

**NAV_ITEMS** — add Owner Dashboard as first item:
```javascript
{ section: 'Main', items: [
  { id: 'owner-dashboard', icon: '...crown SVG...', label: 'Command Center', perm: 'owner-dashboard' },
  { id: 'dashboard', icon: '...grid SVG...', label: 'Dashboard', perm: 'dashboard' },
]},
```

- [ ] **Step 4: Clear old localStorage data and test**

Since PINs changed format, clear old data:
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

Test login with:
- Jeremy Silva: PIN `567890` (Owner)
- Kaden DaSilva: PIN `123456` (Head Admin)
- Mike Torres: PIN `1111` (Field)

Test lockout: enter wrong PIN 5 times for Mike Torres. Verify 15-min lockout message.

- [ ] **Step 5: Commit**

```bash
git add js/auth.js index.html
git commit -m "feat: rewrite auth with 5-tier roles, PIN hashing, lockout, session management"
```

---

### Task 5: Audit Log with Hash Chain Integrity

**Files:**
- Create: `js/audit-log.js`

Append-only log. Each entry includes a hash of the previous entry for tamper detection.

- [ ] **Step 1: Create AuditLog module**

Create `js/audit-log.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Audit Log
   Append-only with hash chain integrity verification
   ══════════════════════════════════════════════════════════════════════════════ */

const AuditLog = (() => {
  const COLLECTION = 'audit_log';

  function hashEntry(entry) {
    const payload = JSON.stringify({
      id: entry.id,
      userId: entry.userId,
      action: entry.action,
      collection: entry.collection,
      recordId: entry.recordId,
      changes: entry.changes,
      timestamp: entry.timestamp,
      prevHash: entry.prevHash
    });
    return CryptoJS.SHA256(payload).toString();
  }

  async function getLastEntry() {
    const entries = await DataStore.query(COLLECTION, { orderBy: 'timestamp:desc', limit: 1 });
    return entries[0] || null;
  }

  async function log(action, { collection, recordId, changes, metadata } = {}) {
    const session = Auth.getSession();
    const lastEntry = await getLastEntry();
    const prevHash = lastEntry ? hashEntry(lastEntry) : 'GENESIS';

    const entry = {
      id: 'aud_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      userId: session?.userId || 'system',
      userName: session?.name || 'System',
      role: session?.role || 'system',
      action,
      collection: collection || null,
      recordId: recordId || null,
      changes: changes || null,
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
      sessionId: session?.sessionToken || null,
      deviceInfo: session?.deviceInfo || Auth.getDeviceInfo(),
      prevHash,
      sensitive: isSensitiveAction(action, collection),
    };

    await DataStore.create(COLLECTION, entry);
    AppEvents.emit('audit:entry', entry);
    return entry;
  }

  function isSensitiveAction(action, collection) {
    const sensitiveActions = ['delete', 'role_change', 'pay_approve', 'pay_reject',
      'employee_create', 'employee_delete', 'permission_change', 'data_export',
      'data_wipe', 'lockdown', 'lockdown_lift', 'login_failed'];
    const sensitiveCollections = ['users', 'pay_periods'];
    return sensitiveActions.includes(action) || sensitiveCollections.includes(collection);
  }

  async function getEntries(filters = {}) {
    const { userId, action, collection, startDate, endDate, sensitiveOnly, limit: lim } = filters;
    let entries = await DataStore.list(COLLECTION);

    if (userId) entries = entries.filter(e => e.userId === userId);
    if (action) entries = entries.filter(e => e.action === action);
    if (collection) entries = entries.filter(e => e.collection === collection);
    if (startDate) entries = entries.filter(e => e.timestamp >= startDate);
    if (endDate) entries = entries.filter(e => e.timestamp <= endDate);
    if (sensitiveOnly) entries = entries.filter(e => e.sensitive);

    // Sort newest first
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (lim) entries = entries.slice(0, lim);
    return entries;
  }

  async function verifyIntegrity() {
    const entries = await DataStore.list(COLLECTION);
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const results = { total: entries.length, verified: 0, broken: [], firstBrokenAt: null };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (i === 0) {
        if (entry.prevHash === 'GENESIS') {
          results.verified++;
        } else {
          results.broken.push({ index: i, id: entry.id, expected: 'GENESIS', got: entry.prevHash });
          if (!results.firstBrokenAt) results.firstBrokenAt = entry.timestamp;
        }
      } else {
        const expectedPrev = hashEntry(entries[i - 1]);
        if (entry.prevHash === expectedPrev) {
          results.verified++;
        } else {
          results.broken.push({ index: i, id: entry.id, expected: expectedPrev, got: entry.prevHash });
          if (!results.firstBrokenAt) results.firstBrokenAt = entry.timestamp;
        }
      }
    }

    results.intact = results.broken.length === 0;
    return results;
  }

  // Wire up automatic logging for DataStore mutations
  function initAutoLogging() {
    AppEvents.on('data:create', ({ collection, record }) => {
      if (collection === COLLECTION) return; // Don't log our own logs
      log('create', { collection, recordId: record.id });
    });
    AppEvents.on('data:update', ({ collection, record, old }) => {
      if (collection === COLLECTION) return;
      const changes = {};
      Object.keys(record).forEach(k => {
        if (k.startsWith('_') || k === 'modifiedAt') return;
        if (JSON.stringify(record[k]) !== JSON.stringify(old[k])) {
          changes[k] = { old: old[k], new: record[k] };
        }
      });
      if (Object.keys(changes).length > 0) {
        log('update', { collection, recordId: record.id, changes });
      }
    });
    AppEvents.on('auth:login', (data) => log('login', { metadata: data }));
    AppEvents.on('auth:logout', (data) => log('logout', { metadata: data }));
    AppEvents.on('auth:failed', (data) => log('login_failed', { metadata: data }));
    AppEvents.on('auth:lockout', (data) => log('lockout', { metadata: data }));
  }

  return { log, getEntries, verifyIntegrity, initAutoLogging, hashEntry };
})();
```

- [ ] **Step 2: Add script tag to index.html**

After `auth.js`:

```html
<script src="js/audit-log.js"></script>
```

- [ ] **Step 3: Init auto-logging in the app bootstrap**

In the `initApp` function in `index.html`, add:

```javascript
AuditLog.initAutoLogging();
```

- [ ] **Step 4: Commit**

```bash
git add js/audit-log.js index.html
git commit -m "feat: add audit log with hash chain integrity verification"
```

---

### Task 6: Analytics Engine

**Files:**
- Create: `js/analytics-engine.js`

Tracks every user action, computes aggregates, detects behavioral signals.

- [ ] **Step 1: Create AnalyticsEngine module**

Create `js/analytics-engine.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Analytics Engine
   Event tracking, aggregation, behavioral signal detection
   ══════════════════════════════════════════════════════════════════════════════ */

const Analytics = (() => {
  const COLLECTION = 'analytics_events';
  let currentPageStart = null;
  let currentPage = null;
  let clickBuffer = []; // For rage click detection

  // ── Track Event ─────────────────────────────────────────────────────────
  async function track(action, { target, targetId, page, metadata } = {}) {
    const session = Auth.getSession();
    if (!session) return;

    const event = {
      id: 'evt_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      userId: session.userId,
      role: session.role,
      action,
      target: target || null,
      targetId: targetId || null,
      page: page || currentPage || Router.getCurrentRoute(),
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
      sessionId: session.sessionToken,
      deviceInfo: session.deviceInfo,
    };

    await DataStore.create(COLLECTION, event);
    return event;
  }

  // ── Page View Tracking ──────────────────────────────────────────────────
  function trackPageView(page) {
    // Record dwell time for previous page
    if (currentPage && currentPageStart) {
      const dwellMs = Date.now() - currentPageStart;
      track('page_dwell', {
        target: currentPage,
        metadata: { durationMs: dwellMs, durationSec: Math.round(dwellMs / 1000) }
      });
    }
    currentPage = page;
    currentPageStart = Date.now();
    track('page_view', { target: page, page });
  }

  // ── Behavioral Signal Detection ─────────────────────────────────────────
  function detectRageClick(e) {
    const now = Date.now();
    clickBuffer.push({ time: now, target: e.target.tagName + '.' + (e.target.className || '').split(' ')[0] });
    // Keep last 2 seconds of clicks
    clickBuffer = clickBuffer.filter(c => now - c.time < 2000);

    if (clickBuffer.length >= 5) {
      // 5+ clicks in 2 seconds = rage click
      const target = clickBuffer[clickBuffer.length - 1].target;
      track('rage_click', {
        target,
        page: currentPage,
        metadata: { clickCount: clickBuffer.length, windowMs: 2000 }
      });
      clickBuffer = [];
    }
  }

  function detectBackNavigation() {
    let lastRoute = null;
    let backCount = 0;

    AppEvents.on('navigate', (route) => {
      if (route === lastRoute) {
        backCount++;
        if (backCount >= 3) {
          track('navigation_confusion', {
            target: route,
            metadata: { bounceCount: backCount }
          });
          backCount = 0;
        }
      } else {
        backCount = 0;
      }
      lastRoute = route;
    });
  }

  // ── Aggregation ─────────────────────────────────────────────────────────
  async function getAggregates(options = {}) {
    const { startDate, endDate, groupBy } = options;
    let events = await DataStore.list(COLLECTION);

    if (startDate) events = events.filter(e => e.timestamp >= startDate);
    if (endDate) events = events.filter(e => e.timestamp <= endDate);

    const result = {
      totalEvents: events.length,
      uniqueUsers: [...new Set(events.map(e => e.userId))].length,
      byAction: {},
      byPage: {},
      byUser: {},
      byRole: {},
      byHour: Array(24).fill(0),
      byDay: {},
    };

    events.forEach(e => {
      // By action
      result.byAction[e.action] = (result.byAction[e.action] || 0) + 1;
      // By page
      if (e.page) result.byPage[e.page] = (result.byPage[e.page] || 0) + 1;
      // By user
      result.byUser[e.userId] = (result.byUser[e.userId] || 0) + 1;
      // By role
      result.byRole[e.role] = (result.byRole[e.role] || 0) + 1;
      // By hour
      const hour = new Date(e.timestamp).getHours();
      result.byHour[hour]++;
      // By day
      const day = e.timestamp.split('T')[0];
      result.byDay[day] = (result.byDay[day] || 0) + 1;
    });

    return result;
  }

  // Session analytics
  async function getSessionStats(options = {}) {
    const { startDate, endDate } = options;
    let events = await DataStore.list(COLLECTION);
    if (startDate) events = events.filter(e => e.timestamp >= startDate);
    if (endDate) events = events.filter(e => e.timestamp <= endDate);

    // Group by sessionId
    const sessions = {};
    events.forEach(e => {
      if (!e.sessionId) return;
      if (!sessions[e.sessionId]) {
        sessions[e.sessionId] = { userId: e.userId, role: e.role, events: [], start: e.timestamp, end: e.timestamp };
      }
      sessions[e.sessionId].events.push(e);
      if (e.timestamp < sessions[e.sessionId].start) sessions[e.sessionId].start = e.timestamp;
      if (e.timestamp > sessions[e.sessionId].end) sessions[e.sessionId].end = e.timestamp;
    });

    const sessionList = Object.values(sessions).map(s => ({
      ...s,
      durationMs: new Date(s.end) - new Date(s.start),
      pageViews: s.events.filter(e => e.action === 'page_view').length,
      actions: s.events.length,
    }));

    return {
      totalSessions: sessionList.length,
      avgDurationMs: sessionList.length ? sessionList.reduce((a, s) => a + s.durationMs, 0) / sessionList.length : 0,
      avgPageViews: sessionList.length ? sessionList.reduce((a, s) => a + s.pageViews, 0) / sessionList.length : 0,
      byRole: sessionList.reduce((acc, s) => { acc[s.role] = (acc[s.role] || 0) + 1; return acc; }, {}),
      sessions: sessionList,
    };
  }

  // Feature adoption: first-time visits per tool
  async function getAdoptionData() {
    const events = await DataStore.list(COLLECTION);
    const pageViews = events.filter(e => e.action === 'page_view');

    // First visit per user per page
    const firstVisits = {};
    pageViews.forEach(e => {
      const key = `${e.userId}:${e.page}`;
      if (!firstVisits[key] || e.timestamp < firstVisits[key]) {
        firstVisits[key] = e.timestamp;
      }
    });

    // Group by page: count of users who have visited
    const users = Auth.getUsers();
    const pages = [...new Set(pageViews.map(e => e.page))];
    return pages.map(page => ({
      page,
      totalUsers: users.length,
      adoptedUsers: [...new Set(pageViews.filter(e => e.page === page).map(e => e.userId))].length,
      adoptionRate: users.length ? ([...new Set(pageViews.filter(e => e.page === page).map(e => e.userId))].length / users.length * 100).toFixed(1) : 0,
    }));
  }

  // Bottleneck detection: pages with high dwell + low actions
  async function getBottlenecks() {
    const events = await DataStore.list(COLLECTION);
    const dwells = events.filter(e => e.action === 'page_dwell');
    const actions = events.filter(e => !['page_view', 'page_dwell', 'rage_click', 'navigation_confusion'].includes(e.action));

    const pageStats = {};
    dwells.forEach(e => {
      if (!pageStats[e.target]) pageStats[e.target] = { totalDwell: 0, visits: 0, actions: 0 };
      pageStats[e.target].totalDwell += (e.metadata?.durationMs || 0);
      pageStats[e.target].visits++;
    });
    actions.forEach(e => {
      if (e.page && pageStats[e.page]) pageStats[e.page].actions++;
    });

    return Object.entries(pageStats)
      .map(([page, stats]) => ({
        page,
        avgDwellMs: stats.visits ? Math.round(stats.totalDwell / stats.visits) : 0,
        visits: stats.visits,
        actions: stats.actions,
        actionsPerVisit: stats.visits ? (stats.actions / stats.visits).toFixed(2) : 0,
        score: stats.visits ? Math.round((stats.totalDwell / stats.visits) / Math.max(stats.actions / stats.visits, 0.1)) : 0,
      }))
      .sort((a, b) => b.score - a.score); // Highest score = worst bottleneck
  }

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    // Track page views on route changes
    Router.onNavigate((route) => {
      trackPageView(route);
      AppEvents.emit('navigate', route);
    });

    // Track rage clicks
    document.addEventListener('click', detectRageClick, { passive: true });

    // Track back-navigation confusion
    detectBackNavigation();

    // Track errors
    window.addEventListener('error', (e) => {
      track('error', {
        target: e.filename,
        metadata: { message: e.message, line: e.lineno, col: e.colno }
      });
    });
  }

  return {
    track, trackPageView, getAggregates, getSessionStats,
    getAdoptionData, getBottlenecks, init
  };
})();
```

- [ ] **Step 2: Add script tag and init**

In `index.html`, add after `audit-log.js`:

```html
<script src="js/analytics-engine.js"></script>
```

In `initApp()`, add:

```javascript
Analytics.init();
```

- [ ] **Step 3: Commit**

```bash
git add js/analytics-engine.js index.html
git commit -m "feat: add analytics engine with behavioral signal detection"
```

---

### Task 7: Security Monitor

**Files:**
- Create: `js/security-monitor.js`

Session tracking, anomaly detection, concurrent session alerts, active session list.

- [ ] **Step 1: Create SecurityMonitor module**

Create `js/security-monitor.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Security Monitor
   Session tracking, anomaly detection, concurrent session alerts
   ══════════════════════════════════════════════════════════════════════════════ */

const SecurityMonitor = (() => {
  const SESSIONS_COLLECTION = 'sessions';
  const ANOMALY_RULES = {
    oddHourLogin: { startHour: 22, endHour: 5 }, // 10 PM - 5 AM
    rapidFailedLogins: { threshold: 3, windowMs: 300000 }, // 3 in 5 min
    bulkExport: { threshold: 3, windowMs: 600000 }, // 3 exports in 10 min
  };

  async function recordSession(session) {
    const record = {
      userId: session.userId,
      userName: session.name,
      role: session.role,
      sessionToken: session.sessionToken,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity,
      deviceFingerprint: session.deviceFingerprint,
      deviceInfo: session.deviceInfo,
      active: true,
    };
    await DataStore.create(SESSIONS_COLLECTION, record);

    // Check for concurrent sessions
    const activeSessions = await getActiveSessions(session.userId);
    if (activeSessions.length > 1) {
      AppEvents.emit('security:concurrent-session', {
        userId: session.userId,
        sessionCount: activeSessions.length,
        devices: activeSessions.map(s => s.deviceInfo),
      });
      await AuditLog.log('concurrent_session_detected', {
        metadata: { userId: session.userId, count: activeSessions.length }
      });
    }

    // Check for new device
    const allSessions = await DataStore.list(SESSIONS_COLLECTION, { userId: session.userId });
    const knownFingerprints = [...new Set(allSessions.map(s => s.deviceFingerprint))];
    if (knownFingerprints.length > 1 && !knownFingerprints.slice(0, -1).includes(session.deviceFingerprint)) {
      AppEvents.emit('security:new-device', {
        userId: session.userId,
        deviceInfo: session.deviceInfo,
      });
    }

    // Check odd-hour login
    const hour = new Date().getHours();
    if (hour >= ANOMALY_RULES.oddHourLogin.startHour || hour < ANOMALY_RULES.oddHourLogin.endHour) {
      AppEvents.emit('security:odd-hour-login', {
        userId: session.userId,
        hour,
        deviceInfo: session.deviceInfo,
      });
    }
  }

  async function endSession(sessionToken) {
    const sessions = await DataStore.list(SESSIONS_COLLECTION);
    const session = sessions.find(s => s.sessionToken === sessionToken && s.active);
    if (session) {
      await DataStore.update(SESSIONS_COLLECTION, session.id, {
        active: false,
        logoutTime: new Date().toISOString(),
      });
    }
  }

  async function getActiveSessions(userId) {
    const sessions = await DataStore.list(SESSIONS_COLLECTION);
    return sessions.filter(s => {
      if (!s.active) return false;
      if (userId && s.userId !== userId) return false;
      // Consider session inactive if no activity in 8 hours
      const lastAct = new Date(s.lastActivity || s.loginTime);
      if (Date.now() - lastAct.getTime() > 8 * 60 * 60 * 1000) return false;
      return true;
    });
  }

  async function forceLogout(sessionToken) {
    await endSession(sessionToken);
    const currentSession = Auth.getSession();
    if (currentSession && currentSession.sessionToken === sessionToken) {
      Auth.logout();
    }
    await AuditLog.log('force_logout', { metadata: { sessionToken: sessionToken.slice(0, 8) + '...' } });
  }

  async function getLoginHistory(filters = {}) {
    const { limit: lim } = filters;
    const entries = await AuditLog.getEntries({
      action: filters.failedOnly ? 'login_failed' : undefined,
      limit: lim || 50,
    });
    return entries.filter(e => ['login', 'logout', 'login_failed', 'lockout'].includes(e.action));
  }

  async function getFailedAttempts(hoursBack = 24) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    const entries = await AuditLog.getEntries({ action: 'login_failed', startDate: since });
    return entries;
  }

  async function getAnomalies() {
    const anomalies = [];

    // Odd-hour logins in last 24h
    const recentLogins = await AuditLog.getEntries({
      action: 'login',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    recentLogins.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (hour >= ANOMALY_RULES.oddHourLogin.startHour || hour < ANOMALY_RULES.oddHourLogin.endHour) {
        anomalies.push({ type: 'odd_hour_login', severity: 'warning', entry, description: `${entry.userName} logged in at ${hour}:00` });
      }
    });

    // Failed login clusters
    const failedAttempts = await getFailedAttempts(24);
    const failedByUser = {};
    failedAttempts.forEach(e => {
      const uid = e.metadata?.userId || e.userId;
      if (!failedByUser[uid]) failedByUser[uid] = [];
      failedByUser[uid].push(e);
    });
    Object.entries(failedByUser).forEach(([uid, attempts]) => {
      if (attempts.length >= 3) {
        anomalies.push({
          type: 'failed_login_cluster',
          severity: attempts.length >= 5 ? 'critical' : 'warning',
          description: `${attempts.length} failed login attempts for user ${uid}`,
          count: attempts.length,
        });
      }
    });

    return anomalies.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    });
  }

  // ── Emergency Lockdown ──────────────────────────────────────────────────
  async function activateLockdown(expiresInHours = 24) {
    const lockdown = {
      active: true,
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
      activatedBy: Auth.getSession()?.userId,
    };
    localStorage.setItem('amcoee_lockdown', JSON.stringify(lockdown));
    await AuditLog.log('lockdown', { metadata: lockdown });
    AppEvents.emit('security:lockdown', lockdown);
  }

  async function liftLockdown() {
    localStorage.removeItem('amcoee_lockdown');
    await AuditLog.log('lockdown_lift', {});
    AppEvents.emit('security:lockdown-lifted');
  }

  function isLockdownActive() {
    try {
      const lockdown = JSON.parse(localStorage.getItem('amcoee_lockdown'));
      if (!lockdown || !lockdown.active) return false;
      if (new Date(lockdown.expiresAt) < new Date()) {
        localStorage.removeItem('amcoee_lockdown');
        return false;
      }
      return lockdown;
    } catch { return false; }
  }

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    AppEvents.on('auth:login', (data) => {
      const session = Auth.getSession();
      if (session) recordSession(session);
    });
    AppEvents.on('auth:logout', (data) => {
      const session = Auth.getSession();
      if (session) endSession(session.sessionToken);
    });
  }

  return {
    recordSession, endSession, getActiveSessions, forceLogout,
    getLoginHistory, getFailedAttempts, getAnomalies,
    activateLockdown, liftLockdown, isLockdownActive,
    init
  };
})();
```

- [ ] **Step 2: Add script tag and init**

In `index.html`, after `analytics-engine.js`:

```html
<script src="js/security-monitor.js"></script>
```

In `initApp()`:

```javascript
SecurityMonitor.init();
```

- [ ] **Step 3: Commit**

```bash
git add js/security-monitor.js index.html
git commit -m "feat: add security monitor with anomaly detection and emergency lockdown"
```

---

### Task 8: Tool Registry (Plugin System)

**Files:**
- Create: `js/tool-registry.js`

Plugin registration system. Tools register themselves and get sidebar entries, routes, dashboard widgets, and analytics automatically.

- [ ] **Step 1: Create ToolRegistry module**

Create `js/tool-registry.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Tool Registry
   Plugin system: tools register themselves, get sidebar/routes/widgets/analytics
   ══════════════════════════════════════════════════════════════════════════════ */

const ToolRegistry = (() => {
  const tools = {};

  function register(config) {
    const { id, name, icon, emoji, permissions, routes, dashboardWidgets, init: initFn, section } = config;
    if (!id || !name) throw new Error(`[ToolRegistry] Tool must have id and name`);

    tools[id] = {
      id,
      name,
      icon: icon || '',
      emoji: emoji || '',
      permissions: permissions || [id],
      routes: routes || {},
      dashboardWidgets: dashboardWidgets || [],
      section: section || 'Tools',
      initFn,
      initialized: false,
    };

    // Register routes
    Object.entries(routes || {}).forEach(([route, handler]) => {
      Router.register(route, () => {
        if (!tools[id].initialized && initFn) {
          initFn();
          tools[id].initialized = true;
        }
        handler();
      });
    });
  }

  function getAll() {
    return Object.values(tools);
  }

  function getVisible(role) {
    return Object.values(tools).filter(tool => {
      return tool.permissions.some(p => PermissionGuard.hasPermission(role, p));
    });
  }

  function getById(id) {
    return tools[id] || null;
  }

  function getNavItems(role) {
    const visible = getVisible(role);
    const sections = {};
    visible.forEach(tool => {
      if (!sections[tool.section]) sections[tool.section] = [];
      sections[tool.section].push({
        id: tool.id,
        icon: tool.icon,
        label: tool.name,
        perm: tool.permissions[0],
      });
    });
    return Object.entries(sections).map(([section, items]) => ({ section, items }));
  }

  function getDashboardWidgets(role) {
    const visible = getVisible(role);
    const widgets = [];
    visible.forEach(tool => {
      tool.dashboardWidgets.forEach(w => {
        widgets.push({ ...w, toolId: tool.id, toolName: tool.name });
      });
    });
    return widgets;
  }

  return { register, getAll, getVisible, getById, getNavItems, getDashboardWidgets };
})();
```

- [ ] **Step 2: Add script tag**

In `index.html`, after `security-monitor.js`:

```html
<script src="js/tool-registry.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add js/tool-registry.js index.html
git commit -m "feat: add tool registry plugin system"
```

---

### Task 9: Schema Migrations

**Files:**
- Create: `js/schema-migrations.js`

Versioned data migration runner. Checks schema versions on load and applies pending migrations.

- [ ] **Step 1: Create SchemaMigrations module**

Create `js/schema-migrations.js`:

```javascript
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Schema Migrations
   Versioned data migration runner
   ══════════════════════════════════════════════════════════════════════════════ */

const SchemaMigrations = (() => {
  const VERSION_KEY = 'amcoee_schema_version';
  const CURRENT_VERSION = 2; // Bump this when adding migrations

  const migrations = {
    // v1 -> v2: Upgrade from old 3-role system to 5-tier
    1: async function migrateV1toV2() {
      // Update user roles
      const users = Auth.getUsers();
      const updated = users.map(u => {
        // If user was 'admin' and is Jeremy, make owner
        if (u.id === 'u2' && u.role === 'admin') {
          return { ...u, role: 'owner' };
        }
        // If user was 'admin' and is Kaden, make head_admin
        if (u.id === 'u1' && u.role === 'admin') {
          return { ...u, role: 'head_admin' };
        }
        // Add status field if missing
        if (!u.status) {
          return { ...u, status: 'active' };
        }
        return u;
      });
      Auth.saveUsers(updated);
      console.log('[Migration] v1→v2: Updated role hierarchy');
    },
  };

  function getCurrentVersion() {
    try {
      return parseInt(localStorage.getItem(VERSION_KEY)) || 1;
    } catch { return 1; }
  }

  async function run() {
    let version = getCurrentVersion();
    let migrated = false;

    while (version < CURRENT_VERSION) {
      const migrationFn = migrations[version];
      if (migrationFn) {
        console.log(`[Migration] Running v${version}→v${version + 1}...`);
        try {
          await migrationFn();
          migrated = true;
        } catch (e) {
          console.error(`[Migration] v${version}→v${version + 1} FAILED:`, e);
          break;
        }
      }
      version++;
      localStorage.setItem(VERSION_KEY, version.toString());
    }

    if (migrated) {
      console.log(`[Migration] Complete. Schema at v${version}`);
    }
    return { version, migrated };
  }

  return { run, getCurrentVersion, CURRENT_VERSION };
})();
```

- [ ] **Step 2: Add script tag and run on load**

In `index.html`, add after `tool-registry.js`:

```html
<script src="js/schema-migrations.js"></script>
```

In the bootstrap script, at the very top of the IIFE (before auto-login check):

```javascript
// Run migrations before anything else
await SchemaMigrations.run();
```

Note: This means the bootstrap IIFE needs to be `async`. Wrap it:

```javascript
(async function() {
  'use strict';
  await SchemaMigrations.run();
  // ... rest of bootstrap
})();
```

- [ ] **Step 3: Commit**

```bash
git add js/schema-migrations.js index.html
git commit -m "feat: add schema migration system"
```

---

### Task 10: Owner Dashboard CSS

**Files:**
- Create: `css/owner-dashboard.css`

All styles for the command center panels, alert strip, stat cards, activity feed, approval queue, charts, FAB, and panel customization.

- [ ] **Step 1: Create owner dashboard stylesheet**

Create `css/owner-dashboard.css` with all the owner dashboard component styles. This is a large file covering:

- `.alert-strip` — priority alert banner with rotate animation
- `.command-stats` — 6-card stat row with sparklines
- `.activity-feed` — real-time feed with anomaly highlighting
- `.approval-queue` — stacked approval cards with inline actions
- `.people-overview`, `.financial-snapshot`, `.security-panel` — row 3 columns
- `.analytics-panel` — tabbed full-width analytics with chart containers
- `.fab` — floating action button with radial expand
- `.panel` — collapsible, reorderable panels with drag handles
- `.org-chart` — department tree visualization
- `.employee-profile` — tabbed profile layout
- `.approval-card` — inline approve/reject cards
- `.chart-container` — responsive chart wrappers

```css
/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Owner Dashboard Styles
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Priority Alert Strip ──────────────────────────────────────────────────── */
.alert-strip {
  position: sticky;
  top: 57px; /* Below main header */
  z-index: var(--z-sticky);
  padding: 10px var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  animation: slideInDown 400ms var(--ease-out) both;
}
.alert-strip-critical { background: var(--status-error-bg); border-bottom: 2px solid var(--status-error); color: var(--status-error); }
.alert-strip-warning { background: var(--status-warning-bg); border-bottom: 2px solid var(--status-warning); color: var(--status-warning); }
.alert-strip-info { background: var(--status-info-bg); border-bottom: 2px solid var(--status-info); color: var(--status-info); }
.alert-strip:hover { filter: brightness(1.1); }
.alert-strip-dismiss {
  background: none; border: none; color: inherit; opacity: 0.6; cursor: pointer;
  padding: 4px; font-size: 16px; transition: opacity 150ms;
}
.alert-strip-dismiss:hover { opacity: 1; }

@keyframes slideInDown {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Alert rotation */
.alert-strip-text {
  flex: 1;
  overflow: hidden;
}
.alert-strip-text span {
  display: inline-block;
  animation: alertRotate 500ms var(--ease-out) both;
}
@keyframes alertRotate {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Command Stats Row ─────────────────────────────────────────────────────── */
.command-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
@media (max-width: 1200px) { .command-stats { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .command-stats { grid-template-columns: repeat(2, 1fr); } }

.command-stat {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}
.command-stat:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px var(--accent-glow);
}
.command-stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.command-stat-icon {
  width: 36px; height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.command-stat-trend {
  font-size: var(--text-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 2px;
}
.command-stat-trend.up { color: var(--status-success); }
.command-stat-trend.down { color: var(--status-error); }
.command-stat-trend.flat { color: var(--text-tertiary); }
.command-stat-value {
  font-size: var(--text-2xl);
  font-weight: 800;
  line-height: 1;
  margin-bottom: 2px;
  transition: all 300ms;
}
.command-stat-label {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.command-stat-sparkline {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 30px;
  opacity: 0.15;
}
.command-stat.pulsing::after {
  content: '';
  position: absolute;
  top: var(--space-3); right: var(--space-3);
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse-ring 1.5s infinite;
}

/* ── Two-Column Split ──────────────────────────────────────────────────────── */
.owner-row-2 {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}
@media (max-width: 1024px) { .owner-row-2 { grid-template-columns: 1fr; } }

/* ── Activity Feed ─────────────────────────────────────────────────────────── */
.activity-feed {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.activity-feed-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.activity-feed-title {
  font-size: var(--text-base);
  font-weight: 700;
}
.activity-feed-filters {
  display: flex;
  gap: var(--space-2);
}
.activity-feed-body {
  max-height: 400px;
  overflow-y: auto;
  padding: var(--space-2) 0;
}
.activity-entry {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  transition: background 150ms;
  cursor: pointer;
  border-left: 3px solid transparent;
}
.activity-entry:hover {
  background: var(--bg-hover);
}
.activity-entry.anomaly {
  border-left-color: var(--status-error);
  background: var(--status-error-bg);
}
.activity-entry-avatar {
  width: 32px; height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}
.activity-entry-content { flex: 1; min-width: 0; }
.activity-entry-text {
  font-size: var(--text-sm);
  color: var(--text-primary);
  line-height: 1.4;
}
.activity-entry-text strong { font-weight: 600; }
.activity-entry-time {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: 2px;
}
.activity-entry-new {
  animation: fadeInUp 300ms var(--ease-out) both;
}

/* ── Approval Queue ────────────────────────────────────────────────────────── */
.approval-queue {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.approval-queue-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.approval-tabs {
  display: flex;
  gap: var(--space-1);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--border-primary);
  overflow-x: auto;
}
.approval-tab {
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-xs);
  font-weight: 700;
  color: var(--text-tertiary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all 150ms;
}
.approval-tab:hover { color: var(--text-secondary); }
.approval-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.approval-tab .tab-count {
  background: var(--accent);
  color: white;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: var(--radius-full);
  margin-left: var(--space-1);
}
.approval-queue-body {
  max-height: 400px;
  overflow-y: auto;
  padding: var(--space-3);
}
.approval-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-2);
  transition: all var(--duration-normal) var(--ease-out);
}
.approval-card:hover {
  border-color: var(--border-secondary);
}
.approval-card.overdue {
  border-left: 3px solid var(--status-error);
}
.approval-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}
.approval-card-title {
  font-weight: 600;
  font-size: var(--text-sm);
}
.approval-card-meta {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-bottom: var(--space-3);
}
.approval-card-actions {
  display: flex;
  gap: var(--space-2);
}

/* ── Three-Column Row ──────────────────────────────────────────────────────── */
.owner-row-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}
@media (max-width: 1200px) { .owner-row-3 { grid-template-columns: 1fr; } }

/* ── Panel (generic collapsible) ───────────────────────────────────────────── */
.panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--duration-normal) var(--ease-out);
}
.panel-header {
  padding: var(--space-4) var(--space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}
.panel-header:hover { background: var(--bg-hover); }
.panel-title {
  font-size: var(--text-sm);
  font-weight: 700;
}
.panel-controls {
  display: flex;
  gap: var(--space-2);
}
.panel-control-btn {
  width: 28px; height: 28px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms;
  font-size: 14px;
}
.panel-control-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.panel-body {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-primary);
}
.panel.collapsed .panel-body { display: none; }
.panel.dragging {
  opacity: 0.6;
  box-shadow: var(--shadow-xl);
}

/* ── Dot Grid (attendance) ─────────────────────────────────────────────────── */
.dot-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: var(--space-3) 0;
}
.dot {
  width: 12px; height: 12px;
  border-radius: 50%;
  transition: transform 150ms;
  cursor: pointer;
  position: relative;
}
.dot:hover { transform: scale(1.5); }
.dot-in { background: var(--status-success); }
.dot-out { background: var(--status-error); }
.dot-off { background: var(--bg-active); }
.dot-tooltip {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  z-index: 10;
}
.dot:hover .dot-tooltip { display: block; }

/* ── FAB (Floating Action Button) ──────────────────────────────────────────── */
.fab-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-dropdown);
}
.fab-trigger {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 24px var(--accent-glow);
  transition: all var(--duration-normal) var(--ease-out);
}
.fab-trigger:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 32px var(--accent-glow);
}
.fab-trigger.open {
  transform: rotate(45deg);
  background: var(--status-error);
}
.fab-menu {
  position: absolute;
  bottom: 70px;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  transition: all var(--duration-normal) var(--ease-out);
}
.fab-menu.open {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.fab-action {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: nowrap;
  font-size: var(--text-sm);
  font-weight: 600;
  transition: all 150ms;
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
}
.fab-action:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  transform: translateX(-4px);
}
.fab-action-icon {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: var(--accent-subtle);
}
.fab-action.danger .fab-action-icon {
  background: var(--status-error-bg);
}

/* ── Analytics Panel ───────────────────────────────────────────────────────── */
.analytics-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: var(--space-6);
}
.analytics-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-primary);
  overflow-x: auto;
}
.analytics-tab {
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-tertiary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 150ms;
  white-space: nowrap;
}
.analytics-tab:hover { color: var(--text-secondary); }
.analytics-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.analytics-body {
  padding: var(--space-5);
}
.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
}
.chart-container canvas {
  width: 100% !important;
  height: 100% !important;
}

/* ── Notification Bell ─────────────────────────────────────────────────────── */
.notification-bell {
  position: relative;
  width: 36px; height: 36px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 200ms;
  font-size: 16px;
}
.notification-bell:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}
.notification-badge {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 18px;
  height: 18px;
  background: var(--status-error);
  color: white;
  font-size: 10px;
  font-weight: 700;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  animation: scaleIn 300ms var(--ease-out) both;
}
.notification-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  z-index: var(--z-dropdown);
  animation: fadeInScale 200ms var(--ease-out) both;
  overflow: hidden;
}
.notification-dropdown-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.notification-list {
  max-height: 400px;
  overflow-y: auto;
}
.notification-item {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background 150ms;
}
.notification-item:hover { background: var(--bg-hover); }
.notification-item.unread { background: var(--accent-subtle); }

/* ── Org Management ────────────────────────────────────────────────────────── */
.org-tree {
  padding: var(--space-4) 0;
}
.org-node {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-left: 24px;
  border-left: 2px solid var(--border-primary);
  position: relative;
  cursor: pointer;
  transition: all 150ms;
}
.org-node:hover { background: var(--bg-hover); border-radius: var(--radius-md); }
.org-node::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 50%;
  width: 16px;
  height: 2px;
  background: var(--border-primary);
}
.org-node-root { margin-left: 0; border-left: none; }
.org-node-root::before { display: none; }
.org-node-color {
  width: 12px; height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}
.org-node-name { font-weight: 600; font-size: var(--text-sm); }
.org-node-count { font-size: var(--text-xs); color: var(--text-tertiary); margin-left: auto; }

/* ── Employee Profile (tabbed) ─────────────────────────────────────────────── */
.profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: var(--space-6);
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-5);
}
.profile-avatar {
  width: 72px; height: 72px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-2xl);
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}
.profile-info { flex: 1; }
.profile-name { font-size: var(--text-xl); font-weight: 800; }
.profile-tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--border-primary);
  margin-bottom: var(--space-5);
  overflow-x: auto;
}
.profile-tab {
  padding: var(--space-3) var(--space-5);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-tertiary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 150ms;
  white-space: nowrap;
}
.profile-tab:hover { color: var(--text-secondary); }
.profile-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

/* ── Animated number counter ───────────────────────────────────────────────── */
.counter-value {
  display: inline-block;
  transition: transform 300ms var(--ease-out);
}
.counter-value.ticking {
  animation: counterTick 300ms var(--ease-out);
}
@keyframes counterTick {
  0% { transform: translateY(0); }
  40% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}

/* ── Reauth Modal ──────────────────────────────────────────────────────────── */
.reauth-input {
  width: 100%;
  max-width: 200px;
  margin: 16px auto;
  display: block;
  padding: 12px;
  text-align: center;
  font-size: 1.25rem;
  letter-spacing: 0.3em;
  font-weight: 700;
}
```

- [ ] **Step 2: Link stylesheet in index.html**

In `<head>`, after `design-system.css`:

```html
<link rel="stylesheet" href="css/owner-dashboard.css"/>
```

- [ ] **Step 3: Commit**

```bash
git add css/owner-dashboard.css index.html
git commit -m "feat: add owner dashboard CSS with all panel/component styles"
```

---

### Task 11: Owner Dashboard Renderer

**Files:**
- Create: `js/owner-dashboard.js`

The main command center. Renders all 4 rows, alert strip, FAB, notification bell. Reads data from DataStore, Analytics, SecurityMonitor, AuditLog.

This is the largest single file. It renders the full owner dashboard with:
- Priority alert strip
- 6 command stat cards with animated counters
- Activity feed with filtering and anomaly highlighting
- Approval queue with inline approve/reject
- People overview with dot grid attendance
- Financial snapshot
- Security panel
- Behavioral analytics with Chart.js tabs
- FAB with radial menu
- Notification dropdown

- [ ] **Step 1: Create the owner dashboard renderer**

Create `js/owner-dashboard.js`. This file exports a single `OwnerDashboard` module with a `render(container, session)` function. Due to file length, structure it as sections matching the dashboard rows. Each panel is a function that returns an HTML string.

Key implementation notes:
- Use `DOMPurify.sanitize()` on any user-generated text before inserting into HTML
- Chart.js instances must be destroyed and recreated on re-render (store refs)
- The FAB uses event delegation on the container
- Animated counters use `requestAnimationFrame` to tick from old value to new
- The activity feed polls `AuditLog.getEntries()` every 30 seconds
- Panel collapse state saved via `Auth.savePrefs()`

The file should be approximately 600-800 lines. I will provide the complete implementation code in the actual task execution.

- [ ] **Step 2: Add CDN scripts for Chart.js, Sortable.js, Fuse.js, SheetJS, html2canvas**

In `index.html` `<head>`, add after the existing CDN scripts:

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
```

- [ ] **Step 3: Register the owner-dashboard route**

In the bootstrap script, update `registerRoutes` to use:

```javascript
Router.register('owner-dashboard', () => OwnerDashboard.render(main, session));
```

- [ ] **Step 4: Add script tag**

In `index.html`, after `tool-registry.js`:

```html
<script src="js/owner-dashboard.js"></script>
```

- [ ] **Step 5: Test by logging in as Jeremy (Owner) or Kaden (Head Admin)**

Verify:
- Command Center appears in sidebar
- All 4 rows render
- Stat cards show placeholder data
- Activity feed shows recent audit entries
- FAB opens/closes
- Theme toggle works across all panels
- Panels collapse/expand

- [ ] **Step 6: Commit**

```bash
git add js/owner-dashboard.js index.html
git commit -m "feat: add owner dashboard command center with all panels"
```

---

### Task 12: Organization Manager

**Files:**
- Create: `js/org-manager.js`

Department CRUD, group management, employee lifecycle (onboarding/offboarding), certification tracking, pay rate management.

- [ ] **Step 1: Create OrgManager module**

Create `js/org-manager.js`. This module provides:
- `renderDepartments(container)` — department list + create/edit
- `renderGroups(container)` — group list + create/edit
- `renderEmployeeProfile(container, userId)` — tabbed profile
- `renderOnboarding(container)` — 5-step wizard
- `renderOffboarding(container, userId)` — offboarding flow
- `renderSkillsMatrix(container)` — cert grid

All CRUD goes through DataStore. All mutations logged via AuditLog.

- [ ] **Step 2: Add script tag and routes**

In `index.html`, add after `owner-dashboard.js`:

```html
<script src="js/org-manager.js"></script>
```

Register routes in bootstrap:

```javascript
Router.register('employees', () => OrgManager.renderEmployees(main, session));
Router.register('employees/new', () => OrgManager.renderOnboarding(main, session));
```

- [ ] **Step 3: Seed default departments**

In the bootstrap, after migrations, seed departments if empty:

```javascript
const depts = await DataStore.list('departments');
if (depts.length === 0) {
  await DataStore.create('departments', { name: 'Operations', color: '#22c55e', icon: '⚡', headId: 'u1', description: 'Field operations and job execution' });
  await DataStore.create('departments', { name: 'Office', color: '#3b82f6', icon: '🏢', headId: 'u4', description: 'Administrative and customer-facing operations' });
  await DataStore.create('departments', { name: 'Management', color: '#f97316', icon: '👔', headId: 'u2', description: 'Leadership and strategic planning' });
}
```

- [ ] **Step 4: Commit**

```bash
git add js/org-manager.js index.html
git commit -m "feat: add org manager with departments, groups, employee lifecycle"
```

---

### Task 13: Approval Queue Engine

**Files:**
- Create: `js/approval-queue.js`

Approval workflow: create, review, approve/reject with notes. Re-auth required for pay approvals.

- [ ] **Step 1: Create ApprovalQueue module**

Create `js/approval-queue.js`. Exports:
- `create(type, data)` — creates a pending approval
- `approve(approvalId, note)` — approves with optional note
- `reject(approvalId, note)` — rejects with required note
- `getPending(filters)` — gets pending approvals
- `getByType(type)` — gets approvals by type
- `renderQueue(container)` — renders the inline approval queue UI

Types: `pay_approval`, `expense_report`, `time_off`, `tool_writeoff`, `new_employee`, `permission_change`

- [ ] **Step 2: Add script tag**

```html
<script src="js/approval-queue.js"></script>
```

- [ ] **Step 3: Add re-auth modal to UI module**

In `js/ui.js`, add a `reauth()` function that shows a modal with a PIN input and returns a promise that resolves to `true`/`false`:

```javascript
function reauth(message = 'Enter your PIN to confirm this action') {
  return new Promise((resolve) => {
    const html = `
      <h3 style="font-size:1.125rem;font-weight:800;margin-bottom:8px">Confirm Identity</h3>
      <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:16px">${DOMPurify.sanitize(message)}</p>
      <input type="password" class="input reauth-input" inputmode="numeric" placeholder="••••••" maxlength="8" autocomplete="off"/>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn-secondary btn-full" data-action="cancel">Cancel</button>
        <button class="btn btn-primary btn-full" data-action="confirm">Confirm</button>
      </div>
    `;
    const { modal, close } = showModal(html);
    const input = modal.querySelector('input');
    input.focus();
    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => { close(); resolve(false); });
    modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
      const result = Auth.reauth(input.value);
      if (result) { close(); resolve(true); }
      else { input.value = ''; input.style.borderColor = 'var(--status-error)'; }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') modal.querySelector('[data-action="confirm"]').click();
    });
  });
}
```

Add `reauth` to the UI return object.

- [ ] **Step 4: Commit**

```bash
git add js/approval-queue.js js/ui.js index.html
git commit -m "feat: add approval queue engine with re-auth for sensitive actions"
```

---

### Task 14: Service Worker for Offline CDN Caching

**Files:**
- Create: `sw.js` (in project root)
- Modify: `index.html` (register service worker)

- [ ] **Step 1: Create service worker**

Create `sw.js` in the project root:

```javascript
const CACHE_NAME = 'amcoee-tools-v1';
const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js',
  'https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CDN_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only intercept CDN requests
  if (CDN_URLS.some(url => e.request.url === url)) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return response;
        });
      })
    );
  }
});
```

- [ ] **Step 2: Register in index.html**

At the very end of `<body>`, before `</body>`:

```html
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
</script>
```

- [ ] **Step 3: Commit**

```bash
git add sw.js index.html
git commit -m "feat: add service worker for offline CDN caching"
```

---

### Task 15: Update index.html — Full Integration

**Files:**
- Modify: `index.html`

Wire everything together: script load order, CSP meta tag, notification bell in header, updated nav items, updated bootstrap with all module inits.

- [ ] **Step 1: Add CSP meta tag**

In `<head>`, after `<meta name="viewport">`:

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'"/>
```

- [ ] **Step 2: Add notification bell to header**

In the header, before the theme-toggle button:

```html
<div class="notification-bell" id="notification-bell" title="Notifications">
  🔔
  <span class="notification-badge" id="notification-count" style="display:none">0</span>
</div>
```

- [ ] **Step 3: Ensure correct script load order**

```html
<!-- CDN Libraries -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>

<!-- Core Modules (dependency order) -->
<script src="js/event-bus.js"></script>
<script src="js/data-store.js"></script>
<script src="js/permission-guard.js"></script>
<script src="js/auth.js"></script>
<script src="js/theme.js"></script>
<script src="js/router.js"></script>
<script src="js/ui.js"></script>
<script src="js/audit-log.js"></script>
<script src="js/analytics-engine.js"></script>
<script src="js/security-monitor.js"></script>
<script src="js/tool-registry.js"></script>
<script src="js/schema-migrations.js"></script>

<!-- Feature Modules -->
<script src="js/owner-dashboard.js"></script>
<script src="js/org-manager.js"></script>
<script src="js/approval-queue.js"></script>
```

- [ ] **Step 4: Update the inline bootstrap script**

The bootstrap needs to be updated to:
1. Be async (for DataStore/migrations)
2. Init all modules in correct order
3. Route owner/head_admin users to Command Center as default
4. Add owner-dashboard to NAV_ITEMS
5. Use PermissionGuard instead of the old hasPermission logic

- [ ] **Step 5: Full browser test**

Test all roles:
- Owner (Jeremy, 567890): Command Center visible, all nav items, FAB visible
- Head Admin (Kaden, 123456): Same as Owner minus data.wipe
- Admin (add a test user): No Command Center, standard dashboard
- Office (Sarah, 2222): Limited nav
- Field (Mike, 1111): Minimal nav

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: full integration — CSP, script ordering, notification bell, module init"
```

---

### Task 16: Push and Deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin master
```

- [ ] **Step 2: Verify deployment**

Wait 1-2 minutes, then visit: `https://amcoee-kaden.github.io/amcoee-tools/`

Verify:
- Login screen loads
- All users visible with correct role labels
- PIN login works (Jeremy: 567890, Kaden: 123456)
- Owner Dashboard / Command Center renders
- Theme toggle works
- All sidebar nav items appear based on role
- Activity feed shows entries
- Charts render (may need sample data)
- FAB opens/closes
- Lockout works after 5 failed attempts

- [ ] **Step 3: Commit any fixes**

If anything needs fixing after deployment testing, fix and push again.

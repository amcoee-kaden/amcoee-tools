const AuditLog = (() => {
  const COLLECTION = 'audit_log';

  function hashEntry(entry) {
    const payload = JSON.stringify({
      id: entry.id, userId: entry.userId, action: entry.action,
      collection: entry.collection, recordId: entry.recordId,
      changes: entry.changes, timestamp: entry.timestamp, prevHash: entry.prevHash
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
        if (entry.prevHash === 'GENESIS') { results.verified++; }
        else { results.broken.push({ index: i, id: entry.id, expected: 'GENESIS', got: entry.prevHash }); if (!results.firstBrokenAt) results.firstBrokenAt = entry.timestamp; }
      } else {
        const expectedPrev = hashEntry(entries[i - 1]);
        if (entry.prevHash === expectedPrev) { results.verified++; }
        else { results.broken.push({ index: i, id: entry.id, expected: expectedPrev, got: entry.prevHash }); if (!results.firstBrokenAt) results.firstBrokenAt = entry.timestamp; }
      }
    }
    results.intact = results.broken.length === 0;
    return results;
  }

  function initAutoLogging() {
    AppEvents.on('data:create', ({ collection, record }) => {
      if (collection === COLLECTION) return;
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
      if (Object.keys(changes).length > 0) log('update', { collection, recordId: record.id, changes });
    });
    AppEvents.on('auth:login', (data) => log('login', { metadata: data }));
    AppEvents.on('auth:logout', (data) => log('logout', { metadata: data }));
    AppEvents.on('auth:failed', (data) => log('login_failed', { metadata: data }));
    AppEvents.on('auth:lockout', (data) => log('lockout', { metadata: data }));
  }

  return { log, getEntries, verifyIntegrity, initAutoLogging, hashEntry };
})();

/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Security Monitor
   Session tracking, anomaly detection, concurrent sessions, device alerts,
   emergency lockdown with auto-expiry, force logout, login history
   ══════════════════════════════════════════════════════════════════════════════ */

const SecurityMonitor = (() => {
  const SESSIONS_COLLECTION = 'sessions';
  const LOCKDOWN_KEY        = 'amcoee_lockdown';

  // Sessions inactive for 8+ hours are considered no longer active
  const ACTIVE_THRESHOLD_MS  = 8 * 60 * 60 * 1000;
  // Odd hours: 22:00 – 05:00 (inclusive of 22, exclusive of 5 i.e. hour >= 22 || hour < 5)
  const ODD_HOUR_START = 22;
  const ODD_HOUR_END   = 5;
  // Failed-attempt cluster: 3+ failures in a rolling window to flag an anomaly
  const FAILED_CLUSTER_THRESHOLD = 3;
  const FAILED_CLUSTER_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  // ── Lockdown helpers ───────────────────────────────────────────────────────

  function getLockdownState() {
    try {
      return JSON.parse(localStorage.getItem(LOCKDOWN_KEY) || 'null');
    } catch { return null; }
  }

  function saveLockdownState(state) {
    if (state === null) {
      localStorage.removeItem(LOCKDOWN_KEY);
    } else {
      localStorage.setItem(LOCKDOWN_KEY, JSON.stringify(state));
    }
  }

  function isLockdownActive() {
    const state = getLockdownState();
    if (!state || !state.active) return false;
    // Auto-expiry check
    if (state.expiresAt && new Date(state.expiresAt) <= new Date()) {
      saveLockdownState(null);
      AppEvents.emit('security:lockdown-expired', { expiredAt: state.expiresAt });
      return false;
    }
    return true;
  }

  function activateLockdown(expiresInHours = 24) {
    const session = Auth.getSession();
    const now     = new Date();
    const state   = {
      active:      true,
      activatedAt: now.toISOString(),
      expiresAt:   new Date(now.getTime() + expiresInHours * 60 * 60 * 1000).toISOString(),
      activatedBy: session ? session.userId : 'system',
    };
    saveLockdownState(state);
    AppEvents.emit('security:lockdown-activated', state);
    AuditLog.log('lockdown', { metadata: { expiresInHours, activatedBy: state.activatedBy } });
    return state;
  }

  function liftLockdown() {
    const prev = getLockdownState();
    saveLockdownState(null);
    const session = Auth.getSession();
    AppEvents.emit('security:lockdown-lifted', {
      liftedBy:  session ? session.userId : 'system',
      liftedAt:  new Date().toISOString(),
      wasActive: !!prev,
    });
    AuditLog.log('lockdown_lift', { metadata: { liftedBy: session ? session.userId : 'system' } });
  }

  // ── Session helpers ────────────────────────────────────────────────────────

  function generateSessionId() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return 'ses_' + Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  function now() { return new Date().toISOString(); }

  async function getAllSessions() {
    return DataStore.list(SESSIONS_COLLECTION);
  }

  async function getActiveSessions(userId) {
    const all         = await getAllSessions();
    const cutoff      = new Date(Date.now() - ACTIVE_THRESHOLD_MS).toISOString();
    let active = all.filter(s => {
      const lastSeen = s.lastActivity || s.loginTime;
      return !s.loggedOutAt && lastSeen >= cutoff;
    });
    if (userId) active = active.filter(s => s.userId === userId);
    return active;
  }

  async function forceLogout(sessionToken) {
    const all     = await getAllSessions();
    const session = all.find(s => s.sessionToken === sessionToken);
    if (!session) return { success: false, error: 'Session not found' };
    if (session.loggedOutAt) return { success: false, error: 'Session already ended' };

    await DataStore.update(SESSIONS_COLLECTION, session.id, { loggedOutAt: now(), forcedLogout: true });

    AppEvents.emit('security:force-logout', { sessionToken, userId: session.userId });
    AuditLog.log('force_logout', {
      collection: SESSIONS_COLLECTION,
      recordId: session.id,
      metadata: { targetUserId: session.userId, sessionToken },
    });
    return { success: true, session };
  }

  // ── Login history ──────────────────────────────────────────────────────────

  async function getLoginHistory(filters = {}) {
    const { userId, startDate, endDate, deviceFingerprint, limit: lim } = filters;
    let sessions = await getAllSessions();

    if (userId)           sessions = sessions.filter(s => s.userId === userId);
    if (startDate)        sessions = sessions.filter(s => s.loginTime >= startDate);
    if (endDate)          sessions = sessions.filter(s => s.loginTime <= endDate);
    if (deviceFingerprint) sessions = sessions.filter(s => s.deviceFingerprint === deviceFingerprint);

    sessions.sort((a, b) => b.loginTime.localeCompare(a.loginTime));
    if (lim) sessions = sessions.slice(0, lim);
    return sessions;
  }

  // ── Failed-attempt helpers ─────────────────────────────────────────────────

  async function getFailedAttempts(hoursBack = 24) {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    try {
      const entries = await AuditLog.getEntries({ action: 'login_failed', startDate: since });
      return entries;
    } catch { return []; }
  }

  // ── Anomaly detection ──────────────────────────────────────────────────────

  function isOddHour(isoTimestamp) {
    const h = new Date(isoTimestamp).getHours();
    return h >= ODD_HOUR_START || h < ODD_HOUR_END;
  }

  async function getAnomalies() {
    const anomalies = [];
    const sessions  = await getAllSessions();

    // 1. Odd-hour logins
    sessions.forEach(s => {
      if (isOddHour(s.loginTime)) {
        anomalies.push({
          type:      'odd_hour_login',
          severity:  'medium',
          userId:    s.userId,
          sessionId: s.id,
          timestamp: s.loginTime,
          detail:    `Login at ${new Date(s.loginTime).toLocaleTimeString()} (outside normal hours)`,
        });
      }
    });

    // 2. Failed-login clusters (3+ failures within 15 min window)
    const failedEntries = await getFailedAttempts(24);
    // Group by userId
    const byUser = {};
    failedEntries.forEach(e => {
      const uid = e.userId || 'unknown';
      if (!byUser[uid]) byUser[uid] = [];
      byUser[uid].push(e.timestamp);
    });
    Object.entries(byUser).forEach(([uid, timestamps]) => {
      const sorted = [...timestamps].sort();
      for (let i = 0; i <= sorted.length - FAILED_CLUSTER_THRESHOLD; i++) {
        const windowEnd = new Date(sorted[i]).getTime() + FAILED_CLUSTER_WINDOW_MS;
        const cluster   = sorted.slice(i).filter(ts => new Date(ts).getTime() <= windowEnd);
        if (cluster.length >= FAILED_CLUSTER_THRESHOLD) {
          anomalies.push({
            type:      'failed_login_cluster',
            severity:  'high',
            userId:    uid,
            timestamp: sorted[i],
            detail:    `${cluster.length} failed login attempts within 15 minutes`,
            count:     cluster.length,
          });
          break; // One anomaly per user per sweep is sufficient
        }
      }
    });

    // 3. Concurrent sessions (same user, both active)
    const activeSessions = await getActiveSessions();
    const activeByUser   = {};
    activeSessions.forEach(s => {
      if (!activeByUser[s.userId]) activeByUser[s.userId] = [];
      activeByUser[s.userId].push(s);
    });
    Object.entries(activeByUser).forEach(([uid, slist]) => {
      if (slist.length > 1) {
        anomalies.push({
          type:      'concurrent_sessions',
          severity:  'medium',
          userId:    uid,
          timestamp: now(),
          detail:    `${slist.length} concurrent active sessions detected`,
          sessions:  slist.map(s => ({ id: s.id, deviceInfo: s.deviceInfo, loginTime: s.loginTime })),
        });
      }
    });

    // 4. New device alerts — login from a device fingerprint not seen before for that user
    const knownFingerprints = {};
    // Build history oldest-first so we can detect "first time" per fingerprint
    const historical = [...sessions].sort((a, b) => a.loginTime.localeCompare(b.loginTime));
    historical.forEach(s => {
      if (!knownFingerprints[s.userId]) knownFingerprints[s.userId] = new Set();
      const fp   = s.deviceFingerprint;
      const seen = knownFingerprints[s.userId];
      if (fp && !seen.has(fp)) {
        // First occurrence — only flag as anomaly if there is already at least one known device
        if (seen.size > 0) {
          anomalies.push({
            type:        'new_device',
            severity:    'high',
            userId:      s.userId,
            sessionId:   s.id,
            timestamp:   s.loginTime,
            detail:      `Login from previously unseen device: ${s.deviceInfo || fp}`,
            fingerprint: fp,
            deviceInfo:  s.deviceInfo,
          });
        }
        seen.add(fp);
      }
    });

    // Sort by severity then timestamp (high first, newest first within severity)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    anomalies.sort((a, b) => {
      const sv = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
      if (sv !== 0) return sv;
      return b.timestamp.localeCompare(a.timestamp);
    });

    return anomalies;
  }

  // ── Internal: record a session on login ───────────────────────────────────

  async function recordSession(loginData) {
    const authSession = Auth.getSession();
    if (!authSession) return;

    const record = {
      id:                generateSessionId(),
      userId:            authSession.userId,
      userName:          authSession.name,
      role:              authSession.role,
      sessionToken:      authSession.sessionToken,
      loginTime:         authSession.loginTime,
      lastActivity:      authSession.lastActivity || authSession.loginTime,
      loggedOutAt:       null,
      forcedLogout:      false,
      deviceFingerprint: authSession.deviceFingerprint,
      deviceInfo:        authSession.deviceInfo,
      isOddHour:         isOddHour(authSession.loginTime),
    };

    try {
      await DataStore.create(SESSIONS_COLLECTION, record);
      AppEvents.emit('security:session-recorded', record);
    } catch (e) {
      console.error('[SecurityMonitor] Failed to record session:', e);
    }

    // Emit new-device alert if this fingerprint is new for the user
    const history = await getLoginHistory({ userId: record.userId });
    const uniqueFps = new Set(history.map(s => s.deviceFingerprint).filter(Boolean));
    // history already includes the just-recorded session, so > 1 means it's a new device
    if (uniqueFps.size > 1 && record.deviceFingerprint) {
      const prevSessions = history.filter(s => s.deviceFingerprint !== record.deviceFingerprint);
      if (prevSessions.length > 0) {
        AppEvents.emit('security:new-device', {
          userId:      record.userId,
          deviceInfo:  record.deviceInfo,
          fingerprint: record.deviceFingerprint,
          loginTime:   record.loginTime,
        });
      }
    }

    // Emit odd-hour warning
    if (record.isOddHour) {
      AppEvents.emit('security:odd-hour-login', {
        userId:    record.userId,
        loginTime: record.loginTime,
        deviceInfo: record.deviceInfo,
      });
    }

    // Emit concurrent-session warning if needed
    const active = await getActiveSessions(record.userId);
    if (active.length > 1) {
      AppEvents.emit('security:concurrent-sessions', {
        userId:   record.userId,
        count:    active.length,
        sessions: active.map(s => ({ id: s.id, deviceInfo: s.deviceInfo, loginTime: s.loginTime })),
      });
    }
  }

  async function closeSession(logoutData) {
    const { userId } = logoutData || {};
    if (!userId) return;
    const active = await getActiveSessions(userId);
    // Close the most recent session that has no loggedOutAt
    const open = active.filter(s => !s.loggedOutAt);
    if (!open.length) return;
    open.sort((a, b) => b.loginTime.localeCompare(a.loginTime));
    const target  = open[0];
    try {
      await DataStore.update(SESSIONS_COLLECTION, target.id, { loggedOutAt: now() });
    } catch (e) {
      console.error('[SecurityMonitor] Failed to close session:', e);
    }
  }

  // ── init ───────────────────────────────────────────────────────────────────

  function init() {
    // Hook into auth events
    AppEvents.on('auth:login',  (data) => recordSession(data));
    AppEvents.on('auth:logout', (data) => closeSession(data));

    // On startup, check lockdown auto-expiry
    isLockdownActive();

    console.log('[SecurityMonitor] Initialised — watching auth:login and auth:logout events.');
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Session queries
    getActiveSessions,
    forceLogout,
    getLoginHistory,

    // Anomaly & failure tracking
    getFailedAttempts,
    getAnomalies,

    // Emergency lockdown
    activateLockdown,
    liftLockdown,
    isLockdownActive,

    // Bootstrap
    init,
  };
})();

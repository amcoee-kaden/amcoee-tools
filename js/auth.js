/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Auth & Session Management
   5-tier roles, PIN hashing, lockout, session tokens, fingerprinting
   ══════════════════════════════════════════════════════════════════════════════ */

const Auth = (() => {
  const SESSION_KEY = 'amcoee_session';
  const USERS_KEY = 'amcoee_users';
  const PREFS_KEY = 'amcoee_prefs';
  const LOCKOUT_KEY = 'amcoee_lockouts';
  const USERS_VERSION = 3;

  const ROLE_CONFIG = {
    owner:      { label: 'Owner',              color: '#ef4444', tier: 0 },
    head_admin: { label: 'Head Administrator', color: '#f97316', tier: 1 },
    admin:      { label: 'Administrator',      color: '#a855f7', tier: 2 },
    office:     { label: 'Office Staff',       color: '#3b82f6', tier: 3 },
    field:      { label: 'Field Technician',   color: '#22c55e', tier: 4 },
    external:   { label: 'External',           color: '#6b7280', tier: 5 },
  };

  const DEFAULT_USERS = [
    { id: 'u1', name: 'Jeremy Silva',   email: 'jeremy@amcoee.com', role: 'owner',      pin: null, rawPin: '123456', avatar: 'JS', department: null, status: 'active' },
    { id: 'u2', name: 'Kaden DaSilva',  email: 'kaden@amcoee.com',  role: 'head_admin', pin: null, rawPin: '123456', avatar: 'KD', department: null, status: 'active' },
    { id: 'u3', name: 'Mike Torres',    email: 'mike@amcoee.com',   role: 'field',      pin: null, rawPin: '123456', avatar: 'MT', department: null, status: 'active' },
    { id: 'u4', name: 'Sarah Ochoa',    email: 'sarah@amcoee.com',  role: 'office',     pin: null, rawPin: '123456', avatar: 'SO', department: null, status: 'active' },
    { id: 'u5', name: 'James Bell',     email: 'james@amcoee.com',  role: 'field',      pin: null, rawPin: '123456', avatar: 'JB', department: null, status: 'active' },
    { id: 'u6', name: 'Dana Clark',     email: 'dana@amcoee.com',   role: 'office',     pin: null, rawPin: '123456', avatar: 'DC', department: null, status: 'active' },
  ];

  const DEFAULT_PREFS = {
    theme: 'dark',
    accentColor: '#f97316',
    sidebarCollapsed: false,
    dashboardLayout: 'default',
    notifications: true,
    sessionTimeout: 480,
    pinLength: 6,
  };

  function timingSafeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  function sessionHmac(session) {
    const data = session.userId + session.role + session.loginTime;
    return CryptoJS.HmacSHA256(data, 'amcoee_session_integrity').toString().slice(0, 16);
  }

  function hashPin(pin) {
    let hash = pin + '_amcoee$v2$Kx9mZ!2026#salt';
    for (let i = 0; i < 1000; i++) {
      hash = CryptoJS.SHA256(hash).toString();
    }
    return hash;
  }

  function getUsers() {
    try {
      const storedVersion = localStorage.getItem(USERS_KEY + '_version');
      let users = JSON.parse(localStorage.getItem(USERS_KEY));
      if (!users || storedVersion !== String(USERS_VERSION)) {
        // Re-seed: hash PINs from defaults
        users = DEFAULT_USERS.map(u => {
          const hashed = { ...u, pin: hashPin(u.rawPin) };
          delete hashed.rawPin;
          return hashed;
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(USERS_KEY + '_version', String(USERS_VERSION));
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
      lockouts[userId].lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    saveLockouts(lockouts);
    return lockouts[userId];
  }

  function clearLockout(userId) {
    const lockouts = getLockouts();
    delete lockouts[userId];
    saveLockouts(lockouts);
  }

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

      // Validate session token format (64 hex chars)
      if (!session.sessionToken || !/^[0-9a-f]{64}$/.test(session.sessionToken)) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Validate session creation timestamp exists and is not in the future
      if (!session.loginTime || new Date(session.loginTime).getTime() > Date.now()) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

      // Verify session integrity HMAC
      if (!session.integrity || session.integrity !== sessionHmac(session)) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }

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
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return;
      const session = JSON.parse(stored);
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
  }

  function login(userId, pin) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.status !== 'active') return { success: false, error: 'Account is inactive' };

    if (isLockedOut(userId)) {
      const lockouts = getLockouts();
      const until = new Date(lockouts[userId].lockedUntil);
      const mins = Math.ceil((until - Date.now()) / 60000);
      AppEvents.emit('auth:lockout', { userId, minutes: mins });
      return { success: false, error: `Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` };
    }

    const hashedInput = hashPin(pin);
    if (!timingSafeCompare(user.pin, hashedInput)) {
      const lockout = recordFailedAttempt(userId);
      const remaining = 5 - lockout.attempts;
      AppEvents.emit('auth:failed', { userId, attempts: lockout.attempts });
      if (lockout.lockedUntil) {
        return { success: false, error: 'Too many attempts. Account locked for 15 minutes.' };
      }
      return { success: false, error: `Invalid PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
    }

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
    session.integrity = sessionHmac(session);
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
    // Drop the device-scoped prefs cache so the next user starts fresh
    try { localStorage.removeItem('amcoee_prefs_v2'); } catch {}
    window.location.hash = '';
    window.location.reload();
  }

  function reauth(pin) {
    const session = getSession();
    if (!session) return false;
    const user = getUserById(session.userId);
    if (!user) return false;
    return timingSafeCompare(user.pin, hashPin(pin));
  }

  function hasPermission(permission) {
    const session = getSession();
    if (!session) return false;
    return PermissionGuard.hasPermission(session.role, permission);
  }

  function getRoleConfig(role) {
    return ROLE_CONFIG[role] || ROLE_CONFIG.field;
  }

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

  let heartbeatTimer = null;
  function startHeartbeat() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const beat = () => {
      touchSession();
      clearTimeout(heartbeatTimer);
      const session = getSession();
      if (!session) return;
      const prefs = getPrefs(session.userId);
      heartbeatTimer = setTimeout(() => {
        AppEvents.emit('auth:session-warning');
      }, ((prefs.sessionTimeout || 480) - 5) * 60 * 1000);
    };
    events.forEach(e => document.addEventListener(e, beat, { passive: true }));
    beat();
  }

  return {
    getUsers, saveUsers, getUserById, getSession, login, logout, reauth,
    hasPermission, getRoleConfig, getPrefs, savePrefs,
    hashPin, getDeviceFingerprint, getDeviceInfo, generateSessionToken,
    isLockedOut, startHeartbeat, touchSession, timingSafeCompare, sessionHmac,
    ROLE_CONFIG, DEFAULT_PREFS
  };
})();

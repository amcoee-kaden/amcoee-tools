/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Auth & User Management
   Mock auth with role-based access, localStorage persistence
   ══════════════════════════════════════════════════════════════════════════════ */

const Auth = (() => {
  const STORAGE_KEY = 'amcoee_session';
  const USERS_KEY = 'amcoee_users';
  const PREFS_KEY = 'amcoee_prefs';

  // Default users — replace with real auth later (Firebase/Supabase)
  const DEFAULT_USERS = [
    { id: 'u1', name: 'Kaden DaSilva', email: 'kaden@amcoee.com', role: 'admin', pin: '1234', avatar: 'KD' },
    { id: 'u2', name: 'Jeremy Silva', email: 'jeremy@amcoee.com', role: 'admin', pin: '5678', avatar: 'JS' },
    { id: 'u3', name: 'Mike Torres', email: 'mike@amcoee.com', role: 'field', pin: '1111', avatar: 'MT' },
    { id: 'u4', name: 'Sarah Ochoa', email: 'sarah@amcoee.com', role: 'office', pin: '2222', avatar: 'SO' },
    { id: 'u5', name: 'James Bell', email: 'james@amcoee.com', role: 'field', pin: '3333', avatar: 'JB' },
    { id: 'u6', name: 'Dana Clark', email: 'dana@amcoee.com', role: 'office', pin: '4444', avatar: 'DC' },
  ];

  const DEFAULT_PREFS = {
    theme: 'dark',
    accentColor: '#f97316',
    sidebarCollapsed: false,
    dashboardLayout: 'default',
    notifications: true,
  };

  // Role hierarchy & permissions
  const ROLE_CONFIG = {
    admin: {
      label: 'Administrator',
      color: '#f97316',
      permissions: [
        'dashboard', 'jobs', 'timeclock', 'crm', 'invoicing', 'scheduling',
        'inventory', 'documents', 'safety', 'fleet', 'announcements',
        'expenses', 'reporting', 'employees', 'payroll', 'settings', 'tool-tracker'
      ]
    },
    office: {
      label: 'Office Staff',
      color: '#3b82f6',
      permissions: [
        'dashboard', 'jobs', 'timeclock', 'crm', 'invoicing', 'scheduling',
        'inventory', 'documents', 'safety', 'fleet', 'announcements',
        'expenses', 'reporting.limited', 'tool-tracker'
      ]
    },
    field: {
      label: 'Field Technician',
      color: '#22c55e',
      permissions: [
        'dashboard', 'jobs.own', 'timeclock', 'scheduling.own',
        'inventory.request', 'documents.safety', 'safety',
        'fleet.assigned', 'announcements', 'expenses.submit', 'tool-tracker'
      ]
    }
  };

  function getUsers() {
    try {
      const stored = localStorage.getItem(USERS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_USERS;
    } catch { return DEFAULT_USERS; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  }

  function login(userId, pin) {
    const users = getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.pin !== pin) return { success: false, error: 'Invalid PIN' };

    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { success: true, session };
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.hash = '';
    window.location.reload();
  }

  function hasPermission(permission) {
    const session = getSession();
    if (!session) return false;
    const role = ROLE_CONFIG[session.role];
    if (!role) return false;
    // Admin has everything
    if (session.role === 'admin') return true;
    // Check exact match or parent match (e.g., 'jobs' matches 'jobs.own')
    return role.permissions.some(p => p === permission || p.startsWith(permission + '.') || permission.startsWith(p));
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

  return {
    getUsers, saveUsers, getSession, login, logout,
    hasPermission, getRoleConfig, getPrefs, savePrefs,
    ROLE_CONFIG, DEFAULT_PREFS
  };
})();

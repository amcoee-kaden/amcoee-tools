/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Permission Guard
   Cascading dot-notation permission system with 5-tier roles
   ══════════════════════════════════════════════════════════════════════════════ */

const PermissionGuard = (() => {

  const ROLE_PERMISSIONS = {
    owner: ['*'],
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

  const ROLE_TIERS = {
    owner: 0,
    head_admin: 1,
    admin: 2,
    office: 3,
    field: 4
  };

  const OWNER_ONLY = ['data.wipe', 'owner.modify-head-admin'];

  function hasPermission(role, permission) {
    if (!role || !permission) return false;
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;

    if (OWNER_ONLY.includes(permission) && role !== 'owner') return false;
    if (perms.includes('*')) return true;
    if (perms.includes(permission)) return true;

    for (const p of perms) {
      if (permission.startsWith(p + '.')) return true;
    }
    for (const p of perms) {
      if (p.startsWith(permission + '.')) return true;
    }

    return false;
  }

  function check(permission) {
    const session = Auth.getSession();
    if (!session) return false;
    return hasPermission(session.role, permission);
  }

  function getTier(role) {
    return ROLE_TIERS[role] !== undefined ? ROLE_TIERS[role] : 999;
  }

  function canModify(roleA, roleB) {
    if (roleA === 'owner') return true;
    if (roleA === 'head_admin' && roleB !== 'owner') return true;
    return getTier(roleA) < getTier(roleB);
  }

  function hasOwnerDashboard(role) {
    return role === 'owner' || role === 'head_admin';
  }

  function getPermissions(role) {
    return ROLE_PERMISSIONS[role] || [];
  }

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

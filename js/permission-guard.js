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
    ],
    external: [
      'dashboard', 'jobs.own', 'scheduling.own', 'documents.safety',
      'announcements', 'expenses.submit'
    ]
  };

  const ROLE_TIERS = {
    owner: 0,
    head_admin: 1,
    admin: 2,
    office: 3,
    field: 4,
    external: 5
  };

  const ROLE_LABELS = {
    owner:      'Owner',
    head_admin: 'Head Administrator',
    admin:      'Administrator',
    office:     'Office Staff',
    field:      'Field Technician',
    external:   'External',
  };

  const OWNER_ONLY = ['data.wipe', 'owner.modify-head-admin'];

  /* ──────────────────────────────────────────────────────────────────────────
     Collection-level capability matrix.
     Verbs: view, view.own, create, edit, edit.own, delete.
     A role listed under 'view' can see every record. Under 'view.own' only
     sees records that reference them (see ownsRecord). Safe defaults below;
     we'll dial these in per-tool with the user.
  ────────────────────────────────────────────────────────────────────────── */
  const COLLECTION_RULES = {
    jobs: {
      view:        ['owner','head_admin','admin','office'],
      'view.own':  ['field','external'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      'delete':    ['owner','head_admin','admin'],
    },
    schedule: {
      view:        ['owner','head_admin','admin','office'],
      'view.own':  ['field','external'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      delete:      ['owner','head_admin','admin'],
    },
    clock_entries: {
      view:        ['owner','head_admin','admin','office'],
      'view.own':  ['field'],
      create:      ['owner','head_admin','admin','office','field'],
      edit:        ['owner','head_admin','admin','office'],
      'edit.own':  ['field'],
      delete:      ['owner','head_admin','admin'],
    },
    expenses: {
      view:        ['owner','head_admin','admin','office'],
      'view.own':  ['field','external'],
      create:      ['owner','head_admin','admin','office','field','external'],
      edit:        ['owner','head_admin','admin','office'],
      'edit.own':  ['field','external'],
      delete:      ['owner','head_admin','admin'],
    },
    invoices: {
      view:        ['owner','head_admin','admin','office'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      delete:      ['owner','head_admin','admin'],
    },
    crm: {
      view:        ['owner','head_admin','admin','office'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      delete:      ['owner','head_admin','admin'],
    },
    payroll: {
      view:        ['owner','head_admin','admin'],
      create:      ['owner','head_admin','admin'],
      edit:        ['owner','head_admin','admin'],
      delete:      ['owner'],
    },
    fleet: {
      view:        ['owner','head_admin','admin','office'],
      'view.own':  ['field'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      delete:      ['owner','head_admin','admin'],
    },
    tool_assets: {
      view:        ['owner','head_admin','admin','office'],
      'view.own':  ['field'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      'edit.own':  ['field'],
      delete:      ['owner','head_admin','admin'],
    },
    inventory: {
      view:        ['owner','head_admin','admin','office','field'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      delete:      ['owner','head_admin','admin'],
    },
    announcements: {
      view:        ['owner','head_admin','admin','office','field','external'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin'],
      delete:      ['owner','head_admin','admin'],
    },
    documents: {
      view:        ['owner','head_admin','admin','office','field','external'],
      create:      ['owner','head_admin','admin','office'],
      edit:        ['owner','head_admin','admin','office'],
      delete:      ['owner','head_admin','admin'],
    },
    safety: {
      view:        ['owner','head_admin','admin','office'],
      'view.own':  ['field'],
      create:      ['owner','head_admin','admin','office','field'],
      edit:        ['owner','head_admin','admin','office'],
      'edit.own':  ['field'],
      delete:      ['owner','head_admin','admin'],
    },
    audit_log: {
      view:        ['owner','head_admin','admin'],
    },
    users: {
      view:        ['owner','head_admin','admin','office'],
      create:      ['owner','head_admin'],
      edit:        ['owner','head_admin','admin'],
      delete:      ['owner','head_admin'],
    },
    departments: {
      view:        ['owner','head_admin','admin','office'],
      create:      ['owner','head_admin','admin'],
      edit:        ['owner','head_admin','admin'],
      delete:      ['owner','head_admin'],
    },
  };

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

  /* ──────────────────────────────────────────────────────────────────────────
     Collection capability helpers
  ────────────────────────────────────────────────────────────────────────── */

  function _rules(collection) {
    return COLLECTION_RULES[collection] || null;
  }

  /* Does the record belong to the caller? Used for *.own verbs. */
  function ownsRecord(session, collection, record) {
    if (!session || !record) return false;
    const name = session.name;
    const userId = session.userId;
    switch (collection) {
      case 'jobs':
      case 'schedule':
        return Array.isArray(record.crew) && record.crew.includes(name);
      case 'clock_entries':
        return record.employee === name;
      case 'expenses':
        return record.submittedBy === name;
      case 'tool_assets':
        return record.checkedOutTo === name;
      case 'fleet':
        return record.driver === name;
      case 'safety':
        return record.reporter === name;
      case 'users':
        return record.id === userId;
      default:
        return false;
    }
  }

  /* Is the user on the role list for a verb? Trusted-viewer flag grants
     view/view.all if the rule has a view verb. */
  function canDo(session, verb, collection, record) {
    if (!session) return false;
    const role = session.role;
    if (role === 'owner' || role === 'head_admin') return true;

    const rules = _rules(collection);
    if (!rules) return false;

    // Trusted viewer flag: treats view.own as view (see-all) for that user
    const trusted = !!session.trustedViewer;

    if (verb === 'view') {
      if (rules.view && rules.view.includes(role)) return true;
      if (trusted && (rules.view || rules['view.own'])) return true;
      if (rules['view.own'] && rules['view.own'].includes(role)) {
        // they can view but only their own — if a specific record is passed,
        // only return true when it's theirs.
        return record ? ownsRecord(session, collection, record) : true;
      }
      return false;
    }
    if (verb === 'view.all') {
      if (rules.view && rules.view.includes(role)) return true;
      return trusted;
    }
    if (verb === 'view.own') {
      return (rules['view.own'] && rules['view.own'].includes(role)) ||
             (rules.view && rules.view.includes(role)) ||
             trusted;
    }
    if (verb === 'create') {
      return rules.create && rules.create.includes(role);
    }
    if (verb === 'edit') {
      if (rules.edit && rules.edit.includes(role)) return true;
      if (rules['edit.own'] && rules['edit.own'].includes(role) && record) {
        return ownsRecord(session, collection, record);
      }
      return false;
    }
    if (verb === 'delete') {
      if (!(rules.delete && rules.delete.includes(role))) return false;
      if (record && rules['edit.own'] && !rules.edit?.includes(role)) {
        // Edge: if role only has edit.own, they can only delete own
        return ownsRecord(session, collection, record);
      }
      return true;
    }
    return false;
  }

  /* Filter an array of records to just what the caller may view. */
  function filterByCanView(session, collection, records) {
    if (!session || !Array.isArray(records)) return records || [];
    if (canDo(session, 'view.all', collection)) return records;
    if (canDo(session, 'view.own', collection)) return records.filter(r => ownsRecord(session, collection, r));
    return [];
  }

  /* Short-hand convenience */
  function canCreate(session, c)         { return canDo(session, 'create', c); }
  function canEdit(session, c, rec)       { return canDo(session, 'edit', c, rec); }
  function canDelete(session, c, rec)     { return canDo(session, 'delete', c, rec); }
  function canViewAll(session, c)         { return canDo(session, 'view.all', c); }

  return {
    hasPermission, check, getTier, canModify,
    hasOwnerDashboard, getPermissions, getRoles,
    canDo, ownsRecord, filterByCanView,
    canCreate, canEdit, canDelete, canViewAll,
    ROLE_PERMISSIONS, ROLE_TIERS, ROLE_LABELS, OWNER_ONLY, COLLECTION_RULES,
  };
})();

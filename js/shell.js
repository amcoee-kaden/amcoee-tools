/* ══════════════════════════════════════════════════════════════════════════════
   Shell — Shared App Shell for Multi-Page Architecture
   Included on every page EXCEPT index.html (login).
   ══════════════════════════════════════════════════════════════════════════════ */
const Shell = (function () {
  'use strict';

  // ── Navigation Items ────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { section: 'Main', items: [
      { id: 'command-center', href: 'command-center.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-5.5 3L12 2 7.5 7 2 4z"/><path d="M5 16h14v4H5z"/></svg>', label: 'Command Center', perm: 'owner-dashboard' },
      { id: 'dashboard', href: 'dashboard.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', label: 'Dashboard', perm: 'dashboard' },
    ]},
    { section: 'Operations', items: [
      { id: 'jobs', href: 'jobs.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', label: 'Job Board', perm: 'jobs' },
      { id: 'scheduling', href: 'schedule.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Scheduling', perm: 'scheduling' },
      { id: 'timeclock', href: 'timeclock.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', label: 'Time Clock', perm: 'timeclock' },
    ]},
    { section: 'Resources', items: [
      { id: 'tool-tracker', href: 'tools.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', label: 'Tool Tracker', perm: 'tool-tracker' },
      { id: 'inventory', href: 'inventory.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', label: 'Inventory', perm: 'inventory' },
      { id: 'fleet', href: 'fleet.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', label: 'Fleet', perm: 'fleet' },
    ]},
    { section: 'Business', items: [
      { id: 'crm', href: 'crm.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Customers', perm: 'crm' },
      { id: 'invoicing', href: 'invoicing.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', label: 'Invoicing', perm: 'invoicing' },
      { id: 'expenses', href: 'expenses.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>', label: 'Expenses', perm: 'expenses' },
    ]},
    { section: 'Communication', items: [
      { id: 'announcements', href: 'announcements.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', label: 'Announcements', perm: 'announcements' },
      { id: 'documents', href: 'documents.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', label: 'Documents', perm: 'documents' },
      { id: 'safety', href: 'safety.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', label: 'Safety', perm: 'safety' },
    ]},
    { section: 'Analytics', items: [
      { id: 'reporting', href: 'reports.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', label: 'Reports', perm: 'reporting' },
    ]},
    { section: 'Admin', items: [
      { id: 'employees', href: 'employees.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>', label: 'Employees', perm: 'employees' },
      { id: 'payroll', href: 'payroll.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', label: 'Payroll', perm: 'payroll' },
      { id: 'settings', href: 'settings.html', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', label: 'Settings', perm: 'settings' },
    ]},
  ];

  // ── Logout SVG icon ─────────────────────────────────────────────────────
  const LOGOUT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

  // ── Auth Guard ──────────────────────────────────────────────────────────
  function guardAuth() {
    const session = Auth.getSession();
    if (!session) {
      window.location.href = 'index.html';
      return null;
    }
    return session;
  }

  // ── Build Sidebar HTML ──────────────────────────────────────────────────
  function buildSidebar(session, activePageId) {
    let sectionsHtml = '';

    NAV_ITEMS.forEach(section => {
      const visibleItems = section.items.filter(item => Auth.hasPermission(item.perm));
      if (visibleItems.length === 0) return;

      let itemsHtml = '';
      visibleItems.forEach(item => {
        const activeClass = item.id === activePageId ? ' active' : '';
        itemsHtml += `<a href="${item.href}" class="sidebar-link${activeClass}" data-page-id="${item.id}">${item.icon}<span>${item.label}</span></a>`;
      });

      sectionsHtml += `
        <div class="sidebar-section">
          <div class="sidebar-section-title">${section.section}</div>
          ${itemsHtml}
        </div>`;
    });

    return `
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div style="font-size:22px">⚡</div>
        <div class="sidebar-logo-text"><span>AMCOEE</span> Tools</div>
      </div>
      <div class="sidebar-nav" id="sidebar-nav">
        ${sectionsHtml}
      </div>
      <div style="padding:var(--space-3);border-top:1px solid var(--border-primary)">
        <div class="sidebar-link" id="sidebar-logout" style="color:var(--status-error);cursor:pointer">
          ${LOGOUT_ICON}
          Sign Out
        </div>
      </div>
    </nav>`;
  }

  // ── Build Header HTML ───────────────────────────────────────────────────
  function buildHeader(session, pageTitle) {
    const roleConfig = Auth.getRoleConfig(session.role);
    return `
    <header class="main-header">
      <div class="flex items-center gap-3">
        <button class="mobile-menu-btn" id="shell-mobile-menu">☰</button>
        <div class="page-title-area">
          <h2 class="page-title" id="page-title">${pageTitle}</h2>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="notification-bell" id="notification-bell" title="Notifications">
          🔔
          <span class="notification-badge" id="notification-count" style="display:none">0</span>
        </div>
        <a href="profile.html" class="header-user" id="header-user" style="text-decoration:none;color:inherit">
          <div class="header-user-info">
            <div class="header-user-name" id="header-user-name">${session.name}</div>
            <div class="header-user-role" id="header-user-role">${roleConfig.label}</div>
          </div>
          <div class="avatar" id="header-avatar" style="background:${roleConfig.color}">${session.avatar}</div>
        </a>
      </div>
    </header>`;
  }

  // ── Toggle Sidebar (mobile) ─────────────────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  }

  // ── Sign Out Handler ────────────────────────────────────────────────────
  function handleSignOut() {
    Auth.logout();
    window.location.href = 'index.html';
  }

  // ── Init ────────────────────────────────────────────────────────────────
  function init(options) {
    options = options || {};

    // Anti-clickjacking: prevent framing
    if (window.self !== window.top) {
      document.body.innerHTML = '<h1>Access denied</h1>';
      throw new Error('Framing not allowed');
    }

    // 1. Auth guard — redirect if no session
    const session = guardAuth();
    if (!session) return;

    // Session integrity check on page load
    if (typeof Auth !== 'undefined' && Auth.sessionHmac) {
      const stored = JSON.parse(localStorage.getItem('amcoee_session') || 'null');
      if (stored && stored.integrity !== Auth.sessionHmac(stored)) {
        Auth.logout();
        return;
      }
    }

    const pageId = options.pageId || '';
    const pageTitle = options.pageTitle || document.title || 'AMCOEE Tools';

    // 2. Build the app shell into #app-shell
    const appShell = document.getElementById('app-shell');
    if (!appShell) {
      console.error('[Shell] Missing #app-shell element in page HTML.');
      return;
    }

    // Inject sidebar + header wrapping main-content around #main-body
    const mainBody = document.getElementById('main-body');
    const mainBodyContent = mainBody ? mainBody.innerHTML : '';

    // Build shell structure
    appShell.innerHTML =
      buildSidebar(session, pageId) +
      '<div class="main-content">' +
        buildHeader(session, pageTitle) +
        '<div class="main-body" id="main-body">' + mainBodyContent + '</div>' +
      '</div>';

    // Show the shell (in case it starts hidden)
    appShell.style.display = '';

    // 3. Bind event listeners

    // Mobile menu toggle
    const mobileBtn = document.getElementById('shell-mobile-menu');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', toggleSidebar);
    }

    // Sign out
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleSignOut);
    }

    // Close sidebar on link click (mobile)
    document.querySelectorAll('#sidebar-nav .sidebar-link').forEach(link => {
      link.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
      });
    });

    // 4. Init modules
    if (typeof Theme !== 'undefined' && Theme.init) {
      Theme.init();
    }

    if (typeof Auth !== 'undefined' && Auth.startHeartbeat) {
      Auth.startHeartbeat();
    }

    if (typeof AuditLog !== 'undefined' && AuditLog.initAutoLogging) {
      AuditLog.initAutoLogging();
    }

    if (typeof Analytics !== 'undefined' && Analytics.init) {
      Analytics.init();
    }

    if (typeof SecurityMonitor !== 'undefined' && SecurityMonitor.init) {
      SecurityMonitor.init();
    }

    return session;
  }

  // ── Public API ──────────────────────────────────────────────────────────
  return { init, toggleSidebar };
})();

/* ══════════════════════════════════════════════════════════════════════════════
   Shell — Premium App Shell for Multi-Page Architecture
   Included on every page EXCEPT index.html (login).
   Visual design matches the login page: gradient mesh, glass, grain, animations.
   ══════════════════════════════════════════════════════════════════════════════ */
const Shell = (function () {
  'use strict';

  // ── Navigation Items ────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { section: 'Main', items: [
      { id: 'command-center', href: '#command-center', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-5.5 3L12 2 7.5 7 2 4z"/><path d="M5 16h14v4H5z"/></svg>', label: 'Command Center', perm: 'owner-dashboard' },
      { id: 'dashboard', href: '#dashboard', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>', label: 'Dashboard', perm: 'dashboard' },
    ]},
    { section: 'Operations', items: [
      { id: 'jobs', href: '#jobs', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>', label: 'Job Board', perm: 'jobs' },
      { id: 'scheduling', href: '#schedule', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Scheduling', perm: 'scheduling' },
      { id: 'timeclock', href: '#timeclock', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', label: 'Time Clock', perm: 'timeclock' },
    ]},
    { section: 'Resources', items: [
      { id: 'tool-tracker', href: '#tools', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>', label: 'Tool Tracker', perm: 'tool-tracker' },
      { id: 'inventory', href: '#inventory', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>', label: 'Inventory', perm: 'inventory' },
      { id: 'fleet', href: '#fleet', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>', label: 'Fleet', perm: 'fleet' },
    ]},
    { section: 'Business', items: [
      { id: 'crm', href: '#crm', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Customers', perm: 'crm' },
      { id: 'invoicing', href: '#invoicing', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', label: 'Invoicing', perm: 'invoicing' },
      { id: 'expenses', href: '#expenses', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>', label: 'Expenses', perm: 'expenses' },
    ]},
    { section: 'Communication', items: [
      { id: 'announcements', href: '#announcements', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>', label: 'Announcements', perm: 'announcements' },
      { id: 'documents', href: '#documents', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', label: 'Documents', perm: 'documents' },
      { id: 'safety', href: '#safety', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', label: 'Safety', perm: 'safety' },
    ]},
    { section: 'Analytics', items: [
      { id: 'reporting', href: '#reports', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', label: 'Reports', perm: 'reporting' },
    ]},
    { section: 'Admin', items: [
      { id: 'employees', href: '#employees', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>', label: 'Employees', perm: 'employees' },
      { id: 'payroll', href: '#payroll', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>', label: 'Payroll', perm: 'payroll' },
      { id: 'settings', href: '#settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', label: 'Settings', perm: 'settings' },
    ]},
  ];

  // ── Logout SVG icon ─────────────────────────────────────────────────────
  const LOGOUT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';

  // ── Inject Shell Styles ─────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('shell-premium-styles')) return;
    const style = document.createElement('style');
    style.id = 'shell-premium-styles';
    style.textContent = `
/* ══════════════════════════════════════════════════════════════════════════════
   Shell · Light Liquid Glass (Apple Mail / Reminders / Tahoe Settings)
   Sidebar: vibrancy-tinted white material. Header: chrome toolbar. Body:
   #F2F2F7 grouped background. Pill-shaped active nav. Hairline separators.
   ══════════════════════════════════════════════════════════════════════════════ */

@keyframes shellEntrance {
  from { opacity: 0; }
  to   { opacity: 1; }
}

#app-shell {
  animation: shellEntrance 320ms cubic-bezier(0.25, 0.8, 0.25, 1) both;
}

/* ── Ambient wallpaper — VIVID saturated gradient orbs.
       This is the key: the glass has to have real color to refract.
       Pastels on near-white will always look like slightly tinted white. ── */
.shell-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background: #EEF0F8;
}
.shell-bg::before, .shell-bg::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(130px);
  pointer-events: none;
  opacity: 1;
}
.shell-bg::before {
  width: 80vmax; height: 80vmax;
  background: radial-gradient(circle, #3B82F6 0%, rgba(59, 130, 246, 0.45) 34%, transparent 62%);
  top: -24vmax; left: -22vmax;
}
.shell-bg::after {
  width: 70vmax; height: 70vmax;
  background: radial-gradient(circle, #AF52DE 0%, rgba(175, 82, 222, 0.42) 34%, transparent 62%);
  bottom: -20vmax; right: -16vmax;
}
.shell-bg .shell-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(130px);
  pointer-events: none;
}
.shell-bg .shell-orb-1 {
  width: 55vmax; height: 55vmax;
  background: radial-gradient(circle, #FF9500 0%, rgba(255, 149, 0, 0.38) 34%, transparent 62%);
  top: 30%; left: 36%;
  opacity: 0.72;
}
.shell-bg .shell-orb-2 {
  width: 50vmax; height: 50vmax;
  background: radial-gradient(circle, #34C759 0%, rgba(52, 199, 89, 0.32) 34%, transparent 62%);
  top: 4%; right: 18%;
  opacity: 0.68;
}
.main-body-noise { display: none; }
.sidebar-mesh { display: none; }

/* ══════════════════════════════════════════════════════════════════════════════
   SIDEBAR — Real Liquid Glass (transparent, wallpaper bleeds through)
   ══════════════════════════════════════════════════════════════════════════════ */
.sidebar.glass {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 248px;
  background: rgba(255, 255, 255, 0.18);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transition: transform 320ms cubic-bezier(0.25, 0.8, 0.25, 1);
  isolation: isolate;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 1.00),
    inset -1px 0 0 rgba(0, 0, 0, 0.06);
}

/* Refraction layer — light blur, content shows through visibly */
.sidebar.glass::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(22px) saturate(220%) brightness(1.08);
  -webkit-backdrop-filter: blur(22px) saturate(220%) brightness(1.08);
  filter: url(#lg-refract);
  pointer-events: none;
  z-index: 0;
}

/* Trailing-edge meniscus */
.sidebar.glass::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 1px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.85) 0%,
    rgba(255, 255, 255, 0.25) 20%,
    rgba(0, 0, 0, 0.05) 80%,
    rgba(0, 0, 0, 0.10) 100%
  );
  pointer-events: none;
  z-index: 2;
}

.sidebar.glass > * { position: relative; z-index: 1; }

/* ── Sidebar header / logo ─────────────────────────────────────────────────── */
.sidebar-header {
  position: relative;
  padding: 18px 20px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-logo-icon {
  width: 30px; height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border-radius: 8px;
  background: linear-gradient(180deg, #0A84FF 0%, #007AFF 55%, #0060DF 100%);
  color: #fff;
  flex-shrink: 0;
  box-shadow:
    inset 0 0.5px 0 rgba(255, 255, 255, 0.35),
    0 1px 2px rgba(0, 0, 0, 0.10),
    0 1px 3px rgba(0, 122, 255, 0.25);
}

.sidebar-logo-text {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.022em;
  color: var(--text-primary);
}

.sidebar-logo-text .logo-brand  { color: var(--text-primary); font-weight: 600; }
.sidebar-logo-text .logo-suffix { color: var(--text-secondary); font-weight: 400; }

/* ── Sidebar nav sections ──────────────────────────────────────────────────── */
.sidebar-nav {
  position: relative;
  flex: 1;
  padding: 4px 10px 10px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.12) transparent;
}
.sidebar-nav::-webkit-scrollbar { width: 4px; }
.sidebar-nav::-webkit-scrollbar-track { background: transparent; }
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}
.sidebar-nav::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.20); }

.sidebar-section { margin: 10px 0 2px; }

.sidebar-section-title {
  font-size: 11px;
  font-weight: 590;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 6px 10px 4px;
}

/* ── Nav rows — pill capsules (iOS 26 signature) ───────────────────────────── */
.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  margin: 2px 0;
  border-radius: 9999px;
  color: var(--text-primary);
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: -0.005em;
  cursor: pointer;
  text-decoration: none;
  position: relative;
  transition: background 180ms cubic-bezier(0.25, 0.8, 0.25, 1),
              color 180ms cubic-bezier(0.25, 0.8, 0.25, 1);
  opacity: 1;
}

.sidebar-link svg {
  width: 16px; height: 16px;
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: color 180ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.sidebar-link:hover  { background: rgba(0, 0, 0, 0.04); }
.sidebar-link:hover svg { color: var(--text-primary); }
.sidebar-link:active { background: rgba(0, 0, 0, 0.08); }

/* Active state — macOS Mail / Tahoe Settings pattern.
   The row is NOT a blue pill. It's a very subtle accent wash (the bar itself
   stays glass). The accent expresses through the ICON and a thin accent
   indicator on the leading edge. This is how Apple actually marks active
   navigation in Liquid Glass. */
.sidebar-link.active {
  position: relative;
  background: rgba(0, 122, 255, 0.06);
  color: var(--text-primary);
  font-weight: 590;
  box-shadow: none;
}
.sidebar-link.active::before {
  /* accent leading indicator — 3px tall pill on the left, vertically centered */
  content: '';
  position: absolute;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 9999px;
  background: var(--accent);
  box-shadow: 0 0 6px rgba(0, 122, 255, 0.45);
  pointer-events: none;
}
.sidebar-link.active:hover { background: rgba(0, 122, 255, 0.10); }
.sidebar-link.active svg { color: var(--accent); }

/* ── Logout row ────────────────────────────────────────────────────────────── */
.sidebar-logout-wrap {
  position: relative;
  padding: 8px 10px 12px;
  border-top: 0.5px solid var(--separator);
}

.sidebar-link.logout-link {
  color: var(--text-secondary);
}
.sidebar-link.logout-link svg { color: var(--text-tertiary); }
.sidebar-link.logout-link:hover {
  color: var(--system-red);
  background: var(--tint-red);
}
.sidebar-link.logout-link:hover svg { color: var(--system-red); }

/* ══════════════════════════════════════════════════════════════════════════════
   HEADER — Chrome material with hairline separator
   ══════════════════════════════════════════════════════════════════════════════ */
.main-content {
  margin-left: 248px;
  min-height: 100vh;
  position: relative;
  z-index: 1;
  transition: margin-left 320ms cubic-bezier(0.25, 0.8, 0.25, 1);
}

.main-header.glass {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.22);
  padding: 10px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 1.00),
    inset 0 -1px 0 rgba(0, 0, 0, 0.08);
  isolation: isolate;
}
.main-header.glass::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(22px) saturate(220%) brightness(1.08);
  -webkit-backdrop-filter: blur(22px) saturate(220%) brightness(1.08);
  filter: url(#lg-refract);
  pointer-events: none;
  z-index: 0;
}
.main-header.glass > * { position: relative; z-index: 1; }

.page-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 590;
  letter-spacing: -0.022em;
  color: var(--text-primary);
}

/* ── Header user area ──────────────────────────────────────────────────────── */
.header-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 4px 10px;
  border-radius: var(--radius-full);
  transition: background 150ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.header-user:hover { background: rgba(0, 0, 0, 0.04); }

.header-user-info { text-align: right; }

.header-user-name {
  font-size: 13px;
  font-weight: 590;
  letter-spacing: -0.008em;
  color: var(--text-primary);
}

.header-user-role {
  font-size: 11px;
  color: var(--text-tertiary);
  font-weight: 500;
  letter-spacing: 0;
}

.header-avatar {
  width: 30px; height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0;
  box-shadow:
    inset 0 0.5px 0 rgba(255, 255, 255, 0.28),
    0 1px 2px rgba(0, 0, 0, 0.14);
}

/* ── Notification bell ─────────────────────────────────────────────────────── */
.notification-bell {
  position: relative;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  transition: background 150ms cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.notification-bell:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-primary);
}
.notification-bell.has-notifications { /* no pulse — subtle badge is enough */ }

.notification-badge {
  position: absolute;
  top: -1px; right: -1px;
  background: var(--system-red);
  color: #fff;
  font-size: 10px;
  font-weight: 590;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0 4px;
  border: 1.5px solid rgba(242, 242, 247, 0.95);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.10);
}

/* ── Mobile hamburger ──────────────────────────────────────────────────────── */
.mobile-menu-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 6px;
  transition: background 150ms cubic-bezier(0.25, 0.8, 0.25, 1);
  align-items: center;
  justify-content: center;
}
.mobile-menu-btn:hover { background: rgba(0, 0, 0, 0.04); }

/* ── Main body ─────────────────────────────────────────────────────────────── */
.main-body {
  padding: 28px;
  max-width: 1400px;
  position: relative;
  z-index: 1;
  background: transparent;       /* let #F2F2F7 body show through */
}

/* ── Mobile overlay backdrop ───────────────────────────────────────────────── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.30);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 99;
  opacity: 0;
  transition: opacity 220ms cubic-bezier(0.25, 0.8, 0.25, 1);
}
.sidebar-overlay.visible {
  display: block;
  opacity: 1;
}

/* ══════════════════════════════════════════════════════════════════════════════
   RESPONSIVE — Mobile
   ══════════════════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .sidebar.glass {
    transform: translateX(-100%);
    box-shadow: none;
  }
  .sidebar.glass.open {
    transform: translateX(0);
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.20);
  }
  .main-content { margin-left: 0; }
  .mobile-menu-btn { display: flex; }
  .main-body { padding: 18px; }
}
`;
    document.head.appendChild(style);
  }

  // ── Auth Guard ──────────────────────────────────────────────────────────
  // Single-file app: if session is missing, reload to land on the login screen.
  function guardAuth() {
    const session = Auth.getSession();
    if (!session) {
      window.location.hash = '';
      window.location.reload();
      return null;
    }
    return session;
  }

  // ── Build Sidebar HTML ──────────────────────────────────────────────────
  function buildSidebar(session, activePageId) {
    let sectionsHtml = '';
    let linkIndex = 0;

    NAV_ITEMS.forEach(section => {
      const visibleItems = section.items.filter(item => Auth.hasPermission(item.perm));
      if (visibleItems.length === 0) return;

      let itemsHtml = '';
      visibleItems.forEach(item => {
        const activeClass = item.id === activePageId ? ' active' : '';
        const delay = 100 + linkIndex * 30;
        itemsHtml += `<a href="${item.href}" class="sidebar-link${activeClass}" data-page-id="${item.id}" style="animation-delay:${delay}ms">${item.icon}<span>${item.label}</span></a>`;
        linkIndex++;
      });

      sectionsHtml += `
        <div class="sidebar-section">
          <div class="sidebar-section-title">${section.section}</div>
          ${itemsHtml}
        </div>`;
    });

    return `
    <nav class="sidebar glass" id="sidebar">
      <div class="sidebar-mesh">
        <div class="sb-orb sb-orb-1"></div>
        <div class="sb-orb sb-orb-2"></div>
      </div>
      <div class="sidebar-header">
        <div class="sidebar-logo-icon">&#9889;</div>
        <div class="sidebar-logo-text"><span class="logo-brand">AMCOEE</span> <span class="logo-suffix">Tools</span></div>
      </div>
      <div class="sidebar-nav" id="sidebar-nav">
        ${sectionsHtml}
      </div>
      <div class="sidebar-logout-wrap">
        <div class="sidebar-link logout-link" id="sidebar-logout">
          ${LOGOUT_ICON}
          <span>Sign Out</span>
        </div>
      </div>
    </nav>`;
  }

  // ── Build Header HTML ───────────────────────────────────────────────────
  function buildHeader(session, pageTitle) {
    const roleConfig = Auth.getRoleConfig(session.role);
    return `
    <header class="main-header glass">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="mobile-menu-btn" id="shell-mobile-menu" aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hamburger-icon" id="hamburger-icon">
            <line x1="3" y1="6" x2="21" y2="6" class="ham-top"/>
            <line x1="3" y1="12" x2="21" y2="12" class="ham-mid"/>
            <line x1="3" y1="18" x2="21" y2="18" class="ham-bot"/>
          </svg>
        </button>
        <h2 class="page-title" id="page-title">${pageTitle}</h2>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="notification-bell" id="notification-bell" title="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notification-badge" id="notification-count" style="display:none">0</span>
        </div>
        <a href="#profile" class="header-user" id="header-user">
          <div class="header-user-info">
            <div class="header-user-name" id="header-user-name">${session.name}</div>
            <div class="header-user-role" id="header-user-role">${roleConfig.label}</div>
          </div>
          <div class="header-avatar" id="header-avatar" style="background:${roleConfig.color}">${session.avatar}</div>
        </a>
      </div>
    </header>`;
  }

  // ── Build background elements ───────────────────────────────────────────
  function buildShellBg() {
    return `
    <div class="shell-bg">
      <div class="shell-orb shell-orb-1"></div>
      <div class="shell-orb shell-orb-2"></div>
    </div>
    <svg class="main-body-noise" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" preserveAspectRatio="none">
      <filter id="shellNoise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#shellNoise)"/>
    </svg>`;
  }

  // ── Toggle Sidebar (mobile) ─────────────────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const hamburger = document.getElementById('hamburger-icon');

    if (sidebar) {
      const isOpen = sidebar.classList.toggle('open');
      if (overlay) {
        if (isOpen) {
          overlay.classList.add('visible');
        } else {
          overlay.classList.remove('visible');
        }
      }
      // Animate hamburger to X
      if (hamburger) {
        hamburger.classList.toggle('is-open', isOpen);
      }
    }
  }

  // ── Sign Out Handler ────────────────────────────────────────────────────
  // Single-file app: clear session then reload so the login screen mounts fresh.
  function handleSignOut() {
    Auth.logout();
    window.location.hash = '';
    window.location.reload();
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

    // 0. Inject premium styles
    injectStyles();

    // 2. Build the app shell into #app-shell
    const appShell = document.getElementById('app-shell');
    if (!appShell) {
      console.error('[Shell] Missing #app-shell element in page HTML.');
      return;
    }

    // Preserve existing main-body content
    const mainBody = document.getElementById('main-body');
    const mainBodyContent = mainBody ? mainBody.innerHTML : '';

    // Build shell structure
    appShell.innerHTML =
      buildShellBg() +
      buildSidebar(session, pageId) +
      '<div class="sidebar-overlay" id="sidebar-overlay"></div>' +
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

    // Mobile overlay click to close
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        overlay.classList.remove('visible');
        const hamburger = document.getElementById('hamburger-icon');
        if (hamburger) hamburger.classList.remove('is-open');
      });
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
        if (overlay) overlay.classList.remove('visible');
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

    if (typeof CardTilt !== 'undefined' && CardTilt.init) {
      CardTilt.init();
    }

    return session;
  }

  // ── Set active nav item + page title (called by router on hashchange) ──
  function setActivePage(pageId) {
    document.querySelectorAll('#sidebar-nav .sidebar-link').forEach(function(link) {
      if (link.dataset.pageId === pageId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
    // Update header page title if we can find a matching NAV_ITEMS entry
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
      for (let i = 0; i < NAV_ITEMS.length; i++) {
        const match = NAV_ITEMS[i].items.find(function(it) { return it.id === pageId; });
        if (match) { titleEl.textContent = match.label; return; }
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────
  return { init, toggleSidebar, setActivePage };
})();

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

  // ── Inject Shell Styles ─────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('shell-premium-styles')) return;
    const style = document.createElement('style');
    style.id = 'shell-premium-styles';
    style.textContent = `
/* ══════════════════════════════════════════════════════════════════════════════
   Shell Premium Styles — matches login page visual quality
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── CSS custom property for animated conic gradients ──────────────────────── */
@property --shell-icon-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

/* ── Shell entrance ────────────────────────────────────────────────────────── */
@keyframes shellEntrance {
  from { opacity: 0; }
  to   { opacity: 1; }
}

#app-shell {
  animation: shellEntrance 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* ── Background orbs for main-body ─────────────────────────────────────────── */
.shell-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.shell-bg .shell-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  will-change: transform;
  animation: shellOrbDrift 20s ease-in-out infinite alternate;
}

.shell-bg .shell-orb-1 {
  width: 700px; height: 700px;
  background: radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%);
  top: -15%; left: -10%;
  animation-duration: 25s;
}

.shell-bg .shell-orb-2 {
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%);
  bottom: -20%; right: -5%;
  animation-duration: 22s;
  animation-delay: -6s;
}

@keyframes shellOrbDrift {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(40px, -30px) scale(1.05); }
  66%  { transform: translate(-20px, 40px) scale(0.97); }
  100% { transform: translate(30px, -20px) scale(1.02); }
}

/* ── Noise / grain texture overlay for main-body ───────────────────────────── */
.main-body-noise {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.03;
}

/* ══════════════════════════════════════════════════════════════════════════════
   SIDEBAR — Glass + gradient mesh
   ══════════════════════════════════════════════════════════════════════════════ */
.sidebar.glass {
  position: fixed;
  top: 0; left: 0; bottom: 0;
  width: 260px;
  background: rgba(10, 10, 18, 0.65);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border-right: 1px solid rgba(255,255,255,0.06);
  box-shadow: 1px 0 30px rgba(0,0,0,0.4), inset -1px 0 0 rgba(99,102,241,0.04);
  z-index: 100;
  display: flex;
  flex-direction: column;
  transition: transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

/* Sidebar internal gradient mesh orbs */
.sidebar-mesh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.sidebar-mesh .sb-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  animation: shellOrbDrift 18s ease-in-out infinite alternate;
}

.sidebar-mesh .sb-orb-1 {
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%);
  top: 5%; left: -30%;
  animation-duration: 20s;
}

.sidebar-mesh .sb-orb-2 {
  width: 180px; height: 180px;
  background: radial-gradient(circle, rgba(139,92,246,0.10), transparent 70%);
  bottom: 10%; right: -25%;
  animation-duration: 16s;
  animation-delay: -5s;
}

/* ── Sidebar header / logo ─────────────────────────────────────────────────── */
.sidebar-header {
  position: relative;
  z-index: 1;
  padding: 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  gap: 12px;
}

.sidebar-logo-icon {
  width: 40px; height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 12px;
  position: relative;
  background: rgba(99,102,241,0.1);
  box-shadow: 0 0 20px rgba(99,102,241,0.12), inset 0 0 12px rgba(99,102,241,0.05);
  flex-shrink: 0;
}

/* Animated gradient ring around logo icon */
.sidebar-logo-icon::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  padding: 2px;
  background: conic-gradient(from var(--shell-icon-angle, 0deg), #6366f1, #8b5cf6, #f97316, #06b6d4, #6366f1);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: shellIconSpin 4s linear infinite;
  pointer-events: none;
}

@keyframes shellIconSpin {
  to { --shell-icon-angle: 360deg; }
}

.sidebar-logo-text {
  font-size: 1.125rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  position: relative;
  z-index: 1;
}

.sidebar-logo-text .logo-brand {
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #f97316);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.sidebar-logo-text .logo-suffix {
  color: rgba(255,255,255,0.5);
  font-weight: 500;
}

/* ── Sidebar nav sections ──────────────────────────────────────────────────── */
.sidebar-nav {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 12px;
  overflow-y: auto;
  /* Thin custom scrollbar */
  scrollbar-width: thin;
  scrollbar-color: rgba(99,102,241,0.2) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(99,102,241,0.2);
  border-radius: 4px;
}
.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: rgba(99,102,241,0.35);
}

.sidebar-section {
  margin-bottom: 16px;
}

.sidebar-section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: rgba(255,255,255,0.28);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 8px 12px 4px;
}

/* ── Nav links — staggered entrance + premium hover/active ─────────────────── */
@keyframes navSlideIn {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  color: rgba(255,255,255,0.55);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  position: relative;
  border-left: 2px solid transparent;
  transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
  /* Stagger animation — delay set inline via style attr */
  opacity: 0;
  animation: navSlideIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.sidebar-link svg {
  width: 18px; height: 18px;
  flex-shrink: 0;
  opacity: 0.5;
  transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Hover state */
.sidebar-link:hover {
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.9);
  border-left-color: rgba(99,102,241,0.5);
  transform: translateX(2px);
}

.sidebar-link:hover svg {
  opacity: 0.9;
  filter: drop-shadow(0 0 4px rgba(99,102,241,0.3));
}

/* Active state */
.sidebar-link.active {
  background: rgba(99,102,241,0.08);
  color: #a5b4fc;
  font-weight: 600;
  border-left-color: transparent;
  box-shadow: 0 0 16px rgba(99,102,241,0.06);
}

/* Active: gradient left border via pseudo-element */
.sidebar-link.active::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: linear-gradient(180deg, #6366f1, #8b5cf6, #f97316);
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(99,102,241,0.5);
}

.sidebar-link.active svg {
  opacity: 1;
  filter: drop-shadow(0 0 6px rgba(99,102,241,0.4));
}

/* ── Logout link ───────────────────────────────────────────────────────────── */
.sidebar-logout-wrap {
  position: relative;
  z-index: 1;
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.sidebar-link.logout-link {
  color: rgba(255,255,255,0.45);
  animation: none;
  opacity: 1;
}

.sidebar-link.logout-link:hover {
  color: #f87171;
  background: rgba(248,113,113,0.06);
  border-left-color: rgba(248,113,113,0.4);
}

.sidebar-link.logout-link:hover svg {
  opacity: 1;
  filter: drop-shadow(0 0 4px rgba(248,113,113,0.3));
  transform: rotate(-12deg);
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* ══════════════════════════════════════════════════════════════════════════════
   HEADER — Glass + grain + gradient glow
   ══════════════════════════════════════════════════════════════════════════════ */
.main-content {
  margin-left: 260px;
  min-height: 100vh;
  position: relative;
  z-index: 1;
  transition: margin-left 400ms cubic-bezier(0.16, 1, 0.3, 1);
}

.main-header.glass {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(10, 10, 18, 0.6);
  backdrop-filter: blur(20px) saturate(1.3);
  -webkit-backdrop-filter: blur(20px) saturate(1.3);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  /* Gradient glow under header */
  box-shadow: 0 1px 0 rgba(99,102,241,0.05), 0 4px 20px rgba(0,0,0,0.15);
  position: relative;
}

/* Grain texture overlay on header */
.main-header.glass::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-repeat: repeat;
  pointer-events: none;
  opacity: 0.5;
  z-index: 0;
}

/* Gradient glow line at bottom of header */
.main-header.glass::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99,102,241,0.3) 30%, rgba(139,92,246,0.2) 60%, transparent);
  pointer-events: none;
}

.main-header.glass > * {
  position: relative;
  z-index: 1;
}

/* Page title with gradient hover */
.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, rgba(255,255,255,0.92));
  transition: all 250ms ease;
  letter-spacing: -0.01em;
}

.page-title:hover {
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #f97316);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* ── Header user area ──────────────────────────────────────────────────────── */
.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.header-user-info {
  text-align: right;
}

.header-user-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-primary, rgba(255,255,255,0.92));
}

.header-user-role {
  font-size: 0.6875rem;
  color: var(--text-tertiary, rgba(255,255,255,0.4));
  font-weight: 500;
}

/* Avatar with gradient ring */
.header-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
  color: white;
  flex-shrink: 0;
  position: relative;
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Gradient ring border */
.header-avatar::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #f97316);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.7;
  transition: opacity 250ms ease;
}

.header-avatar:hover {
  transform: scale(1.05);
  box-shadow: 0 0 16px rgba(99,102,241,0.25);
}

.header-avatar:hover::before {
  opacity: 1;
}

/* ── Notification bell ─────────────────────────────────────────────────────── */
.notification-bell {
  position: relative;
  cursor: pointer;
  font-size: 1.125rem;
  padding: 6px;
  border-radius: 8px;
  transition: all 200ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-bell:hover {
  background: rgba(255,255,255,0.05);
}

.notification-bell.has-notifications {
  animation: bellPulse 2s ease-in-out infinite;
}

@keyframes bellPulse {
  0%, 100% { transform: rotate(0); }
  10%  { transform: rotate(8deg); }
  20%  { transform: rotate(-6deg); }
  30%  { transform: rotate(4deg); }
  40%  { transform: rotate(0); }
}

.notification-badge {
  position: absolute;
  top: 2px; right: 2px;
  background: linear-gradient(135deg, #6366f1, #f97316);
  color: white;
  font-size: 9px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0 4px;
}

/* ── Mobile hamburger ──────────────────────────────────────────────────────── */
.mobile-menu-btn {
  display: none;
  background: none;
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-primary, rgba(255,255,255,0.9));
  font-size: 1.25rem;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: all 200ms ease;
  line-height: 1;
}

.mobile-menu-btn:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(99,102,241,0.3);
}

/* ── Main body ─────────────────────────────────────────────────────────────── */
.main-body {
  padding: 24px;
  max-width: 1400px;
  position: relative;
  z-index: 1;
}

/* ── Mobile overlay backdrop ───────────────────────────────────────────────── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 99;
  opacity: 0;
  transition: opacity 300ms ease;
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
    box-shadow: 4px 0 40px rgba(0,0,0,0.5);
  }

  .main-content {
    margin-left: 0;
  }

  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main-body {
    padding: 16px;
  }
}
`;
    document.head.appendChild(style);
  }

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
        <a href="profile.html" class="header-user" id="header-user">
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

    return session;
  }

  // ── Public API ──────────────────────────────────────────────────────────
  return { init, toggleSidebar };
})();

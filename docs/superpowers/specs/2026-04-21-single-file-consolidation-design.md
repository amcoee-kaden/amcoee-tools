# Single-File Consolidation Design Spec

**Date:** 2026-04-21
**Status:** Approved
**Scope:** Collapse 20 separate HTML pages into a single `index.html` using hash routing and `<template>` blocks. Remove service worker. Preserve ability to split back into multi-page later.

---

## Goal

Eliminate the "work disappears when split into multi-page" bug class, and eliminate any possibility of service-worker cache interference, by consolidating all pages into one HTML file with client-side routing.

## Non-Goals

- Rewriting any tool module (all `js/tools/*.js` stay as-is)
- Changing the CSS (design-system.css, dashboard.css stay external and untouched)
- Modifying the DataStore, auth, permission, or any other foundation JS
- Adding new features
- Offline support (removed — re-add later if needed)

---

## Architecture

### File Structure After Consolidation

```
amcoee-tools/
  index.html                ← the only HTML file (login + 20 pages as templates)
  sw.js                     ← DELETED
  css/
    design-system.css       ← unchanged
    dashboard.css           ← unchanged
  js/
    ...                     ← all existing JS files unchanged
    router.js               ← UPGRADED: template-cloning router
    shell.js                ← MINOR EDIT: remove SW registration; no nav changes needed
  (all 19 sub-HTML files)   ← DELETED
```

### Single-File Layout

The new `index.html` structure:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <!-- existing meta, CSP, fonts, security libs, design-system.css link -->
  <!-- NEW: service-worker kill script (see below) -->
</head>
<body>
  <!-- Login screen: shown when no valid session -->
  <div id="login-screen" class="login-wrapper">
    <!-- existing login markup, unchanged -->
  </div>

  <!-- App shell + page mount: shown when authenticated -->
  <div id="app-shell" hidden>
    <aside id="nav-rail"><!-- shell.js builds this --></aside>
    <main id="app-root"><!-- router mounts active page template here --></main>
  </div>

  <!-- 20 page templates (inert until cloned by router) -->
  <template id="page-command-center">
    <!-- body content from current command-center.html -->
  </template>
  <template id="page-dashboard">
    <!-- body content from current dashboard.html -->
  </template>
  <template id="page-employees">...</template>
  <template id="page-profile">...</template>
  <template id="page-reports">...</template>
  <template id="page-settings">...</template>
  <template id="page-jobs">...</template>
  <template id="page-schedule">...</template>
  <template id="page-timeclock">...</template>
  <template id="page-tools">...</template>
  <template id="page-inventory">...</template>
  <template id="page-fleet">...</template>
  <template id="page-crm">...</template>
  <template id="page-invoicing">...</template>
  <template id="page-expenses">...</template>
  <template id="page-payroll">...</template>
  <template id="page-announcements">...</template>
  <template id="page-documents">...</template>
  <template id="page-safety">...</template>

  <!-- JS loads (same order as current index.html) -->
  <script src="js/event-bus.js"></script>
  <script src="js/data-store.js"></script>
  <!-- ...all existing scripts... -->
  <script src="js/router.js"></script>
  <!-- main boot script (inline) -->
</body>
</html>
```

### Routing

**Hash-based, 1:1 with future file names.**

| Hash route | Template ID | Future file |
|---|---|---|
| `#command-center` | `page-command-center` | `command-center.html` |
| `#dashboard` | `page-dashboard` | `dashboard.html` |
| `#jobs` | `page-jobs` | `jobs.html` |
| `#fleet` | `page-fleet` | `fleet.html` |
| ...19 more... | ... | ... |

On `hashchange` event:
1. Read new hash (default to `#dashboard` if empty and authenticated)
2. Find matching `<template id="page-{slug}">`
3. Clear `#app-root` innerHTML
4. Clone template content and append to `#app-root`
5. Emit `AppEvents.pageMounted` with page slug so tool modules (`JobBoard.init()`, `FleetMgr.init()` etc.) can run their init
6. Update nav rail active state

Nav links use `href="#jobs"`, `href="#fleet"` etc. — real anchors, no JS click handlers needed.

### Login Flow

- Root element order in body: `#login-screen` first, `#app-shell` second (hidden).
- On page load, boot script checks session:
  - **No valid session:** `#login-screen` visible, `#app-shell` hidden, router inactive.
  - **Valid session:** `#login-screen` hidden, `#app-shell` visible, router reads hash and mounts page.
- On successful PIN login: hide login, show shell, set default hash `#command-center` (or `#dashboard` per role), mount page.
- On logout: clear session, hide shell, show login, reset hash to empty.

### Service Worker Removal + Kill Script

**Every returning user has a service worker registered from the previous version. It will intercept their next visit and serve stale cached content even after we deploy the new single-file version.**

Add this to `<head>` as the FIRST `<script>` tag, before anything else:

```html
<script>
  // Kill any existing service worker from prior versions.
  // Runs once per visit; harmless on subsequent visits once SW is gone.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
  }
</script>
```

Also:
- Delete `sw.js` from the repo root
- Remove the `navigator.serviceWorker.register('sw.js')` call from wherever it's registered (likely in an inline script in `index.html`)

### CSP

Existing CSP is fine for the single-file approach (no new origins needed). No changes required.

---

## Splitting Back to Multi-Page (future)

The design is intentionally mechanical to reverse:

1. For each `<template id="page-X">`, create `X.html` containing:
   - Shell boilerplate (head, CSP, fonts, CSS links, shared JS scripts)
   - Template's contents as the body
2. Replace `href="#jobs"` nav links with `href="jobs.html"` in the shared nav
3. Remove router's template-cloning logic (revert to current router.js or equivalent)
4. Remove `<template>` blocks from index.html
5. Remove the boot-time "check session & mount page" dispatcher

Each template body is already a self-contained chunk — no refactoring needed to extract. This is the whole point of the `<template>` approach vs. putting everything in divs with display:none.

---

## Migration Steps (high level — actual implementation plan in writing-plans)

1. Read each of the 19 sub-HTML files, extract the main body content (the stuff that isn't shared shell/nav)
2. Paste each body into a `<template id="page-X">` block in new `index.html`
3. Upgrade `js/router.js` to clone templates + emit mount events
4. Wire existing tool module init functions to listen for `AppEvents.pageMounted`
5. Add service-worker kill script, remove SW registration
6. Delete `sw.js` and all 19 sub-HTML files
7. Commit, push, verify on live site

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Initial HTML payload grows ~50KB (all templates inline) | Acceptable — still under 100KB, loads once |
| Tool module init races with DOM mount | Router emits event AFTER template clone completes; modules listen for event |
| User hits live URL and sees login flicker before SW kill completes | Kill script runs synchronously in head, before body paints |
| Someone bookmarks old `jobs.html` URL | Gone after 19 files deleted — they'll 404. Optional: add JS redirect in 404.html if desired |
| Service worker kill script stops working before all users visit | No expiry — the check runs on every load, harmless no-op once SW is gone |

---

## Out of Scope

- Aggressive asset versioning (`?v=N` on CSS/JS URLs) — not needed since no SW caches them
- Code-splitting or lazy-loading templates — all 20 pages load upfront
- Route transition animations
- Changing anything inside the template bodies (pure copy-paste)

---

## Success Criteria

- Opening the live site shows login screen
- Login with valid PIN shows command-center (or dashboard per role)
- Clicking any nav item navigates correctly, URL hash updates, back button works
- Refreshing on any hash route reloads the correct page
- No `sw.js` requests in Network tab
- All 20 page contents are visually identical to current multi-page versions
- Any user who previously visited the site with the old SW loads the new version cleanly on first visit (no stale content)

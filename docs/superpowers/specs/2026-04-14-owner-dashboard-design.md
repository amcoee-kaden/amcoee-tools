# Owner/Head Admin Dashboard — Design Spec

**Date:** 2026-04-14
**Status:** Approved
**Scope:** Owner dashboard, role hierarchy, org management, analytics engine, security hardening, modular architecture

---

## 1. Role Hierarchy & Permissions

### 5-Tier System

| Tier | Role | Label | Color | Owner Dashboard | Manages Admins | Manages Org | Approves Pay |
|------|------|-------|-------|-----------------|----------------|-------------|--------------|
| 0 | owner | Owner | `#ef4444` | Full | Yes | Yes | Yes |
| 1 | head_admin | Head Administrator | `#f97316` | Full (mirrors Owner) | Yes | Yes | Yes |
| 2 | admin | Administrator | `#a855f7` | No | No | Own dept only | No |
| 3 | office | Office Staff | `#3b82f6` | No | No | No | No |
| 4 | field | Field Technician | `#22c55e` | No | No | No | No |

### Default Users

- **Jeremy Silva** — Owner (tier 0)
- **Kaden DaSilva** — Head Admin (tier 1)
- All other existing users remain as-is

### Permission Model

- Permissions are dot-notated keys: `payroll.approve`, `org.departments.create`, `analytics.behavioral`
- Each role maps to a permission set. Owner and Head Admin share the same set.
- **Only difference:** Owner can modify Head Admin accounts. Head Admin cannot modify Owner.
- Cascade rule: granting `org` implicitly grants `org.*`
- All checks go through `PermissionGuard` module — client-side now, server-side later.

### Full Permission Map

**Owner + Head Admin (tier 0-1):**
All permissions. Includes:
- `owner-dashboard` — access to command center
- `org.departments.create`, `org.departments.edit`, `org.departments.delete`
- `org.groups.create`, `org.groups.edit`, `org.groups.delete`
- `org.employees.create`, `org.employees.edit`, `org.employees.delete`, `org.employees.onboard`, `org.employees.offboard`
- `payroll.view`, `payroll.approve`, `payroll.configure`
- `analytics.people`, `analytics.financial`, `analytics.operational`, `analytics.behavioral`, `analytics.reports`
- `security.audit`, `security.sessions`, `security.config`
- `data.export`, `data.backup`, `data.wipe` (Owner only for wipe)
- Plus all tier 2-4 permissions

**Admin (tier 2):**
- `dashboard`, `jobs`, `timeclock`, `crm`, `invoicing`, `scheduling`
- `inventory`, `documents`, `safety`, `fleet`, `announcements`
- `expenses`, `reporting`, `employees.view`, `employees.edit.own-dept`
- `payroll.view.own-dept`, `settings`, `tool-tracker`

**Office (tier 3):**
- `dashboard`, `jobs`, `timeclock`, `crm`, `invoicing`, `scheduling`
- `inventory`, `documents`, `safety`, `fleet`, `announcements`
- `expenses`, `reporting.limited`, `tool-tracker`

**Field (tier 4):**
- `dashboard`, `jobs.own`, `timeclock`, `scheduling.own`
- `inventory.request`, `documents.safety`, `safety`
- `fleet.assigned`, `announcements`, `expenses.submit`, `tool-tracker`

---

## 2. Data Architecture

### DataStore Abstraction Layer

All data operations go through a `DataStore` module:

```
DataStore.get(collection, id) → record
DataStore.list(collection, filters?) → records[]
DataStore.create(collection, data) → record (auto-generates id, timestamps)
DataStore.update(collection, id, patch) → record (updates modifiedAt)
DataStore.delete(collection, id) → void (soft-delete with deletedAt)
DataStore.query(collection, { where, orderBy, limit }) → records[]
```

**Current implementation:** localStorage with JSON serialization.
**Future swap:** Firebase Firestore — same API surface, different backend.

Every mutation triggers:
1. Data write
2. Audit log entry
3. Analytics event
4. Event bus emission

### Collections

- `users` — employee accounts and profiles
- `departments` — org departments
- `groups` — flexible crew/team groups
- `group_members` — many-to-many: user ↔ group
- `sessions` — login sessions with device fingerprints
- `audit_log` — append-only action log
- `analytics_events` — usage tracking events
- `approvals` — pending approval queue items
- `announcements` — company-wide messages
- `notifications` — per-user notification queue
- `pay_periods` — payroll periods and approval status
- `certifications` — employee certs/licenses with expiry dates
- `dashboard_layouts` — saved panel positions per user
- Plus tool-specific collections (jobs, tools, invoices, etc.) — defined per tool later

### Schema Versioning

Each collection has a `_schemaVersion` field. On app load, migrations run if version is outdated:

```
migrations/v1_to_v2.js → updates user records with new fields
migrations/v2_to_v3.js → restructures departments
```

Auto-detected, auto-applied, non-destructive.

---

## 3. Owner/Head Admin Dashboard Layout

### Priority Alert Strip (top of page)

- Slim animated banner, full-width, above all content
- Shows highest-priority actionable item
- Rotates through alerts if multiple (fade transition, 5s interval)
- Color-coded: red (critical), amber (warning), blue (info)
- Click navigates directly to the relevant action
- Dismissible per-alert (snoozed, not hidden permanently)
- Alert sources:
  - Pending pay approvals
  - Overdue tool returns
  - Employees not clocked in when scheduled
  - Failed login attempts in last hour
  - Expiring certifications (within 30 days)
  - Overdue invoices (past 60 days)
  - System anomalies

### Row 1: Command Stats (6 cards)

| Card | Value | Trend | Click Target |
|------|-------|-------|-------------|
| Active Jobs | count | vs last week | Job Board |
| Crew in Field | clocked-in count / total field | live | Time Clock |
| Revenue MTD | dollar amount | % to monthly target | Financial Analytics |
| Pending Approvals | total count | pulsing if > 0 | Approval Queue |
| Tools Out / Overdue | ratio (e.g., 18/2) | warning if overdue > 0 | Tool Tracker |
| Open Invoices | total $ outstanding | 30/60/90 breakdown tooltip | Invoicing |

Each card:
- Animated counter on value change (ticking number)
- Trend arrow (green up, red down, gray flat) with percentage
- Micro sparkline (last 7 data points)
- Click navigates to relevant tool/section
- Skeleton loading state

### Row 2: Two-Column Split (60/40)

#### Left: Smart Activity Feed (60%)

Real-time feed of all platform activity:
- Entry format: `[avatar] [name] [action] [target] — [timestamp]`
- Examples:
  - "Mike Torres clocked in — 2m ago"
  - "Sarah Ochoa created invoice #INV-2026-041 — 8m ago"
  - "James Bell checked out DeWalt 20V Drill — 15m ago"
  - "Dana Clark submitted expense report ($142.50) — 1h ago"

Features:
- Filter bar: by person, department, action type, date range, tool/page
- Anomaly highlighting: red border on unusual activity (login at odd hour, bulk export, repeated failed action)
- Expandable entries: click to see full context and metadata
- Infinite scroll with lazy loading
- Rage click detection: if a user rapidly clicks the same button 5+ times, flag it as frustration signal
- Live updates (poll every 30s, animate new entries sliding in from top)

#### Right: Approval Queue (40%)

Stacked cards, sorted by urgency:
- **Pay approvals:** Employee name, period, hours, amount, approve/reject buttons
- **Expense reports:** Submitter, amount, category, receipt thumbnail, approve/reject
- **Time-off requests:** Employee, dates, type (PTO/sick/personal), approve/reject
- **Tool write-offs:** Tool name, reason, value, approve/reject
- **New employee approvals:** Name, proposed role, proposed department, approve/reject
- **Permission change requests:** Who, what changed, requested by, approve/reject

Each card:
- Inline approve/reject (no page navigation)
- Optional note field on reject
- Overdue items have red left border and "overdue" badge
- Batch approve option (checkbox + "Approve All Selected")
- Count badge per category in tab headers

### Row 3: Three-Column Split

#### Column 1: People Overview

- Headcount by department (horizontal bar chart, department color-coded)
- Attendance dot grid: each employee = a dot. Green = clocked in, red = should be in but isn't, gray = off today. Hover shows name.
- Quick stats: new hires this month, upcoming reviews, expiring certs
- "Problem" callouts: employees with excessive absences, overdue certifications

#### Column 2: Financial Snapshot

- Revenue vs expenses sparkline (last 30 days)
- Top 5 jobs by revenue (mini ranked list)
- Overdue invoices (count + total $, click to expand)
- Payroll total this period
- Profit margin indicator (gauge chart)
- Cash flow projection mini-chart (next 30 days based on open invoices + scheduled jobs)

#### Column 3: System & Security

- Active sessions (count + list: name, device, duration)
- Failed logins last 24h (count, expandable to see details)
- Feature adoption rates (mini bar chart: which tools are most/least used)
- Data health indicator (storage usage, record counts)
- Last data backup timestamp with "Backup Now" button

### Row 4: Full-Width Behavioral Analytics Panel

- Tabbed interface: Usage | Sessions | Adoption | Bottlenecks | Custom
- **Usage tab:** Page visit heatmap grid (tools on Y axis, days on X axis, color = visit count)
- **Sessions tab:** Avg session duration by role (bar chart), peak usage hours (24h histogram), daily/weekly/monthly active users trend
- **Adoption tab:** Per-tool adoption curve (line chart since tool launch), feature usage by role breakdown
- **Bottlenecks tab:** Pages with high dwell time + low action rate (table), rage click locations, rapid back-navigation patterns
- **Custom tab:** Custom report builder (see Section 5)
- Date range selector applies to all tabs
- All charts built with Chart.js

### Floating Elements

- **Quick-action FAB** (bottom-right): expandable radial menu
  - Add Employee
  - Create Announcement
  - Run Payroll
  - Generate Report
  - Export Data
  - Emergency Lockdown (disable all non-owner logins)
- **Notification bell** (header): unread count badge, dropdown with recent notifications, "mark all read"

### Panel Customization

- All panels are drag-and-drop reorderable via Sortable.js
- Each panel has: collapse toggle, full-screen expand, hide option
- Layout saved per-user in `dashboard_layouts` collection
- Reset to default option
- Panels animate on reorder (smooth 300ms transition)

---

## 4. Organization Management

### Department Manager

**CRUD operations:**
- Create department: name, description, color (picker), icon (emoji selector), department head (user dropdown)
- Edit all fields inline
- Delete with confirmation + reassignment wizard (move employees to another dept first)
- Soft-delete: archived departments visible in history

**Org Chart:**
- Tree visualization of departments
- Drag-and-drop to restructure (move dept under another)
- Click any node to see department detail: headcount, budget, members, recent activity
- Zoom and pan on large orgs
- Export org chart as image (html2canvas)

**Department Settings:**
- Budget allocation (annual/monthly) with spend tracking
- Headcount limit with warning at 80% and hard cap option
- Department-level permission overrides (e.g., Safety dept gets extra document permissions)
- Default group assignments for new hires in this department
- Department-specific announcements channel

### Group/Crew Manager

**Group types:**
- **Permanent:** Departments committees, management team
- **Temporary:** Project crews (auto-expire on end date), training cohorts
- **On-call rotation:** Rotating membership on a schedule

**Group CRUD:**
- Name, description, type, color, members (multi-select with search)
- Start date / end date (for temporary groups)
- Group lead assignment
- Tool allocation (assign tool sets to a crew for a job)

**Group features:**
- Scoped announcements (only group members see them)
- Group-level analytics (hours, productivity, tool usage for this crew)
- Bulk operations: assign all members to a job, clock in entire crew

### Employee Lifecycle

**Onboarding wizard (5 steps):**
1. Basic info: name, email, phone, emergency contact
2. Role & department: role tier, primary department, department head approval
3. Groups: assign to crews/teams
4. Credentials: generate PIN, set permissions (defaults from role, customizable)
5. Welcome: auto-generate welcome announcement, send onboarding checklist

**Employee profile page:**
- Header: avatar, name, role badge, department, status (active/on-leave/terminated)
- Tabs:
  - **Overview:** contact info, emergency contacts, hire date, tenure
  - **Work:** current jobs, schedule, time-off balance, hours this period
  - **Pay:** pay rate (hourly/salary), overtime rules, pay history, bonuses/deductions
  - **Certifications:** licenses with expiry dates, training history, skills matrix
  - **Tools:** currently checked out tools, tool history, condition reports filed
  - **Activity:** personal activity feed (filtered from main feed)
  - **Notes:** private manager notes (visible to Admin+ only)
  - **Security:** login history, active sessions, permission overrides

**Offboarding flow:**
1. Initiate offboarding (reason, effective date)
2. Revoke access (disable login, clear sessions)
3. Reassign assets: tools → check in, jobs → reassign, groups → remove
4. Archive data (profile remains read-only for audit)
5. Generate offboarding report (what was reassigned, final pay calculation)

### Certification & License Tracking

- Per-employee certification records: cert name, issuing body, issue date, expiry date, document upload reference
- Dashboard alerts at 90/60/30 days before expiry
- Compliance report: % of team current on all required certs
- Skills matrix: grid of employees vs. certifications (who can do what)
- Auto-flag employees who can't be dispatched due to expired certs

### Pay & Compensation

- Pay rate management: hourly rate, salary, overtime multiplier (1.5x default), holiday multiplier
- Pay period configuration: weekly, bi-weekly, semi-monthly, monthly
- Approval workflow: employee submits timesheet → direct manager reviews → Head Admin/Owner approves → marked for payroll export
- Pay history: every approved pay period archived with full detail
- Bonus/deduction line items with descriptions
- Export formats: CSV, Excel (via SheetJS), PDF summary (via html2canvas)

---

## 5. Analytics Engine

### Event Tracking System

Every user action creates an event:

```json
{
  "id": "evt_...",
  "userId": "u1",
  "action": "page_view | click | create | update | delete | login | logout | clock_in | clock_out | export | search | error",
  "target": "tool-tracker",
  "targetId": "t1",
  "page": "tool-tracker",
  "metadata": { "toolName": "DeWalt 20V Drill", "action": "checkout" },
  "timestamp": "2026-04-14T09:23:00Z",
  "sessionId": "sess_...",
  "deviceInfo": "Chrome 120 / Windows 11"
}
```

**Storage strategy:**
- Keep last 10,000 events in localStorage (active data)
- Older events compressed into daily summary aggregates (counts per action/page/user)
- Full event archive downloadable as JSON on demand
- Aggregation runs on app load if pending

**Behavioral signals tracked:**
- Page dwell time (time between page_view events)
- Click patterns (rapid repeated clicks = rage click)
- Navigation patterns (back-and-forth = confusion)
- Feature discovery (first time a user visits a tool)
- Error frequency per user/page

### Analytics Dashboards

**People Analytics:**
- Attendance heatmap (employees vs days, color = hours worked)
- Punctuality tracking (avg clock-in time vs scheduled start)
- Hours distribution (histogram: who's overworking, who's under)
- Overtime tracking with cost impact
- Productivity indicators (jobs completed per tech, avg job duration)
- Retention: tenure distribution chart, monthly turnover rate
- Certification compliance percentage with drill-down

**Financial Analytics:**
- Revenue breakdown (by job, client, technician, department, month) — stacked bar chart
- Cost analysis: labor, materials, overhead per job
- Profit margin per job (bar chart with margin line overlay)
- Expense category breakdown (pie chart)
- Invoice aging buckets: current, 30-day, 60-day, 90-day+ (stacked bar)
- Cash flow projection (line chart: money in vs money out, next 30/60/90 days)

**Operational Analytics:**
- Job pipeline funnel: estimate → approved → scheduled → in-progress → completed → invoiced → paid
- Average job completion time by type and crew (comparison bar chart)
- Tool utilization rates (bar chart: % of time each tool is checked out vs available)
- Vehicle mileage trends and maintenance cost tracking
- Safety incident tracker (frequency, severity, location)

**App Usage Analytics (Behavioral):**
- DAU/WAU/MAU (daily/weekly/monthly active users) trend line
- Page views by tool (ranked bar chart)
- Session duration distribution (histogram)
- Feature adoption curves (per-tool line chart since launch date)
- User journey sankey diagram (most common navigation paths)
- Bottleneck table: pages sorted by (high dwell time + low action rate)
- Role-based comparison (how do field techs use the app vs office staff?)
- Search term frequency (when search is implemented)
- Frustration index: composite score of rage clicks + rapid back-nav + error encounters

### Custom Report Builder

Available to Owner and Head Admin:
1. Select dimensions: date range, department(s), role(s), individual(s)
2. Select metrics: any from the analytics sections above
3. Select chart type: bar, line, pie, table, heatmap
4. Preview in real-time
5. Save as template (named, reusable)
6. Export: PDF (via html2canvas), Excel (via SheetJS), PNG (via html2canvas)
7. Schedule: mark a report to auto-generate weekly/monthly (stored locally, surfaced on dashboard)

---

## 6. Security & Audit

### Authentication

- **PIN hashing:** All PINs hashed with SHA-256 via CryptoJS before storage. Raw PINs never stored.
- **Failed login lockout:** 5 failed attempts → 15-minute lockout. Configurable by Owner. Lockout logged to audit.
- **Session management:**
  - Session token generated on login (random UUID)
  - Stored in sessionStorage (clears on tab close) or localStorage (persistent, configurable)
  - Session expiration: configurable idle timeout (default 8 hours)
  - Heartbeat: activity resets the timer, inactivity triggers warning at 5 min before expiry
  - Auto-logout with "session expired" screen
- **Session fingerprinting:** Capture browser + OS + screen resolution as device fingerprint. Flag if same user appears from a new fingerprint.
- **Concurrent session detection:** If user logs in from a second location, alert Owner/Head Admin. Optionally: force-logout the older session.

### Audit Log

**Every mutation logged:**
```json
{
  "id": "aud_...",
  "userId": "u1",
  "userName": "Kaden DaSilva",
  "action": "update",
  "collection": "users",
  "recordId": "u3",
  "changes": { "role": { "old": "field", "new": "admin" } },
  "timestamp": "2026-04-14T10:30:00Z",
  "sessionId": "sess_...",
  "deviceInfo": "Chrome 120 / Windows 11"
}
```

**Properties:**
- Append-only: no delete capability, even for Owner (preserves integrity)
- Sensitive actions highlighted: role changes, pay approvals, employee creation/deletion, data exports, permission changes, login failures
- Viewer: searchable, filterable by user/action/collection/date range
- Export: CSV/Excel with date range filter
- Retention: keep everything (localStorage allows ~5-10MB; rotation archives older entries to downloadable JSON)

### Content Security

- **DOMPurify:** All user-generated text sanitized before DOM insertion. Prevents XSS.
- **Input validation:** All form inputs validated client-side: max lengths, format regex, type checking
- **CSP meta tag:** Restrict script sources to self + approved CDNs only
- **SRI hashes:** All CDN `<script>` tags include `integrity` attribute with SHA-384 hash
- **No eval/innerHTML with raw data:** All dynamic content rendered through sanitized template functions

### Data Protection

- **Sensitive field encryption:** PINs (hashed, not encrypted), pay rates, and personal contact info encrypted with AES-256 via CryptoJS. Encryption key derived from a configurable app secret.
- **Export protection:** Only Owner and Head Admin can trigger data exports. Every export logged to audit.
- **Data wipe:** Owner-only capability. Requires PIN re-entry + typed confirmation ("DELETE ALL DATA"). Irreversible. Logged before execution.
- **Backup system:**
  - Manual: "Backup Now" button generates timestamped JSON download of all collections
  - Reminder: dashboard widget shows last backup date, warns if > 7 days ago
  - Backup includes schema version for restore compatibility

### Security Dashboard Panel

Visible to Owner and Head Admin on command center:
- Active sessions: list with user, device, duration, "force logout" button
- Login history: last 50 logins with timestamps, success/fail, device info
- Failed attempts: last 24h with user attempted, lockout status
- Permission change log: last 20 role/permission changes
- Data export log: every export with user, date, data scope
- Anomaly alerts: unusual patterns auto-detected and flagged

---

## 7. Open Source Extensions

| Library | CDN | Purpose | Size | License | SRI |
|---------|-----|---------|------|---------|-----|
| Chart.js 4.x | cdn.jsdelivr.net | Charts, graphs, sparklines | ~200KB | MIT | Yes |
| CryptoJS 4.x | cdnjs.cloudflare.com | SHA-256 hashing, AES encryption | ~50KB | MIT | Yes |
| DOMPurify 3.x | cdn.jsdelivr.net | XSS sanitization | ~20KB | Apache 2.0 | Yes |
| html2canvas 1.x | cdn.jsdelivr.net | Export panels/reports as images/PDF | ~40KB | MIT | Yes |
| SheetJS (xlsx) 0.18 | cdn.jsdelivr.net | Excel/CSV export | ~90KB | Apache 2.0 | Yes |
| Sortable.js 1.x | cdn.jsdelivr.net | Drag-and-drop panel reordering | ~40KB | MIT | Yes |
| Day.js 1.x | cdn.jsdelivr.net | Date manipulation and formatting | ~7KB | MIT | Yes |
| Fuse.js 7.x | cdn.jsdelivr.net | Fuzzy search across all data | ~25KB | Apache 2.0 | Yes |

Total additional payload: ~472KB (loaded async, non-blocking).

---

## 8. Modularity & Expandability

### Tool Plugin Architecture

Each tool is a self-contained module in `/js/tools/`:

```javascript
// js/tools/example-tool.js
ToolRegistry.register({
  id: 'example-tool',
  name: 'Example Tool',
  icon: '<svg>...</svg>',
  emoji: '...',
  permissions: ['example-tool'],
  routes: {
    'example-tool': renderMain,
    'example-tool/detail': renderDetail,
  },
  dashboardWidgets: [
    { id: 'example-stat', size: 'sm', render: renderStatWidget },
    { id: 'example-feed', size: 'md', render: renderFeedWidget },
  ],
  init: () => { /* one-time setup */ },
});
```

**What the registry provides automatically:**
- Sidebar entry (filtered by permissions)
- Route handling
- Dashboard widget availability
- Analytics tracking
- Search indexing (via Fuse.js)
- Audit log integration

**Adding a new tool:** Create one file, register it, include the `<script>` tag. Everything else is automatic.

### Event Bus

Cross-tool communication without coupling:

```javascript
AppEvents.on('tool:checkout', (data) => { /* inventory updates */ });
AppEvents.on('job:completed', (data) => { /* trigger invoice generation */ });
AppEvents.on('employee:clockin', (data) => { /* update dashboard live count */ });
```

Events are fire-and-forget. Tools subscribe to what they care about. No direct imports between tools.

### Theming

All visual tokens in CSS custom properties:
- Swap `data-theme` attribute to change entire color scheme
- Accent color configurable per user (8 presets + custom)
- A JSON theme object can override any token for white-labeling
- Future: theme marketplace where users share custom themes

### File Structure

```
amcoee-tools/
  index.html                    # SPA entry point
  css/
    design-system.css           # Core design tokens + components
    owner-dashboard.css         # Owner/Head Admin dashboard styles
  js/
    auth.js                     # Authentication + session management
    router.js                   # Hash-based SPA router
    theme.js                    # Theme manager
    ui.js                       # Toast, modal, ripple, utilities
    data-store.js               # Data abstraction layer (localStorage now, Firebase later)
    permission-guard.js         # Permission checking module
    audit-log.js                # Append-only audit system
    analytics-engine.js         # Event tracking + aggregation
    event-bus.js                # Cross-tool communication
    tool-registry.js            # Plugin registration system
    schema-migrations.js        # Data schema versioning
    owner-dashboard.js          # Owner/Head Admin dashboard renderer
    org-manager.js              # Departments, groups, employee lifecycle
    approval-queue.js           # Approval workflow engine
    report-builder.js           # Custom report generation
    security-monitor.js         # Session tracking, anomaly detection
    tools/                      # Individual tool modules (built later)
      tool-tracker.js
      job-board.js
      time-clock.js
      ...
  assets/                       # Static assets
  docs/
    superpowers/
      specs/                    # Design specs
```

---

## 9. Constraints & Decisions

- **Static hosting:** GitHub Pages, no server-side code. All logic runs client-side.
- **Data storage:** localStorage + IndexedDB (see storage strategy below). Firebase Firestore later. DataStore abstraction makes the swap a config change.
- **No build step:** Vanilla JS, no bundler, no framework. Each file is a `<script>` tag. This keeps deployment trivial (push to GitHub = deployed).
- **CDN dependencies:** All external libraries loaded from CDN with SRI integrity hashes. Service worker caches CDN resources on first load for offline/failover. If CDN and cache both miss, the app degrades gracefully (charts don't render, but core functionality works).
- **Browser support:** Modern evergreen browsers (Chrome, Firefox, Edge, Safari). No IE11.
- **Performance target:** Dashboard renders in < 1 second on 4G connection. Charts lazy-loaded after initial paint.
- **Tool pages are NOT built in this spec.** Each tool will get its own design → plan → build cycle. This spec covers only the foundation, dashboard, org management, analytics, and security.

---

## 10. Known Limitations & Mitigations (Phase 1)

These are real-world constraints of static-hosted Phase 1 that will be fully resolved when migrating to Firebase (Phase 2). Each has a mitigation strategy for Phase 1.

### 10.1 Storage Limits

**Problem:** localStorage caps at ~5-10MB per origin. A 20-person company generating analytics events, audit logs, and business data will hit this within 2-3 months.

**Mitigation:**
- **Tiered storage:** Hot data in localStorage (fast, ~2MB budget), bulk data in IndexedDB (~50MB+). DataStore handles routing transparently.
- **Storage budget per collection:**
  - `analytics_events`: 10,000 entries max, then aggregate to daily summaries
  - `audit_log`: 5,000 entries max, then archive to downloadable JSON
  - `sessions`: 500 entries max, rolling window
  - All other collections: unlimited within IndexedDB
- **Storage monitor:** Dashboard widget shows usage. Warning at 80%, critical at 95%. Auto-archive triggered at 90%.
- **Phase 2 resolution:** Firebase Firestore has no practical storage limit for this use case.

### 10.2 Data Isolation (Per-Device)

**Problem:** localStorage/IndexedDB is per-browser, per-device. If Jeremy logs in on his phone and Kaden on his desktop, they see completely different data. This is the single biggest Phase 1 limitation.

**Mitigation:**
- **Prominent banner in app:** "Data is stored locally on this device. Changes made here won't appear on other devices until cloud sync is enabled."
- **Manual sync:** Export/import full data backup as JSON between devices. One-click in Settings.
- **Designate a primary device:** Recommend the office computer as the "source of truth" for shared data (pay, employee records). Field devices used for personal actions (clock-in, tool checkout).
- **Phase 2 resolution:** Firebase provides real-time sync across all devices automatically.

### 10.3 Security Threat Model

**Problem:** Client-side security has inherent limits. A motivated attacker with physical device access can inspect localStorage, read JavaScript source, and bypass any client-side check.

**Mitigation — what Phase 1 protects against:**
- Casual snooping (someone glancing at the screen or localStorage)
- Accidental unauthorized access (wrong person logged in)
- Application-level access control (UI enforces role boundaries)
- Session hijacking within the app (token-based, fingerprinted)

**What Phase 1 does NOT protect against:**
- A motivated attacker with devtools access on the same machine
- Client-side encryption keys are readable in source code — AES encryption of pay rates and PII is **obfuscation, not security**. Treat it as a speed bump, not a vault.
- PIN brute-forcing beyond the lockout window (21 days for 4-digit, less for determined attacker)

**Hardening within Phase 1:**
- PIN length configurable: 4-8 digits, **default 6 for Owner/Head Admin accounts**
- Sensitive action re-authentication: approving pay, exporting data, modifying roles, emergency lockdown ALL require re-entering PIN even during an active session
- 2FA-ready hooks: auth layer includes a `secondFactor` verification step that currently passes through, but wires directly to TOTP (Google Authenticator) when Firebase is added
- **Phase 2 resolution:** Firebase Auth with proper password hashing (bcrypt/scrypt), server-side session tokens, Firestore security rules enforce access control server-side. Client can't bypass.

### 10.4 Audit Log Integrity

**Problem:** "Append-only" is an application-level guarantee. Anyone with devtools can edit localStorage directly. We can't truly prevent tampering client-side.

**Mitigation:**
- Application provides no delete/edit UI for audit entries — append-only within the app
- **Hash chain integrity:** Each audit entry includes a `prevHash` field — the SHA-256 hash of the previous entry. Tampering with any entry breaks the chain. A "Verify Integrity" button in the security panel checks the full chain and flags any breaks.
- **Regular exports:** Owner/Head Admin should export audit logs weekly. Exported files serve as off-device tamper evidence.
- **Phase 2 resolution:** Firestore security rules make the audit collection truly append-only at the server level.

### 10.5 Notifications Are Pull-Only

**Problem:** No backend means no push notifications. Users only see alerts when the app is open.

**Mitigation:**
- **Web Notification API:** When the app is open in a browser tab, it can fire desktop notifications for urgent alerts (pay approvals, failed logins, overdue items). Requires one-time permission grant.
- **Priority alert strip** ensures critical items are impossible to miss when the app IS open
- **Phase 2 resolution:** Firebase Cloud Messaging enables push notifications to any device, even when the app is closed.

### 10.6 Scheduled Reports Run On-Load

**Problem:** "Generate weekly report every Monday" requires something running when no one's in the app.

**Mitigation:**
- Reports are generated on next app load after the scheduled time. If the weekly report was due Monday 6 AM and the owner logs in Monday 8 AM, it generates at 8 AM and shows "Your weekly report for April 7-13 is ready."
- Spec makes this behavior explicit in the UI — "Reports generate when you open the dashboard" not "reports run in the background."
- **Phase 2 resolution:** Firebase Cloud Functions can run scheduled tasks server-side.

### 10.7 Emergency Lockdown Recovery

**Problem:** If lockdown is triggered and the triggering user loses access (forgotten PIN, lost device), the entire company is locked out.

**Mitigation:**
- Both Owner AND Head Admin can trigger and lift lockdown
- Lockdown auto-expires after configurable period (default: 24 hours)
- **Recovery code:** Generated at first setup. A 16-character alphanumeric code displayed once, user instructed to print and store physically. Entering this code from any device lifts lockdown and grants Owner-tier access for one session.
- Recovery code is hashed and stored; raw code is never stored digitally after initial display

### 10.8 Massachusetts Labor Law Compliance

**Problem:** AMCO operates in MA. The pay and time-tracking features must comply with MA labor law or they're a liability, not a feature.

**Requirements built into the spec:**
- **Overtime:** Calculated weekly (not daily). 1.5x after 40 hours/week per MA law. Configurable multiplier for holidays.
- **Meal breaks:** Time clock flags shifts of 6+ hours without a 30-minute break. Alert sent to manager, logged for compliance.
- **Pay stubs:** Export includes all MA-required fields: gross pay, deductions, net pay, hours worked, overtime hours, pay period dates, employer name/address.
- **Record retention:** Minimum 3-year retention for all payroll records. Archival system does not purge pay data within this window. Configurable (some federal requirements are 7 years).
- **Prevailing wage:** If AMCO does public/government work, the system supports per-project pay rate overrides for prevailing wage compliance.

### 10.9 Offline Capability

**Problem:** Field techs on job sites may have poor or no internet connectivity. CDN-loaded scripts fail without network.

**Mitigation:**
- **Service worker:** Caches all CDN scripts, CSS, and the app shell on first load. Subsequent visits work fully offline.
- **Offline indicator:** Banner shown when network is unavailable
- **Deferred writes:** If offline, data mutations queue locally and sync when connectivity returns (preparation for Firebase sync in Phase 2)
- **Service worker updates:** On reconnect, checks for new versions and prompts user to refresh

---

## 11. Competitive Benchmarking

How this spec compares to industry platforms for electrical contractors:

| Feature | ServiceTitan | Jobber | BuildOps | AMCOEE Tools |
|---------|-------------|--------|----------|-------------|
| Role-based access | 3 tiers | 2 tiers | 3 tiers | **5 tiers** |
| Owner dashboard | Basic stats | Basic stats | Moderate | **Command center + behavioral analytics** |
| Org management | Limited | None | Departments | **Departments + groups + lifecycle** |
| Analytics depth | Moderate | Basic | Moderate | **Full behavioral + custom reports** |
| Customizable UI | Theme only | None | None | **Theme + accent + panel layout + per-user** |
| Tool tracking | Add-on | None | None | **Built-in, QR-enabled** |
| Self-hosted option | No | No | No | **Yes (GitHub Pages)** |
| Offline capability | Partial | No | No | **Yes (service worker)** |
| Cost | $300+/mo | $70+/mo | Custom | **Free** |

The spec meets or exceeds every major competitor on feature scope. The trade-off is Phase 1 data isolation (per-device), which Phase 2 eliminates.

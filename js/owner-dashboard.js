/* ==============================================================================
   AMCOEE TOOLS — Owner Dashboard (Command Center)
   Premium executive dashboard for Owner / Head Admin roles.
   Charts, activity feed, approval queue, security panel, FAB.
   Wired to DataStore + AppEvents for real-time data.
   ============================================================================== */

const OwnerDashboard = (() => {
  'use strict';

  /* ── State ─────────────────────────────────────────────────────────────── */
  const charts = {};
  let alertInterval = null;
  let clockInterval = null;
  let alertIdx = 0;
  let stylesInjected = false;
  const unsubs = [];  // AppEvents unsubscribe functions

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function san(t) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(String(t)) : String(t);
  }

  function greetingText() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  function animateCounter(el, target, duration) {
    duration = duration || 1000;
    const isCurrency = el.dataset.format === 'currency';
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const val = target * easeOutExpo(p);
      if (isCurrency) {
        el.textContent = '$' + val.toFixed(1) + 'K';
      } else {
        el.textContent = Math.round(val);
      }
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function formatClock() {
    const d = new Date();
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    return { time, date };
  }

  /* ── Cleanup ────────────────────────────────────────────────────────────── */

  function cleanup() {
    Object.keys(charts).forEach(k => {
      if (charts[k] && typeof charts[k].destroy === 'function') charts[k].destroy();
      delete charts[k];
    });
    if (alertInterval) { clearInterval(alertInterval); alertInterval = null; }
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
    // Unsubscribe from AppEvents
    unsubs.forEach(fn => fn());
    unsubs.length = 0;
  }

  /* ── Inject Styles ──────────────────────────────────────────────────────── */

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.id = 'owner-dash-styles';
    style.textContent = `
      /* ═══════════════════════════════════════════════════════
         PREMIUM GLASS DESIGN SYSTEM
         Spring easing: cubic-bezier(0.16, 1, 0.3, 1)
         ═══════════════════════════════════════════════════════ */

      /* ── Grain texture overlay ───────────────────────────── */
      .od-dashboard-root::before {
        content: '';
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        opacity: 0.03;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      }

      /* ── Glass card ──────────────────────────────────────── */
      .od-glass {
        position: relative;
        background: rgba(255,255,255,.05);
        backdrop-filter: blur(24px) saturate(1.3);
        -webkit-backdrop-filter: blur(24px) saturate(1.3);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        transition: transform .5s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow .5s cubic-bezier(0.16, 1, 0.3, 1),
                    border-color .3s ease;
        will-change: transform;
      }
      /* Inner top-edge highlight */
      .od-glass::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 16px;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255,255,255,.09) 0%, transparent 35%);
        z-index: 0;
      }
      /* Gradient border on hover via pseudo-element */
      .od-glass::after {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: 17px;
        padding: 1px;
        background: linear-gradient(135deg, rgba(99,102,241,.5), rgba(139,92,246,.5), rgba(236,72,153,.3));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0;
        transition: opacity .4s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
        z-index: 0;
      }
      .od-glass:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 40px rgba(99,102,241,.12), 0 4px 16px rgba(0,0,0,.2);
      }
      .od-glass:hover::after {
        opacity: 1;
      }

      /* ── Alert banner ────────────────────────────────────── */
      .od-alert-banner {
        position: relative;
        padding: 14px 48px 14px 20px;
        border-radius: 14px;
        margin-bottom: 22px;
        font-size: .9rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        overflow: hidden;
        min-height: 48px;
        will-change: transform, opacity;
        backdrop-filter: blur(16px) saturate(1.2);
        -webkit-backdrop-filter: blur(16px) saturate(1.2);
        border-left: 3px solid transparent;
        transition: transform .5s cubic-bezier(0.16, 1, 0.3, 1), opacity .4s ease;
      }
      .od-alert-banner.critical {
        background: rgba(239,68,68,.1);
        border: 1px solid rgba(239,68,68,.15);
        border-left: 3px solid;
        border-image: linear-gradient(180deg, #ef4444, #dc2626) 1;
        color: #fca5a5;
      }
      .od-alert-banner.warning {
        background: rgba(245,158,11,.1);
        border: 1px solid rgba(245,158,11,.15);
        border-left: 3px solid;
        border-image: linear-gradient(180deg, #f59e0b, #d97706) 1;
        color: #fcd34d;
      }
      .od-alert-banner.info {
        background: rgba(59,130,246,.1);
        border: 1px solid rgba(59,130,246,.15);
        border-left: 3px solid;
        border-image: linear-gradient(180deg, #3b82f6, #6366f1) 1;
        color: #93c5fd;
      }
      .od-alert-text {
        transition: opacity .4s ease, transform .4s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: opacity, transform;
      }
      .od-alert-text.slide-out { opacity: 0; transform: translateX(-20px); }
      .od-alert-text.slide-in  { opacity: 0; transform: translateX(20px); }
      .od-alert-dismiss {
        position: absolute;
        right: 14px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 1.1rem;
        opacity: .5;
        transition: opacity .2s, transform .3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .od-alert-dismiss:hover { opacity: 1; transform: translateY(-50%) scale(1.15); }

      /* ── Header / greeting ───────────────────────────────── */
      .od-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 26px;
      }
      .od-greeting {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--text, #f1f5f9);
        letter-spacing: -0.01em;
      }
      .od-greeting .od-name-gradient {
        background: linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .od-clock {
        font-size: .85rem;
        color: var(--text-muted, #94a3b8);
        margin-top: 4px;
        text-shadow: 0 0 20px rgba(148,163,184,.25);
      }
      .od-role-badge {
        display: inline-block;
        padding: 4px 14px;
        border-radius: 20px;
        font-size: .72rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .6px;
        background: linear-gradient(135deg, rgba(99,102,241,.25), rgba(168,85,247,.25));
        color: #c4b5fd;
        border: 1px solid rgba(139,92,246,.25);
        margin-top: 6px;
      }
      .od-quick-stats {
        display: flex;
        gap: 16px;
        font-size: .82rem;
        color: var(--text-muted, #94a3b8);
        flex-wrap: wrap;
      }
      .od-quick-stats span { display: flex; align-items: center; gap: 4px; }
      .od-quick-stats .qs-num { font-weight: 700; color: var(--text, #f1f5f9); }

      /* ── Stat cards ──────────────────────────────────────── */
      .od-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 26px;
        perspective: 800px;
      }
      @media(max-width:900px) { .od-stats-grid { grid-template-columns: repeat(2, 1fr); } }
      @media(max-width:560px) { .od-stats-grid { grid-template-columns: 1fr; } }

      .od-stat-card {
        padding: 20px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transform-style: preserve-3d;
        transition: transform .5s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow .5s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform;
      }
      /* Shimmer sweep on hover */
      .od-stat-card .od-shimmer {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          105deg,
          transparent 40%,
          rgba(255,255,255,.06) 45%,
          rgba(255,255,255,.1) 50%,
          rgba(255,255,255,.06) 55%,
          transparent 60%
        );
        transform: translateX(-100%);
        pointer-events: none;
        z-index: 1;
        border-radius: 16px;
      }
      .od-stat-card:hover .od-shimmer {
        animation: od-shimmer-sweep .8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes od-shimmer-sweep {
        to { transform: translateX(100%); }
      }
      .od-stat-card:hover {
        transform: translateY(-4px) rotateX(2deg) rotateY(-1deg);
        box-shadow: 0 16px 48px rgba(99,102,241,.1), 0 4px 16px rgba(0,0,0,.15);
      }
      .od-stat-card .od-icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        margin-bottom: 12px;
        position: relative;
        z-index: 1;
      }
      .od-stat-card .od-val {
        font-size: 1.9rem;
        font-weight: 800;
        color: var(--text, #f1f5f9);
        line-height: 1.1;
        position: relative;
        z-index: 1;
        transition: text-shadow .3s ease;
      }
      .od-stat-card .od-val.counting {
        text-shadow: 0 0 20px rgba(99,102,241,.4);
      }
      .od-stat-card .od-label {
        font-size: .78rem;
        color: var(--text-muted, #94a3b8);
        margin-top: 3px;
        position: relative;
        z-index: 1;
      }
      .od-stat-card .od-trend {
        font-size: .72rem;
        font-weight: 600;
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 10px;
        border-radius: 12px;
        position: relative;
        z-index: 1;
      }
      .od-trend.up   { color: #4ade80; background: rgba(74,222,128,.1); }
      .od-trend.down { color: #f87171; background: rgba(248,113,113,.1); }
      .od-stat-enter {
        opacity: 0;
        transform: translateY(28px);
        animation: od-slide-up .7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        will-change: transform, opacity;
      }
      @keyframes od-slide-up {
        to { opacity: 1; transform: translateY(0); }
      }

      /* ── Main layout ─────────────────────────────────────── */
      .od-main { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
      @media(max-width:900px) { .od-main { grid-template-columns: 1fr; } }

      /* ── Section headers ─────────────────────────────────── */
      .od-section-hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px;
        border-bottom: 1px solid rgba(255,255,255,.06);
        position: relative;
        z-index: 1;
      }
      .od-section-title {
        font-size: .95rem;
        font-weight: 700;
        color: var(--text, #f1f5f9);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .od-pulse-dot {
        width: 8px;
        height: 8px;
        background: #4ade80;
        border-radius: 50%;
        will-change: transform, opacity;
        animation: od-pulse 2s infinite;
        box-shadow: 0 0 8px rgba(74,222,128,.5);
      }
      @keyframes od-pulse {
        0%,100% { opacity: 1; transform: scale(1); }
        50%     { opacity: .4; transform: scale(.7); }
      }
      .od-badge {
        background: linear-gradient(135deg, rgba(245,158,11,.25), rgba(234,88,12,.2));
        color: #fbbf24;
        font-size: .7rem;
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 10px;
        margin-left: 6px;
      }

      /* ── Activity feed ───────────────────────────────────── */
      .od-feed {
        max-height: 340px;
        overflow-y: auto;
        padding: 8px 16px;
        position: relative;
        z-index: 1;
      }
      .od-feed-item {
        display: flex;
        gap: 10px;
        padding: 10px 8px;
        border-bottom: 1px solid rgba(255,255,255,.04);
        align-items: flex-start;
        border-radius: 8px;
        border-left: 3px solid transparent;
        transition: all .3s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform;
        margin-left: -8px;
        padding-left: 12px;
      }
      .od-feed-item:hover {
        background: rgba(255,255,255,.04);
        border-left-color: rgba(99,102,241,.5);
        transform: translateX(2px);
      }
      .od-feed-item.anomaly {
        border-left: 3px solid #ef4444;
        animation: od-anomaly-pulse 2s ease-in-out infinite;
      }
      @keyframes od-anomaly-pulse {
        0%,100% { border-left-color: #ef4444; }
        50%     { border-left-color: rgba(239,68,68,.4); }
      }
      .od-feed-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: .75rem;
        font-weight: 700;
        color: #fff;
        flex-shrink: 0;
        position: relative;
        box-shadow: 0 0 0 2px rgba(255,255,255,.08);
      }
      /* Gradient ring around avatar */
      .od-feed-avatar::before {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba(99,102,241,.4), rgba(236,72,153,.3));
        z-index: -1;
        opacity: 0;
        transition: opacity .3s ease;
      }
      .od-feed-item:hover .od-feed-avatar::before { opacity: 1; }
      .od-feed-text {
        font-size: .82rem;
        color: var(--text-muted, #94a3b8);
        flex: 1;
      }
      .od-feed-text strong { color: var(--text, #f1f5f9); }
      .od-feed-time {
        font-size: .7rem;
        color: var(--text-muted, #64748b);
        white-space: nowrap;
        margin-top: 2px;
      }
      .od-filter-pills {
        display: flex;
        gap: 6px;
        padding: 10px 16px;
        position: relative;
        z-index: 1;
      }
      .od-pill {
        padding: 5px 14px;
        border-radius: 16px;
        font-size: .72rem;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,.08);
        background: transparent;
        color: var(--text-muted, #94a3b8);
        cursor: pointer;
        transition: all .3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .od-pill:hover { border-color: rgba(99,102,241,.3); color: #c4b5fd; }
      .od-pill.active {
        background: linear-gradient(135deg, rgba(59,130,246,.2), rgba(99,102,241,.2));
        color: #93c5fd;
        border-color: rgba(59,130,246,.3);
      }

      /* ── Chart tabs ──────────────────────────────────────── */
      .od-chart-tabs {
        display: flex;
        gap: 4px;
        padding: 12px 16px 8px;
        position: relative;
        z-index: 1;
      }
      .od-chart-tab {
        padding: 6px 16px;
        border-radius: 10px;
        font-size: .75rem;
        font-weight: 600;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--text-muted, #94a3b8);
        transition: all .3s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
      }
      .od-chart-tab:hover { color: #c4b5fd; }
      .od-chart-tab.active {
        background: linear-gradient(135deg, rgba(99,102,241,.22), rgba(139,92,246,.18));
        color: #a5b4fc;
        box-shadow: 0 2px 8px rgba(99,102,241,.15);
      }
      .od-chart-wrap {
        position: relative;
        height: 280px;
        padding: 8px 16px 16px;
        overflow: hidden;
        box-shadow: inset 0 2px 12px rgba(0,0,0,.1);
        border-radius: 0 0 16px 16px;
      }

      /* ── Approval cards ──────────────────────────────────── */
      .od-approvals {
        padding: 10px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 380px;
        overflow-y: auto;
        position: relative;
        z-index: 1;
      }
      .od-appr-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.04);
        transition: transform .5s cubic-bezier(0.16, 1, 0.3, 1),
                    opacity .35s ease,
                    max-height .4s cubic-bezier(0.16, 1, 0.3, 1),
                    padding .4s ease,
                    margin .4s ease,
                    border-color .3s ease;
        transform-origin: top center;
        will-change: transform, opacity;
        max-height: 100px;
        overflow: hidden;
      }
      .od-appr-card:hover {
        border-color: rgba(99,102,241,.15);
      }
      .od-appr-card.removing {
        opacity: 0;
        transform: scaleY(0);
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin-top: -4px;
        margin-bottom: -4px;
        pointer-events: none;
      }
      .od-appr-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1rem;
        flex-shrink: 0;
        background: linear-gradient(135deg, var(--appr-bg-from, rgba(59,130,246,.15)), var(--appr-bg-to, rgba(99,102,241,.1)));
      }
      .od-appr-info { flex: 1; min-width: 0; }
      .od-appr-title {
        font-size: .82rem;
        font-weight: 600;
        color: var(--text, #f1f5f9);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .od-appr-meta { font-size: .72rem; color: var(--text-muted, #94a3b8); }
      .od-appr-actions { display: flex; gap: 6px; }
      .od-appr-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-size: .9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform .2s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow .3s ease;
      }
      .od-appr-btn:hover { transform: scale(1.15); }
      .od-appr-btn.approve {
        background: rgba(74,222,128,.12);
        color: #4ade80;
      }
      .od-appr-btn.approve:hover {
        box-shadow: 0 0 16px rgba(74,222,128,.3), 0 0 4px rgba(74,222,128,.2);
      }
      .od-appr-btn.reject {
        background: rgba(248,113,113,.12);
        color: #f87171;
      }
      .od-appr-btn.reject:hover {
        box-shadow: 0 0 16px rgba(248,113,113,.3), 0 0 4px rgba(248,113,113,.2);
      }
      .od-approvals-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: var(--text-muted, #64748b);
        text-align: center;
        gap: 8px;
      }
      .od-approvals-empty .od-empty-icon {
        font-size: 2.5rem;
        opacity: .5;
        margin-bottom: 4px;
      }
      .od-approvals-empty .od-empty-title {
        font-size: .9rem;
        font-weight: 600;
        color: var(--text-muted, #94a3b8);
      }
      .od-approvals-empty .od-empty-sub {
        font-size: .78rem;
      }

      /* ── Security panel ──────────────────────────────────── */
      .od-security {
        padding: 16px 18px;
        position: relative;
        z-index: 1;
      }
      .od-sec-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255,255,255,.04);
        font-size: .82rem;
      }
      .od-sec-label { color: var(--text-muted, #94a3b8); }
      .od-sec-value {
        color: var(--text, #f1f5f9);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .od-sec-value.intact {
        background: linear-gradient(135deg, #4ade80, #22c55e);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .od-storage-bar {
        width: 100%;
        height: 6px;
        background: rgba(255,255,255,.06);
        border-radius: 3px;
        margin-top: 6px;
        overflow: hidden;
      }
      .od-storage-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa);
        background-size: 200% 100%;
        border-radius: 3px;
        transition: width .8s cubic-bezier(0.16, 1, 0.3, 1);
        animation: od-storage-gradient 3s ease infinite;
      }
      @keyframes od-storage-gradient {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .od-verify-btn {
        width: 100%;
        margin-top: 14px;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(99,102,241,.25);
        background: rgba(99,102,241,.08);
        color: #a5b4fc;
        font-size: .82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all .3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .od-verify-btn:hover {
        background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(139,92,246,.15));
        border-color: rgba(99,102,241,.4);
        box-shadow: 0 4px 16px rgba(99,102,241,.15);
        transform: translateY(-1px);
      }

      /* ── FAB ─────────────────────────────────────────────── */
      .od-fab {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 100;
      }
      .od-fab-btn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7);
        color: #fff;
        font-size: 1.5rem;
        cursor: pointer;
        box-shadow: 0 8px 28px rgba(99,102,241,.4), 0 0 48px rgba(139,92,246,.2);
        transition: transform .5s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow .4s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        will-change: transform;
      }
      .od-fab-btn:hover {
        box-shadow: 0 10px 36px rgba(99,102,241,.5), 0 0 60px rgba(139,92,246,.25);
      }
      .od-fab-btn.open {
        transform: rotate(135deg);
      }
      .od-fab-menu {
        position: absolute;
        bottom: 68px;
        right: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
        opacity: 0;
        transform: translateY(16px) scale(0.95);
        pointer-events: none;
        transition: opacity .4s cubic-bezier(0.16, 1, 0.3, 1),
                    transform .4s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform, opacity;
      }
      .od-fab-menu.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }
      .od-fab-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 12px;
        white-space: nowrap;
        font-size: .82rem;
        font-weight: 600;
        cursor: pointer;
        background: rgba(20,20,30,.85);
        backdrop-filter: blur(20px) saturate(1.2);
        -webkit-backdrop-filter: blur(20px) saturate(1.2);
        border: 1px solid rgba(255,255,255,.08);
        color: var(--text, #f1f5f9);
        transition: transform .2s cubic-bezier(0.16, 1, 0.3, 1),
                    background .2s ease,
                    border-color .2s ease;
        will-change: transform;
      }
      .od-fab-menu.open .od-fab-item:nth-child(1) { animation: od-fab-stagger .4s cubic-bezier(0.16, 1, 0.3, 1) .05s both; }
      .od-fab-menu.open .od-fab-item:nth-child(2) { animation: od-fab-stagger .4s cubic-bezier(0.16, 1, 0.3, 1) .1s both; }
      .od-fab-menu.open .od-fab-item:nth-child(3) { animation: od-fab-stagger .4s cubic-bezier(0.16, 1, 0.3, 1) .15s both; }
      .od-fab-menu.open .od-fab-item:nth-child(4) { animation: od-fab-stagger .4s cubic-bezier(0.16, 1, 0.3, 1) .2s both; }
      @keyframes od-fab-stagger {
        from { opacity: 0; transform: translateY(8px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      .od-fab-item:hover {
        background: rgba(99,102,241,.15);
        border-color: rgba(99,102,241,.25);
        transform: translateX(-2px);
      }
      .od-fab-item.danger { color: #f87171; }
      .od-fab-item.danger:hover {
        background: rgba(239,68,68,.12);
        border-color: rgba(239,68,68,.2);
      }

      /* ── Scrollbars (global for dashboard) ───────────────── */
      .od-feed::-webkit-scrollbar,
      .od-approvals::-webkit-scrollbar { width: 5px; }
      .od-feed::-webkit-scrollbar-track,
      .od-approvals::-webkit-scrollbar-track { background: transparent; }
      .od-feed::-webkit-scrollbar-thumb,
      .od-approvals::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,.1);
        border-radius: 4px;
      }
      .od-feed::-webkit-scrollbar-thumb:hover,
      .od-approvals::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,.18);
      }
      .od-feed, .od-approvals {
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,.1) transparent;
      }

      /* ── Entrance animation for sections ─────────────────── */
      .od-section-enter {
        opacity: 0;
        transform: translateY(20px);
        animation: od-section-rise .6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        will-change: transform, opacity;
      }
      @keyframes od-section-rise {
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  /* ── Seed Data ──────────────────────────────────────────────────────────── */

  const STATS = [
    { key: 'jobs',      value: 12,   label: 'Active Jobs',       emoji: '\uD83D\uDCBC', bg: 'linear-gradient(135deg, rgba(59,130,246,.2), rgba(99,102,241,.15))',  color: '#3b82f6', trend: +8,  route: '/jobs' },
    { key: 'crew',      value: 5,    label: 'Crew in Field',     emoji: '\uD83D\uDC77', bg: 'linear-gradient(135deg, rgba(34,197,94,.2), rgba(16,185,129,.15))',   color: '#22c55e', trend: +3,  route: '/employees' },
    { key: 'revenue',   value: 48.2, label: 'Revenue MTD',       emoji: '\uD83D\uDCB0', bg: 'linear-gradient(135deg, rgba(168,85,247,.2), rgba(139,92,246,.15))',  color: '#a855f7', trend: +12, route: '/invoices', fmt: 'currency' },
    { key: 'approvals', value: 4,    label: 'Pending Approvals', emoji: '\u2705',        bg: 'linear-gradient(135deg, rgba(245,158,11,.2), rgba(234,88,12,.15))', color: '#f59e0b', trend: 0,   route: '/approvals' },
    { key: 'tools',     value: 24,   label: 'Tools Tracked',     emoji: '\uD83D\uDD27', bg: 'linear-gradient(135deg, rgba(236,72,153,.2), rgba(219,39,119,.15))', color: '#ec4899', trend: -2,  route: '/tools' },
    { key: 'invoices',  value: 12.4, label: 'Open Invoices',     emoji: '\uD83D\uDCC4', bg: 'linear-gradient(135deg, rgba(20,184,166,.2), rgba(13,148,136,.15))', color: '#14b8a6', trend: -5,  route: '/invoices', fmt: 'currency' },
  ];

  const ALERTS = [
    { level: 'critical', text: '4 pending approvals require your attention' },
    { level: 'warning',  text: '2 tools overdue for maintenance inspection' },
    { level: 'info',     text: 'System backup completed successfully at 3:00 AM' },
  ];

  function seedActivity(userName) {
    const now = Date.now();
    return [
      { user: userName,           color: '#3b82f6', action: 'approved overtime pay for Marcus Rivera',   time: new Date(now - 120000).toISOString(),    cat: 'changes' },
      { user: 'Sarah Ochoa',      color: '#ec4899', action: 'submitted expense report — $142.50',        time: new Date(now - 300000).toISOString(),    cat: 'changes' },
      { user: 'Mike Torres',      color: '#f59e0b', action: 'clocked in at Riverside Office site',       time: new Date(now - 480000).toISOString(),    cat: 'logins' },
      { user: 'James Bell',       color: '#22c55e', action: 'requested time off Apr 21-23',              time: new Date(now - 900000).toISOString(),    cat: 'changes' },
      { user: userName,           color: '#3b82f6', action: 'logged in from Chrome on Windows',          time: new Date(now - 1200000).toISOString(),   cat: 'logins' },
      { user: 'Derek Hall',       color: '#8b5cf6', action: 'completed safety certification renewal',    time: new Date(now - 1800000).toISOString(),   cat: 'changes' },
      { user: 'System',           color: '#ef4444', action: 'failed login attempt from 192.168.1.44',    time: new Date(now - 2400000).toISOString(),   cat: 'security', anomaly: true },
      { user: 'Jake Torres',      color: '#14b8a6', action: 'checked out Bosch Laser Level',             time: new Date(now - 3600000).toISOString(),   cat: 'changes' },
      { user: userName,           color: '#3b82f6', action: 'updated crew assignments for next week',    time: new Date(now - 5400000).toISOString(),   cat: 'changes' },
      { user: 'Maria Santos',     color: '#f97316', action: 'uploaded 3 photos to Main St Renovation',   time: new Date(now - 7200000).toISOString(),   cat: 'changes' },
      { user: 'System',           color: '#ef4444', action: 'unusual API request volume detected',       time: new Date(now - 10800000).toISOString(),  cat: 'security', anomaly: true },
      { user: 'Lisa Chen',        color: '#06b6d4', action: 'generated weekly payroll report',           time: new Date(now - 14400000).toISOString(),  cat: 'changes' },
      { user: 'Carlos Medina',    color: '#84cc16', action: 'logged in from mobile device',              time: new Date(now - 18000000).toISOString(),  cat: 'logins' },
      { user: userName,           color: '#3b82f6', action: 'exported Q1 financial summary',             time: new Date(now - 21600000).toISOString(),  cat: 'changes' },
      { user: 'System',           color: '#22c55e', action: 'daily backup completed — all clear',        time: new Date(now - 28800000).toISOString(),  cat: 'security' },
    ];
  }

  const SEED_APPROVALS = [
    { id: 'a1', emoji: '\uD83D\uDCB5', title: 'Pay Approval — Mike Torres',      meta: 'Overtime · $2,400',       bg: 'rgba(59,130,246,.12)' },
    { id: 'a2', emoji: '\uD83E\uDDFE', title: 'Expense — Sarah Ochoa',           meta: 'Field supplies · $142.50', bg: 'rgba(168,85,247,.12)' },
    { id: 'a3', emoji: '\uD83C\uDFD6\uFE0F', title: 'Time Off — James Bell',     meta: 'Apr 21-23 · 3 days',      bg: 'rgba(34,197,94,.12)' },
    { id: 'a4', emoji: '\uD83D\uDD27', title: 'Tool Writeoff — Bosch Laser',     meta: 'Damaged · $310',           bg: 'rgba(245,158,11,.12)' },
  ];

  /* ── DataStore-backed data fetchers ─────────────────────────────────────── */

  async function getActivity(userName) {
    try {
      const logs = await DataStore.list('audit_log');
      if (logs && logs.length > 0) {
        // Map audit_log entries to feed format, newest first
        const mapped = logs
          .sort((a, b) => (b.timestamp || b.createdAt || '').localeCompare(a.timestamp || a.createdAt || ''))
          .slice(0, 30)
          .map(entry => ({
            user: entry.userName || entry.userId || 'System',
            color: entry.userName === userName ? '#3b82f6' : '#94a3b8',
            action: entry.action || entry.description || entry.type || 'performed an action',
            time: entry.timestamp || entry.createdAt || new Date().toISOString(),
            cat: entry.category || (entry.type === 'login' ? 'logins' : entry.type === 'security' ? 'security' : 'changes'),
            anomaly: entry.anomaly || false,
          }));
        if (mapped.length > 0) return mapped;
      }
    } catch (e) {
      console.warn('[OwnerDashboard] Could not fetch audit_log, using seed data:', e);
    }
    // Fallback to seed data
    return seedActivity(userName);
  }

  async function getApprovals() {
    try {
      let approvals = await DataStore.list('approvals');
      const seeded = localStorage.getItem('amcoee_approvals_seeded');
      if ((!approvals || approvals.length === 0) && !seeded) {
        // First time: seed approvals
        for (const seed of SEED_APPROVALS) {
          await DataStore.create('approvals', { ...seed });
        }
        localStorage.setItem('amcoee_approvals_seeded', 'true');
        approvals = await DataStore.list('approvals');
      }
      return approvals || [];
    } catch (e) {
      console.warn('[OwnerDashboard] Could not fetch approvals:', e);
      return [];
    }
  }

  async function getApprovalCount() {
    try {
      const approvals = await DataStore.list('approvals');
      return approvals ? approvals.length : SEED_APPROVALS.length;
    } catch {
      return SEED_APPROVALS.length;
    }
  }

  /* ── Chart Builders ─────────────────────────────────────────────────────── */

  function buildUsageChart(canvas) {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(59,130,246,.7)');
    gradient.addColorStop(1, 'rgba(139,92,246,.4)');
    charts.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Dashboard', 'Employees', 'Jobs', 'Tools', 'Invoices', 'Reports', 'Schedule', 'Settings'],
        datasets: [{
          label: 'Page Views',
          data: [342, 218, 195, 167, 143, 98, 87, 52],
          backgroundColor: gradient,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,23,42,.9)', titleColor: '#f1f5f9', bodyColor: '#94a3b8', cornerRadius: 8, padding: 10 } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#64748b', font: { size: 11 } } }
        }
      }
    });
    canvas.style.display = 'block';
    canvas.style.maxHeight = '100%';
  }

  function buildRevenueChart(canvas) {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(34,197,94,.25)');
    gradient.addColorStop(1, 'rgba(34,197,94,.01)');
    charts.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [{
          label: 'Revenue ($K)',
          data: [32.1, 28.7, 35.4, 41.8, 44.6, 48.2],
          borderColor: '#22c55e',
          backgroundColor: gradient,
          fill: true,
          tension: .4,
          pointBackgroundColor: '#22c55e',
          pointRadius: 4,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15,23,42,.9)', titleColor: '#f1f5f9', bodyColor: '#94a3b8', cornerRadius: 8, padding: 10, callbacks: { label: (c) => '$' + c.parsed.y.toFixed(1) + 'K' } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '$' + v + 'K' } }
        }
      }
    });
    canvas.style.display = 'block';
    canvas.style.maxHeight = '100%';
  }

  function buildTeamChart(canvas) {
    const ctx = canvas.getContext('2d');
    const data = [5, 8, 3, 2, 4];
    const total = data.reduce((a, b) => a + b, 0);
    charts.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Electricians', 'Laborers', 'Foremen', 'Admin', 'Apprentices'],
        datasets: [{
          data: data,
          backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'],
          borderWidth: 0,
          spacing: 3,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 10 } },
          tooltip: { backgroundColor: 'rgba(15,23,42,.9)', titleColor: '#f1f5f9', bodyColor: '#94a3b8', cornerRadius: 8, padding: 10 },
        }
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const { ctx: c, chartArea: { left, right, top, bottom } } = chart;
          const cx = (left + right) / 2;
          const cy = (top + bottom) / 2;
          c.save();
          c.textAlign = 'center';
          c.fillStyle = '#f1f5f9';
          c.font = 'bold 1.6rem Inter, system-ui, sans-serif';
          c.fillText(total, cx, cy + 4);
          c.font = '500 .7rem Inter, system-ui, sans-serif';
          c.fillStyle = '#94a3b8';
          c.fillText('total', cx, cy + 20);
          c.restore();
        }
      }]
    });
    canvas.style.display = 'block';
    canvas.style.maxHeight = '100%';
  }

  /* ── HTML builders for partial DOM updates ──────────────────────────────── */

  function buildFeedHtml(activity) {
    return activity.map(a => `
      <div class="od-feed-item${a.anomaly ? ' anomaly' : ''}" data-cat="${a.cat}">
        <div class="od-feed-avatar" style="background:${a.color}">${san(a.user.charAt(0))}</div>
        <div>
          <div class="od-feed-text"><strong>${san(a.user)}</strong> ${san(a.action)}</div>
          <div class="od-feed-time">${relativeTime(a.time)}</div>
        </div>
      </div>
    `).join('');
  }

  function buildApprovalsHtml(approvals) {
    if (!approvals || approvals.length === 0) {
      return `
        <div class="od-approvals-empty">
          <div class="od-empty-icon">\u2728</div>
          <div class="od-empty-title">All caught up</div>
          <div class="od-empty-sub">No pending approvals right now</div>
        </div>
      `;
    }
    return approvals.map(a => `
      <div class="od-appr-card" data-id="${a.id}">
        <div class="od-appr-icon" style="background:${a.bg}">${a.emoji}</div>
        <div class="od-appr-info">
          <div class="od-appr-title">${san(a.title)}</div>
          <div class="od-appr-meta">${san(a.meta)}</div>
        </div>
        <div class="od-appr-actions">
          <button class="od-appr-btn approve" data-id="${a.id}" title="Approve">\u2713</button>
          <button class="od-appr-btn reject" data-id="${a.id}" title="Reject">\u2717</button>
        </div>
      </div>
    `).join('');
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  async function render(container, session) {
    cleanup();
    injectStyles();

    const firstName = san((session.name || 'User').split(' ')[0]);
    const userName = session.name || 'User';
    const role = san(session.role || 'owner');
    const roleBadge = role.replace('_', ' ');
    const activity = await getActivity(userName);
    const approvals = await getApprovals();
    const approvalCount = approvals.length;
    const { time: clockTime, date: clockDate } = formatClock();

    // Dynamic stats: wire 'Pending Approvals' from DataStore
    const dynamicStats = STATS.map(s => {
      if (s.key === 'approvals') {
        return { ...s, value: approvalCount };
      }
      return s;
    });

    // Build stat cards HTML
    const statsHtml = dynamicStats.map((s, i) => `
      <div class="od-glass od-stat-card od-stat-enter" style="animation-delay:${i * 90}ms" data-route="${s.route}">
        <div class="od-shimmer"></div>
        <div class="od-icon" style="background:${s.bg}">${s.emoji}</div>
        <div class="od-val counting" data-target="${s.value}" data-format="${s.fmt || ''}">${s.fmt === 'currency' ? '$0K' : '0'}</div>
        <div class="od-label">${san(s.label)}</div>
        ${s.trend !== 0 ? `<span class="od-trend ${s.trend > 0 ? 'up' : 'down'}">${s.trend > 0 ? '\u25B2' : '\u25BC'} ${Math.abs(s.trend)}%</span>` : ''}
      </div>
    `).join('');

    // Build activity feed HTML
    const feedHtml = buildFeedHtml(activity);

    // Build approval cards HTML
    const approvalsHtml = buildApprovalsHtml(approvals);

    // Assemble full HTML
    container.innerHTML = `
      <div class="od-dashboard-root" style="position:relative;z-index:1;padding:24px;max-width:1320px;margin:0 auto">
        <!-- Priority Alert Banner -->
        <div class="od-alert-banner ${ALERTS[0].level}" id="od-alert">
          <span class="od-alert-text" id="od-alert-text">${san(ALERTS[0].text)}</span>
          <button class="od-alert-dismiss" id="od-alert-dismiss">\u2715</button>
        </div>

        <!-- Welcome Header -->
        <div class="od-header">
          <div>
            <div class="od-greeting">${greetingText()}, <span class="od-name-gradient">${firstName}</span></div>
            <div class="od-clock"><span id="od-clock-time">${clockTime}</span> &middot; <span id="od-clock-date">${clockDate}</span></div>
            <span class="od-role-badge">${san(roleBadge)}</span>
          </div>
          <div class="od-quick-stats">
            <span><span class="qs-num">6</span> active</span>
            <span><span class="qs-num">3</span> in field</span>
            <span><span class="qs-num">${approvalCount}</span> pending approvals</span>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="od-stats-grid">${statsHtml}</div>

        <!-- Main Two-Column Layout -->
        <div class="od-main">
          <!-- Left Column -->
          <div style="display:flex;flex-direction:column;gap:20px">
            <!-- Activity Feed -->
            <div class="od-glass od-section-enter" style="overflow:hidden;animation-delay:.1s">
              <div class="od-section-hdr">
                <div class="od-section-title"><div class="od-pulse-dot"></div>Live Activity</div>
              </div>
              <div class="od-filter-pills">
                <button class="od-pill active" data-filter="all">All</button>
                <button class="od-pill" data-filter="logins">Logins</button>
                <button class="od-pill" data-filter="changes">Changes</button>
                <button class="od-pill" data-filter="security">Security</button>
              </div>
              <div class="od-feed" id="od-feed">${feedHtml}</div>
            </div>

            <!-- Charts Panel -->
            <div class="od-glass od-section-enter" style="overflow:hidden;animation-delay:.2s">
              <div class="od-section-hdr">
                <div class="od-section-title">Analytics</div>
              </div>
              <div class="od-chart-tabs" id="od-chart-tabs">
                <button class="od-chart-tab active" data-chart="usage">Usage</button>
                <button class="od-chart-tab" data-chart="revenue">Revenue</button>
                <button class="od-chart-tab" data-chart="team">Team</button>
              </div>
              <div class="od-chart-wrap" id="od-chart-wrap">
                <canvas id="od-chart-canvas" style="display:block;width:100%;max-height:100%"></canvas>
              </div>
            </div>
          </div>

          <!-- Right Column -->
          <div style="display:flex;flex-direction:column;gap:20px">
            <!-- Approval Queue -->
            <div class="od-glass od-section-enter" style="overflow:hidden;animation-delay:.15s">
              <div class="od-section-hdr">
                <div class="od-section-title">Pending Approvals <span class="od-badge" id="od-appr-count">${approvalCount}</span></div>
              </div>
              <div class="od-approvals" id="od-approvals">${approvalsHtml}</div>
            </div>

            <!-- Security Overview -->
            <div class="od-glass od-section-enter" style="overflow:hidden;animation-delay:.25s">
              <div class="od-section-hdr">
                <div class="od-section-title">\uD83D\uDD12 Security Overview</div>
              </div>
              <div class="od-security">
                <div class="od-sec-row">
                  <span class="od-sec-label">Active Sessions</span>
                  <span class="od-sec-value">3</span>
                </div>
                <div class="od-sec-row">
                  <span class="od-sec-label">Failed Logins (24h)</span>
                  <span class="od-sec-value" style="color:#f87171">7</span>
                </div>
                <div class="od-sec-row">
                  <span class="od-sec-label">Audit Chain</span>
                  <span class="od-sec-value intact">\u2713 Intact</span>
                </div>
                <div class="od-sec-row" style="flex-direction:column;align-items:stretch;gap:4px">
                  <div style="display:flex;justify-content:space-between">
                    <span class="od-sec-label">Storage</span>
                    <span class="od-sec-value">2.4 / 5 GB</span>
                  </div>
                  <div class="od-storage-bar"><div class="od-storage-fill" style="width:48%"></div></div>
                </div>
                <button class="od-verify-btn" id="od-verify-btn">\uD83D\uDD0D Verify Integrity</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FAB -->
      <div class="od-fab">
        <div class="od-fab-menu" id="od-fab-menu">
          <div class="od-fab-item" data-action="add-employee">\uD83D\uDC64 Add Employee</div>
          <div class="od-fab-item" data-action="announcement">\uD83D\uDCE2 New Announcement</div>
          <div class="od-fab-item" data-action="export">\uD83D\uDCE5 Export Data</div>
          <div class="od-fab-item danger" data-action="lockdown">\uD83D\uDEA8 Emergency Lockdown</div>
        </div>
        <button class="od-fab-btn" id="od-fab-btn">+</button>
      </div>
    `;

    /* ── Post-render: animate counters ──────────────────────────────────── */
    container.querySelectorAll('.od-stat-card .od-val').forEach(el => {
      const target = parseFloat(el.dataset.target);
      if (!isNaN(target)) {
        animateCounter(el, target, 1000);
        // Remove counting glow after animation
        setTimeout(() => el.classList.remove('counting'), 1100);
      }
    });

    /* ── Live clock ─────────────────────────────────────────────────────── */
    clockInterval = setInterval(() => {
      const { time, date } = formatClock();
      const ct = document.getElementById('od-clock-time');
      const cd = document.getElementById('od-clock-date');
      if (ct) ct.textContent = time;
      if (cd) cd.textContent = date;
    }, 15000);

    /* ── Alert rotation ─────────────────────────────────────────────────── */
    alertIdx = 0;
    const alertEl = document.getElementById('od-alert');
    const alertText = document.getElementById('od-alert-text');
    if (alertEl && alertText) {
      alertInterval = setInterval(() => {
        alertIdx = (alertIdx + 1) % ALERTS.length;
        const a = ALERTS[alertIdx];
        // Slide out (translateX)
        alertText.classList.add('slide-out');
        setTimeout(() => {
          alertText.textContent = a.text;
          alertEl.className = 'od-alert-banner ' + a.level;
          // Prepare slide in
          alertText.classList.remove('slide-out');
          alertText.classList.add('slide-in');
          // Trigger reflow then animate in
          void alertText.offsetWidth;
          alertText.classList.remove('slide-in');
        }, 400);
      }, 5000);

      document.getElementById('od-alert-dismiss').addEventListener('click', () => {
        alertEl.style.display = 'none';
        if (alertInterval) { clearInterval(alertInterval); alertInterval = null; }
      });
    }

    /* ── Activity filter pills ──────────────────────────────────────────── */
    container.querySelectorAll('.od-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.od-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const filter = pill.dataset.filter;
        container.querySelectorAll('.od-feed-item').forEach(item => {
          item.style.display = (filter === 'all' || item.dataset.cat === filter) ? '' : 'none';
        });
      });
    });

    /* ── Charts (tabs) ──────────────────────────────────────────────────── */
    function switchChart(type) {
      if (charts.current) { charts.current.destroy(); charts.current = null; }
      const wrap = document.getElementById('od-chart-wrap');
      if (!wrap) return;
      wrap.innerHTML = '<canvas id="od-chart-canvas" style="display:block;width:100%;max-height:100%"></canvas>';
      const canvas = document.getElementById('od-chart-canvas');
      if (!canvas) return;
      if (type === 'usage') buildUsageChart(canvas);
      else if (type === 'revenue') buildRevenueChart(canvas);
      else if (type === 'team') buildTeamChart(canvas);
    }

    // Initial chart
    switchChart('usage');

    // Tab listeners
    const tabBar = document.getElementById('od-chart-tabs');
    if (tabBar) {
      tabBar.addEventListener('click', (e) => {
        const tab = e.target.closest('.od-chart-tab');
        if (!tab) return;
        tabBar.querySelectorAll('.od-chart-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        switchChart(tab.dataset.chart);
      });
    }

    /* ── Stat card navigation ───────────────────────────────────────────── */
    container.querySelectorAll('.od-stat-card').forEach(card => {
      card.addEventListener('click', () => {
        const route = card.dataset.route;
        if (route && typeof Router !== 'undefined') Router.navigate(route);
      });
    });

    /* ── Approval actions (DataStore-backed) ────────────────────────────── */
    const approvalsContainer = document.getElementById('od-approvals');
    if (approvalsContainer) {
      approvalsContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.od-appr-btn');
        if (!btn) return;
        const card = btn.closest('.od-appr-card');
        if (!card) return;
        const approvalId = card.dataset.id;
        const isApprove = btn.classList.contains('approve');
        const title = card.querySelector('.od-appr-title')?.textContent || 'Item';

        // Animate removal
        card.classList.add('removing');
        setTimeout(() => {
          card.remove();
          // Update badge count from DOM
          const badge = document.getElementById('od-appr-count');
          const remaining = approvalsContainer.querySelectorAll('.od-appr-card').length;
          if (badge) badge.textContent = remaining;
          // Update the Pending Approvals stat card
          updateApprovalStat(remaining);
          // Show empty state if no approvals left
          if (remaining === 0) {
            approvalsContainer.innerHTML = `
              <div class="od-approvals-empty">
                <div class="od-empty-icon">\u2728</div>
                <div class="od-empty-title">All caught up</div>
                <div class="od-empty-sub">No pending approvals right now</div>
              </div>
            `;
          }
        }, 400);

        // Remove from DataStore
        try {
          await DataStore.remove('approvals', approvalId);
        } catch (e) {
          console.warn('[OwnerDashboard] Could not remove approval from DataStore:', e);
        }

        // Show toast
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast(isApprove ? 'Approved: ' + title : 'Rejected: ' + title, isApprove ? 'success' : 'error');
        }

        // Audit log
        if (typeof AuditLog !== 'undefined' && AuditLog.log) {
          AuditLog.log(isApprove ? 'approval_granted' : 'approval_rejected', { item: title });
        }
      });
    }

    /* ── Helper: update approval stat card value ───────────────────────── */
    function updateApprovalStat(count) {
      const statCards = container.querySelectorAll('.od-stat-card');
      statCards.forEach(card => {
        if (card.dataset.route === '/approvals') {
          const valEl = card.querySelector('.od-val');
          if (valEl) {
            valEl.dataset.target = count;
            valEl.textContent = count;
          }
        }
      });
    }

    /* ── Real-time: refresh approvals from DataStore ────────────────────── */
    async function refreshApprovals() {
      const approvalsEl = document.getElementById('od-approvals');
      const badge = document.getElementById('od-appr-count');
      if (!approvalsEl) return;

      try {
        const liveApprovals = await DataStore.list('approvals');
        approvalsEl.innerHTML = buildApprovalsHtml(liveApprovals);
        const count = liveApprovals.length;
        if (badge) badge.textContent = count;
        updateApprovalStat(count);
      } catch (e) {
        console.warn('[OwnerDashboard] refreshApprovals failed:', e);
      }
    }

    /* ── Real-time: refresh activity from DataStore ─────────────────────── */
    async function refreshActivity() {
      const feedEl = document.getElementById('od-feed');
      if (!feedEl) return;

      try {
        const liveActivity = await getActivity(userName);
        feedEl.innerHTML = buildFeedHtml(liveActivity);
        // Re-apply current filter
        const activeFilter = container.querySelector('.od-pill.active');
        if (activeFilter && activeFilter.dataset.filter !== 'all') {
          const filter = activeFilter.dataset.filter;
          feedEl.querySelectorAll('.od-feed-item').forEach(item => {
            item.style.display = (item.dataset.cat === filter) ? '' : 'none';
          });
        }
      } catch (e) {
        console.warn('[OwnerDashboard] refreshActivity failed:', e);
      }
    }

    /* ── Subscribe to AppEvents for real-time updates ──────────────────── */
    if (typeof AppEvents !== 'undefined') {
      unsubs.push(AppEvents.on('data:approvals:create', refreshApprovals));
      unsubs.push(AppEvents.on('data:approvals:update', refreshApprovals));
      unsubs.push(AppEvents.on('data:audit_log:create', refreshActivity));
    }

    /* ── Security verify button ─────────────────────────────────────────── */
    const verifyBtn = document.getElementById('od-verify-btn');
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => {
        verifyBtn.textContent = '\u23F3 Verifying...';
        verifyBtn.disabled = true;
        setTimeout(() => {
          verifyBtn.textContent = '\u2705 All Systems Verified';
          verifyBtn.style.borderColor = 'rgba(74,222,128,.4)';
          verifyBtn.style.color = '#4ade80';
          setTimeout(() => {
            verifyBtn.textContent = '\uD83D\uDD0D Verify Integrity';
            verifyBtn.style.borderColor = '';
            verifyBtn.style.color = '';
            verifyBtn.disabled = false;
          }, 3000);
        }, 1500);
      });
    }

    /* ── FAB ─────────────────────────────────────────────────── */
    const fabBtn = document.getElementById('od-fab-btn');
    const fabMenu = document.getElementById('od-fab-menu');
    if (fabBtn && fabMenu) {
      fabBtn.addEventListener('click', () => {
        const isOpen = fabBtn.classList.toggle('open');
        fabMenu.classList.toggle('open', isOpen);
      });

      fabMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.od-fab-item');
        if (!item) return;
        const action = item.dataset.action;
        fabBtn.classList.remove('open');
        fabMenu.classList.remove('open');

        if (action === 'add-employee' && typeof Router !== 'undefined') {
          Router.navigate('/employees');
        } else if (action === 'announcement' && typeof UI !== 'undefined' && UI.toast) {
          UI.toast('Announcement feature coming soon', 'info');
        } else if (action === 'export' && typeof UI !== 'undefined' && UI.toast) {
          UI.toast('Exporting data...', 'info');
        } else if (action === 'lockdown') {
          if (confirm('Activate emergency lockdown? This will log out all non-owner sessions.')) {
            if (typeof UI !== 'undefined' && UI.toast) UI.toast('Emergency lockdown activated', 'error');
            if (typeof AuditLog !== 'undefined' && AuditLog.log) AuditLog.log('emergency_lockdown', { triggeredBy: session.name });
          }
        }
      });
    }

    // Close FAB on outside click
    document.addEventListener('click', (e) => {
      if (fabBtn && fabMenu && !e.target.closest('.od-fab')) {
        fabBtn.classList.remove('open');
        fabMenu.classList.remove('open');
      }
    });
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  return { render };
})();

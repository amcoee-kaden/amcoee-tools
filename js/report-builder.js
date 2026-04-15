/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — ReportBuilder
   Custom report generation with Chart.js. Dimension/metric selection, chart
   type picker, template save/load, and export (PNG, CSV).
   ══════════════════════════════════════════════════════════════════════════════ */

const ReportBuilder = (() => {
  'use strict';

  let currentChart = null;
  let savedTemplates = [];

  function s(str) {
    return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(String(str ?? '')) : String(str ?? '');
  }

  // ── Available Dimensions & Metrics ────────────────────────────────────────

  const DIMENSIONS = [
    { id: 'date',       label: 'Date',       group: 'Time' },
    { id: 'week',       label: 'Week',       group: 'Time' },
    { id: 'month',      label: 'Month',      group: 'Time' },
    { id: 'user',       label: 'Employee',   group: 'People' },
    { id: 'role',       label: 'Role',       group: 'People' },
    { id: 'department', label: 'Department', group: 'People' },
    { id: 'action',     label: 'Action Type',group: 'Activity' },
    { id: 'page',       label: 'Page/Tool',  group: 'Activity' },
  ];

  const METRICS = [
    { id: 'event_count',    label: 'Event Count',      group: 'Activity' },
    { id: 'unique_users',   label: 'Unique Users',     group: 'Activity' },
    { id: 'avg_dwell',      label: 'Avg Dwell Time',   group: 'Engagement' },
    { id: 'session_count',  label: 'Session Count',    group: 'Sessions' },
    { id: 'login_count',    label: 'Login Count',      group: 'Sessions' },
    { id: 'failed_logins',  label: 'Failed Logins',    group: 'Security' },
    { id: 'audit_actions',  label: 'Audit Actions',    group: 'Compliance' },
    { id: 'approval_count', label: 'Approvals',        group: 'Workflow' },
  ];

  const CHART_TYPES = [
    { id: 'bar',      label: 'Bar',       icon: '▊' },
    { id: 'line',     label: 'Line',      icon: '📈' },
    { id: 'pie',      label: 'Pie',       icon: '◔' },
    { id: 'doughnut', label: 'Doughnut',  icon: '◎' },
    { id: 'table',    label: 'Table',     icon: '▤' },
  ];

  const COLORS = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7',
  ];

  // ── Data Fetching ─────────────────────────────────────────────────────────

  async function fetchData(config) {
    const { dimension, metric, dateFrom, dateTo } = config;

    // Gather raw data from different sources
    let auditEntries = [];
    let analyticsEvents = [];
    let sessions = [];
    let approvals = [];

    try { auditEntries = await AuditLog.getEntries({}); } catch {}
    try { analyticsEvents = await DataStore.list('analytics_events'); } catch {}
    try { sessions = await DataStore.list('sessions'); } catch {}
    try { approvals = await DataStore.list('approvals'); } catch {}

    // Apply date filters
    const from = dateFrom ? new Date(dateFrom) : new Date(0);
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : new Date();

    function inRange(ts) {
      if (!ts) return false;
      const d = new Date(ts);
      return d >= from && d <= to;
    }

    auditEntries = auditEntries.filter(e => inRange(e.timestamp));
    analyticsEvents = analyticsEvents.filter(e => inRange(e.timestamp));
    sessions = sessions.filter(e => inRange(e.loginTime));
    approvals = approvals.filter(e => inRange(e.createdAt));

    // Build grouped results based on dimension
    const grouped = {};

    function getKey(entry) {
      const ts = entry.timestamp || entry.loginTime || entry.createdAt || '';
      const d = new Date(ts);
      switch (dimension) {
        case 'date':
          return d.toISOString().split('T')[0];
        case 'week': {
          const jan1 = new Date(d.getFullYear(), 0, 1);
          const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
          return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
        }
        case 'month':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        case 'user':
          return entry.userName || entry.userId || 'Unknown';
        case 'role':
          return entry.role || 'unknown';
        case 'department':
          return entry.department || 'Unassigned';
        case 'action':
          return entry.action || 'unknown';
        case 'page':
          return entry.page || entry.target || entry.collection || 'unknown';
        default:
          return 'all';
      }
    }

    function addToGroup(key) {
      if (!grouped[key]) grouped[key] = { count: 0, users: new Set(), dwell: [], sessions: 0, logins: 0, failed: 0, audits: 0, approvals: 0 };
    }

    // Process audit entries
    auditEntries.forEach(e => {
      const key = getKey(e);
      addToGroup(key);
      grouped[key].audits++;
      grouped[key].count++;
      if (e.userId) grouped[key].users.add(e.userId);
      if (e.action === 'login_failed') grouped[key].failed++;
    });

    // Process analytics events
    analyticsEvents.forEach(e => {
      const key = getKey(e);
      addToGroup(key);
      grouped[key].count++;
      if (e.userId) grouped[key].users.add(e.userId);
      if (e.dwellMs) grouped[key].dwell.push(e.dwellMs);
    });

    // Process sessions
    sessions.forEach(e => {
      const key = getKey(e);
      addToGroup(key);
      grouped[key].sessions++;
      grouped[key].logins++;
      if (e.userId) grouped[key].users.add(e.userId);
    });

    // Process approvals
    approvals.forEach(e => {
      const key = getKey(e);
      addToGroup(key);
      grouped[key].approvals++;
    });

    // Extract metric values
    const labels = Object.keys(grouped).sort();
    const values = labels.map(key => {
      const g = grouped[key];
      switch (metric) {
        case 'event_count':    return g.count;
        case 'unique_users':   return g.users.size;
        case 'avg_dwell':      return g.dwell.length > 0 ? Math.round(g.dwell.reduce((a, b) => a + b, 0) / g.dwell.length / 1000) : 0;
        case 'session_count':  return g.sessions;
        case 'login_count':    return g.logins;
        case 'failed_logins':  return g.failed;
        case 'audit_actions':  return g.audits;
        case 'approval_count': return g.approvals;
        default:               return g.count;
      }
    });

    return { labels, values };
  }

  // ── Chart Rendering ───────────────────────────────────────────────────────

  function renderChart(canvasId, type, data, metricLabel) {
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }

    if (type === 'table') return; // Table handled separately

    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const isPie = type === 'pie' || type === 'doughnut';

    const chartConfig = {
      type: type,
      data: {
        labels: data.labels,
        datasets: [{
          label: metricLabel,
          data: data.values,
          backgroundColor: isPie
            ? data.labels.map((_, i) => COLORS[i % COLORS.length] + 'cc')
            : COLORS[0] + '33',
          borderColor: isPie
            ? data.labels.map((_, i) => COLORS[i % COLORS.length])
            : COLORS[0],
          borderWidth: isPie ? 2 : 2,
          borderRadius: type === 'bar' ? 6 : 0,
          tension: 0.3,
          fill: type === 'line',
          pointBackgroundColor: COLORS[0],
          pointRadius: type === 'line' ? 4 : 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: isPie, position: 'bottom', labels: { color: '#8b8ba3', padding: 16, font: { family: 'Inter' } } },
          tooltip: { backgroundColor: '#1a1a2e', titleColor: '#f0f0f5', bodyColor: '#c4c4d4', borderColor: '#2a2a4a', borderWidth: 1, padding: 12, cornerRadius: 8 },
        },
        scales: isPie ? {} : {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 11 } }, beginAtZero: true },
        },
      }
    };

    currentChart = new Chart(ctx, chartConfig);
  }

  function renderTable(containerId, data, dimLabel, metricLabel) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const total = data.values.reduce((a, b) => a + b, 0);

    el.innerHTML = `
      <div class="table-wrapper" style="margin-top:16px">
        <table class="table">
          <thead><tr>
            <th>${s(dimLabel)}</th>
            <th style="text-align:right">${s(metricLabel)}</th>
            <th style="text-align:right">% of Total</th>
          </tr></thead>
          <tbody>
            ${data.labels.map((label, i) => `
              <tr>
                <td style="font-weight:500">${s(label)}</td>
                <td style="text-align:right;font-family:monospace">${data.values[i].toLocaleString()}</td>
                <td style="text-align:right;color:var(--text-tertiary)">${total > 0 ? ((data.values[i] / total) * 100).toFixed(1) : 0}%</td>
              </tr>`).join('')}
            <tr style="font-weight:700;border-top:2px solid var(--border-primary)">
              <td>Total</td>
              <td style="text-align:right;font-family:monospace">${total.toLocaleString()}</td>
              <td style="text-align:right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  function loadTemplates() {
    try {
      savedTemplates = JSON.parse(localStorage.getItem('amcoee_report_templates') || '[]');
    } catch { savedTemplates = []; }
  }

  function saveTemplate(config) {
    loadTemplates();
    const tpl = {
      id: 'tpl_' + Date.now(),
      name: config.name || 'Untitled Report',
      dimension: config.dimension,
      metric: config.metric,
      chartType: config.chartType,
      dateFrom: config.dateFrom,
      dateTo: config.dateTo,
      savedAt: new Date().toISOString(),
    };
    savedTemplates.push(tpl);
    localStorage.setItem('amcoee_report_templates', JSON.stringify(savedTemplates));
    return tpl;
  }

  function deleteTemplate(id) {
    loadTemplates();
    savedTemplates = savedTemplates.filter(t => t.id !== id);
    localStorage.setItem('amcoee_report_templates', JSON.stringify(savedTemplates));
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function exportCSV(data, dimLabel, metricLabel) {
    const rows = [
      [dimLabel, metricLabel],
      ...data.labels.map((l, i) => [l, data.values[i]])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amcoee-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    const canvas = document.querySelector('#rb-chart-canvas');
    if (!canvas) { UI.toast('No chart to export', 'error'); return; }
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `amcoee-report-${new Date().toISOString().split('T')[0]}.png`;
    a.click();
  }

  // ── Main Render ───────────────────────────────────────────────────────────

  async function render() {
    const main = document.getElementById('main-body');
    if (!main) return;

    const session = typeof Auth !== 'undefined' ? Auth.getSession() : null;
    const isAdmin = session && ['owner', 'head_admin'].includes(session.role);

    loadTemplates();

    // Default config
    const config = {
      dimension: 'date',
      metric: 'event_count',
      chartType: 'bar',
      dateFrom: '',
      dateTo: '',
    };

    async function renderReport() {
      const dimLabel = DIMENSIONS.find(d => d.id === config.dimension)?.label || config.dimension;
      const metLabel = METRICS.find(m => m.id === config.metric)?.label || config.metric;

      // Show loading
      const preview = document.getElementById('rb-preview');
      if (preview) preview.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:48px"><div class="spinner"></div></div>`;

      const data = await fetchData(config);

      if (!preview) return;

      if (data.labels.length === 0) {
        preview.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text-tertiary)">
          <p style="font-size:var(--text-lg);margin-bottom:8px">No data found</p>
          <p style="font-size:var(--text-sm)">Try adjusting the date range or dimension.</p>
        </div>`;
        return;
      }

      if (config.chartType === 'table') {
        preview.innerHTML = `<div id="rb-table-container"></div>`;
        renderTable('rb-table-container', data, dimLabel, metLabel);
      } else {
        preview.innerHTML = `<div style="position:relative;height:400px;padding:16px">
          <canvas id="rb-chart-canvas"></canvas>
        </div>`;
        renderChart('rb-chart-canvas', config.chartType, data, metLabel);
      }

      // Export buttons
      const exportArea = document.getElementById('rb-export-area');
      if (exportArea) {
        exportArea.innerHTML = `
          <button class="btn btn-ghost btn-sm" id="rb-export-csv">Export CSV</button>
          ${config.chartType !== 'table' ? `<button class="btn btn-ghost btn-sm" id="rb-export-png">Export PNG</button>` : ''}`;
        exportArea.querySelector('#rb-export-csv')?.addEventListener('click', () => exportCSV(data, dimLabel, metLabel));
        exportArea.querySelector('#rb-export-png')?.addEventListener('click', exportPNG);
      }
    }

    function buildUI() {
      const dimGroups = {};
      DIMENSIONS.forEach(d => { if (!dimGroups[d.group]) dimGroups[d.group] = []; dimGroups[d.group].push(d); });
      const metGroups = {};
      METRICS.forEach(m => { if (!metGroups[m.group]) metGroups[m.group] = []; metGroups[m.group].push(m); });

      main.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:24px">
          <div>
            <h2 style="font-size:var(--text-2xl);font-weight:800;color:var(--text-primary);font-family:var(--font-display)">Reports & Analytics</h2>
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:4px">Build custom reports from your data</p>
          </div>
          <div style="display:flex;gap:8px" id="rb-export-area"></div>
        </div>

        <!-- Config Panel -->
        <div class="card" style="padding:20px;margin-bottom:20px">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">
            <div>
              <label class="label">Dimension (X-Axis)</label>
              <select class="input" id="rb-dimension">
                ${Object.entries(dimGroups).map(([group, dims]) =>
                  `<optgroup label="${s(group)}">${dims.map(d =>
                    `<option value="${d.id}" ${config.dimension === d.id ? 'selected' : ''}>${s(d.label)}</option>`
                  ).join('')}</optgroup>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="label">Metric (Y-Axis)</label>
              <select class="input" id="rb-metric">
                ${Object.entries(metGroups).map(([group, mets]) =>
                  `<optgroup label="${s(group)}">${mets.map(m =>
                    `<option value="${m.id}" ${config.metric === m.id ? 'selected' : ''}>${s(m.label)}</option>`
                  ).join('')}</optgroup>`
                ).join('')}
              </select>
            </div>
            <div>
              <label class="label">From</label>
              <input class="input" type="date" id="rb-from" value="${s(config.dateFrom)}">
            </div>
            <div>
              <label class="label">To</label>
              <input class="input" type="date" id="rb-to" value="${s(config.dateTo)}">
            </div>
          </div>

          <!-- Chart Type Selector -->
          <div style="display:flex;gap:6px;margin-top:16px;flex-wrap:wrap">
            ${CHART_TYPES.map(ct => `
              <button class="btn btn-sm rb-chart-type ${config.chartType === ct.id ? 'btn-primary' : 'btn-ghost'}" data-type="${ct.id}">
                <span style="margin-right:4px">${ct.icon}</span>${s(ct.label)}
              </button>`).join('')}
          </div>

          <div style="display:flex;gap:8px;margin-top:16px">
            <button class="btn btn-primary btn-sm" id="rb-generate">Generate Report</button>
            ${isAdmin ? `<button class="btn btn-ghost btn-sm" id="rb-save-tpl">Save as Template</button>` : ''}
          </div>
        </div>

        <!-- Preview Area -->
        <div class="card" style="padding:20px;margin-bottom:20px;min-height:200px" id="rb-preview">
          <div style="text-align:center;padding:48px;color:var(--text-tertiary)">
            <p style="font-size:var(--text-lg);margin-bottom:8px">Select dimensions and generate a report</p>
            <p style="font-size:var(--text-sm)">Choose a dimension, metric, and optional date range above.</p>
          </div>
        </div>

        <!-- Saved Templates -->
        ${savedTemplates.length > 0 ? `
          <div class="card" style="padding:20px">
            <h4 style="font-size:var(--text-sm);font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px">Saved Templates</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
              ${savedTemplates.map(tpl => `
                <div class="card" style="padding:14px;cursor:pointer;border:1px solid var(--border-primary)" data-load-tpl="${s(tpl.id)}">
                  <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div>
                      <div style="font-weight:600;font-size:var(--text-sm)">${s(tpl.name)}</div>
                      <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:4px">
                        ${s(DIMENSIONS.find(d => d.id === tpl.dimension)?.label || tpl.dimension)} ×
                        ${s(METRICS.find(m => m.id === tpl.metric)?.label || tpl.metric)}
                        · ${s(CHART_TYPES.find(c => c.id === tpl.chartType)?.label || tpl.chartType)}
                      </div>
                    </div>
                    <button class="btn btn-ghost btn-sm btn-icon" data-del-tpl="${s(tpl.id)}" style="color:var(--status-error);flex-shrink:0">✕</button>
                  </div>
                </div>`).join('')}
            </div>
          </div>` : ''}`;

      // Bind events
      main.querySelector('#rb-dimension').addEventListener('change', e => { config.dimension = e.target.value; });
      main.querySelector('#rb-metric').addEventListener('change', e => { config.metric = e.target.value; });
      main.querySelector('#rb-from').addEventListener('change', e => { config.dateFrom = e.target.value; });
      main.querySelector('#rb-to').addEventListener('change', e => { config.dateTo = e.target.value; });

      main.querySelectorAll('.rb-chart-type').forEach(btn => {
        btn.addEventListener('click', () => {
          config.chartType = btn.dataset.type;
          main.querySelectorAll('.rb-chart-type').forEach(b => b.classList.replace('btn-primary', 'btn-ghost'));
          btn.classList.replace('btn-ghost', 'btn-primary');
        });
      });

      main.querySelector('#rb-generate').addEventListener('click', renderReport);

      main.querySelector('#rb-save-tpl')?.addEventListener('click', () => {
        const name = prompt('Template name:');
        if (!name) return;
        saveTemplate({ ...config, name });
        UI.toast('Template saved', 'success');
        buildUI();
      });

      main.querySelectorAll('[data-load-tpl]').forEach(el => {
        el.addEventListener('click', e => {
          if (e.target.closest('[data-del-tpl]')) return;
          const tpl = savedTemplates.find(t => t.id === el.dataset.loadTpl);
          if (!tpl) return;
          config.dimension = tpl.dimension;
          config.metric = tpl.metric;
          config.chartType = tpl.chartType;
          config.dateFrom = tpl.dateFrom || '';
          config.dateTo = tpl.dateTo || '';
          buildUI();
          renderReport();
        });
      });

      main.querySelectorAll('[data-del-tpl]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          deleteTemplate(btn.dataset.delTpl);
          UI.toast('Template deleted', 'success');
          buildUI();
        });
      });
    }

    buildUI();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  return { render };
})();

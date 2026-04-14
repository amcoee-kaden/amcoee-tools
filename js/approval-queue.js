/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Approval Queue
   Workflow engine for pay approvals, expenses, time-off, tool write-offs, etc.
   ══════════════════════════════════════════════════════════════════════════════ */

const ApprovalQueue = (() => {
  const COLLECTION = 'approvals';

  const TYPES = {
    pay_approval:      { label: 'Pay Approval',       icon: '💵' },
    expense_report:    { label: 'Expense Report',      icon: '🧾' },
    time_off:          { label: 'Time Off',             icon: '🏖️' },
    tool_writeoff:     { label: 'Tool Write-Off',       icon: '🔧' },
    new_employee:      { label: 'New Employee',         icon: '👤' },
    permission_change: { label: 'Permission Change',    icon: '🔑' },
  };

  const TABS = [
    { key: 'all',              label: 'All',         type: null },
    { key: 'pay_approval',     label: 'Pay',         type: 'pay_approval' },
    { key: 'expense_report',   label: 'Expenses',    type: 'expense_report' },
    { key: 'time_off',         label: 'Time Off',    type: 'time_off' },
    { key: 'tool_writeoff',    label: 'Tools',       type: 'tool_writeoff' },
    { key: 'new_employee',     label: 'Employees',   type: 'new_employee' },
    { key: 'permission_change',label: 'Permissions', type: 'permission_change' },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function genId() {
    return 'appr_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  }

  function safe(str) {
    return DOMPurify.sanitize(String(str || ''));
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso; }
  }

  // ── Data API ─────────────────────────────────────────────────────────────────

  async function create(type, data) {
    if (!TYPES[type]) throw new Error(`Unknown approval type: ${type}`);
    const session = Auth.getSession();
    const record = {
      id: genId(),
      type,
      title:       data.title       || TYPES[type].label,
      description: data.description || '',
      submittedBy: data.submittedBy  || session?.userId  || 'unknown',
      submittedByName: data.submittedByName || session?.name || 'Unknown',
      submittedAt: new Date().toISOString(),
      status: 'pending',
      reviewedBy:   null,
      reviewedAt:   null,
      reviewNote:   null,
      amount:       data.amount   != null ? data.amount : null,
      metadata:     data.metadata || {},
    };
    const saved = await DataStore.create(COLLECTION, record);
    AppEvents.emit('approval:created', saved);
    return saved;
  }

  async function approve(approvalId, note = '') {
    const session = Auth.getSession();
    const patch = {
      status:     'approved',
      reviewedBy: session?.userId || 'unknown',
      reviewedByName: session?.name || 'Unknown',
      reviewedAt: new Date().toISOString(),
      reviewNote: note || null,
    };
    const updated = await DataStore.update(COLLECTION, approvalId, patch);
    if (updated) {
      await AuditLog.log('pay_approve', { collection: COLLECTION, recordId: approvalId,
        changes: patch, metadata: { note } });
      AppEvents.emit('approval:approved', updated);
    }
    return updated;
  }

  async function reject(approvalId, note) {
    if (!note || !note.trim()) throw new Error('A rejection note is required.');
    const session = Auth.getSession();
    const patch = {
      status:     'rejected',
      reviewedBy: session?.userId || 'unknown',
      reviewedByName: session?.name || 'Unknown',
      reviewedAt: new Date().toISOString(),
      reviewNote: note.trim(),
    };
    const updated = await DataStore.update(COLLECTION, approvalId, patch);
    if (updated) {
      await AuditLog.log('pay_reject', { collection: COLLECTION, recordId: approvalId,
        changes: patch, metadata: { note } });
      AppEvents.emit('approval:rejected', updated);
    }
    return updated;
  }

  async function getPending(filters = {}) {
    let records = await DataStore.list(COLLECTION, { status: 'pending' });
    if (filters.type) records = records.filter(r => r.type === filters.type);
    records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return records;
  }

  async function getByType(type) {
    return DataStore.list(COLLECTION, { type });
  }

  async function getHistory(filters = {}) {
    let records = await DataStore.list(COLLECTION);
    records = records.filter(r => r.status !== 'pending');
    if (filters.type) records = records.filter(r => r.type === filters.type);
    if (filters.status) records = records.filter(r => r.status === filters.status);
    records.sort((a, b) => (b.reviewedAt || '').localeCompare(a.reviewedAt || ''));
    if (filters.limit) records = records.slice(0, filters.limit);
    return records;
  }

  async function getCounts() {
    const pending = await getPending();
    const counts = { total: pending.length, byType: {} };
    Object.keys(TYPES).forEach(t => { counts.byType[t] = 0; });
    pending.forEach(r => { if (counts.byType[r.type] != null) counts.byType[r.type]++; });
    return counts;
  }

  // ── Seed Data ─────────────────────────────────────────────────────────────────

  async function seedIfEmpty() {
    const existing = await DataStore.list(COLLECTION);
    if (existing.length > 0) return;

    const now = new Date();
    const seeds = [
      {
        id: 'appr_seed_1',
        type: 'pay_approval',
        title: 'Weekly Pay — Mike Torres',
        description: 'Pay period Apr 7–Apr 13, 2026. 40 hrs regular.',
        submittedBy: 'u3', submittedByName: 'Mike Torres',
        submittedAt: new Date(now - 86400000).toISOString(),
        status: 'pending', reviewedBy: null, reviewedAt: null, reviewNote: null,
        amount: 2400,
        metadata: { period: 'Apr 7 – Apr 13, 2026', hours: 40 },
      },
      {
        id: 'appr_seed_2',
        type: 'expense_report',
        title: 'Office Supplies — Sarah Ochoa',
        description: 'Printer paper, pens, and toner cartridges from Office Depot.',
        submittedBy: 'u4', submittedByName: 'Sarah Ochoa',
        submittedAt: new Date(now - 172800000).toISOString(),
        status: 'pending', reviewedBy: null, reviewedAt: null, reviewNote: null,
        amount: 142.50,
        metadata: { vendor: 'Office Depot', receipt: 'receipt_04112026.pdf' },
      },
      {
        id: 'appr_seed_3',
        type: 'time_off',
        title: 'PTO Request — James Bell',
        description: 'Requesting PTO April 21–23 (3 days).',
        submittedBy: 'u5', submittedByName: 'James Bell',
        submittedAt: new Date(now - 259200000).toISOString(),
        status: 'pending', reviewedBy: null, reviewedAt: null, reviewNote: null,
        amount: null,
        metadata: { startDate: '2026-04-21', endDate: '2026-04-23', days: 3, category: 'PTO' },
      },
      {
        id: 'appr_seed_4',
        type: 'tool_writeoff',
        title: 'Tool Write-Off — Bosch Laser Level',
        description: 'Bosch GLL 3-80 laser level damaged on job site, unrepairable.',
        submittedBy: 'u3', submittedByName: 'Mike Torres',
        submittedAt: new Date(now - 345600000).toISOString(),
        status: 'pending', reviewedBy: null, reviewedAt: null, reviewNote: null,
        amount: 310,
        metadata: { toolId: 'TOOL-4471', condition: 'damaged', serialNumber: 'BOS-7734-GL' },
      },
    ];

    for (const seed of seeds) {
      await DataStore.create(COLLECTION, seed);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  async function renderQueue(container, session) {
    await seedIfEmpty();

    container.innerHTML = '';
    container.className = 'approval-queue-page';

    const counts = await getCounts();
    let activeTab = 'all';

    // Header
    const header = document.createElement('div');
    header.className = 'aq-header';
    header.innerHTML = `<h2 class="aq-title">Approval Queue</h2>
      <span class="aq-subtitle">Review and action pending requests</span>`;
    container.appendChild(header);

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'aq-tab-bar';
    TABS.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'aq-tab' + (tab.key === activeTab ? ' active' : '');
      btn.dataset.tab = tab.key;
      const cnt = tab.type ? (counts.byType[tab.type] || 0) : counts.total;
      btn.innerHTML = `${safe(tab.label)}${cnt > 0 ? ` <span class="aq-badge">${cnt}</span>` : ''}`;
      btn.addEventListener('click', () => switchTab(tab.key));
      tabBar.appendChild(btn);
    });
    container.appendChild(tabBar);

    // Pending cards section
    const pendingSection = document.createElement('div');
    pendingSection.className = 'aq-section';
    container.appendChild(pendingSection);

    // History section
    const historySection = document.createElement('div');
    historySection.className = 'aq-history-section';
    historySection.innerHTML = `<h3 class="aq-section-title">Recent History</h3>`;
    const historyList = document.createElement('div');
    historyList.className = 'aq-history-list';
    historySection.appendChild(historyList);
    container.appendChild(historySection);

    async function refreshCounts() {
      const fresh = await getCounts();
      tabBar.querySelectorAll('.aq-tab').forEach(btn => {
        const key = btn.dataset.tab;
        const tab = TABS.find(t => t.key === key);
        const cnt = tab.type ? (fresh.byType[tab.type] || 0) : fresh.total;
        const badge = btn.querySelector('.aq-badge');
        if (cnt > 0) {
          if (badge) badge.textContent = cnt;
          else btn.insertAdjacentHTML('beforeend', ` <span class="aq-badge">${cnt}</span>`);
        } else {
          if (badge) badge.remove();
        }
      });
    }

    async function renderPending() {
      pendingSection.innerHTML = '';
      const tab = TABS.find(t => t.key === activeTab);
      const items = await getPending(tab.type ? { type: tab.type } : {});

      if (items.length === 0) {
        pendingSection.innerHTML = `<div class="aq-empty">
          <span class="aq-empty-icon">✅</span>
          <p>No pending approvals${tab.type ? ' in this category' : ''}.</p>
        </div>`;
        return;
      }

      items.forEach(item => {
        pendingSection.appendChild(buildCard(item));
      });
    }

    async function renderHistory() {
      historyList.innerHTML = '';
      const items = await getHistory({ limit: 10 });
      if (items.length === 0) {
        historyList.innerHTML = `<p class="aq-no-history">No resolved approvals yet.</p>`;
        return;
      }
      items.forEach(item => {
        historyList.appendChild(buildHistoryRow(item));
      });
    }

    function switchTab(key) {
      activeTab = key;
      tabBar.querySelectorAll('.aq-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === key);
      });
      renderPending();
    }

    function buildCard(item) {
      const typeInfo = TYPES[item.type] || { label: item.type, icon: '📋' };
      const card = document.createElement('div');
      card.className = 'aq-card';
      card.dataset.id = item.id;

      const amountHtml = item.amount != null
        ? `<span class="aq-amount">$${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>`
        : '';

      const metaHtml = buildMetaHtml(item);

      card.innerHTML = `
        <div class="aq-card-header">
          <span class="aq-type-icon">${safe(typeInfo.icon)}</span>
          <div class="aq-card-info">
            <span class="aq-card-title">${safe(item.title)}</span>
            <span class="aq-card-meta">
              ${safe(item.submittedByName)} &middot; ${safe(formatDate(item.submittedAt))}
              ${metaHtml}
            </span>
          </div>
          ${amountHtml}
        </div>
        ${item.description ? `<p class="aq-card-desc">${safe(item.description)}</p>` : ''}
        <div class="aq-card-actions">
          <button class="btn btn-approve aq-btn-approve">Approve</button>
          <button class="btn btn-reject aq-btn-reject">Reject</button>
        </div>
        <div class="aq-reject-form" style="display:none;">
          <textarea class="aq-reject-note" placeholder="Rejection note (required)…" rows="2"></textarea>
          <div class="aq-reject-actions">
            <button class="btn btn-reject-confirm">Confirm Reject</button>
            <button class="btn btn-cancel aq-reject-cancel">Cancel</button>
          </div>
        </div>
      `;

      // Approve
      card.querySelector('.aq-btn-approve').addEventListener('click', () => {
        if (item.type === 'pay_approval') {
          showPinModal(item, card);
        } else {
          doApprove(item, card);
        }
      });

      // Reject — show inline form
      card.querySelector('.aq-btn-reject').addEventListener('click', () => {
        card.querySelector('.aq-reject-form').style.display = 'block';
        card.querySelector('.aq-card-actions').style.display = 'none';
      });

      card.querySelector('.aq-reject-cancel').addEventListener('click', () => {
        card.querySelector('.aq-reject-form').style.display = 'none';
        card.querySelector('.aq-card-actions').style.display = 'flex';
        card.querySelector('.aq-reject-note').value = '';
      });

      card.querySelector('.btn-reject-confirm').addEventListener('click', async () => {
        const note = card.querySelector('.aq-reject-note').value.trim();
        if (!note) {
          UI.toast('A rejection note is required.', 'error');
          return;
        }
        try {
          await reject(item.id, note);
          card.remove();
          await refreshCounts();
          await renderHistory();
          UI.toast('Approval rejected.', 'warning');
        } catch (e) {
          UI.toast(e.message || 'Failed to reject.', 'error');
        }
      });

      return card;
    }

    function buildMetaHtml(item) {
      if (item.type === 'time_off' && item.metadata?.startDate) {
        return ` &middot; ${safe(item.metadata.startDate)} – ${safe(item.metadata.endDate)} (${safe(item.metadata.days)} days)`;
      }
      if (item.type === 'pay_approval' && item.metadata?.period) {
        return ` &middot; ${safe(item.metadata.period)}`;
      }
      return '';
    }

    function buildHistoryRow(item) {
      const typeInfo = TYPES[item.type] || { label: item.type, icon: '📋' };
      const row = document.createElement('div');
      row.className = `aq-history-row aq-history-${item.status}`;
      const amountStr = item.amount != null
        ? ` · $${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '';
      row.innerHTML = `
        <span class="aq-type-icon-sm">${safe(typeInfo.icon)}</span>
        <span class="aq-history-title">${safe(item.title)}</span>
        <span class="aq-history-sub">${safe(item.submittedByName)}${safe(amountStr)}</span>
        <span class="aq-history-status aq-status-${safe(item.status)}">${safe(item.status)}</span>
        <span class="aq-history-date">${safe(formatDate(item.reviewedAt))}</span>
      `;
      return row;
    }

    async function doApprove(item, card) {
      try {
        await approve(item.id);
        card.remove();
        await refreshCounts();
        await renderHistory();
        UI.toast('Approval granted.', 'success');
      } catch (e) {
        UI.toast(e.message || 'Failed to approve.', 'error');
      }
    }

    function showPinModal(item, card) {
      const content = document.createElement('div');
      content.className = 'aq-pin-modal';
      content.innerHTML = `
        <h3>Re-Authentication Required</h3>
        <p>Enter your PIN to approve <strong>${safe(item.title)}</strong>.</p>
        <input type="password" class="aq-pin-input" placeholder="Enter PIN" maxlength="10" inputmode="numeric" />
        <div class="aq-pin-actions">
          <button class="btn btn-approve aq-pin-confirm">Confirm Approve</button>
          <button class="btn btn-cancel aq-pin-dismiss">Cancel</button>
        </div>
        <p class="aq-pin-error" style="display:none; color:var(--danger, #ef4444);">Incorrect PIN. Please try again.</p>
      `;

      const { close } = UI.showModal(content);

      content.querySelector('.aq-pin-dismiss').addEventListener('click', () => close());

      content.querySelector('.aq-pin-confirm').addEventListener('click', async () => {
        const pinInput = content.querySelector('.aq-pin-input').value;
        const errEl = content.querySelector('.aq-pin-error');
        const verified = Auth.reauth(pinInput);
        if (!verified) {
          errEl.style.display = 'block';
          content.querySelector('.aq-pin-input').value = '';
          return;
        }
        close();
        await doApprove(item, card);
      });

      content.querySelector('.aq-pin-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') content.querySelector('.aq-pin-confirm').click();
      });

      setTimeout(() => content.querySelector('.aq-pin-input').focus(), 100);
    }

    // Initial render
    await renderPending();
    await renderHistory();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  return {
    create,
    approve,
    reject,
    getPending,
    getByType,
    getHistory,
    getCounts,
    renderQueue,
    TYPES,
  };
})();

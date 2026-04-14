/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — UI Helpers
   Toast notifications, modals, ripple effects, sidebar, utilities
   ══════════════════════════════════════════════════════════════════════════════ */

const UI = (() => {

  // ── Toast Notifications ────────────────────────────────────────────────────
  function toast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast-exit');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ── Ripple Effect ──────────────────────────────────────────────────────────
  function addRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  function initRipples() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (btn) addRipple(e);
    });
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function showModal(content, { onClose, className = '' } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal(overlay);
        if (onClose) onClose();
      }
    });

    const modal = document.createElement('div');
    modal.className = `modal ${className}`;
    if (typeof content === 'string') {
      modal.innerHTML = content;
    } else {
      modal.appendChild(content);
    }

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    return { overlay, modal, close: () => { closeModal(overlay); if (onClose) onClose(); } };
  }

  function closeModal(overlay) {
    const modal = document.querySelector('.modal');
    if (overlay) overlay.remove();
    if (modal) modal.remove();
    document.body.style.overflow = '';
  }

  // ── Sidebar Toggle (mobile) ────────────────────────────────────────────────
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  }

  // ── Confirm Dialog ─────────────────────────────────────────────────────────
  function confirm(title, message, { confirmLabel = 'Confirm', danger = false } = {}) {
    return new Promise((resolve) => {
      const html = `
        <h3 style="font-size:1.125rem;font-weight:800;margin-bottom:8px">${title}</h3>
        <p style="color:var(--text-secondary);font-size:0.875rem;line-height:1.6;margin-bottom:24px">${message}</p>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-full" data-action="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-full" data-action="confirm">${confirmLabel}</button>
        </div>
      `;
      const { modal, close } = showModal(html);
      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => { close(); resolve(false); });
      modal.querySelector('[data-action="confirm"]').addEventListener('click', () => { close(); resolve(true); });
    });
  }

  // ── Time formatters ────────────────────────────────────────────────────────
  function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return date.toLocaleDateString();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '--';
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y}`;
  }

  // ── Generate unique ID ─────────────────────────────────────────────────────
  function uid() {
    return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  }

  return {
    toast, addRipple, initRipples,
    showModal, closeModal, toggleSidebar, confirm,
    timeAgo, formatDate, uid
  };
})();

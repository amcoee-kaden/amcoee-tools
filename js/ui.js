/* ══════════════════════════════════════════════════════════════════════════════
   Atlas · UI Helpers
   Toast, modal, confirm, reauth — thin layer over the design system.
   ══════════════════════════════════════════════════════════════════════════════ */

const UI = (() => {

  // ─── Toasts ──────────────────────────────────────────────────────────────
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

  // ─── Modal ───────────────────────────────────────────────────────────────
  function showModal(content, { onClose, className = '' } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { closeModal(overlay, modal); if (onClose) onClose(); }
    });

    const modal = document.createElement('div');
    modal.className = `modal ${className}`.trim();
    if (typeof content === 'string') modal.innerHTML = content;
    else modal.appendChild(content);

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    const escHandler = (e) => { if (e.key === 'Escape') { closeModal(overlay, modal); if (onClose) onClose(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    return {
      overlay, modal,
      close: () => { closeModal(overlay, modal); if (onClose) onClose(); document.removeEventListener('keydown', escHandler); }
    };
  }

  function closeModal(overlay, modal) {
    if (overlay) overlay.remove();
    if (modal && modal.parentElement) modal.remove();
    document.body.style.overflow = '';
  }

  // ─── Confirm ─────────────────────────────────────────────────────────────
  function confirm(title, message, { confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
      const safeTitle = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(title) : title;
      const safeMsg = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(message) : message;
      const html = `
        <div class="modal__head">
          <h2 class="modal__title">${safeTitle}</h2>
        </div>
        <div class="modal__body">
          <p style="color:var(--ink-2);line-height:1.55">${safeMsg}</p>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" data-action="cancel">${cancelLabel}</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-action="confirm">${confirmLabel}</button>
        </div>
      `;
      const { modal, close } = showModal(html);
      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => { close(); resolve(false); });
      modal.querySelector('[data-action="confirm"]').addEventListener('click', () => { close(); resolve(true); });
    });
  }

  // ─── Re-auth (confirm identity with PIN) ────────────────────────────────
  function reauth(message = 'Enter your PIN to confirm') {
    return new Promise((resolve) => {
      const safeMsg = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(message) : message;
      const html = `
        <div class="modal__head"><h2 class="modal__title">Confirm <em style="font-style:italic">identity</em></h2></div>
        <div class="modal__body">
          <p style="color:var(--ink-2);font-size:0.9rem">${safeMsg}</p>
          <input type="password" class="input" id="reauth-pin" inputmode="numeric" placeholder="Enter PIN" maxlength="8" autocomplete="off" style="text-align:center;font-size:1.25rem;letter-spacing:0.3em"/>
          <div id="reauth-error" style="color:var(--signal-red);font-size:0.8125rem;text-align:center;display:none"></div>
        </div>
        <div class="modal__foot">
          <button class="btn btn--ghost" data-action="cancel">Cancel</button>
          <button class="btn btn--primary" data-action="confirm">Confirm</button>
        </div>
      `;
      const { modal, close } = showModal(html);
      const input = modal.querySelector('#reauth-pin');
      const errEl = modal.querySelector('#reauth-error');
      setTimeout(() => input.focus(), 50);
      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => { close(); resolve(false); });
      modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
        if (Auth.reauth(input.value)) { close(); resolve(true); }
        else { errEl.textContent = 'Invalid PIN'; errEl.style.display = 'block'; input.value = ''; input.focus(); }
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') modal.querySelector('[data-action="confirm"]').click(); });
    });
  }

  // ─── Time formatters (legacy) ─────────────────────────────────────────────
  function timeAgo(dateStr) { return (typeof Atlas !== 'undefined' ? Atlas.fmt.timeAgo(dateStr) : dateStr); }
  function formatDate(dateStr) { return (typeof Atlas !== 'undefined' ? Atlas.fmt.date(dateStr) : dateStr); }

  function uid() { return 'id_' + Date.now() + '_' + Math.floor(Math.random() * 9999); }

  return { toast, showModal, closeModal, confirm, reauth, timeAgo, formatDate, uid };
})();

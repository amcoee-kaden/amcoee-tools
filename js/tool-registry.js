/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Tool Registry
   Plugin system: tools register themselves and get sidebar entries, routes,
   dashboard widgets, and analytics automatically.
   ══════════════════════════════════════════════════════════════════════════════ */

const ToolRegistry = (() => {

  /** @type {Map<string, Object>} id → normalized tool config */
  const _tools = new Map();

  /* ─── Validation ─────────────────────────────────────────────────────────── */

  function _validate(config) {
    if (!config || typeof config !== 'object') {
      throw new Error('[ToolRegistry] register() requires a config object.');
    }
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('[ToolRegistry] Tool config must include a string "id".');
    }
    if (!config.name || typeof config.name !== 'string') {
      throw new Error(`[ToolRegistry] Tool "${config.id}" must include a string "name".`);
    }
    if (_tools.has(config.id)) {
      console.warn(`[ToolRegistry] Tool "${config.id}" is already registered — skipping duplicate.`);
      return false;
    }
    return true;
  }

  /* ─── Normalize ──────────────────────────────────────────────────────────── */

  function _normalize(config) {
    return {
      id:               config.id,
      name:             config.name,
      icon:             config.icon             || null,
      emoji:            config.emoji            || null,
      permissions:      Array.isArray(config.permissions)
                          ? config.permissions
                          : (config.permissions ? [config.permissions] : []),
      routes:           (config.routes && typeof config.routes === 'object')
                          ? config.routes
                          : {},
      dashboardWidgets: Array.isArray(config.dashboardWidgets)
                          ? config.dashboardWidgets
                          : [],
      section:          config.section          || 'Tools',
      init:             typeof config.init === 'function' ? config.init : null,
      _registeredAt:    new Date().toISOString(),
    };
  }

  /* ─── Route registration helper ──────────────────────────────────────────── */

  function _registerRoutes(tool) {
    const routeMap = tool.routes;
    if (!routeMap || typeof Router === 'undefined') return;
    Object.entries(routeMap).forEach(([path, handler]) => {
      if (typeof handler === 'function') {
        Router.register(path, handler);
      } else {
        console.warn(`[ToolRegistry] Route handler for "${path}" in tool "${tool.id}" is not a function — skipped.`);
      }
    });
  }

  /* ─── Analytics helper ───────────────────────────────────────────────────── */

  function _trackRegistration(tool) {
    try {
      if (typeof AppEvents !== 'undefined') {
        AppEvents.emit('tool:registered', {
          id:      tool.id,
          name:    tool.name,
          section: tool.section,
          routes:  Object.keys(tool.routes),
          widgets: tool.dashboardWidgets.map(w => w.id),
          ts:      tool._registeredAt,
        });
      }
    } catch (e) {
      console.warn('[ToolRegistry] Failed to emit tool:registered event:', e);
    }
  }

  /* ─── Public API ─────────────────────────────────────────────────────────── */

  /**
   * Register a tool with the registry.
   *
   * @param {Object}   config
   * @param {string}   config.id               - Unique tool identifier (e.g. 'timeclock')
   * @param {string}   config.name             - Display name
   * @param {string}   [config.icon]           - Icon class or URL
   * @param {string}   [config.emoji]          - Emoji for compact displays
   * @param {string|string[]} [config.permissions] - Permission key(s) required to view
   * @param {Object}   [config.routes]         - { 'route-path': handlerFn, ... }
   * @param {Array}    [config.dashboardWidgets] - [{ id, size, render }, ...]
   * @param {string}   [config.section]        - Sidebar section label (default 'Tools')
   * @param {Function} [config.init]           - Called once after registration
   */
  function register(config) {
    if (!_validate(config)) return;

    const tool = _normalize(config);
    _tools.set(tool.id, tool);

    _registerRoutes(tool);
    _trackRegistration(tool);

    if (typeof tool.init === 'function') {
      try {
        tool.init();
      } catch (e) {
        console.error(`[ToolRegistry] init() for tool "${tool.id}" threw an error:`, e);
      }
    }

    return tool;
  }

  /**
   * Returns all registered tools as an array.
   * @returns {Object[]}
   */
  function getAll() {
    return Array.from(_tools.values());
  }

  /**
   * Returns all tools visible to the given role, filtered by permissions.
   * A tool with no permissions listed is visible to everyone.
   * @param {string} role
   * @returns {Object[]}
   */
  function getVisible(role) {
    if (typeof PermissionGuard === 'undefined') {
      console.warn('[ToolRegistry] PermissionGuard not available — returning all tools.');
      return getAll();
    }
    return getAll().filter(tool => {
      if (!tool.permissions.length) return true;
      return tool.permissions.some(perm => PermissionGuard.hasPermission(role, perm));
    });
  }

  /**
   * Returns a single tool by id, or null if not found.
   * @param {string} id
   * @returns {Object|null}
   */
  function getById(id) {
    return _tools.get(id) || null;
  }

  /**
   * Returns sidebar nav items for the given role, grouped by section.
   * Each entry in the returned array is { section, items: [{ id, icon, emoji, label, perm }] }.
   * @param {string} role
   * @returns {Array<{ section: string, items: Array }>}
   */
  function getNavItems(role) {
    const visible = getVisible(role);
    const sectionMap = new Map();

    for (const tool of visible) {
      if (!sectionMap.has(tool.section)) {
        sectionMap.set(tool.section, []);
      }
      sectionMap.get(tool.section).push({
        id:    tool.id,
        icon:  tool.icon,
        emoji: tool.emoji,
        label: tool.name,
        perm:  tool.permissions[0] || null,
      });
    }

    return Array.from(sectionMap.entries()).map(([section, items]) => ({
      section,
      items,
    }));
  }

  /**
   * Returns all dashboard widgets from tools visible to the given role.
   * Each widget carries its owning tool's id for context.
   * @param {string} role
   * @returns {Array<{ toolId: string, id: string, size: string, render: Function }>}
   */
  function getDashboardWidgets(role) {
    const visible = getVisible(role);
    const widgets = [];

    for (const tool of visible) {
      for (const widget of tool.dashboardWidgets) {
        if (!widget.id || typeof widget.render !== 'function') {
          console.warn(`[ToolRegistry] Widget in tool "${tool.id}" is missing "id" or "render" — skipped.`);
          continue;
        }
        widgets.push({
          toolId: tool.id,
          id:     widget.id,
          size:   widget.size || 'medium',
          render: widget.render,
        });
      }
    }

    return widgets;
  }

  /* ─── Dev/debug helpers ──────────────────────────────────────────────────── */

  /**
   * Returns a summary of all registered tools — useful for debugging.
   */
  function summary() {
    return getAll().map(t => ({
      id:      t.id,
      name:    t.name,
      section: t.section,
      routes:  Object.keys(t.routes),
      widgets: t.dashboardWidgets.map(w => w.id),
      perms:   t.permissions,
    }));
  }

  return {
    register,
    getAll,
    getVisible,
    getById,
    getNavItems,
    getDashboardWidgets,
    summary,
  };
})();

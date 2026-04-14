/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Event Bus
   Pub/sub system for cross-module communication
   ══════════════════════════════════════════════════════════════════════════════ */

const AppEvents = (() => {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
    return () => {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    };
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    if (callback) {
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    } else {
      delete listeners[event];
    }
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(cb => {
      try { cb(data); } catch (e) { console.error(`[AppEvents] Error in listener for "${event}":`, e); }
    });
  }

  function once(event, callback) {
    const unsub = on(event, (data) => {
      unsub();
      callback(data);
    });
    return unsub;
  }

  return { on, off, emit, once };
})();

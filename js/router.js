/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Simple Hash Router
   SPA routing for GitHub Pages (no server config needed)
   ══════════════════════════════════════════════════════════════════════════════ */

const Router = (() => {
  const routes = {};
  let currentRoute = null;
  let onNavigateCallback = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function getCurrentRoute() {
    return window.location.hash.slice(1) || 'dashboard';
  }

  function onNavigate(cb) {
    onNavigateCallback = cb;
  }

  function handleRoute() {
    const route = getCurrentRoute();
    if (route === currentRoute) return;
    currentRoute = route;

    // Animate page transition
    const main = document.getElementById('main-body');
    if (main) {
      main.style.opacity = '0';
      main.style.transform = 'translateY(8px)';
      setTimeout(() => {
        if (routes[route]) {
          routes[route]();
        } else if (routes['404']) {
          routes['404']();
        }
        if (onNavigateCallback) onNavigateCallback(route);
        requestAnimationFrame(() => {
          main.style.transition = 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)';
          main.style.opacity = '1';
          main.style.transform = 'translateY(0)';
        });
      }, 150);
    } else {
      if (routes[route]) routes[route]();
      if (onNavigateCallback) onNavigateCallback(route);
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  return { register, navigate, getCurrentRoute, onNavigate, init, handleRoute };
})();

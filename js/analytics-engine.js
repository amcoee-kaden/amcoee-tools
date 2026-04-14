const Analytics = (() => {
  const COLLECTION = 'analytics_events';
  let currentPageStart = null;
  let currentPage = null;
  let clickBuffer = [];

  async function track(action, { target, targetId, page, metadata } = {}) {
    const session = Auth.getSession();
    if (!session) return;
    const event = {
      id: 'evt_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
      userId: session.userId, role: session.role, action,
      target: target || null, targetId: targetId || null,
      page: page || currentPage || Router.getCurrentRoute(),
      metadata: metadata || null,
      timestamp: new Date().toISOString(),
      sessionId: session.sessionToken, deviceInfo: session.deviceInfo,
    };
    await DataStore.create(COLLECTION, event);
    return event;
  }

  function trackPageView(page) {
    if (currentPage && currentPageStart) {
      const dwellMs = Date.now() - currentPageStart;
      track('page_dwell', { target: currentPage, metadata: { durationMs: dwellMs, durationSec: Math.round(dwellMs / 1000) } });
    }
    currentPage = page;
    currentPageStart = Date.now();
    track('page_view', { target: page, page });
  }

  function detectRageClick(e) {
    const now = Date.now();
    clickBuffer.push({ time: now, target: e.target.tagName + '.' + (e.target.className || '').split(' ')[0] });
    clickBuffer = clickBuffer.filter(c => now - c.time < 2000);
    if (clickBuffer.length >= 5) {
      track('rage_click', { target: clickBuffer[clickBuffer.length - 1].target, page: currentPage, metadata: { clickCount: clickBuffer.length, windowMs: 2000 } });
      clickBuffer = [];
    }
  }

  function detectBackNavigation() {
    let lastRoute = null; let backCount = 0;
    AppEvents.on('navigate', (route) => {
      if (route === lastRoute) { backCount++; if (backCount >= 3) { track('navigation_confusion', { target: route, metadata: { bounceCount: backCount } }); backCount = 0; } }
      else { backCount = 0; }
      lastRoute = route;
    });
  }

  async function getAggregates(options = {}) {
    const { startDate, endDate } = options;
    let events = await DataStore.list(COLLECTION);
    if (startDate) events = events.filter(e => e.timestamp >= startDate);
    if (endDate) events = events.filter(e => e.timestamp <= endDate);
    const result = { totalEvents: events.length, uniqueUsers: [...new Set(events.map(e => e.userId))].length, byAction: {}, byPage: {}, byUser: {}, byRole: {}, byHour: Array(24).fill(0), byDay: {} };
    events.forEach(e => {
      result.byAction[e.action] = (result.byAction[e.action] || 0) + 1;
      if (e.page) result.byPage[e.page] = (result.byPage[e.page] || 0) + 1;
      result.byUser[e.userId] = (result.byUser[e.userId] || 0) + 1;
      result.byRole[e.role] = (result.byRole[e.role] || 0) + 1;
      const hour = new Date(e.timestamp).getHours(); result.byHour[hour]++;
      const day = e.timestamp.split('T')[0]; result.byDay[day] = (result.byDay[day] || 0) + 1;
    });
    return result;
  }

  async function getSessionStats(options = {}) {
    const { startDate, endDate } = options;
    let events = await DataStore.list(COLLECTION);
    if (startDate) events = events.filter(e => e.timestamp >= startDate);
    if (endDate) events = events.filter(e => e.timestamp <= endDate);
    const sessions = {};
    events.forEach(e => {
      if (!e.sessionId) return;
      if (!sessions[e.sessionId]) sessions[e.sessionId] = { userId: e.userId, role: e.role, events: [], start: e.timestamp, end: e.timestamp };
      sessions[e.sessionId].events.push(e);
      if (e.timestamp < sessions[e.sessionId].start) sessions[e.sessionId].start = e.timestamp;
      if (e.timestamp > sessions[e.sessionId].end) sessions[e.sessionId].end = e.timestamp;
    });
    const sessionList = Object.values(sessions).map(s => ({ ...s, durationMs: new Date(s.end) - new Date(s.start), pageViews: s.events.filter(e => e.action === 'page_view').length, actions: s.events.length }));
    return { totalSessions: sessionList.length, avgDurationMs: sessionList.length ? sessionList.reduce((a, s) => a + s.durationMs, 0) / sessionList.length : 0, avgPageViews: sessionList.length ? sessionList.reduce((a, s) => a + s.pageViews, 0) / sessionList.length : 0, byRole: sessionList.reduce((acc, s) => { acc[s.role] = (acc[s.role] || 0) + 1; return acc; }, {}), sessions: sessionList };
  }

  async function getAdoptionData() {
    const events = await DataStore.list(COLLECTION);
    const pageViews = events.filter(e => e.action === 'page_view');
    const users = Auth.getUsers();
    const pages = [...new Set(pageViews.map(e => e.page))];
    return pages.map(page => {
      const adoptedUsers = [...new Set(pageViews.filter(e => e.page === page).map(e => e.userId))].length;
      return { page, totalUsers: users.length, adoptedUsers, adoptionRate: users.length ? (adoptedUsers / users.length * 100).toFixed(1) : 0 };
    });
  }

  async function getBottlenecks() {
    const events = await DataStore.list(COLLECTION);
    const dwells = events.filter(e => e.action === 'page_dwell');
    const actions = events.filter(e => !['page_view', 'page_dwell', 'rage_click', 'navigation_confusion'].includes(e.action));
    const pageStats = {};
    dwells.forEach(e => { if (!pageStats[e.target]) pageStats[e.target] = { totalDwell: 0, visits: 0, actions: 0 }; pageStats[e.target].totalDwell += (e.metadata?.durationMs || 0); pageStats[e.target].visits++; });
    actions.forEach(e => { if (e.page && pageStats[e.page]) pageStats[e.page].actions++; });
    return Object.entries(pageStats).map(([page, stats]) => ({ page, avgDwellMs: stats.visits ? Math.round(stats.totalDwell / stats.visits) : 0, visits: stats.visits, actions: stats.actions, actionsPerVisit: stats.visits ? (stats.actions / stats.visits).toFixed(2) : 0, score: stats.visits ? Math.round((stats.totalDwell / stats.visits) / Math.max(stats.actions / stats.visits, 0.1)) : 0 })).sort((a, b) => b.score - a.score);
  }

  function init() {
    Router.onNavigate((route) => { trackPageView(route); AppEvents.emit('navigate', route); });
    document.addEventListener('click', detectRageClick, { passive: true });
    detectBackNavigation();
    window.addEventListener('error', (e) => { track('error', { target: e.filename, metadata: { message: e.message, line: e.lineno, col: e.colno } }); });
  }

  return { track, trackPageView, getAggregates, getSessionStats, getAdoptionData, getBottlenecks, init };
})();

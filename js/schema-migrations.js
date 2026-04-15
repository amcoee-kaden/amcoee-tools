/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — SchemaMigrations
   Versioned localStorage migrations; upgrades data schema between releases
   ══════════════════════════════════════════════════════════════════════════════ */

const SchemaMigrations = (() => {
  const VERSION_KEY     = 'amcoee_schema_version';
  const CURRENT_VERSION = 2;
  const USERS_KEY       = 'amcoee_users';

  /* ── helpers ─────────────────────────────────────────────────────────────── */

  function readUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /* ── public: getCurrentVersion ───────────────────────────────────────────── */

  function getCurrentVersion() {
    const raw = localStorage.getItem(VERSION_KEY);
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  /* ── migration definitions ───────────────────────────────────────────────── */

  /**
   * Migration 1 → 2
   * Upgrades the old 3-role system (admin / …) to the 5-tier role system
   * (owner / head_admin / admin / office / field).
   *
   * Rules:
   *   - u2 with role 'admin'  →  'owner'
   *   - u1 with role 'admin'  →  'head_admin'
   *   - Any user missing status  →  status: 'active'
   */
  async function migrate_1_to_2() {
    const users = readUsers();

    const upgraded = users.map(user => {
      const u = { ...user };

      // Role promotion
      if (u.id === 'u2' && u.role === 'admin') {
        u.role = 'owner';
        console.info('[SchemaMigrations] u2 promoted: admin → owner');
      } else if (u.id === 'u1' && u.role === 'admin') {
        u.role = 'head_admin';
        console.info('[SchemaMigrations] u1 promoted: admin → head_admin');
      }

      // Backfill missing status
      if (!Object.prototype.hasOwnProperty.call(u, 'status')) {
        u.status = 'active';
      }

      return u;
    });

    writeUsers(upgraded);
  }

  /* ── migration registry (ordered) ───────────────────────────────────────── */

  const MIGRATIONS = [
    { from: 1, to: 2, run: migrate_1_to_2 },
  ];

  /* ── public: run ─────────────────────────────────────────────────────────── */

  /**
   * Runs all pending migrations sequentially.
   * After each migration succeeds the stored version is bumped so a crash
   * mid-run does not re-apply completed steps.
   *
   * @returns {Promise<{ version: number, migrated: boolean }>}
   */
  async function run() {
    let version  = getCurrentVersion();
    let migrated = false;

    const pending = MIGRATIONS.filter(m => m.from >= version && m.to <= CURRENT_VERSION)
      .sort((a, b) => a.from - b.from);

    for (const migration of pending) {
      try {
        console.info(`[SchemaMigrations] Running migration ${migration.from} → ${migration.to} …`);
        await migration.run();
        version = migration.to;
        localStorage.setItem(VERSION_KEY, String(version));
        migrated = true;
        console.info(`[SchemaMigrations] Migration ${migration.from} → ${migration.to} complete.`);
      } catch (err) {
        console.error(`[SchemaMigrations] Migration ${migration.from} → ${migration.to} FAILED:`, err);
        break;
      }
    }

    return { version, migrated };
  }

  /* ── public API ──────────────────────────────────────────────────────────── */

  return { VERSION_KEY, CURRENT_VERSION, getCurrentVersion, run };
})();

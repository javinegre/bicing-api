import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import defaultUserConfig from './config.defaults';
import { UserConfigV2 } from './types';

/**
 * Same placement and env-override pattern as negre.co-server's auth/auth.ts:
 * the file sits next to data/auth.db in the router's own data directory, which
 * is the only writable state on the droplet that survives a redeploy.
 *
 * `__dirname` is apis/bicing-api/src/v2/config, so four levels up is the
 * negre.co-server checkout that mounts this API.
 */
const resolveDbPath = (): string =>
  process.env.BICING_DB_PATH || path.join(__dirname, '..', '..', '..', '..', 'data', 'bicing.db');

let db: Database.Database | null = null;
let openPath: string | null = null;

/**
 * Opened lazily so importing this module — as the route file does at startup —
 * never creates a database on a machine that only serves the station feeds.
 */
const getDb = (): Database.Database => {
  if (db) return db;

  openPath = resolveDbPath();
  fs.mkdirSync(path.dirname(openPath), { recursive: true });
  db = new Database(openPath);

  // WAL keeps a reader from blocking the writer; this process is single-fork
  // but PM2 restarts overlap briefly on reload.
  db.pragma('journal_mode = WAL');

  /**
   * One JSON document per user rather than a column per preference. The shape
   * changes whenever the app grows a setting, and a document avoids a schema
   * migration each time; the trade-off is that SQL cannot query inside it,
   * which nothing here needs to do — every read is "give me this user's row".
   */
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_config (
      user_id     TEXT PRIMARY KEY,
      config      TEXT NOT NULL,
      updated_at  INTEGER NOT NULL
    )
  `);

  return db;
};

export interface StoredConfig {
  config: UserConfigV2;
  updatedAt: number;
}

const readRow = (userId: string): StoredConfig | null => {
  const row = getDb()
    .prepare('SELECT config, updated_at AS updatedAt FROM user_config WHERE user_id = ?')
    .get(userId) as { config: string; updatedAt: number } | undefined;

  if (!row) return null;

  try {
    return {
      config: { ...defaultUserConfig(), ...(JSON.parse(row.config) as Partial<UserConfigV2>) },
      updatedAt: row.updatedAt,
    };
  } catch {
    // A corrupt document would otherwise 500 the user out of their own
    // settings forever; hand back defaults and let the next write repair it.
    console.log(`[${new Date().toUTCString()}] 🚲 Bicing config - unreadable row for ${userId}`);
    return null;
  }
};

export const getUserConfig = (userId: string): StoredConfig => {
  return readRow(userId) ?? { config: defaultUserConfig(), updatedAt: 0 };
};

/**
 * Upsert with a top-level merge: a client that only moved the map sends only
 * mapCenter/mapZoom and keeps everything else it never loaded.
 */
export const upsertUserConfig = (userId: string, patch: Partial<UserConfigV2>): StoredConfig => {
  const current = getUserConfig(userId).config;
  const next: UserConfigV2 = { ...current, ...patch };
  const updatedAt = Date.now();

  getDb()
    .prepare(
      `INSERT INTO user_config (user_id, config, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at`
    )
    .run(userId, JSON.stringify(next), updatedAt);

  return { config: next, updatedAt };
};

/** Test seam: lets a suite point at a temp file and start clean. */
export const closeDb = (): void => {
  db?.close();
  db = null;
  openPath = null;
};

export const getDbPath = (): string => openPath ?? resolveDbPath();

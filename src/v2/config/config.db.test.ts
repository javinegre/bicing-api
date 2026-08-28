import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Must be set before config.db opens the file — it resolves the path lazily on
// first use, so the assignment only has to beat the first query.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bicing-config-'));
process.env.BICING_DB_PATH = path.join(tmpDir, 'bicing.db');

import { closeDb, getDbPath, getUserConfig, upsertUserConfig } from './config.db';

describe('user config store', () => {
  beforeAll(() => {
    // Touch the db so getDbPath reports the resolved path, not the fallback.
    getUserConfig('warmup');
  });

  afterAll(() => {
    closeDb();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('honours BICING_DB_PATH', () => {
    expect(getDbPath()).toBe(process.env.BICING_DB_PATH);
  });

  it('returns defaults for a user who has never saved anything', () => {
    const { config, updatedAt } = getUserConfig('brand-new');
    expect(config.resourceShown).toBe('bikes');
    expect(config.bookmarks).toEqual({ home: null, work: null, favorite: null });
    expect(config.savedStationIds).toEqual([]);
    expect(updatedAt).toBe(0);
  });

  it('upserts and reads back', () => {
    upsertUserConfig('u1', { mapZoom: 17, resourceShown: 'docks' });
    const { config, updatedAt } = getUserConfig('u1');
    expect(config.mapZoom).toBe(17);
    expect(config.resourceShown).toBe('docks');
    expect(updatedAt).toBeGreaterThan(0);
  });

  it('merges a partial patch instead of replacing the document', () => {
    upsertUserConfig('u2', { mapZoom: 15, savedStationIds: [7] });
    upsertUserConfig('u2', { mapZoom: 18 });

    const { config } = getUserConfig('u2');
    expect(config.mapZoom).toBe(18);
    expect(config.savedStationIds).toEqual([7]);
  });

  it('keeps users apart', () => {
    upsertUserConfig('alice', { mapZoom: 13 });
    upsertUserConfig('bob', { mapZoom: 18 });
    expect(getUserConfig('alice').config.mapZoom).toBe(13);
    expect(getUserConfig('bob').config.mapZoom).toBe(18);
  });

  it('fills in keys added since a row was written', () => {
    upsertUserConfig('legacy', { mapZoom: 14 });
    expect(getUserConfig('legacy').config.bookmarks).toEqual({
      home: null,
      work: null,
      favorite: null,
    });
  });
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Must be set before config.db opens the file — it resolves the path lazily on
// first use, so the assignment only has to beat the first query.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bicing-config-'));
process.env.BICING_DB_PATH = path.join(tmpDir, 'bicing.db');

import {
  addUserTrip,
  closeDb,
  deleteUserTrip,
  getDbPath,
  getUserConfig,
  listUserTrips,
  updateUserTrip,
  upsertUserConfig,
} from './config.db';
import { ConfigValidationError } from './config.validation';

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
    expect(config.trips).toEqual([]);
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

  it('merges a trips patch instead of replacing the document', () => {
    const trip = {
      id: 'trip-1',
      origin: { lat: 41.38, lng: 2.17 },
      destination: { lat: 41.4, lng: 2.15 },
      label: 'Commute',
    };
    upsertUserConfig('u3', { mapZoom: 15, trips: [trip] });
    upsertUserConfig('u3', { mapZoom: 18 });

    const { config } = getUserConfig('u3');
    expect(config.mapZoom).toBe(18);
    expect(config.trips).toEqual([trip]);
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

describe('trip CRUD', () => {
  const input = {
    origin: { lat: 41.38, lng: 2.17 },
    destination: { lat: 41.4, lng: 2.15 },
    label: 'Commute',
  };

  it('adds a trip with a generated id and lists it back', () => {
    const { trip, updatedAt } = addUserTrip('trip-rider', input);
    expect(trip.id).toEqual(expect.any(String));
    expect(trip).toMatchObject(input);
    expect(updatedAt).toBeGreaterThan(0);
    expect(listUserTrips('trip-rider')).toEqual([trip]);
  });

  it('appends rather than replacing existing trips', () => {
    const { trip: first } = addUserTrip('trip-rider-2', input);
    const { trip: second } = addUserTrip('trip-rider-2', { ...input, label: 'Errand' });
    expect(listUserTrips('trip-rider-2')).toEqual([first, second]);
  });

  it('rejects adding past the trip cap', () => {
    for (let i = 0; i < 100; i++) addUserTrip('trip-rider-full', input);
    expect(() => addUserTrip('trip-rider-full', input)).toThrow(ConfigValidationError);
  });

  it('updates a trip in place, keeping its id', () => {
    const { trip } = addUserTrip('trip-rider-3', input);
    const updated = updateUserTrip('trip-rider-3', trip.id, { ...input, label: 'Renamed' });
    expect(updated?.trip).toEqual({ ...trip, label: 'Renamed' });
    expect(listUserTrips('trip-rider-3')).toEqual([{ ...trip, label: 'Renamed' }]);
  });

  it('returns null when updating a trip that does not exist', () => {
    expect(updateUserTrip('trip-rider-3', 'missing', input)).toBeNull();
  });

  it('deletes a trip', () => {
    const { trip } = addUserTrip('trip-rider-4', input);
    const deleted = deleteUserTrip('trip-rider-4', trip.id);
    expect(deleted?.updatedAt).toBeGreaterThan(0);
    expect(listUserTrips('trip-rider-4')).toEqual([]);
  });

  it('returns null when deleting a trip that does not exist', () => {
    expect(deleteUserTrip('trip-rider-4', 'missing')).toBeNull();
  });
});

import { BookmarksV2, CoordinatesV2, UserConfigV2 } from './types';

/** Guards the JSON column: anything stored here is read back and trusted. */
export class ConfigValidationError extends Error {}

const CONFIG_KEYS = [
  'mapCenter',
  'mapZoom',
  'resourceShown',
  'bikeTypeFilter',
  'bookmarks',
  'savedStationIds',
] as const;

const BOOKMARK_KEYS: (keyof BookmarksV2)[] = ['home', 'work', 'favorite'];

/** A user with more than this many stars is a bug or an abuse, not a rider. */
const MAX_SAVED_STATIONS = 500;

const fail = (message: string): never => {
  throw new ConfigValidationError(message);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseCoordinates = (value: unknown, key: string): CoordinatesV2 | null => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return fail(`${key} must be an object with lat and lng`);

  const { lat, lng } = value;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    return fail(`${key}.lat must be a number between -90 and 90`);
  }
  if (typeof lng !== 'number' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return fail(`${key}.lng must be a number between -180 and 180`);
  }
  return { lat, lng };
};

const parseZoom = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 22) {
    return fail('mapZoom must be an integer between 1 and 22');
  }
  return value;
};

const parseBookmarks = (value: unknown): BookmarksV2 => {
  if (!isRecord(value)) return fail('bookmarks must be an object');

  const unknownKey = Object.keys(value).find(
    (key) => !BOOKMARK_KEYS.includes(key as keyof BookmarksV2)
  );
  if (unknownKey) return fail(`Unknown bookmark "${unknownKey}"`);

  return {
    home: parseCoordinates(value.home, 'bookmarks.home'),
    work: parseCoordinates(value.work, 'bookmarks.work'),
    favorite: parseCoordinates(value.favorite, 'bookmarks.favorite'),
  };
};

const parseSavedStationIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) return fail('savedStationIds must be an array');
  if (value.length > MAX_SAVED_STATIONS) {
    return fail(`savedStationIds may hold at most ${MAX_SAVED_STATIONS} entries`);
  }

  const ids = value.map((id) => {
    if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
      return fail('savedStationIds must contain non-negative integers');
    }
    return id;
  });

  // Order is the user's; duplicates are not.
  return [...new Set(ids)];
};

/**
 * Validates an incoming patch. Unknown top-level keys are rejected rather than
 * dropped: silently discarding them would let a newer client believe a setting
 * had been saved when an older server never understood it.
 */
export const parseConfigPatch = (body: unknown): Partial<UserConfigV2> => {
  if (!isRecord(body)) return fail('Request body must be a JSON object');

  const unknownKey = Object.keys(body).find(
    (key) => !CONFIG_KEYS.includes(key as typeof CONFIG_KEYS[number])
  );
  if (unknownKey) return fail(`Unknown config key "${unknownKey}"`);

  const patch: Partial<UserConfigV2> = {};

  if ('mapCenter' in body) patch.mapCenter = parseCoordinates(body.mapCenter, 'mapCenter');
  if ('mapZoom' in body) patch.mapZoom = parseZoom(body.mapZoom);

  if ('resourceShown' in body) {
    if (body.resourceShown !== 'bikes' && body.resourceShown !== 'docks') {
      fail('resourceShown must be "bikes" or "docks"');
    }
    patch.resourceShown = body.resourceShown as UserConfigV2['resourceShown'];
  }

  if ('bikeTypeFilter' in body) {
    const filter = body.bikeTypeFilter;
    if (filter !== null && filter !== 'mechanical' && filter !== 'electrical') {
      fail('bikeTypeFilter must be "mechanical", "electrical" or null');
    }
    patch.bikeTypeFilter = filter as UserConfigV2['bikeTypeFilter'];
  }

  if ('bookmarks' in body) patch.bookmarks = parseBookmarks(body.bookmarks);
  if ('savedStationIds' in body) patch.savedStationIds = parseSavedStationIds(body.savedStationIds);

  if (Object.keys(patch).length === 0) fail('Request body contained no config keys');

  return patch;
};

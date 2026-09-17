import { UserConfigV2 } from './types';

/**
 * Returned verbatim for a user who has never saved anything, so the client
 * never has to distinguish "no row yet" from "row with empty values".
 */
const defaultUserConfig = (): UserConfigV2 => ({
  mapCenter: null,
  mapZoom: null,
  resourceShown: 'bikes',
  bikeTypeFilter: null,
  bookmarks: { home: null, work: null, favorite: null },
  savedStationIds: [],
  trips: [],
});

export default defaultUserConfig;

/* -------------------------------------------------------------------------- */
/*                              User config types                             */
/* -------------------------------------------------------------------------- */

export interface CoordinatesV2 {
  lat: number;
  lng: number;
}

export type ResourceTypeV2 = 'bikes' | 'docks';

export type BikeTypeFilterV2 = 'mechanical' | 'electrical' | null;

export interface BookmarksV2 {
  home: CoordinatesV2 | null;
  work: CoordinatesV2 | null;
  favorite: CoordinatesV2 | null;
}

/**
 * The per-user slice of app settings. Anything device-specific — notably the
 * live geolocation fix the 2023 app kept in localStorage with a 2 h TTL — is
 * deliberately absent: syncing it would move one device's position onto
 * another.
 */
export interface UserConfigV2 {
  mapCenter: CoordinatesV2 | null;
  mapZoom: number | null;
  resourceShown: ResourceTypeV2;
  bikeTypeFilter: BikeTypeFilterV2;
  bookmarks: BookmarksV2;
  savedStationIds: number[];
}

export interface UserConfigResponseV2 {
  success: true;
  config: UserConfigV2;
  updatedAt: number;
}

export interface UserConfigErrorV2 {
  success: false;
  errorMessage: string;
}

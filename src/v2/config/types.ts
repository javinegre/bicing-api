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

export interface TripV2 {
  id: string;
  origin: CoordinatesV2;
  destination: CoordinatesV2;
  label: string;
}

/** What a client sends to create or replace a trip; the server owns the id. */
export type TripInputV2 = Omit<TripV2, 'id'>;

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
  trips: TripV2[];
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

export interface TripListResponseV2 {
  success: true;
  trips: TripV2[];
}

export interface TripResponseV2 {
  success: true;
  trip: TripV2;
  updatedAt: number;
}

export interface TripDeletedResponseV2 {
  success: true;
  updatedAt: number;
}

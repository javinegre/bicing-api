export interface OfficialApiStationInfoListItem {
  station_id: number;
  name: string;
  lat: number;
  lon: number;
  // Not in use below
  physical_configuration: string; // 'ELECTRICBIKESTATION'
  altitude: number;
  address: string;
  post_code: number;
  capacity: number;
  nearby_distance: number;
}

export interface OfficialApiStationStatusListItem {
  station_id: number;
  num_docks_available: number;
  num_bikes_available_types: {
    mechanical: number;
    ebike: number;
  };
  status: string; // 'IN_SERVICE';
  // Not in use below
  num_bikes_available: number;
  last_reported: number;
  is_charging_station: boolean;
  is_installed: number;
  is_renting: number;
  is_returning: number;
}

export interface OfficialApiResult<T> {
  last_updated: number;
  data: {
    stations: T[];
  };
}

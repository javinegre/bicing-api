import { DataTransformTypeV1_3, StationInfoListItemV1_3, StationStatusListItemV1_3 } from '../types';
import { OfficialApiStationInfoListItem, OfficialApiStationStatusListItem } from '../../dtos';

const stationInfoTransform: DataTransformTypeV1_3<
  OfficialApiStationInfoListItem,
  StationInfoListItemV1_3
> = (station) => ({
  id: station.station_id,
  name: station.name,
  lat: station.lat,
  lng: station.lon,
});

const stationStatusTransform: DataTransformTypeV1_3<
  OfficialApiStationStatusListItem,
  StationStatusListItemV1_3
> = (station) => ({
  i: station.station_id,
  e: station.num_bikes_available_types.ebike,
  m: station.num_bikes_available_types.mechanical,
  d: station.num_docks_available,
  s: +(station.status === 'IN_SERVICE'),
});

export default {
  info: stationInfoTransform,
  status: stationStatusTransform,
};

import { DataTransformTypeV2, StationInfoListItemV2, StationStatusListItemV2 } from '../types';
import { OfficialApiStationInfoListItem, OfficialApiStationStatusListItem } from '../../dtos';

const stationInfoTransform: DataTransformTypeV2<
  OfficialApiStationInfoListItem,
  StationInfoListItemV2
> = (station) => ({
  id: station.station_id,
  name: station.name,
  lat: station.lat,
  lng: station.lon,
});

const stationStatusTransform: DataTransformTypeV2<
  OfficialApiStationStatusListItem,
  StationStatusListItemV2
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

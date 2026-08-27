import { describe, expect, it } from 'vitest';
import dataTransformers from './data-transformers';
import {
  OfficialApiStationInfoListItem,
  OfficialApiStationStatusListItem,
} from '../../official-api.types';

describe('dataTransformers.info', () => {
  it('maps the official station info fields to the v2 shape', () => {
    const station = {
      station_id: 42,
      name: 'Gran Via',
      lat: 41.38,
      lon: 2.17,
    } as OfficialApiStationInfoListItem;

    expect(dataTransformers.info(station)).toEqual({
      id: 42,
      name: 'Gran Via',
      lat: 41.38,
      lng: 2.17,
    });
  });
});

describe('dataTransformers.status', () => {
  it('maps an in-service station to a status of 1', () => {
    const station = {
      station_id: 42,
      num_docks_available: 5,
      num_bikes_available_types: { ebike: 2, mechanical: 3 },
      status: 'IN_SERVICE',
    } as OfficialApiStationStatusListItem;

    expect(dataTransformers.status(station)).toEqual({
      i: 42,
      e: 2,
      m: 3,
      d: 5,
      s: 1,
    });
  });

  it('maps a non in-service station to a status of 0', () => {
    const station = {
      station_id: 42,
      num_docks_available: 5,
      num_bikes_available_types: { ebike: 0, mechanical: 0 },
      status: 'NOT_IN_SERVICE',
    } as OfficialApiStationStatusListItem;

    expect(dataTransformers.status(station).s).toBe(0);
  });
});

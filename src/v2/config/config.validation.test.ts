import { describe, expect, it } from 'vitest';
import { ConfigValidationError, parseConfigPatch, parseTripInput } from './config.validation';

describe('parseConfigPatch', () => {
  it('accepts a partial patch and returns only the keys sent', () => {
    expect(parseConfigPatch({ mapZoom: 16 })).toEqual({ mapZoom: 16 });
  });

  it('accepts a full config', () => {
    const full = {
      mapCenter: { lat: 41.38, lng: 2.17 },
      mapZoom: 15,
      resourceShown: 'docks',
      bikeTypeFilter: 'electrical',
      bookmarks: { home: { lat: 41.4, lng: 2.15 }, work: null, favorite: null },
      savedStationIds: [1, 2, 3],
      trips: [
        {
          id: 'trip-1',
          origin: 12,
          destination: 34,
          label: 'Home to work',
        },
      ],
    };
    expect(parseConfigPatch(full)).toEqual(full);
  });

  it('rejects unknown top-level keys instead of dropping them', () => {
    expect(() => parseConfigPatch({ userLocation: { lat: 1, lng: 2 } })).toThrow(
      ConfigValidationError
    );
  });

  it('rejects an unknown bookmark', () => {
    expect(() => parseConfigPatch({ bookmarks: { gym: null } })).toThrow(/Unknown bookmark/);
  });

  it('rejects out-of-range coordinates', () => {
    expect(() => parseConfigPatch({ mapCenter: { lat: 200, lng: 2 } })).toThrow(/lat/);
    expect(() => parseConfigPatch({ mapCenter: { lat: 41, lng: 900 } })).toThrow(/lng/);
  });

  it('rejects a non-integer or out-of-range zoom', () => {
    expect(() => parseConfigPatch({ mapZoom: 15.5 })).toThrow(/mapZoom/);
    expect(() => parseConfigPatch({ mapZoom: 99 })).toThrow(/mapZoom/);
  });

  it('rejects an unknown resource or filter value', () => {
    expect(() => parseConfigPatch({ resourceShown: 'scooters' })).toThrow(/resourceShown/);
    expect(() => parseConfigPatch({ bikeTypeFilter: 'cargo' })).toThrow(/bikeTypeFilter/);
  });

  it('allows clearing a bookmark and the filter with null', () => {
    expect(parseConfigPatch({ bikeTypeFilter: null })).toEqual({ bikeTypeFilter: null });
    expect(parseConfigPatch({ mapCenter: null })).toEqual({ mapCenter: null });
  });

  it('de-duplicates saved stations but keeps the user’s order', () => {
    expect(parseConfigPatch({ savedStationIds: [3, 1, 3, 2] })).toEqual({
      savedStationIds: [3, 1, 2],
    });
  });

  it('rejects non-integer station ids and oversized lists', () => {
    expect(() => parseConfigPatch({ savedStationIds: ['1'] })).toThrow(/savedStationIds/);
    expect(() =>
      parseConfigPatch({ savedStationIds: Array.from({ length: 501 }, (_, i) => i) })
    ).toThrow(/at most/);
  });

  it('accepts a trip with an id, origin, destination and label', () => {
    const trips = [{ id: 'trip-1', origin: 12, destination: 34, label: 'Commute' }];
    expect(parseConfigPatch({ trips })).toEqual({ trips });
  });

  it('rejects a trip missing an id, origin or destination', () => {
    expect(() =>
      parseConfigPatch({ trips: [{ origin: 12, destination: 34, label: 'Commute' }] })
    ).toThrow(/id/);
    expect(() =>
      parseConfigPatch({ trips: [{ id: 't1', destination: 34, label: 'Commute' }] })
    ).toThrow(/origin/);
    expect(() =>
      parseConfigPatch({ trips: [{ id: 't1', origin: 12, label: 'Commute' }] })
    ).toThrow(/destination/);
  });

  it('rejects a trip with a non-integer or negative station id', () => {
    expect(() =>
      parseConfigPatch({ trips: [{ id: 't1', origin: 12.5, destination: 34, label: 'Commute' }] })
    ).toThrow(/origin/);
    expect(() =>
      parseConfigPatch({ trips: [{ id: 't1', origin: 12, destination: -1, label: 'Commute' }] })
    ).toThrow(/destination/);
  });

  it('rejects a trip with an empty or missing label', () => {
    const base = { id: 't1', origin: 12, destination: 34 };
    expect(() => parseConfigPatch({ trips: [{ ...base, label: '' }] })).toThrow(/label/);
    expect(() => parseConfigPatch({ trips: [{ ...base, label: '   ' }] })).toThrow(/label/);
    expect(() => parseConfigPatch({ trips: [base] })).toThrow(/label/);
  });

  it('rejects a trip label that is too long', () => {
    const base = { id: 't1', origin: 12, destination: 34 };
    expect(() =>
      parseConfigPatch({ trips: [{ ...base, label: 'x'.repeat(61) }] })
    ).toThrow(/at most/);
  });

  it('rejects an unknown trip key', () => {
    const base = { id: 't1', origin: 12, destination: 34 };
    expect(() =>
      parseConfigPatch({ trips: [{ ...base, label: 'Commute', notes: 'scenic' }] })
    ).toThrow(/Unknown trip key/);
  });

  it('rejects too many trips', () => {
    const trip = { id: 't1', origin: 12, destination: 34, label: 'Commute' };
    expect(() =>
      parseConfigPatch({ trips: Array.from({ length: 101 }, () => trip) })
    ).toThrow(/at most/);
  });

  it('rejects a body with no recognised keys at all', () => {
    expect(() => parseConfigPatch({})).toThrow(/no config keys/);
    expect(() => parseConfigPatch(null)).toThrow(/JSON object/);
    expect(() => parseConfigPatch([1, 2])).toThrow(/JSON object/);
  });
});

describe('parseTripInput', () => {
  const valid = { origin: 12, destination: 34, label: 'Commute' };

  it('accepts an origin, destination and label, with no id', () => {
    expect(parseTripInput(valid)).toEqual(valid);
  });

  it('rejects a body carrying an id — the endpoint owns id assignment', () => {
    expect(() => parseTripInput({ ...valid, id: 'client-supplied' })).toThrow(
      /Unknown trip key/
    );
  });

  it('rejects a missing origin or destination', () => {
    const { origin: _origin, ...withoutOrigin } = valid;
    expect(() => parseTripInput(withoutOrigin)).toThrow(/origin/);
    const { destination: _destination, ...withoutDestination } = valid;
    expect(() => parseTripInput(withoutDestination)).toThrow(/destination/);
  });

  it('rejects a non-integer or negative station id', () => {
    expect(() => parseTripInput({ ...valid, origin: 12.5 })).toThrow(/origin/);
    expect(() => parseTripInput({ ...valid, destination: -1 })).toThrow(/destination/);
  });

  it('rejects an empty or missing label', () => {
    expect(() => parseTripInput({ ...valid, label: '' })).toThrow(/label/);
    const { label: _label, ...withoutLabel } = valid;
    expect(() => parseTripInput(withoutLabel)).toThrow(/label/);
  });

  it('rejects a non-object body', () => {
    expect(() => parseTripInput(null)).toThrow(/JSON object/);
    expect(() => parseTripInput([1, 2])).toThrow(/JSON object/);
  });
});

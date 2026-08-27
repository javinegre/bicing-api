import { AxiosResponse } from 'axios';
import * as cache from 'memory-cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfficialApiResult, OfficialApiStationInfoListItem } from '../official-api.types';

const axiosGet = vi.hoisted(() => vi.fn());

vi.mock('axios', () => {
  const axiosMock = { get: axiosGet, interceptors: { response: { use: vi.fn() } } };
  return { default: axiosMock, ...axiosMock };
});

import Api from './api.controller';

const buildInfoResponse = (): AxiosResponse<OfficialApiResult<OfficialApiStationInfoListItem>> =>
  ({
    data: {
      last_updated: 100,
      data: {
        stations: [
          {
            station_id: 1,
            name: 'Test station',
            lat: 41.1,
            lon: 2.1,
          } as OfficialApiStationInfoListItem,
        ],
      },
    },
    config: { url: 'https://example.test/info' },
  } as AxiosResponse<OfficialApiResult<OfficialApiStationInfoListItem>>);

describe('Api', () => {
  const originalToken = process.env.OPEN_DATA_BCN_ACCESS_TOKEN;

  beforeEach(() => {
    axiosGet.mockClear();
    cache.clear();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.OPEN_DATA_BCN_ACCESS_TOKEN = 'test-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cache.clear();
    process.env.OPEN_DATA_BCN_ACCESS_TOKEN = originalToken;
  });

  it('returns a failure when the access token is missing', async () => {
    delete process.env.OPEN_DATA_BCN_ACCESS_TOKEN;

    const result = await Api().getStationInfo();

    expect(result).toEqual({
      success: false,
      errorMessage: 'OPEN_DATA_BCN_ACCESS_TOKEN env variable not found',
    });
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('fetches and caches station info on a cache miss', async () => {
    axiosGet.mockResolvedValue(buildInfoResponse());

    const result = await Api().getStationInfo();

    expect(result).toEqual({
      success: true,
      lastUpdated: 100,
      stations: [{ id: 1, name: 'Test station', lat: 41.1, lng: 2.1 }],
    });
    expect(axiosGet).toHaveBeenCalledWith(
      expect.stringContaining('recurs.json'),
      expect.objectContaining({ headers: { Authorization: 'test-token' } })
    );
    expect(cache.get('stations-info')).toEqual(result);
  });

  it('returns cached data on a cache hit without calling the api', async () => {
    const cached = { success: true, lastUpdated: 1, stations: [] };
    cache.put('stations-status', cached);

    const result = await Api().getStationStatus();

    expect(result).toBe(cached);
    expect(axiosGet).not.toHaveBeenCalled();
  });

  it('refetches when the cached result was a failure', async () => {
    cache.put('stations-info', { success: false, errorMessage: 'stale' });
    axiosGet.mockResolvedValue(buildInfoResponse());

    await Api().getStationInfo();

    expect(axiosGet).toHaveBeenCalledTimes(1);
  });

  it('returns a failure payload when the api call fails', async () => {
    axiosGet.mockRejectedValue({
      config: { url: 'https://example.test/info' },
      message: 'Network Error',
      stack: 'Error: Network Error',
    });

    const result = await Api().getStationInfo();

    expect(result).toEqual({
      success: false,
      errorMessage: 'https://example.test/info -> Network Error',
    });
  });
});

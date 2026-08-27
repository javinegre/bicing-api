import { AxiosError, AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import responseHelpers from './response';
import { OfficialApiResult } from '../../official-api.types';

const buildResponse = (data: unknown, url = 'https://example.test/stations') =>
  ({ data, config: { url } } as AxiosResponse<OfficialApiResult<unknown>>);

describe('handleResponseData', () => {
  it('passes through a well-formed response', () => {
    const response = buildResponse({ last_updated: 123, data: { stations: [] } });

    expect(responseHelpers.handleResponseData(response)).toBe(response);
  });

  it('rejects when the stations array is missing', async () => {
    const response = buildResponse({ last_updated: 123, data: {} });

    await expect(responseHelpers.handleResponseData(response)).rejects.toThrow(
      'Malformed Open Data BCN api response from https://example.test/stations'
    );
  });

  it('rejects when last_updated is not a number', async () => {
    const response = buildResponse({ last_updated: 'nope', data: { stations: [] } });

    await expect(responseHelpers.handleResponseData(response)).rejects.toThrow(/Malformed/);
  });
});

describe('handleSuccessfulResponse', () => {
  it('wraps transformed stations in a success payload', () => {
    const response = buildResponse({
      last_updated: 123,
      data: { stations: [1, 2, 3] },
    });
    const double = (n: number) => n * 2;

    expect(responseHelpers.handleSuccessfulResponse(double)(response)).toEqual({
      success: true,
      lastUpdated: 123,
      stations: [2, 4, 6],
    });
  });
});

describe('handleErrorResponse', () => {
  it('returns a failure payload describing the resource and error', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const err = {
      config: { url: 'https://example.test/stations' },
      message: 'timeout of 5000ms exceeded',
      stack: 'Error: timeout',
    } as AxiosError;

    expect(responseHelpers.handleErrorResponse(err)).toEqual({
      success: false,
      errorMessage: 'https://example.test/stations -> timeout of 5000ms exceeded',
    });

    vi.restoreAllMocks();
  });

  it('falls back to an empty resource url when the error has no config', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const err = {
      message: 'Network Error',
      stack: 'Error: Network Error',
    } as AxiosError;

    expect(responseHelpers.handleErrorResponse(err)).toEqual({
      success: false,
      errorMessage: ' -> Network Error',
    });

    vi.restoreAllMocks();
  });
});

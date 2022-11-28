import { IApiConfig } from './src/types';

const apiVersion = 'v1.3';

const bicingApiBaseUrl: IApiConfig['bicingApiBaseUrl'] =
  'https://api.bsmsa.eu/ext/api/bsm/gbfs/v2/en/';

const endpoints: IApiConfig['endpoints'] = {
  info: 'station_information',
  status: 'station_status',
};

const cacheConfig: IApiConfig['cacheConfig'] = {
  info: {
    key: 'stations-info',
    ttl: 10 * 60 * 1000, // 10min
  },
  status: {
    key: 'stations-status',
    ttl: 60 * 1000, // 60s
  },
};

export default { apiVersion, bicingApiBaseUrl, endpoints, cacheConfig };

import { ApiConfig } from './src/types';

const apiVersion = 'v1.3';

const bicingApiBaseUrl =
  'https://opendata-ajuntament.barcelona.cat/data/';

const endpoints: ApiConfig['endpoints'] = {
  // https://opendata-ajuntament.barcelona.cat/data/es/dataset/informacio-estacions-bicing
  info: 'dataset/bd2462df-6e1e-4e37-8205-a4b8e7313b84/resource/f60e9291-5aaa-417d-9b91-612a9de800aa/download/recurs.json',
  // https://opendata-ajuntament.barcelona.cat/data/es/dataset/estat-estacions-bicing
  status: 'dataset/6aa3416d-ce1a-494d-861b-7bd07f069600/resource/1b215493-9e63-4a12-8980-2d7e0fa19f85/download/recurs.json',
};

const cacheConfig: ApiConfig['cacheConfig'] = {
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

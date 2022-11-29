import axios from 'axios';
import {
  IApiMethods,
  IOfficialApiResult,
  IOfficialApiStationInfo,
  IOfficialApiStationStatus,
  XHRApiResponseType,
  XHRApiStationInfoResponseType,
  XHRApiStationStatusResponseType,
  IXHRStationInfo,
  IXHRStationStatus,
} from './types';
import { ApiEndpointType, DataTransformType } from './types';
import {Request} from 'express'

import config from '../config';
import dataTransformers from './helpers/data-transformers';
import responseHelpers from './helpers/response';

const cache = require('memory-cache');

axios.interceptors.response.use(responseHelpers.handleResponseData);

const Api = (request: Request): IApiMethods => {
  const { bicingApiBaseUrl, endpoints, cacheConfig } = config;

  const logRequest = (
    method: ApiEndpointType,
    missHit: 'HIT' | 'MISS',
  ) => {
    console.log(`[${(new Date()).toUTCString()}] 🚲 Bicing Api - ${method} *${missHit}* - ${request.ip}`);
  };

  const getApiUrl = (endpoint: string): string =>
    `${bicingApiBaseUrl}${endpoint}`;

  const getCachedData = async <OT, TT>(
    type: ApiEndpointType,
    dataTransformer: DataTransformType<OT, TT>,
  ): Promise<XHRApiResponseType<TT>> => {
    const { key, ttl } = cacheConfig[type];

    let result: XHRApiResponseType<TT> = cache.get(key);

    if (result === null || !result.success) {
      result = await axios
        .get<IOfficialApiResult<OT>>(getApiUrl(endpoints[type]))
        .then(responseHelpers.handleSuccessfulResponse(dataTransformer))
        .catch(responseHelpers.handleErrorResponse);

      cache.put(key, result, ttl);

      logRequest(type, 'MISS');
    }
    else {
      logRequest(type, 'HIT');
    }


    return result;
  };

  const getStationInfo = async (): Promise<XHRApiStationInfoResponseType> =>
    getCachedData<IOfficialApiStationInfo, IXHRStationInfo>(
      'info',
      dataTransformers.info,
    );

  const getStationStatus = async (): Promise<XHRApiStationStatusResponseType> =>
    getCachedData<IOfficialApiStationStatus, IXHRStationStatus>(
      'status',
      dataTransformers.status,
    );

  return {
    getStationInfo,
    getStationStatus,
  };
};

export default Api;

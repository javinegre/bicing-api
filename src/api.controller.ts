import axios from 'axios';
import {
  ApiResponseType,
  StationInfoResponse,
  StationStatusResponse,
  StationInfoListItem,
  StationStatusListItem,
} from './types';
import {
  OfficialApiResult,
  OfficialApiStationInfoListItem,
  OfficialApiStationStatusListItem,
} from './dtos';
import { ApiEndpointType, DataTransformType } from './types';
import { Request } from 'express';

import config from '../config';
import dataTransformers from './helpers/data-transformers';
import responseHelpers from './helpers/response';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cache = require('memory-cache');

axios.interceptors.response.use(responseHelpers.handleResponseData);

const Api = () => {
  const { bicingApiBaseUrl, endpoints, cacheConfig } = config;

  const logRequest = (method: ApiEndpointType, missHit: 'HIT' | 'MISS') => {
    console.log(
      `[${new Date().toUTCString()}] 🚲 Bicing Api - ${method} *${missHit}*`
    );
  };

  const getApiUrl = (endpoint: string): string => `${bicingApiBaseUrl}${endpoint}`;

  const getCachedData = async <OT, TT>(
    type: ApiEndpointType,
    dataTransformer: DataTransformType<OT, TT>
  ): Promise<ApiResponseType<TT>> => {
    const { key, ttl } = cacheConfig[type];

    let result: ApiResponseType<TT> = cache.get(key);

    if (result === null || !result.success) {
      result = await axios
        .get<OfficialApiResult<OT>>(getApiUrl(endpoints[type]))
        .then(responseHelpers.handleSuccessfulResponse(dataTransformer))
        .catch(responseHelpers.handleErrorResponse);

      cache.put(key, result, ttl);

      logRequest(type, 'MISS');
    } else {
      logRequest(type, 'HIT');
    }

    return result;
  };

  const getStationInfo = async (): Promise<StationInfoResponse> =>
    getCachedData<OfficialApiStationInfoListItem, StationInfoListItem>(
      'info',
      dataTransformers.info
    );

  const getStationStatus = async (): Promise<StationStatusResponse> =>
    getCachedData<OfficialApiStationStatusListItem, StationStatusListItem>(
      'status',
      dataTransformers.status
    );

  return {
    getStationInfo,
    getStationStatus,
  };
};

export default Api;

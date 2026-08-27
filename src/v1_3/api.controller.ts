import { config as dotenvConfig } from 'dotenv';
import axios from 'axios';
import {
  ApiResponseTypeV1_3,
  StationInfoResponseV1_3,
  StationStatusResponseV1_3,
  StationInfoListItemV1_3,
  StationStatusListItemV1_3,
  ApiEndpointTypeV1_3,
  DataTransformTypeV1_3,
} from './types';
import {
  OfficialApiResult,
  OfficialApiStationInfoListItem,
  OfficialApiStationStatusListItem,
} from '../official-api.types';

import config from '../../config';
import dataTransformers from './helpers/data-transformers';
import responseHelpers from './helpers/response';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cache = require('memory-cache');

dotenvConfig({path: `${__dirname}/../.env`});

axios.interceptors.response.use(responseHelpers.handleResponseData);

const Api = () => {
  const { bicingApiBaseUrl, endpoints, cacheConfig } = config;
  const accessToken = process.env.OPEN_DATA_BCN_ACCESS_TOKEN;

  const logRequest = (method: ApiEndpointTypeV1_3, missHit: 'HIT' | 'MISS') => {
    console.log(
      `[${new Date().toUTCString()}] 🚲 Bicing Api - ${method} *${missHit}*`
    );
  };

  const getApiUrl = (endpoint: string): string => `${bicingApiBaseUrl}${endpoint}`;

  const getCachedData = async <OT, TT>(
    type: ApiEndpointTypeV1_3,
    dataTransformer: DataTransformTypeV1_3<OT, TT>
  ): Promise<ApiResponseTypeV1_3<TT>> => {
    if (!accessToken) {
      return {
        success: false,
        errorMessage: 'OPEN_DATA_BCN_ACCESS_TOKEN env variable not found',
      }
    }

    const { key, ttl } = cacheConfig[type];

    let result: ApiResponseTypeV1_3<TT> = cache.get(key);

    if (result === null || !result.success) {
      result = await axios
        .get<OfficialApiResult<OT>>(getApiUrl(endpoints[type]), {
          headers: {
            'Authorization': accessToken,
          }
        })
        .then(responseHelpers.handleSuccessfulResponse(dataTransformer))
        .catch(responseHelpers.handleErrorResponse);

      cache.put(key, result, ttl);

      logRequest(type, 'MISS');
    } else {
      logRequest(type, 'HIT');
    }

    return result;
  };

  const getStationInfo = async (): Promise<StationInfoResponseV1_3> =>
    getCachedData<OfficialApiStationInfoListItem, StationInfoListItemV1_3>(
      'info',
      dataTransformers.info
    );

  const getStationStatus = async (): Promise<StationStatusResponseV1_3> =>
    getCachedData<OfficialApiStationStatusListItem, StationStatusListItemV1_3>(
      'status',
      dataTransformers.status
    );

  return {
    getStationInfo,
    getStationStatus,
  };
};

export default Api;

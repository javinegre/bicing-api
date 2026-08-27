import { AxiosResponse } from 'axios';
import { ResponseHelpersV1_3 } from '../types';
import { OfficialApiResult } from '../../dtos';

const isResponseDataValid = <T>(response: AxiosResponse<OfficialApiResult<T>>): boolean =>
  response.data &&
  typeof response.data.last_updated === 'number' &&
  response.data.data &&
  Array.isArray(response.data.data.stations);

const handleResponseData: ResponseHelpersV1_3['handleResponseData'] = (response) =>
  isResponseDataValid(response)
    ? response
    : Promise.reject(new Error(`Malformed Open Data BCN api response from ${response.config.url}`));

const handleSuccessfulResponse: ResponseHelpersV1_3['handleSuccessfulResponse'] =
  (stationTransformer) => (response) => ({
    success: true,
    lastUpdated: response.data.last_updated,
    stations: response.data.data.stations.map(stationTransformer),
  });

const handleErrorResponse: ResponseHelpersV1_3['handleErrorResponse'] = (err) => {
  const resourceUrl = err.config && err.config.url ? err.config.url : '';

  console.log(
    `\n${new Date().toUTCString()}\nOpen Data BCN api error\nResource: ${resourceUrl}\n${err.stack}`
  );

  return {
    success: false,
    errorMessage: `${resourceUrl} -> ${err.message}`,
  };
};

export default {
  handleResponseData,
  handleSuccessfulResponse,
  handleErrorResponse,
};

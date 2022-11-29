import { AxiosResponse } from 'axios';
import { ResponseHelpers } from '../types';
import { OfficialApiResult } from '../dtos';

const isResponseDataValid = <T>(response: AxiosResponse<OfficialApiResult<T>>): boolean =>
  response.data &&
  typeof response.data.last_updated === 'number' &&
  response.data.data &&
  Array.isArray(response.data.data.stations);

const handleResponseData: ResponseHelpers['handleResponseData'] = (response) =>
  isResponseDataValid(response)
    ? response
    : Promise.reject(new Error(`Malformed Open Data BCN api response from ${response.config.url}`));

const handleSuccessfulResponse: ResponseHelpers['handleSuccessfulResponse'] =
  (stationTransformer) => (response) => ({
    success: true,
    lastUpdated: response.data.last_updated,
    stations: response.data.data.stations.map(stationTransformer),
  });

const handleErrorResponse: ResponseHelpers['handleErrorResponse'] = (err) => {
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

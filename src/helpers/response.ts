import { AxiosResponse } from 'axios';
import { IOfficialApiResult, IResponseHelpers } from '../types';

const chalk = require('chalk');

const isResponseDataValid = <T>(
  response: AxiosResponse<IOfficialApiResult<T>>,
): boolean =>
  response.data &&
  typeof response.data.last_updated === 'number' &&
  response.data.data &&
  Array.isArray(response.data.data.stations);

const handleResponseData: IResponseHelpers['handleResponseData'] = (response) =>
  isResponseDataValid(response)
    ? response
    : Promise.reject(
        new Error(
          `Malformed Open Data BCN api response from ${response.config.url}`,
        ),
      );

const handleSuccessfulResponse: IResponseHelpers['handleSuccessfulResponse'] = (
  stationTransformer,
) => (response) => ({
  success: true,
  lastUpdated: response.data.last_updated,
  stations: response.data.data.stations.map(stationTransformer),
});

const handleErrorResponse: IResponseHelpers['handleErrorResponse'] = (err) => {
  const resourceUrl = err.config && err.config.url ? err.config.url : '';

  console.log(
    `\n${new Date().toUTCString()}\n${chalk.black.bgRed(
      'Open Data BCN api error',
    )}\nResource: ${chalk.yellow(resourceUrl)}\n${err.stack}`,
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

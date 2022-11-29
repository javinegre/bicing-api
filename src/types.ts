import { AxiosError, AxiosResponse } from 'axios';
import { OfficialApiResult } from './dtos';

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

export type ApiEndpointType = 'info' | 'status';

export interface ApiConfig {
  endpoints: {
    [key in ApiEndpointType]: string;
  };
  cacheConfig: {
    [key in ApiEndpointType]: {
      key: string;
      ttl: number;
    };
  };
}

/* -------------------------------------------------------------------------- */
/*                                  API Types                                 */
/* -------------------------------------------------------------------------- */

export interface StationInfoListItem {
    id: number;
    name: string;
    lat: number;
    lng: number;
  }
  
export enum StationStatusEnum {
  inactive,
  active,
}

export interface StationStatusListItem {
    i: number;
    e: number;
    m: number;
    d: number;
    s: StationStatusEnum.inactive | StationStatusEnum.active;
}

export interface StationListResponse<T> {
  success: true;
  lastUpdated: number;
  stations: Array<T>;
}

export interface ErrorResponse {
  success: false;
  errorMessage: string;
}

export type ApiResponseType<T> =
  | StationListResponse<T>
  | ErrorResponse
  | null;

export type StationInfoResponse = ApiResponseType<StationInfoListItem>;
export type StationStatusResponse = ApiResponseType<StationStatusListItem>;

export type DataTransformType<OT, TT> = (station: OT) => TT;

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

export interface ResponseHelpers {
  handleResponseData: <T>(
    response: AxiosResponse<OfficialApiResult<T>>,
  ) => AxiosResponse<OfficialApiResult<T>> | Promise<never>;
  handleSuccessfulResponse: <OT, TT>(
    stationTransformer: DataTransformType<OT, TT>,
  ) => (response: AxiosResponse<OfficialApiResult<OT>>) => StationListResponse<TT>;
  handleErrorResponse: (err: AxiosError) => ErrorResponse;
}

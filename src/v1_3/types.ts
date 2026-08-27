import { AxiosError, AxiosResponse } from 'axios';
import { OfficialApiResult } from '../dtos';

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

export type ApiEndpointTypeV1_3 = 'info' | 'status';

export interface ApiConfigV1_3 {
  endpoints: {
    [key in ApiEndpointTypeV1_3]: string;
  };
  cacheConfig: {
    [key in ApiEndpointTypeV1_3]: {
      key: string;
      ttl: number;
    };
  };
}

/* -------------------------------------------------------------------------- */
/*                                  API Types                                 */
/* -------------------------------------------------------------------------- */

export interface StationInfoListItemV1_3 {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export enum StationStatusEnumV1_3 {
  inactive,
  active,
}

export interface StationStatusListItemV1_3 {
  i: number;
  e: number;
  m: number;
  d: number;
  s: StationStatusEnumV1_3.inactive | StationStatusEnumV1_3.active;
}

export interface StationListResponseV1_3<T> {
  success: true;
  lastUpdated: number;
  stations: Array<T>;
}

export interface ErrorResponseV1_3 {
  success: false;
  errorMessage: string;
}

export type ApiResponseTypeV1_3<T> = StationListResponseV1_3<T> | ErrorResponseV1_3 | null;

export type StationInfoResponseV1_3 = ApiResponseTypeV1_3<StationInfoListItemV1_3>;
export type StationStatusResponseV1_3 = ApiResponseTypeV1_3<StationStatusListItemV1_3>;

export type DataTransformTypeV1_3<OT, TT> = (station: OT) => TT;

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

export interface ResponseHelpersV1_3 {
  handleResponseData: <T>(
    response: AxiosResponse<OfficialApiResult<T>>
  ) => AxiosResponse<OfficialApiResult<T>> | Promise<never>;
  handleSuccessfulResponse: <OT, TT>(
    stationTransformer: DataTransformTypeV1_3<OT, TT>
  ) => (response: AxiosResponse<OfficialApiResult<OT>>) => StationListResponseV1_3<TT>;
  handleErrorResponse: (err: AxiosError) => ErrorResponseV1_3;
}

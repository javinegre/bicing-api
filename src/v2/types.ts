import { AxiosError, AxiosResponse } from 'axios';
import { OfficialApiResult } from '../dtos';

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

export type ApiEndpointTypeV2 = 'info' | 'status';

export interface ApiConfigV2 {
  endpoints: {
    [key in ApiEndpointTypeV2]: string;
  };
  cacheConfig: {
    [key in ApiEndpointTypeV2]: {
      key: string;
      ttl: number;
    };
  };
}

/* -------------------------------------------------------------------------- */
/*                                  API Types                                 */
/* -------------------------------------------------------------------------- */

export interface StationInfoListItemV2 {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

export enum StationStatusEnumV2 {
  inactive,
  active,
}

export interface StationStatusListItemV2 {
  i: number;
  e: number;
  m: number;
  d: number;
  s: StationStatusEnumV2.inactive | StationStatusEnumV2.active;
}

export interface StationListResponseV2<T> {
  success: true;
  lastUpdated: number;
  stations: Array<T>;
}

export interface ErrorResponseV2 {
  success: false;
  errorMessage: string;
}

export type ApiResponseTypeV2<T> = StationListResponseV2<T> | ErrorResponseV2 | null;

export type StationInfoResponseV2 = ApiResponseTypeV2<StationInfoListItemV2>;
export type StationStatusResponseV2 = ApiResponseTypeV2<StationStatusListItemV2>;

export type DataTransformTypeV2<OT, TT> = (station: OT) => TT;

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

export interface ResponseHelpersV2 {
  handleResponseData: <T>(
    response: AxiosResponse<OfficialApiResult<T>>
  ) => AxiosResponse<OfficialApiResult<T>> | Promise<never>;
  handleSuccessfulResponse: <OT, TT>(
    stationTransformer: DataTransformTypeV2<OT, TT>
  ) => (response: AxiosResponse<OfficialApiResult<OT>>) => StationListResponseV2<TT>;
  handleErrorResponse: (err: AxiosError) => ErrorResponseV2;
}

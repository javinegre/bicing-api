// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
import { Express, Response } from 'express';

import Api from './api.controller';
import appVersion from '../app-version';

import { ApiResponseTypeV2, StationInfoListItemV2, StationStatusListItemV2 } from './types';

const apiRoutes: Express = express();

const sendJson: (
  res: Response<any, any>,
  data:
    | ApiResponseTypeV2<StationInfoListItemV2 | StationStatusListItemV2>
    | { latestVersion: string | null }
) => void = (res, data) => {
  res.setHeader('Content-Type', 'application/json');
  if (appVersion) res.setHeader('X-App-Version', appVersion);
  res.send(JSON.stringify(data, null, 0));
};

apiRoutes.get('/station-info', async (req, res) => {
  const resData = await Api().getStationInfo();
  sendJson(res, resData);
});

apiRoutes.get('/station-status', async (req, res) => {
  const resData = await Api().getStationStatus();
  sendJson(res, resData);
});

export default apiRoutes;

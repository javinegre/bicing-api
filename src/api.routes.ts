// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
import { Express, Response } from 'express';

import Api from './api.controller';

import { ApiResponseType, StationInfoListItem, StationStatusListItem } from './types';

const apiRoutes: Express = express();

const sendJson: (
  res: Response<any, any>,
  data:
    | ApiResponseType<StationInfoListItem | StationStatusListItem>
    | { latestVersion: string | null }
) => void = (res, data) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(data, null, 0));
};

apiRoutes.get('/station-info', async (req, res) => {
  const resData = await Api(req).getStationInfo();
  sendJson(res, resData);
});

apiRoutes.get('/station-status', async (req, res) => {
  const resData = await Api(req).getStationStatus();
  sendJson(res, resData);
});

export default apiRoutes;

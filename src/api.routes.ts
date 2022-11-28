import { Express, Response } from 'express';

import Api from './api.controller';

import { XHRApiResponseType, IXHRStationInfo, IXHRStationStatus } from './types';

const express = require('express');

const apiRoutes: Express = express();

const sendJson: (
  res: Response<any, any>,
  data:
    | XHRApiResponseType<IXHRStationInfo | IXHRStationStatus>
    | { latestVersion: string | null },
) => void = (res, data) => {
  res.setHeader('Content-Type', 'application/json');
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

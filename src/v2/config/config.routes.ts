// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
import { Express, Response } from 'express';

import { StoredConfig, getUserConfig, upsertUserConfig } from './config.db';
import { ConfigValidationError, parseConfigPatch } from './config.validation';
import { sendJson } from './http';
import { userIdOf } from './session';
import tripsRoutes from './trips.routes';
import { UserConfigResponseV2 } from './types';

const configRoutes: Express = express();

/**
 * Body parsing is scoped to this router on purpose. negre.co-server mounts
 * better-auth's handler ahead of everything and that handler reads the raw
 * request body itself — a global express.json() would leave the auth client
 * hanging with no error at all. It's applied here, before the routes below
 * and before the /trips sub-router is mounted, so every route under this
 * app gets it.
 */
configRoutes.use(express.json({ limit: '32kb' }));

const sendConfig = (res: Response, stored: StoredConfig): void =>
  sendJson<UserConfigResponseV2>(res, 200, {
    success: true,
    config: stored.config,
    updatedAt: stored.updatedAt,
  });

configRoutes.get('/', (req, res) => {
  const userId = userIdOf(req);
  if (!userId) return sendJson(res, 401, { success: false, errorMessage: 'Unauthorized' });

  sendConfig(res, getUserConfig(userId));
});

configRoutes.put('/', (req, res) => {
  const userId = userIdOf(req);
  if (!userId) return sendJson(res, 401, { success: false, errorMessage: 'Unauthorized' });

  let patch;
  try {
    patch = parseConfigPatch(req.body);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      return sendJson(res, 400, { success: false, errorMessage: err.message });
    }
    throw err;
  }

  sendConfig(res, upsertUserConfig(userId, patch));
});

configRoutes.use('/trips', tripsRoutes);

export default configRoutes;

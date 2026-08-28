// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
import { Express, Request, Response } from 'express';

import { StoredConfig, getUserConfig, upsertUserConfig } from './config.db';
import { ConfigValidationError, parseConfigPatch } from './config.validation';
import { UserConfigErrorV2, UserConfigResponseV2 } from './types';

const configRoutes: Express = express();

/**
 * Body parsing is scoped to this router on purpose. negre.co-server mounts
 * better-auth's handler ahead of everything and that handler reads the raw
 * request body itself — a global express.json() would leave the auth client
 * hanging with no error at all.
 */
configRoutes.use(express.json({ limit: '32kb' }));

const sendJson = (
  res: Response,
  status: number,
  data: UserConfigResponseV2 | UserConfigErrorV2
): void => {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  // Per-user data behind a session cookie must never land in a shared cache.
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(JSON.stringify(data, null, 0));
};

const sendConfig = (res: Response, stored: StoredConfig): void =>
  sendJson(res, 200, { success: true, config: stored.config, updatedAt: stored.updatedAt });

/**
 * The authenticated user id. `requireAuth` (negre.co-server/auth/require-auth)
 * populates req.session before this router ever runs; a missing id means the
 * route was mounted without the gate, which is a wiring bug, not a client error
 * — but it must still fail closed.
 *
 * Read structurally rather than by augmenting Express's Request: the host
 * already augments it with better-auth's session type, and a second
 * declaration of the same property in the same program is a conflict.
 */
type SessionBearingRequest = Request & {
  session?: { user?: { id?: string } } | null;
};

const userIdOf = (req: Request): string | null =>
  (req as SessionBearingRequest).session?.user?.id ?? null;

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

export default configRoutes;

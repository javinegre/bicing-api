// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');
import { Express, Request, Response } from 'express';

import { addUserTrip, deleteUserTrip, listUserTrips, updateUserTrip } from './config.db';
import { ConfigValidationError, parseTripInput } from './config.validation';
import { sendJson } from './http';
import { userIdOf } from './session';
import {
  TripDeletedResponseV2,
  TripInputV2,
  TripListResponseV2,
  TripResponseV2,
  UserConfigErrorV2,
} from './types';

/**
 * CRUD for individual trips, mounted at /bicing/api/v2/config/trips by
 * config.routes.ts. Kept separate from the bulk config PUT so a client can
 * add, edit or remove one trip without re-sending its whole (already loaded)
 * trip list.
 */
const tripsRoutes: Express = express();

/** Returns null and has already responded 401 when there's no session. */
const requireUserId = (req: Request, res: Response): string | null => {
  const userId = userIdOf(req);
  if (!userId) sendJson<UserConfigErrorV2>(res, 401, { success: false, errorMessage: 'Unauthorized' });
  return userId;
};

/** Returns null and has already responded 400 when the body doesn't parse. */
const requireTripInput = (req: Request, res: Response): TripInputV2 | null => {
  try {
    return parseTripInput(req.body);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      sendJson<UserConfigErrorV2>(res, 400, { success: false, errorMessage: err.message });
      return null;
    }
    throw err;
  }
};

tripsRoutes.get('/', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  sendJson<TripListResponseV2>(res, 200, { success: true, trips: listUserTrips(userId) });
});

tripsRoutes.post('/', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const input = requireTripInput(req, res);
  if (!input) return;

  try {
    const { trip, updatedAt } = addUserTrip(userId, input);
    sendJson<TripResponseV2>(res, 201, { success: true, trip, updatedAt });
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      return sendJson<UserConfigErrorV2>(res, 400, { success: false, errorMessage: err.message });
    }
    throw err;
  }
});

tripsRoutes.put('/:tripId', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const input = requireTripInput(req, res);
  if (!input) return;

  const updated = updateUserTrip(userId, req.params.tripId, input);
  if (!updated) {
    return sendJson<UserConfigErrorV2>(res, 404, { success: false, errorMessage: 'Trip not found' });
  }

  sendJson<TripResponseV2>(res, 200, {
    success: true,
    trip: updated.trip,
    updatedAt: updated.updatedAt,
  });
});

tripsRoutes.delete('/:tripId', (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const deleted = deleteUserTrip(userId, req.params.tripId);
  if (!deleted) {
    return sendJson<UserConfigErrorV2>(res, 404, { success: false, errorMessage: 'Trip not found' });
  }

  sendJson<TripDeletedResponseV2>(res, 200, { success: true, updatedAt: deleted.updatedAt });
});

export default tripsRoutes;

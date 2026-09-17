import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bicing-trips-routes-'));
process.env.BICING_DB_PATH = path.join(tmpDir, 'bicing.db');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');

import { closeDb } from './config.db';
import configRoutes from './config.routes';
import { TripListResponseV2, TripResponseV2 } from './types';

/**
 * Stands in for negre.co-server's requireAuth: the router itself never resolves
 * a session, it only reads the one the host put on the request.
 */
const fakeAuth = (userId: string | null) => (req: Request, _res: Response, next: NextFunction) => {
  if (userId) (req as Request & { session?: unknown }).session = { user: { id: userId } };
  next();
};

let server: Server;
let base: string;

const app = express();
app.use('/gated', fakeAuth('rider-1'), configRoutes);
app.use('/ungated', fakeAuth(null), configRoutes);

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const trip = {
  origin: 12,
  destination: 34,
  label: 'Commute',
};

const request = (method: string, route: string, body?: unknown) =>
  fetch(`${base}${route}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('trips routes', () => {
  it('fails closed when mounted without an auth gate', async () => {
    const res = await request('GET', '/ungated/trips');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ success: false });
  });

  it('lists no trips before anything is saved', async () => {
    const res = await request('GET', '/gated/trips');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    await expect(res.json()).resolves.toEqual({ success: true, trips: [] });
  });

  it('creates a trip and assigns it an id', async () => {
    const res = await request('POST', '/gated/trips', trip);
    expect(res.status).toBe(201);
    const body = (await res.json()) as TripResponseV2;
    expect(body).toMatchObject({ success: true, trip });
    expect(body.trip.id).toEqual(expect.any(String));
    expect(body.updatedAt).toBeGreaterThan(0);

    const listed = (await (await request('GET', '/gated/trips')).json()) as TripListResponseV2;
    expect(listed.trips).toEqual([body.trip]);
  });

  it('rejects an invalid trip with 400 and an explanation', async () => {
    const res = await request('POST', '/gated/trips', { ...trip, label: '' });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining('label'),
    });
  });

  it('rejects creating a trip without a session', async () => {
    const res = await request('POST', '/ungated/trips', trip);
    expect(res.status).toBe(401);
  });

  it('updates a trip in place', async () => {
    const created = (await (await request('POST', '/gated/trips', trip)).json()) as TripResponseV2;

    const res = await request('PUT', `/gated/trips/${created.trip.id}`, {
      ...trip,
      label: 'Renamed',
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      trip: { ...created.trip, label: 'Renamed' },
    });
  });

  it('404s updating a trip that does not exist', async () => {
    const res = await request('PUT', '/gated/trips/missing', trip);
    expect(res.status).toBe(404);
  });

  it('deletes a trip', async () => {
    const created = (await (await request('POST', '/gated/trips', trip)).json()) as TripResponseV2;

    const res = await request('DELETE', `/gated/trips/${created.trip.id}`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ success: true });

    const listed = (await (await request('GET', '/gated/trips')).json()) as TripListResponseV2;
    expect(listed.trips.find((t) => t.id === created.trip.id)).toBeUndefined();
  });

  it('404s deleting a trip that does not exist', async () => {
    const res = await request('DELETE', '/gated/trips/missing');
    expect(res.status).toBe(404);
  });
});

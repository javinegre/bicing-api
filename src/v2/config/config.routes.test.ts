import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bicing-routes-'));
process.env.BICING_DB_PATH = path.join(tmpDir, 'bicing.db');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express');

import { closeDb } from './config.db';
import configRoutes from './config.routes';

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

const put = (route: string, body: unknown) =>
  fetch(`${base}${route}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('config routes', () => {
  it('fails closed when mounted without an auth gate', async () => {
    const res = await fetch(`${base}/ungated`);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ success: false });
  });

  it('returns defaults before anything is saved', async () => {
    const res = await fetch(`${base}/gated`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
    await expect(res.json()).resolves.toMatchObject({
      success: true,
      config: { resourceShown: 'bikes', savedStationIds: [] },
    });
  });

  it('upserts, merges and reads back over HTTP', async () => {
    await put('/gated', { mapZoom: 16, savedStationIds: [12, 34] });
    const merged = await put('/gated', { resourceShown: 'docks' });

    await expect(merged.json()).resolves.toMatchObject({
      success: true,
      config: { mapZoom: 16, resourceShown: 'docks', savedStationIds: [12, 34] },
    });
  });

  it('rejects an invalid patch with 400 and an explanation', async () => {
    const res = await put('/gated', { mapZoom: 'far in' });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      errorMessage: expect.stringContaining('mapZoom'),
    });
  });

  it('refuses to write without a session', async () => {
    const res = await put('/ungated', { mapZoom: 15 });
    expect(res.status).toBe(401);
  });
});

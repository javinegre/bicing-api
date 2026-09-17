import { Response } from 'express';

/** Per-user data behind a session cookie must never land in a shared cache. */
export const sendJson = <T>(res: Response, status: number, data: T): void => {
  res.status(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(JSON.stringify(data, null, 0));
};

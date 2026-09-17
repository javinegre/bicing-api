import { Request } from 'express';

/**
 * The authenticated user id. `requireAuth` (negre.co-server/auth/require-auth)
 * populates req.session before any router under /bicing/api/v2/config ever
 * runs; a missing id means a route was mounted without the gate, which is a
 * wiring bug, not a client error — but it must still fail closed.
 *
 * Read structurally rather than by augmenting Express's Request: the host
 * already augments it with better-auth's session type, and a second
 * declaration of the same property in the same program is a conflict.
 */
type SessionBearingRequest = Request & {
  session?: { user?: { id?: string } } | null;
};

export const userIdOf = (req: Request): string | null =>
  (req as SessionBearingRequest).session?.user?.id ?? null;

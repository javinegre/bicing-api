/**
 * Entry point for the per-user config API, kept separate from index.ts because
 * it is the only part of this service that needs an authenticated session.
 * negre.co-server mounts it behind its own `requireAuth` middleware:
 *
 *   const BicingConfigApi = require('./apis/bicing-api/config-api');
 *   app.use('/bicing/api/v2/config', requireAuth, BicingConfigApi);
 *
 * Keeping the gate in the router rather than in here means this repo never has
 * to depend on the host's auth instance.
 */
import configRoutes from './src/v2/config/config.routes';

module.exports = configRoutes;

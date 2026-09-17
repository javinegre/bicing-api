# bicing-api

Express router serving Barcelona Bicing station data, mounted by
[negre.co-server](https://github.com/javinegre/negre.co-server) at
`/bicing/api`. Runs in that router's process under `tsx` — there is no build
step and no separate server.

## Endpoints

### Station data — `index.ts`, public

| Route | Upstream cache |
| --- | --- |
| `GET /v1.3/station-info`, `/v1.3/station-status` | legacy shape, kept for bicing-2023 |
| `GET /v2/station-info` | 10 min |
| `GET /v2/station-status` | 60 s |

Both proxy [Open Data BCN](https://opendata-ajuntament.barcelona.cat/) and need
`OPEN_DATA_BCN_ACCESS_TOKEN` in the environment; without it the endpoints return
`{ success: false }` rather than failing. Responses are held in an in-process
`memory-cache`, which is why the host runs in fork mode with a single instance —
clustering would multiply the caches and the upstream calls.

`/v2/station-status` uses single-letter keys (`i` id, `e` electric, `m`
mechanical, `d` docks, `s` status) to keep ~500 rows small over the wire.

### Per-user config — `config-api.ts`, authenticated

| Route | Does |
| --- | --- |
| `GET /` | The signed-in user's config, or defaults if they have never saved |
| `PUT /` | Upsert. Merges at the top level; returns the merged document |
| `GET /trips` | The signed-in user's trips |
| `POST /trips` | Create a trip from `{ origin, destination, label }`; the server assigns `id` |
| `PUT /trips/:tripId` | Replace a trip's `{ origin, destination, label }`; 404 if `tripId` isn't theirs |
| `DELETE /trips/:tripId` | Remove a trip; 404 if `tripId` isn't theirs |

The `/trips` routes exist alongside `PUT /`'s bulk `trips` array so a client
can add, rename or remove a single trip without re-sending the whole list —
useful once a rider has more than a couple saved. Requests and responses look
like:

```jsonc
// POST /trips  { "origin": {...}, "destination": {...}, "label": "Home to work" }
// -> 201
{ "success": true, "trip": { "id": "…", "origin": {...}, "destination": {...}, "label": "Home to work" }, "updatedAt": 1700000000000 }

// DELETE /trips/:tripId
// -> 200 { "success": true, "updatedAt": 1700000000000 }
// -> 404 { "success": false, "errorMessage": "Trip not found" } if tripId doesn't belong to this user
```

Mounted separately from `index.ts` because it is the only part of this service
that needs a session. The host owns the gate:

```ts
const BicingConfigApi = require('./apis/bicing-api/config-api');
app.use('/bicing/api/v2/config', requireAuth, BicingConfigApi);
app.use('/bicing/api/', BicingApi);
```

Keeping `requireAuth` there rather than in here means this repo never depends on
the host's better-auth instance — it only reads `req.session.user.id`, which the
host's middleware has already put on the request. If the router is ever mounted
without that gate it returns 401 rather than falling open.

`PUT` **rejects unknown keys** instead of dropping them: silently discarding a
key would let a newer client believe a setting was saved that an older server
never understood. It validates coordinate ranges, the zoom range, the enum
values, caps `savedStationIds` at 500 entries, and caps `trips` at 100 (the
same cap `POST /trips` enforces one create at a time). A trip's `label` must
be non-empty and at most 60 characters. `POST`/`PUT` on `/trips` reject a
client-supplied `id` — the server assigns it on create and takes it from the
URL on replace, so trusting a body-supplied one would invite mismatches.

Its `express.json()` is scoped to this router deliberately. negre.co-server
mounts better-auth's handler ahead of everything and that handler reads the raw
request body itself — a global JSON parser would leave the sign-in client
hanging with no error at all.

#### Config document

```jsonc
{
  "mapCenter": { "lat": 41.38, "lng": 2.17 } /* or null */,
  "mapZoom": 15 /* or null */,
  "resourceShown": "bikes" /* | "docks" */,
  "bikeTypeFilter": null /* | "mechanical" | "electrical" */,
  "bookmarks": { "home": null, "work": null, "favorite": null },
  "savedStationIds": [],
  "trips": [
    { "id": "…", "origin": { "lat": 41.38, "lng": 2.17 }, "destination": { "lat": 41.4, "lng": 2.15 }, "label": "Home to work" }
  ]
}
```

Device-specific state is deliberately **not** here — notably the live
geolocation fix the 2023 app kept in localStorage with a 2 h TTL. That describes
one device at one moment; syncing it would move a phone's position onto a
desktop. It stays client-side.

## Storage

SQLite via `better-sqlite3`, at `negre.co-server/data/bicing.db` — beside
`data/auth.db`, the only writable state on the droplet that survives a redeploy.
Override with `BICING_DB_PATH`. The file is created on first use, not on import,
so a machine that only serves the station feeds never grows a database.

One JSON document per user rather than a column per preference:

```sql
CREATE TABLE user_config (
  user_id     TEXT PRIMARY KEY,
  config      TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
)
```

The shape changes whenever the app grows a setting, and a document avoids a
schema migration each time. The trade-off is that SQL cannot query inside it —
which nothing here needs to do, since every read is "give me this user's row".
Reads merge the stored document over current defaults, so a row written before a
key existed comes back complete. An unparseable document falls back to defaults
rather than locking a user out of their own settings.

## Development

```
npm install
npm test           # vitest
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

There is no dev server here; run negre.co-server's `yarn dev` and hit
`/bicing/api/...`.

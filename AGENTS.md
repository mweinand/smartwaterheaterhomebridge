# Repository guide

## What this project does

This repository implements a local water-heater telemetry server and read-only
admin page for a Lowes Iris / EnergySmart water-heater controller. Device
updates are accepted and recorded; this is not currently a heater-control
system. The future ideas in [plan.md](plan.md), including queued commands,
scheduling, and Homebridge integration, are not implemented yet.

## Layout and request flow

- `docker-compose.yml` runs two services:
  - `proxy/` contains the Nginx TLS proxy. It terminates TLS on port 443 and
    forwards traffic to the water-heater server. Compose also publishes port
    80, though the current Nginx config has no port-80 listener.
  - `waterheaterserver/` is the Node.js/TypeScript Express application,
    listening on port 8001.
- `waterheaterserver/server.ts` creates the in-memory `WaterHeaterStore`,
  `CsvWriter`, and Express routers.
- `waterheaterserver/src/routes/ingest.ts` accepts device POSTs at
  `/~branecky/postAll.php`. `waterheater.ts` parses recognized controller
  fields using `mappings.ts`; updates retain previously received fields that
  are omitted from later requests.
- `waterheaterserver/src/routes/water-heaters.ts` exposes the in-memory
  read-only API: `GET /water-heaters` lists devices and
  `GET /water-heaters/:deviceId` returns one device's state.
- `waterheaterserver/src/csv-writer.ts` appends state snapshots under
  `waterheaterserver/logs/{deviceId}/`, serializes writes per device, and
  applies daily-file retention. The server's heater list is in memory and is
  cleared on restart; CSV logs are the persistent history.
- `waterheaterserver/admin/` is a separate React/Vite frontend. It polls
  `GET /water-heaters`; Vite proxies that API to `localhost:8001` in
  development. `src/routes/admin.ts` serves its built assets at `/admin/`.

## Development and verification

Use the Node version pinned in `waterheaterserver/.nvmrc` (currently Node
26.13.1). Install dependencies independently for the server and admin app:

```sh
npm ci --prefix waterheaterserver
npm ci --prefix waterheaterserver/admin
```

Useful commands:

```sh
npm --prefix waterheaterserver start
npm --prefix waterheaterserver/admin run dev
npm --prefix waterheaterserver test
npm --prefix waterheaterserver/admin test
npm --prefix waterheaterserver run test:admin
docker compose up --build -d
```

The server's `prestart` builds both server and admin assets. `test` builds the
TypeScript server before running Node's built-in test runner against
`waterheaterserver/test/*.test.js`. `test:admin` builds both applications and
runs the admin/server integration test; the admin package's `test` runs Vitest
for the React UI.

## Important behavior and constraints

- Heater state is volatile; do not mistake `lastUpdated` or presence in the
  list for a live connectivity check.
- Device IDs come from `DeviceText` and must match ASCII letters, digits,
  underscores, and hyphens. Keep validation in `src/device-id.ts` for all
  filesystem paths derived from a device ID.
- CSV timestamps and daily filenames use UTC. Credentials and unrecognized
  fields are not written to CSV; changes to the state schema should preserve
  this property. `CSV_LOG_RETENTION` must be a positive integer (default 90).
- The Express request logger currently records request bodies at debug level.
  Do not assume credentials are excluded from application logs just because
  they are excluded from CSV snapshots.
- The admin page and APIs have no authentication. Keep the service on a
  trusted local network; do not expose port 8001 or the proxy publicly.
- The proxy intentionally permits legacy TLS settings for the controller.
  These settings weaken TLS; consult `README.md` before changing or exposing
  the proxy.
- Both TypeScript projects use strict type checking. Server TypeScript is
  emitted as Node ESM; keep `.js` extensions on relative imports in server
  TypeScript source.
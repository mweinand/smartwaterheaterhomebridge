# smartwaterheaterhomebridge

Build and start the services with `docker compose up --build -d`. The water heater
server is available on port 8001.

View proxy access logs with `docker compose logs proxy`. The proxy logs TCP
connections, not individual HTTP requests.

## Admin UI

Open [http://localhost:8001/admin](http://localhost:8001/admin) to view the
water heaters seen by the server since it started. The table refreshes 20
seconds after each request finishes and retains the last successful data with a
warning if a refresh fails. Select a device ID to view its stored details; the
details page refreshes on the same schedule and shows `Unknown` for fields the
device has not reported. Both pages are read-only. Their in-memory data does
not establish whether a device is currently connected and is cleared when the
server restarts. The list API does not provide temperature units; the detail
page shows them only when reported by the device.

The admin UI and API do not require authentication. Do not expose port 8001
to untrusted networks.

For local development, use Node 26 (see `waterheaterserver/.nvmrc`) and run:

```sh
npm ci --prefix waterheaterserver
npm ci --prefix waterheaterserver/admin
npm --prefix waterheaterserver start
# In a second terminal:
npm --prefix waterheaterserver/admin run dev
```

Open the `/admin/` URL printed by Vite. Its development server proxies API
requests to the server on port 8001. To serve the production UI directly from
Express outside Docker, run `npm --prefix waterheaterserver run build:admin`
first. Docker Compose builds the frontend as part of the server image.

## Testing

Send a sample device update to the server:

```sh
curl -k -X POST https://energysmartwaterheater.com/ \
  -H 'Content-Type: application/json' \
  -d '{"DeviceText":"sample-device","Mode":"Electric","SetPoint":"120","Units":"F"}'
```

The server currently responds with `{"Success":"0"}`. This sample creates or
updates an in-memory device; it does not control a water heater.

Run the automated server tests with `npm --prefix waterheaterserver test`.
Run frontend tests with `npm --prefix waterheaterserver/admin test` and the
admin/server integration test with `npm --prefix waterheaterserver run test:admin`.

## State logs

Each successful update appends a state snapshot to
`waterheaterserver/logs/{deviceId}/{deviceId}-{YYYYmmdd}.csv`. Dates and the
`timestamp` column use UTC. Columns contain the recognized device state,
including previously received values omitted from an update; credentials and
unrecognized fields are excluded. Missing values are empty, and lists are
JSON-encoded within their CSV field. Device IDs must contain only ASCII letters,
digits, underscores, and hyphens.

Compose bind-mounts `waterheaterserver/logs` into the server container, so logs
remain on the host when the container is recreated and are ignored by Git.
Create the directory before starting Compose and ensure it is writable by the
container's non-root `node` user (UID 1000):

```sh
mkdir -p waterheaterserver/logs
# On Linux, if needed:
sudo chown 1000:1000 waterheaterserver/logs
```

The server keeps the newest 90 daily CSV files per device by default. Set
`CSV_LOG_RETENTION` to a positive integer before running Compose to change this
limit. Cleanup runs after each write and only removes older matching daily CSV
files for that device.

If writing or cleanup fails, the server logs the error and returns HTTP 500
instead of acknowledging the update. A cleanup error may occur after a row was
written, so retrying the update can produce a duplicate row.

## Quirks

### TLS

The proxy allows the legacy water-heater client to connect using TLS 1.0.
`proxy/nginx.conf` explicitly enables TLS 1.0 (and also lists SSLv3, TLS 1.1,
and TLS 1.2), and sets the cipher security level to 0 with
`@SECLEVEL=0`. This relaxes OpenSSL's security checks for older clients and
cryptographic algorithms. The proxy's self-signed certificate is also
generated with SHA-1 in `proxy/Dockerfile`.

These settings weaken TLS security and this proxy should not be exposed to the outside internet.

## Acknowledgements

Heavily based on:

- https://github.com/excaliburpartners/EnergySmartBridge
- https://github.com/mcurcio/energysmartbridge
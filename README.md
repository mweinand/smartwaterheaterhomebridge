# smartwaterheaterhomebridge

Build and start the services with `docker compose up --build -d`. The water heater
server is available on port 8001.

View proxy access logs with `docker compose logs proxy`. The proxy logs TCP
connections, not individual HTTP requests.

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
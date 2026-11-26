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
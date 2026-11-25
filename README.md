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

## Acknowledgements

Heavily based on:

- https://github.com/excaliburpartners/EnergySmartBridge
- https://github.com/mcurcio/energysmartbridge
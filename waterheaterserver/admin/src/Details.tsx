import { useCallback } from 'react';
import { formatDate } from './formatDate';
import { usePolling } from './usePolling';

type FieldValue = string | number | string[];
type HeaterDetails = Record<string, FieldValue | undefined> & { deviceId: string; lastUpdated: string };
type DetailField = { key: string; label: string; type: 'string' | 'number' | 'array'; temperature?: boolean };

const detailFields: DetailField[] = [
  { key: 'deviceId', label: 'Device ID', type: 'string' },
  { key: 'lastUpdated', label: 'Last updated', type: 'string' },
  { key: 'moduleAPI', label: 'Module API', type: 'string' },
  { key: 'moduleFirmwareVersion', label: 'Module firmware version', type: 'string' },
  { key: 'masterFirmwareVersion', label: 'Master firmware version', type: 'string' },
  { key: 'masterModelId', label: 'Master model ID', type: 'string' },
  { key: 'displayFirmwareVersion', label: 'Display firmware version', type: 'string' },
  { key: 'wifiFirmwareVersion', label: 'Wi-Fi firmware version', type: 'string' },
  { key: 'updateRate', label: 'Update rate', type: 'number' },
  { key: 'mode', label: 'Mode', type: 'string' },
  { key: 'setPoint', label: 'Set point', type: 'number', temperature: true },
  { key: 'units', label: 'Temperature units', type: 'string' },
  { key: 'leakDetected', label: 'Leak detected', type: 'string' },
  { key: 'maxSetPoint', label: 'Maximum set point', type: 'number', temperature: true },
  { key: 'grid', label: 'Grid', type: 'string' },
  { key: 'airFilterStatus', label: 'Air filter status', type: 'string' },
  { key: 'condensePumpFail', label: 'Condensate pump failure', type: 'string' },
  { key: 'availableModes', label: 'Available modes', type: 'array' },
  { key: 'systemInHeating', label: 'System in heating', type: 'string' },
  { key: 'hotWaterVolume', label: 'Hot water volume', type: 'string' },
  { key: 'leak', label: 'Leak', type: 'string' },
  { key: 'dryFire', label: 'Dry fire', type: 'string' },
  { key: 'elementFail', label: 'Element failure', type: 'string' },
  { key: 'tankSensorFail', label: 'Tank sensor failure', type: 'string' },
  { key: 'ecoError', label: 'ECO error', type: 'string' },
  { key: 'masterDisplayFail', label: 'Master display failure', type: 'string' },
  { key: 'systemSensorFail', label: 'System sensor failure', type: 'string' },
  { key: 'compSensorFail', label: 'Compressor sensor failure', type: 'string' },
  { key: 'systemFail', label: 'System failure', type: 'string' },
  { key: 'upperTemperature', label: 'Upper temperature', type: 'number', temperature: true },
  { key: 'lowerTemperature', label: 'Lower temperature', type: 'number', temperature: true },
  { key: 'faultCodes', label: 'Fault codes', type: 'string' },
  { key: 'unConnectNumber', label: 'Unconnect number', type: 'string' },
  { key: 'addressData', label: 'Address data', type: 'string' },
  { key: 'signalStrength', label: 'Signal strength', type: 'string' },
];

function parseHeaterDetails(value: unknown, deviceId: string): HeaterDetails {
  if (typeof value !== 'object' || value === null || !('success' in value) || value.success !== true
    || !('data' in value) || typeof value.data !== 'object' || value.data === null || Array.isArray(value.data)) {
    throw new Error('Invalid water heater response');
  }
  const data = value.data as Record<string, unknown>;
  if (data.deviceId !== deviceId || typeof data.lastUpdated !== 'string') {
    throw new Error('Invalid water heater response');
  }
  for (const field of detailFields) {
    const item = data[field.key];
    if (item === undefined) continue;
    const valid = field.type === 'array'
      ? Array.isArray(item) && item.every(part => typeof part === 'string')
      : field.type === 'number'
        ? typeof item === 'number' && Number.isFinite(item)
        : typeof item === 'string';
    if (!valid) throw new Error('Invalid water heater response');
  }
  return data as HeaterDetails;
}

export function Details({ deviceId }: { deviceId: string }) {
  const url = `/water-heaters/${encodeURIComponent(deviceId)}`;
  const parseDetailResponse = useCallback((value: unknown) => parseHeaterDetails(value, deviceId), [deviceId]);
  const { data: heater, error } = usePolling(url, parseDetailResponse, 'Water heater not found');

  return (
    <main>
      <header>
        <p><a href="/admin/">All water heaters</a></p>
        <h1>Water heater: {deviceId}</h1>
        <p>Data received by this server since it started. Refreshes 20 seconds after each request.</p>
      </header>
      {error && (
        <p role="alert" className="error">
          Could not refresh water heater: {error}.{heater !== null && ' Showing the last successful data, which may be stale.'}
        </p>
      )}
      {heater === null && !error && <p role="status">Loading water heater...</p>}
      {heater !== null && (
        <dl className="details">
          {detailFields.map(field => {
            const value = heater[field.key];
            let display: string;
            if (value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)) {
              display = 'Unknown';
            } else if (field.key === 'lastUpdated' && typeof value === 'string') {
              display = formatDate(value);
            } else if (Array.isArray(value)) {
              display = value.filter(part => part.trim() !== '').join(', ') || 'Unknown';
            } else {
              display = String(value);
              if (field.temperature && typeof heater.units === 'string' && heater.units.trim()) {
                display += ` ${heater.units}`;
              }
            }
            return <div key={field.key}><dt>{field.label}</dt><dd>{display}</dd></div>;
          })}
        </dl>
      )}
    </main>
  );
}

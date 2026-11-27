import { formatDate } from './formatDate';
import { usePolling } from './usePolling';

type WaterHeater = {
  deviceId: string;
  status?: string;
  setPoint?: number;
  lastUpdated: string;
};

function parseWaterHeaters(value: unknown): WaterHeater[] {
  if (!Array.isArray(value) || !value.every((item: unknown) => {
    if (typeof item !== 'object' || item === null) return false;
    const heater = item as Record<string, unknown>;
    return typeof heater.deviceId === 'string'
      && typeof heater.lastUpdated === 'string'
      && (heater.status === undefined || typeof heater.status === 'string')
      && (heater.setPoint === undefined || (typeof heater.setPoint === 'number' && Number.isFinite(heater.setPoint)));
  })) {
    throw new Error('Invalid water heater response');
  }
  return value as WaterHeater[];
}

export function WaterHeaterList() {
  const { data: heaters, error } = usePolling('/water-heaters', parseWaterHeaters);

  return (
    <main>
      <header>
        <h1>Water heaters</h1>
        <p>Devices seen by this server since it started. Refreshes 20 seconds after each request.</p>
      </header>
      {error && (
        <p role="alert" className="error">
          Could not refresh water heaters: {error}.{heaters !== null && ' Showing the last successful data, which may be stale.'}
        </p>
      )}
      {heaters === null && !error && <p role="status">Loading water heaters...</p>}
      {heaters !== null && (heaters.length === 0
        ? <p>No water heaters seen yet.</p>
        : <div className="table-container">
            <table>
              <thead><tr><th scope="col">Device ID</th><th scope="col">Mode</th><th scope="col">Set point</th><th scope="col">Last updated</th></tr></thead>
              <tbody>
                {heaters.map(heater => (
                  <tr key={heater.deviceId}>
                    <td><a href={`/admin/water-heaters/${encodeURIComponent(heater.deviceId)}`}>{heater.deviceId}</a></td>
                    <td>{heater.status || 'Unknown'}</td>
                    <td>{heater.setPoint ?? 'Unknown'}</td>
                    <td>{formatDate(heater.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>)}
    </main>
  );
}

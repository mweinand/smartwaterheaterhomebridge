import { useEffect, useState } from 'react';

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

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

export function App() {
  const [heaters, setHeaters] = useState<WaterHeater[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController;
    let timer: ReturnType<typeof setTimeout>;
    let timeout: ReturnType<typeof setTimeout>;

    async function refresh() {
      controller = new AbortController();
      let timedOut = false;
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 15_000);
      try {
        const response = await fetch('/water-heaters', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`Request failed (HTTP ${response.status})`);
        const data = parseWaterHeaters(await response.json());
        if (!disposed && !controller.signal.aborted) {
          setHeaters(data);
          setError(null);
        }
      } catch (reason) {
        if (!disposed) {
          setError(timedOut ? 'Request timed out' : reason instanceof Error ? reason.message : 'Unable to load water heaters');
        }
      } finally {
        clearTimeout(timeout);
        if (!disposed) timer = setTimeout(refresh, 20_000);
      }
    }

    void refresh();
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
      clearTimeout(timeout);
    };
  }, []);

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
                    <td>{heater.deviceId}</td>
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

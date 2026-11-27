import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from './App';

const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, '', '/admin/');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('renders returned fields, including missing values and a zero set point', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
    { deviceId: 'one', status: 'Hybrid', setPoint: 0, lastUpdated: '2026-01-01T00:00:00Z' },
    { deviceId: 'two', lastUpdated: 'invalid' },
  ])));
  await act(async () => { render(<App />); });
  expect(screen.getByText('one')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'one' }).getAttribute('href')).toBe('/admin/water-heaters/one');
  expect(screen.getByText('Hybrid')).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.getByText(new Date('2026-01-01T00:00:00Z').toLocaleString())).toBeTruthy();
  expect(screen.getAllByText('Unknown')).toHaveLength(3);
});

test('retains stale data on failed refresh and recovers on the next poll', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response([{ deviceId: 'one', lastUpdated: '2026-01-01T00:00:00Z' }]))
    .mockResolvedValueOnce(response({}, 500))
    .mockResolvedValueOnce(response([]));
  vi.stubGlobal('fetch', fetchMock);
  await act(async () => { render(<App />); });
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(screen.getByText('one')).toBeTruthy();
  expect(screen.getByRole('alert').textContent).toContain('may be stale');
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('No water heaters seen yet.')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test('reports invalid initial responses and retries', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response([{ deviceId: 'bad', setPoint: '120' }]))
    .mockResolvedValueOnce(response([])));
  await act(async () => { render(<App />); });
  expect(screen.getByRole('alert').textContent).toContain('Invalid water heater response');
  expect(screen.queryByText(/may be stale/)).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(screen.getByText('No water heaters seen yet.')).toBeTruthy();
});

test('does not overlap requests and aborts pending requests on unmount', async () => {
  let signal: AbortSignal | undefined;
  const fetchMock = vi.fn((_url: string, options: RequestInit) => {
    signal = options.signal ?? undefined;
    return new Promise<Response>(() => {});
  });
  vi.stubGlobal('fetch', fetchMock);
  const { unmount } = render(<App />);
  expect(screen.getByRole('status').textContent).toContain('Loading');
  await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('reports timed-out requests and retries', async () => {
  const fetchMock = vi.fn((_url: string, options: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
  vi.stubGlobal('fetch', fetchMock);
  await act(async () => { render(<App />); });
  await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
  expect(screen.getByRole('alert').textContent).toContain('Request timed out');
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('links to an encoded device URL and displays details from the per-device API', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([
    { deviceId: 'one two', lastUpdated: '2026-01-01T00:00:00Z' },
  ])));
  const { unmount } = render(<App />);
  await act(async () => {});
  const href = screen.getByRole('link', { name: 'one two' }).getAttribute('href');
  expect(href).toBe('/admin/water-heaters/one%20two');
  unmount();
  window.history.pushState(null, '', href);
  const fetchMock = vi.fn().mockResolvedValue(response({
    success: true,
    data: {
      deviceId: 'one two', lastUpdated: '2026-01-01T00:00:00Z', setPoint: 0,
      units: 'F', availableModes: ['Hybrid', 'Electric'], signalStrength: '-42',
    },
  }));
  vi.stubGlobal('fetch', fetchMock);
  await act(async () => { render(<App />); });
  expect(fetchMock.mock.calls[0][0]).toBe('/water-heaters/one%20two');
  expect(screen.getByRole('link', { name: 'All water heaters' }).getAttribute('href')).toBe('/admin/');
  expect(screen.getByText('Set point').nextElementSibling?.textContent).toBe('0 F');
  expect(screen.getByText('Available modes').nextElementSibling?.textContent).toBe('Hybrid, Electric');
  expect(screen.getByText('Signal strength').nextElementSibling?.textContent).toBe('-42');
  expect(screen.getByText('Upper temperature').nextElementSibling?.textContent).toBe('Unknown');
  expect(screen.getByText('Last updated').nextElementSibling?.textContent).toBe(new Date('2026-01-01T00:00:00Z').toLocaleString());
});

test('displays every known stored field without inventing temperature units', async () => {
  window.history.replaceState(null, '', '/admin/water-heaters/one');
  const fields: [string, string, string | number | string[]][] = [
    ['moduleAPI', 'Module API', 'api'], ['moduleFirmwareVersion', 'Module firmware version', 'module'],
    ['masterFirmwareVersion', 'Master firmware version', 'master'], ['masterModelId', 'Master model ID', 'model'],
    ['displayFirmwareVersion', 'Display firmware version', 'display'], ['wifiFirmwareVersion', 'Wi-Fi firmware version', 'wifi'],
    ['updateRate', 'Update rate', 15], ['mode', 'Mode', 'Hybrid'], ['setPoint', 'Set point', 0],
    ['units', 'Temperature units', ''], ['leakDetected', 'Leak detected', 'detected'],
    ['maxSetPoint', 'Maximum set point', 140], ['grid', 'Grid', 'grid'],
    ['airFilterStatus', 'Air filter status', 'filter'], ['condensePumpFail', 'Condensate pump failure', 'pump'],
    ['availableModes', 'Available modes', []], ['systemInHeating', 'System in heating', 'heating'],
    ['hotWaterVolume', 'Hot water volume', 'volume'], ['leak', 'Leak', 'leak'], ['dryFire', 'Dry fire', 'dry'],
    ['elementFail', 'Element failure', 'element'], ['tankSensorFail', 'Tank sensor failure', 'tank'],
    ['ecoError', 'ECO error', 'eco'], ['masterDisplayFail', 'Master display failure', 'master display'],
    ['systemSensorFail', 'System sensor failure', 'system sensor'], ['compSensorFail', 'Compressor sensor failure', 'compressor'],
    ['systemFail', 'System failure', 'system'], ['upperTemperature', 'Upper temperature', 110],
    ['lowerTemperature', 'Lower temperature', 100], ['faultCodes', 'Fault codes', 'fault'],
    ['unConnectNumber', 'Unconnect number', 'disconnect'], ['addressData', 'Address data', 'address'],
    ['signalStrength', 'Signal strength', 'signal'],
  ];
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({
    success: true,
    data: { deviceId: 'one', lastUpdated: '2026-01-01', ...Object.fromEntries(fields.map(([key, , value]) => [key, value])) },
  })));
  await act(async () => { render(<App />); });
  for (const [, label, value] of fields) {
    const expected = value === '' || Array.isArray(value) && value.length === 0 ? 'Unknown' : String(value);
    expect(screen.getByText(label).nextElementSibling?.textContent).toBe(expected);
  }
});

test('detail page retains stale data on failed refresh and recovers', async () => {
  window.history.replaceState(null, '', '/admin/water-heaters/one');
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(response({ success: true, data: { deviceId: 'one', lastUpdated: '2026-01-01', mode: 'Hybrid' } }))
    .mockResolvedValueOnce(response({}, 404))
    .mockResolvedValueOnce(response({ success: true, data: { deviceId: 'one', lastUpdated: '2026-01-02', mode: 'Electric' } }));
  vi.stubGlobal('fetch', fetchMock);
  await act(async () => { render(<App />); });
  expect(screen.getByText('Hybrid')).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(screen.getByRole('alert').textContent).toContain('Water heater not found');
  expect(screen.getByRole('alert').textContent).toContain('may be stale');
  expect(screen.getByText('Hybrid')).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('Electric')).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test.each([
  { success: true, data: { deviceId: 'other', lastUpdated: '2026-01-01' } },
  { success: true, data: { deviceId: 'one', lastUpdated: '2026-01-01', setPoint: '120' } },
  { success: true, data: { deviceId: 'one', lastUpdated: '2026-01-01', availableModes: [1] } },
  { success: false, data: { deviceId: 'one', lastUpdated: '2026-01-01' } },
])('rejects invalid detail responses', async invalid => {
  window.history.replaceState(null, '', '/admin/water-heaters/one');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(invalid)));
  await act(async () => { render(<App />); });
  expect(screen.getByRole('alert').textContent).toContain('Invalid water heater response');
  expect(screen.queryByText(/may be stale/)).toBeNull();
});

test('detail page reports an initial 404 and retries', async () => {
  window.history.replaceState(null, '', '/admin/water-heaters/one');
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(response({}, 404))
    .mockResolvedValueOnce(response({ success: true, data: { deviceId: 'one', lastUpdated: '2026-01-01' } })));
  await act(async () => { render(<App />); });
  expect(screen.getByRole('alert').textContent).toContain('Water heater not found');
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('Device ID').nextElementSibling?.textContent).toBe('one');
});

test('detail request is aborted on navigation and a new device does not show old data', async () => {
  window.history.replaceState(null, '', '/admin/water-heaters/one');
  let signal: AbortSignal | undefined;
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
    signal = options.signal ?? undefined;
    return new Promise<Response>(() => {});
  }));
  const { unmount } = render(<App />);
  expect(screen.getByRole('status').textContent).toContain('Loading');
  unmount();
  expect(signal?.aborted).toBe(true);
  window.history.pushState(null, '', '/admin/water-heaters/two');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Water heater: two' })).toBeTruthy();
  expect(screen.queryByText('one')).toBeNull();
});

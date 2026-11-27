import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from './App';

const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.useFakeTimers();
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

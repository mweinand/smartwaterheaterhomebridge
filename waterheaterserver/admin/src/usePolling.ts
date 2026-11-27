import { useEffect, useState } from 'react';

export function usePolling<T>(url: string, parse: (value: unknown) => T, notFoundMessage?: string) {
  const [data, setData] = useState<T | null>(null);
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
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (response.status === 404 && notFoundMessage) throw new Error(notFoundMessage);
        if (!response.ok) throw new Error(`Request failed (HTTP ${response.status})`);
        const result = parse(await response.json());
        if (!disposed && !controller.signal.aborted) {
          setData(result);
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
  }, [url, parse, notFoundMessage]);

  return { data, error };
}

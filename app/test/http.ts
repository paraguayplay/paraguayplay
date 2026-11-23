import { vi } from 'vitest';

export type Route = { method?: string; path: string | RegExp; status?: number; body?: unknown; networkError?: boolean };
export type Call = { method: string; path: string; body: any; headers: Record<string, string> };

/** Reemplaza fetch con respuestas fijas. La última ruta que coincide gana (permite sobrescribir). */
export function mockApi(routes: Route[]) {
  const calls: Call[] = [];
  const list = [...routes];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    calls.push({ method, path: url.pathname + url.search, body: init.body ? JSON.parse(String(init.body)) : undefined, headers });
    const r = [...list].reverse().find((x) => (x.method ?? 'GET') === method && (typeof x.path === 'string' ? x.path === url.pathname : x.path.test(url.pathname + url.search)));
    if (!r) throw new TypeError('Failed to fetch (sin ruta simulada: ' + method + ' ' + url.pathname + ')');
    if (r.networkError) throw new TypeError('Failed to fetch');
    const status = r.status ?? 200;
    return new Response(status === 204 || r.body === undefined ? null : JSON.stringify(r.body), { status, headers: { 'Content-Type': 'application/json' } });
  });
  vi.stubGlobal('fetch', fn);
  return { calls, add: (r: Route) => list.push(r) };
}

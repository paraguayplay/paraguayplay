import { useSession } from './session';

export const NETWORK_MSG = 'No pudimos conectar. Revisá tu internet e intentá de nuevo.';
export const TOO_MANY_MSG = 'Demasiados intentos. Esperá un minuto e intentá de nuevo.';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

type Opts = { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal };

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const { token } = useSession.getState();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token && opts.auth !== false) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError(NETWORK_MSG, 0, 'network');
  }

  if (res.status === 204) return undefined as T;
  let data: any = null;
  try { data = await res.json(); } catch { /* sin cuerpo */ }

  if (res.ok) return data as T;

  if (res.status === 401 && token && opts.auth !== false) useSession.getState().expire('other_device');
  const message = data?.message ?? (res.status === 429 ? TOO_MANY_MSG : NETWORK_MSG);
  throw new ApiError(message, res.status, data?.code, data);
}

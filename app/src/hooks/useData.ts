import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Plan, PublicSettings } from '../lib/types';

/** Pide un recurso al montar. Simple: sin caché compartida. */
export function useGet<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!path) return;
    let live = true;
    setError(null);
    api<T>(path).then((d) => live && setData(d)).catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [path, n]);
  return { data, error, reload: () => setN((x) => x + 1) };
}

export const usePlans = () => useGet<Plan[]>('/plans');
export const useSettings = () => useGet<PublicSettings>('/settings/public');

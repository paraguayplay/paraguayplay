import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { loadCatalog, saveCatalog } from '../lib/catalogCache';
import type { Catalog } from '../lib/types';
import { refreshMe } from './useMe';

/** Catálogo: al instante desde la caché, luego actualizado desde el servidor. */
export function useCatalog() {
  const nav = useNavigate();
  const [data, setData] = useState<Catalog | null>(() => loadCatalog());
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const c = await api<Catalog>('/catalog');
      saveCatalog(c);
      setData(c); setOffline(false);
    } catch (e) {
      const x = e as ApiError;
      if (x.code === 'subscription_inactive') { refreshMe(); nav('/planes', { replace: true }); return; }
      if (x.status === 401) return; // la sesión se cerró; las rutas llevan a /entrar
      if (loadCatalog()) setOffline(true); else setError(x.message);
    } finally { setLoading(false); }
  }, [nav]);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, offline, error, reload };
}

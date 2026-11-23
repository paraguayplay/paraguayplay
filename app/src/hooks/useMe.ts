import { useEffect } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import type { Me } from '../lib/types';

export const ME_INTERVAL_MS = 45_000;

export async function refreshMe(): Promise<Me | null> {
  if (!useSession.getState().token) return null;
  try {
    const me = await api<Me>('/me');
    useSession.getState().setMe(me);
    return me;
  } catch {
    return null; // 401 ya cerró la sesión dentro de api(); otros errores se reintentan en el próximo ciclo
  }
}

/** Mantiene `me` al día: al montar, cada 45 s y al volver a la pestaña. */
export function useMe() {
  const token = useSession((s) => s.token);
  useEffect(() => {
    if (!token) return;
    refreshMe();
    const id = setInterval(refreshMe, ME_INTERVAL_MS);
    const onVis = () => { if (document.visibilityState === 'visible') refreshMe(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [token]);
}

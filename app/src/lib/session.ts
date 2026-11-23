import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, Me } from './types';

export const CATALOG_KEY = 'ppt.catalog';

type SessionState = {
  token: string | null;
  sessionKey: string | null;
  me: Me | null;
  endedReason: 'other_device' | null;
  signIn(r: AuthResponse): void;
  setMe(me: Me): void;
  expire(reason: 'other_device'): void;
  signOut(): void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      sessionKey: null,
      me: null,
      endedReason: null,
      signIn: (r) => set({ token: r.token, sessionKey: r.session_key, me: r.user, endedReason: null }),
      setMe: (me) => set({ me }),
      expire: (reason) => {
        localStorage.removeItem(CATALOG_KEY);
        set({ token: null, sessionKey: null, me: null, endedReason: reason });
      },
      signOut: () => {
        localStorage.removeItem(CATALOG_KEY);
        set({ token: null, sessionKey: null, me: null, endedReason: null });
      },
    }),
    { name: 'ppt.session', partialize: (s) => ({ token: s.token, sessionKey: s.sessionKey, me: s.me }) },
  ),
);

import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSession } from './lib/session';
import { destinationFor } from './lib/destination';
import type { Me } from './lib/types';
import { useMe } from './hooks/useMe';
import { screens } from './screens';

type Rule = (me: Me) => string | null;

/** Pantallas que piden sesión: sin sesión van a /entrar?next=…; si la regla devuelve una ruta, redirige ahí. */
function Guard({ rule, children }: { rule?: Rule; children: ReactNode }) {
  const { token, me } = useSession();
  const loc = useLocation();
  if (!token || !me) return <Navigate to={`/entrar?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  const to = rule?.(me);
  return to && to !== loc.pathname ? <Navigate to={to} replace /> : <>{children}</>;
}

/** Pantallas públicas: con sesión ya abierta, se va al destino (o a ?next). */
function PublicOnly({ children }: { children: ReactNode }) {
  const me = useSession((s) => s.me);
  const token = useSession((s) => s.token);
  const loc = useLocation();
  if (token && me) {
    const next = new URLSearchParams(loc.search).get('next');
    return <Navigate to={next && next.startsWith('/') ? next : destinationFor(me)} replace />;
  }
  return <>{children}</>;
}

const active: Rule = (me) => (me.subscription.status === 'active' ? null : destinationFor(me));
const notSuspended: Rule = (me) => (me.subscription.status === 'suspended' ? '/suspendida' : null);
const inReview: Rule = (me) => (me.pending_request && me.subscription.status !== 'active' && me.subscription.status !== 'suspended' ? null : destinationFor(me));
const suspended: Rule = (me) => (me.subscription.status === 'suspended' ? null : destinationFor(me));

export function AppRoutes() {
  useMe();
  const S = screens;
  return (
    <Routes>
      <Route path="/entrar" element={<PublicOnly><S.Login /></PublicOnly>} />
      <Route path="/registro" element={<PublicOnly><S.Register /></PublicOnly>} />
      <Route path="/recuperar" element={<S.Forgot />} />
      <Route path="/restablecer" element={<S.Reset />} />

      <Route path="/planes" element={<Guard rule={notSuspended}><S.Plans /></Guard>} />
      <Route path="/pagar/:id" element={<Guard rule={notSuspended}><S.Pay /></Guard>} />
      <Route path="/en-revision" element={<Guard rule={inReview}><S.InReview /></Guard>} />
      <Route path="/suspendida" element={<Guard rule={suspended}><S.Suspended /></Guard>} />

      <Route path="/" element={<Guard rule={active}><S.Home /></Guard>} />
      <Route path="/categorias" element={<Guard rule={active}><S.Categories /></Guard>} />
      <Route path="/agenda" element={<Guard rule={active}><S.Agenda /></Guard>} />
      <Route path="/buscar" element={<Guard rule={active}><S.Search /></Guard>} />
      <Route path="/evento/:id" element={<Guard rule={active}><S.EventDetail /></Guard>} />
      <Route path="/ver/:id" element={<Guard rule={active}><S.Player /></Guard>} />

      <Route path="/perfil" element={<Guard rule={notSuspended}><S.Profile /></Guard>} />
      <Route path="/perfil/historial" element={<Guard rule={notSuspended}><S.History /></Guard>} />
      <Route path="/perfil/contrasena" element={<Guard rule={notSuspended}><S.ChangePassword /></Guard>} />
      <Route path="/vincular" element={<Guard><S.LinkTv /></Guard>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

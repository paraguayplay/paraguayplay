import type { Me } from './types';

export type Destination = '/entrar' | '/planes' | '/en-revision' | '/suspendida' | '/';

/** A qué pantalla corresponde ir según el estado de la cuenta (spec §6.2). */
export function destinationFor(me: Me | null): Destination {
  if (!me) return '/entrar';
  const { status } = me.subscription;
  if (status === 'suspended') return '/suspendida';
  if (status === 'active') return '/';
  if (me.pending_request) return '/en-revision';
  return '/planes';
}

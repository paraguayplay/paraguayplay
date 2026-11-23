import { destinationFor } from './destination';
import { mePending, meInReview, meActive, meExpired, meExpiredInReview, meSuspended } from '../../test/fixtures/me';

test.each([
  ['sin sesión', null, '/entrar'],
  ['pendiente sin solicitud', mePending, '/planes'],
  ['pendiente con solicitud', meInReview, '/en-revision'],
  ['vencida con solicitud', meExpiredInReview, '/en-revision'],
  ['vencida', meExpired, '/planes'],
  ['suspendida', meSuspended, '/suspendida'],
  ['activa', meActive, '/'],
] as const)('%s', (_n, me, dest) => expect(destinationFor(me as any)).toBe(dest));

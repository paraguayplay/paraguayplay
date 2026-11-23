import { render, act } from '@testing-library/react';
import { useMe } from './useMe';
import { useSession } from '../lib/session';
import { mockApi } from '../../test/http';
import { meActive } from '../../test/fixtures/me';

function Probe() { useMe(); return null; }

beforeEach(() => { localStorage.clear(); useSession.getState().signOut(); });
afterEach(() => vi.useRealTimers());

test('consulta /me al montar y cada 45 s', async () => {
  vi.useFakeTimers();
  const m = mockApi([{ path: '/api/me', body: meActive }]);
  useSession.getState().signIn({ token: 'T', session_key: 'K', user: meActive });
  render(<Probe />);
  await act(async () => { await vi.advanceTimersByTimeAsync(10); });
  expect(m.calls.filter((c) => c.path === '/api/me')).toHaveLength(1);
  await act(async () => { await vi.advanceTimersByTimeAsync(45_000); });
  expect(m.calls.filter((c) => c.path === '/api/me')).toHaveLength(2);
});

test('un 401 cierra la sesión por otro dispositivo', async () => {
  mockApi([{ path: '/api/me', status: 401, body: { message: 'Unauthenticated.' } }]);
  useSession.getState().signIn({ token: 'T', session_key: 'K', user: meActive });
  render(<Probe />);
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  expect(useSession.getState().token).toBeNull();
  expect(useSession.getState().endedReason).toBe('other_device');
});

test('sin sesión no consulta', async () => {
  const m = mockApi([{ path: '/api/me', body: meActive }]);
  render(<Probe />);
  await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
  expect(m.calls).toHaveLength(0);
});

import { screen, act } from '@testing-library/react';
import { renderAt } from '../../../test/render';
import { mockApi } from '../../../test/http';
import { useSession } from '../../lib/session';
import { meActive } from '../../../test/fixtures/me';

beforeEach(() => { localStorage.clear(); useSession.getState().signOut(); document.documentElement.classList.add('tv'); vi.useFakeTimers({ shouldAdvanceTime: true }); });
afterEach(() => { document.documentElement.classList.remove('tv'); vi.useRealTimers(); });

const created = (code: string) => ({ code, qr_url: `https://ppt.example/vincular?code=${code}`, expires_at: '2026-11-23T01:00:00Z' });

test('muestra el código, consulta cada 3 s y entra al aprobarse', async () => {
  const m = mockApi([{ method: 'POST', path: '/api/auth/tv-code', status: 201, body: created('K7M4QZ') }, { path: '/api/auth/tv-code/K7M4QZ', body: { status: 'waiting' } }, { path: '/api/me', body: meActive }, { path: '/api/catalog', body: { live: [], upcoming: [], categories: [] } }]);
  renderAt('/entrar');
  expect(await screen.findByText('K7M-4QZ')).toBeInTheDocument();
  expect(m.calls[0].body.device_name).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(m.calls.filter((c) => c.path === '/api/auth/tv-code/K7M4QZ')).toHaveLength(1);
  m.add({ path: '/api/auth/tv-code/K7M4QZ', body: { status: 'approved', token: 'TV1', session_key: 'SK', user: meActive } });
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(useSession.getState().token).toBe('TV1');
  expect(useSession.getState().sessionKey).toBe('SK');
});

test('si el código vence, pide uno nuevo solo', async () => {
  const m = mockApi([{ method: 'POST', path: '/api/auth/tv-code', status: 201, body: created('AAA222') }, { path: '/api/auth/tv-code/AAA222', status: 410, body: { code: 'code_expired', message: 'x' } }]);
  renderAt('/entrar');
  expect(await screen.findByText('AAA-222')).toBeInTheDocument();
  m.add({ method: 'POST', path: '/api/auth/tv-code', status: 201, body: created('BBB333') });
  m.add({ path: '/api/auth/tv-code/BBB333', body: { status: 'waiting' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(await screen.findByText('BBB-333')).toBeInTheDocument();
});

test('"Usar correo y contraseña" muestra el formulario', async () => {
  mockApi([{ method: 'POST', path: '/api/auth/tv-code', status: 201, body: created('K7M4QZ') }, { path: '/api/auth/tv-code/K7M4QZ', body: { status: 'waiting' } }]);
  renderAt('/entrar');
  (await screen.findByRole('button', { name: 'Usar correo y contraseña' })).click();
  expect(await screen.findByLabelText('Correo')).toBeInTheDocument();
});

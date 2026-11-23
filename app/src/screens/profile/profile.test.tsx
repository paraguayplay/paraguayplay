import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../../../test/render';
import { mockApi } from '../../../test/http';
import { useSession } from '../../lib/session';
import { meActive } from '../../../test/fixtures/me';
import { settings } from '../../../test/fixtures/plans';

beforeEach(() => { localStorage.clear(); useSession.getState().signOut(); useSession.getState().signIn({ token: 'T', session_key: 'K', user: meActive }); });

test('perfil activo muestra días y vencimiento', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/settings/public', body: settings }]);
  renderAt('/perfil');
  expect(await screen.findByText('18')).toBeInTheDocument();
  expect(screen.getByText('Vence el 10 de diciembre')).toBeInTheDocument();
  expect(screen.getByText('Activa')).toBeInTheDocument();
  expect(screen.getByText('Plan Mensual')).toBeInTheDocument();
});

test('renovar lleva a planes', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/settings/public', body: settings }, { path: '/api/plans', body: [] }]);
  renderAt('/perfil');
  await userEvent.click(await screen.findByRole('button', { name: 'Renovar' }));
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/planes'));
});

test('cerrar sesión limpia aunque el servidor falle', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/settings/public', body: settings }, { method: 'POST', path: '/api/auth/logout', status: 500, body: {} }]);
  renderAt('/perfil');
  await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
  await waitFor(() => expect(useSession.getState().token).toBeNull());
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/entrar'));
});

test('historial muestra estado y nota', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/plan-requests', body: [
    { id: 130, plan: { id: 2, name: 'Mensual', price_gs: 20000, duration_days: 30 }, amount_gs: 20000, status: 'rejected', note: 'No llegó la transferencia', resulting_expires_at: null, reviewed_at: '2026-11-21T12:00:00Z', created_at: '2026-11-20T12:00:00Z' },
    { id: 120, plan: { id: 1, name: 'Semanal', price_gs: 5000, duration_days: 7 }, amount_gs: 5000, status: 'approved', note: null, resulting_expires_at: '2026-11-10T12:00:00Z', reviewed_at: '2026-11-03T12:00:00Z', created_at: '2026-11-03T10:00:00Z' },
  ] }]);
  renderAt('/perfil/historial');
  expect(await screen.findByText('Rechazada')).toBeInTheDocument();
  expect(screen.getByText('No llegó la transferencia')).toBeInTheDocument();
  expect(screen.getByText('Aprobada')).toBeInTheDocument();
});

test('cambiar contraseña', async () => {
  const m = mockApi([{ path: '/api/me', body: meActive }, { method: 'PUT', path: '/api/me/password', status: 204 }]);
  renderAt('/perfil/contrasena');
  await userEvent.type(await screen.findByLabelText('Contraseña actual'), 'vieja1234');
  await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'nueva12345');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument();
  expect(m.calls.find((c) => c.method === 'PUT')!.body).toEqual({ current_password: 'vieja1234', password: 'nueva12345', password_confirmation: 'nueva12345' });
});

test('vincular TV con el código del QR', async () => {
  const m = mockApi([{ path: '/api/me', body: meActive }, { method: 'POST', path: '/api/auth/tv-code/K7M4QZ/confirm', body: { message: 'Listo. Tu TV ya está conectado. Esta sesión del celular se cerró.' } }]);
  renderAt('/vincular?code=k7m4qz');
  expect(await screen.findByText('K7M-4QZ')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Vincular este televisor' }));
  expect(await screen.findByText('Listo. Tu TV ya está conectado. Esta sesión del celular se cerró.')).toBeInTheDocument();
  expect(m.calls.some((c) => c.path === '/api/auth/tv-code/K7M4QZ/confirm')).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar de nuevo en este celular' }));
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/entrar'));
});

test('vincular escribiendo el código a mano', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { method: 'POST', path: '/api/auth/tv-code/ABC234/confirm', body: { message: 'ok' } }]);
  renderAt('/vincular');
  const input = await screen.findByLabelText('Código del televisor');
  await userEvent.type(input, 'abc-234');
  expect(screen.getByText('ABC-234')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Vincular este televisor' })).toBeEnabled();
});

test('código vencido', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { method: 'POST', path: /tv-code\/.*\/confirm/, status: 410, body: { code: 'code_expired', message: 'x' } }]);
  renderAt('/vincular?code=K7M4QZ');
  await userEvent.click(await screen.findByRole('button', { name: 'Vincular este televisor' }));
  expect(await screen.findByText('El código venció. Mirá el código nuevo en el TV.')).toBeInTheDocument();
});

import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../../../test/render';
import { mockApi } from '../../../test/http';
import { useSession } from '../../lib/session';
import { mePending } from '../../../test/fixtures/me';

const ok = { token: 'T', session_key: 'K', user: mePending };

beforeEach(() => { localStorage.clear(); useSession.getState().signOut(); });

async function fillLogin() {
  await userEvent.type(screen.getByLabelText('Correo'), 'juan@x.com');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123');
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

test('login correcto lleva a planes', async () => {
  const m = mockApi([{ method: 'POST', path: '/api/auth/login', body: ok }, { path: '/api/me', body: mePending }, { path: '/api/plans', body: [] }, { path: '/api/settings/public', body: {} }]);
  renderAt('/entrar');
  await fillLogin();
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/planes'));
  expect(m.calls[0].body).toMatchObject({ email: 'juan@x.com', password: 'secreto123' });
  expect(m.calls[0].body.device_name).toBeTruthy();
});

test('409 pregunta y "Usar en este celular" reintenta con force', async () => {
  const m = mockApi([
    { method: 'POST', path: '/api/auth/login', status: 409, body: { code: 'other_device_active', message: 'Tu cuenta está abierta en otro dispositivo (Smart TV · Living).', device: 'Smart TV · Living' } },
    { path: '/api/me', body: mePending }, { path: '/api/plans', body: [] }, { path: '/api/settings/public', body: {} },
  ]);
  renderAt('/entrar');
  await fillLogin();
  expect(await screen.findByText('Tu cuenta ya está abierta')).toBeInTheDocument();
  expect(screen.getByText('Smart TV · Living')).toBeInTheDocument();
  m.add({ method: 'POST', path: '/api/auth/login', body: ok });
  await userEvent.click(screen.getByRole('button', { name: 'Usar en este celular' }));
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/planes'));
  expect(m.calls.filter((c) => c.path === '/api/auth/login')[1].body.force).toBe(true);
});

test('credenciales incorrectas muestran el mensaje del servidor', async () => {
  mockApi([{ method: 'POST', path: '/api/auth/login', status: 422, body: { code: 'invalid_credentials', message: 'Correo o contraseña incorrectos.' } }]);
  renderAt('/entrar');
  await fillLogin();
  expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
});

test('429 muestra demasiados intentos y el botón vuelve a habilitarse', async () => {
  mockApi([{ method: 'POST', path: '/api/auth/login', status: 429 }]);
  renderAt('/entrar');
  await fillLogin();
  expect(await screen.findByText('Demasiados intentos. Esperá un minuto e intentá de nuevo.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled();
});

test('registro manda la confirmación igual a la contraseña y el dispositivo', async () => {
  const m = mockApi([{ method: 'POST', path: '/api/auth/register', status: 201, body: ok }, { path: '/api/me', body: mePending }, { path: '/api/plans', body: [] }, { path: '/api/settings/public', body: {} }]);
  renderAt('/registro');
  await userEvent.type(screen.getByLabelText('Nombre y apellido'), 'Juan Benítez');
  await userEvent.type(screen.getByLabelText('Correo'), 'juan@x.com');
  await userEvent.type(screen.getByLabelText('Teléfono / WhatsApp'), '0981234567');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123');
  const go = screen.getByRole('button', { name: 'Continuar' });
  expect(go).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(go);
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/planes'));
  const body = m.calls.find((c) => c.path === '/api/auth/register')!.body;
  expect(body).toMatchObject({ name: 'Juan Benítez', email: 'juan@x.com', phone: '0981234567', password: 'secreto123', password_confirmation: 'secreto123' });
  expect(body.device_name).toBeTruthy();
});

test('olvidé mi contraseña muestra el mensaje del servidor', async () => {
  mockApi([{ method: 'POST', path: '/api/auth/forgot-password', body: { message: 'Si el correo está registrado, te enviamos un enlace.' } }]);
  renderAt('/recuperar');
  await userEvent.type(screen.getByLabelText('Correo'), 'juan@x.com');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  expect(await screen.findByText('Si el correo está registrado, te enviamos un enlace.')).toBeInTheDocument();
});

test('restablecer con token inválido ofrece pedir otro enlace', async () => {
  const m = mockApi([{ method: 'POST', path: '/api/auth/reset-password', status: 422, body: { code: 'invalid_reset_token', message: 'El enlace no es válido o ya venció.' } }]);
  renderAt('/restablecer?token=abc&email=juan%40x.com');
  await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'otraClave99');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
  expect(await screen.findByText('El enlace no es válido o ya venció.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/recuperar');
  expect(m.calls[0].body).toMatchObject({ email: 'juan@x.com', token: 'abc', password: 'otraClave99', password_confirmation: 'otraClave99' });
});

test('restablecer correcto invita a entrar', async () => {
  mockApi([{ method: 'POST', path: '/api/auth/reset-password', body: { message: 'ok' } }]);
  renderAt('/restablecer?token=abc&email=juan%40x.com');
  await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'otraClave99');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }));
  expect(await screen.findByText('Listo, ya podés entrar con tu nueva contraseña.')).toBeInTheDocument();
});

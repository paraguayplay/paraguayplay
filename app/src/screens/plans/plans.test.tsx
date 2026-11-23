import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../../../test/render';
import { mockApi } from '../../../test/http';
import { useSession } from '../../lib/session';
import { mePending, meExpired, meInReview, meSuspended } from '../../../test/fixtures/me';
import { plans, settings, createdRequest } from '../../../test/fixtures/plans';

const base = [{ path: '/api/plans', body: plans }, { path: '/api/settings/public', body: settings }];
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); useSession.getState().signOut(); });
const login = (me: any) => useSession.getState().signIn({ token: 'T', session_key: 'K', user: me });

test('elegir Anual crea la solicitud y va a pagar', async () => {
  const m = mockApi([...base, { path: '/api/me', body: mePending }, { method: 'POST', path: '/api/plan-requests', status: 201, body: createdRequest(9) }]);
  login(mePending);
  renderAt('/planes');
  expect(await screen.findByText('Elegí tu plan')).toBeInTheDocument();
  expect(screen.getByText('MÁS ELEGIDO')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: /Anual/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar con Anual' }));
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/pagar/9'));
  expect(m.calls.find((c) => c.method === 'POST')!.body).toEqual({ plan_id: 9 });
});

test('cuenta vencida ve "Tu plan venció"', async () => {
  mockApi([...base, { path: '/api/me', body: meExpired }]);
  login(meExpired);
  renderAt('/planes');
  expect(await screen.findByText('Tu plan venció')).toBeInTheDocument();
});

test('cuenta suspendida al pedir plan va a suspendida', async () => {
  const m = mockApi([...base, { path: '/api/me', body: mePending }, { method: 'POST', path: '/api/plan-requests', status: 403, body: { code: 'account_suspended', message: 'Tu cuenta está suspendida. Contacta a soporte.' } }]);
  login(mePending);
  renderAt('/planes');
  const btn = await screen.findByRole('button', { name: /Continuar con/ });
  m.add({ path: '/api/me', body: meSuspended }); // el admin la suspendió mientras tanto
  await userEvent.click(btn);
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/suspendida'));
});

test('pagar usa el enlace de WhatsApp que devolvió el servidor', async () => {
  mockApi([...base, { path: '/api/me', body: mePending }, { method: 'POST', path: '/api/plan-requests', status: 201, body: createdRequest(9) }]);
  login(mePending);
  renderAt('/planes');
  await userEvent.click(await screen.findByRole('radio', { name: /Anual/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Continuar con Anual' }));
  const wa = await screen.findByRole('link', { name: /Enviar comprobante por WhatsApp/ });
  expect(wa).toHaveAttribute('href', createdRequest(9).whatsapp_url);
  expect(screen.getByText('Gs 240.000')).toBeInTheDocument();
  expect(screen.getByText('Banco Continental')).toBeInTheDocument();
  expect(screen.getByText('Gracias por tu compra')).toBeInTheDocument();
});

test('pagar sin la solicitud guardada arma el enlace con el número de solicitud', async () => {
  mockApi([...base, { path: '/api/me', body: meInReview }]);
  login(meInReview);
  renderAt('/pagar/128');
  const wa = await screen.findByRole('link', { name: /Enviar comprobante por WhatsApp/ });
  const href = wa.getAttribute('href')!;
  expect(href.startsWith('https://wa.me/595981123456?text=')).toBe(true);
  expect(decodeURIComponent(href.split('text=')[1])).toContain('Solicitud N.º 128');
  expect(decodeURIComponent(href.split('text=')[1])).toContain('Plan: Mensual (Gs 20.000)');
});

test('en revisión muestra la solicitud pendiente', async () => {
  mockApi([...base, { path: '/api/me', body: meInReview }]);
  login(meInReview);
  renderAt('/');
  expect(await screen.findByText('¡Recibimos tu pedido!')).toBeInTheDocument();
  expect(screen.getByText('N.º 128')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Reenviar comprobante/ })).toBeInTheDocument();
});

test('copiar un dato del banco', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  mockApi([...base, { path: '/api/me', body: meInReview }]);
  login(meInReview);
  renderAt('/pagar/128');
  await userEvent.click(await screen.findByRole('button', { name: 'Copiar Cuenta' }));
  expect(writeText).toHaveBeenCalledWith('1234-567890');
  expect(await screen.findByText('Copiado')).toBeInTheDocument();
});

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../../../test/render';
import { mockApi } from '../../../test/http';
import { useSession } from '../../lib/session';
import { saveCatalog } from '../../lib/catalogCache';
import { meActive } from '../../../test/fixtures/me';
import { catalog, emptyCatalog } from '../../../test/fixtures/catalog';

beforeEach(() => { localStorage.clear(); useSession.getState().signOut(); useSession.getState().signIn({ token: 'T', session_key: 'K', user: meActive }); });

test('inicio muestra destacado, en vivo y próximos con hora de Paraguay', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }]);
  renderAt('/');
  expect(await screen.findByRole('heading', { name: 'Final Copa Interbarrios 2026' })).toBeInTheDocument();
  expect(screen.getByText('Festival de Polca y Guarania')).toBeInTheDocument();
  expect(screen.getByText('Noche de Rock Paraguayo')).toBeInTheDocument();
  expect(screen.getByText(/20:00/)).toBeInTheDocument();
});

test('chip de categoría filtra las filas', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }]);
  renderAt('/');
  await screen.findByText('Festival de Polca y Guarania');
  await userEvent.click(screen.getByRole('button', { name: 'Religiosos' }));
  expect(screen.queryByText('Festival de Polca y Guarania')).not.toBeInTheDocument();
  expect(screen.getAllByText('Culto de Domingo').length).toBeGreaterThan(0);
});

test('sin internet con caché: muestra lo guardado y el aviso', async () => {
  saveCatalog(catalog);
  mockApi([{ path: '/api/me', networkError: true }, { path: '/api/catalog', networkError: true }]);
  renderAt('/');
  expect(await screen.findByText('Sin conexión · mostrando lo último guardado')).toBeInTheDocument();
  expect(screen.getByText('Festival de Polca y Guarania')).toBeInTheDocument();
});

test('sin internet y sin caché: error con Reintentar que vuelve a pedir', async () => {
  const m = mockApi([{ path: '/api/me', networkError: true }, { path: '/api/catalog', networkError: true }]);
  renderAt('/');
  const retry = await screen.findByRole('button', { name: 'Reintentar' });
  m.add({ path: '/api/catalog', body: catalog });
  await userEvent.click(retry);
  expect(await screen.findByText('Festival de Polca y Guarania')).toBeInTheDocument();
});

test('catálogo vacío', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: emptyCatalog }]);
  renderAt('/');
  expect(await screen.findByText('Todavía no hay eventos. Volvé pronto.')).toBeInTheDocument();
});

test('403 de suscripción manda a planes', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', status: 403, body: { code: 'subscription_inactive', message: 'Tu suscripción no está activa.' } }, { path: '/api/plans', body: [] }, { path: '/api/settings/public', body: {} }]);
  renderAt('/');
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/planes'));
});

test('detalle de un evento que aún no empezó', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }]);
  renderAt('/evento/4');
  expect(await screen.findByRole('heading', { name: 'Noche de Rock Paraguayo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Empieza el Sáb 28 · 20:00' })).toBeDisabled();
});

test('detalle en vivo lleva al reproductor', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }]);
  renderAt('/evento/1');
  await userEvent.click(await screen.findByRole('button', { name: 'Ver en vivo' }));
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/ver/1'));
});

test('agenda agrupa los próximos por día', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }]);
  renderAt('/agenda');
  expect(await screen.findByText('Sábado 28 de noviembre')).toBeInTheDocument();
  expect(screen.getByText('Domingo 29 de noviembre')).toBeInTheDocument();
});

test('categorías muestra una sección por categoría', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }]);
  renderAt('/categorias');
  expect(await screen.findByRole('heading', { name: 'Deportes' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Religiosos' })).toBeInTheDocument();
});

test('buscar filtra por texto', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }]);
  renderAt('/buscar');
  await userEvent.type(await screen.findByLabelText('Buscar eventos'), 'futsal');
  expect(await screen.findByText('Clásico de Futsal')).toBeInTheDocument();
  expect(screen.queryByText('Culto de Domingo')).not.toBeInTheDocument();
});

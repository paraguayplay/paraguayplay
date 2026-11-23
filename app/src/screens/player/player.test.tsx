import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAt } from '../../../test/render';
import { mockApi } from '../../../test/http';
import { useSession } from '../../lib/session';
import { meActive } from '../../../test/fixtures/me';
import { catalog } from '../../../test/fixtures/catalog';
import fx from '../../../test/fixtures/play.json';
import { shakaConfig } from './shaka';

const engine = vi.hoisted(() => ({
  loads: [] as string[],
  failFirst: true,
  destroy: vi.fn(async () => {}),
}));
vi.mock('./shaka', async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    createEngine: (_video: HTMLVideoElement) => ({
      load: async (link: { url: string }) => {
        engine.loads.push(link.url);
        if (engine.failFirst && engine.loads.length === 1) throw new Error('fallo de red');
      },
      destroy: engine.destroy,
    }),
  };
});

beforeEach(() => {
  engine.loads = []; engine.failFirst = true; engine.destroy.mockClear();
  localStorage.clear();
  useSession.getState().signOut();
  useSession.getState().signIn({ token: 'T', session_key: fx.session_key, user: meActive });
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/catalog', body: catalog }, { path: '/api/events/1/play', body: { event: fx.event, payload: fx.payload, iv: fx.iv } }]);
});

test('si el primer servidor falla, ofrece el siguiente y lo carga', async () => {
  renderAt('/ver/1');
  const next = await screen.findByRole('button', { name: 'Probar Servidor 2' });
  expect(screen.getByText('No se pudo cargar este servidor')).toBeInTheDocument();
  await userEvent.click(next);
  await waitFor(() => expect(engine.loads).toEqual(['https://origen.example/live/index.m3u8', 'https://origen2.example/live/manifest.mpd']));
  expect(screen.queryByText('No se pudo cargar este servidor')).not.toBeInTheDocument();
});

test('muestra los servidores y la marca de agua', async () => {
  engine.failFirst = false;
  renderAt('/ver/1');
  expect(await screen.findByRole('button', { name: 'Servidor 1 HD' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Servidor 2' })).toBeInTheDocument();
  expect(screen.getByText('ID 48213 · juan.benitez')).toBeInTheDocument();
});

test('servidor web se muestra en un iframe con opción de abrir aparte', async () => {
  engine.failFirst = false;
  renderAt('/ver/1');
  await userEvent.click(await screen.findByRole('button', { name: 'Web' }));
  expect(document.querySelector('iframe')).toHaveAttribute('src', 'https://transmision.example/en-vivo');
  expect(screen.getByRole('link', { name: 'Abrir en el navegador' })).toHaveAttribute('href', 'https://transmision.example/en-vivo');
});

test('si la sesión se cierra en medio del video, se detiene y libera', async () => {
  engine.failFirst = false;
  renderAt('/ver/1');
  await screen.findByRole('button', { name: 'Servidor 2' });
  await act(async () => { useSession.getState().expire('other_device'); });
  await waitFor(() => expect(engine.destroy).toHaveBeenCalled());
  expect(document.querySelector('video')).toBeNull();
  expect(screen.getByTestId('loc')).toHaveTextContent('/entrar');
});

test('403 de suscripción lleva a planes', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/events/1/play', status: 403, body: { code: 'subscription_inactive', message: 'Tu suscripción no está activa.' } }, { path: '/api/plans', body: [] }, { path: '/api/settings/public', body: {} }]);
  renderAt('/ver/1');
  await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/planes'));
});

test('evento inexistente', async () => {
  mockApi([{ path: '/api/me', body: meActive }, { path: '/api/events/77/play', status: 404, body: { message: 'Not found' } }]);
  renderAt('/ver/77');
  expect(await screen.findByText('Este evento ya no está disponible.')).toBeInTheDocument();
});

test('configuración de DRM para Shaka', () => {
  expect(shakaConfig({ label: 'a', type: 'dash', url: 'u', drm: { type: 'clearkey', clearkeys: { k: 'v' }, license_url: null }, headers: null })).toEqual({ drm: { clearKeys: { k: 'v' } } });
  expect(shakaConfig({ label: 'a', type: 'dash', url: 'u', drm: { type: 'widevine', clearkeys: null, license_url: 'https://lic' }, headers: null })).toEqual({ drm: { servers: { 'com.widevine.alpha': 'https://lic' } } });
  expect(shakaConfig({ label: 'a', type: 'hls', url: 'u', drm: { type: null, clearkeys: null, license_url: null }, headers: null })).toEqual({});
});

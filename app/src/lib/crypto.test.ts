import { decryptPlay } from './crypto';
import fx from '../../test/fixtures/play.json';

test('descifra la respuesta de /play generada por el servidor', async () => {
  const r = await decryptPlay(fx.payload, fx.iv, fx.session_key);
  expect(r.links).toHaveLength(3);
  expect(r.links[0]).toMatchObject({ label: 'Servidor 1 HD', type: 'hls', url: 'https://origen.example/live/index.m3u8' });
  expect(r.links[1].drm).toEqual({ type: 'clearkey', clearkeys: { kid1: 'key1' }, license_url: null });
});

test('con otra clave falla', async () => {
  const other = btoa('x'.repeat(32));
  await expect(decryptPlay(fx.payload, fx.iv, other)).rejects.toThrow();
});

import { pickFeatured, findEvent, searchEvents, saveCatalog, loadCatalog } from './catalogCache';
import { catalog, final, polca, rock } from '../../test/fixtures/catalog';

test('destacado: primero en vivo destacado', () => expect(pickFeatured(catalog)).toBe(final));
test('destacado: si no hay destacado, el primero en vivo', () => expect(pickFeatured({ ...catalog, live: [polca] })).toBe(polca));
test('destacado: si no hay en vivo, el primer próximo', () => expect(pickFeatured({ ...catalog, live: [] })).toBe(rock));
test('destacado: catálogo vacío', () => expect(pickFeatured({ live: [], upcoming: [], categories: [] })).toBeNull());
test('buscar evento por id en cualquier lista', () => expect(findEvent(catalog, 4)).toBe(rock));
test('buscar sin tildes ni mayúsculas, sin repetidos', () => {
  const r = searchEvents(catalog, 'musica');
  expect(r.map((e) => e.id).sort()).toEqual([2, 4]);
  expect(searchEvents(catalog, 'POLCA')).toEqual([polca]);
  expect(searchEvents(catalog, '  ')).toEqual([]);
});
test('la caché nunca guarda una clave url', () => {
  saveCatalog({ ...catalog, live: [{ ...final, url: 'https://x/live.m3u8' } as any] });
  const raw = localStorage.getItem('ppt.catalog')!;
  expect(raw).not.toContain('"url"');
  expect(loadCatalog()!.live[0].title).toBe(final.title);
});

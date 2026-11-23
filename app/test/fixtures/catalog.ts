import type { Catalog, CatalogEvent } from '../../src/lib/types';

const ev = (id: number, title: string, category: string, starts_at: string, extra: Partial<CatalogEvent> = {}): CatalogEvent => ({
  id, title, category, starts_at, description: `Descripción de ${title}.`, image_url: null, ends_at: null, is_featured: false, is_live: false, link_count: 2, ...extra,
});

export const final = ev(1, 'Final Copa Interbarrios 2026', 'Deportes', '2026-11-22T22:30:00Z', { is_live: true, is_featured: true, ends_at: '2026-11-23T01:00:00Z' });
export const polca = ev(2, 'Festival de Polca y Guarania', 'Música', '2026-11-22T21:00:00Z', { is_live: true });
export const culto = ev(3, 'Culto de Domingo', 'Religiosos', '2026-11-22T22:00:00Z', { is_live: true });
export const rock = ev(4, 'Noche de Rock Paraguayo', 'Música', '2026-11-28T23:00:00Z');
export const futsal = ev(5, 'Clásico de Futsal', 'Deportes', '2026-11-29T21:00:00Z');

export const catalog: Catalog = {
  live: [polca, final, culto],
  upcoming: [rock, futsal],
  categories: [
    { name: 'Deportes', events: [final, futsal] },
    { name: 'Música', events: [polca, rock] },
    { name: 'Religiosos', events: [culto] },
  ],
};
export const emptyCatalog: Catalog = { live: [], upcoming: [], categories: [] };

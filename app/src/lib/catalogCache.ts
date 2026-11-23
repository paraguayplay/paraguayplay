import type { Catalog, CatalogEvent } from './types';
import { CATALOG_KEY } from './session';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Guarda el catálogo para mostrarlo al instante la próxima vez. Nunca guarda claves `url`. */
export function saveCatalog(c: Catalog) {
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(c, (k, v) => (k === 'url' ? undefined : v))); } catch { /* lleno */ }
}

export function loadCatalog(): Catalog | null {
  try {
    const c = JSON.parse(localStorage.getItem(CATALOG_KEY) ?? 'null');
    return c && Array.isArray(c.live) ? c : null;
  } catch { return null; }
}

export function allEvents(c: Catalog): CatalogEvent[] {
  const seen = new Map<number, CatalogEvent>();
  for (const e of [...c.live, ...c.upcoming, ...c.categories.flatMap((x) => x.events)]) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()];
}

export function pickFeatured(c: Catalog): CatalogEvent | null {
  return c.live.find((e) => e.is_featured) ?? c.live[0] ?? c.upcoming[0] ?? null;
}

export function findEvent(c: Catalog, id: number): CatalogEvent | undefined {
  return allEvents(c).find((e) => e.id === id);
}

export function searchEvents(c: Catalog, q: string): CatalogEvent[] {
  const n = norm(q);
  if (!n) return [];
  return allEvents(c).filter((e) => norm(e.title).includes(n) || norm(e.category ?? '').includes(n));
}

export function isEmpty(c: Catalog) {
  return !c.live.length && !c.upcoming.length && !c.categories.some((x) => x.events.length);
}

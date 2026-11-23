import { keyAction, type KeyAction } from '../lib/keys';

export type Rect = { left: number; top: number; width: number; height: number };
export type Box<T> = { el: T; rect: Rect };
type Dir = 'up' | 'down' | 'left' | 'right';

const cx = (r: Rect) => r.left + r.width / 2;
const cy = (r: Rect) => r.top + r.height / 2;

/** El vecino más cercano en una dirección: distancia principal + 2× desvío lateral. */
export function nextInDirection<T>(from: Rect, items: Box<T>[], dir: Dir): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const { el, rect } of items) {
    const dx = cx(rect) - cx(from);
    const dy = cy(rect) - cy(from);
    const main = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy;
    const side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx);
    if (main <= 1) continue;
    // en vertical, se permite el desvío; en horizontal, solo elementos que se solapan en altura
    if ((dir === 'left' || dir === 'right') && side > Math.max(rect.height, from.height)) continue;
    const score = main + side * 2;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

const SELECTOR = 'a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select, textarea, [tabindex="0"], .focusable';

function visible(el: HTMLElement) {
  if (el.closest('[aria-hidden="true"], [inert]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** Elementos navegables; si hay un diálogo abierto, solo los de adentro. */
export function focusables(): HTMLElement[] {
  const dialog = document.querySelector<HTMLElement>('[role=dialog]');
  return [...(dialog ?? document).querySelectorAll<HTMLElement>(SELECTOR)].filter(visible);
}

const lastInRow = new Map<string, HTMLElement>();

function focusEl(el: HTMLElement) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const row = el.closest<HTMLElement>('[data-row]')?.dataset.row;
  if (row) lastInRow.set(row, el);
}

export function move(dir: Dir): boolean {
  const all = focusables();
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || cur === document.body || !all.includes(cur)) {
    if (all[0]) { focusEl(all[0]); return true; }
    return false;
  }
  const target = nextInDirection(cur.getBoundingClientRect(), all.filter((e) => e !== cur).map((el) => ({ el, rect: el.getBoundingClientRect() })), dir);
  if (!target) return false;
  // al entrar a otra fila, volver a la tarjeta que tenía el foco
  const curRow = cur.closest<HTMLElement>('[data-row]')?.dataset.row;
  const row = target.closest<HTMLElement>('[data-row]')?.dataset.row;
  const remembered = row && row !== curRow ? lastInRow.get(row) : undefined;
  focusEl(remembered && remembered.isConnected && all.includes(remembered) ? remembered : target);
  return true;
}

/** Pone el foco en el primer elemento útil de la pantalla (o en [data-autofocus]). */
export function focusFirst() {
  const auto = document.querySelector<HTMLElement>('[data-autofocus]');
  const el = auto && visible(auto) ? auto : focusables().find((e) => !e.closest('.tvnav'));
  if (el) focusEl(el);
}

/** Escucha el control remoto. `onBack` decide qué hace Atrás. */
export function installSpatial(onBack: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    const a: KeyAction | null = keyAction(e);
    if (!a) return;
    if (a === 'back') { e.preventDefault(); onBack(); return; }
    if (a === 'ok') {
      const el = document.activeElement as HTMLElement | null;
      if (el && el.classList.contains('focusable') && el.tagName !== 'A' && el.tagName !== 'BUTTON') { e.preventDefault(); el.click(); }
      return;
    }
    if (move(a)) e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

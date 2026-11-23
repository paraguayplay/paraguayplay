import { isTv, MODE_KEY } from '../lib/keys';

/** Decide el modo al arrancar: agrega `tv` a <html> y escala el lienzo de 1920×1080 al ancho real. */
export function setupMode(win: Window = window) {
  const q = new URLSearchParams(win.location.search).get('modo');
  if (q === 'tv' || q === 'celular') win.localStorage.setItem(MODE_KEY, q);
  const tv = isTv(win.navigator.userAgent, win.location.search, win.localStorage.getItem(MODE_KEY));
  const html = win.document.documentElement;
  html.classList.toggle('tv', tv);
  if (!tv) return;
  const fit = () => html.style.setProperty('--tvz', String(win.innerWidth / 1920));
  fit();
  win.addEventListener('resize', fit);
}

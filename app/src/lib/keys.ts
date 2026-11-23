export type KeyAction = 'back' | 'up' | 'down' | 'left' | 'right' | 'ok';

const TV_UA = /Android TV|GoogleTV|AndroidTV|\bAFT[A-Z]|Tizen|Web0S|webOS|SMART-TV|SmartTV|BRAVIA|HbbTV|NetCast|CrKey|Android.*\bTV\b/i;
export const MODE_KEY = 'ppt.modo';

/** ¿Mostrar el modo TV? `?modo=` manda y se guarda; si no, lo guardado; si no, el navegador. */
export function isTv(ua: string, search: string, stored: string | null): boolean {
  const q = new URLSearchParams(search).get('modo');
  if (q === 'tv' || q === 'celular') return q === 'tv';
  if (stored === 'tv' || stored === 'celular') return stored === 'tv';
  return TV_UA.test(ua);
}

const isTextInput = (t: unknown) =>
  t instanceof HTMLElement && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes((t as HTMLInputElement).type)));

/** Traduce una tecla del control remoto. Dentro de un campo de texto, ←/→/Backspace son para escribir. */
export function keyAction(e: { key: string; keyCode: number; target?: EventTarget | null }): KeyAction | null {
  const typing = isTextInput(e.target);
  if (e.keyCode === 10009 || e.keyCode === 461 || e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') return 'back';
  if (e.key === 'Backspace') return typing ? null : 'back';
  switch (e.key) {
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    case 'ArrowLeft': return typing ? null : 'left';
    case 'ArrowRight': return typing ? null : 'right';
    case 'Enter': return 'ok';
  }
  return null;
}

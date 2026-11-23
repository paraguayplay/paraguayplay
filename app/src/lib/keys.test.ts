import { keyAction, isTv } from './keys';

const TIZEN = 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 TV Safari/537.36';
const WEBOS = 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/79 Safari/537.36';
const FIRE = 'Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7633) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const DESK = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

test.each([[TIZEN, true], [WEBOS, true], [FIRE, true], [DESK, false]])('isTv por UA %#', (ua, tv) => expect(isTv(ua, '', null)).toBe(tv));
test('?modo=celular gana sobre el UA de TV', () => expect(isTv(TIZEN, '?modo=celular', null)).toBe(false));
test('?modo=tv gana en escritorio', () => expect(isTv(DESK, '?modo=tv', null)).toBe(true));
test('modo guardado', () => expect(isTv(DESK, '', 'tv')).toBe(true));

test.each([
  [{ key: 'Unidentified', keyCode: 10009 }, 'back'],
  [{ key: 'Unidentified', keyCode: 461 }, 'back'],
  [{ key: 'Escape', keyCode: 27 }, 'back'],
  [{ key: 'GoBack', keyCode: 0 }, 'back'],
  [{ key: 'Backspace', keyCode: 8 }, 'back'],
  [{ key: 'ArrowLeft', keyCode: 37 }, 'left'],
  [{ key: 'ArrowDown', keyCode: 40 }, 'down'],
  [{ key: 'Enter', keyCode: 13 }, 'ok'],
  [{ key: 'a', keyCode: 65 }, null],
] as const)('tecla %#', (e, a) => expect(keyAction(e)).toBe(a));

test('Backspace dentro de un campo de texto no es Atrás', () => {
  const input = document.createElement('input');
  expect(keyAction({ key: 'Backspace', keyCode: 8, target: input })).toBeNull();
  expect(keyAction({ key: 'ArrowLeft', keyCode: 37, target: input })).toBeNull();
  expect(keyAction({ key: 'ArrowDown', keyCode: 40, target: input })).toBe('down');
});

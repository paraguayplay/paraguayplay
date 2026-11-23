import { installProtection } from './protect';

let off: () => void;
beforeEach(() => { off = installProtection(document); });
afterEach(() => off());

const key = (init: KeyboardEventInit) => { const e = new KeyboardEvent('keydown', { cancelable: true, bubbles: true, ...init }); document.dispatchEvent(e); return e; };

test('bloquea F12 y atajos de herramientas de desarrollador', () => {
  expect(key({ key: 'F12' }).defaultPrevented).toBe(true);
  expect(key({ key: 'I', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  expect(key({ key: 'j', metaKey: true, altKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  expect(key({ key: 'C', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true);
  expect(key({ key: 'u', ctrlKey: true }).defaultPrevented).toBe(true);
});
test('no bloquea copiar normal', () => {
  expect(key({ key: 'c', ctrlKey: true }).defaultPrevented).toBe(false);
});
test('bloquea el clic derecho', () => {
  const e = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
  document.body.dispatchEvent(e);
  expect(e.defaultPrevented).toBe(true);
});
test('se puede quitar', () => {
  off();
  expect(key({ key: 'F12' }).defaultPrevented).toBe(false);
  off = installProtection(document);
});

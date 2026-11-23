import { nextInDirection, type Box } from './spatial';

const b = (id: string, x: number, y: number, w = 100, h = 60): Box<string> => ({ el: id, rect: { left: x, top: y, width: w, height: h } });
// fila 1: a b c ; fila 2: d e
const items = [b('a', 0, 0), b('b', 120, 0), b('c', 240, 0), b('d', 0, 100), b('e', 150, 100)];

test('derecha elige el vecino de la misma fila', () => expect(nextInDirection(items[0].rect, items.slice(1), 'right')).toBe('b'));
test('abajo elige el más cercano en línea', () => expect(nextInDirection(items[1].rect, items, 'down')).toBe('e'));
test('arriba desde la segunda fila', () => expect(nextInDirection(items[3].rect, items, 'up')).toBe('a'));
test('nada hacia la izquierda del primero', () => expect(nextInDirection(items[0].rect, items.slice(1), 'left')).toBeNull());

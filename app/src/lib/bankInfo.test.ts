import { parseBankInfo } from './bankInfo';

test('filas clave: valor y texto suelto', () => {
  expect(parseBankInfo('Banco: Continental\nCuenta: 1234\n\nGracias')).toEqual([
    { key: 'Banco', value: 'Continental' },
    { key: 'Cuenta', value: '1234' },
    { text: 'Gracias' },
  ]);
});
test('el valor puede tener dos puntos', () => {
  expect(parseBankInfo('Alias: a:b')).toEqual([{ key: 'Alias', value: 'a:b' }]);
});
test('vacío o nulo da lista vacía', () => {
  expect(parseBankInfo(null)).toEqual([]);
  expect(parseBankInfo('  \n ')).toEqual([]);
});

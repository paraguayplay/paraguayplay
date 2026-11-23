import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { Poster } from './Poster';
import { Icon } from './Icon';

test('el botón principal se hunde al presionar y vuelve al soltar', () => {
  render(<Button>Entrar</Button>);
  const b = screen.getByRole('button', { name: 'Entrar' });
  expect(b).toHaveClass('btn');
  fireEvent.pointerDown(b);
  expect(b).toHaveClass('press');
  fireEvent.pointerUp(b);
  expect(b).not.toHaveClass('press');
});

test('póster sin imagen usa el fondo de su categoría', () => {
  const { container } = render(<Poster category="Música" />);
  expect(container.querySelector('.art')).toHaveClass('a2');
});

test('póster con imagen muestra la imagen', () => {
  const { container } = render(<Poster category="Música" imageUrl="/x.webp" />);
  expect(container.querySelector('img')).toHaveAttribute('src', '/x.webp');
});

test('el ícono usa el sprite', () => {
  const { container } = render(<Icon name="play" />);
  expect(container.querySelector('use')).toHaveAttribute('href', '#i-play');
});

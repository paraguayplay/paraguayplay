import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from '../src/routes';
import { IconSprite } from '../src/ui/Icon';

function Loc() {
  const l = useLocation();
  return <output data-testid="loc">{l.pathname + l.search}</output>;
}

/** Monta la app completa en una ruta. `screen.getByTestId('loc')` muestra la ruta actual. */
export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <IconSprite />
      <AppRoutes />
      <Loc />
    </MemoryRouter>,
  );
}

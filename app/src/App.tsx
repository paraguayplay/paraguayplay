import { BrowserRouter } from 'react-router-dom';
import { IconSprite } from './ui/Icon';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <IconSprite />
      <AppRoutes />
    </BrowserRouter>
  );
}

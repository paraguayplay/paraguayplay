import { BrowserRouter } from 'react-router-dom';
import { IconSprite } from './ui/Icon';
import { AppRoutes } from './routes';
import { TvShell } from './tv/TvShell';

export function App() {
  return (
    <BrowserRouter>
      <IconSprite />
      <TvShell />
      <AppRoutes />
    </BrowserRouter>
  );
}

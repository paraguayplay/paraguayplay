import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/tv.css';
import './styles/lite.css';
import { setupMode } from './tv/setup';
import { applyLite } from './lib/lite';
import { installProtection } from './lib/protect';
import { App } from './App';

setupMode();
applyLite();
if (import.meta.env.PROD) installProtection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

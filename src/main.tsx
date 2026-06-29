import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './components/AuthGate';
import { ThemeProvider } from './lib/theme';
import { installPwaListeners } from './lib/pwa';
import './index.css';

/* Captura el beforeinstallprompt lo antes posible (antes de render). */
installPwaListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </ThemeProvider>
  </StrictMode>,
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './components/AuthGate';
import PatientPortal from './components/PatientPortal';
import { ThemeProvider } from './lib/theme';
import { installPwaListeners } from './lib/pwa';
import './index.css';

/* Captura el beforeinstallprompt lo antes posible (antes de render). */
installPwaListeners();

/* El portal del paciente es una entrada independiente: ?portal=paciente */
const isPatientPortal = new URLSearchParams(window.location.search).get('portal') === 'paciente';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {isPatientPortal
        ? <PatientPortal />
        : (
          <AuthGate>
            <App />
          </AuthGate>
        )}
    </ThemeProvider>
  </StrictMode>,
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './components/AuthGate';
import PatientPortal from './components/PatientPortal';
import RagdollPoser from './components/RagdollPoser';
import { ThemeProvider } from './lib/theme';
import { installPwaListeners } from './lib/pwa';
import './index.css';

/* Captura el beforeinstallprompt lo antes posible (antes de render). */
installPwaListeners();

const params = new URLSearchParams(window.location.search);
/* El portal del paciente es una entrada independiente: ?portal=paciente */
const isPatientPortal = params.get('portal') === 'paciente';
/* Editor de postura anatómica (banco de pruebas): ?editor=ragdoll */
const isRagdollEditor = params.get('editor') === 'ragdoll';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {isRagdollEditor
        ? <RagdollPoser />
        : isPatientPortal
          ? <PatientPortal />
          : (
            <AuthGate>
              <App />
            </AuthGate>
          )}
    </ThemeProvider>
  </StrictMode>,
);

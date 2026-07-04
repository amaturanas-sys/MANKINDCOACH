import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './components/AuthGate';
import { ThemeProvider } from './lib/theme';
import { installPwaListeners } from './lib/pwa';
import './index.css';

/* Entradas alternativas con carga diferida: el coach (web y APK) no paga el
   peso del portal del paciente ni del editor de postura en el bundle inicial. */
const PatientPortal = lazy(() => import('./components/PatientPortal'));
const RagdollPoser = lazy(() => import('./components/RagdollPoser'));

/* Captura el beforeinstallprompt lo antes posible (antes de render). */
installPwaListeners();

const params = new URLSearchParams(window.location.search);
/* El portal del paciente es una entrada independiente: ?portal=paciente */
const isPatientPortal = params.get('portal') === 'paciente';
/* Editor de postura anatómica (banco de pruebas): ?editor=ragdoll */
const isRagdollEditor = params.get('editor') === 'ragdoll';

const fallback = (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#71717a', fontFamily: 'monospace', fontSize: 12 }}>
    Cargando…
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {isRagdollEditor
        ? <Suspense fallback={fallback}><RagdollPoser /></Suspense>
        : isPatientPortal
          ? <Suspense fallback={fallback}><PatientPortal /></Suspense>
          : (
            <AuthGate>
              <App />
            </AuthGate>
          )}
    </ThemeProvider>
  </StrictMode>,
);

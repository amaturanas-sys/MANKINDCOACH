/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Entry point alternativo: SOLO la app del administrador, sin landing pública
 * ni gatekeeper de auth.
 *
 * Para qué sirve:
 *   Es el "modo estable / snapshot protegido" — equivalente a cómo era la app
 *   antes de añadir el flujo público + login. Se genera con:
 *
 *     npm run build:admin-only
 *
 *   Y produce `dist-admin-only/index.html` que se puede llevar a USB / abrir
 *   con doble clic. Funciona offline, datos en localStorage como siempre.
 *
 *   Útil como fallback si algo se rompe en el flujo nuevo de auth, y como
 *   herramienta de trabajo "puro" para el coach cuando no necesita la landing.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthenticatedApp } from './App';
import { ThemeProvider } from './lib/theme';
import { installPwaListeners } from './lib/pwa';
import './index.css';

installPwaListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {/* Sin onLogout: este build es la app desnuda, sin "Cerrar sesión" */}
      <AuthenticatedApp />
    </ThemeProvider>
  </StrictMode>,
);

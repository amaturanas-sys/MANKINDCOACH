/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Entry point exclusivo para la LANDING PÚBLICA promocional.
 * Es un sitio web INDEPENDIENTE de la app del coach.
 *
 * Contenido: hero, acerca, servicios, productos, testimonios, FAQ, blog,
 * contacto y zona de clientes (descargar ficha inicial + formulario de
 * envío + datos de contacto).
 *
 * NO incluye la app del administrador. Esa app es local y se abre con el
 * launcher o el HTML standalone admin-only.
 *
 * Build: `npm run build:landing` → genera `dist-landing/` para subir a Vercel.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PublicLandingPage from './components/PublicLandingPage';
import { ThemeProvider } from './lib/theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PublicLandingPage />
    </ThemeProvider>
  </StrictMode>,
);

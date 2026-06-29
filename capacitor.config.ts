import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor para empaquetar la APP DEL COACH como app nativa
 * Android (y, opcionalmente, iOS). Envuelve el build web local (`dist/`).
 *
 * La app sigue siendo 100% local: los datos viven en localStorage del WebView,
 * sin backend. La landing pública NO se empaqueta (es un proyecto aparte).
 *
 * Flujo: `npm run build` → `npx cap sync` → abrir en Android Studio y compilar.
 */
const config: CapacitorConfig = {
  appId: 'cl.mankindfactory.workspace',
  appName: 'MankindFactory',
  webDir: 'dist',
  backgroundColor: '#09090b',
  android: {
    backgroundColor: '#09090b',
    // Permite el almacenamiento local persistente del WebView.
    allowMixedContent: false
  }
};

export default config;

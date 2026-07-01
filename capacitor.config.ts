import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor para empaquetar la APP DEL COACH como app nativa
 * Android (y, opcionalmente, iOS).
 *
 * Dos modos, según la variable de entorno CAP_SERVER_URL al compilar:
 *
 *  A) VINCULADO A VERCEL (recomendado): si CAP_SERVER_URL apunta a tu dominio
 *     de Vercel (p.ej. https://mankindfactory.vercel.app), el APK carga SIEMPRE
 *     la última versión publicada y usa Supabase igual que la web. Tras la
 *     primera carga, el Service Worker (PWA) la cachea y funciona offline.
 *     Instalas el APK una vez y las mejoras llegan solas por cada deploy.
 *
 *  B) EMPAQUETADO (sin CAP_SERVER_URL): el APK incluye el build `dist/` y
 *     funciona 100% offline; para actualizar hay que recompilar el APK. En este
 *     modo, las claves VITE_SUPABASE_* deben inyectarse al compilar para tener
 *     sincronización en la nube.
 */
const serverUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'cl.mankindfactory.workspace',
  appName: 'MankindFactory',
  webDir: 'dist',
  backgroundColor: '#09090b',
  android: {
    backgroundColor: '#09090b',
    allowMixedContent: false
  },
  ...(serverUrl
    ? { server: { url: serverUrl, cleartext: false, androidScheme: 'https' } }
    : {})
};

export default config;

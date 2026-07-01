import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración de Capacitor para empaquetar la APP DEL COACH como app nativa
 * Android (y, opcionalmente, iOS).
 *
 * Dos modos, según la variable de entorno CAP_SERVER_URL al compilar:
 *
 *  A) VINCULADO A VERCEL (por defecto): el APK carga SIEMPRE la última versión
 *     publicada en https://mankindcoach.vercel.app y usa Supabase igual que la
 *     web. Tras la primera carga, el Service Worker (PWA) la cachea y funciona
 *     offline. Instalas el APK una vez y las mejoras llegan solas por deploy.
 *     (Se puede apuntar a otro dominio con la variable CAP_SERVER_URL.)
 *
 *  B) EMPAQUETADO: para un APK 100% offline con `dist/` dentro, pon
 *     DEFAULT_SERVER_URL = '' abajo y hornea las claves VITE_SUPABASE_* al
 *     compilar para tener sincronización en la nube.
 */
const DEFAULT_SERVER_URL = 'https://mankindcoach.vercel.app';
// Un CAP_SERVER_URL no vacío tiene prioridad; si no, usa el destino por defecto.
const override = process.env.CAP_SERVER_URL?.trim();
const serverUrl = override || DEFAULT_SERVER_URL;

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

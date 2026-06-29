import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { renameSync, existsSync } from 'node:fs';

/** Renombra el HTML de entrada a index.html en el outDir (Vercel sirve "/"). */
function emitAsIndexHtml(sourceHtml: string): Plugin {
  return {
    name: 'emit-as-index-html',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist-landing');
      const from = resolve(outDir, sourceHtml);
      const to = resolve(outDir, 'index.html');
      if (existsSync(from)) renameSync(from, to);
    }
  };
}

/**
 * Build de la LANDING PÚBLICA promocional (proyecto independiente de la app
 * del coach). Estático, sin backend, se sube a Vercel.
 *
 * Entry: index-landing.html → src/main-landing.tsx
 * Salida: dist-landing/  (Output Directory configurado en vercel.json).
 * Dev: `npm run dev:landing` en el puerto 5248.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), emitAsIndexHtml('index-landing.html')],
  server: {
    port: 5248,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist-landing',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index-landing.html')
    }
  }
});

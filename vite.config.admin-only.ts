import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';
import { renameSync, existsSync } from 'node:fs';

/** Renombra el HTML inlineado a index.html dentro de dist-admin-only/. */
function emitAsIndexHtml(sourceHtml: string): Plugin {
  return {
    name: 'emit-as-index-html',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist-admin-only');
      const from = resolve(outDir, sourceHtml);
      const to = resolve(outDir, 'index.html');
      if (existsSync(from)) renameSync(from, to);
    }
  };
}

/**
 * Build "admin-only": la app del coach SIN landing pública ni auth, inlineada
 * en un único HTML autocontenido (JS + CSS embebidos) que funciona offline con
 * doble clic / desde USB.
 *
 * Entry: indexadminonly.html → src/main-admin-only.tsx
 * Salida: dist-admin-only/ (un index.html standalone gracias a singlefile).
 *
 * Equivale al snapshot `MankindFactory_Admin_Estable.html`.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), emitAsIndexHtml('indexadminonly.html')],
  build: {
    outDir: 'dist-admin-only',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'indexadminonly.html')
    }
  }
});

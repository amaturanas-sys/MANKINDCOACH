import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Config principal: la app del coach (workspace clínico, local-only).
 * Entry: index.html → src/main.tsx. Dev server en 5247.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5247,
    host: '0.0.0.0'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});

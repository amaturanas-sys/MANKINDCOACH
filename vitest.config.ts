import { defineConfig } from 'vitest/config';

/**
 * Config de tests (Vitest). Separada de vite.config.ts para evitar el choque
 * de tipos entre la copia de Vite de la app y la que trae Vitest.
 * Los tests actuales son de lib/ (lógica pura), no requieren el plugin de React.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  }
});

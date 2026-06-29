/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistema de tema dark/light con persistencia en localStorage.
 * - Aplica `data-theme="dark|light"` al elemento <html> para que los tokens
 *   CSS de index.css resuelvan a los valores correctos.
 * - Respeta `prefers-color-scheme` la primera vez.
 * - Tolera entornos sin window (SSR / standalone build).
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'mankind_theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  // Respeta preferencia del sistema en el primer load
  if (window.matchMedia?.('(prefers-color-scheme: light)')?.matches) return 'light';
  return 'dark';
}

function applyThemeToDocument(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  // Mantén el theme-color de la meta sincronizado con el fondo, para Safari/Chrome móvil
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#f6f5fb' : '#09090b');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());

  useEffect(() => {
    applyThemeToDocument(theme);
    try { window.localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState(prev => prev === 'dark' ? 'light' : 'dark'), []);

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback inerte: permite que componentes que llamen a useTheme antes de
    // que el provider esté montado no exploten (tests, storybook, etc.).
    return {
      theme: 'dark',
      toggleTheme: () => {},
      setTheme: () => {}
    };
  }
  return ctx;
}

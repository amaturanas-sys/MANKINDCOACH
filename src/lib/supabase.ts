/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cliente de Supabase (backend de la plataforma: Auth + Postgres + RLS).
 *
 * Es OPCIONAL: si no hay variables de entorno (`VITE_SUPABASE_URL` y
 * `VITE_SUPABASE_ANON_KEY`), la app funciona en modo 100% LOCAL como siempre
 * (localStorage, sin login). En cuanto se configuran, se habilita el login del
 * coach y la sincronización en la nube ("acceso desde cualquier lugar").
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** ¿Está configurado el backend de red? Si no, la app es local-only. */
export const isBackendConfigured: boolean = Boolean(url && anonKey);

/**
 * Cliente único de Supabase, o `null` si no hay backend configurado.
 * La sesión se persiste en localStorage para mantener el login entre recargas.
 */
export const supabase: SupabaseClient | null = isBackendConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'mankind_auth'
      }
    })
  : null;

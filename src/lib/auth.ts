/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Estado de autenticación del coach como store de módulo (sin React Context),
 * para que cualquier entrada (incluido el build admin-only, que NO usa login)
 * pueda leerlo sin necesidad de un Provider.
 *
 * - Si el backend no está configurado → siempre `{ configured:false }` y la app
 *   sigue siendo local-only.
 * - Si está configurado → refleja la sesión de Supabase en tiempo real.
 */
import { useSyncExternalStore } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isBackendConfigured } from './supabase';

export interface AuthState {
  /** ¿Hay backend de red configurado? */
  configured: boolean;
  /** ¿Ya se resolvió el estado inicial de sesión? */
  ready: boolean;
  session: Session | null;
  user: User | null;
}

let state: AuthState = {
  configured: isBackendConfigured,
  ready: !isBackendConfigured, // sin backend, no hay nada que esperar
  session: null,
  user: null
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

let initialized = false;

/** Inicializa la suscripción a los cambios de sesión (idempotente). */
export function initAuth(): void {
  if (initialized || !supabase) return;
  initialized = true;

  supabase.auth.getSession().then(({ data }) => {
    setState({ session: data.session ?? null, user: data.session?.user ?? null, ready: true });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    setState({ session: session ?? null, user: session?.user ?? null, ready: true });
  });
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Backend no configurado.');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Snapshot actual (para uso fuera de React). */
export function getAuthState(): AuthState {
  return state;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Hook reactivo del estado de autenticación. */
export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, getAuthState, getAuthState);
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controla el acceso a la app del coach según el estado de red/sesión:
 *  - Sin backend configurado  → pasa directo (app 100% local, como siempre).
 *  - Con backend, resolviendo  → pantalla de carga breve.
 *  - Con backend, sin sesión    → pantalla de login.
 *  - Con backend y sesión       → renderiza la app.
 */
import { useEffect, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthState, initAuth } from '../lib/auth';
import LoginScreen from './LoginScreen';

export default function AuthGate({ children }: { children: ReactNode }) {
  const { configured, ready, session } = useAuthState();

  useEffect(() => { initAuth(); }, []);

  if (!configured) return <>{children}</>;

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-500">
        <Loader2 size={20} className="animate-spin" aria-label="Cargando" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return <>{children}</>;
}

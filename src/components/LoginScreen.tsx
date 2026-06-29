/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pantalla de inicio de sesión del coach (solo se muestra cuando el backend
 * de red está configurado). Los pacientes NO inician sesión.
 */
import { useState } from 'react';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { signInWithPassword } from '../lib/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      /* En éxito, el store de auth cambia y el gate renderiza la app. */
    } catch (err) {
      const msg = (err as Error)?.message ?? 'No se pudo iniciar sesión.';
      setError(
        /invalid login credentials/i.test(msg)
          ? 'Email o contraseña incorrectos.'
          : /email not confirmed/i.test(msg)
            ? 'Debes confirmar tu email antes de entrar.'
            : msg
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/brand/mankind-logo.png"
            alt="MankindFactory"
            className="h-20 w-20 rounded-2xl object-cover ring-1 ring-zinc-800 mb-4"
          />
          <h1 className="font-sans font-black text-xl tracking-tight">MankindFactory</h1>
          <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mt-1">
            Workspace del coach
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-[#121214] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl"
        >
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
              placeholder="tucorreo@ejemplo.com"
            />
          </label>

          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="flex items-start gap-1.5 text-[11px] text-[#FF3C00] font-mono">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email.trim() || !password}
            className="w-full px-4 py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-2 transition"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            {busy ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-[10px] font-mono text-zinc-600 mt-4 leading-relaxed">
          Tus datos se sincronizan de forma privada en tu cuenta. La app también
          funciona sin conexión.
        </p>
      </div>
    </div>
  );
}

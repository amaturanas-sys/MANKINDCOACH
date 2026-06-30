/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal del PACIENTE (entrada independiente, vía `?portal=paciente&c=<coachId>`).
 *
 * El paciente se registra/inicia sesión y sube sus archivos JSON de ingreso o
 * seguimiento, que quedan dirigidos a su coach. El coach no sube nada: solo
 * comparte el enlace de invitación.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Upload, LogIn, UserPlus, LogOut, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';
import { useAuthState, initAuth, signOut } from '../lib/auth';
import { isBackendConfigured } from '../lib/supabase';
import {
  patientSignUp, patientSignIn, detectKind, submitToCoach,
  listMySubmissions, type PatientSubmission
} from '../lib/patientPortal';

const KIND_LABEL: Record<string, string> = {
  intake: 'Ficha de ingreso',
  progress: 'Seguimiento / avance'
};

export default function PatientPortal() {
  const { ready, session, user } = useAuthState();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const coachId = params.get('c') ?? '';
  const coachName = params.get('coach') ?? '';

  useEffect(() => { initAuth(); }, []);

  if (!isBackendConfigured) {
    return <Centered><p className="text-zinc-400 text-sm">El portal no está disponible (sin backend configurado).</p></Centered>;
  }
  if (!ready) {
    return <Centered><Loader2 size={20} className="animate-spin text-zinc-500" aria-label="Cargando" /></Centered>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/brand/mankind-logo.png" alt="MankindFactory" className="h-9 w-9 rounded-lg object-cover ring-1 ring-zinc-800" />
          <div>
            <p className="font-sans font-black text-sm tracking-tight">MankindFactory</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">Portal del paciente</p>
          </div>
        </div>
        {session && (
          <button type="button" onClick={() => signOut()}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#FF3C00]/50 text-zinc-300 hover:text-[#FF3C00] rounded-lg font-mono text-[10px] uppercase tracking-wider transition flex items-center gap-2">
            <LogOut size={12} /> Salir
          </button>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        {!coachId && (
          <div className="mb-6 flex items-start gap-2 text-[11px] text-[#FFB020] font-mono bg-[#FFB020]/10 border border-[#FFB020]/30 rounded-lg p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Enlace incompleto: pídele a tu coach el enlace de invitación correcto (debe incluir su código).
          </div>
        )}
        {session && user
          ? <Uploader coachId={coachId} coachName={coachName} patientEmail={user.email ?? null} />
          : <AuthPanel coachName={coachName} />}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">{children}</div>;
}

/* ----------------------------- Auth ----------------------------- */
function AuthPanel({ coachName }: { coachName: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    try {
      if (mode === 'signup') {
        const { needsConfirmation } = await patientSignUp(email, password, name);
        if (needsConfirmation) setInfo('Te enviamos un email para confirmar tu cuenta. Confírmalo y vuelve a iniciar sesión.');
      } else {
        await patientSignIn(email, password);
      }
    } catch (err) {
      const m = (err as Error)?.message ?? 'Error';
      setError(/invalid login credentials/i.test(m) ? 'Email o contraseña incorrectos.'
        : /already registered/i.test(m) ? 'Ese email ya está registrado. Inicia sesión.'
        : m);
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
      <h1 className="font-sans font-bold text-lg mb-1">
        {mode === 'signup' ? 'Crea tu acceso' : 'Inicia sesión'}
      </h1>
      <p className="text-zinc-400 text-xs mb-5">
        {coachName ? <>Para compartir tus formularios con <span className="text-white">{coachName}</span>.</> : 'Para enviar tus formularios a tu coach.'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <Field label="Nombre completo">
            <input value={name} onChange={e => setName(e.target.value)} required className={inputCls} placeholder="Tu nombre" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} placeholder="tucorreo@ejemplo.com" />
        </Field>
        <Field label="Contraseña">
          <input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className={inputCls} placeholder="••••••••" />
        </Field>
        {error && <p className="flex items-start gap-1.5 text-[11px] text-[#FF3C00] font-mono"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}</p>}
        {info && <p className="flex items-start gap-1.5 text-[11px] text-[#10B981] font-mono"><CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {info}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : (mode === 'signup' ? <UserPlus size={14} /> : <LogIn size={14} />)}
          {mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
        </button>
      </form>
      <button type="button" onClick={() => { setMode(m => m === 'signup' ? 'login' : 'signup'); setError(null); setInfo(null); }}
        className="mt-4 w-full text-center text-[11px] font-mono text-zinc-400 hover:text-white">
        {mode === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
      </button>
    </div>
  );
}

/* --------------------------- Uploader --------------------------- */
function Uploader({ coachId, coachName, patientEmail }: { coachId: string; coachName: string; patientEmail: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [mine, setMine] = useState<PatientSubmission[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const refresh = async () => {
    setLoadingList(true);
    try { setMine(await listMySubmissions()); }
    catch { /* silencioso */ }
    finally { setLoadingList(false); }
  };
  useEffect(() => { refresh(); }, []);

  const handleFile = async (file: File) => {
    setError(null); setOk(null);
    if (!coachId) { setError('Enlace inválido: falta el código de tu coach.'); return; }
    setBusy(true);
    try {
      const text = await file.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error('El archivo no es un JSON válido.'); }
      const kind = detectKind(json);
      if (!kind) throw new Error('No reconozco este archivo. Sube el JSON que generó tu formulario de ingreso o de seguimiento.');
      await submitToCoach({
        coachId, kind, data: json,
        patientEmail,
        patientName: typeof json.name === 'string' ? json.name : null
      });
      setOk(`¡Enviado! Tu ${KIND_LABEL[kind].toLowerCase()} llegó a tu coach.`);
      await refresh();
    } catch (err) {
      setError((err as Error)?.message ?? 'No se pudo enviar.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-6">
        <h1 className="font-sans font-bold text-lg mb-1">Enviar formulario</h1>
        <p className="text-zinc-400 text-xs mb-5">
          Sube el archivo <span className="font-mono text-zinc-300">.json</span> que descargaste al completar tu formulario de
          ingreso o de seguimiento{coachName ? <> para <span className="text-white">{coachName}</span></> : null}.
        </p>

        <div className="border border-dashed border-zinc-700 rounded-xl p-6 text-center">
          <FileJson size={28} className="text-zinc-600 mx-auto mb-2" aria-hidden="true" />
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className={primaryBtn + ' mx-auto w-auto px-6'}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {busy ? 'Enviando…' : 'Elegir archivo JSON'}
          </button>
        </div>

        {error && <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[#FF3C00] font-mono"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}</p>}
        {ok && <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[#10B981] font-mono"><CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {ok}</p>}
      </div>

      <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-3">Tus envíos</p>
        {loadingList ? (
          <Loader2 size={16} className="animate-spin text-zinc-600" />
        ) : mine.length === 0 ? (
          <p className="text-zinc-500 text-xs">Aún no has enviado nada.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map(s => (
              <li key={s.id} className="flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{KIND_LABEL[s.kind] ?? s.kind}</p>
                  <p className="font-mono text-[9px] text-zinc-500">{new Date(s.created_at).toLocaleString('es-ES')}</p>
                </div>
                <span className={`font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded ${s.status === 'pending' ? 'bg-[#FFB020]/15 text-[#FFB020]' : 'bg-[#10B981]/15 text-[#10B981]'}`}>
                  {s.status === 'pending' ? 'Enviado' : 'Recibido'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* --------------------------- estilos --------------------------- */
const inputCls = 'w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60';
const primaryBtn = 'w-full px-4 py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-2 transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

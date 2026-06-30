/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Portal del PACIENTE (entrada independiente, vía
 * `?portal=paciente&c=<coachId>&p=<clientId>&n=<nombre>`).
 *
 * Flujo (Bloque C):
 *  1. El coach crea al paciente y comparte un enlace personalizado.
 *  2. El paciente abre el enlace, crea su acceso (email + contraseña de 9 dígitos)
 *     y completa EN LA APP su formulario de ingreso (intake).
 *  3. Más adelante usa el mismo acceso para subir avances/resultados (progress),
 *     que retroalimentan la ficha del coach.
 *
 * Cada envío queda ligado a su coach (coach_id) y al token de su ficha
 * (patient_token = id del paciente en el workspace del coach).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, Upload, LogIn, UserPlus, LogOut, CheckCircle2, AlertTriangle,
  FileJson, ClipboardList, ChevronRight
} from 'lucide-react';
import { useAuthState, initAuth, signOut } from '../lib/auth';
import { isBackendConfigured } from '../lib/supabase';
import {
  patientSignUp, patientSignIn, detectKind, submitToCoach,
  listMySubmissions, hasSubmittedIntake, type PatientSubmission
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
  const patientToken = params.get('p') ?? '';
  const presetName = params.get('n') ?? '';

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
          ? <PatientHome coachId={coachId} coachName={coachName} patientToken={patientToken || null} patientEmail={user.email ?? null} presetName={presetName} />
          : <AuthPanel coachName={coachName} presetName={presetName} />}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">{children}</div>;
}

/* ----------------------------- Auth ----------------------------- */
function AuthPanel({ coachName, presetName }: { coachName: string; presetName: string }) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [name, setName] = useState(presetName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const pwOk = /^\d{9}$/.test(password);

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
        <Field label="Contraseña (9 dígitos, 0-9)">
          <input
            type="password"
            inputMode="numeric"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 9))}
            required
            pattern="\d{9}"
            maxLength={9}
            className={inputCls}
            placeholder="• • • • • • • • •"
          />
        </Field>
        {mode === 'signup' && (
          <p className={`font-mono text-[10px] ${pwOk ? 'text-[#10B981]' : 'text-zinc-500'}`}>
            {password.length}/9 dígitos {pwOk ? '· lista' : '· solo números del 0 al 9'}
          </p>
        )}
        {error && <p className="flex items-start gap-1.5 text-[11px] text-[#FF3C00] font-mono"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}</p>}
        {info && <p className="flex items-start gap-1.5 text-[11px] text-[#10B981] font-mono"><CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {info}</p>}
        <button type="submit" disabled={busy || (mode === 'signup' && !pwOk)} className={primaryBtn}>
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

/* --------------------------- Home (autenticado) --------------------------- */
function PatientHome(props: {
  coachId: string; coachName: string; patientToken: string | null;
  patientEmail: string | null; presetName: string;
}) {
  const { coachId, coachName, patientToken, patientEmail, presetName } = props;
  const [intakeDone, setIntakeDone] = useState<boolean | null>(null);
  const [mine, setMine] = useState<PatientSubmission[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const refresh = async () => {
    setLoadingList(true);
    try {
      const [subs, done] = await Promise.all([listMySubmissions(), hasSubmittedIntake()]);
      setMine(subs);
      setIntakeDone(done);
    } catch { /* silencioso */ }
    finally { setLoadingList(false); }
  };
  useEffect(() => { refresh(); }, []);

  return (
    <div className="space-y-6">
      {intakeDone === false && (
        <IntakeForm
          coachId={coachId} coachName={coachName} patientToken={patientToken}
          patientEmail={patientEmail} presetName={presetName}
          onSubmitted={refresh}
        />
      )}
      {intakeDone === true && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-2xl p-4 flex items-start gap-2.5">
          <CheckCircle2 size={16} className="text-[#10B981] mt-0.5 shrink-0" />
          <div>
            <p className="text-[#10B981] font-semibold text-sm">Ficha de ingreso enviada</p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Ya completaste tu ingreso{coachName ? <> con <span className="text-white">{coachName}</span></> : null}. Ahora puedes subir tus avances y resultados cuando los tengas.
            </p>
          </div>
        </div>
      )}

      <ProgressUploader
        coachId={coachId} coachName={coachName} patientToken={patientToken}
        patientEmail={patientEmail} onSubmitted={refresh}
      />

      <SubmissionsList loading={loadingList} mine={mine} />
    </div>
  );
}

/* --------------------------- Formulario de ingreso --------------------------- */
const SEX_OPTIONS = ['Femenino', 'Masculino', 'Otro / prefiero no decir'];
const EXPERIENCE_OPTIONS = ['Principiante', 'Intermedio', 'Avanzado'];

function IntakeForm(props: {
  coachId: string; coachName: string; patientToken: string | null;
  patientEmail: string | null; presetName: string; onSubmitted: () => void;
}) {
  const { coachId, coachName, patientToken, patientEmail, presetName, onSubmitted } = props;
  const [form, setForm] = useState({
    name: presetName,
    birthDate: '',
    sex: '',
    phone: '',
    heightCm: '',
    weightKg: '',
    mainGoal: '',
    experienceLevel: '',
    weeklyAvailability: '',
    equipment: '',
    medicalHistory: '',
    injuries: '',
    medications: '',
    notes: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!coachId) { setError('Enlace inválido: falta el código de tu coach.'); return; }
    if (!form.name.trim()) { setError('Indica tu nombre completo.'); return; }
    setBusy(true);
    try {
      /*
       * Las claves siguen el formato que consume el importador del coach
       * (src/lib/intakeImporter.ts → applyIntake), para que la ficha se
       * complete sin transcripción manual:
       *  - sex → 'masculino' | 'femenino' | 'otro'
       *  - birthday → 'YYYY-MM-DD'
       *  - morbidities / injuries / medications / clinicalNotes → bloque clínico
       *  - performanceGoal → objetivo principal
       *  - equipment (texto) → se anexa como nota de equipamiento
       */
      const sexMap: Record<string, 'masculino' | 'femenino' | 'otro'> = {
        Masculino: 'masculino',
        Femenino: 'femenino',
        'Otro / prefiero no decir': 'otro'
      };
      const data = {
        formType: 'intake' as const,
        submittedAt: new Date().toISOString(),
        name: form.name.trim(),
        birthday: form.birthDate || null,
        sex: form.sex ? (sexMap[form.sex] ?? null) : null,
        phone: form.phone.trim() || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        performanceGoal: form.mainGoal.trim() || null,
        experienceLevel: form.experienceLevel || null,
        weeklyAvailability: form.weeklyAvailability.trim() || null,
        equipment: form.equipment.trim() || null,
        morbidities: form.medicalHistory.trim() || null,
        injuries: form.injuries.trim() || null,
        medications: form.medications.trim() || null,
        clinicalNotes: form.notes.trim() || null
      };
      await submitToCoach({
        coachId, patientToken, kind: 'intake', data,
        patientEmail, patientName: form.name.trim()
      });
      onSubmitted();
    } catch (err) {
      setError((err as Error)?.message ?? 'No se pudo enviar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-[#121214] border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[#5D36FF]/15 border border-[#5D36FF]/30 flex items-center justify-center shrink-0">
          <ClipboardList size={16} className="text-[#5D36FF]" />
        </div>
        <div>
          <h1 className="font-sans font-bold text-base">Formulario de ingreso</h1>
          <p className="text-zinc-400 text-xs">
            Cuéntale a tu coach{coachName ? <> (<span className="text-white">{coachName}</span>)</> : null} quién eres y qué buscas. Solo el primero es obligatorio.
          </p>
        </div>
      </div>

      <Field label="Nombre completo *">
        <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} placeholder="Tu nombre" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha de nacimiento">
          <input type="date" value={form.birthDate} onChange={e => set('birthDate', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Teléfono / WhatsApp">
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+56 9 ..." />
        </Field>
      </div>

      <Field label="Sexo">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {SEX_OPTIONS.map(s => (
            <Chip key={s} active={form.sex === s} onClick={() => set('sex', form.sex === s ? '' : s)}>{s}</Chip>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Estatura (cm)">
          <input type="number" inputMode="numeric" value={form.heightCm} onChange={e => set('heightCm', e.target.value)} className={inputCls} placeholder="170" />
        </Field>
        <Field label="Peso (kg)">
          <input type="number" inputMode="decimal" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} className={inputCls} placeholder="70" />
        </Field>
      </div>

      <Field label="Objetivo principal">
        <textarea rows={2} value={form.mainGoal} onChange={e => set('mainGoal', e.target.value)} className={inputCls + ' resize-y'} placeholder="Ej: bajar grasa, ganar fuerza, preparar una carrera..." />
      </Field>

      <Field label="Experiencia entrenando">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {EXPERIENCE_OPTIONS.map(s => (
            <Chip key={s} active={form.experienceLevel === s} onClick={() => set('experienceLevel', form.experienceLevel === s ? '' : s)}>{s}</Chip>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Disponibilidad semanal">
          <input value={form.weeklyAvailability} onChange={e => set('weeklyAvailability', e.target.value)} className={inputCls} placeholder="Ej: 4 días, mañanas" />
        </Field>
        <Field label="Equipamiento disponible">
          <input value={form.equipment} onChange={e => set('equipment', e.target.value)} className={inputCls} placeholder="Ej: gimnasio, casa, mancuernas" />
        </Field>
      </div>

      <Field label="Antecedentes médicos">
        <textarea rows={2} value={form.medicalHistory} onChange={e => set('medicalHistory', e.target.value)} className={inputCls + ' resize-y'} placeholder="Condiciones, cirugías, alergias relevantes..." />
      </Field>

      <Field label="Lesiones o dolencias actuales">
        <textarea rows={2} value={form.injuries} onChange={e => set('injuries', e.target.value)} className={inputCls + ' resize-y'} placeholder="Zonas con molestia, lesiones previas..." />
      </Field>

      <Field label="Medicamentos">
        <input value={form.medications} onChange={e => set('medications', e.target.value)} className={inputCls} placeholder="Opcional" />
      </Field>

      <Field label="Algo más que tu coach deba saber">
        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls + ' resize-y'} placeholder="Opcional" />
      </Field>

      {error && <p className="flex items-start gap-1.5 text-[11px] text-[#FF3C00] font-mono"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}</p>}

      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
        {busy ? 'Enviando…' : 'Enviar ficha de ingreso'}
      </button>
    </form>
  );
}

/* --------------------------- Subida de avances (JSON) --------------------------- */
function ProgressUploader(props: {
  coachId: string; coachName: string; patientToken: string | null;
  patientEmail: string | null; onSubmitted: () => void;
}) {
  const { coachId, coachName, patientToken, patientEmail, onSubmitted } = props;
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null); setOk(null);
    if (!coachId) { setError('Enlace inválido: falta el código de tu coach.'); return; }
    setBusy(true);
    try {
      const text = await file.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error('El archivo no es un JSON válido.'); }
      const kind = detectKind(json) ?? 'progress';
      await submitToCoach({
        coachId, patientToken, kind, data: json,
        patientEmail,
        patientName: typeof json.name === 'string' ? json.name : null
      });
      setOk(`¡Enviado! Tu ${KIND_LABEL[kind].toLowerCase()} llegó a tu coach.`);
      onSubmitted();
    } catch (err) {
      setError((err as Error)?.message ?? 'No se pudo enviar.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-6">
      <h2 className="font-sans font-bold text-base mb-1">Subir avances / resultados</h2>
      <p className="text-zinc-400 text-xs mb-5">
        Si tienes un archivo <span className="font-mono text-zinc-300">.json</span> con tus mediciones o resultados
        {coachName ? <> para <span className="text-white">{coachName}</span></> : null}, súbelo aquí.
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
  );
}

/* --------------------------- Lista de envíos --------------------------- */
function SubmissionsList({ loading, mine }: { loading: boolean; mine: PatientSubmission[] }) {
  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-2xl p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400 mb-3">Tus envíos</p>
      {loading ? (
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

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] transition ${
        active
          ? 'bg-[#5D36FF] border-[#5D36FF] text-white font-bold'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

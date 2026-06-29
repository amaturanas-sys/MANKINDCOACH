/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tabla general de pacientes con:
 * - KPIs cross-cartera.
 * - Filtros (texto + estado).
 * - Filas no clickeables al completo: botón "Entrar" explícito + nombre clickeable.
 * - Expansión por fila para editar notas internas del coach, tags, estado y
 *   mini-todos (recordatorios) sobre el paciente sin salir de la tabla.
 */

import React, { useMemo, useState } from 'react';
import {
  Users,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Wallet,
  CalendarClock,
  Filter,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Tag as TagIcon,
  Trash2,
  Check,
  Pause,
  XCircle,
  Star
} from 'lucide-react';
import {
  ClientProfile,
  MetricSample,
  PatientReminder,
  PatientStatus,
  ScheduledRoutine
} from '../types';
import { Avatar } from './Avatar';

interface PatientsListTabProps {
  clients: ClientProfile[];
  metricSamples: MetricSample[];
  scheduledRoutines: ScheduledRoutine[];
  onEnterPatient: (clientId: string, tab?: 'ficha' | 'planificador' | 'evolucion' | 'exportar') => void;
  onCreateClient: (name: string) => void;
  onUpdateClient: (client: ClientProfile) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const STATUS_META: Record<PatientStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }> = {
  lead: { label: 'Prospecto', color: 'text-[#FFB020] border-[#FFB020]/40 bg-[#FFB020]/10', icon: Star },
  activo: { label: 'Activo', color: 'text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10', icon: CheckCircle2 },
  pausa: { label: 'En pausa', color: 'text-zinc-400 border-zinc-700 bg-zinc-900/40', icon: Pause },
  churn: { label: 'Perdido', color: 'text-[#FF3C00] border-[#FF3C00]/40 bg-[#FF3C00]/10', icon: XCircle }
};

const STATUS_OPTIONS: PatientStatus[] = ['activo', 'lead', 'pausa', 'churn'];

type AccountStatus = 'ok' | 'due_soon' | 'overdue' | 'unknown';
type GoalProgress = { kind: '1rm' | 'weight' | 'none'; delta: number; metric: string };

interface PatientRow {
  client: ClientProfile;
  adherencePct: number | null;
  scheduledThisMonth: number;
  totalDaysElapsed: number;
  goal: GoalProgress;
  account: AccountStatus;
  accountDetail: string;
  pendingTasks: number;
  nextControlDelta: number | null;
  pendingReminders: number;
}

function daysFromNow(ts?: number): number | null {
  if (!ts) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(ts); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / MS_PER_DAY);
}

function formatCurrency(amount?: number, currency = 'CLP'): string {
  if (amount === undefined) return '—';
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Resume el plan vigente del paciente en una sola frase corta. */
function planSummary(client: ClientProfile): string | null {
  const p = client.practice;
  if (!p?.pricing?.amount) return null;
  const amount = formatCurrency(p.pricing.amount, p.pricing.currency ?? 'CLP');
  const cadence = p.pricing.cadence;
  const cadLabel = cadence === 'mensual' ? '/mes'
    : cadence === 'quincenal' ? '/quincena'
    : cadence === 'semanal' ? '/semana'
    : cadence === 'porSesion' ? '/sesión'
    : cadence === 'unico' ? ' (único)'
    : '';
  return `${amount}${cadLabel}`;
}

function computeGoalProgress(samples: MetricSample[]): GoalProgress {
  if (samples.length < 2) return { kind: 'none', delta: 0, metric: 'sin datos' };
  const ordered = [...samples].sort((a, b) => a.takenAt - b.takenAt);
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  const fields: Array<{ key: keyof MetricSample; metric: string }> = [
    { key: 'benchPress1RM', metric: 'Press banca' },
    { key: 'squat1RM', metric: 'Sentadilla' },
    { key: 'deadlift1RM', metric: 'Peso muerto' },
    { key: 'pullUpMaxReps', metric: 'Pull-ups' },
    { key: 'vo2Max', metric: 'VO2' }
  ];
  for (const f of fields) {
    const a = first[f.key] as number | undefined;
    const b = last[f.key] as number | undefined;
    if (typeof a === 'number' && typeof b === 'number' && a > 0) {
      const delta = ((b - a) / a) * 100;
      return { kind: '1rm', delta, metric: f.metric };
    }
  }
  if (typeof first.weightKg === 'number' && typeof last.weightKg === 'number' && first.weightKg > 0) {
    const delta = ((last.weightKg - first.weightKg) / first.weightKg) * 100;
    return { kind: 'weight', delta, metric: 'Peso corporal' };
  }
  return { kind: 'none', delta: 0, metric: 'sin datos' };
}

function computeAccount(client: ClientProfile): { status: AccountStatus; detail: string } {
  const p = client.practice ?? {};
  if (!p.nextPaymentAt && !p.lastPaymentAt) {
    return { status: 'unknown', detail: 'Plan no cargado' };
  }
  if (p.nextPaymentAt) {
    const delta = daysFromNow(p.nextPaymentAt) ?? 0;
    const amount = formatCurrency(p.pricing?.amount, p.pricing?.currency ?? 'CLP');
    if (delta < 0) return { status: 'overdue', detail: `Vencido hace ${Math.abs(delta)} d · ${amount}` };
    if (delta <= 5) return { status: 'due_soon', detail: `Vence en ${delta} d · ${amount}` };
    return { status: 'ok', detail: `Próximo en ${delta} d · ${amount}` };
  }
  return { status: 'ok', detail: 'Al día' };
}

function countPendingTasks(client: ClientProfile, samples: MetricSample[], scheduled: ScheduledRoutine[]): number {
  let count = 0;
  const p = client.practice ?? {};
  const ctrl = daysFromNow(p.nextControlAt);
  if (ctrl !== null && ctrl < 0) count += 1;
  const pay = daysFromNow(p.nextPaymentAt);
  if (pay !== null && pay < 0) count += 1;
  const ofClient = samples.filter(s => s.clientId === client.id);
  const lastSample = ofClient.length ? [...ofClient].sort((a, b) => b.takenAt - a.takenAt)[0] : null;
  const days = lastSample ? Math.round((Date.now() - lastSample.takenAt) / MS_PER_DAY) : null;
  const hasScheduled = scheduled.some(s => s.clientId === client.id);
  if (hasScheduled && (days === null || days > 30)) count += 1;
  /* recordatorios manuales vencidos o sin fecha */
  const pendingReminders = (client.reminders ?? []).filter(r => !r.done).length;
  count += pendingReminders;
  return count;
}

export default function PatientsListTab({
  clients,
  metricSamples,
  scheduledRoutines,
  onEnterPatient,
  onCreateClient,
  onUpdateClient
}: PatientsListTabProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'overdue' | 'with_tasks'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PatientStatus>('all');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rows = useMemo<PatientRow[]>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysElapsedInMonth = today.getDate();

    return clients.map(c => {
      const sched = scheduledRoutines.filter(s => s.clientId === c.id && s.year === year && s.monthIndex === month);
      const scheduledThisMonth = sched.length;
      const adherencePct = daysElapsedInMonth > 0
        ? Math.min(100, Math.round((scheduledThisMonth / daysElapsedInMonth) * 100))
        : null;
      const samples = metricSamples.filter(s => s.clientId === c.id);
      const goal = computeGoalProgress(samples);
      const acc = computeAccount(c);
      const pendingTasks = countPendingTasks(c, metricSamples, scheduledRoutines);
      const nextControlDelta = daysFromNow(c.practice?.nextControlAt);
      const pendingReminders = (c.reminders ?? []).filter(r => !r.done).length;

      return {
        client: c, adherencePct, scheduledThisMonth, totalDaysElapsed: daysElapsedInMonth,
        goal, account: acc.status, accountDetail: acc.detail, pendingTasks, nextControlDelta,
        pendingReminders
      };
    });
  }, [clients, metricSamples, scheduledRoutines]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(r => {
      if (q) {
        const inName = r.client.name.toLowerCase().includes(q);
        const inTags = (r.client.tags ?? []).some(t => t.toLowerCase().includes(q));
        if (!inName && !inTags) return false;
      }
      if (filter === 'overdue' && r.account !== 'overdue') return false;
      if (filter === 'urgent' && r.pendingTasks === 0) return false;
      if (filter === 'with_tasks' && r.pendingTasks === 0) return false;
      if (statusFilter !== 'all') {
        const s = r.client.status ?? 'activo';
        if (s !== statusFilter) return false;
      }
      return true;
    });
  }, [rows, query, filter, statusFilter]);

  const totalUrgent = rows.filter(r => r.pendingTasks > 0).length;
  const totalOverdue = rows.filter(r => r.account === 'overdue').length;
  const totalLeads = rows.filter(r => r.client.status === 'lead').length;

  const submitNew = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateClient(name);
    setNewName('');
    setCreating(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">

      {/* ENCABEZADO */}
      <section className="bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#5D36FF]/10 border border-[#5D36FF]/30 px-3 py-1 rounded-full">
            <Users size={12} className="text-[#5D36FF]" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF]">Cartera de pacientes</span>
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-white">
            {clients.length} {clients.length === 1 ? 'paciente' : 'pacientes'} en seguimiento
          </h1>
          <p className="text-zinc-400 font-mono text-xs">
            Click en una fila para expandir notas y recordatorios. Usá "Entrar" para abrir la plataforma del paciente.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 font-mono text-xs">
          <MiniStat label="Con tareas pendientes" value={`${totalUrgent}`} tone={totalUrgent > 0 ? 'warning' : 'neutral'} />
          <MiniStat label="Cuentas vencidas" value={`${totalOverdue}`} tone={totalOverdue > 0 ? 'urgent' : 'neutral'} />
          <MiniStat label="Prospectos sin convertir" value={`${totalLeads}`} tone={totalLeads > 0 ? 'warning' : 'neutral'} />
        </div>
      </section>

      {/* FILTROS */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre o tag..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <Filter size={12} className="text-zinc-500 mx-2" aria-hidden="true" />
          {(['all', 'urgent', 'overdue', 'with_tasks'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition ${
                filter === f ? 'bg-[#5D36FF] text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {f === 'all' ? 'Todos'
                : f === 'urgent' ? 'Con tareas'
                : f === 'overdue' ? 'Cuentas vencidas'
                : 'Pendientes'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <Filter size={12} className="text-zinc-500 mx-2" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition ${
              statusFilter === 'all' ? 'bg-zinc-700 text-white font-bold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition ${
                statusFilter === s ? 'bg-[#5D36FF] text-white font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>

        {creating ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitNew();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              placeholder="Nombre del paciente"
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60"
            />
            <button onClick={submitNew} disabled={!newName.trim()} className="px-3 py-1.5 bg-[#5D36FF] text-white rounded text-[10px] uppercase font-bold disabled:opacity-40">
              Crear
            </button>
            <button onClick={() => { setCreating(false); setNewName(''); }} className="px-2 py-1.5 bg-zinc-800 text-zinc-300 rounded text-[10px] uppercase font-bold">
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded-lg font-mono text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-2 shrink-0"
          >
            <Plus size={12} aria-hidden="true" /> Nuevo paciente
          </button>
        )}
      </div>

      {/* TABLA */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/60 border-b border-zinc-800">
              <tr className="text-[9px] uppercase tracking-wider font-mono text-zinc-500">
                <th className="px-3 py-3 w-8"></th>
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Adherencia (mes)</th>
                <th className="px-4 py-3">Progreso</th>
                <th className="px-4 py-3">Cuenta</th>
                <th className="px-4 py-3">Próx. control</th>
                <th className="px-4 py-3">Tareas</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-500 font-mono text-xs">
                    {query || filter !== 'all' || statusFilter !== 'all'
                      ? 'Ningún paciente coincide con los filtros aplicados.'
                      : 'No hay pacientes cargados. Creá uno para empezar.'}
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const expanded = expandedId === r.client.id;
                  const status = r.client.status ?? 'activo';
                  const statusMeta = STATUS_META[status];
                  const StatusIcon = statusMeta.icon;
                  return (
                    <React.Fragment key={r.client.id}>
                      <tr className="border-b border-zinc-900 hover:bg-zinc-950/40 transition">
                        <td className="px-3 py-3 align-top">
                          <button
                            type="button"
                            onClick={() => toggleExpand(r.client.id)}
                            className="p-1 text-zinc-500 hover:text-[#5D36FF] rounded transition"
                            aria-label={expanded ? 'Cerrar detalle' : 'Abrir detalle'}
                          >
                            {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-3">
                            <Avatar name={r.client.name} dataUrl={r.client.avatarDataUrl} size={36} />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onEnterPatient(r.client.id, 'ficha')}
                                className="block text-sm font-bold text-white hover:text-[#5D36FF] text-left transition truncate"
                                title="Entrar a la plataforma de este paciente"
                              >
                                {r.client.name}
                              </button>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="text-[10px] font-mono text-zinc-500 uppercase">{r.client.experienceLevel}</span>
                                {planSummary(r.client) && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-[9px] font-mono font-bold rounded">
                                    <Wallet size={8} aria-hidden="true" /> {planSummary(r.client)}
                                  </span>
                                )}
                              </div>
                              {(r.client.tags ?? []).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(r.client.tags ?? []).slice(0, 3).map(t => (
                                    <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-mono rounded">
                                      <TagIcon size={8} aria-hidden="true" /> {t}
                                    </span>
                                  ))}
                                  {(r.client.tags ?? []).length > 3 && (
                                    <span className="text-[9px] font-mono text-zinc-500">+{(r.client.tags ?? []).length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono font-bold ${statusMeta.color}`}>
                            <StatusIcon size={10} aria-hidden="true" />
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <AdherenceCell pct={r.adherencePct} scheduled={r.scheduledThisMonth} days={r.totalDaysElapsed} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <GoalCell goal={r.goal} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <AccountCell status={r.account} detail={r.accountDetail} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <ControlCell delta={r.nextControlDelta} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <TasksBadge count={r.pendingTasks} reminders={r.pendingReminders} />
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <button
                            type="button"
                            onClick={() => onEnterPatient(r.client.id, 'ficha')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
                          >
                            Entrar
                            <ArrowRight size={11} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="border-b border-zinc-900 bg-zinc-950/30">
                          <td colSpan={9} className="px-4 py-4">
                            <ExpandedRow
                              client={r.client}
                              onUpdate={onUpdateClient}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Tip: la chevron izquierda expande la fila para editar notas internas, tags, estado y mini-todos sin salir de la tabla.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Fila expandida: notas, tags, estado y recordatorios
 * ----------------------------------------------------------------------- */

function ExpandedRow({ client, onUpdate }: { client: ClientProfile; onUpdate: (c: ClientProfile) => void }) {
  const [newReminder, setNewReminder] = useState('');
  const [newReminderDue, setNewReminderDue] = useState('');
  const [newTag, setNewTag] = useState('');

  const reminders = client.reminders ?? [];
  const tags = client.tags ?? [];
  const status = client.status ?? 'activo';

  const updateField = <K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) => {
    onUpdate({ ...client, [key]: value });
  };

  const addReminder = () => {
    if (!newReminder.trim()) return;
    const due = newReminderDue ? new Date(newReminderDue).getTime() : undefined;
    const next: PatientReminder = {
      id: `rem-${Date.now()}`,
      text: newReminder.trim(),
      dueAt: due,
      done: false,
      createdAt: Date.now()
    };
    onUpdate({ ...client, reminders: [...reminders, next] });
    setNewReminder('');
    setNewReminderDue('');
  };

  const toggleReminderDone = (id: string) => {
    const updated = reminders.map(r => r.id === id ? { ...r, done: !r.done } : r);
    onUpdate({ ...client, reminders: updated });
  };

  const removeReminder = (id: string) => {
    onUpdate({ ...client, reminders: reminders.filter(r => r.id !== id) });
  };

  const addTag = () => {
    const t = newTag.trim();
    if (!t || tags.includes(t)) return;
    onUpdate({ ...client, tags: [...tags, t] });
    setNewTag('');
  };

  const removeTag = (t: string) => {
    onUpdate({ ...client, tags: tags.filter(x => x !== t) });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 py-2">

      {/* COLUMNA 1: Estado + Tags */}
      <div className="space-y-4">
        <div>
          <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 mb-2">Estado del paciente</span>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map(s => {
              const meta = STATUS_META[s];
              const Icon = meta.icon;
              const active = status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateField('status', s)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono font-bold transition ${
                    active ? meta.color : 'text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <Icon size={10} aria-hidden="true" />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 mb-2">Tags / clasificación</span>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.length === 0 ? (
              <span className="text-[10px] text-zinc-600 font-mono italic">Sin tags. Ej: deportista, rehab, principiante.</span>
            ) : tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#5D36FF]/10 border border-[#5D36FF]/30 text-[#5D36FF] text-[10px] font-mono rounded">
                <TagIcon size={9} aria-hidden="true" /> {t}
                <button type="button" onClick={() => removeTag(t)} className="ml-1 opacity-60 hover:opacity-100" aria-label={`Quitar tag ${t}`}>×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(); }}
              placeholder="Agregar tag..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]/60"
            />
            <button type="button" onClick={addTag} disabled={!newTag.trim()} className="px-2 py-1 bg-[#5D36FF] text-white rounded text-[9px] uppercase font-bold disabled:opacity-40">
              +
            </button>
          </div>
        </div>
      </div>

      {/* COLUMNA 2: Notas internas del coach */}
      <div className="space-y-2">
        <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 flex items-center gap-1">
          <StickyNote size={11} aria-hidden="true" /> Notas internas del coach (no visibles al paciente)
        </span>
        <textarea
          rows={9}
          value={client.coachNotes ?? ''}
          onChange={e => updateField('coachNotes', e.target.value)}
          placeholder="Ideas, recordatorios, hipótesis, conversaciones, dolencias mencionadas, preferencias..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 resize-y font-mono leading-relaxed"
        />
        <p className="text-[9px] font-mono text-zinc-600">
          {(client.coachNotes ?? '').length} caracteres · se guarda automáticamente
        </p>
      </div>

      {/* COLUMNA 3: Recordatorios */}
      <div className="space-y-2">
        <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 flex items-center gap-1">
          <CheckCircle2 size={11} aria-hidden="true" /> Mini-todos sobre este paciente
        </span>
        <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
          {reminders.length === 0 ? (
            <p className="text-[10px] text-zinc-600 font-mono italic py-2">
              Sin recordatorios. Ej: "Llamar el viernes", "Pedir nuevos exámenes".
            </p>
          ) : reminders.map(r => {
            const due = r.dueAt ? daysFromNow(r.dueAt) : null;
            const overdue = due !== null && due < 0 && !r.done;
            return (
              <div key={r.id} className={`flex items-start gap-2 p-2 bg-zinc-900/40 border rounded text-[11px] group ${
                r.done ? 'border-zinc-900 opacity-50' : overdue ? 'border-[#FF3C00]/30' : 'border-zinc-800'
              }`}>
                <button
                  type="button"
                  onClick={() => toggleReminderDone(r.id)}
                  className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center mt-0.5 transition ${
                    r.done ? 'bg-[#10B981] border-[#10B981] text-white' : 'border-zinc-700 hover:border-[#5D36FF]'
                  }`}
                  aria-label={r.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                >
                  {r.done && <Check size={10} aria-hidden="true" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-white font-mono ${r.done ? 'line-through text-zinc-500' : ''}`}>{r.text}</p>
                  {r.dueAt && (
                    <p className={`text-[9px] font-mono mt-0.5 ${overdue ? 'text-[#FF3C00]' : 'text-zinc-500'}`}>
                      {overdue ? '⚠ Vencido hace' : 'Para'} {Math.abs(due ?? 0)} días · {new Date(r.dueAt).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeReminder(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition"
                  aria-label="Eliminar recordatorio"
                >
                  <Trash2 size={11} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="space-y-1 pt-2 border-t border-zinc-800">
          <input
            type="text"
            value={newReminder}
            onChange={e => setNewReminder(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newReminder.trim()) addReminder(); }}
            placeholder="Nuevo recordatorio..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]/60"
          />
          <div className="flex gap-1">
            <input
              type="date"
              value={newReminderDue}
              onChange={e => setNewReminderDue(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[10px] focus:outline-none focus:border-[#5D36FF]/60"
              title="Fecha opcional"
            />
            <button
              type="button"
              onClick={addReminder}
              disabled={!newReminder.trim()}
              className="px-3 py-1 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[9px] uppercase font-bold disabled:opacity-40"
            >
              + Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Celdas
 * ----------------------------------------------------------------------- */

function MiniStat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'urgent' | 'warning' }) {
  const border = tone === 'urgent' ? 'border-[#FF3C00]/40' : tone === 'warning' ? 'border-[#FFB020]/40' : 'border-zinc-800';
  const color = tone === 'urgent' ? 'text-[#FF3C00]' : tone === 'warning' ? 'text-[#FFB020]' : 'text-white';
  return (
    <div className={`bg-zinc-950/60 border ${border} rounded-lg px-3 py-2 text-center min-w-[110px]`}>
      <span className="block text-[8px] uppercase tracking-wider font-mono text-zinc-500">{label}</span>
      <span className={`block text-xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function AdherenceCell({ pct, scheduled, days }: { pct: number | null; scheduled: number; days: number }) {
  if (pct === null) return <span className="text-zinc-600 text-xs font-mono">—</span>;
  const color = pct >= 75 ? '#10B981' : pct >= 40 ? '#FFB020' : '#FF6B35';
  return (
    <div className="min-w-[140px] space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white">{pct}%</span>
        <span className="text-[10px] font-mono text-zinc-500">{scheduled} / {days} días</span>
      </div>
      <div className="h-1.5 bg-zinc-900 rounded overflow-hidden">
        <div className="h-full rounded transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function GoalCell({ goal }: { goal: GoalProgress }) {
  if (goal.kind === 'none') return <span className="text-zinc-600 text-xs font-mono">Sin datos</span>;
  const Icon = goal.delta > 1 ? TrendingUp : goal.delta < -1 ? TrendingDown : Minus;
  const color = goal.delta > 1 ? 'text-[#10B981]' : goal.delta < -1 ? 'text-[#FF6B35]' : 'text-zinc-400';
  const sign = goal.delta > 0 ? '+' : '';
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={color} aria-hidden="true" />
      <div>
        <span className={`block text-sm font-bold ${color}`}>{sign}{goal.delta.toFixed(1)}%</span>
        <span className="block text-[10px] font-mono text-zinc-500">{goal.metric}</span>
      </div>
    </div>
  );
}

function AccountCell({ status, detail }: { status: AccountStatus; detail: string }) {
  const config = status === 'ok' ? { icon: CheckCircle2, color: 'text-[#10B981]', label: 'Al día' }
    : status === 'due_soon' ? { icon: CalendarClock, color: 'text-[#FFB020]', label: 'Por vencer' }
    : status === 'overdue' ? { icon: AlertCircle, color: 'text-[#FF3C00]', label: 'Vencida' }
    : { icon: Wallet, color: 'text-zinc-500', label: 'No cargado' };
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} className={config.color} aria-hidden="true" />
      <div>
        <span className={`block text-xs font-bold ${config.color}`}>{config.label}</span>
        <span className="block text-[10px] font-mono text-zinc-500">{detail}</span>
      </div>
    </div>
  );
}

function ControlCell({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-zinc-600 text-xs font-mono">Sin agendar</span>;
  const tone = delta < 0 ? 'text-[#FF3C00]' : delta <= 3 ? 'text-[#FFB020]' : delta <= 14 ? 'text-white' : 'text-zinc-400';
  const label = delta === 0 ? 'Hoy' : delta === 1 ? 'Mañana' : delta === -1 ? 'Ayer' : delta > 0 ? `En ${delta} d` : `Hace ${Math.abs(delta)} d`;
  return <span className={`text-xs font-bold font-mono ${tone}`}>{label}</span>;
}

function TasksBadge({ count, reminders }: { count: number; reminders: number }) {
  if (count === 0) {
    return <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#10B981]"><CheckCircle2 size={12} aria-hidden="true" /> 0</span>;
  }
  const color = count >= 3 ? 'bg-[#FF3C00]/20 text-[#FF3C00] border-[#FF3C00]/40'
    : count >= 2 ? 'bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/40'
    : 'bg-[#5D36FF]/20 text-[#5D36FF] border-[#5D36FF]/40';
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[10px] font-bold border ${color}`}>
        {count}
      </span>
      {reminders > 0 && (
        <span className="text-[9px] font-mono text-zinc-500">de los cuales {reminders} todo{reminders === 1 ? '' : 's'}</span>
      )}
    </div>
  );
}

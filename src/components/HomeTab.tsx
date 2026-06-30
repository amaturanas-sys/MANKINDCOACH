/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Landing del shell: tareas pendientes + agenda de la semana.
 * Sirve como "hoja del día" del coach: qué cobrar, qué controlar,
 * qué reporte pedir, qué pauta enviar, qué saludar.
 */

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardCheck,
  CalendarClock,
  Wallet,
  Cake,
  FileSignature,
  ArrowRight,
  Users,
  Briefcase,
  Plus,
  Sparkles,
  HardDrive,
  Gift,
  Wallet as WalletIcon
} from 'lucide-react';
import { ClientProfile, GlobalReminder, LoyaltyCampaign, MetricSample, ScheduledRoutine, WorkoutRoutine } from '../types';
import { DAY_NAMES, MONTH_NAMES, weekdayIndexFor } from '../constants';
import GlobalRemindersPanel from './GlobalRemindersPanel';
import { Avatar } from './Avatar';

interface HomeTabProps {
  clients: ClientProfile[];
  metricSamples: MetricSample[];
  scheduledRoutines: ScheduledRoutine[];
  routines: WorkoutRoutine[];
  onEnterPatient: (clientId: string, tab?: 'ficha' | 'planificador' | 'evolucion' | 'exportar') => void;
  onGoToTab: (tab: string) => void;
  onCreateClient: (name: string) => void;
  /** v11 */
  globalReminders?: GlobalReminder[];
  onAddGlobalReminder?: (r: GlobalReminder) => void;
  onUpdateGlobalReminder?: (r: GlobalReminder) => void;
  onRemoveGlobalReminder?: (id: string) => void;
  onOpenCommandPalette?: () => void;
  /** v14: campañas de fidelización (para alimentar la agenda de tareas) */
  loyaltyCampaigns?: LoyaltyCampaign[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type TaskKind = 'control_overdue' | 'control_soon' | 'payment_overdue' | 'progress_stale' | 'birthday' | 'reminder' | 'loyalty';

interface Task {
  id: string;
  kind: TaskKind;
  clientId: string;
  clientName: string;
  title: string;
  detail: string;
  dayDelta: number;        // negativo = vencido
  severity: 'urgent' | 'warning' | 'info';
}

function daysFromNow(ts?: number): number | null {
  if (!ts) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(ts); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / MS_PER_DAY);
}

function nextBirthdayTs(b?: { month: number; day: number }): number | null {
  if (!b) return null;
  const now = new Date();
  let candidate = new Date(now.getFullYear(), b.month - 1, b.day);
  if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    candidate = new Date(now.getFullYear() + 1, b.month - 1, b.day);
  }
  return candidate.getTime();
}

function formatCurrency(amount: number | undefined, currency = 'CLP'): string {
  if (amount === undefined) return '—';
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function relativeLabel(days: number): string {
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  if (days > 0) return `en ${days} días`;
  return `hace ${Math.abs(days)} días`;
}

export default function HomeTab({
  clients,
  metricSamples,
  scheduledRoutines,
  routines,
  onEnterPatient,
  onGoToTab,
  onCreateClient,
  globalReminders = [],
  onAddGlobalReminder,
  onUpdateGlobalReminder,
  onRemoveGlobalReminder,
  loyaltyCampaigns = []
}: HomeTabProps) {

  /* Cómputo de tareas pendientes */
  const tasks = useMemo<Task[]>(() => {
    const out: Task[] = [];

    for (const c of clients) {
      const p = c.practice ?? {};

      /* Controles vencidos o próximos */
      if (p.nextControlAt) {
        const delta = daysFromNow(p.nextControlAt) ?? 0;
        if (delta < 0) {
          out.push({
            id: `ctrl-${c.id}`,
            kind: 'control_overdue',
            clientId: c.id,
            clientName: c.name,
            title: `Control vencido · ${c.name}`,
            detail: `Reagendar control — ${relativeLabel(delta)}`,
            dayDelta: delta,
            severity: 'urgent'
          });
        } else if (delta <= 3) {
          out.push({
            id: `ctrl-${c.id}`,
            kind: 'control_soon',
            clientId: c.id,
            clientName: c.name,
            title: `Control próximo · ${c.name}`,
            detail: `Preparar evaluación — ${relativeLabel(delta)}`,
            dayDelta: delta,
            severity: 'warning'
          });
        }
      }

      /* Cobros vencidos */
      if (p.nextPaymentAt) {
        const delta = daysFromNow(p.nextPaymentAt) ?? 0;
        if (delta < 0) {
          out.push({
            id: `pay-${c.id}`,
            kind: 'payment_overdue',
            clientId: c.id,
            clientName: c.name,
            title: `Cobro vencido · ${c.name}`,
            detail: `${formatCurrency(p.pricing?.amount, p.pricing?.currency ?? 'CLP')} — ${relativeLabel(delta)}`,
            dayDelta: delta,
            severity: 'urgent'
          });
        } else if (delta <= 5) {
          out.push({
            id: `pay-${c.id}`,
            kind: 'payment_overdue',
            clientId: c.id,
            clientName: c.name,
            title: `Cobro próximo · ${c.name}`,
            detail: `${formatCurrency(p.pricing?.amount, p.pricing?.currency ?? 'CLP')} — ${relativeLabel(delta)}`,
            dayDelta: delta,
            severity: 'warning'
          });
        }
      }

      /* Reporte de avance ausente: si tiene rutina programada pero el último sample es de hace +30 días */
      const samples = metricSamples.filter(s => s.clientId === c.id);
      const lastSample = samples.length
        ? [...samples].sort((a, b) => b.takenAt - a.takenAt)[0]
        : null;
      const sched = scheduledRoutines.filter(s => s.clientId === c.id);
      const daysSinceSample = lastSample ? Math.round((Date.now() - lastSample.takenAt) / MS_PER_DAY) : null;
      if (sched.length > 0 && (daysSinceSample === null || daysSinceSample > 30)) {
        out.push({
          id: `progress-${c.id}`,
          kind: 'progress_stale',
          clientId: c.id,
          clientName: c.name,
          title: `Pedir reporte de avance · ${c.name}`,
          detail: daysSinceSample === null
            ? 'Sin mediciones registradas todavía'
            : `Último registro hace ${daysSinceSample} días`,
          dayDelta: daysSinceSample === null ? 999 : -daysSinceSample,
          severity: daysSinceSample === null ? 'info' : 'warning'
        });
      }

      /* Cumpleaños en próximos 7 días */
      const bdayTs = nextBirthdayTs(p.birthday);
      if (bdayTs !== null) {
        const delta = daysFromNow(bdayTs) ?? 999;
        if (delta >= 0 && delta <= 7) {
          out.push({
            id: `bday-${c.id}`,
            kind: 'birthday',
            clientId: c.id,
            clientName: c.name,
            title: `Saludar cumpleaños · ${c.name}`,
            detail: `${relativeLabel(delta)} (${p.birthday!.day}/${p.birthday!.month})`,
            dayDelta: delta,
            severity: delta === 0 ? 'urgent' : 'info'
          });
        }
      }

      /* Mini-todos manuales del coach sobre este paciente */
      const reminders = c.reminders ?? [];
      for (const r of reminders) {
        if (r.done) continue;
        const delta = r.dueAt !== undefined ? (daysFromNow(r.dueAt) ?? 0) : null;
        /* Mostrar siempre los sin fecha + los próximos 14 días + los vencidos */
        if (delta !== null && delta > 14) continue;
        const isUrgent = delta !== null && delta < 0;
        const isSoon = delta !== null && delta <= 2 && delta >= 0;
        out.push({
          id: `rem-${r.id}`,
          kind: 'reminder',
          clientId: c.id,
          clientName: c.name,
          title: `${r.text} · ${c.name}`,
          detail: delta === null ? 'Sin fecha' : `${relativeLabel(delta)} (${new Date(r.dueAt!).toLocaleDateString('es-ES')})`,
          dayDelta: delta ?? 999,
          severity: isUrgent ? 'urgent' : isSoon ? 'warning' : 'info'
        });
      }
    }

    /* Campañas de fidelización: planificadas = por hacer; en curso = seguimiento */
    for (const camp of loyaltyCampaigns) {
      if (camp.status === 'planificada') {
        out.push({
          id: `loy-${camp.id}`,
          kind: 'loyalty',
          clientId: '',
          clientName: '',
          title: `Activar campaña · ${camp.title}`,
          detail: camp.targetSegment ? `Fidelización — ${camp.targetSegment}` : 'Campaña de fidelización planificada',
          dayDelta: 50,
          severity: 'warning'
        });
      } else if (camp.status === 'en_curso') {
        out.push({
          id: `loy-${camp.id}`,
          kind: 'loyalty',
          clientId: '',
          clientName: '',
          title: `Campaña en curso · ${camp.title}`,
          detail: camp.targetSegment ? `Fidelización — ${camp.targetSegment}` : 'Campaña de fidelización en curso',
          dayDelta: 100,
          severity: 'info'
        });
      }
    }

    /* Ordenar por urgencia y deltadías */
    const severityScore = (s: Task['severity']) => s === 'urgent' ? 0 : s === 'warning' ? 1 : 2;
    out.sort((a, b) => {
      const sev = severityScore(a.severity) - severityScore(b.severity);
      if (sev !== 0) return sev;
      return a.dayDelta - b.dayDelta;
    });
    return out;
  }, [clients, metricSamples, scheduledRoutines, loyaltyCampaigns]);

  const groupedTasks = useMemo(() => ({
    urgent: tasks.filter(t => t.severity === 'urgent'),
    warning: tasks.filter(t => t.severity === 'warning'),
    info: tasks.filter(t => t.severity === 'info')
  }), [tasks]);

  /* Agenda de los próximos 14 días: sesiones programadas + items fechados
     (controles, cobros, cumpleaños, recordatorios). */
  const fortnight = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sameDay = (ts: number, d: Date) => {
      const x = new Date(ts);
      return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
    };
    const days: Array<{
      date: Date;
      sessions: Array<{ client: ClientProfile; routine: WorkoutRoutine }>;
      items: Array<{ kind: 'control' | 'cobro' | 'cumple' | 'recordatorio'; label: string }>;
    }> = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today.getTime() + i * MS_PER_DAY);
      const sessions: Array<{ client: ClientProfile; routine: WorkoutRoutine }> = [];
      for (const s of scheduledRoutines) {
        if (s.year === d.getFullYear() && s.monthIndex === d.getMonth() && s.dayOfMonth === d.getDate()) {
          const client = clients.find(c => c.id === s.clientId);
          const routine = routines.find(r => r.id === s.routineId);
          if (client && routine) sessions.push({ client, routine });
        }
      }
      const items: Array<{ kind: 'control' | 'cobro' | 'cumple' | 'recordatorio'; label: string }> = [];
      for (const c of clients) {
        const p = c.practice ?? {};
        if (p.nextControlAt && sameDay(p.nextControlAt, d)) items.push({ kind: 'control', label: `Control · ${c.name}` });
        if (p.nextPaymentAt && sameDay(p.nextPaymentAt, d)) items.push({ kind: 'cobro', label: `Cobro · ${c.name}` });
        const bts = nextBirthdayTs(p.birthday);
        if (bts !== null && sameDay(bts, d)) items.push({ kind: 'cumple', label: `Cumpleaños · ${c.name}` });
        for (const r of (c.reminders ?? [])) {
          if (!r.done && r.dueAt !== undefined && sameDay(r.dueAt, d)) items.push({ kind: 'recordatorio', label: `${r.text} · ${c.name}` });
        }
      }
      days.push({ date: d, sessions, items });
    }
    return days;
  }, [clients, scheduledRoutines, routines]);

  const totalScheduledFortnight = fortnight.reduce((acc, d) => acc + d.sessions.length, 0);

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-8">

      {/* HERO + ACCESOS RÁPIDOS */}
      <section className="bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#5D36FF]/10 border border-[#5D36FF]/30 px-3 py-1 rounded-full">
              <Sparkles size={12} className="text-[#5D36FF]" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF]">Agenda de hoy</span>
            </div>
            <h1 className="font-sans font-black text-3xl md:text-4xl tracking-tight text-white">
              {greeting}, <span className="text-[#5D36FF]">Alberto</span>.
            </h1>
            <p className="text-zinc-400 font-mono text-xs max-w-xl">
              {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {clients.length} {clients.length === 1 ? 'paciente' : 'pacientes'} en cartera · {totalScheduledFortnight} {totalScheduledFortnight === 1 ? 'sesión' : 'sesiones'} en los próximos 14 días.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <HeroStat label="Por atender" value={`${groupedTasks.urgent.length}`} tone={groupedTasks.urgent.length > 0 ? 'urgent' : 'neutral'} />
            <HeroStat label="Por cumplir" value={`${groupedTasks.warning.length}`} tone={groupedTasks.warning.length > 0 ? 'warning' : 'neutral'} />
            <HeroStat label="En seguimiento" value={`${groupedTasks.info.length}`} />
          </div>
        </div>
      </section>

      {/* CONJUNTO 1 · NUEVA TAREA (recordatorios del coach) */}
      {onAddGlobalReminder && onUpdateGlobalReminder && onRemoveGlobalReminder && (
        <GlobalRemindersPanel
          reminders={globalReminders}
          onAdd={onAddGlobalReminder}
          onUpdate={onUpdateGlobalReminder}
          onRemove={onRemoveGlobalReminder}
        />
      )}

      {/* TAREAS PENDIENTES */}
      <section className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <ClipboardCheck className="text-[#5D36FF]" size={16} aria-hidden="true" /> Tareas por cumplir
          </h2>
          <span className="font-mono text-[10px] text-zinc-500 uppercase">
            {tasks.length} {tasks.length === 1 ? 'tarea' : 'tareas'} en cola
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <CalendarCheck size={28} className="text-[#10B981] mx-auto" aria-hidden="true" />
            <p className="text-zinc-300 font-mono text-sm">No hay tareas pendientes. Práctica al día.</p>
            <p className="text-zinc-500 font-mono text-[10px]">
              Cuando un paciente tenga un control vencido, cobro próximo, reporte pendiente o cumpleaños, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TaskColumn title="Por atender" tone="urgent" icon={<AlertTriangle size={14} className="text-[#FF3C00]" />} items={groupedTasks.urgent} onEnterPatient={onEnterPatient} />
            <TaskColumn title="Por cumplir" tone="warning" icon={<CalendarClock size={14} className="text-[#FFB020]" />} items={groupedTasks.warning} onEnterPatient={onEnterPatient} />
            <TaskColumn title="En seguimiento" tone="info" icon={<FileSignature size={14} className="text-[#5D36FF]" />} items={groupedTasks.info} onEnterPatient={onEnterPatient} />
          </div>
        )}
      </section>

      {/* CONJUNTO 3 · PRÓXIMOS 14 DÍAS (vistazo rápido horizontal) */}
      <section className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <CalendarClock className="text-[#5D36FF]" size={16} aria-hidden="true" /> Próximos 14 días
          </h2>
          <span className="font-mono text-[10px] text-zinc-500 uppercase">
            {totalScheduledFortnight} {totalScheduledFortnight === 1 ? 'sesión' : 'sesiones'} · {fortnight.reduce((a, d) => a + d.items.length, 0)} eventos
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {fortnight.map(({ date, sessions, items }) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const weekdayLabel = DAY_NAMES[weekdayIndexFor(date.getFullYear(), date.getMonth(), date.getDate())];
            const itemTone = (k: string) =>
              k === 'control' ? 'text-[#5D36FF]'
              : k === 'cobro' ? 'text-[#FFB020]'
              : k === 'cumple' ? 'text-[#10B981]'
              : 'text-zinc-400';
            return (
              <div
                key={date.toISOString()}
                className={`shrink-0 w-[140px] bg-zinc-950/40 border rounded-lg p-2.5 space-y-2 min-h-[150px] ${
                  isToday ? 'border-[#5D36FF]/50 ring-1 ring-[#5D36FF]/20' : 'border-zinc-800'
                }`}
              >
                <div className="border-b border-zinc-800 pb-1.5 flex items-baseline justify-between">
                  <span className="text-[9px] uppercase tracking-wider font-mono text-zinc-500">{weekdayLabel.slice(0, 3)}</span>
                  <span className={`text-base font-bold ${isToday ? 'text-[#5D36FF]' : 'text-white'}`}>
                    {date.getDate()}<span className="text-[9px] font-mono text-zinc-500 ml-0.5">{MONTH_NAMES[date.getMonth()].slice(0, 3)}</span>
                  </span>
                </div>

                {sessions.length === 0 && items.length === 0 ? (
                  <p className="text-[10px] text-zinc-700 font-mono">—</p>
                ) : (
                  <div className="space-y-1">
                    {items.map((it, idx) => (
                      <p key={`it-${idx}`} className={`text-[9px] font-mono leading-tight truncate ${itemTone(it.kind)}`} title={it.label}>
                        • {it.label}
                      </p>
                    ))}
                    {sessions.map(({ client, routine }, idx) => (
                      <button
                        key={`s-${client.id}-${idx}`}
                        type="button"
                        onClick={() => onEnterPatient(client.id, 'planificador')}
                        className="w-full text-left bg-zinc-900/50 hover:bg-[#5D36FF]/10 border border-zinc-800 hover:border-[#5D36FF]/40 rounded p-1 transition"
                        title={`${client.name} · ${routine.title}`}
                      >
                        <span className="block text-[9px] font-bold text-white truncate">{client.name}</span>
                        <span className="block text-[8px] font-mono text-zinc-500 truncate">{routine.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* HINT FINAL */}
      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Tip: presiona <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[9px] mx-1">Cmd/Ctrl + K</kbd> para abrir la búsqueda rápida desde cualquier sección
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Subcomponentes
 * ----------------------------------------------------------------------- */

function HeroStat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'urgent' | 'warning' }) {
  const border = tone === 'urgent' ? 'border-[#FF3C00]/40' : tone === 'warning' ? 'border-[#FFB020]/40' : 'border-zinc-800';
  const color = tone === 'urgent' ? 'text-[#FF3C00]' : tone === 'warning' ? 'text-[#FFB020]' : 'text-white';
  return (
    <div className={`bg-zinc-950/60 border ${border} rounded-lg p-3 text-center min-w-[80px]`}>
      <span className="block text-[8px] uppercase tracking-wider font-mono text-zinc-500">{label}</span>
      <span className={`block text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function QuickAccess({ icon, label, desc, onClick }: { icon: React.ReactNode; label: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-[#121214] border border-zinc-800 hover:border-[#5D36FF]/50 hover:bg-[#5D36FF]/5 rounded-xl p-5 text-left transition group"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {icon}
          <div>
            <span className="block font-sans font-bold text-sm text-white uppercase tracking-tight">{label}</span>
            <span className="block text-[10px] font-mono text-zinc-500 mt-1">{desc}</span>
          </div>
        </div>
        <ArrowRight size={14} className="text-zinc-600 group-hover:text-[#5D36FF] mt-1 transition" aria-hidden="true" />
      </div>
    </button>
  );
}

function TaskColumn({ title, tone, icon, items, onEnterPatient }: {
  title: string;
  tone: 'urgent' | 'warning' | 'info';
  icon: React.ReactNode;
  items: Task[];
  onEnterPatient: (clientId: string, tab?: 'ficha' | 'planificador' | 'evolucion' | 'exportar') => void;
}) {
  const border = tone === 'urgent' ? 'border-[#FF3C00]/30' : tone === 'warning' ? 'border-[#FFB020]/30' : 'border-zinc-800';
  return (
    <div className={`bg-zinc-950/40 border ${border} rounded-lg p-4 space-y-3 min-h-[200px] flex flex-col`}>
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        {icon}
        <h3 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">{title}</h3>
        <span className="ml-auto text-[10px] font-mono text-zinc-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-zinc-500 font-mono flex-1 flex items-center">
          Ninguna tarea en este nivel. ✓
        </p>
      ) : (
        <ul className="space-y-1.5 flex-1">
          {items.map(task => (
            <li key={task.id}>
              <TaskRow task={task} onEnter={() => {
                if (!task.clientId) return; /* tareas sin paciente (p. ej. fidelización) */
                const tab = task.kind === 'progress_stale' ? 'evolucion'
                  : task.kind === 'birthday' || task.kind === 'payment_overdue' ? 'ficha'
                  : 'ficha';
                onEnterPatient(task.clientId, tab);
              }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task, onEnter }: { task: Task; onEnter: () => void }) {
  const Icon = task.kind === 'control_overdue' || task.kind === 'control_soon' ? CalendarClock
    : task.kind === 'payment_overdue' ? Wallet
    : task.kind === 'progress_stale' ? FileSignature
    : task.kind === 'birthday' ? Cake
    : task.kind === 'loyalty' ? Gift
    : task.kind === 'reminder' ? ClipboardCheck
    : ClipboardCheck;
  const accent = task.severity === 'urgent' ? 'border-[#FF3C00]/30 hover:border-[#FF3C00]'
    : task.severity === 'warning' ? 'border-[#FFB020]/30 hover:border-[#FFB020]'
    : 'border-zinc-800 hover:border-[#5D36FF]';
  return (
    <button
      type="button"
      onClick={onEnter}
      className={`w-full text-left bg-zinc-900/50 border ${accent} rounded p-2.5 transition group flex items-start gap-2`}
    >
      <Icon size={13} className="text-zinc-400 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-white truncate">{task.title}</span>
        <span className="block text-[10px] font-mono text-zinc-400 truncate">{task.detail}</span>
      </div>
      <ArrowRight size={11} className="text-zinc-600 group-hover:text-[#5D36FF] shrink-0 mt-1" aria-hidden="true" />
    </button>
  );
}

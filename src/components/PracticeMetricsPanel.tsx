/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Métricas operacionales de la práctica clínica:
 * - Pacientes nuevos por mes (últimos 6) + comparación mes vs anterior.
 * - Tasa de churn (pacientes con status='churn').
 * - Retención (% de pacientes en cartera con >90 días).
 * - Ingreso histórico mensual (mini bar chart).
 * - Ticket promedio, mejor pagador del mes.
 * - Adherencia promedio de la cartera.
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  UserPlus,
  UserMinus,
  Award,
  Activity,
  BarChart3,
  PieChart
} from 'lucide-react';
import { ClientProfile, PaymentRecord, ScheduledRoutine } from '../types';

interface PracticeMetricsPanelProps {
  clients: ClientProfile[];
  payments: PaymentRecord[];
  scheduledRoutines: ScheduledRoutine[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatCurrency(amount: number, currency = 'CLP'): string {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
}

export default function PracticeMetricsPanel({ clients, payments, scheduledRoutines }: PracticeMetricsPanelProps) {
  /* Currency principal (la primera no vacía) */
  const currency = payments[0]?.currency ?? clients.find(c => c.practice?.pricing?.currency)?.practice?.pricing?.currency ?? 'CLP';

  /* Pacientes nuevos por mes (últimos 6 meses) */
  const newPatientsByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    /* Inicializar últimos 6 meses */
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map[monthKey(d)] = 0;
    }
    for (const c of clients) {
      const joinedTs = c.practice?.acquiredAt ?? c.joinedAt;
      if (!joinedTs) continue;
      const k = monthKey(new Date(joinedTs));
      if (k in map) map[k] += 1;
    }
    return map;
  }, [clients]);

  /* Ingreso por mes (últimos 6) */
  const revenueByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      map[monthKey(d)] = 0;
    }
    for (const p of payments) {
      const k = monthKey(new Date(p.paidAt));
      if (k in map) map[k] += p.amount;
    }
    return map;
  }, [payments]);

  /* KPIs principales */
  const monthsKeys = Object.keys(revenueByMonth);
  const currentMonthKey = monthsKeys[monthsKeys.length - 1];
  const prevMonthKey = monthsKeys[monthsKeys.length - 2];
  const currentRev = revenueByMonth[currentMonthKey] ?? 0;
  const prevRev = revenueByMonth[prevMonthKey] ?? 0;
  const revDeltaPct = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : null;

  const newThisMonth = newPatientsByMonth[currentMonthKey] ?? 0;
  const newPrevMonth = newPatientsByMonth[prevMonthKey] ?? 0;
  const newDelta = newThisMonth - newPrevMonth;

  /* Churn rate (status='churn' / total) */
  const churnCount = clients.filter(c => c.status === 'churn').length;
  const churnPct = clients.length > 0 ? (churnCount / clients.length) * 100 : 0;

  /* Retención: pacientes con >90 días en cartera y status activo */
  const retainedCount = clients.filter(c => {
    if (c.status === 'churn') return false;
    const joined = c.practice?.acquiredAt ?? c.joinedAt;
    if (!joined) return false;
    return (Date.now() - joined) > 90 * MS_PER_DAY;
  }).length;
  const retentionPct = clients.length > 0 ? (retainedCount / clients.length) * 100 : 0;

  /* Ticket promedio */
  const avgTicket = payments.length > 0
    ? payments.reduce((acc, p) => acc + p.amount, 0) / payments.length
    : 0;

  /* Mejor pagador del mes */
  const bestPayer = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const byClient: Record<string, number> = {};
    for (const p of payments) {
      if (p.paidAt < monthStart) continue;
      byClient[p.clientId] = (byClient[p.clientId] ?? 0) + p.amount;
    }
    const entries = Object.entries(byClient).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    const [id, total] = entries[0];
    const client = clients.find(c => c.id === id);
    return client ? { client, total } : null;
  }, [payments, clients]);

  /* Adherencia promedio de la cartera */
  const avgAdherence = useMemo(() => {
    if (clients.length === 0) return null;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const days = now.getDate();
    let sum = 0;
    let count = 0;
    for (const c of clients) {
      const sched = scheduledRoutines.filter(s => s.clientId === c.id && s.year === year && s.monthIndex === month).length;
      if (days > 0) {
        sum += Math.min(100, (sched / days) * 100);
        count += 1;
      }
    }
    return count > 0 ? sum / count : null;
  }, [clients, scheduledRoutines]);

  /* Distribución por estado */
  const statusDistribution = useMemo(() => {
    const counts = { activo: 0, lead: 0, pausa: 0, churn: 0 };
    for (const c of clients) {
      const s = c.status ?? 'activo';
      counts[s] += 1;
    }
    return counts;
  }, [clients]);

  const maxRevenue = Math.max(...Object.values(revenueByMonth), 1);
  const maxNew = Math.max(...Object.values(newPatientsByMonth), 1);

  return (
    <div className="space-y-6">

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={<UserPlus size={14} className="text-[#10B981]" />}
          label="Pacientes nuevos este mes"
          value={`${newThisMonth}`}
          delta={newDelta !== 0 ? `${newDelta > 0 ? '+' : ''}${newDelta} vs anterior` : 'sin cambio'}
          deltaTone={newDelta > 0 ? 'success' : newDelta < 0 ? 'warning' : 'neutral'}
        />
        <Kpi
          icon={<UserMinus size={14} className="text-[#FF3C00]" />}
          label="Tasa de pérdida"
          value={`${churnPct.toFixed(1)}%`}
          delta={`${churnCount} pacientes perdidos`}
          deltaTone={churnPct > 20 ? 'warning' : 'neutral'}
        />
        <Kpi
          icon={<Activity size={14} className="text-[#5D36FF]" />}
          label="Retención (>90 días)"
          value={`${retentionPct.toFixed(0)}%`}
          delta={`${retainedCount} de ${clients.length}`}
          deltaTone={retentionPct >= 70 ? 'success' : 'neutral'}
        />
        <Kpi
          icon={<Wallet size={14} className="text-[#10B981]" />}
          label="Ticket promedio"
          value={formatCurrency(avgTicket, currency)}
          delta={`${payments.length} pagos`}
          deltaTone="neutral"
        />
      </div>

      {/* Mini charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue chart */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 size={16} className="text-[#5D36FF]" aria-hidden="true" /> Ingreso por mes (últimos 6)
            </h3>
            {revDeltaPct !== null && (
              <span className={`font-mono text-[10px] uppercase tracking-wider font-bold ${revDeltaPct >= 0 ? 'text-[#10B981]' : 'text-[#FF3C00]'}`}>
                {revDeltaPct >= 0 ? <TrendingUp size={11} className="inline mr-1" /> : <TrendingDown size={11} className="inline mr-1" />}
                {revDeltaPct >= 0 ? '+' : ''}{revDeltaPct.toFixed(1)}% MoM
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-2 h-32 px-2">
            {Object.entries(revenueByMonth).map(([k, val]) => {
              const heightPct = (val / maxRevenue) * 100;
              const isCurrent = k === currentMonthKey;
              return (
                <div key={k} className="flex-1 flex flex-col items-center gap-1 group cursor-help" title={`${formatCurrency(val, currency)}`}>
                  <div className="w-full flex items-end h-full">
                    <div
                      className={`w-full rounded-t transition ${isCurrent ? 'bg-[#5D36FF]' : 'bg-[#5D36FF]/40 group-hover:bg-[#5D36FF]/70'}`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono uppercase ${isCurrent ? 'text-[#5D36FF] font-bold' : 'text-zinc-500'}`}>
                    {monthLabel(k)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* New patients chart */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-[#5D36FF]" aria-hidden="true" /> Pacientes nuevos por mes
            </h3>
          </div>
          <div className="flex items-end justify-between gap-2 h-32 px-2">
            {Object.entries(newPatientsByMonth).map(([k, val]) => {
              const heightPct = (val / maxNew) * 100;
              const isCurrent = k === currentMonthKey;
              return (
                <div key={k} className="flex-1 flex flex-col items-center gap-1 group cursor-help" title={`${val} ${val === 1 ? 'paciente' : 'pacientes'}`}>
                  <div className="w-full flex items-end h-full">
                    <div
                      className={`w-full rounded-t transition ${isCurrent ? 'bg-[#10B981]' : 'bg-[#10B981]/40 group-hover:bg-[#10B981]/70'}`}
                      style={{ height: `${Math.max(heightPct, val === 0 ? 0 : 2)}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-mono uppercase ${isCurrent ? 'text-[#10B981] font-bold' : 'text-zinc-500'}`}>
                    {monthLabel(k)}
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards inferiores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Mejor pagador */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Award size={14} className="text-[#FFB020]" aria-hidden="true" />
            <h3 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">Mejor pagador del mes</h3>
          </div>
          {bestPayer ? (
            <div className="space-y-1">
              <span className="block font-sans font-bold text-base text-white">{bestPayer.client.name}</span>
              <span className="block font-mono text-xl font-black text-[#FFB020]">{formatCurrency(bestPayer.total, currency)}</span>
              <span className="block text-[10px] font-mono text-zinc-500">Acumulado en {new Date().toLocaleDateString('es-ES', { month: 'long' })}</span>
            </div>
          ) : (
            <p className="text-zinc-500 font-mono text-xs">Sin pagos este mes.</p>
          )}
        </div>

        {/* Adherencia promedio */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Activity size={14} className="text-[#5D36FF]" aria-hidden="true" />
            <h3 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">Adherencia promedio (cartera)</h3>
          </div>
          {avgAdherence !== null ? (
            <div className="space-y-2">
              <span className="block font-mono text-3xl font-black text-white">{avgAdherence.toFixed(0)}%</span>
              <div className="h-2 bg-zinc-900 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${avgAdherence}%`,
                    backgroundColor: avgAdherence >= 75 ? '#10B981' : avgAdherence >= 40 ? '#FFB020' : '#FF6B35'
                  }}
                />
              </div>
              <span className="block text-[10px] font-mono text-zinc-500">Días con rutina vs transcurridos del mes</span>
            </div>
          ) : (
            <p className="text-zinc-500 font-mono text-xs">Sin datos.</p>
          )}
        </div>

        {/* Distribución por estado */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <PieChart size={14} className="text-[#5D36FF]" aria-hidden="true" />
            <h3 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">Distribución por estado</h3>
          </div>
          <div className="space-y-2">
            <StatusBar label="Activo" count={statusDistribution.activo} total={clients.length} color="#10B981" />
            <StatusBar label="Prospecto" count={statusDistribution.lead} total={clients.length} color="#FFB020" />
            <StatusBar label="En pausa" count={statusDistribution.pausa} total={clients.length} color="#71717a" />
            <StatusBar label="Perdido" count={statusDistribution.churn} total={clients.length} color="#FF3C00" />
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Tip: carga la fecha "En cartera desde" en Práctica → Resumen del paciente para enriquecer estas métricas.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Helpers
 * ----------------------------------------------------------------------- */

function Kpi({ icon, label, value, delta, deltaTone = 'neutral' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'neutral' | 'success' | 'warning';
}) {
  const color = deltaTone === 'success' ? 'text-[#10B981]' : deltaTone === 'warning' ? 'text-[#FFB020]' : 'text-zinc-500';
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-mono text-zinc-500">
        {icon}<span>{label}</span>
      </div>
      <span className="block text-base font-bold text-white">{value}</span>
      {delta && <span className={`block text-[10px] font-mono ${color}`}>{delta}</span>}
    </div>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-zinc-400 uppercase tracking-wider">{label}</span>
        <span className="text-white font-bold">{count}</span>
      </div>
      <div className="h-1.5 bg-zinc-900 rounded overflow-hidden">
        <div className="h-full rounded transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

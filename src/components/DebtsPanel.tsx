/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel "Deudas" — vista enfocada en cobros pendientes.
 * Lista pacientes con nextPaymentAt vencido o próximo a vencer, ordenados
 * por urgencia. Permite marcar como pagado de forma rápida (registra el
 * pago con un click usando el plan vigente).
 */

import React, { useMemo, useState } from 'react';
import {
  Wallet, AlertCircle, CheckCircle2, CalendarClock, Plus, Copy
} from 'lucide-react';
import { ClientProfile, PaymentRecord } from '../types';
import { Avatar } from './Avatar';

interface DebtsPanelProps {
  clients: ClientProfile[];
  onMarkPaid: (clientId: string, payment: PaymentRecord) => void;
  onEnterPatient: (clientId: string, tab?: 'ficha' | 'planificador' | 'evolucion' | 'exportar') => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatCurrency(amount: number, currency = 'CLP'): string {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function daysFromNow(ts: number): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(ts); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / MS_PER_DAY);
}

function relativeLabel(days: number): string {
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  if (days > 0) return `en ${days} días`;
  return `hace ${Math.abs(days)} días`;
}

interface DebtRow {
  client: ClientProfile;
  amount: number;
  currency: string;
  dueAt: number;
  dayDelta: number;
  status: 'overdue' | 'due_soon' | 'upcoming';
}

export default function DebtsPanel({ clients, onMarkPaid, onEnterPatient }: DebtsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_soon'>('all');
  const [recentlyMarked, setRecentlyMarked] = useState<string | null>(null);

  const rows = useMemo<DebtRow[]>(() => {
    const out: DebtRow[] = [];
    for (const c of clients) {
      const next = c.practice?.nextPaymentAt;
      const amount = c.practice?.pricing?.amount;
      if (!next || !amount) continue;
      const dayDelta = daysFromNow(next);
      const status: DebtRow['status'] = dayDelta < 0 ? 'overdue' : dayDelta <= 5 ? 'due_soon' : 'upcoming';
      out.push({
        client: c,
        amount,
        currency: c.practice?.pricing?.currency ?? 'CLP',
        dueAt: next,
        dayDelta,
        status
      });
    }
    out.sort((a, b) => a.dueAt - b.dueAt);
    return out;
  }, [clients]);

  /* Pacientes sin plan configurado (no aparecerán en Deudas hasta que se les configure) */
  const clientsWithoutPlan = useMemo(() => {
    return clients.filter(c => {
      const amount = c.practice?.pricing?.amount;
      const next = c.practice?.nextPaymentAt;
      return !amount || !next;
    });
  }, [clients]);

  const visible = useMemo(() => {
    if (filter === 'overdue') return rows.filter(r => r.status === 'overdue');
    if (filter === 'due_soon') return rows.filter(r => r.status === 'overdue' || r.status === 'due_soon');
    return rows;
  }, [rows, filter]);

  const totalOverdue = rows.filter(r => r.status === 'overdue').reduce((acc, r) => acc + r.amount, 0);
  const totalDueSoon = rows.filter(r => r.status === 'due_soon').reduce((acc, r) => acc + r.amount, 0);
  const totalUpcoming = rows.filter(r => r.status === 'upcoming').reduce((acc, r) => acc + r.amount, 0);
  const currency = rows[0]?.currency ?? 'CLP';
  const countOverdue = rows.filter(r => r.status === 'overdue').length;
  const countDueSoon = rows.filter(r => r.status === 'due_soon').length;

  const markPaid = (row: DebtRow) => {
    const today = new Date();
    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      clientId: row.client.id,
      amount: row.amount,
      currency: row.currency,
      paidAt: today.getTime(),
      concept: `Cobro programado ${today.toLocaleDateString('es-CL')}`,
      method: 'transferencia'
    };
    onMarkPaid(row.client.id, payment);
    setRecentlyMarked(row.client.id);
    window.setTimeout(() => setRecentlyMarked(null), 3000);
  };

  const copyContactInfo = async (row: DebtRow) => {
    const contact = row.client.practice?.contactValue;
    if (!contact) {
      alert('Este paciente no tiene contacto cargado. Edítalo en Ficha → Práctica.');
      return;
    }
    try {
      await navigator.clipboard.writeText(contact);
    } catch {
      /* fallback silencioso */
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={<AlertCircle size={14} className="text-[#FF3C00]" />}
          label="Cuentas vencidas"
          value={`${countOverdue}`}
          detail={formatCurrency(totalOverdue, currency)}
          tone={countOverdue > 0 ? 'urgent' : 'neutral'}
        />
        <Kpi
          icon={<CalendarClock size={14} className="text-[#FFB020]" />}
          label="Por vencer (≤5d)"
          value={`${countDueSoon}`}
          detail={formatCurrency(totalDueSoon, currency)}
          tone={countDueSoon > 0 ? 'warning' : 'neutral'}
        />
        <Kpi
          icon={<Wallet size={14} className="text-zinc-400" />}
          label="Próximos (>5d)"
          value={`${rows.length - countOverdue - countDueSoon}`}
          detail={formatCurrency(totalUpcoming, currency)}
        />
        <Kpi
          icon={<CheckCircle2 size={14} className="text-[#10B981]" />}
          label="Total por cobrar"
          value={formatCurrency(totalOverdue + totalDueSoon + totalUpcoming, currency)}
          detail={`${rows.length} cobros pendientes`}
          tone="success"
        />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1 bg-[#121214] border border-zinc-800 rounded-lg p-1.5 w-fit">
        {(['all', 'due_soon', 'overdue'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition ${
              filter === f ? 'bg-[#5D36FF] text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {f === 'all' ? `Todos (${rows.length})`
              : f === 'due_soon' ? `Urgentes (${countOverdue + countDueSoon})`
              : `Vencidos (${countOverdue})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/60 border-b border-zinc-800">
              <tr className="text-[9px] uppercase tracking-wider font-mono text-zinc-500">
                <th className="px-4 py-3">Paciente</th>
                <th className="px-4 py-3">Vencimiento</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-zinc-500 font-mono text-xs">
                    {filter === 'all' && rows.length === 0
                      ? '✓ No hay cobros pendientes. Todo al día.'
                      : 'Ningún paciente coincide con el filtro.'}
                  </td>
                </tr>
              ) : visible.map(r => {
                const tone = r.status === 'overdue' ? 'text-[#FF3C00]'
                  : r.status === 'due_soon' ? 'text-[#FFB020]'
                  : 'text-zinc-400';
                const wasMarked = recentlyMarked === r.client.id;
                return (
                  <tr key={r.client.id} className="border-b border-zinc-900 hover:bg-zinc-950/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.client.name} dataUrl={r.client.avatarDataUrl} size={32} />
                        <div>
                          <span className="block text-sm font-bold text-white">{r.client.name}</span>
                          <span className="block text-[10px] font-mono text-zinc-500">
                            {r.client.practice?.pricing?.cadence === 'mensual' ? 'Mensual'
                              : r.client.practice?.pricing?.cadence === 'quincenal' ? 'Quincenal'
                              : r.client.practice?.pricing?.cadence === 'semanal' ? 'Semanal'
                              : r.client.practice?.pricing?.cadence === 'porSesion' ? 'Por sesión'
                              : 'Plan'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <span className={`block text-sm font-bold font-mono ${tone}`}>
                          {relativeLabel(r.dayDelta)}
                        </span>
                        <span className="block text-[10px] font-mono text-zinc-500">
                          {new Date(r.dueAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.client.practice?.contactValue ? (
                        <button
                          type="button"
                          onClick={() => copyContactInfo(r)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 hover:text-[#5D36FF] transition"
                          title="Copiar contacto al portapapeles"
                        >
                          <Copy size={10} aria-hidden="true" />
                          <span className="truncate max-w-[140px]">{r.client.practice.contactValue}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-600 italic">Sin contacto</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-black text-white font-mono">
                        {formatCurrency(r.amount, r.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {wasMarked ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] rounded font-mono text-[10px] uppercase tracking-wider font-bold">
                            <CheckCircle2 size={11} aria-hidden="true" /> Cobrado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markPaid(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
                            title="Registrar este cobro como pagado hoy"
                          >
                            <Plus size={10} aria-hidden="true" /> Cobrado
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado vacío explicativo cuando NO hay ningún cobro */}
      {rows.length === 0 && clientsWithoutPlan.length === 0 && (
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-8 text-center space-y-3">
          <CheckCircle2 size={36} className="text-[#10B981] mx-auto" aria-hidden="true" />
          <h3 className="font-sans font-bold text-base text-white">No tienes pacientes cargados aún</h3>
          <p className="text-[11px] font-mono text-zinc-400 max-w-md mx-auto">
            Para que aparezcan cobros pendientes aquí, primero crea pacientes en la sección <strong className="text-white">Pacientes</strong> y configura el plan comercial de cada uno en su <strong className="text-white">Ficha → Datos del paciente</strong>.
          </p>
        </div>
      )}

      {/* Pacientes sin plan asignado — explicación + CTA por cada uno */}
      {clientsWithoutPlan.length > 0 && (
        <div className="bg-[#121214] border border-[#FFB020]/30 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-start gap-3 border-b border-zinc-800 pb-3">
            <AlertCircle size={18} className="text-[#FFB020] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">
                {clientsWithoutPlan.length} {clientsWithoutPlan.length === 1 ? 'paciente sin plan' : 'pacientes sin plan'} configurado
              </h3>
              <p className="text-[11px] font-mono text-zinc-400 mt-1">
                Sus cobros NO aparecen automáticamente aquí. Configura el plan (monto, cadencia y próximo cobro) en su Ficha para que se sumen al panel de Deudas.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto scrollbar-thin">
            {clientsWithoutPlan.map(c => {
              const missing: string[] = [];
              if (!c.practice?.pricing?.amount) missing.push('monto');
              if (!c.practice?.nextPaymentAt) missing.push('próximo cobro');
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 bg-zinc-950/40 border border-zinc-800 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={c.name} dataUrl={c.avatarDataUrl} size={32} />
                    <div className="min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{c.name}</span>
                      <span className="block text-[10px] font-mono text-zinc-500">
                        Falta: {missing.join(' + ')}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEnterPatient(c.id, 'ficha')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition shrink-0"
                  >
                    <Plus size={11} aria-hidden="true" /> Configurar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider leading-relaxed">
        ¿Cómo funciona? Esta vista lista automáticamente los cobros pendientes según el plan que configuraste en la Ficha de cada paciente.
        <br />
        El botón <strong className="text-[#10B981]">Cobrado</strong> registra el pago con la fecha de hoy y avanza la próxima fecha según la cadencia.
      </p>
    </div>
  );
}

function Kpi({ icon, label, value, detail, tone = 'neutral' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'urgent';
}) {
  const border = tone === 'success' ? 'border-[#10B981]/30'
    : tone === 'warning' ? 'border-[#FFB020]/30'
    : tone === 'urgent' ? 'border-[#FF3C00]/30'
    : 'border-zinc-800';
  return (
    <div className={`bg-zinc-950/60 border ${border} rounded-lg p-3 space-y-1`}>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-mono text-zinc-500">
        {icon}<span>{label}</span>
      </div>
      <span className="block text-base font-bold text-white">{value}</span>
      {detail && <span className="block text-[10px] font-mono text-zinc-500">{detail}</span>}
    </div>
  );
}

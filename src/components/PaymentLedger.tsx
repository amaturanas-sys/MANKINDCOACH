/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Libro de pagos del paciente activo.
 * Muestra historial, KPIs (total pagado, último, siguiente estimado), y un
 * recorder para registrar un nuevo pago.
 *
 * Al registrar un pago:
 * 1. Se crea PaymentRecord y se agrega al array global.
 * 2. Se actualiza `client.practice.lastPaymentAt`.
 * 3. Si hay cadencia definida (mensual/quincenal/semanal), se autocalcula
 *    `client.practice.nextPaymentAt`. Si es pago único / por sesión, se borra.
 */

import React, { useMemo, useState } from 'react';
import {
  Wallet,
  Plus,
  Trash2,
  Receipt,
  TrendingUp,
  CalendarClock,
  CheckCircle,
  X,
  ChevronDown
} from 'lucide-react';
import {
  BillingCadence,
  ClientProfile,
  PaymentMethod,
  PaymentRecord,
  ServiceCatalogItem
} from '../types';

interface PaymentLedgerProps {
  client: ClientProfile;
  payments: PaymentRecord[];        // ya filtrados por el caller (solo del cliente activo)
  services: ServiceCatalogItem[];
  onAddPayment: (p: PaymentRecord) => void;
  onRemovePayment: (id: string) => void;
  onUpdatePractice: (updated: ClientProfile) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const METHOD_LABEL: Record<PaymentMethod, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  app: 'App / billetera',
  otro: 'Otro'
};

function formatCurrency(amount: number, currency = 'CLP'): string {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function isoFromTimestamp(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function timestampFromIso(iso: string): number | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  const t = new Date(y, m - 1, d).getTime();
  return Number.isFinite(t) ? t : undefined;
}

function addDaysToTimestamp(ts: number, days: number): number {
  return ts + days * MS_PER_DAY;
}

function cadenceToDays(cad?: BillingCadence): number | null {
  switch (cad) {
    case 'mensual': return 30;
    case 'quincenal': return 15;
    case 'semanal': return 7;
    default: return null;
  }
}

export default function PaymentLedger({
  client,
  payments,
  services,
  onAddPayment,
  onRemovePayment,
  onUpdatePractice
}: PaymentLedgerProps) {
  const [recording, setRecording] = useState(false);
  const pricing = client.practice?.pricing;
  const activeServices = useMemo(() => services.filter(s => s.active), [services]);

  /* Métricas agregadas */
  const stats = useMemo(() => {
    if (payments.length === 0) {
      return { total: 0, currency: pricing?.currency ?? 'CLP', count: 0, last: null as PaymentRecord | null, ytd: 0 };
    }
    const currency = payments[0].currency;
    const total = payments.reduce((acc, p) => acc + p.amount, 0);
    const yearStart = new Date(); yearStart.setMonth(0, 1); yearStart.setHours(0, 0, 0, 0);
    const ytd = payments.filter(p => p.paidAt >= yearStart.getTime()).reduce((acc, p) => acc + p.amount, 0);
    const last = [...payments].sort((a, b) => b.paidAt - a.paidAt)[0];
    return { total, currency, count: payments.length, last, ytd };
  }, [payments, pricing]);

  const nextPaymentAt = client.practice?.nextPaymentAt;
  const daysUntilNext = nextPaymentAt ? Math.round((nextPaymentAt - Date.now()) / MS_PER_DAY) : null;
  const overdue = daysUntilNext !== null && daysUntilNext < 0;

  const handleRecord = (newPayment: PaymentRecord) => {
    onAddPayment(newPayment);
    /* Sync con practice */
    const currentPractice = client.practice ?? {};
    const cadenceDays = cadenceToDays(currentPractice.pricing?.cadence);
    const patched: ClientProfile = {
      ...client,
      practice: {
        ...currentPractice,
        lastPaymentAt: newPayment.paidAt,
        nextPaymentAt: cadenceDays !== null ? addDaysToTimestamp(newPayment.paidAt, cadenceDays) : currentPractice.nextPaymentAt
      }
    };
    onUpdatePractice(patched);
    setRecording(false);
  };

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <Wallet size={16} className="text-[#5D36FF]" aria-hidden="true" /> Libro de pagos · {client.name}
        </h3>
        {!recording && (
          <button
            type="button"
            onClick={() => setRecording(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
          >
            <Plus size={12} aria-hidden="true" /> Registrar pago
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCell
          icon={<TrendingUp size={13} className="text-[#10B981]" />}
          label="Total histórico"
          value={formatCurrency(stats.total, stats.currency)}
          tone="success"
        />
        <KpiCell
          icon={<Receipt size={13} className="text-[#5D36FF]" />}
          label="Pagos registrados"
          value={`${stats.count}`}
        />
        <KpiCell
          icon={<CheckCircle size={13} className="text-[#5D36FF]" />}
          label="Último pago"
          value={stats.last
            ? `${formatCurrency(stats.last.amount, stats.last.currency)} · ${new Date(stats.last.paidAt).toLocaleDateString('es-ES')}`
            : 'Sin pagos'}
        />
        <KpiCell
          icon={<CalendarClock size={13} className={overdue ? 'text-[#FF3C00]' : 'text-[#FFB020]'} />}
          label="Próximo cobro"
          value={nextPaymentAt
            ? `${overdue ? 'Vencido hace' : 'En'} ${Math.abs(daysUntilNext ?? 0)} d`
            : '—'}
          tone={overdue ? 'urgent' : 'neutral'}
        />
      </div>

      {/* Recorder */}
      {recording && (
        <PaymentRecorder
          client={client}
          services={activeServices}
          onCommit={handleRecord}
          onCancel={() => setRecording(false)}
        />
      )}

      {/* Historial */}
      <div className="space-y-2">
        <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-2 pb-2 border-b border-zinc-800">
          Historial cronológico
          <span className="text-zinc-600">({payments.length})</span>
        </h4>

        {payments.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Wallet size={24} className="text-zinc-700 mx-auto" aria-hidden="true" />
            <p className="text-zinc-400 font-mono text-xs">Sin pagos registrados aún.</p>
            <p className="text-zinc-600 font-mono text-[10px]">Cada pago actualiza automáticamente el próximo cobro según la cadencia.</p>
          </div>
        ) : (
          <ul className="space-y-1.5 max-h-[400px] overflow-y-auto scrollbar-thin">
            {[...payments].sort((a, b) => b.paidAt - a.paidAt).map(p => (
              <PaymentRow key={p.id} payment={p} onRemove={() => onRemovePayment(p.id)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * PaymentRow — fila de pago
 * ----------------------------------------------------------------------- */

function PaymentRow({ payment, onRemove }: { payment: PaymentRecord; onRemove: () => void }) {
  return (
    <li className="bg-zinc-950/40 border border-zinc-800 rounded p-3 flex items-center justify-between gap-3 group hover:border-[#5D36FF]/30 transition">
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-sans font-bold text-sm text-white">
            {formatCurrency(payment.amount, payment.currency)}
          </span>
          {payment.method && (
            <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-mono uppercase tracking-wider rounded">
              {METHOD_LABEL[payment.method]}
            </span>
          )}
          {payment.receiptNumber && (
            <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-mono rounded">
              N° {payment.receiptNumber}
            </span>
          )}
        </div>
        <p className="text-[11px] text-zinc-300 font-mono">{payment.concept || '(sin concepto)'}</p>
        {payment.notes && (
          <p className="text-[10px] text-zinc-500 font-mono italic">{payment.notes}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className="block text-[10px] font-mono text-zinc-500">
          {new Date(payment.paidAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
          aria-label="Eliminar pago"
        >
          <Trash2 size={10} aria-hidden="true" /> Eliminar
        </button>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------------- *
 * PaymentRecorder — formulario inline para registrar un pago
 * ----------------------------------------------------------------------- */

interface RecorderProps {
  client: ClientProfile;
  services: ServiceCatalogItem[];
  onCommit: (p: PaymentRecord) => void;
  onCancel: () => void;
}

function PaymentRecorder({ client, services, onCommit, onCancel }: RecorderProps) {
  const defaultCurrency = client.practice?.pricing?.currency ?? 'CLP';
  const defaultAmount = client.practice?.pricing?.amount ?? 0;

  const [amount, setAmount] = useState<number>(defaultAmount);
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [paidAt, setPaidAt] = useState<string>(isoFromTimestamp(Date.now()));
  const [concept, setConcept] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('transferencia');
  const [serviceId, setServiceId] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  /* Si elige un servicio del catálogo, autoseteamos monto, moneda y concepto */
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find(s => s.id === id);
    if (svc) {
      setAmount(svc.amount);
      setCurrency(svc.currency);
      setConcept(svc.name);
    }
  };

  const submit = () => {
    if (amount <= 0 || !paidAt) return;
    const ts = timestampFromIso(paidAt) ?? Date.now();
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      clientId: client.id,
      amount,
      currency,
      paidAt: ts,
      concept: concept || (serviceId ? services.find(s => s.id === serviceId)?.name ?? '' : 'Pago'),
      method,
      serviceId: serviceId || undefined,
      receiptNumber: receiptNumber || undefined,
      notes: notes || undefined
    };
    onCommit(newPayment);
  };

  return (
    <div className="bg-zinc-950/60 border border-[#5D36FF]/40 rounded-lg p-4 space-y-3">
      <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#5D36FF] flex items-center gap-2 pb-2 border-b border-zinc-800">
        <Plus size={12} aria-hidden="true" /> Nuevo pago
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {services.length > 0 && (
          <Field label="Servicio del catálogo" wide>
            <div className="relative">
              <select
                value={serviceId}
                onChange={e => handleServiceChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60 appearance-none pr-8"
              >
                <option value="">— Pago manual (sin servicio) —</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatCurrency(s.amount, s.currency)}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" aria-hidden="true" />
            </div>
          </Field>
        )}
        <Field label="Monto">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(Number(e.target.value) || 0)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
            autoFocus
          />
        </Field>
        <Field label="Moneda">
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          >
            {['CLP', 'USD', 'EUR', 'ARS', 'MXN', 'COP', 'PEN', 'BRL'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha del pago">
          <input
            type="date"
            value={paidAt}
            onChange={e => setPaidAt(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Concepto" wide>
          <input
            type="text"
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="Control mayo 2026"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Método de pago">
          <select
            value={method}
            onChange={e => setMethod(e.target.value as PaymentMethod)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          >
            {(Object.entries(METHOD_LABEL) as [PaymentMethod, string][]).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="N° boleta/factura (opcional)">
          <input
            type="text"
            value={receiptNumber}
            onChange={e => setReceiptNumber(e.target.value)}
            placeholder="123456"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Notas (opcional)" wide>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Adelanto del próximo pack, descuento aplicado, etc."
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
        <p className="text-[10px] font-mono text-zinc-500 italic">
          {client.practice?.pricing?.cadence && cadenceToDays(client.practice.pricing.cadence)
            ? `El próximo cobro se autocalculará +${cadenceToDays(client.practice.pricing.cadence)} días desde la fecha del pago.`
            : 'Definí la cadencia en la pestaña Práctica para autocalcular el próximo cobro.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px] uppercase font-bold hover:bg-zinc-800 transition"
          >
            <X size={11} aria-hidden="true" /> Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={amount <= 0}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-[10px] uppercase font-bold transition"
          >
            <CheckCircle size={11} aria-hidden="true" /> Registrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Helpers UI
 * ----------------------------------------------------------------------- */

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="block text-[9px] uppercase text-zinc-500 tracking-wider font-mono">{label}</span>
      {children}
    </label>
  );
}

function KpiCell({ icon, label, value, tone = 'neutral' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'urgent';
}) {
  const border = tone === 'success' ? 'border-[#10B981]/30'
    : tone === 'urgent' ? 'border-[#FF3C00]/40'
    : 'border-zinc-800';
  return (
    <div className={`bg-zinc-950/60 border ${border} rounded-lg p-3 space-y-1`}>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-mono text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className="block text-sm font-bold text-white truncate" title={value}>{value}</span>
    </div>
  );
}

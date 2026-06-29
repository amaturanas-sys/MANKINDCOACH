/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dashboard de la práctica clínica (v5.3) con 3 sub-secciones:
 *  - Resumen: KPIs globales, listas accionables, editor del plan del paciente activo.
 *  - Catálogo: definición interna de servicios y precios reusables.
 *  - Fidelización: kanban de campañas de retención/adquisición.
 */

import React, { useMemo } from 'react';
import {
  Wallet,
  CalendarClock,
  Briefcase,
  ArrowRight,
  Cake,
  AlertCircle,
  Stethoscope,
  TrendingUp,
  Download,
  FileText,
  Calendar as CalIcon
} from 'lucide-react';
import {
  ClientProfile,
  CommunicationLog,
  LoyaltyCampaign,
  MessageTemplate,
  MetricSample,
  PaymentRecord,
  ScheduledRoutine,
  ServiceCatalogItem,
  UserImage
} from '../types';
import { computeBmi, computeTdee } from '../constants';
import ServiceCatalogManager from './ServiceCatalogManager';
import LoyaltyCampaignsPanel from './LoyaltyCampaignsPanel';
import MessageTemplatesPanel from './MessageTemplatesPanel';
import PracticeMetricsPanel from './PracticeMetricsPanel';
import CalculatorsPanel from './CalculatorsPanel';
import DebtsPanel from './DebtsPanel';
import ContentCreatorPanel from './ContentCreatorPanel';
import { financialCsv, financialReportHtml, controlsCalendarIcs, downloadBlob } from '../lib/exporters';

export type PracticeSubTab = 'resumen' | 'deudas' | 'metricas' | 'catalogo' | 'fidelizacion' | 'plantillas' | 'contenido' | 'calculadoras';

interface CoachDashboardTabProps {
  clients: ClientProfile[];
  activeClient: ClientProfile;
  metricSamples: MetricSample[];
  scheduledRoutines: ScheduledRoutine[];
  payments: PaymentRecord[];
  services: ServiceCatalogItem[];
  loyaltyCampaigns: LoyaltyCampaign[];
  messageTemplates: MessageTemplate[];
  subTab: PracticeSubTab;
  onUpdateProfile: (p: ClientProfile) => void;
  onSwitchClient: (id: string) => void;
  onEnterPatient: (id: string, tab?: 'ficha' | 'planificador' | 'evolucion' | 'exportar') => void;
  onUpdateServices: (s: ServiceCatalogItem[]) => void;
  onUpdateLoyaltyCampaigns: (c: LoyaltyCampaign[]) => void;
  onUpdateMessageTemplates: (t: MessageTemplate[]) => void;
  onLogCommunication?: (log: CommunicationLog) => void;
  onAddPayment?: (p: PaymentRecord) => void;
  /* v13 imágenes */
  userImages: UserImage[];
  onAddUserImage: (img: UserImage) => void;
  onRemoveUserImage: (id: string) => void;
  coachName: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatCurrency(amount?: number, currency = 'CLP'): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '—';
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

function daysFromNow(ts?: number): number | null {
  if (!ts) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(ts); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / MS_PER_DAY);
}

function nextBirthdayDate(b?: { month: number; day: number }): Date | null {
  if (!b) return null;
  const now = new Date();
  let candidate = new Date(now.getFullYear(), b.month - 1, b.day);
  if (candidate.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
    candidate = new Date(now.getFullYear() + 1, b.month - 1, b.day);
  }
  return candidate;
}

function formatRelativeDelta(days: number): string {
  if (days === 0) return 'hoy';
  if (days === 1) return 'mañana';
  if (days === -1) return 'ayer';
  if (days > 0) return `en ${days} días`;
  return `hace ${Math.abs(days)} días`;
}

export default function CoachDashboardTab({
  clients,
  activeClient,
  metricSamples,
  scheduledRoutines,
  payments,
  services,
  loyaltyCampaigns,
  messageTemplates,
  subTab,
  onUpdateProfile,
  onSwitchClient,
  onEnterPatient,
  onUpdateServices,
  onUpdateLoyaltyCampaigns,
  onUpdateMessageTemplates,
  onLogCommunication,
  onAddPayment,
  userImages,
  onAddUserImage,
  onRemoveUserImage,
  coachName
}: CoachDashboardTabProps) {

  /* Handler para "Cobrado" del panel de Deudas: registra pago + avanza próximo cobro. */
  const handleMarkPaid = (clientId: string, payment: PaymentRecord) => {
    if (onAddPayment) onAddPayment(payment);
    /* Actualizar el client.practice.lastPaymentAt y nextPaymentAt */
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    const cadence = client.practice?.pricing?.cadence;
    const days = cadence === 'mensual' ? 30
      : cadence === 'quincenal' ? 15
      : cadence === 'semanal' ? 7
      : null;
    const next = days !== null ? payment.paidAt + days * 24 * 60 * 60 * 1000 : client.practice?.nextPaymentAt;
    onUpdateProfile({
      ...client,
      practice: {
        ...(client.practice ?? {}),
        lastPaymentAt: payment.paidAt,
        nextPaymentAt: next
      }
    });
  };

  if (subTab === 'catalogo') {
    return (
      <div className="space-y-6">
        <Header
          coachName={coachName}
          activeClient={activeClient}
          samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
          label="Catálogo de servicios"
          desc="Define los precios reusables (evaluación inicial, controles, packs, sesiones) para asignarlos rápido a cualquier paciente."
        />
        <ServiceCatalogManager services={services} onUpdate={onUpdateServices} />
      </div>
    );
  }

  if (subTab === 'fidelizacion') {
    return (
      <div className="space-y-6">
        <Header
          coachName={coachName}
          activeClient={activeClient}
          samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
          label="Fidelización"
          desc="Tu banco de ideas y campañas de retención y adquisición. Movelas por estado a medida que avanza la ejecución."
        />
        <LoyaltyCampaignsPanel campaigns={loyaltyCampaigns} onUpdate={onUpdateLoyaltyCampaigns} />
      </div>
    );
  }

  if (subTab === 'plantillas') {
    return (
      <div className="space-y-6">
        <Header
          coachName={coachName}
          activeClient={activeClient}
          samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
          label="Plantillas de mensajes"
          desc="Textos reusables para WhatsApp, email, SMS. Cada plantilla se puede copiar con los datos auto-rellenados del paciente que elijas."
        />
        <MessageTemplatesPanel
          templates={messageTemplates}
          onUpdate={onUpdateMessageTemplates}
          clients={clients}
          onLogCommunication={onLogCommunication}
        />
      </div>
    );
  }

  if (subTab === 'deudas') {
    return (
      <div className="space-y-6">
        <Header
          coachName={coachName}
          activeClient={activeClient}
          samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
          label="Deudas y cobros pendientes"
          desc="Lista enfocada de pacientes con cuentas vencidas o por vencer. Marca como 'Cobrado' y se registra el pago al instante."
        />
        <DebtsPanel
          clients={clients}
          onMarkPaid={handleMarkPaid}
          onEnterPatient={onEnterPatient}
        />
      </div>
    );
  }

  if (subTab === 'metricas') {
    return (
      <div className="space-y-6">
        <Header
          coachName={coachName}
          activeClient={activeClient}
          samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
          label="Métricas de la práctica"
          desc="Pacientes nuevos por mes, churn, retención, ingreso histórico y distribución por estado."
        />
        <PracticeMetricsPanel clients={clients} payments={payments} scheduledRoutines={scheduledRoutines} />
      </div>
    );
  }

  if (subTab === 'contenido') {
    return (
      <div className="space-y-6">
        <Header
          coachName={coachName}
          activeClient={activeClient}
          samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
          label="Creador de contenido"
          desc="Plantillas de difusión para Instagram, WhatsApp y email. Rellenadas con datos reales de tu práctica."
        />
        <ContentCreatorPanel
          clients={clients}
          services={services}
          coachName={coachName}
          userImages={userImages}
          onAddUserImage={onAddUserImage}
          onRemoveUserImage={onRemoveUserImage}
        />
      </div>
    );
  }

  if (subTab === 'calculadoras') {
    return (
      <div className="space-y-6">
        <Header
          coachName={coachName}
          activeClient={activeClient}
          samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
          label="Calculadoras"
          desc="1RM estimado, distribución de macros, zonas de FC y conversores. Todo offline."
        />
        <CalculatorsPanel />
      </div>
    );
  }

  /* subTab === 'resumen' (default) */
  return (
    <div className="space-y-8">
      <Header
        coachName={coachName}
        activeClient={activeClient}
        samplesCount={metricSamples.filter(s => s.clientId === activeClient.id).length}
      />

      <PracticeOverview
        clients={clients}
        activeClientId={activeClient.id}
        scheduledRoutines={scheduledRoutines}
        payments={payments}
        onSwitchClient={onSwitchClient}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Header compartido
 * ----------------------------------------------------------------------- */

function Header({ coachName, activeClient, samplesCount, label, desc }: {
  coachName: string;
  activeClient: ClientProfile;
  samplesCount: number;
  label?: string;
  desc?: string;
}) {
  const bmi = computeBmi(activeClient.metrics.weightKg, activeClient.metrics.heightCm);
  const tdee = computeTdee(activeClient.metrics);
  return (
    <div className="bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 bg-[#5D36FF]/10 border border-[#5D36FF]/30 px-3 py-1 rounded-full">
          <Stethoscope size={12} className="text-[#5D36FF]" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF]">
            {label ?? 'Dashboard de la práctica'}
          </span>
        </div>
        <h1 className="font-sans font-black text-3xl tracking-tight text-white">
          Práctica de <span className="text-[#5D36FF]">{coachName}</span>
        </h1>
        <p className="text-zinc-400 font-mono text-xs max-w-xl">
          {desc ?? 'Vista global de tu cartera + edición de plan comercial, controles y fidelización del paciente activo.'}
        </p>
      </div>
      {!label && (
        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <Stat label="Paciente activo" value={activeClient.name} />
          <Stat label="IMC" value={bmi !== null ? bmi.toFixed(1) : '—'} />
          <Stat label="TDEE" value={tdee !== null ? `${tdee} kcal` : '—'} />
          <Stat label="Mediciones" value={`${samplesCount}`} />
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Vista global cross-paciente
 * ----------------------------------------------------------------------- */

interface PracticeOverviewProps {
  clients: ClientProfile[];
  activeClientId: string;
  scheduledRoutines: ScheduledRoutine[];
  payments: PaymentRecord[];
  onSwitchClient: (id: string) => void;
}

function PracticeOverview({ clients, activeClientId, scheduledRoutines, payments, onSwitchClient }: PracticeOverviewProps) {
  /* Handlers de export financiero */
  const exportMonthCsv = () => {
    const now = new Date();
    const csv = financialCsv({
      payments, clients, month: { year: now.getFullYear(), monthIndex: now.getMonth() }
    });
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    downloadBlob(csv, `mankind_pagos_${stamp}.csv`, 'text/csv');
  };
  const exportMonthHtml = () => {
    const now = new Date();
    const html = financialReportHtml({
      payments, clients, month: { year: now.getFullYear(), monthIndex: now.getMonth() }, coachName: 'Alberto Maturana S.'
    });
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    downloadBlob(html, `mankind_reporte_${stamp}.html`);
  };
  const exportControlsIcs = () => {
    const ics = controlsCalendarIcs({ clients, coachName: 'Alberto Maturana S.' });
    downloadBlob(ics, `mankind_controles_${new Date().toISOString().slice(0, 10)}.ics`, 'text/calendar');
  };
  /* Ingreso ESTIMADO (suma de planes) */
  const estimatedRevenue = useMemo(() => {
    return clients.reduce((acc, c) => {
      const pricing = c.practice?.pricing;
      if (!pricing?.amount) return acc;
      const amount = pricing.amount;
      switch (pricing.cadence) {
        case 'mensual': return acc + amount;
        case 'quincenal': return acc + amount * 2;
        case 'semanal': return acc + amount * 4;
        case 'porSesion': return acc + amount * 4;
        case 'unico': return acc;
        default: return acc + amount;
      }
    }, 0);
  }, [clients]);

  /* Ingreso REAL del mes corriente (suma de pagos registrados en el mes) */
  const realRevenueMonth = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return payments
      .filter(p => p.paidAt >= monthStart)
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  /* Ingreso YTD */
  const ytdRevenue = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    return payments
      .filter(p => p.paidAt >= yearStart)
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  const aggregates = useMemo(() => {
    const pendingPayments = clients.filter(c => {
      const next = c.practice?.nextPaymentAt;
      return next !== undefined && next < Date.now();
    });
    return {
      currency: clients.find(c => c.practice?.pricing?.currency)?.practice?.pricing?.currency ?? 'CLP',
      pendingCount: pendingPayments.length,
      totalAthletes: clients.length,
      scheduledRoutinesCount: scheduledRoutines.length
    };
  }, [clients, scheduledRoutines]);

  type ControlEntry = { client: ClientProfile; when: number; dayDelta: number };
  const upcomingControls = useMemo<ControlEntry[]>(() => {
    const enriched: ControlEntry[] = [];
    for (const c of clients) {
      const next = c.practice?.nextControlAt;
      if (!next) continue;
      const delta = daysFromNow(next) ?? 0;
      if (delta < -7 || delta > 60) continue;
      enriched.push({ client: c, when: next, dayDelta: delta });
    }
    enriched.sort((a, b) => a.when - b.when);
    return enriched.slice(0, 6);
  }, [clients]);

  type PaymentEntry = { client: ClientProfile; when: number; dayDelta: number; amount: number | undefined; currency: string };
  const upcomingPayments = useMemo<PaymentEntry[]>(() => {
    const enriched: PaymentEntry[] = [];
    for (const c of clients) {
      const next = c.practice?.nextPaymentAt;
      if (!next) continue;
      enriched.push({
        client: c, when: next, dayDelta: daysFromNow(next) ?? 0,
        amount: c.practice?.pricing?.amount, currency: c.practice?.pricing?.currency ?? 'CLP'
      });
    }
    enriched.sort((a, b) => a.when - b.when);
    return enriched.slice(0, 6);
  }, [clients]);

  type BirthdayEntry = { client: ClientProfile; when: number; dayDelta: number };
  const upcomingBirthdays = useMemo<BirthdayEntry[]>(() => {
    const enriched: BirthdayEntry[] = [];
    for (const c of clients) {
      const date = nextBirthdayDate(c.practice?.birthday);
      if (!date) continue;
      const delta = daysFromNow(date.getTime());
      if (delta === null || delta > 60) continue;
      enriched.push({ client: c, when: date.getTime(), dayDelta: delta });
    }
    enriched.sort((a, b) => a.when - b.when);
    return enriched.slice(0, 5);
  }, [clients]);

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <h2 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <Briefcase className="text-[#5D36FF]" size={16} aria-hidden="true" /> Vista global de la práctica
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-zinc-500 uppercase">
            {clients.length} {clients.length === 1 ? 'paciente' : 'pacientes'}
          </span>
          <button
            type="button"
            onClick={exportMonthCsv}
            disabled={payments.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 hover:border-[#10B981]/50 hover:text-[#10B981] text-zinc-300 rounded font-mono text-[9px] uppercase tracking-wider transition disabled:opacity-40"
            title="Exportar pagos del mes a CSV"
          >
            <Download size={10} aria-hidden="true" /> CSV mes
          </button>
          <button
            type="button"
            onClick={exportMonthHtml}
            disabled={payments.length === 0}
            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 hover:border-[#10B981]/50 hover:text-[#10B981] text-zinc-300 rounded font-mono text-[9px] uppercase tracking-wider transition disabled:opacity-40"
            title="Exportar reporte HTML imprimible del mes"
          >
            <FileText size={10} aria-hidden="true" /> Reporte mes
          </button>
          <button
            type="button"
            onClick={exportControlsIcs}
            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:text-[#5D36FF] text-zinc-300 rounded font-mono text-[9px] uppercase tracking-wider transition"
            title="Exportar próximos controles a Google/Apple Calendar"
          >
            <CalIcon size={10} aria-hidden="true" /> Agenda .ics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <OverviewStat
          icon={<TrendingUp size={14} className="text-[#10B981]" />}
          label="Ingreso REAL este mes"
          value={formatCurrency(realRevenueMonth, aggregates.currency)}
          tone="success"
        />
        <OverviewStat
          icon={<Wallet size={14} className="text-zinc-300" />}
          label="Ingreso estimado mensual"
          value={formatCurrency(estimatedRevenue, aggregates.currency)}
        />
        <OverviewStat
          icon={<AlertCircle size={14} className="text-[#FFB020]" />}
          label="Cobros vencidos"
          value={`${aggregates.pendingCount}`}
          tone={aggregates.pendingCount > 0 ? 'warning' : 'neutral'}
        />
        <OverviewStat
          icon={<Cake size={14} className="text-[#5D36FF]" />}
          label="Ingreso acumulado año"
          value={formatCurrency(ytdRevenue, aggregates.currency)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OverviewList
          title="Próximos controles"
          icon={<CalendarClock size={14} className="text-[#5D36FF]" />}
          empty="Sin controles programados."
        >
          {upcomingControls.map(c => (
            <OverviewRow
              key={`control-${c.client.id}`}
              primary={c.client.name}
              secondary={formatRelativeDelta(c.dayDelta) + ' · ' + new Date(c.when).toLocaleDateString('es-ES')}
              tone={c.dayDelta < 0 ? 'warning' : c.dayDelta <= 7 ? 'urgent' : 'neutral'}
              active={c.client.id === activeClientId}
              onClick={() => onSwitchClient(c.client.id)}
            />
          ))}
        </OverviewList>

        <OverviewList
          title="Cobros próximos / vencidos"
          icon={<Wallet size={14} className="text-[#10B981]" />}
          empty="Sin pagos pendientes registrados."
        >
          {upcomingPayments.map(p => (
            <OverviewRow
              key={`pay-${p.client.id}`}
              primary={p.client.name}
              secondary={`${formatCurrency(p.amount, p.currency)} · ${formatRelativeDelta(p.dayDelta)}`}
              tone={p.dayDelta < 0 ? 'warning' : p.dayDelta <= 5 ? 'urgent' : 'neutral'}
              active={p.client.id === activeClientId}
              onClick={() => onSwitchClient(p.client.id)}
            />
          ))}
        </OverviewList>

        <OverviewList
          title="Fidelización · cumpleaños"
          icon={<Cake size={14} className="text-[#5D36FF]" />}
          empty="Cargá la fecha de cumpleaños para activar recordatorios."
        >
          {upcomingBirthdays.map(b => (
            <OverviewRow
              key={`bday-${b.client.id}`}
              primary={b.client.name}
              secondary={`${formatRelativeDelta(b.dayDelta)} · ${new Date(b.when).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
              tone={b.dayDelta <= 7 ? 'urgent' : 'neutral'}
              active={b.client.id === activeClientId}
              onClick={() => onSwitchClient(b.client.id)}
            />
          ))}
        </OverviewList>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * UI auxiliares
 * ----------------------------------------------------------------------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-center">
      <span className="block text-[8px] uppercase text-zinc-500 tracking-wider">{label}</span>
      <span className="block text-sm font-bold text-white truncate" title={value}>{value}</span>
    </div>
  );
}

function PracticeBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        {icon}
        <h3 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function OverviewStat({ icon, label, value, tone = 'neutral' }: {
  icon: React.ReactNode; label: string; value: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const borderTone = tone === 'success' ? 'border-[#10B981]/30' : tone === 'warning' ? 'border-[#FFB020]/30' : 'border-zinc-800';
  return (
    <div className={`bg-zinc-950/60 border ${borderTone} rounded-lg p-3 space-y-1`}>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-mono text-zinc-500">
        {icon}<span>{label}</span>
      </div>
      <span className="block text-base font-bold text-white">{value}</span>
    </div>
  );
}

function OverviewList({ title, icon, empty, children }: {
  title: string; icon: React.ReactNode; empty: string; children: React.ReactNode;
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4 space-y-3 min-h-[180px] flex flex-col">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        {icon}<h3 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">{title}</h3>
      </div>
      {hasChildren
        ? <ul className="space-y-1.5 flex-1">{children}</ul>
        : <p className="text-[11px] text-zinc-500 font-mono leading-relaxed flex-1 flex items-center">{empty}</p>
      }
    </div>
  );
}

function OverviewRow({ primary, secondary, tone = 'neutral', active = false, onClick, onEnter }: {
  primary: string; secondary: string;
  tone?: 'neutral' | 'urgent' | 'warning';
  active?: boolean; onClick?: () => void; onEnter?: () => void;
}) {
  const accent = tone === 'warning' ? 'border-[#FF6B35]/40 hover:border-[#FF6B35]'
    : tone === 'urgent' ? 'border-[#5D36FF]/40 hover:border-[#5D36FF]'
    : 'border-zinc-800 hover:border-zinc-700';
  const ring = active ? 'ring-1 ring-[#5D36FF]/50' : '';
  return (
    <li>
      <div className={`flex items-center justify-between gap-2 bg-zinc-900/50 border ${accent} ${ring} rounded px-3 py-2 transition group`}>
        <button type="button" onClick={onClick} className="min-w-0 text-left flex-1">
          <span className="block text-xs font-bold text-white truncate">{primary}</span>
          <span className="block text-[10px] font-mono text-zinc-400 truncate">{secondary}</span>
        </button>
        {onEnter && (
          <button type="button" onClick={onEnter} aria-label={`Entrar a la plataforma de ${primary}`} className="p-1 text-zinc-600 hover:text-[#5D36FF] transition shrink-0" title="Entrar a la plataforma del paciente">
            <ArrowRight size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

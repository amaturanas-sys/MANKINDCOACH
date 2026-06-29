/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Exportadores:
 * - patientDossierHtml: genera HTML autocontenido con la ficha completa
 *   del paciente (perfil + métricas + evolución + pagos + sesiones + notas).
 * - financialCsv / financialHtml: snapshot de pagos del mes o año.
 */

import {
  ClientProfile,
  MetricSample,
  PaymentRecord,
  ScheduledRoutine,
  SessionNote
} from '../types';
import { computeBmi, computeBmr, computeTdee, bmiCategory, sexLabel, activityLabel } from '../constants';

function formatCurrency(amount: number, currency = 'CLP'): string {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ----------------------------------------------------------------------- *
 * Expediente del paciente (HTML autocontenido para imprimir/PDF)
 * ----------------------------------------------------------------------- */

interface DossierContext {
  client: ClientProfile;
  metricSamples: MetricSample[];
  payments: PaymentRecord[];
  sessionNotes: SessionNote[];
  scheduledRoutines: ScheduledRoutine[];
  coachName: string;
}

export function patientDossierHtml(ctx: DossierContext): string {
  const { client, metricSamples, payments, sessionNotes, scheduledRoutines, coachName } = ctx;
  const samples = metricSamples
    .filter(s => s.clientId === client.id)
    .sort((a, b) => a.takenAt - b.takenAt);
  const pays = payments.filter(p => p.clientId === client.id).sort((a, b) => b.paidAt - a.paidAt);
  const notes = sessionNotes.filter(n => n.clientId === client.id).sort((a, b) => b.takenAt - a.takenAt);
  const sched = scheduledRoutines.filter(s => s.clientId === client.id);

  const bmi = computeBmi(client.metrics.weightKg, client.metrics.heightCm);
  const bmr = computeBmr(client.metrics);
  const tdee = computeTdee(client.metrics);
  const bmiCat = bmiCategory(bmi);

  const totalPaid = pays.reduce((acc, p) => acc + p.amount, 0);
  const currency = pays[0]?.currency ?? client.practice?.pricing?.currency ?? 'CLP';

  const avatarBlock = client.avatarDataUrl
    ? `<img src="${client.avatarDataUrl}" alt="" class="avatar" />`
    : `<div class="avatar avatar-letter">${esc(client.name.charAt(0).toUpperCase())}</div>`;

  const tagsBlock = (client.tags ?? []).length
    ? `<div class="tags">${(client.tags ?? []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>`
    : '';

  const samplesRows = samples.map(s => `
    <tr>
      <td>${esc(new Date(s.takenAt).toLocaleDateString('es-ES'))}</td>
      <td>${s.weightKg ?? '—'}</td>
      <td>${s.fatPercentage ?? '—'}</td>
      <td>${s.benchPress1RM ?? '—'}</td>
      <td>${s.squat1RM ?? '—'}</td>
      <td>${s.deadlift1RM ?? '—'}</td>
      <td>${s.pullUpMaxReps ?? '—'}</td>
      <td>${s.vo2Max ?? '—'}</td>
    </tr>`).join('');

  const paymentsRows = pays.map(p => `
    <tr>
      <td>${esc(new Date(p.paidAt).toLocaleDateString('es-ES'))}</td>
      <td>${esc(p.concept)}</td>
      <td>${esc(p.method ?? '—')}</td>
      <td>${esc(p.receiptNumber ?? '—')}</td>
      <td class="r">${formatCurrency(p.amount, p.currency)}</td>
    </tr>`).join('');

  const notesBlocks = notes.map(n => `
    <div class="note">
      <header>
        <span class="badge">${esc(n.kind)}</span>
        <strong>${esc(n.title)}</strong>
        <small>${esc(new Date(n.takenAt).toLocaleDateString('es-ES'))}</small>
      </header>
      ${n.content ? `<p>${esc(n.content).replace(/\n/g, '<br/>')}</p>` : ''}
    </div>
  `).join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Expediente — ${esc(client.name)} · MankindFactory</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 880px; margin: 0 auto; padding: 32px 24px; color: #18181b; background: #fff; line-height: 1.5; }
  h1 { font-size: 28px; margin: 0; font-weight: 800; }
  h2 { font-size: 18px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #5D36FF; color: #5D36FF; text-transform: uppercase; letter-spacing: 0.5px; }
  h3 { font-size: 14px; margin: 16px 0 6px; color: #3f3f46; text-transform: uppercase; letter-spacing: 0.5px; }
  header.dossier-head { display: flex; align-items: center; gap: 20px; padding-bottom: 24px; border-bottom: 1px solid #e4e4e7; }
  .avatar { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 3px solid #5D36FF; flex-shrink: 0; }
  .avatar-letter { display: flex; align-items: center; justify-content: center; background: #5D36FF20; color: #5D36FF; font-size: 32px; font-weight: 800; }
  .head-meta { flex: 1; }
  .head-meta small { display: block; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .tags { margin-top: 8px; }
  .tag { display: inline-block; padding: 2px 8px; background: #5D36FF15; color: #5D36FF; border-radius: 12px; font-size: 11px; margin-right: 4px; font-weight: 600; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { background: #f4f4f5; padding: 12px; border-radius: 8px; }
  .kpi small { display: block; color: #71717a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi strong { font-size: 18px; color: #18181b; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 8px 0 16px; font-size: 13px; }
  dt { color: #71717a; font-weight: 600; }
  dd { margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
  table th { background: #f4f4f5; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #52525b; }
  table td { padding: 8px; border-top: 1px solid #e4e4e7; }
  table td.r { text-align: right; font-weight: 600; }
  .note { background: #fafafa; border-left: 3px solid #5D36FF; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 4px 4px 0; }
  .note header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .note small { color: #71717a; font-size: 11px; }
  .note p { margin: 0; font-size: 13px; white-space: pre-wrap; }
  .badge { background: #5D36FF; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .empty { color: #a1a1aa; font-style: italic; font-size: 12px; padding: 8px 0; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e4e4e7; color: #71717a; font-size: 11px; text-align: center; }
  @media print {
    body { max-width: none; padding: 0; }
    h2 { page-break-after: avoid; }
    .note, tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<header class="dossier-head">
  ${avatarBlock}
  <div class="head-meta">
    <small>Expediente clínico</small>
    <h1>${esc(client.name)}</h1>
    <div style="margin-top:6px; color:#52525b; font-size:13px;">
      ${esc(client.experienceLevel)} · ${esc(client.status ?? 'activo')}
      ${client.practice?.acquiredAt ? ` · En cartera desde ${esc(fmtDate(client.practice.acquiredAt))}` : ''}
    </div>
    ${tagsBlock}
  </div>
</header>

<h2>Snapshot</h2>
<div class="kpis">
  <div class="kpi"><small>IMC</small><strong>${bmi !== null ? bmi.toFixed(1) : '—'}</strong>${bmiCat ? `<div style="color:${bmiCat.color}; font-size:11px;">${esc(bmiCat.label)}</div>` : ''}</div>
  <div class="kpi"><small>BMR (Benedict)</small><strong>${bmr ?? '—'} kcal</strong></div>
  <div class="kpi"><small>TDEE</small><strong>${tdee ?? '—'} kcal</strong></div>
  <div class="kpi"><small>Total pagado</small><strong>${formatCurrency(totalPaid, currency)}</strong></div>
</div>

<h2>Datos clínicos</h2>
<dl>
  <dt>Sexo</dt><dd>${esc(sexLabel(client.metrics.sex))}</dd>
  <dt>Edad</dt><dd>${client.metrics.age ?? '—'} años</dd>
  <dt>Peso</dt><dd>${client.metrics.weightKg ?? '—'} kg</dd>
  <dt>Talla</dt><dd>${client.metrics.heightCm ?? '—'} cm</dd>
  <dt>Actividad</dt><dd>${esc(activityLabel(client.metrics.activityLevel))}</dd>
  <dt>% Grasa</dt><dd>${client.metrics.fatPercentage ?? '—'}%</dd>
</dl>

<h2>Antecedentes</h2>
<dl>
  <dt>Mórbidos</dt><dd>${esc(client.clinical.morbidities) || '<em>—</em>'}</dd>
  <dt>Medicamentos</dt><dd>${esc(client.clinical.medications) || '<em>—</em>'}</dd>
  <dt>Alergias</dt><dd>${esc(client.clinical.allergies) || '<em>—</em>'}</dd>
  <dt>Cirugías</dt><dd>${esc(client.clinical.surgeries) || '<em>—</em>'}</dd>
  <dt>Lesiones</dt><dd>${esc(client.clinical.injuries) || '<em>—</em>'}</dd>
  <dt>Notas</dt><dd>${esc(client.clinical.notes) || '<em>—</em>'}</dd>
</dl>

<h2>Objetivos</h2>
<dl>
  <dt>Rendimiento</dt><dd>${esc(client.goals.performance) || '<em>—</em>'}</dd>
  <dt>Estético</dt><dd>${esc(client.goals.aesthetic) || '<em>—</em>'}</dd>
  <dt>Salud</dt><dd>${esc(client.goals.health) || '<em>—</em>'}</dd>
</dl>

<h2>Mediciones longitudinales (${samples.length})</h2>
${samples.length === 0 ? '<p class="empty">Sin mediciones registradas.</p>' : `
<table>
  <thead><tr><th>Fecha</th><th>Peso</th><th>%Grasa</th><th>Banca</th><th>Sentadilla</th><th>Peso muerto</th><th>Pull-ups</th><th>VO2</th></tr></thead>
  <tbody>${samplesRows}</tbody>
</table>`}

<h2>Timeline de sesiones (${notes.length})</h2>
${notes.length === 0 ? '<p class="empty">Sin sesiones registradas.</p>' : notesBlocks}

<h2>Pagos (${pays.length}) — Total: ${formatCurrency(totalPaid, currency)}</h2>
${pays.length === 0 ? '<p class="empty">Sin pagos registrados.</p>' : `
<table>
  <thead><tr><th>Fecha</th><th>Concepto</th><th>Método</th><th>N° boleta</th><th class="r">Monto</th></tr></thead>
  <tbody>${paymentsRows}</tbody>
</table>`}

<h2>Equipamiento disponible</h2>
${client.equipment.length === 0 ? '<p class="empty">Sin equipamiento cargado.</p>' :
  `<p>${client.equipment.map(esc).join(' · ')}</p>`}

<h2>Notas internas del coach</h2>
<p style="white-space:pre-wrap; font-size:13px;">${esc(client.coachNotes) || '<em>—</em>'}</p>

<footer>
  Generado el ${new Date().toLocaleString('es-ES')} · Práctica de ${esc(coachName)} · ${sched.length} cargas programadas en total
</footer>

</body>
</html>`;
}

/* ----------------------------------------------------------------------- *
 * Exporter financiero CSV
 * ----------------------------------------------------------------------- */

interface FinanceExportContext {
  payments: PaymentRecord[];
  clients: ClientProfile[];
  /** Si se pasa, filtra a este mes (year, month 0-11). Si no, exporta todo. */
  month?: { year: number; monthIndex: number };
}

export function financialCsv(ctx: FinanceExportContext): string {
  const { payments, clients, month } = ctx;
  const filtered = month
    ? payments.filter(p => {
        const d = new Date(p.paidAt);
        return d.getFullYear() === month.year && d.getMonth() === month.monthIndex;
      })
    : payments;
  const sorted = [...filtered].sort((a, b) => a.paidAt - b.paidAt);
  const clientMap = new Map(clients.map(c => [c.id, c.name]));

  const escapeCsv = (s: string): string => {
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = ['Fecha', 'Paciente', 'Concepto', 'Método', 'N° Boleta', 'Monto', 'Moneda', 'Notas'];
  const rows = sorted.map(p => [
    new Date(p.paidAt).toLocaleDateString('es-ES'),
    clientMap.get(p.clientId) ?? p.clientId,
    p.concept,
    p.method ?? '',
    p.receiptNumber ?? '',
    String(p.amount),
    p.currency,
    p.notes ?? ''
  ]);
  const total = sorted.reduce((acc, p) => acc + p.amount, 0);
  rows.push(['', '', '', '', 'TOTAL', String(total), sorted[0]?.currency ?? 'CLP', '']);

  return [header, ...rows].map(r => r.map(escapeCsv).join(',')).join('\n');
}

export function financialReportHtml(ctx: FinanceExportContext & { coachName: string }): string {
  const { payments, clients, month, coachName } = ctx;
  const filtered = month
    ? payments.filter(p => {
        const d = new Date(p.paidAt);
        return d.getFullYear() === month.year && d.getMonth() === month.monthIndex;
      })
    : payments;
  const sorted = [...filtered].sort((a, b) => b.paidAt - a.paidAt);
  const clientMap = new Map(clients.map(c => [c.id, c.name]));
  const total = sorted.reduce((acc, p) => acc + p.amount, 0);
  const currency = sorted[0]?.currency ?? 'CLP';

  /* Agrupar por paciente */
  const byClient: Record<string, { name: string; total: number; count: number }> = {};
  for (const p of sorted) {
    const name = clientMap.get(p.clientId) ?? p.clientId;
    if (!byClient[p.clientId]) byClient[p.clientId] = { name, total: 0, count: 0 };
    byClient[p.clientId].total += p.amount;
    byClient[p.clientId].count += 1;
  }
  const sortedClients = Object.values(byClient).sort((a, b) => b.total - a.total);

  /* Agrupar por método */
  const byMethod: Record<string, number> = {};
  for (const p of sorted) {
    const m = p.method ?? 'otro';
    byMethod[m] = (byMethod[m] ?? 0) + p.amount;
  }

  const periodLabel = month
    ? new Date(month.year, month.monthIndex, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : 'Histórico completo';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte financiero · ${esc(periodLabel)} · ${esc(coachName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 880px; margin: 0 auto; padding: 32px 24px; color: #18181b; background: #fff; line-height: 1.5; }
  h1 { font-size: 26px; margin: 0; font-weight: 800; }
  h2 { font-size: 16px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #10B981; color: #10B981; text-transform: uppercase; letter-spacing: 0.5px; }
  header.head { display: flex; justify-content: space-between; align-items: end; padding-bottom: 20px; border-bottom: 1px solid #e4e4e7; }
  .total-card { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 20px 28px; border-radius: 8px; }
  .total-card small { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; }
  .total-card strong { display: block; font-size: 32px; margin-top: 4px; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { background: #f4f4f5; padding: 12px; border-radius: 8px; }
  .kpi small { display: block; color: #71717a; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .kpi strong { font-size: 18px; color: #18181b; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
  table th { background: #f4f4f5; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #52525b; }
  table td { padding: 8px; border-top: 1px solid #e4e4e7; }
  table td.r { text-align: right; font-weight: 600; }
  table tfoot td { font-weight: 800; border-top: 2px solid #18181b; background: #fafafa; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e4e4e7; color: #71717a; font-size: 11px; text-align: center; }
  @media print { body { max-width: none; padding: 0; } }
</style>
</head>
<body>

<header class="head">
  <div>
    <small style="color:#71717a; font-size:11px; text-transform:uppercase; letter-spacing:1px;">Reporte financiero</small>
    <h1>${esc(periodLabel)}</h1>
    <p style="color:#52525b; font-size:13px; margin-top:6px;">Práctica de ${esc(coachName)}</p>
  </div>
  <div class="total-card">
    <small>Total recaudado</small>
    <strong>${formatCurrency(total, currency)}</strong>
  </div>
</header>

<div class="kpis">
  <div class="kpi"><small>Pagos registrados</small><strong>${sorted.length}</strong></div>
  <div class="kpi"><small>Pacientes que pagaron</small><strong>${Object.keys(byClient).length}</strong></div>
  <div class="kpi"><small>Ticket promedio</small><strong>${formatCurrency(sorted.length > 0 ? total / sorted.length : 0, currency)}</strong></div>
</div>

<h2>Top pacientes por monto</h2>
<table>
  <thead><tr><th>Paciente</th><th>Pagos</th><th class="r">Total</th></tr></thead>
  <tbody>
    ${sortedClients.map(c => `<tr><td>${esc(c.name)}</td><td>${c.count}</td><td class="r">${formatCurrency(c.total, currency)}</td></tr>`).join('')}
  </tbody>
</table>

<h2>Distribución por método de pago</h2>
<table>
  <thead><tr><th>Método</th><th class="r">Total</th><th class="r">%</th></tr></thead>
  <tbody>
    ${Object.entries(byMethod).sort((a, b) => b[1] - a[1]).map(([m, v]) => `
      <tr><td>${esc(m)}</td><td class="r">${formatCurrency(v, currency)}</td><td class="r">${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%</td></tr>
    `).join('')}
  </tbody>
</table>

<h2>Detalle de pagos (${sorted.length})</h2>
<table>
  <thead><tr><th>Fecha</th><th>Paciente</th><th>Concepto</th><th>Método</th><th>N° Boleta</th><th class="r">Monto</th></tr></thead>
  <tbody>
    ${sorted.map(p => `
      <tr>
        <td>${esc(new Date(p.paidAt).toLocaleDateString('es-ES'))}</td>
        <td>${esc(clientMap.get(p.clientId) ?? p.clientId)}</td>
        <td>${esc(p.concept)}</td>
        <td>${esc(p.method ?? '—')}</td>
        <td>${esc(p.receiptNumber ?? '—')}</td>
        <td class="r">${formatCurrency(p.amount, p.currency)}</td>
      </tr>
    `).join('')}
  </tbody>
  <tfoot>
    <tr><td colspan="5">TOTAL</td><td class="r">${formatCurrency(total, currency)}</td></tr>
  </tfoot>
</table>

<footer>
  Generado el ${new Date().toLocaleString('es-ES')} · ${esc(coachName)} · MankindFactory Routine Workspace
</footer>

</body>
</html>`;
}

/* ----------------------------------------------------------------------- *
 * Export ICS (.ics) — agenda de próximos controles para Google/Apple Cal
 * ----------------------------------------------------------------------- */

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Formato YYYYMMDD para eventos "all-day" del calendario. */
function icsDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Escapa caracteres especiales del formato ICS. */
function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

interface IcsExportContext {
  clients: ClientProfile[];
  coachName: string;
}

/**
 * Genera un archivo .ics con los próximos controles (eventos all-day).
 * Importable en Google Calendar, Apple Calendar, Outlook, etc.
 */
export function controlsCalendarIcs(ctx: IcsExportContext): string {
  const { clients, coachName } = ctx;
  const now = Date.now();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MankindFactory//Routine Workspace//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Controles · ${icsEscape(coachName)}`,
    `X-WR-CALDESC:Próximos controles agendados`,
    'X-WR-TIMEZONE:America/Santiago'
  ];

  let added = 0;
  for (const c of clients) {
    const ts = c.practice?.nextControlAt;
    if (!ts) continue;
    /* Solo eventos del último mes y próximos 6 meses */
    const ageDays = (now - ts) / (24 * 60 * 60 * 1000);
    if (ageDays > 30 || ageDays < -180) continue;
    const dtStart = icsDate(ts);
    /* All-day event: DTEND es el día siguiente. */
    const endDay = new Date(ts + 24 * 60 * 60 * 1000);
    const dtEnd = `${endDay.getFullYear()}${pad(endDay.getMonth() + 1)}${pad(endDay.getDate())}`;
    const uid = `control-${c.id}-${ts}@mankindfactory`;
    const description = c.practice?.controlNotes
      ? `Notas: ${icsEscape(c.practice.controlNotes)}`
      : 'Control programado';
    const summary = icsEscape(`Control · ${c.name}`);
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'CATEGORIES:Práctica clínica',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      `DESCRIPTION:Recordatorio: Control de ${icsEscape(c.name)} mañana`,
      'END:VALARM',
      'END:VEVENT'
    );
    added += 1;
  }

  lines.push('END:VCALENDAR');
  /* Si no hay nada, generamos calendar vacío válido igual */
  void added;
  return lines.join('\r\n');
}

/* ----------------------------------------------------------------------- *
 * Generador de documentos imprimibles (ebooks, flyers, manuales, etc.)
 * Todos comparten el branding MankindFactory (morado #5D36FF, Inter, mono)
 * ----------------------------------------------------------------------- */

export type DocumentKind = 'ebook' | 'flyer' | 'ficha' | 'manual' | 'infografia';

/** Posición de un sub-bloque imagen dentro de una sección. */
export type SectionImagePosition = 'top' | 'left' | 'right' | 'inline' | 'below';

/** Un sub-bloque imagen / pictograma dentro de una sección, reordenable. */
export interface SectionImage {
  id: string;
  dataUrl: string;
  position: SectionImagePosition;
  /** Caption opcional debajo de la imagen. */
  caption?: string;
}

export interface DocumentSection {
  heading: string;
  content: string;       // Multilínea, soporta saltos de párrafo
  highlight?: boolean;   // resaltar como bloque destacado
  /**
   * Galería de imágenes/pictogramas de esta sección. Cada elemento es un
   * sub-bloque movible: puede ir top/left/right/inline/below del contenido.
   * Reemplaza el antiguo {imageDataUrl, imagePosition} (que se mantiene por
   * compatibilidad con guardados anteriores y se migra al cargar).
   */
  images?: SectionImage[];
  /** @deprecated Usar `images` (se mantiene para retrocompatibilidad). */
  imageDataUrl?: string;
  /** @deprecated Usar `images`. */
  imagePosition?: 'top' | 'left' | 'right';
}

export interface DocumentSpec {
  kind: DocumentKind;
  title: string;
  subtitle?: string;
  author: string;              // ej. "Alberto Maturana S."
  sections: DocumentSection[];
  callToAction?: string;       // botón / línea final destacada
  contact?: string;            // ej "WhatsApp +56 9..."
  coverImageDataUrl?: string;  // opcional, base64
}

/** Convierte texto plano a HTML: párrafos separados por doble salto, bullets con "- ", etc. */
function richTextToHtml(text: string): string {
  if (!text) return '';
  const blocks = text.split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    /* Lista si todas las líneas empiezan con "- " o "• " o "* " */
    if (lines.length > 0 && lines.every(l => /^[-•*]\s/.test(l))) {
      return `<ul>${lines.map(l => `<li>${esc(l.replace(/^[-•*]\s/, ''))}</li>`).join('')}</ul>`;
    }
    /* Lista numerada */
    if (lines.length > 0 && lines.every(l => /^\d+[.)]\s/.test(l))) {
      return `<ol>${lines.map(l => `<li>${esc(l.replace(/^\d+[.)]\s/, ''))}</li>`).join('')}</ol>`;
    }
    /* Párrafo con <br> internos */
    return `<p>${lines.map(esc).join('<br/>')}</p>`;
  }).join('\n');
}

/** Genera HTML autocontenido con la narrativa visual MankindFactory. */
export function documentHtml(spec: DocumentSpec): string {
  const kindLabels: Record<DocumentKind, string> = {
    ebook: 'Mini-guía',
    flyer: 'Flyer',
    ficha: 'Ficha técnica',
    manual: 'Manual',
    infografia: 'Infografía'
  };
  const generatedDate = new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });

  /* CSS específico según tipo de documento */
  const isCompact = spec.kind === 'flyer' || spec.kind === 'infografia';
  const pageStyle = isCompact
    ? 'min-height: 100vh; padding: 48px 56px;'
    : 'padding: 56px 64px;';

  const sectionsHtml = spec.sections.map((s, idx) => {
    const html = richTextToHtml(s.content);
    const cls = s.highlight ? 'highlight' : '';
    const heading = `<h2><span class="section-num">${String(idx + 1).padStart(2, '0')}</span>${esc(s.heading)}</h2>`;

    /* Compatibilidad con secciones viejas (1 sola imagen). Si existe `images`
       usamos ese array. Si no, migramos el campo legacy a un array de 1. */
    const images: SectionImage[] = s.images && s.images.length > 0
      ? s.images
      : (s.imageDataUrl ? [{
          id: `img-legacy-${idx}`,
          dataUrl: s.imageDataUrl,
          position: (s.imagePosition ?? 'top') as SectionImagePosition,
          caption: undefined
        }] : []);

    const renderImg = (img: SectionImage, extraClass = ''): string => `
      <figure class="section-image section-image-${img.position} ${extraClass}">
        <img src="${img.dataUrl}" alt="${img.caption ? esc(img.caption) : ''}" />
        ${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}
      </figure>`;

    const topImages = images.filter(i => i.position === 'top');
    const leftImages = images.filter(i => i.position === 'left');
    const rightImages = images.filter(i => i.position === 'right');
    const inlineImages = images.filter(i => i.position === 'inline');
    const belowImages = images.filter(i => i.position === 'below');

    const inlineGalleryHtml = inlineImages.length > 0
      ? `<div class="inline-gallery">${inlineImages.map(i => renderImg(i, 'gallery-item')).join('')}</div>`
      : '';
    const belowGalleryHtml = belowImages.length > 0
      ? `<div class="below-gallery">${belowImages.map(i => renderImg(i, 'gallery-item')).join('')}</div>`
      : '';

    /* Layout con flex si hay imágenes left o right */
    if (leftImages.length > 0 || rightImages.length > 0) {
      const sideClass = leftImages.length > 0 ? 'image-left' : 'image-right';
      const sideImages = leftImages.length > 0 ? leftImages : rightImages;
      return `
        <section class="${cls} ${sideClass}">
          ${heading}
          ${topImages.map(i => renderImg(i)).join('')}
          <div class="section-flex">
            <div class="section-image-side">
              ${sideImages.map(i => renderImg(i)).join('')}
            </div>
            <div class="content">${html}${inlineGalleryHtml}</div>
          </div>
          ${belowGalleryHtml}
        </section>`;
    }
    /* Sin imágenes laterales */
    return `
      <section class="${cls}">
        ${heading}
        ${topImages.map(i => renderImg(i)).join('')}
        <div class="content">${html}${inlineGalleryHtml}</div>
        ${belowGalleryHtml}
      </section>`;
  }).join('\n');

  const ctaBlock = spec.callToAction ? `
    <div class="cta">
      <span class="cta-label">${esc(spec.callToAction)}</span>
      ${spec.contact ? `<span class="cta-contact">${esc(spec.contact)}</span>` : ''}
    </div>` : '';

  const coverBlock = spec.coverImageDataUrl
    ? `<div class="cover-image"><img src="${spec.coverImageDataUrl}" alt="" /></div>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(spec.title)} · ${esc(spec.author)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  :root {
    --brand: #5D36FF;
    --brand-dark: #4A22F0;
    --brand-soft: #5D36FF15;
    --ink: #18181b;
    --muted: #52525b;
    --faint: #71717a;
    --line: #e4e4e7;
    --bg-card: #fafafa;
  }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    margin: 0;
    color: var(--ink);
    background: #fff;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    max-width: 800px;
    margin: 0 auto;
    ${pageStyle}
  }

  /* HEADER: branding consistente */
  header.doc-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 24px;
    border-bottom: 3px solid var(--brand);
    margin-bottom: 36px;
  }
  .brand {
    font-family: 'Inter', sans-serif;
    font-weight: 900;
    font-size: 22px;
    letter-spacing: -0.02em;
    color: var(--brand);
  }
  .brand .factory { color: var(--ink); }
  .doc-kind {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--faint);
  }

  /* PORTADA */
  .cover {
    margin-bottom: ${isCompact ? '32' : '64'}px;
  }
  .cover-tag {
    display: inline-block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--brand);
    background: var(--brand-soft);
    padding: 4px 12px;
    border-radius: 12px;
    margin-bottom: 16px;
  }
  h1 {
    font-family: 'Inter', sans-serif;
    font-size: ${isCompact ? '38' : '46'}px;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.03em;
    margin: 0 0 12px;
  }
  .subtitle {
    font-size: ${isCompact ? '16' : '18'}px;
    color: var(--muted);
    margin: 0 0 24px;
    font-weight: 400;
  }
  .cover-meta {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    border-top: 1px solid var(--line);
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
  }
  .cover-image {
    margin: 24px 0;
    border-radius: 12px;
    overflow: hidden;
    background: var(--brand-soft);
    padding: 32px;
    text-align: center;
    border: 1px solid var(--line);
  }
  .cover-image img {
    max-width: 100%;
    max-height: 280px;
    display: inline-block;
  }

  /* SECCIONES */
  section {
    margin-bottom: ${isCompact ? '20' : '40'}px;
    page-break-inside: avoid;
  }
  section.highlight {
    background: var(--brand-soft);
    border-left: 4px solid var(--brand);
    padding: ${isCompact ? '20px 24px' : '28px 32px'};
    border-radius: 0 8px 8px 0;
  }
  h2 {
    font-family: 'Inter', sans-serif;
    font-size: ${isCompact ? '20' : '24'}px;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 ${isCompact ? '10' : '14'}px;
    display: flex;
    align-items: baseline;
    gap: 12px;
    letter-spacing: -0.01em;
  }
  .section-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--brand);
    background: var(--brand-soft);
    padding: 2px 8px;
    border-radius: 4px;
  }
  .content p {
    margin: 0 0 12px;
    font-size: ${isCompact ? '14' : '15'}px;
    color: var(--ink);
  }
  .content p:last-child { margin-bottom: 0; }
  .content ul, .content ol {
    margin: 8px 0;
    padding-left: 24px;
    font-size: ${isCompact ? '14' : '15'}px;
  }
  .content li {
    margin-bottom: 6px;
    line-height: 1.5;
  }
  .content li::marker { color: var(--brand); font-weight: 700; }

  /* Imágenes de sección */
  .section-image img {
    max-width: 100%;
    display: block;
    border-radius: 8px;
  }
  .section-image-top {
    margin: 12px 0 16px;
    text-align: center;
  }
  .section-image-top img {
    max-height: 240px;
    margin: 0 auto;
    background: var(--brand-soft);
    padding: ${isCompact ? '12' : '16'}px;
  }
  .section-flex {
    display: flex;
    gap: 20px;
    align-items: flex-start;
  }
  .section-image-left, .section-image-right {
    flex: 0 0 ${isCompact ? '120' : '160'}px;
    background: var(--brand-soft);
    padding: 12px;
    border-radius: 8px;
  }
  .section-image-left img, .section-image-right img {
    max-width: 100%;
  }
  section.image-right .section-flex {
    flex-direction: row-reverse;
  }
  section.image-left .section-flex .content,
  section.image-right .section-flex .content {
    flex: 1;
  }
  @media (max-width: 600px) {
    .section-flex { flex-direction: column; }
    section.image-right .section-flex { flex-direction: column; }
    .section-image-left, .section-image-right { flex: 0 0 auto; align-self: center; max-width: 240px; }
  }
  /* Galería de pictogramas (inline dentro del contenido o below) */
  .inline-gallery, .below-gallery {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin: 14px 0 6px;
    justify-content: flex-start;
  }
  .below-gallery { justify-content: center; }
  .gallery-item {
    flex: 0 0 ${isCompact ? '90' : '120'}px;
    background: var(--brand-soft);
    padding: 10px;
    border-radius: 8px;
    margin: 0;
    text-align: center;
  }
  .gallery-item img {
    max-height: ${isCompact ? '80' : '100'}px;
    width: auto;
    margin: 0 auto;
  }
  .gallery-item figcaption {
    margin-top: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  /* Lado izquierdo/derecho: si hay varias, apilarlas */
  .section-image-side {
    flex: 0 0 ${isCompact ? '140' : '180'}px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .section-image-side .section-image {
    background: var(--brand-soft);
    padding: 10px;
    border-radius: 8px;
    margin: 0;
  }
  .section-image-side .section-image img { max-width: 100%; }

  /* CTA destacado */
  .cta {
    background: linear-gradient(135deg, var(--brand), var(--brand-dark));
    color: white;
    border-radius: 12px;
    padding: 24px 28px;
    margin-top: 40px;
    text-align: center;
  }
  .cta-label {
    display: block;
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .cta-contact {
    display: block;
    margin-top: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    opacity: 0.9;
    letter-spacing: 0.05em;
  }

  /* FOOTER */
  footer.doc-foot {
    margin-top: ${isCompact ? '36' : '64'}px;
    padding-top: 20px;
    border-top: 1px solid var(--line);
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--faint);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  footer.doc-foot .footer-brand {
    color: var(--brand);
    font-weight: 700;
  }

  /* PRINT */
  @media print {
    body { background: white; }
    .page { max-width: none; padding: 32px 40px; }
    section { page-break-inside: avoid; }
    section.highlight { page-break-inside: avoid; }
    h1, h2 { page-break-after: avoid; }
    .cta { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<div class="page">

  <header class="doc-head">
    <span class="brand">MANKIND<span class="factory">FACTORY</span></span>
    <span class="doc-kind">${esc(kindLabels[spec.kind])}</span>
  </header>

  <div class="cover">
    <span class="cover-tag">${esc(kindLabels[spec.kind])} · Práctica clínica</span>
    <h1>${esc(spec.title)}</h1>
    ${spec.subtitle ? `<p class="subtitle">${esc(spec.subtitle)}</p>` : ''}
    ${coverBlock}
    <div class="cover-meta">
      <span>Por ${esc(spec.author)}</span>
      <span>${esc(generatedDate)}</span>
    </div>
  </div>

  ${sectionsHtml}

  ${ctaBlock}

  <footer class="doc-foot">
    <span><span class="footer-brand">MankindFactory</span> · Práctica de ${esc(spec.author)}</span>
    <span>Generado el ${esc(generatedDate)}</span>
  </footer>

</div>

</body>
</html>`;
}

/** Presets de documentos con estructura inicial sugerida. */
export const DOCUMENT_PRESETS: { id: string; kind: DocumentKind; label: string; description: string; build: (author: string) => DocumentSpec }[] = [
  {
    id: 'ebook-fuerza-basica',
    kind: 'ebook',
    label: 'Mini-guía · Fuerza para principiantes',
    description: 'Documento de 5-8 páginas con introducción educativa al entrenamiento de fuerza.',
    build: (author) => ({
      kind: 'ebook', author,
      title: 'Fuerza para principiantes',
      subtitle: 'Los 5 conceptos que necesitas dominar antes de tu primera barra',
      sections: [
        { heading: '¿Por qué fuerza?', content: 'La fuerza es la madre de todas las cualidades físicas. Mejora la salud ósea, la composición corporal, el rendimiento deportivo y la calidad de vida a largo plazo.\n\nNo se trata de levantar mucho peso desde el día uno. Se trata de adquirir el patrón motor correcto, progresar lentamente y disfrutar del proceso.' },
        { heading: 'Los 5 patrones básicos', content: '- Sentadilla (squat): flexión de cadera y rodilla\n- Bisagra (hinge): flexión dominante de cadera\n- Empuje horizontal: press de banca, flexiones\n- Empuje vertical: press militar\n- Tracción: dominadas, remo' },
        { heading: 'Cómo empezar', content: '1. Aprender la técnica con barra vacía o cargas muy bajas\n2. Sumar peso solo cuando la técnica sea consistente\n3. 2-3 sesiones por semana, descansando 48 horas entre sesiones del mismo grupo muscular\n4. Registrar cada sesión: peso, repeticiones, sensación', highlight: true },
        { heading: 'Errores comunes a evitar', content: '- Saltarse el calentamiento\n- Imitar lo que ves en redes sin contexto\n- Compararte con otros\n- Esperar resultados en 4 semanas (los reales llegan en meses)' },
        { heading: 'El siguiente paso', content: 'Si quieres una progresión personalizada, agenda una evaluación inicial. En 60 minutos definimos tu punto de partida y diseñamos tu primer mes de entrenamiento.' }
      ],
      callToAction: 'Agenda tu evaluación inicial',
      contact: 'WhatsApp +56 9 [completar]'
    })
  },
  {
    id: 'flyer-promo',
    kind: 'flyer',
    label: 'Flyer · Promoción de servicio',
    description: 'Documento de 1 página con oferta destacada para imprimir o compartir.',
    build: (author) => ({
      kind: 'flyer', author,
      title: 'Evaluación inicial',
      subtitle: 'Conocé tu punto de partida real y planifica los próximos 6 meses con criterio.',
      sections: [
        { heading: '¿Qué incluye?', content: '- Antropometría completa (composición corporal)\n- Evaluación funcional de 1RM en levantamientos principales\n- Análisis de patrones de movimiento\n- Identificación de áreas a mejorar\n- Diseño de tu primer mes de entrenamiento', highlight: true },
        { heading: 'Inversión', content: '$60.000 CLP\n60 minutos · presencial o por video\n\nIncluye informe escrito que puedes compartir con tu kinesiólogo o médico.' },
        { heading: '¿Para quién?', content: '- Principiantes que quieren empezar bien\n- Avanzados que sienten que se estancaron\n- Pacientes post-lesión que necesitan retomar con seguridad' }
      ],
      callToAction: 'Reserva tu cupo',
      contact: 'WhatsApp +56 9 [completar]'
    })
  },
  {
    id: 'manual-bienvenida',
    kind: 'manual',
    label: 'Manual de bienvenida del paciente',
    description: 'Documento que se entrega al inscribir un paciente nuevo. Define expectativas y flujo de trabajo.',
    build: (author) => ({
      kind: 'manual', author,
      title: 'Bienvenido a la práctica',
      subtitle: 'Cómo trabajamos juntos los próximos meses',
      sections: [
        { heading: 'Mi compromiso', content: 'Te acompaño en tu proceso con criterio clínico, sin atajos ni promesas vacías. Cada sesión la diseño basándome en evidencia y en TU situación específica.', highlight: true },
        { heading: 'Tu compromiso', content: '- Asistir puntualmente a los controles agendados\n- Registrar honestamente tu adherencia entre sesiones\n- Avisar con tiempo si necesitas reagendar\n- Comunicarme cualquier molestia o cambio en tu salud\n- Confiar en el proceso (los resultados reales toman tiempo)' },
        { heading: 'Cómo trabajamos', content: '1. Sesión inicial: evaluación completa + plan del primer mes\n2. Controles mensuales: ajuste de cargas, evaluación de progreso\n3. Reportes de avance: te enviaré un formulario digital antes de cada control\n4. Comunicación entre sesiones: WhatsApp para dudas técnicas, NO para emergencias médicas' },
        { heading: 'Pagos', content: '- Pago mensual al inicio del mes\n- Métodos aceptados: transferencia bancaria, efectivo\n- Te enviaré recordatorio de cobro automático con los datos\n- Cualquier cambio en el plan se discute con anticipación' },
        { heading: 'Confidencialidad', content: 'Todos tus datos clínicos, métricas y notas son privados. Solo se comparten con profesionales de salud que trates, y siempre con tu autorización.' }
      ],
      callToAction: 'Comenzamos cuando quieras',
      contact: 'WhatsApp +56 9 [completar]'
    })
  },
  {
    id: 'ficha-tecnica',
    kind: 'ficha',
    label: 'Ficha técnica · Ejercicio',
    description: 'Documento técnico para entregar al paciente con la descripción detallada de un movimiento.',
    build: (author) => ({
      kind: 'ficha', author,
      title: 'Sentadilla con barra trasera',
      subtitle: 'Técnica, errores frecuentes y progresión',
      sections: [
        { heading: 'Setup inicial', content: '- Barra apoyada sobre el trapecio superior, NO sobre las cervicales\n- Pies a ancho de hombros (puede variar según antropometría)\n- Punta de pies ligeramente hacia afuera (15-30°)\n- Mirada al frente, pecho arriba' },
        { heading: 'Ejecución', content: '1. Inhalar profundo y contraer el core (presión intra-abdominal)\n2. Iniciar el movimiento empujando las caderas hacia atrás\n3. Bajar manteniendo torso erguido, rodillas alineadas con los pies\n4. Descender hasta que el fémur esté paralelo al piso (o más profundo si la movilidad lo permite)\n5. Subir empujando con los talones, exhalando al final del movimiento', highlight: true },
        { heading: 'Errores comunes', content: '- Sacar los talones del piso (falta de movilidad de tobillo)\n- Valgo de rodilla (rodillas hacia adentro)\n- Pérdida de la lordosis lumbar al fondo\n- Inclinar el torso excesivamente hacia adelante' },
        { heading: 'Progresión sugerida', content: '1. Sentadilla con peso corporal (10x10 sin carga)\n2. Sentadilla goblet con mancuerna (8x3)\n3. Sentadilla con barra vacía (5x5 enfocando técnica)\n4. Sentadilla con carga progresiva (RPE 6-7, +2.5kg semanal)' },
        { heading: 'Cuándo NO hacerla', content: 'Si tienes molestias agudas de espalda, dolor de rodilla persistente o post-quirúrgico reciente, primero consulta con tu kinesiólogo. Existen variantes seguras (sentadilla a cajón, sentadilla en máquina) que pueden adaptarse a tu caso.' }
      ]
    })
  },
  {
    id: 'infografia-1rm',
    kind: 'infografia',
    label: 'Infografía · Cómo calcular tu 1RM',
    description: 'Documento visual de 1 página con info compacta. Ideal para historias de IG o panel del gym.',
    build: (author) => ({
      kind: 'infografia', author,
      title: 'Tu 1RM en 3 minutos',
      subtitle: 'Calcula tu fuerza máxima sin tener que cargar el 100% de tu peso',
      sections: [
        { heading: 'Por qué importa', content: 'El 1RM (una repetición máxima) es la referencia para prescribir todas las cargas de entrenamiento. Sin él, programar fuerza es improvisar.', highlight: true },
        { heading: 'Test seguro', content: '1. Calienta con cargas progresivas\n2. Elige un peso desafiante con el que puedas hacer 3-8 repeticiones máximo\n3. Levántalo hasta el fallo técnico (NO hasta el fallo absoluto)\n4. Anota: peso x repeticiones' },
        { heading: 'Fórmula', content: 'Epley: 1RM = Peso × (1 + Reps/30)\n\nEjemplo: 80kg × 5 reps = 80 × (1+5/30) = 93kg estimado' },
        { heading: 'Para qué lo usas', content: '- Fuerza máxima: 85-95% 1RM\n- Hipertrofia: 70-80% 1RM\n- Resistencia muscular: 60-70% 1RM' }
      ],
      callToAction: 'Calculadora en mankindfactory',
      contact: '@mankindfactory'
    })
  }
];

/* ----------------------------------------------------------------------- *
 * Trigger de descarga genérico
 * ----------------------------------------------------------------------- */

export function downloadBlob(content: string, filename: string, mime = 'text/html'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Printer,
  User,
  Activity,
  Flame,
  Info,
  BookOpen
} from 'lucide-react';
import { ClientProfile, MonthRef, ScheduledRoutine, WorkoutRoutine } from '../types';
import {
  DAY_NAMES,
  monthLabel,
  weekdayIndexFor,
  computeBmi,
  bmiCategory,
  computeBmr,
  computeTdee,
  activityLabel,
  sexLabel
} from '../constants';
import { findNscaExerciseById, nscaTechniqueSummary, NSCA_EXERCISES } from '../lib/nsca';
import { MovementIconForExercise, movementSvgString, patternForExercise, PATTERN_LABELS } from '../lib/movementIcons';
import { track } from '../lib/telemetry';

interface ExportTabProps {
  profile: ClientProfile;
  routines: WorkoutRoutine[];
  scheduledRoutines: ScheduledRoutine[];
  activeClientId: string;
  viewedMonth: MonthRef;
}

interface DaySession { routine: WorkoutRoutine; dayOfMonth: number; }
interface DayBucket { name: string; index: number; sessions: DaySession[]; }

interface WeekDay {
  weekdayIndex: number;
  weekdayName: string;
  date: Date;
  dayOfMonth: number;
  monthIndex: number;
  year: number;
  isPadding: boolean;
  sessions: { routine: WorkoutRoutine; scheduledId: string }[];
}

interface WeekBlock {
  monthLabel: string;
  weekNumber: number;
  rangeLabel: string;
  days: WeekDay[];
  totalSessions: number;
  totalMinutes: number;
}

type ExportScope = 'month' | 'all';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Agrupa los scheduled de un mes en semanas calendario empezando en lunes.
 * Cada semana incluye los 7 días, con flag isPadding para los que pertenecen
 * al mes anterior/siguiente.
 */
function buildWeeksForMonth(
  year: number,
  monthIndex: number,
  scheduled: ScheduledRoutine[],
  routinesById: Map<string, WorkoutRoutine>
): WeekBlock[] {
  const monthLabelStr = `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][monthIndex]} ${year}`;
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = lunes
  const startDate = new Date(year, monthIndex, 1 - startWeekday);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeksNeeded = Math.ceil((startWeekday + daysInMonth) / 7);

  // Index scheduled por (year, monthIndex, dayOfMonth) para lookup rápido
  const schedKey = (y: number, m: number, d: number) => `${y}-${m}-${d}`;
  const schedMap = new Map<string, ScheduledRoutine[]>();
  scheduled.forEach(s => {
    const k = schedKey(s.year, s.monthIndex, s.dayOfMonth);
    const list = schedMap.get(k) ?? [];
    list.push(s);
    schedMap.set(k, list);
  });

  const blocks: WeekBlock[] = [];
  for (let w = 0; w < weeksNeeded; w++) {
    const days: WeekDay[] = [];
    let totalSessions = 0;
    let totalMinutes = 0;
    let firstDate: Date | null = null;
    let lastDate: Date | null = null;
    for (let d = 0; d < 7; d++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + w * 7 + d);
      const isPadding = cur.getMonth() !== monthIndex || cur.getFullYear() !== year;
      const list = (schedMap.get(schedKey(cur.getFullYear(), cur.getMonth(), cur.getDate())) ?? [])
        .map(s => ({ routine: routinesById.get(s.routineId), scheduledId: s.id }))
        .filter((x): x is { routine: WorkoutRoutine; scheduledId: string } => !!x.routine);

      if (!isPadding) {
        if (!firstDate) firstDate = cur;
        lastDate = cur;
      }
      totalSessions += list.length;
      totalMinutes += list.reduce((acc, s) => acc + s.routine.estimatedDuration, 0);
      days.push({
        weekdayIndex: d,
        weekdayName: WEEKDAY_NAMES[d],
        date: cur,
        dayOfMonth: cur.getDate(),
        monthIndex: cur.getMonth(),
        year: cur.getFullYear(),
        isPadding,
        sessions: list
      });
    }

    const range = firstDate && lastDate
      ? `${firstDate.getDate()} – ${lastDate.getDate()}`
      : 'sin días del mes';
    blocks.push({
      monthLabel: monthLabelStr,
      weekNumber: w + 1,
      rangeLabel: range,
      days,
      totalSessions,
      totalMinutes
    });
  }
  return blocks;
}

const fmt = (v: number | undefined, unit: string) => typeof v === 'number' ? `${v} ${unit}` : '—';

/**
 * Dado todas las rutinas usadas en el alcance, retorna el set único de NscaExercises
 * referenciados por sus nscaId + los inferidos por nombre exacto.
 */
function collectGlossaryExercises(routines: WorkoutRoutine[]) {
  const used = new Set<string>();
  const result = [];
  for (const r of routines) {
    for (const ex of r.exercises) {
      let nsca = findNscaExerciseById(ex.nscaId);
      if (!nsca) {
        // intentar match por nombre español o inglés
        nsca = NSCA_EXERCISES.find(n => n.name === ex.name || n.englishName === ex.name) ?? null;
      }
      if (nsca && !used.has(nsca.id)) {
        used.add(nsca.id);
        result.push(nsca);
      }
    }
  }
  return result;
}

export default function ExportTab({ profile, routines, scheduledRoutines, activeClientId, viewedMonth }: ExportTabProps) {
  const [printTheme, setPrintTheme] = useState<'ink' | 'dark'>('ink');
  const [exportScope, setExportScope] = useState<ExportScope>('month');
  const [pdfStatus, setPdfStatus] = useState<{ type: 'idle' | 'loading' | 'error'; message: string }>({ type: 'idle', message: '' });
  const coachName = 'MankindFactory Elite Lab';

  const routinesById = useMemo(() => {
    const map = new Map<string, WorkoutRoutine>();
    routines.forEach(r => map.set(r.id, r));
    return map;
  }, [routines]);

  const visibleScheduled = useMemo(() => {
    const ofClient = scheduledRoutines.filter(s => s.clientId === activeClientId);
    if (exportScope === 'all') return ofClient;
    return ofClient.filter(s => s.year === viewedMonth.year && s.monthIndex === viewedMonth.monthIndex);
  }, [scheduledRoutines, viewedMonth, exportScope, activeClientId]);

  const usedRoutines = useMemo(() => {
    const set = new Set<string>();
    visibleScheduled.forEach(s => set.add(s.routineId));
    return [...set].map(id => routinesById.get(id)).filter((r): r is WorkoutRoutine => !!r);
  }, [visibleScheduled, routinesById]);

  const glossary = useMemo(() => collectGlossaryExercises(usedRoutines), [usedRoutines]);

  const daysData: DayBucket[] = useMemo(() => {
    const buckets: DayBucket[] = DAY_NAMES.map((name, index) => ({ name, index, sessions: [] }));
    visibleScheduled.forEach(s => {
      const routine = routinesById.get(s.routineId);
      if (!routine) return;
      const wd = weekdayIndexFor(s.year, s.monthIndex, s.dayOfMonth);
      if (wd < 0 || wd > 6) return;
      buckets[wd].sessions.push({ routine, dayOfMonth: s.dayOfMonth });
    });
    buckets.forEach(b => b.sessions.sort((a, z) => a.dayOfMonth - z.dayOfMonth));
    return buckets;
  }, [visibleScheduled, routinesById]);

  /**
   * Bloques de semanas reales para la vista colapsable.
   * Si scope = 'month': semanas del mes activo.
   * Si scope = 'all': agrupa por mes y dentro por semana, en orden cronológico.
   */
  const weekBlocks: WeekBlock[] = useMemo(() => {
    if (exportScope === 'month') {
      return buildWeeksForMonth(viewedMonth.year, viewedMonth.monthIndex, visibleScheduled, routinesById);
    }
    // Macrociclo: agrupa scheduled por (year, monthIndex)
    const monthSet = new Set<string>();
    visibleScheduled.forEach(s => monthSet.add(`${s.year}-${s.monthIndex}`));
    const sortedMonths = [...monthSet]
      .map(k => { const [y, m] = k.split('-').map(Number); return { year: y, monthIndex: m }; })
      .sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex));

    const all: WeekBlock[] = [];
    sortedMonths.forEach(m => {
      const inMonth = visibleScheduled.filter(s => s.year === m.year && s.monthIndex === m.monthIndex);
      const weeks = buildWeeksForMonth(m.year, m.monthIndex, inMonth, routinesById);
      // Filtrar semanas vacías para no inflar el HTML
      all.push(...weeks.filter(w => w.totalSessions > 0));
    });
    return all;
  }, [exportScope, viewedMonth, visibleScheduled, routinesById]);

  const totalAssignedWorkouts = visibleScheduled.length;
  const estimatedWeeklyMinutes = useMemo(
    () => visibleScheduled.reduce((acc, s) => acc + (routinesById.get(s.routineId)?.estimatedDuration ?? 0), 0),
    [visibleScheduled, routinesById]
  );

  const scopeLabel = exportScope === 'month' ? monthLabel(viewedMonth) : 'Macrociclo Completo';

  const bmi = computeBmi(profile.metrics.weightKg, profile.metrics.heightCm);
  const bmiCat = bmiCategory(bmi);
  const bmr = computeBmr(profile.metrics);
  const tdee = computeTdee(profile.metrics);

  const generateStandaloneHtml = (): string => {
    const clientName = escapeHtml(profile.name || 'Atleta Anónimo');

    const renderDayCard = (day: WeekDay): string => {
      const sessionsHtml = day.sessions.map(({ routine: w, scheduledId }) => {
        const exercisesHtml = w.exercises.map((ex, idx) => {
          if (ex.endurance) {
            const e = ex.endurance;
            const parts: string[] = [];
            parts.push(`<strong>Modalidad:</strong> ${escapeHtml(e.modality)}`);
            parts.push(`<strong>Protocolo:</strong> ${escapeHtml(e.protocol)}`);
            if (e.zone) parts.push(`<strong>Zona:</strong> ${escapeHtml(e.zone)}`);
            if (e.durationMin) parts.push(`<strong>Duración:</strong> ${e.durationMin} min`);
            if (e.distance) parts.push(`<strong>Distancia:</strong> ${escapeHtml(e.distance)}`);
            if (e.intervalReps && e.workInterval) parts.push(`<strong>Intervalos:</strong> ${e.intervalReps} × ${escapeHtml(e.workInterval)}${e.restInterval ? ` (rec ${escapeHtml(e.restInterval)})` : ''}`);
            if (e.pace) parts.push(`<strong>Pace:</strong> ${escapeHtml(e.pace)}`);
            if (e.cadence) parts.push(`<strong>Cadencia:</strong> ${escapeHtml(e.cadence)}`);
            if (e.fcTarget) parts.push(`<strong>FC:</strong> ${escapeHtml(e.fcTarget)}`);
            if (e.powerTarget) parts.push(`<strong>Potencia:</strong> ${escapeHtml(e.powerTarget)}`);
            if (e.rpe) parts.push(`<strong>RPE:</strong> ${escapeHtml(e.rpe)}`);
            if (e.warmup) parts.push(`<strong>Calentamiento:</strong> ${escapeHtml(e.warmup)}`);
            if (e.cooldown) parts.push(`<strong>Vuelta a la calma:</strong> ${escapeHtml(e.cooldown)}`);
            if (ex.notes) parts.push(`<strong>Notas:</strong> ${escapeHtml(ex.notes)}`);
            return `<tr><td class="ex-number">${idx + 1}</td><td class="ex-name" colspan="5"><strong style="color:#F59E0B">⚡ ${escapeHtml(ex.name)}</strong> <span style="background:#F59E0B22;color:#F59E0B;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:bold">CARDIO/ENDURANCE</span><br><small class="ex-notes">${parts.join(' · ')}</small></td></tr>`;
          }
          return `<tr><td class="ex-number">${idx + 1}</td><td class="ex-name"><strong>${escapeHtml(ex.name)}</strong>${ex.notes ? `<br><small class="ex-notes">${escapeHtml(ex.notes)}</small>` : ''}</td><td class="font-mono">${ex.sets}</td><td class="font-mono">${escapeHtml(ex.reps)}</td><td class="font-mono">${escapeHtml(ex.intensity)}</td><td class="font-mono">${escapeHtml(ex.rest)}</td></tr>`;
        }).join('');
        return `<div class="day-routine-block" data-sched="${escapeHtml(scheduledId)}"><div class="routine-header-line"><span class="routine-badge badge-${escapeHtml(w.category)}">${escapeHtml(w.category.toUpperCase())}</span><h4 class="routine-title-h">${escapeHtml(w.title)}</h4><span class="routine-duration font-mono">${w.estimatedDuration} min</span></div><p class="routine-desc-text">${escapeHtml(w.description)}</p><table class="exercises-table"><thead><tr><th style="width:5%">#</th><th style="width:45%">Ejercicio</th><th style="width:10%">Sets</th><th style="width:15%">Reps</th><th style="width:15%">Carga/RPE</th><th style="width:10%">Pausa</th></tr></thead><tbody>${exercisesHtml}</tbody></table></div>`;
      }).join('');

      const dayHeader = `<div class="day-head"><span class="day-num">${String(day.dayOfMonth).padStart(2, '0')}</span> <span class="day-name">${escapeHtml(day.weekdayName)}</span></div>`;
      if (day.isPadding) {
        return `<div class="day-card padding-day">${dayHeader}<p class="rest-text">— día fuera del mes —</p></div>`;
      }
      if (day.sessions.length === 0) {
        return `<div class="day-card rest-day">${dayHeader}<p class="rest-text">Descanso / Recuperación activa</p></div>`;
      }
      return `<div class="day-card">${dayHeader}${sessionsHtml}</div>`;
    };

    let scheduleSectionHtml = '';
    if (weekBlocks.length === 0) {
      scheduleSectionHtml = '<p class="glossary-intro">Sin cargas programadas en el alcance seleccionado.</p>';
    } else {
      // Botones master (controlan todos los <details>)
      scheduleSectionHtml += `<div class="weeks-controls">
        <button type="button" onclick="document.querySelectorAll('details.week').forEach(d=>d.open=true)">Expandir todas</button>
        <button type="button" onclick="document.querySelectorAll('details.week').forEach(d=>d.open=false)">Colapsar todas</button>
      </div>`;
      let currentMonth = '';
      weekBlocks.forEach(week => {
        if (exportScope === 'all' && week.monthLabel !== currentMonth) {
          currentMonth = week.monthLabel;
          scheduleSectionHtml += `<h3 class="month-divider">${escapeHtml(currentMonth)}</h3>`;
        }
        scheduleSectionHtml += `
          <details class="week" open>
            <summary>
              <span class="week-tag">SEMANA ${week.weekNumber}</span>
              <span class="week-range">días ${escapeHtml(week.rangeLabel)}${exportScope === 'all' ? ' · ' + escapeHtml(week.monthLabel) : ''}</span>
              <span class="week-stats">${week.totalSessions} sesión${week.totalSessions === 1 ? '' : 'es'} · ${week.totalMinutes} min</span>
            </summary>
            <div class="week-grid">${week.days.map(renderDayCard).join('')}</div>
          </details>`;
      });
    }

    const glossaryHtml = glossary.length === 0 ? '' : `
      <div class="section-title">Glosario de Movimientos</div>
      <p class="glossary-intro">Descripción técnica de cada ejercicio prescrito. Las ilustraciones representan el patrón biomecánico (creadas para MankindFactory). Las técnicas provienen del <em>NSCA Exercise Technique Manual for Resistance Training</em> traducidas al español, complementadas con ejercicios de la biblioteca MankindFactory.</p>
      ${glossary.map(g => {
        const pattern = patternForExercise(g);
        return `
        <div class="glossary-item">
          <div class="gloss-header">
            <div class="gloss-icon">${movementSvgString(pattern)}</div>
            <div class="gloss-text">
              <h3 class="gloss-title">${escapeHtml(g.name)} <span class="gloss-en">(${escapeHtml(g.englishName)})</span></h3>
              <p class="gloss-meta"><strong>Patrón:</strong> ${escapeHtml(PATTERN_LABELS[pattern])} · <strong>Capítulo:</strong> ${escapeHtml(g.chapter)} · <strong>Equipo:</strong> ${escapeHtml(g.equipment.join(', '))}</p>
            </div>
          </div>
          ${Object.entries(g.technique)
            .filter(([, v]) => typeof v === 'string' && v.length > 0)
            .map(([k, v]) => `<p class="gloss-section"><strong>${escapeHtml(k.replace(/_/g, ' '))}:</strong> ${escapeHtml(v)}</p>`)
            .join('')}
        </div>`;
      }).join('')}
    `;

    const clinicalRow = (label: string, value?: string) => value && value.trim().length > 0
      ? `<tr><td class="label">${label}</td><td>${escapeHtml(value)}</td></tr>` : '';

    return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>MankindFactory · ${clientName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
<style>
:root{--bg:#0b0b0d;--surface:#121215;--accent:#5D36FF;--text:#e4e4e7;--muted:#8e9299;--border:#27272a;--font-sans:'Inter',sans-serif;--font-mono:'JetBrains Mono',monospace;}
body{background:var(--bg);color:var(--text);font-family:var(--font-sans);margin:0;line-height:1.5;}
.container{max-width:1100px;margin:40px auto;padding:30px;border:1px solid var(--border);border-radius:16px;background:var(--surface);box-shadow:0 10px 40px rgba(0,0,0,.5);}
header{border-bottom:2px solid var(--border);padding-bottom:30px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;}
.brand h1{margin:0;font-size:32px;font-weight:800;letter-spacing:-1px;}.brand h1 span{color:var(--accent);}
.brand p{margin:5px 0 0;font-family:var(--font-mono);font-size:11px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;}
.header-info{font-family:var(--font-mono);font-size:12px;text-align:right;color:var(--muted);}.header-info strong{color:#fff;}
.section-title{font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--border);padding-bottom:10px;margin:40px 0 20px;color:#fff;display:flex;align-items:center;gap:10px;}
.section-title::before{content:'';display:inline-block;width:4px;height:18px;background:var(--accent);}
.preamble-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
@media(max-width:768px){.preamble-grid{grid-template-columns:1fr;}}
.card{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:12px;padding:20px;}
.card h3{margin:0 0 10px;font-size:14px;color:var(--accent);text-transform:uppercase;letter-spacing:1px;font-family:var(--font-mono);}
.card p{margin:0 0 8px;font-size:13px;color:#cbd5e1;}
.metrics-table{width:100%;border-collapse:collapse;margin-top:10px;}
.metrics-table td{padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.03);font-size:12px;}
.metrics-table td.label{color:var(--muted);font-family:var(--font-mono);font-size:10px;text-transform:uppercase;width:50%;}
.day-card{background:rgba(0,0,0,.2);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:20px;}
.day-title{margin:0 0 12px;padding-bottom:8px;border-bottom:1px dashed var(--border);font-size:18px;font-weight:700;text-transform:uppercase;letter-spacing:1px;}
.active-day-title{color:var(--accent);}
.rest-day{border:1px dashed #27272a;opacity:.6;}
.rest-text{font-family:var(--font-mono);font-size:11px;color:var(--muted);margin:8px 0;}
.day-routine-block{border-bottom:1px solid rgba(255,255,255,.03);padding:12px 0;}
.day-routine-block:last-child{border-bottom:none;}
.routine-header-line{display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap;}
.routine-title-h{margin:0;font-size:15px;font-weight:700;color:#fff;}
.day-marker{color:var(--muted);font-weight:400;font-size:11px;}
.routine-badge{font-family:var(--font-mono);font-size:8px;font-weight:800;padding:3px 8px;border-radius:4px;border:1px solid rgba(255,255,255,.1);}
.badge-fuerza{background:rgba(255,60,0,.15);color:#FF3C00;border-color:rgba(255,60,0,.3);}
.badge-potencia{background:rgba(255,187,0,.15);color:#FFBB00;border-color:rgba(255,187,0,.3);}
.badge-hipertrofia{background:rgba(168,85,247,.15);color:#A855F7;border-color:rgba(168,85,247,.3);}
.badge-aerobico{background:rgba(20,184,166,.15);color:#14B8A6;border-color:rgba(20,184,166,.3);}
.routine-duration{margin-left:auto;font-size:11px;color:var(--muted);}
.routine-desc-text{margin:0 0 12px;font-size:11px;color:var(--muted);}
.exercises-table{width:100%;border-collapse:collapse;margin-top:8px;}
.exercises-table th{background:rgba(255,255,255,.02);border-bottom:1px solid var(--border);color:var(--muted);font-family:var(--font-mono);font-size:9px;text-transform:uppercase;letter-spacing:1px;padding:8px;text-align:left;}
.exercises-table td{padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.03);font-size:12px;}
.ex-number{font-family:var(--font-mono);color:var(--accent);font-weight:bold;}
.ex-notes{color:var(--muted);font-size:10px;}.font-mono{font-family:var(--font-mono);}
.glossary-intro{font-size:12px;color:var(--muted);margin-bottom:18px;}
.gloss-header{display:flex;gap:14px;align-items:flex-start;margin-bottom:10px;}
.gloss-icon{flex-shrink:0;width:64px;height:64px;background:rgba(93,54,255,.08);border:1px solid rgba(93,54,255,.3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#5D36FF;}
.gloss-icon svg{width:54px;height:54px;}
.gloss-text{flex:1;min-width:0;}
.weeks-controls{display:flex;gap:8px;margin-bottom:14px;}
.weeks-controls button{background:rgba(93,54,255,.12);color:#5D36FF;border:1px solid rgba(93,54,255,.3);padding:6px 12px;border-radius:6px;font-family:inherit;font-size:11px;cursor:pointer;font-weight:600;text-transform:uppercase;letter-spacing:1px;}
.weeks-controls button:hover{background:rgba(93,54,255,.25);}
.month-divider{font-family:var(--font-mono);font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:2px;margin:24px 0 10px;padding-bottom:6px;border-bottom:1px dashed rgba(93,54,255,.4);}
details.week{background:#0e0e10;border:1px solid var(--border);border-radius:12px;margin-bottom:12px;overflow:hidden;page-break-inside:avoid;}
details.week summary{cursor:pointer;padding:14px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;list-style:none;background:rgba(93,54,255,.05);border-bottom:1px solid var(--border);transition:background .15s;}
details.week summary:hover{background:rgba(93,54,255,.10);}
details.week summary::-webkit-details-marker{display:none;}
details.week summary::before{content:'▶';color:var(--accent);font-size:9px;display:inline-block;transition:transform .15s;}
details.week[open] summary::before{transform:rotate(90deg);}
details.week:not([open]) summary{border-bottom:none;}
.week-tag{font-family:var(--font-mono);font-size:11px;font-weight:800;color:#fff;background:var(--accent);padding:3px 8px;border-radius:4px;letter-spacing:1px;}
.week-range{font-family:var(--font-mono);font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;flex:1;}
.week-stats{font-family:var(--font-mono);font-size:10px;color:#fff;background:#1c1c1f;padding:3px 8px;border-radius:4px;}
.week-grid{padding:14px 18px;display:grid;grid-template-columns:1fr;gap:14px;}
@media(min-width:900px){.week-grid{grid-template-columns:repeat(2,1fr);}}
@media print{.week-grid{grid-template-columns:1fr;} details.week{page-break-inside:avoid;} details.week[open] summary{border-bottom:1px solid var(--border);}}
.day-head{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px dashed var(--border);}
.day-num{font-family:var(--font-mono);font-size:18px;font-weight:800;color:var(--accent);}
.day-name{font-family:var(--font-mono);font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:2px;}
.padding-day{opacity:.4;}
@media print{details.week{break-inside:avoid;} details.week summary::before{display:none;}}
@media print{details.week{open:true !important;} details:not([open]) > *:not(summary){display:block !important;}}
.glossary-item{background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:10px;padding:14px 18px;margin-bottom:14px;page-break-inside:avoid;}
.gloss-title{margin:0 0 4px;font-size:14px;color:#fff;}
.gloss-en{color:var(--muted);font-weight:400;font-size:11px;}
.gloss-meta{font-family:var(--font-mono);font-size:10px;color:var(--accent);margin:0 0 8px;}
.gloss-section{font-size:11px;color:#cbd5e1;margin:5px 0;line-height:1.55;}
.gloss-section strong{color:#fff;text-transform:capitalize;}
footer{border-top:1px solid var(--border);padding-top:20px;margin-top:40px;text-align:center;font-family:var(--font-mono);font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;}
</style></head><body>
<div class="container">
<header><div class="brand"><h1>MANKIND<span>FACTORY</span></h1><p>Centro de Ingeniería en Rendimiento Humano</p></div>
<div class="header-info">ATLETA: <strong>${clientName}</strong><br/>MACROCICLO: <strong>${escapeHtml(profile.experienceLevel.toUpperCase())}</strong><br/>CICLO: <strong>${escapeHtml(scopeLabel)}</strong><br/>COACH: <strong>${escapeHtml(coachName)}</strong></div></header>

<div class="section-title">1. Ficha del Paciente</div>
<div class="preamble-grid">
  <div class="card">
    <h3>Antropometría</h3>
    <table class="metrics-table">
      <tr><td class="label">Sexo</td><td>${escapeHtml(sexLabel(profile.metrics.sex))}</td></tr>
      <tr><td class="label">Edad</td><td>${profile.metrics.age ?? '—'}</td></tr>
      <tr><td class="label">Talla</td><td>${fmt(profile.metrics.heightCm, 'cm')}</td></tr>
      <tr><td class="label">Peso</td><td>${fmt(profile.metrics.weightKg, 'kg')}</td></tr>
      <tr><td class="label">% Grasa</td><td>${profile.metrics.fatPercentage ? profile.metrics.fatPercentage + '%' : '—'}</td></tr>
      <tr><td class="label">IMC</td><td>${bmi !== null ? bmi.toFixed(1) + (bmiCat ? ` (${bmiCat.label})` : '') : '—'}</td></tr>
      <tr><td class="label">TMB Benedict</td><td>${bmr !== null ? bmr + ' kcal' : '—'}</td></tr>
      <tr><td class="label">Calorías diarias (TDEE)</td><td>${tdee !== null ? tdee + ' kcal' : '—'}</td></tr>
      <tr><td class="label">Nivel actividad</td><td>${escapeHtml(activityLabel(profile.metrics.activityLevel))}</td></tr>
    </table>
  </div>
  <div class="card">
    <h3>Rendimiento Base</h3>
    <table class="metrics-table">
      <tr><td class="label">1RM Press Banca</td><td>${fmt(profile.metrics.benchPress1RM, 'kg')}</td></tr>
      <tr><td class="label">1RM Sentadilla</td><td>${fmt(profile.metrics.squat1RM, 'kg')}</td></tr>
      <tr><td class="label">1RM Peso Muerto</td><td>${fmt(profile.metrics.deadlift1RM, 'kg')}</td></tr>
      <tr><td class="label">Pull-Ups Máx</td><td>${fmt(profile.metrics.pullUpMaxReps, 'reps')}</td></tr>
      <tr><td class="label">Carrera 400m</td><td>${fmt(profile.metrics.run400mSeconds, 's')}</td></tr>
      <tr><td class="label">VO2 Máx</td><td>${fmt(profile.metrics.vo2Max, 'ml/kg/min')}</td></tr>
      ${profile.metrics.otherMetrics ? `<tr><td class="label">Otras</td><td>${escapeHtml(profile.metrics.otherMetrics)}</td></tr>` : ''}
    </table>
  </div>
  <div class="card">
    <h3>Antecedentes Clínicos</h3>
    <table class="metrics-table">
      ${clinicalRow('Mórbidos', profile.clinical.morbidities)}
      ${clinicalRow('Medicamentos', profile.clinical.medications)}
      ${clinicalRow('Alergias', profile.clinical.allergies)}
      ${clinicalRow('Cirugías', profile.clinical.surgeries)}
      ${clinicalRow('Lesiones', profile.clinical.injuries)}
      ${clinicalRow('Notas', profile.clinical.notes)}
    </table>
  </div>
  <div class="card">
    <h3>Objetivos</h3>
    ${profile.goals.performance ? `<p><strong>Rendimiento:</strong> ${escapeHtml(profile.goals.performance)}</p>` : ''}
    ${profile.goals.aesthetic ? `<p><strong>Estético:</strong> ${escapeHtml(profile.goals.aesthetic)}</p>` : ''}
    ${profile.goals.health ? `<p><strong>Salud:</strong> ${escapeHtml(profile.goals.health)}</p>` : ''}
    <h3 style="margin-top:18px;">Equipamiento</h3>
    <p style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(profile.equipment.join(', ') || 'Solo peso corporal')}</p>
  </div>
</div>

<div class="section-title">2. Pauta · ${escapeHtml(scopeLabel)}</div>
<p class="glossary-intro">Total: ${totalAssignedWorkouts} cargas · ${estimatedWeeklyMinutes} min totales.</p>
${scheduleSectionHtml || '<p class="glossary-intro">Sin cargas programadas en el alcance seleccionado.</p>'}

${glossaryHtml}

<footer>MankindFactory Lab Co. • ${clientName} · ${escapeHtml(scopeLabel)} · Generado ${new Date().toLocaleDateString('es-ES')}</footer>
</div></body></html>`;
  };

  const downloadHtmlFile = () => {
    track('export_html', { scope: exportScope });
    const blob = new Blob([generateStandaloneHtml()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const slug = (profile.name || 'cliente').toLowerCase().replace(/\s+/g, '_');
    const monthSlug = exportScope === 'month' ? `_${viewedMonth.year}_${String(viewedMonth.monthIndex + 1).padStart(2, '0')}` : '_macrociclo';
    link.download = `pauta_mankind_${slug}${monthSlug}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerSystemPrint = () => {
    track('export_pdf_print', { scope: exportScope });
    window.print();
  };

  const downloadServerPdf = async () => {
    track('export_pdf_server', { scope: exportScope });
    setPdfStatus({ type: 'loading', message: 'Generando PDF en el servidor…' });
    try {
      const html = generateStandaloneHtml();
      const slug = (profile.name || 'cliente').toLowerCase().replace(/\s+/g, '_');
      const monthSlug = exportScope === 'month' ? `_${viewedMonth.year}_${String(viewedMonth.monthIndex + 1).padStart(2, '0')}` : '_macrociclo';
      const filename = `pauta_mankind_${slug}${monthSlug}.pdf`;
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename, format: 'A4', printBackground: true })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setPdfStatus({ type: 'idle', message: '' });
    } catch (err) {
      setPdfStatus({ type: 'error', message: err instanceof Error ? err.message : 'Error generando PDF.' });
      window.setTimeout(() => setPdfStatus({ type: 'idle', message: '' }), 6000);
    }
  };

  return (
    <div id="export_tab_container" className="space-y-8 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
      <div className="bg-[#121214] border border-zinc-800 p-5 rounded-xl flex items-center justify-between flex-wrap gap-4 print:hidden">
        <div className="space-y-1">
          <h2 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="text-[#5D36FF]" size={16} aria-hidden="true" />
            Exportar Dossier · {scopeLabel}
          </h2>
          <p className="font-mono text-[10px] text-zinc-500">
            {totalAssignedWorkouts} cargas, {estimatedWeeklyMinutes} min · {glossary.length} ejercicios NSCA en glosario.
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg text-xs font-mono" role="radiogroup" aria-label="Alcance">
            <span className="text-zinc-500 px-2">Alcance:</span>
            <button role="radio" aria-checked={exportScope === 'month'} onClick={() => setExportScope('month')} className={`px-3 py-1 rounded text-[10px] uppercase font-bold transition ${exportScope === 'month' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              {monthLabel(viewedMonth)}
            </button>
            <button role="radio" aria-checked={exportScope === 'all'} onClick={() => setExportScope('all')} className={`px-3 py-1 rounded text-[10px] uppercase font-bold transition ${exportScope === 'all' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              Macrociclo
            </button>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg text-xs font-mono" role="radiogroup" aria-label="Tema impresión">
            <span className="text-zinc-500 px-2">Tema:</span>
            <button role="radio" aria-checked={printTheme === 'ink'} onClick={() => setPrintTheme('ink')} className={`px-3 py-1 rounded text-[10px] uppercase font-bold transition ${printTheme === 'ink' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              Ahorro Tinta
            </button>
            <button role="radio" aria-checked={printTheme === 'dark'} onClick={() => setPrintTheme('dark')} className={`px-3 py-1 rounded text-[10px] uppercase font-bold transition ${printTheme === 'dark' ? 'bg-zinc-800 text-[#5D36FF] border border-zinc-700/50' : 'text-zinc-400 hover:text-white'}`}>
              Fiel
            </button>
          </div>

          <button onClick={downloadHtmlFile} className="p-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-white font-mono text-xs uppercase tracking-wider font-bold transition flex items-center gap-2">
            <Download size={14} className="text-[#5D36FF]" aria-hidden="true" /> Exportar HTML
          </button>
          <button onClick={triggerSystemPrint} className="p-2.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition flex items-center gap-2">
            <Printer size={14} className="text-[#5D36FF]" aria-hidden="true" /> PDF Navegador
          </button>
          <button onClick={downloadServerPdf} disabled={pdfStatus.type === 'loading'} aria-busy={pdfStatus.type === 'loading'} className="p-2.5 px-5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-60 text-white rounded-lg font-mono text-xs uppercase tracking-wider font-extrabold transition flex items-center gap-2">
            <Printer size={14} aria-hidden="true" />
            {pdfStatus.type === 'loading' ? 'Generando…' : 'PDF Servidor'}
          </button>
        </div>
      </div>

      {pdfStatus.type === 'error' && (
        <div role="alert" className="bg-red-950/20 border border-red-700/40 rounded-lg p-3 text-xs text-red-300 print:hidden">
          {pdfStatus.message}
        </div>
      )}

      <div className="bg-zinc-950 border border-zinc-800/60 p-4 rounded-xl flex items-center gap-3 text-xs text-zinc-400 print:hidden">
        <Info className="shrink-0 text-[#5D36FF]" size={16} aria-hidden="true" />
        <p>
          <strong>Nuevo:</strong> al final del dossier se incluye un <strong>Glosario de Movimientos</strong> con la técnica NSCA de cada ejercicio prescrito ({glossary.length} en este alcance).
        </p>
      </div>

      {/* DOSSIER VISIBLE */}
      <div
        id="printable_dossier_canvas"
        className={`border rounded-xl p-8 md:p-12 shadow-2xl transition duration-500 ${
          printTheme === 'dark' ? 'bg-[#0B0B0D] text-zinc-100 border-zinc-800' : 'bg-white text-zinc-900 border-zinc-200'
        } print:p-0 print:border-none print:shadow-none print:bg-white print:text-black`}
      >
        <div className={`border-b-2 pb-6 flex justify-between items-end flex-wrap gap-6 mb-8 ${printTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div>
            <h1 className="font-sans font-black text-3xl tracking-tighter uppercase text-[#5D36FF]">
              MANKIND<span className={printTheme === 'dark' ? 'text-white' : 'text-zinc-950'}>FACTORY</span>
            </h1>
            <p className="font-mono text-[9px] tracking-widest text-[#5D36FF] mt-1 font-bold">PLANNING LAB & HIGH PERFORMANCE CENTRE</p>
          </div>
          <div className="font-mono text-xs text-right space-y-1">
            <p className={printTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>ATLETA: <strong className={printTheme === 'dark' ? 'text-white' : 'text-zinc-950'}>{profile.name || 'Invitado'}</strong></p>
            <p className={printTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>MACROCICLO: <strong className={printTheme === 'dark' ? 'text-white' : 'text-zinc-950'}>{profile.experienceLevel.toUpperCase()}</strong></p>
            <p className={printTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>CICLO: <strong className={printTheme === 'dark' ? 'text-white' : 'text-zinc-950'}>{scopeLabel}</strong></p>
            <p className={printTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>CENTRO: <strong className={printTheme === 'dark' ? 'text-white' : 'text-zinc-950'}>{coachName}</strong></p>
          </div>
        </div>

        {/* SECCIÓN 1 — FICHA */}
        <SectionHeader title="1. Ficha del Paciente" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DossierCard theme={printTheme} title={<><User size={12} aria-hidden="true" /> Antropometría</>}>
            <KvRow label="Sexo" value={sexLabel(profile.metrics.sex)} />
            <KvRow label="Edad" value={profile.metrics.age != null ? `${profile.metrics.age} años` : '—'} />
            <KvRow label="Talla" value={fmt(profile.metrics.heightCm, 'cm')} />
            <KvRow label="Peso" value={fmt(profile.metrics.weightKg, 'kg')} />
            <KvRow label="% Grasa" value={profile.metrics.fatPercentage != null ? `${profile.metrics.fatPercentage}%` : '—'} />
            <KvRow label="IMC" value={bmi !== null ? `${bmi.toFixed(1)} ${bmiCat ? `· ${bmiCat.label}` : ''}` : '—'} accentColor={bmiCat?.color} />
            <KvRow label="TMB Benedict" value={bmr !== null ? `${bmr} kcal` : '—'} />
            <KvRow label="TDEE" value={tdee !== null ? `${tdee} kcal` : '—'} />
            <KvRow label="Actividad" value={activityLabel(profile.metrics.activityLevel)} />
          </DossierCard>

          <DossierCard theme={printTheme} title={<><Activity size={12} aria-hidden="true" /> Rendimiento Base</>}>
            <KvRow label="1RM Press Banca" value={fmt(profile.metrics.benchPress1RM, 'kg')} />
            <KvRow label="1RM Sentadilla" value={fmt(profile.metrics.squat1RM, 'kg')} />
            <KvRow label="1RM Peso Muerto" value={fmt(profile.metrics.deadlift1RM, 'kg')} />
            <KvRow label="Pull-Ups Máx" value={fmt(profile.metrics.pullUpMaxReps, 'reps')} />
            <KvRow label="Carrera 400m" value={fmt(profile.metrics.run400mSeconds, 's')} />
            <KvRow label="VO2 Máx" value={fmt(profile.metrics.vo2Max, 'ml/kg/min')} />
            {profile.metrics.otherMetrics && <KvRow label="Otras" value={profile.metrics.otherMetrics} />}
          </DossierCard>

          <DossierCard theme={printTheme} title={<><Flame size={12} aria-hidden="true" /> Antecedentes Clínicos</>} fullWidth>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
              {profile.clinical.morbidities && <KvRow label="Mórbidos" value={profile.clinical.morbidities} />}
              {profile.clinical.medications && <KvRow label="Medicamentos" value={profile.clinical.medications} />}
              {profile.clinical.allergies && <KvRow label="Alergias" value={profile.clinical.allergies} />}
              {profile.clinical.surgeries && <KvRow label="Cirugías" value={profile.clinical.surgeries} />}
              {profile.clinical.injuries && <KvRow label="Lesiones" value={profile.clinical.injuries} />}
              {profile.clinical.notes && <KvRow label="Notas" value={profile.clinical.notes} />}
              {!Object.values(profile.clinical).some(v => v) && <p className="text-zinc-500 text-[11px]">Sin antecedentes registrados.</p>}
            </div>
          </DossierCard>

          <DossierCard theme={printTheme} title="Objetivos" fullWidth>
            {profile.goals.performance && <p className="text-xs leading-relaxed mb-2"><strong className="text-[#5D36FF]">Rendimiento:</strong> {profile.goals.performance}</p>}
            {profile.goals.aesthetic && <p className="text-xs leading-relaxed mb-2"><strong className="text-[#5D36FF]">Estético:</strong> {profile.goals.aesthetic}</p>}
            {profile.goals.health && <p className="text-xs leading-relaxed mb-2"><strong className="text-[#5D36FF]">Salud:</strong> {profile.goals.health}</p>}
            <p className="text-[10px] text-zinc-500 mt-3 pt-2 border-t border-dashed border-zinc-700"><strong>Equipamiento:</strong> {profile.equipment.join(', ') || 'Solo peso corporal'}</p>
          </DossierCard>
        </div>

        {/* SECCIÓN 2 — PAUTA agrupada por semanas colapsables */}
        <div className="page-break-before">
          <SectionHeader title={`2. Pauta · ${scopeLabel}`} />
          {weekBlocks.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin cargas programadas en el alcance seleccionado.</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const out: React.ReactNode[] = [];
                let currentMonth = '';
                weekBlocks.forEach((week, wi) => {
                  if (exportScope === 'all' && week.monthLabel !== currentMonth) {
                    currentMonth = week.monthLabel;
                    out.push(
                      <h3 key={`m-${currentMonth}`} className="font-mono text-xs text-[#5D36FF] uppercase tracking-widest mt-6 mb-2 pb-1 border-b border-dashed border-[#5D36FF]/40">
                        {currentMonth}
                      </h3>
                    );
                  }
                  out.push(
                    <details
                      key={`w-${wi}`}
                      open
                      className={`week rounded-xl overflow-hidden border ${printTheme === 'dark' ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/40'}`}
                    >
                      <summary className={`cursor-pointer px-5 py-3 flex items-center gap-4 flex-wrap select-none ${printTheme === 'dark' ? 'bg-[#5D36FF]/10 hover:bg-[#5D36FF]/15' : 'bg-[#5D36FF]/5 hover:bg-[#5D36FF]/10'} transition`}>
                        <span className="font-mono text-[10px] font-extrabold text-white bg-[#5D36FF] px-2 py-0.5 rounded tracking-wider">SEMANA {week.weekNumber}</span>
                        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider flex-1">
                          días {week.rangeLabel}{exportScope === 'all' ? ` · ${week.monthLabel}` : ''}
                        </span>
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded ${printTheme === 'dark' ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-200 text-zinc-700'}`}>
                          {week.totalSessions} sesión{week.totalSessions === 1 ? '' : 'es'} · {week.totalMinutes} min
                        </span>
                      </summary>
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {week.days.map(day => (
                          <div
                            key={`${day.year}-${day.monthIndex}-${day.dayOfMonth}-${day.weekdayIndex}`}
                            className={`rounded-lg border p-3 ${
                              day.isPadding
                                ? 'opacity-30 border-dashed border-zinc-800'
                                : printTheme === 'dark'
                                  ? 'bg-[#121215] border-zinc-800'
                                  : 'bg-white border-zinc-300'
                            }`}
                          >
                            <div className="flex items-baseline gap-2 mb-2 pb-1.5 border-b border-dashed border-zinc-800/50">
                              <span className="font-mono text-base font-extrabold text-[#5D36FF]">{String(day.dayOfMonth).padStart(2, '0')}</span>
                              <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">{day.weekdayName}</span>
                            </div>
                            {day.sessions.length === 0 ? (
                              <p className="font-mono text-[10px] text-zinc-500 text-center py-3 italic">
                                {day.isPadding ? '— día fuera del mes —' : 'Descanso / Recuperación activa'}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {day.sessions.map(({ routine: w }, ix) => (
                                  <div key={`${w.id}-${ix}`} className="space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-1.5 py-0.5 font-mono text-[7px] uppercase font-bold rounded bg-[#5D36FF]/10 text-[#5D36FF]">{w.category}</span>
                                      <h5 className={`font-sans font-bold text-xs ${printTheme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{w.title}</h5>
                                      <span className="font-mono text-[9px] text-zinc-500 ml-auto">{w.estimatedDuration} min</span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 leading-snug">{w.description}</p>
                                    <table className="w-full text-left text-[10px] border-collapse">
                                      <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-500">
                                          <th className="py-1 pr-2 font-mono text-[8px] uppercase tracking-wider">Ejercicio</th>
                                          <th className="py-1 px-1 text-center font-mono text-[8px]">S</th>
                                          <th className="py-1 px-1 text-center font-mono text-[8px]">R</th>
                                          <th className="py-1 px-1 text-center font-mono text-[8px]">Carga</th>
                                          <th className="py-1 px-1 text-center font-mono text-[8px]">Pausa</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {w.exercises.map(ex => {
                                          if (ex.endurance) {
                                            const e = ex.endurance;
                                            const summary: string[] = [];
                                            summary.push(`Modalidad: ${e.modality}`);
                                            summary.push(`Protocolo: ${e.protocol}`);
                                            if (e.zone) summary.push(`Zona: ${e.zone}`);
                                            if (e.durationMin) summary.push(`${e.durationMin}m`);
                                            if (e.distance) summary.push(e.distance);
                                            if (e.intervalReps && e.workInterval) summary.push(`${e.intervalReps}×${e.workInterval}${e.restInterval ? `/rec ${e.restInterval}` : ''}`);
                                            if (e.pace) summary.push(`@${e.pace}`);
                                            if (e.cadence) summary.push(`cad ${e.cadence}`);
                                            if (e.fcTarget) summary.push(`FC ${e.fcTarget}`);
                                            if (e.powerTarget) summary.push(`Pot ${e.powerTarget}`);
                                            if (e.rpe) summary.push(`RPE ${e.rpe}`);
                                            return (
                                              <tr key={ex.id} className="border-b border-zinc-900/50">
                                                <td colSpan={5} className="py-1 pr-2">
                                                  <div className="font-sans font-bold text-[10px] text-[#F59E0B]">⚡ {ex.name} <span className="text-[8px] bg-[#F59E0B]/20 px-1 rounded">CARDIO</span></div>
                                                  <div className="text-[9px] text-zinc-400 font-mono">{summary.join(' · ')}</div>
                                                  {(e.warmup || e.cooldown) && (
                                                    <div className="text-[8px] text-zinc-500">
                                                      {e.warmup && <span>WU: {e.warmup}</span>}
                                                      {e.warmup && e.cooldown && <span> · </span>}
                                                      {e.cooldown && <span>CD: {e.cooldown}</span>}
                                                    </div>
                                                  )}
                                                  {ex.notes && <div className="text-[9px] text-zinc-500">* {ex.notes}</div>}
                                                </td>
                                              </tr>
                                            );
                                          }
                                          return (
                                          <tr key={ex.id} className="border-b border-zinc-900/50">
                                            <td className="py-1 pr-2">
                                              <div className="font-sans font-bold text-[10px]">{ex.name}</div>
                                              {ex.notes && <div className="text-[9px] text-zinc-500">* {ex.notes}</div>}
                                            </td>
                                            <td className="py-1 px-1 text-center font-mono">{ex.sets}</td>
                                            <td className="py-1 px-1 text-center font-mono">{ex.reps}</td>
                                            <td className="py-1 px-1 text-center font-mono text-[#5D36FF] font-bold">{ex.intensity}</td>
                                            <td className="py-1 px-1 text-center font-mono">{ex.rest}</td>
                                          </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                });
                return out;
              })()}
            </div>
          )}
        </div>

        {/* SECCIÓN 3 — GLOSARIO con ilustraciones */}
        {glossary.length > 0 && (
          <div className="page-break-before">
            <SectionHeader title={<><BookOpen size={14} className="inline-block mr-2" /> 3. Glosario de Movimientos</>} />
            <p className={`text-xs mb-5 ${printTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Descripción técnica e ilustración del patrón biomecánico de cada ejercicio prescrito.
              Fuentes: <em>NSCA Exercise Technique Manual</em> (traducido) + Biblioteca MankindFactory. Las ilustraciones son originales (esquemáticas, creadas para MankindFactory).
            </p>
            <div className="space-y-4">
              {glossary.map(g => {
                const pattern = patternForExercise(g);
                return (
                  <article key={g.id} className={`p-5 rounded-lg border ${printTheme === 'dark' ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`shrink-0 w-16 h-16 rounded border flex items-center justify-center text-[#5D36FF] ${printTheme === 'dark' ? 'bg-[#5D36FF]/10 border-[#5D36FF]/30' : 'bg-[#5D36FF]/5 border-[#5D36FF]/20'}`}>
                        <MovementIconForExercise exercise={g} size={54} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm">
                          {g.name}
                          <span className="text-zinc-500 font-mono text-[10px] ml-2">({g.englishName})</span>
                        </h3>
                        <p className="font-mono text-[10px] text-[#5D36FF] mt-1">
                          <strong>Patrón:</strong> {PATTERN_LABELS[pattern]} · <strong>Capítulo:</strong> {g.chapter} · <strong>Equipo:</strong> {g.equipment.join(', ')}
                        </p>
                      </div>
                    </div>
                    <pre className={`text-[11px] leading-relaxed whitespace-pre-wrap font-sans ${printTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      {nscaTechniqueSummary(g)}
                    </pre>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className={`mt-16 pt-6 border-t font-mono text-[9px] text-center uppercase tracking-widest ${printTheme === 'dark' ? 'border-zinc-800 text-zinc-600' : 'border-zinc-200 text-zinc-500'}`}>
          MankindFactory Athletics Lab • {profile.name} • {scopeLabel}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-[#5D36FF]/30 mb-5">
      <span className="w-1.5 h-4 bg-[#5D36FF]" aria-hidden="true" />
      <h2 className="font-sans font-bold text-sm uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function DossierCard({ title, children, theme, fullWidth }: { title: React.ReactNode; children: React.ReactNode; theme: 'ink' | 'dark'; fullWidth?: boolean }) {
  return (
    <div className={`p-5 rounded-lg border ${fullWidth ? 'md:col-span-2' : ''} ${theme === 'dark' ? 'bg-zinc-900/30 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
      <h3 className="font-mono text-[10px] text-[#5D36FF] uppercase tracking-wider mb-3 font-bold flex items-center gap-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function KvRow({ label, value, accentColor }: { label: string; value: string; accentColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-xs border-b border-zinc-800/30 last:border-0">
      <span className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">{label}</span>
      <span className="font-bold text-right" style={{ color: accentColor || 'inherit' }}>{value}</span>
    </div>
  );
}

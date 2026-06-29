/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Editor de bloque de Endurance / Cross-Training.
 *
 * Razón de ser: un ejercicio aeróbico (Z2 run, intervalos VO2, FTP test,
 * Tabata, brick de triatlón, etc.) NO se describe bien con la dupla sets/reps.
 * Se describe por:
 *  - Modalidad (run, bike, swim, row, airbike, brick, MetCon…)
 *  - Protocolo (continuo, tempo, intervalos, fartlek, hill repeats, tabata…)
 *  - Zona fisiológica (Z1-Z5, modelo Coggan/Friel)
 *  - Duración total y/o distancia
 *  - Estructura de intervalos (work / rest / repeticiones)
 *  - Targets de pace, cadencia, FC, potencia (FTP)
 *  - Warmup y cooldown
 *
 * Fuentes: NSCA ESSC Cap. 21 (Aerobic Endurance Program Design),
 * Daniels Running Formula 3rd ed, Friel Training Bible, ACSM Guidelines 11th.
 */

import React from 'react';
import { Bike, Activity, Waves, Timer, Zap } from 'lucide-react';
import { Exercise, EnduranceParams, EnduranceModality, EnduranceProtocol, EnduranceZone } from '../types';
import {
  ENDURANCE_MODALITY_LABELS, ENDURANCE_PROTOCOL_LABELS, ENDURANCE_ZONE_LABELS,
  inferEnduranceZone
} from '../lib/nsca';

interface EnduranceFieldsProps {
  exercise: Exercise;
  endurance: EnduranceParams;
  onChange: (patch: Partial<Exercise>) => void;
  onRemoveEndurance: () => void;
}

const MODALITY_KEYS: EnduranceModality[] = [
  'run', 'bike', 'swim', 'row', 'airbike', 'skierg',
  'rope', 'stairs', 'brick', 'metcon', 'mixed'
];

const PROTOCOL_KEYS: EnduranceProtocol[] = [
  'continuous', 'lsd', 'tempo', 'intervals', 'fartlek',
  'hill_repeats', 'strides', 'time_trial', 'tabata',
  'amrap', 'emom', 'brick', 'technique'
];

const ZONE_KEYS: EnduranceZone[] = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'mixed'];

/** ¿El protocolo se describe por intervalos work/rest? */
function isIntervalProtocol(p: EnduranceProtocol): boolean {
  return ['intervals', 'tabata', 'amrap', 'emom', 'hill_repeats', 'strides'].includes(p);
}

export default function EnduranceFields({ exercise, endurance, onChange, onRemoveEndurance }: EnduranceFieldsProps) {
  const update = (patch: Partial<EnduranceParams>) => {
    const merged: EnduranceParams = { ...endurance, ...patch };
    // Si cambia el protocolo, sugerir zona acorde si la actual estaba vacía o era mixed.
    if (patch.protocol && (!endurance.zone || endurance.zone === 'mixed')) {
      merged.zone = inferEnduranceZone(patch.protocol);
    }
    onChange({ endurance: merged });
  };

  const isInterval = isIntervalProtocol(endurance.protocol);

  return (
    <div className="bg-gradient-to-br from-[#F59E0B]/5 to-[#EC4899]/5 border border-[#F59E0B]/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between border-b border-[#F59E0B]/20 pb-2">
        <div className="flex items-center gap-2">
          <Activity className="text-[#F59E0B]" size={14} aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#F59E0B] font-bold">
            Bloque Endurance / Cross-Training
          </span>
        </div>
        <button
          type="button"
          onClick={onRemoveEndurance}
          className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 underline"
        >
          Convertir a bloque de fuerza
        </button>
      </div>

      {/* Fila 1: nombre + modalidad + protocolo + zona */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <FieldWrap label="Nombre del bloque">
          <input
            type="text"
            value={exercise.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Ej. Tempo run 2×10 min"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
        <FieldWrap label="Modalidad">
          <select
            value={endurance.modality}
            onChange={e => update({ modality: e.target.value as EnduranceModality })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-[#F59E0B]/60"
          >
            {MODALITY_KEYS.map(m => (
              <option key={m} value={m}>{ENDURANCE_MODALITY_LABELS[m]}</option>
            ))}
          </select>
        </FieldWrap>
        <FieldWrap label="Protocolo">
          <select
            value={endurance.protocol}
            onChange={e => update({ protocol: e.target.value as EnduranceProtocol })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-[#F59E0B]/60"
          >
            {PROTOCOL_KEYS.map(p => (
              <option key={p} value={p}>{ENDURANCE_PROTOCOL_LABELS[p]}</option>
            ))}
          </select>
        </FieldWrap>
        <FieldWrap label="Zona">
          <select
            value={endurance.zone ?? 'mixed'}
            onChange={e => update({ zone: e.target.value as EnduranceZone })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-white text-[11px] focus:outline-none focus:border-[#F59E0B]/60"
          >
            {ZONE_KEYS.map(z => (
              <option key={z} value={z}>{ENDURANCE_ZONE_LABELS[z]}</option>
            ))}
          </select>
        </FieldWrap>
      </div>

      {/* Fila 2: Duración total / distancia / RPE */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <FieldWrap label="Duración total (min)">
          <input
            type="number"
            min={0}
            value={endurance.durationMin ?? ''}
            onChange={e => update({ durationMin: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="45"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
        <FieldWrap label="Distancia objetivo">
          <input
            type="text"
            value={endurance.distance ?? ''}
            onChange={e => update({ distance: e.target.value || undefined })}
            placeholder="5 km · 1500 m · 40 km"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
        <FieldWrap label="RPE (Borg CR10 o 6-20)">
          <input
            type="text"
            value={endurance.rpe ?? ''}
            onChange={e => update({ rpe: e.target.value || undefined })}
            placeholder="7-8 · 15/20"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
      </div>

      {/* Fila 3: Intervalos (sólo si protocolo de intervalos) */}
      {isInterval && (
        <div className="bg-zinc-950/50 border border-zinc-900 rounded p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Timer size={11} className="text-[#F59E0B]" aria-hidden="true" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
              Estructura de intervalos
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <FieldWrap label="Repeticiones">
              <input
                type="number"
                min={0}
                value={endurance.intervalReps ?? ''}
                onChange={e => update({ intervalReps: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="8"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
              />
            </FieldWrap>
            <FieldWrap label="Trabajo (work)">
              <input
                type="text"
                value={endurance.workInterval ?? ''}
                onChange={e => update({ workInterval: e.target.value || undefined })}
                placeholder="20 s · 3 min · 400 m"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
              />
            </FieldWrap>
            <FieldWrap label="Recuperación">
              <input
                type="text"
                value={endurance.restInterval ?? ''}
                onChange={e => update({ restInterval: e.target.value || undefined })}
                placeholder="10 s · 2 min Z1 · 90 s trote"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
              />
            </FieldWrap>
          </div>
        </div>
      )}

      {/* Fila 4: Targets fisiológicos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <FieldWrap label="Pace objetivo" icon={<Activity size={10} aria-hidden="true" />}>
          <input
            type="text"
            value={endurance.pace ?? ''}
            onChange={e => update({ pace: e.target.value || undefined })}
            placeholder="4:30/km · 1:45/100m · T-pace"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
        <FieldWrap label="Cadencia" icon={<Bike size={10} aria-hidden="true" />}>
          <input
            type="text"
            value={endurance.cadence ?? ''}
            onChange={e => update({ cadence: e.target.value || undefined })}
            placeholder="170-180 ppm · 90 RPM"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
        <FieldWrap label="Frecuencia cardíaca" icon={<Waves size={10} aria-hidden="true" />}>
          <input
            type="text"
            value={endurance.fcTarget ?? ''}
            onChange={e => update({ fcTarget: e.target.value || undefined })}
            placeholder="140-160 bpm · 75-85% FCmax"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
        <FieldWrap label="Potencia (W / FTP)" icon={<Zap size={10} aria-hidden="true" />}>
          <input
            type="text"
            value={endurance.powerTarget ?? ''}
            onChange={e => update({ powerTarget: e.target.value || undefined })}
            placeholder="85% FTP · 200-240 W"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] font-mono focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
      </div>

      {/* Warmup / Cooldown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <FieldWrap label="Calentamiento">
          <textarea
            value={endurance.warmup ?? ''}
            onChange={e => update({ warmup: e.target.value || undefined })}
            rows={2}
            placeholder="10 min Z1 + drills A/B-skip + 3 strides"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] resize-none focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
        <FieldWrap label="Vuelta a la calma">
          <textarea
            value={endurance.cooldown ?? ''}
            onChange={e => update({ cooldown: e.target.value || undefined })}
            rows={2}
            placeholder="5-10 min Z1 + estiramiento estático suave"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] resize-none focus:outline-none focus:border-[#F59E0B]/60"
          />
        </FieldWrap>
      </div>

      {/* Notas libres */}
      <FieldWrap label="Notas / progresión">
        <textarea
          value={exercise.notes ?? ''}
          onChange={e => onChange({ notes: e.target.value || undefined })}
          rows={2}
          placeholder="Foco en respiración nasal, controlar cadencia primer intervalo, anotar pace medio…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] resize-none focus:outline-none focus:border-[#F59E0B]/60"
        />
      </FieldWrap>

      <p className="text-[9px] font-mono text-zinc-500 italic leading-relaxed">
        Referencias: NSCA Essentials of Strength &amp; Conditioning Cap. 21 · Daniels Running Formula · Friel Training Bible · ACSM Guidelines · USA Triathlon Coaching Manual.
      </p>
    </div>
  );
}

function FieldWrap({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[8px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
        {icon}{label}
      </span>
      {children}
    </label>
  );
}

/**
 * Render compacto (read-only) de un bloque de endurance para mostrar en
 * resúmenes (calendario, export, glosario). Devuelve un string ya formateado
 * para usar en exports o tooltips, o un componente JSX inline si se llama
 * <EnduranceSummary />.
 */
export function enduranceSummaryText(e: EnduranceParams): string {
  const parts: string[] = [];
  parts.push(ENDURANCE_MODALITY_LABELS[e.modality]);
  parts.push(ENDURANCE_PROTOCOL_LABELS[e.protocol]);
  if (e.zone) parts.push(e.zone);
  if (e.durationMin) parts.push(`${e.durationMin}'`);
  if (e.distance) parts.push(e.distance);
  if (e.intervalReps && e.workInterval) {
    parts.push(`${e.intervalReps}×${e.workInterval}${e.restInterval ? ` (rec ${e.restInterval})` : ''}`);
  }
  if (e.pace) parts.push(`@${e.pace}`);
  if (e.fcTarget) parts.push(e.fcTarget);
  if (e.powerTarget) parts.push(e.powerTarget);
  return parts.join(' · ');
}

export function EnduranceSummary({ params }: { params: EnduranceParams }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#F59E0B]/90">
      <Activity size={10} aria-hidden="true" />
      <span>{enduranceSummaryText(params)}</span>
    </span>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Selector NSCA: filtra ejercicios por grupo muscular y patrón push/pull
 * y permite agregarlos al editor de rutinas.
 */

import React, { useMemo, useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import {
  exercisesForMuscle,
  MUSCLE_GROUPS_ORDERED,
  MUSCLE_GROUP_LABELS,
  MuscleGroup,
  NscaExercise,
  PUSH_PULL_LABELS,
  PushPullKind,
  isEnduranceExercise
} from '../lib/nsca';
import { MovementIconForExercise, PATTERN_LABELS, patternForExercise } from '../lib/movementIcons';

interface NscaPickerProps {
  availableEquipment?: string[];
  onPick: (ex: NscaExercise) => void;
  onClose?: () => void;
}

const PUSH_PULL_OPTIONS: PushPullKind[] = ['push', 'pull', 'mixed', 'power', 'core'];

export default function NscaPicker({ availableEquipment, onPick, onClose }: NscaPickerProps) {
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [pushPull, setPushPull] = useState<PushPullKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const [respectEquipment, setRespectEquipment] = useState(true);

  const exercises = useMemo(() => {
    const list = exercisesForMuscle(
      muscle,
      pushPull === 'all' ? undefined : pushPull,
      respectEquipment ? availableEquipment : undefined
    );
    if (!search) return list;
    const term = search.toLowerCase();
    return list.filter(e =>
      e.name.toLowerCase().includes(term) ||
      e.englishName.toLowerCase().includes(term) ||
      e.equipment.some(eq => eq.toLowerCase().includes(term))
    );
  }, [muscle, pushPull, search, respectEquipment, availableEquipment]);

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF] font-bold">Biblioteca NSCA + Endurance · {exercises.length}</h4>
        {onClose && (
          <button onClick={onClose} aria-label="Cerrar selector NSCA" className="p-1 text-zinc-500 hover:text-white">
            <X size={11} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          <span className="block font-mono text-[8px] uppercase text-zinc-500 mb-1">Grupo muscular</span>
          <select
            value={muscle}
            onChange={e => setMuscle(e.target.value as MuscleGroup)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]"
          >
            {MUSCLE_GROUPS_ORDERED.map(g => (
              <option key={g} value={g}>{MUSCLE_GROUP_LABELS[g]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block font-mono text-[8px] uppercase text-zinc-500 mb-1">Patrón</span>
          <select
            value={pushPull}
            onChange={e => setPushPull(e.target.value as PushPullKind | 'all')}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]"
          >
            <option value="all">Todos los patrones</option>
            {PUSH_PULL_OPTIONS.map(p => (
              <option key={p} value={p}>{PUSH_PULL_LABELS[p]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2 text-zinc-500" size={11} aria-hidden="true" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre / equipo…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded pl-7 pr-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]"
        />
      </div>

      {availableEquipment && availableEquipment.length > 0 && (
        <label className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-400">
          <input
            type="checkbox"
            checked={respectEquipment}
            onChange={e => setRespectEquipment(e.target.checked)}
            className="accent-[#5D36FF]"
          />
          Filtrar por equipamiento del paciente
        </label>
      )}

      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
        {exercises.length === 0 && (
          <p className="text-[10px] text-zinc-500 text-center py-4">Sin coincidencias para esta combinación.</p>
        )}
        {exercises.map(ex => {
          const pattern = patternForExercise(ex);
          return (
            <button
              key={ex.id}
              onClick={() => onPick(ex)}
              title={PATTERN_LABELS[pattern]}
              className="w-full text-left p-2 bg-zinc-900/50 hover:bg-[#5D36FF]/10 border border-zinc-900 hover:border-[#5D36FF]/40 rounded transition group"
            >
              <div className="flex items-start gap-2">
                {/* Ilustración del patrón */}
                <div className="shrink-0 w-10 h-10 bg-zinc-950/70 border border-zinc-800 rounded flex items-center justify-center text-[#5D36FF]">
                  <MovementIconForExercise exercise={ex} size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white font-bold truncate">{ex.name}</p>
                  <p className="text-[9px] font-mono text-zinc-500 truncate">{ex.englishName}</p>
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-[#5D36FF]/10 text-[#5D36FF]">{PUSH_PULL_LABELS[ex.pushPull]}</span>
                    {isEnduranceExercise(ex) && (
                      <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-bold uppercase">endurance</span>
                    )}
                    <span className="text-[8px] font-mono text-zinc-500 truncate">{ex.equipment.slice(0, 2).join(', ')}</span>
                  </div>
                </div>
                <Plus size={12} className="text-[#5D36FF] opacity-0 group-hover:opacity-100 mt-1" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

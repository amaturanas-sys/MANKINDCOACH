/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Biblioteca unificada de movimientos:
 * - Ejercicios NSCA (read-only, ~120 ejercicios del manual oficial)
 * - Ejercicios custom creados por el usuario (CRUD completo)
 * - Warnings/contraindicaciones (predefinidas + libres) sobre ambos tipos
 *
 * Filtros: search · patrón biomecánico · categoría · músculo primario ·
 * equipamiento · solo con warnings · solo custom · solo NSCA
 */

import React, { useMemo, useState } from 'react';
import {
  Library, Search, Filter, Plus, Pencil, Trash2, AlertTriangle, X, Check, ExternalLink,
  Dumbbell, ChevronDown, ChevronUp, Tag as TagIcon, Image as ImageIcon, RotateCcw
} from 'lucide-react';
import {
  AnatomyImage, CustomExercise, ExerciseWarning, ExerciseOverride, MedicalCondition
} from '../types';
import { MovementPattern, MovementIcon, PATTERN_LABELS, patternForExercise } from '../lib/movementIcons';
import { NSCA_EXERCISES, MUSCLE_GROUP_LABELS, MUSCLE_GROUPS_ORDERED, MuscleGroup, NscaExercise, isEnduranceExercise } from '../lib/nsca';
import AnatomyImageBank, { AnatomyImageStrip, imagesForMuscles } from './AnatomyImageBank';
import {
  MEDICAL_CONDITIONS, SEVERITY_META, CUSTOM_EXERCISE_CATEGORIES, EQUIPMENT_OPTIONS
} from '../constants';

interface ExerciseLibraryTabProps {
  customExercises: CustomExercise[];
  exerciseWarnings: Record<string, ExerciseWarning[]>;
  exerciseOverrides: Record<string, ExerciseOverride>;
  onUpdateCustom: (next: CustomExercise[]) => void;
  onUpdateWarnings: (next: Record<string, ExerciseWarning[]>) => void;
  onUpdateOverrides: (next: Record<string, ExerciseOverride>) => void;
  anatomyImages: AnatomyImage[];
  onAddAnatomyImage: (img: AnatomyImage) => void;
  onRemoveAnatomyImage: (id: string) => void;
}

/** Entrada unificada: NSCA o custom, con warnings resueltos */
interface LibraryEntry {
  id: string;
  source: 'nsca' | 'custom';
  name: string;
  englishName?: string;
  pattern: MovementPattern;
  primaryMuscle: string;
  primaryMuscleLabel: string;
  muscleGroups: string[];
  equipment: string[];
  category?: string;
  technique?: Record<string, string> | string;
  commonErrors?: string;
  variations?: string;
  suggestedIntensity?: string;
  tempo?: string;
  notes?: string;
  warnings: ExerciseWarning[];
  /** true si el coach aplicó una corrección sobre este ejercicio NSCA. */
  edited?: boolean;
  nsca?: NscaExercise;
  custom?: CustomExercise;
}

const PATTERN_KEYS: MovementPattern[] = [
  'push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical',
  'squat', 'hinge', 'lunge', 'carry', 'core', 'jump', 'throw',
  'isolation-arm', 'isolation-leg', 'cardio', 'rotation', 'generic'
];

export default function ExerciseLibraryTab({
  customExercises, exerciseWarnings, exerciseOverrides,
  onUpdateCustom, onUpdateWarnings, onUpdateOverrides,
  anatomyImages, onAddAnatomyImage, onRemoveAnatomyImage
}: ExerciseLibraryTabProps) {
  const [bankOpen, setBankOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterPattern, setFilterPattern] = useState<'all' | MovementPattern>('all');
  const [filterMuscle, setFilterMuscle] = useState<'all' | MuscleGroup>('all');
  const [filterCondition, setFilterCondition] = useState<'all' | MedicalCondition | 'any'>('all');
  const [filterSource, setFilterSource] = useState<'all' | 'nsca' | 'custom' | 'endurance'>('all');
  const [filterEquipment, setFilterEquipment] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingCustom, setEditingCustom] = useState<CustomExercise | null>(null);
  const [editingWarningsFor, setEditingWarningsFor] = useState<string | null>(null);
  const [editingOverrideFor, setEditingOverrideFor] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  /* Unifica NSCA + custom en lista normalizada, aplicando overrides del coach */
  const entries = useMemo<LibraryEntry[]>(() => {
    const out: LibraryEntry[] = [];
    for (const ex of NSCA_EXERCISES) {
      const ov = exerciseOverrides[ex.id];
      const primaryMuscle = ov?.primaryMuscle ?? ex.primaryMuscle;
      out.push({
        id: ex.id,
        source: 'nsca',
        name: ov?.name ?? ex.name,
        englishName: ov?.englishName ?? ex.englishName,
        pattern: ov?.pattern ?? patternForExercise(ex),
        primaryMuscle,
        primaryMuscleLabel: MUSCLE_GROUP_LABELS[primaryMuscle as MuscleGroup] ?? primaryMuscle,
        muscleGroups: ov?.muscleGroups ?? ex.muscleGroups,
        equipment: ov?.equipment ?? ex.equipment,
        category: ov?.category ?? ex.category,
        technique: ov?.technique ?? ex.technique,
        notes: ov?.notes,
        warnings: exerciseWarnings[ex.id] ?? [],
        edited: !!ov,
        nsca: ex
      });
    }
    for (const c of customExercises) {
      out.push({
        id: c.id,
        source: 'custom',
        name: c.name,
        englishName: c.englishName,
        pattern: c.pattern,
        primaryMuscle: c.primaryMuscle,
        primaryMuscleLabel: c.primaryMuscle,
        muscleGroups: c.secondaryMuscles,
        equipment: c.equipment,
        category: c.category,
        technique: c.technique,
        commonErrors: c.commonErrors,
        variations: c.variations,
        suggestedIntensity: c.suggestedIntensity,
        tempo: c.tempo,
        notes: c.notes,
        warnings: c.warnings,
        custom: c
      });
    }
    return out;
  }, [customExercises, exerciseWarnings, exerciseOverrides]);

  /* Aplicar filtros */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(e => {
      // Filtro de origen extendido: 'endurance' (subset de nsca con sourceFile='endurance')
      if (filterSource === 'endurance') {
        if (!e.nsca || !isEnduranceExercise(e.nsca)) return false;
      } else if (filterSource !== 'all' && e.source !== filterSource) {
        return false;
      }
      if (filterPattern !== 'all' && e.pattern !== filterPattern) return false;
      if (filterMuscle !== 'all' && e.primaryMuscle !== filterMuscle && !e.muscleGroups.includes(filterMuscle)) return false;
      if (filterEquipment !== 'all' && !e.equipment.includes(filterEquipment)) return false;
      if (filterCondition === 'any' && e.warnings.length === 0) return false;
      if (filterCondition !== 'all' && filterCondition !== 'any') {
        if (!e.warnings.some(w => w.condition === filterCondition)) return false;
      }
      if (q) {
        const hay = `${e.name} ${e.englishName ?? ''} ${e.primaryMuscleLabel} ${e.muscleGroups.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, query, filterPattern, filterMuscle, filterCondition, filterSource, filterEquipment]);

  const selected = useMemo(() => entries.find(e => e.id === selectedId) ?? null, [entries, selectedId]);

  /* Equipos únicos para el filtro */
  const uniqueEquipment = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => e.equipment.forEach(eq => set.add(eq)));
    return Array.from(set).sort();
  }, [entries]);

  /* KPIs */
  const stats = useMemo(() => ({
    total: entries.length,
    nsca: entries.filter(e => e.source === 'nsca').length,
    endurance: entries.filter(e => e.nsca && isEnduranceExercise(e.nsca)).length,
    custom: entries.filter(e => e.source === 'custom').length,
    withWarnings: entries.filter(e => e.warnings.length > 0).length
  }), [entries]);

  /* Handlers custom */
  const handleCreateCustom = () => {
    setEditingCustom({
      id: `custom-${Date.now()}`,
      name: '',
      pattern: 'generic',
      category: 'fuerza',
      primaryMuscle: '',
      secondaryMuscles: [],
      equipment: [],
      technique: '',
      warnings: [],
      createdAt: Date.now()
    });
  };

  const handleSaveCustom = (ex: CustomExercise) => {
    const idx = customExercises.findIndex(c => c.id === ex.id);
    if (idx >= 0) {
      onUpdateCustom(customExercises.map(c => c.id === ex.id ? ex : c));
    } else {
      onUpdateCustom([...customExercises, ex]);
    }
    setEditingCustom(null);
    setSelectedId(ex.id);
  };

  const handleDeleteCustom = (id: string) => {
    if (!window.confirm('¿Eliminar este ejercicio del catálogo personal?')) return;
    onUpdateCustom(customExercises.filter(c => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  /* Handlers warnings (sobre NSCA o custom) */
  const handleSaveWarnings = (entryId: string, source: 'nsca' | 'custom', warnings: ExerciseWarning[]) => {
    if (source === 'nsca') {
      const next = { ...exerciseWarnings };
      if (warnings.length === 0) delete next[entryId];
      else next[entryId] = warnings;
      onUpdateWarnings(next);
    } else {
      onUpdateCustom(customExercises.map(c => c.id === entryId ? { ...c, warnings } : c));
    }
    setEditingWarningsFor(null);
  };

  /* Handlers de overrides (correcciones sobre ejercicios NSCA) */
  const handleSaveOverride = (id: string, ov: ExerciseOverride) => {
    const next = { ...exerciseOverrides };
    /* Si no quedó ningún campo con valor, equivale a "restablecer". */
    const hasAny = Object.values(ov).some(v => v !== undefined && !(Array.isArray(v) && v.length === 0) && v !== '');
    if (!hasAny) delete next[id];
    else next[id] = ov;
    onUpdateOverrides(next);
    setEditingOverrideFor(null);
  };

  const handleResetOverride = (id: string) => {
    if (!exerciseOverrides[id]) return;
    if (!window.confirm('¿Restablecer este movimiento a los datos originales del manual NSCA?')) return;
    const next = { ...exerciseOverrides };
    delete next[id];
    onUpdateOverrides(next);
    setEditingOverrideFor(null);
  };

  const resetFilters = () => {
    setQuery(''); setFilterPattern('all'); setFilterMuscle('all');
    setFilterCondition('all'); setFilterSource('all'); setFilterEquipment('all');
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#5D36FF]/10 border border-[#5D36FF]/30 px-3 py-1 rounded-full">
            <Library size={12} className="text-[#5D36FF]" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF]">Biblioteca de movimientos</span>
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-white">
            {stats.total} ejercicios disponibles
          </h1>
          <p className="text-zinc-400 font-mono text-xs">
            {stats.nsca - stats.endurance} fuerza/halterofilia NSCA · {stats.endurance} endurance/cross-training · {stats.custom} personales · {stats.withWarnings} con contraindicaciones marcadas
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setBankOpen(true)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-300 hover:text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition flex items-center gap-2"
          >
            <ImageIcon size={14} aria-hidden="true" /> Ilustraciones ({anatomyImages.length})
          </button>
          <button
            type="button"
            onClick={handleCreateCustom}
            className="px-4 py-2 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition flex items-center gap-2"
          >
            <Plus size={14} aria-hidden="true" /> Nuevo ejercicio
          </button>
        </div>
      </section>

      <AnatomyImageBank
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        images={anatomyImages}
        onAdd={onAddAnatomyImage}
        onRemove={onRemoveAnatomyImage}
      />

      {/* FILTROS + SEARCH */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por nombre, músculo, equipamiento..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(s => !s)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-300 hover:text-white rounded-lg font-mono text-[10px] uppercase tracking-wider transition flex items-center gap-2"
          >
            <Filter size={12} aria-hidden="true" />
            {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            {(filterPattern !== 'all' || filterMuscle !== 'all' || filterCondition !== 'all' || filterSource !== 'all' || filterEquipment !== 'all') && (
              <span className="px-1.5 py-0.5 bg-[#5D36FF] text-white text-[9px] rounded-full">●</span>
            )}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 bg-transparent border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg font-mono text-[10px] uppercase tracking-wider transition"
          >
            Limpiar
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 pt-3 border-t border-zinc-800">
            <FilterSelect label="Origen" value={filterSource} onChange={v => setFilterSource(v as typeof filterSource)}>
              <option value="all">Todos</option>
              <option value="nsca">Solo NSCA (fuerza)</option>
              <option value="endurance">Solo endurance/cross-training</option>
              <option value="custom">Solo personales</option>
            </FilterSelect>
            <FilterSelect label="Patrón biomecánico" value={filterPattern} onChange={v => setFilterPattern(v as typeof filterPattern)}>
              <option value="all">Todos</option>
              {PATTERN_KEYS.map(p => <option key={p} value={p}>{PATTERN_LABELS[p]}</option>)}
            </FilterSelect>
            <FilterSelect label="Músculo" value={filterMuscle} onChange={v => setFilterMuscle(v as typeof filterMuscle)}>
              <option value="all">Todos</option>
              {(Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroup, string][]).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Contraindicación" value={filterCondition} onChange={v => setFilterCondition(v as typeof filterCondition)}>
              <option value="all">Todos</option>
              <option value="any">Cualquier warning marcado</option>
              {MEDICAL_CONDITIONS.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Equipamiento" value={filterEquipment} onChange={v => setFilterEquipment(v)}>
              <option value="all">Todos</option>
              {uniqueEquipment.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </FilterSelect>
          </div>
        )}
      </div>

      {/* CONTADOR */}
      <p className="text-[11px] font-mono text-zinc-500">
        Mostrando <strong className="text-white">{filtered.length}</strong> de {stats.total} ejercicios
      </p>

      {/* LISTA + DETALLE */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Lista (3 cols) */}
        <div className="lg:col-span-3 bg-[#121214] border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs">
                Ningún ejercicio coincide con los filtros aplicados.
              </div>
            ) : (
              <ul>
                {filtered.map(e => {
                  const isSelected = selectedId === e.id;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(e.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 border-b border-zinc-900 text-left transition ${
                          isSelected ? 'bg-[#5D36FF]/10 border-l-2 border-l-[#5D36FF]' : 'hover:bg-zinc-950/60'
                        }`}
                      >
                        <div className="w-10 h-10 shrink-0 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-center">
                          <MovementIcon pattern={e.pattern} size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sans font-bold text-sm text-white truncate">{e.name}</span>
                            {e.source === 'custom' && (
                              <span className="px-1.5 py-0.5 bg-[#5D36FF]/20 text-[#5D36FF] text-[8px] font-mono uppercase tracking-wider rounded font-bold">
                                personal
                              </span>
                            )}
                            {e.nsca && isEnduranceExercise(e.nsca) && (
                              <span className="px-1.5 py-0.5 bg-[#F59E0B]/15 text-[#F59E0B] text-[8px] font-mono uppercase tracking-wider rounded font-bold">
                                endurance
                              </span>
                            )}
                            {e.edited && (
                              <span className="px-1.5 py-0.5 bg-[#10B981]/15 text-[#10B981] text-[8px] font-mono uppercase tracking-wider rounded font-bold">
                                corregido
                              </span>
                            )}
                            {e.warnings.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FFB020]/15 text-[#FFB020] text-[9px] font-mono rounded font-bold">
                                <AlertTriangle size={9} aria-hidden="true" /> {e.warnings.length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-zinc-400">{PATTERN_LABELS[e.pattern]}</span>
                            <span className="text-zinc-700">·</span>
                            <span className="text-[10px] font-mono text-zinc-500">{e.primaryMuscleLabel}</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Detalle (2 cols) */}
        <div className="lg:col-span-2 bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg">
          {selected ? (
            <ExerciseDetail
              entry={selected}
              images={imagesForMuscles(anatomyImages, [selected.primaryMuscle, ...selected.muscleGroups])}
              onEditCustom={() => selected.custom && setEditingCustom({ ...selected.custom })}
              onDeleteCustom={() => selected.custom && handleDeleteCustom(selected.custom.id)}
              onEditOverride={() => setEditingOverrideFor(selected.id)}
              onResetOverride={() => handleResetOverride(selected.id)}
              onEditWarnings={() => setEditingWarningsFor(selected.id)}
              onOpenBank={() => setBankOpen(true)}
            />
          ) : (
            <div className="text-center py-16 space-y-3">
              <Dumbbell size={28} className="text-zinc-700 mx-auto" aria-hidden="true" />
              <p className="text-[11px] font-mono text-zinc-500">Elige un ejercicio de la lista para ver su detalle.</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Los warnings se aplican al ejercicio en cualquier rutina que lo use. Tu listado personal se incluye en los backups.
      </p>

      {/* MODAL: editor de ejercicio custom */}
      {editingCustom && (
        <CustomExerciseEditor
          draft={editingCustom}
          onChange={setEditingCustom}
          onSave={() => handleSaveCustom(editingCustom)}
          onCancel={() => setEditingCustom(null)}
        />
      )}

      {/* MODAL: editor de warnings sobre un ejercicio (NSCA o custom) */}
      {editingWarningsFor && selected && (
        <WarningEditor
          entryName={selected.name}
          current={selected.warnings}
          onSave={(w) => handleSaveWarnings(selected.id, selected.source, w)}
          onCancel={() => setEditingWarningsFor(null)}
        />
      )}

      {/* MODAL: corrección de un ejercicio NSCA (override) */}
      {editingOverrideFor && selected && selected.nsca && (
        <OverrideEditor
          base={selected.nsca}
          current={exerciseOverrides[editingOverrideFor] ?? {}}
          onSave={(ov) => handleSaveOverride(editingOverrideFor, ov)}
          onReset={() => handleResetOverride(editingOverrideFor)}
          onCancel={() => setEditingOverrideFor(null)}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Detalle de ejercicio
 * ----------------------------------------------------------------------- */

function ExerciseDetail({ entry, images, onEditCustom, onDeleteCustom, onEditOverride, onResetOverride, onEditWarnings, onOpenBank }: {
  entry: LibraryEntry;
  images: AnatomyImage[];
  onEditCustom: () => void;
  onDeleteCustom: () => void;
  onEditOverride: () => void;
  onResetOverride: () => void;
  onEditWarnings: () => void;
  onOpenBank: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 shrink-0 bg-zinc-950/60 border border-zinc-800 rounded-lg flex items-center justify-center">
            <MovementIcon pattern={entry.pattern} size={32} />
          </div>
          <div>
            <h2 className="font-sans font-bold text-base text-white">{entry.name}</h2>
            {entry.englishName && (
              <p className="text-[10px] font-mono text-zinc-500 italic">{entry.englishName}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[9px] font-mono uppercase rounded">
                {PATTERN_LABELS[entry.pattern]}
              </span>
              {entry.source === 'custom' && (
                <span className="px-1.5 py-0.5 bg-[#5D36FF]/20 text-[#5D36FF] text-[9px] font-mono uppercase rounded font-bold">
                  Personal
                </span>
              )}
              {entry.nsca && isEnduranceExercise(entry.nsca) && (
                <span className="px-1.5 py-0.5 bg-[#F59E0B]/15 text-[#F59E0B] text-[9px] font-mono uppercase rounded font-bold">
                  Endurance / Cross-training
                </span>
              )}
              {entry.edited && (
                <span className="px-1.5 py-0.5 bg-[#10B981]/15 text-[#10B981] text-[9px] font-mono uppercase rounded font-bold">
                  Corregido
                </span>
              )}
            </div>
          </div>
        </div>
        {entry.source === 'custom' ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onEditCustom} className="p-1.5 text-zinc-500 hover:text-[#5D36FF] rounded" aria-label="Editar">
              <Pencil size={13} aria-hidden="true" />
            </button>
            <button type="button" onClick={onDeleteCustom} className="p-1.5 text-zinc-500 hover:text-red-400 rounded" aria-label="Eliminar">
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {entry.edited && (
              <button type="button" onClick={onResetOverride} className="p-1.5 text-zinc-500 hover:text-[#FFB020] rounded" aria-label="Restablecer al original" title="Restablecer al original NSCA">
                <RotateCcw size={13} aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={onEditOverride} className="p-1.5 text-zinc-500 hover:text-[#5D36FF] rounded" aria-label="Corregir datos" title="Corregir catalogación / detalles">
              <Pencil size={13} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <DetailRow label="Músculo primario" value={entry.primaryMuscleLabel} />
      {entry.muscleGroups.length > 0 && (
        <DetailRow label="Músculos secundarios" value={entry.muscleGroups.map(m => MUSCLE_GROUP_LABELS[m as MuscleGroup] ?? m).join(', ')} />
      )}
      {entry.category && <DetailRow label="Categoría" value={entry.category} />}
      {entry.equipment.length > 0 && (
        <div>
          <span className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">Equipamiento</span>
          <div className="flex flex-wrap gap-1">
            {entry.equipment.map(eq => (
              <span key={eq} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono rounded">
                <TagIcon size={8} aria-hidden="true" />{eq}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ilustraciones anatómicas (banco con licencia, emparejadas por músculo) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Ilustraciones anatómicas</span>
          <button type="button" onClick={onOpenBank} className="text-[9px] font-mono uppercase text-[#5D36FF] hover:underline">
            {images.length ? 'Gestionar' : 'Añadir'}
          </button>
        </div>
        {images.length > 0 ? (
          <AnatomyImageStrip images={images} />
        ) : (
          <p className="text-[10px] font-mono text-zinc-600 italic">
            Sin ilustraciones para estos músculos. Importa imágenes con licencia (CC) y etiquétalas por músculo.
          </p>
        )}
      </div>

      {/* Técnica */}
      {entry.technique && (
        <div>
          <span className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">Técnica</span>
          {typeof entry.technique === 'string' ? (
            <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{entry.technique}</p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(entry.technique).map(([k, v]) => (
                <div key={k} className="text-[11px]">
                  <span className="font-mono text-zinc-500 capitalize">{k.replaceAll('_', ' ')}:</span>{' '}
                  <span className="text-zinc-300">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {entry.commonErrors && <DetailParagraph label="Errores frecuentes" value={entry.commonErrors} />}
      {entry.variations && <DetailParagraph label="Variantes" value={entry.variations} />}
      {entry.suggestedIntensity && <DetailRow label="Intensidad sugerida" value={entry.suggestedIntensity} />}
      {entry.tempo && <DetailRow label="Tempo" value={entry.tempo} />}
      {entry.notes && <DetailParagraph label="Notas" value={entry.notes} />}

      {/* Warnings */}
      <div className="pt-3 border-t border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-[#FFB020]" aria-hidden="true" />
            Contraindicaciones ({entry.warnings.length})
          </span>
          <button
            type="button"
            onClick={onEditWarnings}
            className="text-[9px] font-mono uppercase text-[#5D36FF] hover:underline"
          >
            Editar
          </button>
        </div>
        {entry.warnings.length === 0 ? (
          <p className="text-[10px] font-mono text-zinc-600 italic">Sin warnings marcados.</p>
        ) : (
          <ul className="space-y-1.5">
            {entry.warnings.map((w, i) => {
              const condMeta = MEDICAL_CONDITIONS.find(c => c.code === w.condition);
              const sevMeta = SEVERITY_META[w.severity];
              return (
                <li key={i} className="bg-zinc-950/60 border border-zinc-800 rounded p-2 text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-300">{condMeta?.emoji} {condMeta?.label ?? w.condition}</span>
                    <span
                      className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold rounded border"
                      style={{ color: sevMeta.color, borderColor: `${sevMeta.color}40`, backgroundColor: `${sevMeta.color}15` }}
                    >
                      {sevMeta.emoji} {sevMeta.label}
                    </span>
                  </div>
                  {w.note && <p className="text-[10px] font-mono text-zinc-400 mt-1 italic">{w.note}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-[11px]">
      <span className="font-mono uppercase tracking-wider text-zinc-500 w-32 shrink-0">{label}</span>
      <span className="text-zinc-300 flex-1">{value}</span>
    </div>
  );
}
function DetailParagraph({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500 mb-1">{label}</span>
      <p className="text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Filtro select pequeño
 * ----------------------------------------------------------------------- */

function FilterSelect({ label, value, onChange, children }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60"
      >
        {children}
      </select>
    </label>
  );
}

/* ----------------------------------------------------------------------- *
 * Editor de ejercicio custom (modal)
 * ----------------------------------------------------------------------- */

function CustomExerciseEditor({ draft, onChange, onSave, onCancel }: {
  draft: CustomExercise;
  onChange: (d: CustomExercise) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [equipmentFilter, setEquipmentFilter] = useState('');

  const toggleEquipment = (eq: string) => {
    const next = draft.equipment.includes(eq)
      ? draft.equipment.filter(e => e !== eq)
      : [...draft.equipment, eq];
    onChange({ ...draft, equipment: next });
  };

  const removeWarning = (idx: number) => {
    onChange({ ...draft, warnings: draft.warnings.filter((_, i) => i !== idx) });
  };

  const addWarning = () => {
    const exists = new Set(draft.warnings.map(w => w.condition));
    const next = MEDICAL_CONDITIONS.find(c => !exists.has(c.code));
    if (!next) { alert('Ya marcaste todas las contraindicaciones disponibles.'); return; }
    onChange({
      ...draft,
      warnings: [...draft.warnings, { condition: next.code, severity: 'precaucion' }]
    });
  };

  const filteredEq = useMemo(() => {
    const q = equipmentFilter.trim().toLowerCase();
    if (!q) return EQUIPMENT_OPTIONS;
    return EQUIPMENT_OPTIONS.filter(eq => eq.toLowerCase().includes(q));
  }, [equipmentFilter]);

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Editar ejercicio"
      className="fixed inset-0 z-[210] flex items-start justify-center pt-[5vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-3xl bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
          <h3 className="font-sans font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
            <Dumbbell size={16} className="text-[#5D36FF]" aria-hidden="true" />
            {draft.name.trim() ? `Editar: ${draft.name}` : 'Nuevo ejercicio personal'}
          </h3>
          <button type="button" onClick={onCancel} className="p-1.5 text-zinc-500 hover:text-white" aria-label="Cerrar"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nombre del ejercicio *">
              <input type="text" value={draft.name} onChange={e => onChange({ ...draft, name: e.target.value })} autoFocus
                placeholder="Ej: Sentadilla búlgara con mancuernas"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Nombre en inglés (opcional)">
              <input type="text" value={draft.englishName ?? ''} onChange={e => onChange({ ...draft, englishName: e.target.value || undefined })}
                placeholder="Bulgarian split squat"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Patrón biomecánico">
              <select value={draft.pattern} onChange={e => onChange({ ...draft, pattern: e.target.value as MovementPattern })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
                {PATTERN_KEYS.map(p => <option key={p} value={p}>{PATTERN_LABELS[p]}</option>)}
              </select>
            </Field>
            <Field label="Categoría">
              <select value={draft.category} onChange={e => onChange({ ...draft, category: e.target.value as CustomExercise['category'] })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
                {CUSTOM_EXERCISE_CATEGORIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Músculo primario *">
              <input type="text" value={draft.primaryMuscle} onChange={e => onChange({ ...draft, primaryMuscle: e.target.value })}
                placeholder="Cuádriceps"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Músculos secundarios (separar con comas)">
              <input type="text" value={draft.secondaryMuscles.join(', ')}
                onChange={e => onChange({ ...draft, secondaryMuscles: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="Glúteos, isquiotibiales, core"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Intensidad sugerida (opcional)">
              <input type="text" value={draft.suggestedIntensity ?? ''} onChange={e => onChange({ ...draft, suggestedIntensity: e.target.value || undefined })}
                placeholder="80% 1RM o RPE 8"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Tempo (opcional)">
              <input type="text" value={draft.tempo ?? ''} onChange={e => onChange({ ...draft, tempo: e.target.value || undefined })}
                placeholder="3-1-1-0"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
          </div>

          <Field label="Técnica de ejecución *">
            <textarea rows={4} value={draft.technique} onChange={e => onChange({ ...draft, technique: e.target.value })}
              placeholder="Descripción paso a paso de la técnica correcta..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 font-mono resize-y" />
          </Field>

          <Field label="Errores frecuentes (opcional)">
            <textarea rows={2} value={draft.commonErrors ?? ''} onChange={e => onChange({ ...draft, commonErrors: e.target.value || undefined })}
              placeholder="Inclinar el torso, sacar el talón del piso..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 font-mono resize-y" />
          </Field>

          <Field label="Variantes / progresiones (opcional)">
            <textarea rows={2} value={draft.variations ?? ''} onChange={e => onChange({ ...draft, variations: e.target.value || undefined })}
              placeholder="Con barra trasera, con cadena de lastre, isométrica..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 font-mono resize-y" />
          </Field>

          <Field label="Notas adicionales (opcional)">
            <textarea rows={2} value={draft.notes ?? ''} onChange={e => onChange({ ...draft, notes: e.target.value || undefined })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 font-mono resize-y" />
          </Field>

          {/* Equipamiento */}
          <div className="space-y-2">
            <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">
              Equipamiento ({draft.equipment.length} seleccionados)
            </span>
            <input type="text" value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)} placeholder="Filtrar equipos..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-[160px] overflow-y-auto scrollbar-thin bg-zinc-950/40 border border-zinc-800 rounded p-2">
              {filteredEq.map(eq => {
                const checked = draft.equipment.includes(eq);
                return (
                  <label key={eq} className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[10px] transition ${checked ? 'bg-[#5D36FF]/15 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleEquipment(eq)} className="sr-only" />
                    <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-[#5D36FF] border-[#5D36FF]' : 'border-zinc-700'}`}>
                      {checked && <Check size={9} strokeWidth={3} className="text-white" />}
                    </span>
                    <span className="font-mono">{eq}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Warnings inline */}
          <div className="space-y-2 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-[#FFB020]" aria-hidden="true" />
                Contraindicaciones ({draft.warnings.length})
              </span>
              <button type="button" onClick={addWarning}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#FFB020]/10 border border-[#FFB020]/30 text-[#FFB020] rounded font-mono text-[9px] uppercase tracking-wider font-bold hover:bg-[#FFB020]/20 transition">
                <Plus size={10} aria-hidden="true" /> Agregar warning
              </button>
            </div>
            {draft.warnings.length === 0 ? (
              <p className="text-[10px] font-mono text-zinc-600 italic">Sin warnings. Agrega si este ejercicio tiene contraindicaciones.</p>
            ) : (
              <div className="space-y-2">
                {draft.warnings.map((w, i) => (
                  <WarningRow key={i} warning={w}
                    onChange={(next) => onChange({ ...draft, warnings: draft.warnings.map((x, j) => j === i ? next : x) })}
                    onRemove={() => removeWarning(i)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-zinc-800 p-3 flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px] uppercase font-bold hover:bg-zinc-800 transition">
            Cancelar
          </button>
          <button type="button" onClick={onSave}
            disabled={!draft.name.trim() || !draft.primaryMuscle.trim() || !draft.technique.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-[10px] uppercase font-bold transition">
            <Check size={11} aria-hidden="true" /> Guardar ejercicio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Editor de warnings (modal independiente, usado para ejercicios NSCA)
 * ----------------------------------------------------------------------- */

function WarningEditor({ entryName, current, onSave, onCancel }: {
  entryName: string;
  current: ExerciseWarning[];
  onSave: (next: ExerciseWarning[]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ExerciseWarning[]>(current);

  const addWarning = () => {
    const exists = new Set(draft.map(w => w.condition));
    const next = MEDICAL_CONDITIONS.find(c => !exists.has(c.code));
    if (!next) { alert('Ya marcaste todas las contraindicaciones disponibles.'); return; }
    setDraft([...draft, { condition: next.code, severity: 'precaucion' }]);
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Editar contraindicaciones"
      className="fixed inset-0 z-[210] flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-xl bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
          <h3 className="font-sans font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={16} className="text-[#FFB020]" aria-hidden="true" />
            Contraindicaciones
          </h3>
          <button type="button" onClick={onCancel} className="p-1.5 text-zinc-500 hover:text-white" aria-label="Cerrar"><X size={14} /></button>
        </div>
        <p className="px-4 pt-3 text-[11px] font-mono text-zinc-400">
          Ejercicio: <strong className="text-white">{entryName}</strong>
        </p>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
          {draft.length === 0 ? (
            <p className="text-[11px] font-mono text-zinc-500 italic text-center py-8">
              Sin warnings marcados. Usa "Agregar warning" si este ejercicio tiene contraindicaciones.
            </p>
          ) : draft.map((w, i) => (
            <WarningRow key={i} warning={w}
              onChange={(next) => setDraft(d => d.map((x, j) => j === i ? next : x))}
              onRemove={() => setDraft(d => d.filter((_, j) => j !== i))} />
          ))}
          <button type="button" onClick={addWarning}
            className="w-full mt-2 inline-flex items-center justify-center gap-1 px-3 py-2 bg-[#FFB020]/10 border border-[#FFB020]/30 hover:bg-[#FFB020]/20 text-[#FFB020] rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
            <Plus size={11} aria-hidden="true" /> Agregar contraindicación
          </button>
        </div>
        <div className="border-t border-zinc-800 p-3 flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px] uppercase font-bold hover:bg-zinc-800 transition">
            Cancelar
          </button>
          <button type="button" onClick={() => onSave(draft)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase font-bold transition">
            <Check size={11} aria-hidden="true" /> Guardar warnings
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Editor de corrección (override) sobre un ejercicio NSCA
 * ----------------------------------------------------------------------- */

function OverrideEditor({ base, current, onSave, onReset, onCancel }: {
  base: NscaExercise;
  current: ExerciseOverride;
  onSave: (ov: ExerciseOverride) => void;
  onReset: () => void;
  onCancel: () => void;
}) {
  const basePattern = patternForExercise(base);
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [draft, setDraft] = useState({
    name: current.name ?? base.name,
    englishName: current.englishName ?? base.englishName ?? '',
    pattern: current.pattern ?? basePattern,
    primaryMuscle: (current.primaryMuscle ?? base.primaryMuscle) as string,
    muscleGroups: (current.muscleGroups ?? base.muscleGroups) as string[],
    equipment: (current.equipment ?? base.equipment) as string[],
    category: current.category ?? base.category,
    technique: current.technique ?? '',
    notes: current.notes ?? ''
  });

  const set = <K extends keyof typeof draft>(k: K, v: typeof draft[K]) => setDraft(d => ({ ...d, [k]: v }));

  const toggleEquipment = (eq: string) => {
    set('equipment', draft.equipment.includes(eq) ? draft.equipment.filter(e => e !== eq) : [...draft.equipment, eq]);
  };
  const toggleMuscle = (m: string) => {
    set('muscleGroups', draft.muscleGroups.includes(m) ? draft.muscleGroups.filter(x => x !== m) : [...draft.muscleGroups, m]);
  };

  const filteredEq = useMemo(() => {
    const q = equipmentFilter.trim().toLowerCase();
    /* incluye equipos del ejercicio aunque no estén en el catálogo estándar */
    const base = Array.from(new Set([...EQUIPMENT_OPTIONS, ...draft.equipment]));
    return q ? base.filter(eq => eq.toLowerCase().includes(q)) : base;
  }, [equipmentFilter, draft.equipment]);

  const sameArr = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

  const save = () => {
    const ov: ExerciseOverride = {
      name: draft.name.trim() && draft.name.trim() !== base.name ? draft.name.trim() : undefined,
      englishName: draft.englishName.trim() && draft.englishName.trim() !== (base.englishName ?? '') ? draft.englishName.trim() : undefined,
      pattern: draft.pattern !== basePattern ? draft.pattern : undefined,
      primaryMuscle: draft.primaryMuscle && draft.primaryMuscle !== base.primaryMuscle ? draft.primaryMuscle : undefined,
      muscleGroups: !sameArr(draft.muscleGroups, base.muscleGroups) ? draft.muscleGroups : undefined,
      equipment: !sameArr(draft.equipment, base.equipment) ? draft.equipment : undefined,
      category: draft.category && draft.category !== base.category ? draft.category : undefined,
      technique: draft.technique.trim() ? draft.technique.trim() : undefined,
      notes: draft.notes.trim() ? draft.notes.trim() : undefined
    };
    onSave(ov);
  };

  const isEdited = Object.keys(current).length > 0;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Corregir ejercicio"
      className="fixed inset-0 z-[210] flex items-start justify-center pt-[5vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-3xl bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-base text-white uppercase tracking-wider flex items-center gap-2">
              <Pencil size={16} className="text-[#5D36FF]" aria-hidden="true" /> Corregir catalogación
            </h3>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Ejercicio del manual NSCA · tus cambios solo afectan a tu biblioteca y se incluyen en los backups.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 text-zinc-500 hover:text-white" aria-label="Cerrar"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nombre">
              <input type="text" value={draft.name} onChange={e => set('name', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Nombre en inglés">
              <input type="text" value={draft.englishName} onChange={e => set('englishName', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Patrón biomecánico">
              <select value={draft.pattern} onChange={e => set('pattern', e.target.value as MovementPattern)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
                {PATTERN_KEYS.map(p => <option key={p} value={p}>{PATTERN_LABELS[p]}</option>)}
              </select>
            </Field>
            <Field label="Categoría">
              <input type="text" value={draft.category} onChange={e => set('category', e.target.value)}
                placeholder="isolation, squat, press, power, core..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </Field>
            <Field label="Músculo primario">
              <select value={draft.primaryMuscle} onChange={e => set('primaryMuscle', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
                {MUSCLE_GROUPS_ORDERED.map(m => <option key={m} value={m}>{MUSCLE_GROUP_LABELS[m]}</option>)}
              </select>
            </Field>
          </div>

          {/* Músculos secundarios */}
          <div className="space-y-1.5">
            <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">Músculos secundarios</span>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS_ORDERED.map(m => {
                const on = draft.muscleGroups.includes(m);
                return (
                  <button key={m} type="button" onClick={() => toggleMuscle(m)}
                    className={`px-2 py-1 rounded border text-[10px] font-mono transition ${on ? 'bg-[#5D36FF]/15 border-[#5D36FF]/50 text-white' : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}>
                    {MUSCLE_GROUP_LABELS[m]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipamiento */}
          <div className="space-y-2">
            <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">
              Equipamiento ({draft.equipment.length})
            </span>
            <input type="text" value={equipmentFilter} onChange={e => setEquipmentFilter(e.target.value)} placeholder="Filtrar equipos..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1 max-h-[160px] overflow-y-auto scrollbar-thin bg-zinc-950/40 border border-zinc-800 rounded p-2">
              {filteredEq.map(eq => {
                const checked = draft.equipment.includes(eq);
                return (
                  <label key={eq} className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-[10px] transition ${checked ? 'bg-[#5D36FF]/15 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleEquipment(eq)} className="sr-only" />
                    <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-[#5D36FF] border-[#5D36FF]' : 'border-zinc-700'}`}>
                      {checked && <Check size={9} strokeWidth={3} className="text-white" />}
                    </span>
                    <span className="font-mono">{eq}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Field label="Técnica (deja vacío para conservar la del manual)">
            <textarea rows={3} value={draft.technique} onChange={e => set('technique', e.target.value)}
              placeholder="Sobrescribe la descripción técnica si la del manual tiene errores..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 font-mono resize-y" />
          </Field>

          <Field label="Notas del coach (opcional)">
            <input type="text" value={draft.notes} onChange={e => set('notes', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
        </div>

        <div className="border-t border-zinc-800 p-3 flex items-center justify-between gap-2">
          <button type="button" onClick={onReset} disabled={!isEdited}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-[#FFB020] hover:border-[#FFB020]/40 disabled:opacity-30 disabled:cursor-not-allowed rounded font-mono text-[10px] uppercase font-bold transition">
            <RotateCcw size={11} aria-hidden="true" /> Restablecer original
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onCancel}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px] uppercase font-bold hover:bg-zinc-800 transition">
              Cancelar
            </button>
            <button type="button" onClick={save}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase font-bold transition">
              <Check size={11} aria-hidden="true" /> Guardar corrección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Fila de warning editable */
function WarningRow({ warning, onChange, onRemove }: {
  warning: ExerciseWarning;
  onChange: (w: ExerciseWarning) => void;
  onRemove: () => void;
}) {
  const condMeta = MEDICAL_CONDITIONS.find(c => c.code === warning.condition);
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <select
          value={warning.condition}
          onChange={e => onChange({ ...warning, condition: e.target.value as MedicalCondition })}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]/60"
        >
          {MEDICAL_CONDITIONS.map(c => (
            <option key={c.code} value={c.code}>{c.emoji} {c.label}</option>
          ))}
        </select>
        <select
          value={warning.severity}
          onChange={e => onChange({ ...warning, severity: e.target.value as ExerciseWarning['severity'] })}
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]/60"
        >
          {(Object.entries(SEVERITY_META) as [keyof typeof SEVERITY_META, typeof SEVERITY_META[keyof typeof SEVERITY_META]][]).map(([k, m]) => (
            <option key={k} value={k}>{m.emoji} {m.label}</option>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="p-1 text-zinc-500 hover:text-red-400 rounded" aria-label="Eliminar warning">
          <Trash2 size={11} aria-hidden="true" />
        </button>
      </div>
      <input
        type="text" value={warning.note ?? ''}
        onChange={e => onChange({ ...warning, note: e.target.value || undefined })}
        placeholder={condMeta ? `Adaptación específica para ${condMeta.label.toLowerCase()}` : 'Nota opcional'}
        className="w-full bg-transparent border-b border-zinc-800 text-white text-[10px] font-mono focus:outline-none focus:border-[#5D36FF]/60 placeholder:text-zinc-600"
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

/* utilidades exportadas para evitar tree-shaking */
export { ChevronDown, ChevronUp, ExternalLink };

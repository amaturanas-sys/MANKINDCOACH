/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PLANIFICADOR (Bloque D) — calendario horizontal de 5 semanas con celdas
 * AM/PM por día. Los bloques de entrenamiento se arrastran desde la paleta a
 * la franja deseada como "ladrillos" coloreados por tipo. Al hacer clic en un
 * bloque, se abre un panel lateral dinámico para editar sus parámetros,
 * clonarlo o eliminarlo. Las cargas se guardan por fecha absoluta + franja, de
 * modo que la vista por semanas puede cruzar meses sin romper el resto de la app.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon, Plus, Trash2, Copy, X, Check, Briefcase,
  ChevronLeft, ChevronRight, Search, Zap, Clock, Dumbbell, Library,
  Sun, Moon, LayoutGrid
} from 'lucide-react';
import { MicrocycleTemplate, MonthRef, ScheduledRoutine, WorkoutRoutine, WorkoutCategory, Exercise } from '../types';
import { DAY_NAMES, MONTH_NAMES, monthLabel } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDraggable, useDroppable, pointerWithin,
  type DragStartEvent, type DragEndEvent
} from '@dnd-kit/core';
import TemplatesPanel from './TemplatesPanel';
import NscaPicker from './NscaPicker';
import EnduranceFields from './EnduranceFields';
import { findNscaExerciseById, NSCA_EXERCISES, buildEnduranceParamsFromNsca } from '../lib/nsca';
import { MovementIconForExercise, MovementIcon, patternFromName } from '../lib/movementIcons';

type DaySlot = 'am' | 'pm';
const SLOTS: DaySlot[] = ['am', 'pm'];
const WEEKS_SHOWN = 5;

interface CalendarTabProps {
  routines: WorkoutRoutine[];
  onUpdateRoutines: (routines: WorkoutRoutine[]) => void;
  scheduledRoutines: ScheduledRoutine[];
  onUpdateScheduledRoutines: (scheduled: ScheduledRoutine[]) => void;
  activeClientId: string;
  activeClientEquipment: string[];
  viewedMonth: MonthRef;
  onChangeViewedMonth: (m: MonthRef) => void;
  templates: MicrocycleTemplate[];
  onUpdateTemplates: (t: MicrocycleTemplate[]) => void;
}

const CATEGORY_CONFIG: Record<WorkoutCategory, { label: string; short: string; color: string; bg: string; border: string; brick: string; hex: string }> = {
  fuerza:        { label: 'Fuerza Máxima',          short: 'Fuerza',   color: 'text-[#5D36FF]', bg: 'bg-[#5D36FF]/10', border: 'border-[#5D36FF]/30', brick: 'bg-[#5D36FF]', hex: '#5D36FF' },
  potencia:      { label: 'Potencia Explosiva',     short: 'Potencia', color: 'text-[#00D8F6]', bg: 'bg-[#00D8F6]/10', border: 'border-[#00D8F6]/30', brick: 'bg-[#00D8F6]', hex: '#00D8F6' },
  hipertrofia:   { label: 'Hipertrofia',            short: 'Hipertr.', color: 'text-[#D800F6]', bg: 'bg-[#D800F6]/10', border: 'border-[#D800F6]/30', brick: 'bg-[#D800F6]', hex: '#D800F6' },
  aerobico:      { label: 'Capacidad Aeróbica',     short: 'Aeróbico', color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/30', brick: 'bg-[#10B981]', hex: '#10B981' },
  resistencia:   { label: 'Resistencia (endurance)', short: 'Resist.', color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/30', brick: 'bg-[#F59E0B]', hex: '#F59E0B' },
  cross_training:{ label: 'Cross-Training',         short: 'Cross',    color: 'text-[#EC4899]', bg: 'bg-[#EC4899]/10', border: 'border-[#EC4899]/30', brick: 'bg-[#EC4899]', hex: '#EC4899' }
};

/* ----------------------------- helpers de fecha ----------------------------- */
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const wd = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - wd);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
const dayKey = (y: number, m: number, d: number, slot: DaySlot) => `${y}-${m}-${d}-${slot}`;
const slotOf = (s: ScheduledRoutine): DaySlot => s.slot ?? 'am';

interface PlannerDay {
  date: Date;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  dayName: string;
  isToday: boolean;
  isFirstOfMonth: boolean;
}

/* ----------------------------- drag & drop ----------------------------- */
type CalendarDragData =
  | { kind: 'new'; routineId: string; label: string; category: WorkoutCategory }
  | { kind: 'move'; scheduledId: string; label: string; category: WorkoutCategory };

function DragArea({ id, data, className, onClick, children }: {
  id: string;
  data: CalendarDragData;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id, data });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`${className ?? ''} cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      {children}
    </div>
  );
}

function DroppableSlot({ id, disabled, baseClassName, children }: {
  id: string;
  disabled?: boolean;
  baseClassName: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled });
  return (
    <div ref={setNodeRef} className={`${baseClassName} ${isOver && !disabled ? 'border-[#5D36FF] border-dashed bg-[#5D36FF]/10' : ''}`}>
      {children}
    </div>
  );
}

export default function CalendarTab({
  routines,
  onUpdateRoutines,
  scheduledRoutines,
  onUpdateScheduledRoutines,
  activeClientId,
  activeClientEquipment,
  viewedMonth,
  onChangeViewedMonth,
  templates,
  onUpdateTemplates
}: CalendarTabProps) {
  const [filterCategory, setFilterCategory] = useState<WorkoutCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDrag, setActiveDrag] = useState<{ label: string; category: WorkoutCategory } | null>(null);
  const [selectedScheduledId, setSelectedScheduledId] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creatorDraft, setCreatorDraft] = useState<WorkoutRoutine | null>(null);
  const [creatorTarget, setCreatorTarget] = useState<{ day: PlannerDay; slot: DaySlot } | null>(null);
  const [slotMenu, setSlotMenu] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* Ancla = lunes de la primera semana visible. Arranca en la semana de hoy. */
  const [anchorMonday, setAnchorMonday] = useState<Date>(() => startOfWeekMonday(new Date()));

  const dndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  /* Sincroniza el mes "oficial" (para plantillas/etiquetas) con la semana central. */
  useEffect(() => {
    const mid = addDays(anchorMonday, 17); // ~mitad de las 5 semanas
    if (mid.getFullYear() !== viewedMonth.year || mid.getMonth() !== viewedMonth.monthIndex) {
      onChangeViewedMonth({ year: mid.getFullYear(), monthIndex: mid.getMonth() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorMonday]);

  const weeks = useMemo<PlannerDay[][]>(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out: PlannerDay[][] = [];
    for (let w = 0; w < WEEKS_SHOWN; w++) {
      const row: PlannerDay[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(anchorMonday, w * 7 + d);
        row.push({
          date,
          year: date.getFullYear(),
          monthIndex: date.getMonth(),
          dayOfMonth: date.getDate(),
          dayName: DAY_NAMES[d],
          isToday: date.getTime() === today.getTime(),
          isFirstOfMonth: date.getDate() === 1
        });
      }
      out.push(row);
    }
    return out;
  }, [anchorMonday]);

  const rangeLabel = useMemo(() => {
    const first = weeks[0][0].date;
    const last = weeks[WEEKS_SHOWN - 1][6].date;
    const fmt = (d: Date) => `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3).toLowerCase()}`;
    return `${fmt(first)} – ${fmt(last)} ${last.getFullYear()}`;
  }, [weeks]);

  /* Index de cargas del cliente activo por (fecha + franja). */
  const schedulesBySlot = useMemo(() => {
    const map = new Map<string, ScheduledRoutine[]>();
    scheduledRoutines.forEach(s => {
      if (s.clientId !== activeClientId) return;
      const key = dayKey(s.year, s.monthIndex, s.dayOfMonth, slotOf(s));
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    });
    return map;
  }, [scheduledRoutines, activeClientId]);

  const routinesById = useMemo(() => {
    const map = new Map<string, WorkoutRoutine>();
    routines.forEach(r => map.set(r.id, r));
    return map;
  }, [routines]);

  const filteredRoutines = useMemo(() => routines.filter(r => {
    const matchesCat = filterCategory === 'all' || r.category === filterCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  }), [routines, filterCategory, searchTerm]);

  const selectedScheduled = selectedScheduledId
    ? scheduledRoutines.find(s => s.id === selectedScheduledId) ?? null
    : null;
  const selectedRoutine = selectedScheduled ? routinesById.get(selectedScheduled.routineId) ?? null : null;

  /* ------------------------------- acciones ------------------------------- */
  const newScheduled = (routineId: string, day: PlannerDay, slot: DaySlot): ScheduledRoutine => ({
    id: `s-${Date.now()}-${Math.floor(performance.now())}`,
    clientId: activeClientId,
    routineId,
    year: day.year,
    monthIndex: day.monthIndex,
    dayOfMonth: day.dayOfMonth,
    slot
  });

  const assignToSlot = (routineId: string, day: PlannerDay, slot: DaySlot) => {
    onUpdateScheduledRoutines([...scheduledRoutines, newScheduled(routineId, day, slot)]);
    setSlotMenu(null);
    showToast('Bloque agendado');
  };

  const updateRoutine = (updated: WorkoutRoutine) => {
    onUpdateRoutines(routines.map(r => r.id === updated.id ? updated : r));
  };

  const cloneScheduledBlock = (scheduled: ScheduledRoutine) => {
    const parent = routinesById.get(scheduled.routineId);
    if (!parent) return;
    const clonedRoutine: WorkoutRoutine = {
      ...structuredClone(parent),
      id: `r-clone-${Date.now()}`,
      title: `${parent.title} (Copia)`,
      createdAt: Date.now()
    };
    const clonedSched: ScheduledRoutine = {
      ...scheduled,
      id: `s-${Date.now()}-clone`,
      routineId: clonedRoutine.id
    };
    onUpdateRoutines([...routines, clonedRoutine]);
    onUpdateScheduledRoutines([...scheduledRoutines, clonedSched]);
    setSelectedScheduledId(clonedSched.id);
    showToast('Bloque clonado');
  };

  const removeScheduled = (scheduledId: string) => {
    onUpdateScheduledRoutines(scheduledRoutines.filter(s => s.id !== scheduledId));
    if (selectedScheduledId === scheduledId) setSelectedScheduledId(null);
  };

  const deleteRoutineEverywhere = (routineId: string) => {
    onUpdateRoutines(routines.filter(r => r.id !== routineId));
    onUpdateScheduledRoutines(scheduledRoutines.filter(s => s.routineId !== routineId));
    showToast('Pauta eliminada de la biblioteca');
  };

  const cloneRoutineInLibrary = (routine: WorkoutRoutine, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloned: WorkoutRoutine = {
      ...structuredClone(routine),
      id: `r-clone-${Date.now()}`,
      title: `${routine.title} (Copia)`,
      createdAt: Date.now()
    };
    onUpdateRoutines([...routines, cloned]);
    showToast('Pauta clonada');
  };

  const openCreator = (target: { day: PlannerDay; slot: DaySlot } | null) => {
    setCreatorTarget(target);
    setCreatorDraft({
      id: `r-${Date.now()}`,
      title: 'Nuevo bloque',
      category: 'fuerza',
      description: '',
      estimatedDuration: 45,
      createdAt: Date.now(),
      exercises: [
        { id: `ex-${Date.now()}-1`, name: 'Sentadilla Trasera con Barra', sets: 4, reps: '6-8', rest: '3 min', intensity: 'RPE 8' }
      ]
    });
    setSlotMenu(null);
    setIsCreatorOpen(true);
  };

  const saveCreator = () => {
    if (!creatorDraft) return;
    const title = creatorDraft.title.trim() || 'Bloque sin título';
    const finalRoutine: WorkoutRoutine = {
      ...creatorDraft,
      title,
      estimatedDuration: Math.max(0, Math.floor(Number(creatorDraft.estimatedDuration) || 0)),
      exercises: creatorDraft.exercises.map(ex => ({ ...ex, sets: Math.max(1, Math.floor(Number(ex.sets) || 1)) }))
    };
    onUpdateRoutines([...routines, finalRoutine]);
    if (creatorTarget) {
      onUpdateScheduledRoutines([...scheduledRoutines, newScheduled(finalRoutine.id, creatorTarget.day, creatorTarget.slot)]);
    }
    setIsCreatorOpen(false);
    setCreatorDraft(null);
    setCreatorTarget(null);
    showToast(`Bloque "${title}" creado`);
  };

  /* ------------------------------- dnd handlers ------------------------------- */
  const handleDndStart = (e: DragStartEvent) => {
    const data = e.active.data.current as CalendarDragData | undefined;
    if (data) setActiveDrag({ label: data.label, category: data.category });
  };

  const handleDndEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const data = e.active.data.current as CalendarDragData | undefined;
    const overId = e.over?.id;
    if (!data || overId == null) return;
    const parts = String(overId).split('|');
    if (parts.length !== 4) return;
    const [ys, ms, ds, slot] = parts;
    const target = { year: Number(ys), monthIndex: Number(ms), dayOfMonth: Number(ds), slot: slot as DaySlot };
    if (!Number.isFinite(target.year)) return;

    if (data.kind === 'new') {
      onUpdateScheduledRoutines([...scheduledRoutines, {
        id: `s-${Date.now()}`,
        clientId: activeClientId,
        routineId: data.routineId,
        year: target.year, monthIndex: target.monthIndex, dayOfMonth: target.dayOfMonth, slot: target.slot
      }]);
      showToast('Bloque agendado');
    } else {
      const current = scheduledRoutines.find(s => s.id === data.scheduledId);
      if (!current) return;
      const moved = current.year !== target.year || current.monthIndex !== target.monthIndex
        || current.dayOfMonth !== target.dayOfMonth || slotOf(current) !== target.slot;
      if (moved) {
        onUpdateScheduledRoutines(scheduledRoutines.map(s =>
          s.id === data.scheduledId
            ? { ...s, year: target.year, monthIndex: target.monthIndex, dayOfMonth: target.dayOfMonth, slot: target.slot }
            : s
        ));
        showToast(`Movido al ${target.dayOfMonth} (${target.slot.toUpperCase()})`);
      }
    }
  };

  /* ------------------------------- stats ------------------------------- */
  const windowStats = useMemo(() => {
    let blocks = 0, time = 0, series = 0;
    weeks.flat().forEach(day => {
      SLOTS.forEach(slot => {
        const list = schedulesBySlot.get(dayKey(day.year, day.monthIndex, day.dayOfMonth, slot)) ?? [];
        list.forEach(s => {
          const parent = routinesById.get(s.routineId);
          if (!parent) return;
          blocks += 1;
          time += parent.estimatedDuration;
          parent.exercises.forEach(ex => { series += Number(ex.sets || 0); });
        });
      });
    });
    return { blocks, time, series };
  }, [weeks, schedulesBySlot, routinesById]);

  /* cerrar popovers de slot al hacer click fuera */
  useEffect(() => {
    if (!slotMenu) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-slot-pop]')) setSlotMenu(null);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [slotMenu]);

  return (
    <DndContext
      sensors={dndSensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDndStart}
      onDragEnd={handleDndEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* ----------------------------- PALETA ----------------------------- */}
        <aside className="xl:col-span-1 space-y-5">
          <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-sans font-bold text-xs text-white tracking-wider uppercase flex items-center gap-2">
                <Zap className="text-[#5D36FF]" size={15} aria-hidden="true" /> Bloques
              </h2>
              <button
                onClick={() => openCreator(null)}
                className="px-3 py-1 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[9px] font-bold uppercase transition"
              >
                + Crear
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none" size={12} aria-hidden="true" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar bloque..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 font-mono text-[11px] text-white focus:outline-none focus:border-[#5D36FF] transition"
              />
            </div>

            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtro por tipo">
              <button
                role="tab" aria-selected={filterCategory === 'all'}
                onClick={() => setFilterCategory('all')}
                className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded border transition ${
                  filterCategory === 'all' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >Todos</button>
              {(Object.keys(CATEGORY_CONFIG) as WorkoutCategory[]).map(cat => (
                <button
                  key={cat} role="tab" aria-selected={filterCategory === cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded border transition ${
                    filterCategory === cat
                      ? `${CATEGORY_CONFIG[cat].bg} ${CATEGORY_CONFIG[cat].border} ${CATEGORY_CONFIG[cat].color} font-bold`
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >{CATEGORY_CONFIG[cat].short}</button>
              ))}
            </div>

            <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
              Arrastra un bloque a la franja <strong className="text-zinc-300">AM</strong> o <strong className="text-zinc-300">PM</strong> de cualquier día. Haz clic en un bloque ya puesto para editar sus parámetros.
            </p>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              <AnimatePresence mode="popLayout">
                {filteredRoutines.map(r => {
                  const config = CATEGORY_CONFIG[r.category];
                  return (
                    <motion.div key={r.id} layout>
                      <DragArea
                        id={`new-${r.id}`}
                        data={{ kind: 'new', routineId: r.id, label: r.title, category: r.category }}
                        className="relative group rounded-lg overflow-hidden bg-zinc-950/70 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition"
                      >
                        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.brick}`} aria-hidden="true" />
                        <div className="pl-3.5 pr-2 py-2.5">
                          <div className="flex items-start justify-between gap-1">
                            <span className={`inline-block px-1.5 py-0.5 rounded font-mono text-[7px] uppercase tracking-wider font-extrabold ${config.bg} ${config.color} ${config.border} border`}>
                              {config.short}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={(e) => cloneRoutineInLibrary(r, e)} title="Clonar" aria-label="Clonar bloque" className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-teal-400">
                                <Copy size={10} aria-hidden="true" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteRoutineEverywhere(r.id); }} title="Eliminar" aria-label="Eliminar bloque" className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400">
                                <Trash2 size={10} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                          <h3 className="text-[11px] font-bold text-slate-200 mt-1.5 line-clamp-1">{r.title}</h3>
                          <div className="flex items-center gap-1.5 font-mono text-[8px] text-zinc-500 mt-1">
                            <Clock size={8} aria-hidden="true" /> {r.estimatedDuration}m
                            <span aria-hidden="true">•</span>
                            <Dumbbell size={8} aria-hidden="true" /> {r.exercises.length} ej.
                          </div>
                        </div>
                      </DragArea>
                    </motion.div>
                  );
                })}
                {filteredRoutines.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 font-mono text-[10px] uppercase">Sin bloques. Crea uno.</div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* diagnóstico de la ventana de 5 semanas */}
          <div className="p-4 bg-zinc-950/90 border border-zinc-800/80 rounded-xl font-mono text-[10px] space-y-3">
            <p className="text-[9px] uppercase text-zinc-500 font-extrabold border-b border-zinc-900 pb-2">
              Carga · 5 semanas
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Bloques" value={`${windowStats.blocks}`} />
              <Stat label="Tiempo" value={`${windowStats.time}m`} accent />
              <Stat label="Series" value={`${windowStats.series}`} />
            </div>
          </div>
        </aside>

        {/* ----------------------------- PLANIFICADOR ----------------------------- */}
        <section className="xl:col-span-3 space-y-4">
          <div className="bg-[#121214] border border-zinc-800 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[#5D36FF]"><LayoutGrid size={16} aria-hidden="true" /></div>
              <div>
                <p className="font-mono text-[9px] text-zinc-500 uppercase">Planificador · {monthLabel(viewedMonth)}</p>
                <h2 className="text-white font-sans font-bold text-sm uppercase tracking-wide">{rangeLabel}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAnchorMonday(m => addDays(m, -7))} aria-label="Semana anterior" className="p-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded text-zinc-400 hover:text-white transition">
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <button onClick={() => setAnchorMonday(startOfWeekMonday(new Date()))} className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded font-mono text-[8px] uppercase font-bold text-zinc-400 hover:text-white transition">
                Hoy
              </button>
              <button onClick={() => setAnchorMonday(m => addDays(m, 7))} aria-label="Semana siguiente" className="p-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded text-zinc-400 hover:text-white transition">
                <ChevronRight size={14} aria-hidden="true" />
              </button>
              <span className="w-px h-5 bg-zinc-800 mx-1" aria-hidden="true" />
              <TemplatesPanel
                templates={templates}
                routines={routines}
                scheduledRoutines={scheduledRoutines}
                activeClientId={activeClientId}
                viewedMonth={viewedMonth}
                onUpdateTemplates={onUpdateTemplates}
                onUpdateScheduled={onUpdateScheduledRoutines}
              />
            </div>
          </div>

          {/* rejilla 5 semanas × 7 días, cada día AM/PM */}
          <div className="space-y-3">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="bg-[#121214] border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-zinc-900/70 flex items-center gap-3">
                  <span className="font-mono text-[9px] font-extrabold text-[#5D36FF] bg-[#5D36FF]/10 px-2 py-0.5 rounded border border-[#5D36FF]/20">
                    SEM {wIdx + 1}
                  </span>
                  <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-wide">
                    {week[0].dayOfMonth} {MONTH_NAMES[week[0].monthIndex].slice(0, 3)} – {week[6].dayOfMonth} {MONTH_NAMES[week[6].monthIndex].slice(0, 3)}
                  </span>
                </div>
                <div className="p-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {week.map(day => (
                    <DayColumn
                      key={`${day.year}-${day.monthIndex}-${day.dayOfMonth}`}
                      day={day}
                      schedulesBySlot={schedulesBySlot}
                      routinesById={routinesById}
                      routines={routines}
                      slotMenu={slotMenu}
                      onToggleSlotMenu={(id) => setSlotMenu(prev => prev === id ? null : id)}
                      onAssign={assignToSlot}
                      onCreateInSlot={(d, s) => openCreator({ day: d, slot: s })}
                      onSelect={setSelectedScheduledId}
                      onRemove={removeScheduled}
                      selectedScheduledId={selectedScheduledId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* leyenda de tipos */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
            {(Object.keys(CATEGORY_CONFIG) as WorkoutCategory[]).map(cat => (
              <span key={cat} className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wider text-zinc-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${CATEGORY_CONFIG[cat].brick}`} aria-hidden="true" />
                {CATEGORY_CONFIG[cat].label}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* ----------------------------- PANEL LATERAL DE EDICIÓN ----------------------------- */}
      <AnimatePresence>
        {selectedScheduled && selectedRoutine && (
          <BlockSidePanel
            routine={selectedRoutine}
            scheduled={selectedScheduled}
            availableEquipment={activeClientEquipment}
            onChangeRoutine={updateRoutine}
            onClone={() => cloneScheduledBlock(selectedScheduled)}
            onRemoveFromDay={() => removeScheduled(selectedScheduled.id)}
            onClose={() => setSelectedScheduledId(null)}
          />
        )}
      </AnimatePresence>

      {/* ----------------------------- MODAL DE CREACIÓN ----------------------------- */}
      <AnimatePresence>
        {isCreatorOpen && creatorDraft && (
          <CreatorModal
            routine={creatorDraft}
            setRoutine={setCreatorDraft}
            availableEquipment={activeClientEquipment}
            onSave={saveCreator}
            onClose={() => { setIsCreatorOpen(false); setCreatorDraft(null); setCreatorTarget(null); }}
          />
        )}
      </AnimatePresence>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[130] bg-[#121214] border border-[#5D36FF]/40 px-4 py-2 rounded-lg font-mono text-[11px] text-white shadow-2xl">
          {toast}
        </div>
      )}

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className={`px-3 py-2 rounded-lg text-white font-bold text-[11px] shadow-2xl max-w-[200px] truncate pointer-events-none ${CATEGORY_CONFIG[activeDrag.category].brick}`}>
            {activeDrag.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ----------------------------- columna de día ----------------------------- */
function DayColumn({
  day, schedulesBySlot, routinesById, routines, slotMenu, onToggleSlotMenu,
  onAssign, onCreateInSlot, onSelect, onRemove, selectedScheduledId
}: {
  day: PlannerDay;
  schedulesBySlot: Map<string, ScheduledRoutine[]>;
  routinesById: Map<string, WorkoutRoutine>;
  routines: WorkoutRoutine[];
  slotMenu: string | null;
  onToggleSlotMenu: (id: string) => void;
  onAssign: (routineId: string, day: PlannerDay, slot: DaySlot) => void;
  onCreateInSlot: (day: PlannerDay, slot: DaySlot) => void;
  onSelect: (scheduledId: string) => void;
  onRemove: (scheduledId: string) => void;
  selectedScheduledId: string | null;
}) {
  return (
    <div className={`flex flex-col rounded-lg border ${day.isToday ? 'border-[#5D36FF]/60 bg-[#5D36FF]/5' : 'border-zinc-800 bg-zinc-950/50'}`}>
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-900">
        <span className={`text-[8.5px] font-mono uppercase tracking-wide ${day.isToday ? 'text-[#5D36FF] font-black' : 'text-zinc-500 font-bold'}`}>
          {day.dayName.slice(0, 3)}
        </span>
        <span className={`font-mono text-[9px] font-bold leading-none ${day.isToday ? 'text-white bg-[#5D36FF] px-1 rounded' : 'text-zinc-400'}`}>
          {String(day.dayOfMonth).padStart(2, '0')}{day.isFirstOfMonth ? ` ${MONTH_NAMES[day.monthIndex].slice(0, 3).toLowerCase()}` : ''}
        </span>
      </div>
      {SLOTS.map(slot => {
        const id = dayKey(day.year, day.monthIndex, day.dayOfMonth, slot);
        const dropId = `${day.year}|${day.monthIndex}|${day.dayOfMonth}|${slot}`;
        const list = schedulesBySlot.get(id) ?? [];
        const menuId = `${id}-menu`;
        return (
          <DroppableSlot
            key={slot}
            id={dropId}
            baseClassName={`flex flex-col gap-1 p-1.5 min-h-[78px] border-b last:border-b-0 border-zinc-900/70 transition ${slot === 'pm' ? 'bg-zinc-950/30' : ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[7px] font-mono uppercase tracking-wider text-zinc-600">
                {slot === 'am' ? <Sun size={8} aria-hidden="true" /> : <Moon size={8} aria-hidden="true" />}
                {slot}
              </span>
              <div className="relative" data-slot-pop>
                <button
                  onClick={() => onToggleSlotMenu(menuId)}
                  aria-haspopup="dialog"
                  aria-expanded={slotMenu === menuId}
                  className="p-0.5 text-zinc-600 hover:text-[#5D36FF] transition"
                  aria-label={`Añadir bloque a ${slot} del ${day.dayOfMonth}`}
                >
                  <Plus size={11} aria-hidden="true" />
                </button>
                {slotMenu === menuId && (
                  <div role="dialog" className="absolute right-0 top-5 z-50 bg-[#121214] border border-zinc-800 rounded-lg p-2 shadow-2xl min-w-[150px] text-left space-y-1">
                    <div className="text-[7px] font-mono uppercase text-zinc-500 pb-1 border-b border-zinc-900">Asignar bloque</div>
                    <div className="max-h-[140px] overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                      {routines.length === 0 && <p className="text-zinc-600 text-[9px] py-2 text-center">Sin bloques</p>}
                      {routines.map(r => (
                        <button
                          key={r.id}
                          onClick={() => onAssign(r.id, day, slot)}
                          className="w-full flex items-center gap-1.5 text-left p-1 text-[9px] text-zinc-300 hover:bg-[#5D36FF]/10 hover:text-[#5D36FF] rounded transition truncate"
                        >
                          <span className={`w-1.5 h-1.5 rounded-sm shrink-0 ${CATEGORY_CONFIG[r.category].brick}`} aria-hidden="true" />
                          <span className="truncate">{r.title}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => onCreateInSlot(day, slot)}
                      className="w-full text-center py-1 mt-1 font-mono text-[7px] uppercase bg-[#5D36FF]/10 text-[#5D36FF] rounded hover:bg-[#5D36FF] hover:text-white transition"
                    >+ Crear nuevo</button>
                  </div>
                )}
              </div>
            </div>

            {list.length === 0 ? (
              <div className="flex-1 min-h-[36px] rounded border border-dashed border-zinc-900/60" aria-hidden="true" />
            ) : (
              list.map(sch => {
                const parent = routinesById.get(sch.routineId);
                if (!parent) return null;
                return (
                  <Brick
                    key={sch.id}
                    scheduled={sch}
                    routine={parent}
                    selected={selectedScheduledId === sch.id}
                    onSelect={() => onSelect(sch.id)}
                    onRemove={() => onRemove(sch.id)}
                  />
                );
              })
            )}
          </DroppableSlot>
        );
      })}
    </div>
  );
}

/* ----------------------------- ladrillo (bloque agendado) ----------------------------- */
function Brick({ scheduled, routine, selected, onSelect, onRemove }: {
  scheduled: ScheduledRoutine;
  routine: WorkoutRoutine;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const config = CATEGORY_CONFIG[routine.category];
  return (
    <DragArea
      id={`move-${scheduled.id}`}
      data={{ kind: 'move', scheduledId: scheduled.id, label: routine.title, category: routine.category }}
      onClick={onSelect}
      className={`relative group rounded overflow-hidden border ${selected ? 'border-white ring-1 ring-white/40' : config.border} shadow-sm`}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${config.brick}`} aria-hidden="true" />
      <div className="pl-2 pr-1 py-1 bg-zinc-900">
        <h5 className="text-[9.5px] font-bold text-white line-clamp-2 leading-snug">{routine.title}</h5>
        <div className="text-[7.5px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
          <span className={config.color}>{config.short}</span>
          <span aria-hidden="true">•</span>
          <span>{routine.estimatedDuration}m</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Quitar bloque del día"
          className="absolute top-0.5 right-0.5 p-0.5 bg-zinc-900/90 rounded text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
        >
          <X size={9} aria-hidden="true" />
        </button>
      </div>
    </DragArea>
  );
}

/* ----------------------------- panel lateral de edición ----------------------------- */
function BlockSidePanel({
  routine, scheduled, availableEquipment, onChangeRoutine, onClone, onRemoveFromDay, onClose
}: {
  routine: WorkoutRoutine;
  scheduled: ScheduledRoutine;
  availableEquipment: string[];
  onChangeRoutine: (r: WorkoutRoutine) => void;
  onClone: () => void;
  onRemoveFromDay: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const dateLabel = `${String(scheduled.dayOfMonth).padStart(2, '0')} ${MONTH_NAMES[scheduled.monthIndex].slice(0, 3)} · ${slotOf(scheduled).toUpperCase()}`;

  return (
    <motion.aside
      initial={{ x: 420, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 420, opacity: 0 }}
      transition={{ type: 'tween', duration: 0.2 }}
      role="dialog"
      aria-label="Editar bloque"
      className="fixed top-0 right-0 bottom-0 z-[120] w-full sm:w-[420px] bg-[#0d0d0f] border-l border-zinc-800 shadow-2xl flex flex-col"
    >
      <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Briefcase className="text-[#5D36FF] shrink-0" size={16} aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="font-sans font-bold text-xs text-white uppercase tracking-wider truncate">Editar bloque</h3>
            <p className="font-mono text-[8px] text-[#5D36FF]">{dateLabel}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Cerrar panel" className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><X size={16} aria-hidden="true" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <RoutineParamsEditor routine={routine} setRoutine={onChangeRoutine} availableEquipment={availableEquipment} />
        <p className="mt-4 text-[9px] font-mono text-zinc-600 leading-relaxed">
          Editas la pauta: los cambios afectan a todas sus instancias agendadas. Usa <strong className="text-zinc-400">Clonar</strong> para ajustar solo este día.
        </p>
      </div>

      <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
        <button onClick={onClone} className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-teal-500/50 hover:text-teal-300 text-zinc-300 rounded font-mono text-[9px] uppercase font-bold transition flex items-center justify-center gap-1.5">
          <Copy size={11} aria-hidden="true" /> Clonar
        </button>
        <button onClick={onRemoveFromDay} className="flex-1 px-3 py-2 bg-red-950/20 border border-red-800/40 hover:border-red-600 text-red-300 hover:text-white rounded font-mono text-[9px] uppercase font-bold transition flex items-center justify-center gap-1.5">
          <Trash2 size={11} aria-hidden="true" /> Quitar del día
        </button>
      </div>
    </motion.aside>
  );
}

/* ----------------------------- modal de creación ----------------------------- */
function CreatorModal({ routine, setRoutine, availableEquipment, onSave, onClose }: {
  routine: WorkoutRoutine;
  setRoutine: (r: WorkoutRoutine) => void;
  availableEquipment: string[];
  onSave: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>('input, select, textarea, button');
    first?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="creator_title"
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="text-[#5D36FF]" size={16} aria-hidden="true" />
            <h3 id="creator_title" className="font-sans font-bold text-xs text-white uppercase tracking-wider">Nuevo bloque de entrenamiento</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 hover:bg-zinc-800 rounded text-zinc-400"><X size={16} aria-hidden="true" /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 text-left">
          <RoutineParamsEditor routine={routine} setRoutine={setRoutine} availableEquipment={availableEquipment} />
        </div>
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end gap-2 font-mono text-[8px]">
          <button onClick={onClose} className="p-1.5 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded font-bold uppercase">Cancelar</button>
          <button onClick={onSave} className="p-1.5 px-5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-bold uppercase flex items-center gap-1">
            <Check size={12} aria-hidden="true" /> Crear bloque
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ----------------------------- editor de parámetros (compartido) ----------------------------- */
function RoutineParamsEditor({ routine, setRoutine, availableEquipment }: {
  routine: WorkoutRoutine;
  setRoutine: (r: WorkoutRoutine) => void;
  availableEquipment: string[];
}) {
  const [showNscaPicker, setShowNscaPicker] = useState(false);

  const updateExercise = (idx: number, patch: Partial<Exercise>) => {
    setRoutine({ ...routine, exercises: routine.exercises.map((ex, i) => i === idx ? { ...ex, ...patch } : ex) });
  };

  const addNscaExercise = (nsca: import('../lib/nsca').NscaExercise) => {
    const endurance = buildEnduranceParamsFromNsca(nsca);
    const newEx: Exercise = endurance
      ? { id: `ex-${Date.now()}-${nsca.id}`, name: nsca.name, sets: 1, reps: '—', rest: '—', intensity: nsca.technique?.intensidad ?? 'Ver bloque', notes: nsca.englishName, nscaId: nsca.id, endurance }
      : { id: `ex-${Date.now()}-${nsca.id}`, name: nsca.name, sets: 4, reps: '8-10', rest: '90s', intensity: 'RPE 8', notes: nsca.englishName, nscaId: nsca.id };
    setRoutine({ ...routine, exercises: [...routine.exercises, newEx] });
  };

  const addBlankEnduranceBlock = () => {
    setRoutine({ ...routine, exercises: [...routine.exercises, {
      id: `ex-${Date.now()}-end`, name: 'Nuevo bloque de cardio / endurance', sets: 1, reps: '—', rest: '—', intensity: 'Z2',
      endurance: { modality: 'run', protocol: 'continuous', zone: 'Z2' }
    }] });
  };

  const toggleEndurance = (idx: number) => {
    const ex = routine.exercises[idx];
    if (ex.endurance) {
      const { endurance: _drop, ...rest } = ex;
      void _drop;
      updateExercise(idx, { ...rest, endurance: undefined } as Partial<Exercise>);
    } else {
      updateExercise(idx, { endurance: { modality: 'run', protocol: 'continuous', zone: 'Z2' } });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModalField label="Título del bloque">
          <input
            type="text" value={routine.title}
            onChange={e => setRoutine({ ...routine, title: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-sans text-xs focus:outline-none focus:border-[#5D36FF] transition"
            placeholder="e.g. Piernas Fuerza"
          />
        </ModalField>
        <ModalField label="Tipo de estímulo">
          <select
            value={routine.category}
            onChange={e => setRoutine({ ...routine, category: e.target.value as WorkoutCategory })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 text-xs py-1 text-white focus:outline-none focus:border-[#5D36FF] transition"
          >
            <option value="fuerza">Fuerza Máxima</option>
            <option value="potencia">Potencia Explosiva</option>
            <option value="hipertrofia">Hipertrofia Estructural</option>
            <option value="aerobico">Capacidad Aeróbica (HIIT/MetCon)</option>
            <option value="resistencia">Resistencia / Endurance</option>
            <option value="cross_training">Cross-Training</option>
          </select>
        </ModalField>
        <ModalField label="Duración (min)">
          <input
            type="number" min={5} max={240} value={routine.estimatedDuration}
            onChange={e => setRoutine({ ...routine, estimatedDuration: Math.max(0, Number(e.target.value) || 0) })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#5D36FF]"
          />
        </ModalField>
        <div className="sm:col-span-2">
          <ModalField label="Descripción">
            <textarea
              value={routine.description} onChange={e => setRoutine({ ...routine, description: e.target.value })}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none resize-none"
            />
          </ModalField>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5 flex-wrap gap-2">
          <span className="font-sans font-extrabold text-[10px] text-white uppercase tracking-wider">
            Ejercicios ({routine.exercises.length})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNscaPicker(s => !s)} aria-pressed={showNscaPicker}
              className={`px-2 py-0.5 border rounded text-[8px] font-mono uppercase font-bold transition flex items-center gap-1 ${showNscaPicker ? 'bg-[#5D36FF] border-[#5D36FF] text-white' : 'bg-zinc-900 border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-400 hover:text-white'}`}
            ><Library size={10} aria-hidden="true" /> NSCA</button>
            <button
              onClick={addBlankEnduranceBlock}
              className="px-2 py-0.5 bg-[#F59E0B]/10 border border-[#F59E0B]/40 hover:bg-[#F59E0B]/20 text-[#F59E0B] rounded text-[8px] font-mono uppercase font-bold transition flex items-center gap-1"
            ><Plus size={10} aria-hidden="true" /> Cardio</button>
            <button
              onClick={() => setRoutine({ ...routine, exercises: [...routine.exercises, { id: `ex-${Date.now()}`, name: 'Nuevo Ejercicio', sets: 3, reps: '10', rest: '90s', intensity: 'RPE 8' }] })}
              className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded text-[8px] font-mono uppercase text-zinc-400 font-bold transition flex items-center gap-1"
            ><Plus size={10} aria-hidden="true" /> Manual</button>
          </div>
        </div>

        {showNscaPicker && (
          <NscaPicker availableEquipment={availableEquipment} onPick={addNscaExercise} onClose={() => setShowNscaPicker(false)} />
        )}

        <div className="space-y-2">
          {routine.exercises.map((ex, exIdx) => {
            const nscaRef = findNscaExerciseById(ex.nscaId) ?? NSCA_EXERCISES.find(n => n.name === ex.name || n.englishName === ex.name);
            const fallbackPattern = patternFromName(ex.name);
            const removeBtn = (
              <button
                onClick={() => { if (routine.exercises.length === 1) return; setRoutine({ ...routine, exercises: routine.exercises.filter((_, idx) => idx !== exIdx) }); }}
                aria-label="Eliminar ejercicio" disabled={routine.exercises.length === 1}
                className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed self-start"
              ><X size={12} aria-hidden="true" /></button>
            );

            if (ex.endurance) {
              return (
                <div key={ex.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <EnduranceFields exercise={ex} endurance={ex.endurance} onChange={(patch) => updateExercise(exIdx, patch)} onRemoveEndurance={() => toggleEndurance(exIdx)} />
                  </div>
                  {removeBtn}
                </div>
              );
            }

            return (
              <div key={ex.id} className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-900 flex flex-wrap gap-2 items-end">
                <div className="shrink-0 w-9 h-9 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-[#5D36FF] self-start">
                  {nscaRef ? <MovementIconForExercise exercise={nscaRef} size={28} /> : <MovementIcon pattern={fallbackPattern} size={28} />}
                </div>
                <div className="flex-1 min-w-[120px] space-y-1">
                  <label className="font-mono text-[7.5px] text-zinc-500 uppercase flex items-center justify-between">
                    <span>Ejercicio {exIdx + 1}</span>
                    <button type="button" onClick={() => toggleEndurance(exIdx)} className="text-[#F59E0B] hover:underline normal-case">→ Cardio</button>
                  </label>
                  <input type="text" value={ex.name} onChange={e => updateExercise(exIdx, { name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs" />
                </div>
                <div className="w-12 space-y-1">
                  <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Sets</label>
                  <input type="number" min={1} max={20} value={ex.sets} onChange={e => updateExercise(exIdx, { sets: Math.max(1, Number(e.target.value) || 1) })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                </div>
                <div className="w-14 space-y-1">
                  <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Reps</label>
                  <input type="text" value={ex.reps} onChange={e => updateExercise(exIdx, { reps: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                </div>
                <div className="w-16 space-y-1">
                  <label className="font-mono text-[7.5px] text-zinc-500 uppercase">RPE/Carga</label>
                  <input type="text" value={ex.intensity} onChange={e => updateExercise(exIdx, { intensity: e.target.value })} className="w-full bg-purple-950/20 border border-[#5D36FF]/20 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                </div>
                <div className="w-14 space-y-1">
                  <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Rest</label>
                  <input type="text" value={ex.rest} onChange={e => updateExercise(exIdx, { rest: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                </div>
                <div className="flex-1 min-w-[90px] space-y-1">
                  <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Notas</label>
                  <input type="text" value={ex.notes || ''} onChange={e => updateExercise(exIdx, { notes: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs" placeholder="Ej. excéntrica controlada" />
                </div>
                {removeBtn}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-[9px] text-zinc-400 uppercase">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-2 bg-zinc-900/60 rounded border border-zinc-900 text-center">
      <span className="block text-[8px] text-zinc-500 uppercase leading-none">{label}</span>
      <span className={`text-sm font-sans font-black ${accent ? 'text-[#5D36FF]' : 'text-white'}`}>{value}</span>
    </div>
  );
}

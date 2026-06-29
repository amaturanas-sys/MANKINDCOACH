/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Copy,
  Edit3,
  ArrowRight,
  Dumbbell,
  Clock,
  Zap,
  Search,
  X,
  Check,
  Briefcase,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { MicrocycleTemplate, MonthRef, ScheduledRoutine, WorkoutRoutine, WorkoutCategory, Exercise } from '../types';
import { DAY_NAMES, monthLabel, sameMonth, shiftMonth } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext, DragOverlay, MouseSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, useDraggable, useDroppable, pointerWithin,
  type DragStartEvent, type DragEndEvent
} from '@dnd-kit/core';
import TemplatesPanel from './TemplatesPanel';
import NscaPicker from './NscaPicker';
import EnduranceFields from './EnduranceFields';
import { Library } from 'lucide-react';
import { findNscaExerciseById, NSCA_EXERCISES, buildEnduranceParamsFromNsca, isEnduranceExercise } from '../lib/nsca';
import { MovementIconForExercise, MovementIcon, patternForExercise, patternFromName } from '../lib/movementIcons';

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

const CATEGORY_CONFIG: Record<WorkoutCategory, { label: string; color: string; bg: string; border: string }> = {
  fuerza: { label: 'Fuerza Máxima', color: 'text-[#5D36FF]', bg: 'bg-[#5D36FF]/10', border: 'border-[#5D36FF]/30' },
  potencia: { label: 'Potencia Explosiva', color: 'text-[#00D8F6]', bg: 'bg-[#00D8F6]/10', border: 'border-[#00D8F6]/30' },
  hipertrofia: { label: 'Hipertrofia Estructural', color: 'text-[#D800F6]', bg: 'bg-[#D800F6]/10', border: 'border-[#D800F6]/30' },
  aerobico: { label: 'Capacidad Aeróbica', color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', border: 'border-[#10B981]/30' },
  resistencia: { label: 'Resistencia (endurance)', color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10', border: 'border-[#F59E0B]/30' },
  cross_training: { label: 'Cross-Training', color: 'text-[#EC4899]', bg: 'bg-[#EC4899]/10', border: 'border-[#EC4899]/30' }
};

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  dayName: string;
  dayIndex: number;
  isToday: boolean;
  isPadding: boolean;
}

interface CalendarWeek {
  weekNumber: number;
  title: string;
  focus: string;
  days: CalendarDay[];
}

const weekTitleFor = (n: number) => `Semana ${n}`;

function buildCalendarWeeks(month: MonthRef): CalendarWeek[] {
  const firstOfMonth = new Date(month.year, month.monthIndex, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = lunes
  const startDate = new Date(month.year, month.monthIndex, 1 - startWeekday);
  const today = new Date();
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  const weeksNeeded = Math.ceil((startWeekday + daysInMonth) / 7);

  const weeks: CalendarWeek[] = [];
  for (let w = 0; w < weeksNeeded; w++) {
    const days: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const current = new Date(startDate);
      current.setDate(startDate.getDate() + w * 7 + d);
      const isPadding = current.getMonth() !== month.monthIndex || current.getFullYear() !== month.year;
      const isToday = current.toDateString() === today.toDateString();
      days.push({
        date: current,
        dayOfMonth: current.getDate(),
        dayName: DAY_NAMES[d],
        dayIndex: d,
        isToday,
        isPadding
      });
    }
    weeks.push({
      weekNumber: w + 1,
      title: weekTitleFor(w + 1),
      focus: '',
      days
    });
  }
  return weeks;
}

/* ----------------------------------------------------------------------- *
 * Drag & drop (dnd-kit): basado en punteros → funciona con ratón, dedo
 * (Android/tablet) y teclado. Reemplaza el DnD HTML5 (que no era táctil).
 * ----------------------------------------------------------------------- */
type CalendarDragData =
  | { kind: 'new'; routineId: string; label: string }
  | { kind: 'move'; scheduledId: string; label: string };

/** Zona arrastrable (tarjeta de paleta o carga agendada). */
function DragArea({ id, data, className, children }: {
  id: string;
  data: CalendarDragData;
  className?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id, data });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${className ?? ''} cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      {children}
    </div>
  );
}

/** Celda de día como zona soltable; resalta cuando hay algo encima. */
function DroppableDay({ dayOfMonth, disabled, baseClassName, children }: {
  dayOfMonth: number;
  disabled: boolean;
  baseClassName: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: String(dayOfMonth), disabled });
  return (
    <div
      ref={setNodeRef}
      className={`${baseClassName} ${isOver && !disabled ? 'border-[#5D36FF] border-dashed bg-[#5D36FF]/10 scale-[1.02]' : ''}`}
    >
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
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true });
  const [filterCategory, setFilterCategory] = useState<WorkoutCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  /** Etiqueta del elemento que se está arrastrando (para el DragOverlay). */
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const dndSensors = useSensors(
    /* Ratón: arranca tras 8px de movimiento (un clic no inicia arrastre). */
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    /* Táctil: long-press de 180ms → permite seguir haciendo scroll con el dedo. */
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null);
  const [scheduleOnSaveDay, setScheduleOnSaveDay] = useState<number | null>(null);
  const [quickAssignOpen, setQuickAssignOpen] = useState<string | null>(null);
  const [dayAddMenuOpen, setDayAddMenuOpen] = useState<number | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const calendarWeeks = useMemo(() => buildCalendarWeeks(viewedMonth), [viewedMonth]);

  // Indexar SOLO scheduled del cliente activo y del mes visible.
  const schedulesByDay = useMemo(() => {
    const map = new Map<number, ScheduledRoutine[]>();
    scheduledRoutines.forEach(s => {
      if (s.clientId !== activeClientId) return;
      if (s.year !== viewedMonth.year || s.monthIndex !== viewedMonth.monthIndex) return;
      const list = map.get(s.dayOfMonth) ?? [];
      list.push(s);
      map.set(s.dayOfMonth, list);
    });
    return map;
  }, [scheduledRoutines, viewedMonth, activeClientId]);

  const routinesById = useMemo(() => {
    const map = new Map<string, WorkoutRoutine>();
    routines.forEach(r => map.set(r.id, r));
    return map;
  }, [routines]);

  // Conteo de meses con asignaciones del cliente activo.
  const monthsWithSchedules = useMemo(() => {
    const set = new Set<string>();
    scheduledRoutines.forEach(s => {
      if (s.clientId !== activeClientId) return;
      set.add(`${s.year}-${s.monthIndex}`);
    });
    return set;
  }, [scheduledRoutines, activeClientId]);

  useEffect(() => {
    if (!isEditorOpen && !quickAssignOpen && dayAddMenuOpen === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditorOpen(false);
        setEditingRoutine(null);
        setQuickAssignOpen(null);
        setDayAddMenuOpen(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditorOpen, quickAssignOpen, dayAddMenuOpen]);

  useEffect(() => {
    if (quickAssignOpen === null && dayAddMenuOpen === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-popover]')) {
        setQuickAssignOpen(null);
        setDayAddMenuOpen(null);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [quickAssignOpen, dayAddMenuOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const goToToday = () => {
    const now = new Date();
    onChangeViewedMonth({ year: now.getFullYear(), monthIndex: now.getMonth() });
  };

  const newScheduledFor = (routineId: string, dayOfMonth: number, idPrefix: string): ScheduledRoutine => ({
    id: `${idPrefix}-${Date.now()}`,
    clientId: activeClientId,
    routineId,
    year: viewedMonth.year,
    monthIndex: viewedMonth.monthIndex,
    dayOfMonth
  });

  const handleOpenCreator = (autoScheduleDay: number | null = null) => {
    setScheduleOnSaveDay(autoScheduleDay);
    setEditingRoutine({
      id: `r-${Date.now()}`,
      title: 'Pauta Técnica de Estímulo',
      category: 'fuerza',
      description: 'Variables biomecánicas autoreguladas enfocadas en neuromuscular.',
      estimatedDuration: 45,
      createdAt: Date.now(),
      exercises: [
        { id: `ex-${Date.now()}-1`, name: 'Sentadilla Trasera con Barra profunda', sets: 4, reps: '6-8', rest: '3 min', intensity: 'RPE 8' }
      ]
    });
    setDayAddMenuOpen(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditor = (routine: WorkoutRoutine) => {
    setEditingRoutine(structuredClone(routine));
    setIsEditorOpen(true);
  };

  const handleSaveRoutine = () => {
    if (!editingRoutine) return;
    const titleTrimmed = editingRoutine.title.trim() === '' ? 'Pauta Sin Título' : editingRoutine.title.trim();
    const sanitizedExercises = editingRoutine.exercises.map(ex => ({
      ...ex,
      sets: Math.max(1, Math.floor(Number(ex.sets) || 1))
    }));
    const finalRoutine: WorkoutRoutine = {
      ...editingRoutine,
      title: titleTrimmed,
      exercises: sanitizedExercises,
      estimatedDuration: Math.max(0, Math.floor(Number(editingRoutine.estimatedDuration) || 0))
    };

    const exists = routines.some(r => r.id === finalRoutine.id);
    const updated = exists
      ? routines.map(r => (r.id === finalRoutine.id ? finalRoutine : r))
      : [...routines, finalRoutine];
    onUpdateRoutines(updated);

    if (scheduleOnSaveDay !== null) {
      onUpdateScheduledRoutines([
        ...scheduledRoutines,
        newScheduledFor(finalRoutine.id, scheduleOnSaveDay, 's')
      ]);
      setScheduleOnSaveDay(null);
    }

    setIsEditorOpen(false);
    setEditingRoutine(null);
    showToast(`Pauta "${titleTrimmed}" guardada`);
  };

  const handleCloneRoutine = (routine: WorkoutRoutine, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloned: WorkoutRoutine = {
      ...structuredClone(routine),
      id: `r-clone-${Date.now()}`,
      title: `${routine.title} (Copia)`,
      createdAt: Date.now()
    };
    onUpdateRoutines([...routines, cloned]);
    showToast(`Pauta clonada: ${cloned.title}`);
  };

  const handleDeleteRoutine = (routineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateRoutines(routines.filter(r => r.id !== routineId));
    onUpdateScheduledRoutines(scheduledRoutines.filter(s => s.routineId !== routineId));
    showToast('Pauta eliminada');
  };

  const handleDndStart = (e: DragStartEvent) => {
    const data = e.active.data.current as CalendarDragData | undefined;
    setActiveDragLabel(data?.label ?? null);
  };

  const handleDndEnd = (e: DragEndEvent) => {
    setActiveDragLabel(null);
    const data = e.active.data.current as CalendarDragData | undefined;
    const overId = e.over?.id;
    if (!data || overId == null) return;
    const dayOfMonth = Number(overId);
    if (!Number.isFinite(dayOfMonth) || dayOfMonth <= 0) return;

    if (data.kind === 'new') {
      onUpdateScheduledRoutines([...scheduledRoutines, newScheduledFor(data.routineId, dayOfMonth, 's')]);
      showToast('Carga asignada');
    } else {
      /* Mover una carga ya agendada a otro día del mes en curso. */
      const current = scheduledRoutines.find(s => s.id === data.scheduledId);
      if (current && current.dayOfMonth !== dayOfMonth) {
        onUpdateScheduledRoutines(scheduledRoutines.map(s =>
          s.id === data.scheduledId
            ? { ...s, dayOfMonth, year: viewedMonth.year, monthIndex: viewedMonth.monthIndex }
            : s
        ));
        showToast(`Movida al día ${dayOfMonth}`);
      }
    }
  };

  const handleAssignClick = (routineId: string, dayOfMonth: number) => {
    onUpdateScheduledRoutines([...scheduledRoutines, newScheduledFor(routineId, dayOfMonth, 's')]);
    setQuickAssignOpen(null);
    showToast(`Asignado al día ${dayOfMonth}`);
  };

  const handleAddRoutineToDay = (routineId: string, dayOfMonth: number) => {
    onUpdateScheduledRoutines([...scheduledRoutines, newScheduledFor(routineId, dayOfMonth, 's')]);
    setDayAddMenuOpen(null);
  };

  const handleRemoveScheduled = (scheduledId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateScheduledRoutines(scheduledRoutines.filter(s => s.id !== scheduledId));
  };

  const filteredRoutines = useMemo(() => routines.filter(r => {
    const matchesCat = filterCategory === 'all' || r.category === filterCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term);
    return matchesCat && matchesSearch;
  }), [routines, filterCategory, searchTerm]);

  const getPeriodStats = (days: CalendarDay[]) => {
    let totalSeries = 0;
    let totalRoutinesCount = 0;
    let totalTime = 0;
    days.forEach(day => {
      if (day.isPadding) return;
      const list = schedulesByDay.get(day.dayOfMonth) ?? [];
      totalRoutinesCount += list.length;
      list.forEach(s => {
        const parent = routinesById.get(s.routineId);
        if (!parent) return;
        totalTime += parent.estimatedDuration;
        parent.exercises.forEach(ex => { totalSeries += Number(ex.sets || 0); });
      });
    });
    return { totalSeries, totalRoutinesCount, totalTime };
  };

  const totalMonthDays = useMemo(() => calendarWeeks.flatMap(w => w.days), [calendarWeeks]);
  const monthlyStats = getPeriodStats(totalMonthDays);

  const today = new Date();
  const isViewingCurrentMonth = sameMonth(viewedMonth, { year: today.getFullYear(), monthIndex: today.getMonth() });

  return (
    <DndContext
      sensors={dndSensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDndStart}
      onDragEnd={handleDndEnd}
      onDragCancel={() => setActiveDragLabel(null)}
    >
    <div id="calendar_tab_container" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div id="blueprint_column" className="xl:col-span-1 space-y-6">
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-xs text-white tracking-wider uppercase flex items-center gap-2">
              <Zap className="text-[#5D36FF]" size={16} aria-hidden="true" />
              Biblioteca de Pautas
            </h2>
            <button
              id="create_new_routine_btn"
              onClick={() => handleOpenCreator(null)}
              className="p-1 px-3 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[9px] font-bold uppercase transition"
            >
              + Crear
            </button>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-zinc-500 pointer-events-none" size={12} aria-hidden="true" />
              <label htmlFor="library_search" className="sr-only">Buscar pauta</label>
              <input
                id="library_search"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar pauta..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 font-mono text-[11px] text-white focus:outline-none focus:border-[#5D36FF] transition"
              />
            </div>

            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtro por categoría">
              <button
                role="tab"
                aria-selected={filterCategory === 'all'}
                onClick={() => setFilterCategory('all')}
                className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded border transition ${
                  filterCategory === 'all' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Todos
              </button>
              {(Object.keys(CATEGORY_CONFIG) as WorkoutCategory[]).map(cat => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={filterCategory === cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded border transition ${
                    filterCategory === cat
                      ? `${CATEGORY_CONFIG[cat].bg} ${CATEGORY_CONFIG[cat].border} ${CATEGORY_CONFIG[cat].color} font-bold`
                      : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">
            * Arrastra pautas al calendario, haz clic en <strong>+ Carga</strong> sobre un día, o usa el planificador rápido. Las asignaciones se guardan en el mes que estás viendo.
          </p>

          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {filteredRoutines.map(r => {
                const config = CATEGORY_CONFIG[r.category];
                return (
                  <motion.div
                    key={r.id}
                    layout
                    className="bg-zinc-950/70 hover:bg-zinc-900/80 border border-zinc-800/80 rounded-xl hover:border-zinc-700 transition duration-150 group"
                  >
                   <DragArea id={`new-${r.id}`} data={{ kind: 'new', routineId: r.id, label: r.title }} className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-mono text-[7px] uppercase tracking-wider font-extrabold ${config.bg} ${config.color} ${config.border} border`}>
                        {config.label}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                        <button onClick={(e) => handleCloneRoutine(r, e)} title="Clonar" aria-label="Clonar pauta" className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-teal-400">
                          <Copy size={10} aria-hidden="true" />
                        </button>
                        <button onClick={() => handleOpenEditor(r)} title="Editar" aria-label="Editar pauta" className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-[#5D36FF]">
                          <Edit3 size={10} aria-hidden="true" />
                        </button>
                        <button onClick={(e) => handleDeleteRoutine(r.id, e)} title="Eliminar" aria-label="Eliminar pauta" className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-400">
                          <Trash2 size={10} aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-[11px] font-bold text-slate-200 mt-1.5 line-clamp-1">{r.title}</h3>
                    <p className="text-[9px] text-zinc-500 line-clamp-2 mt-0.5 text-left">{r.description}</p>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-zinc-900">
                      <div className="flex items-center gap-1.5 font-mono text-[8px] text-zinc-400 flex-wrap">
                        <Clock size={8} aria-hidden="true" /> {r.estimatedDuration}m
                        <span aria-hidden="true">•</span>
                        <Dumbbell size={8} aria-hidden="true" /> {r.exercises.filter(e => !e.endurance).length} fza
                        {r.exercises.some(e => e.endurance) && (
                          <>
                            <span aria-hidden="true">•</span>
                            <span className="text-[#F59E0B] font-bold">
                              {r.exercises.filter(e => e.endurance).length} cardio
                            </span>
                          </>
                        )}
                      </div>

                      <div className="relative" data-popover>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickAssignOpen(quickAssignOpen === r.id ? null : r.id);
                          }}
                          aria-haspopup="dialog"
                          aria-expanded={quickAssignOpen === r.id}
                          className="p-1 px-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 rounded text-[#5D36FF] hover:text-white hover:bg-[#5D36FF]/20 flex items-center gap-1 font-mono text-[8px] uppercase font-bold transition"
                        >
                          Calendario <ArrowRight size={8} aria-hidden="true" />
                        </button>

                        {quickAssignOpen === r.id && (
                          <div role="dialog" aria-label="Planificación rápida" className="absolute left-0 xl:right-0 xl:left-auto bottom-6 z-50 bg-[#121214] border border-zinc-800 rounded-xl p-3 shadow-2xl min-w-[210px] space-y-2">
                            <div className="flex justify-between items-center pb-1.5 border-b border-zinc-900">
                              <span className="text-[8px] font-mono uppercase text-zinc-400 font-bold">Planificación Rápida</span>
                              <span className="text-[8px] font-mono text-white tracking-widest uppercase">{monthLabel(viewedMonth)}</span>
                            </div>

                            <div className="grid grid-cols-7 gap-0.5">
                              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                                <div key={i} className="text-[7px] font-bold text-zinc-600 text-center py-0.5">{d}</div>
                              ))}
                              {(() => {
                                const firstWeekday = (new Date(viewedMonth.year, viewedMonth.monthIndex, 1).getDay() + 6) % 7;
                                const daysInMonth = new Date(viewedMonth.year, viewedMonth.monthIndex + 1, 0).getDate();
                                return [
                                  ...Array.from({ length: firstWeekday }).map((_, idx) => (
                                    <div key={`pad-${idx}`} className="h-4 w-4" aria-hidden="true" />
                                  )),
                                  ...Array.from({ length: daysInMonth }, (_, idx) => {
                                    const dNo = idx + 1;
                                    const isScheduled = (schedulesByDay.get(dNo) ?? []).length > 0;
                                    return (
                                      <button
                                        key={dNo}
                                        onClick={() => handleAssignClick(r.id, dNo)}
                                        aria-label={`Asignar al ${dNo} de ${monthLabel(viewedMonth)}`}
                                        className="h-5 w-5 rounded text-[8px] flex flex-col items-center justify-center relative font-mono transition hover:bg-[#5D36FF] hover:text-white text-zinc-300 bg-zinc-900/60"
                                      >
                                        <span>{dNo}</span>
                                        {isScheduled && <span className="absolute bottom-[2px] w-[3px] h-[3px] bg-[#5D36FF] rounded-full" aria-hidden="true" />}
                                      </button>
                                    );
                                  })
                                ];
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                   </DragArea>
                  </motion.div>
                );
              })}
              {filteredRoutines.length === 0 && (
                <div className="text-center py-8 text-zinc-600 font-mono text-[10px] uppercase">
                  Sin resultados
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="p-4 bg-zinc-950/90 border border-zinc-800/80 rounded-xl font-mono text-[10px] space-y-4">
          <p className="text-[9px] uppercase text-zinc-500 font-extrabold border-b border-zinc-900 pb-2 flex justify-between items-center">
            <span>Diagnóstico del Macrociclo</span>
            <span className="text-[#5D36FF]">{monthLabel(viewedMonth)}</span>
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 bg-zinc-900/60 rounded border border-zinc-900 text-center">
              <span className="block text-[8px] text-zinc-500 uppercase leading-none">BLOQUES</span>
              <span className="text-sm font-sans font-black text-white">{monthlyStats.totalRoutinesCount}</span>
            </div>
            <div className="p-2 bg-zinc-900/60 rounded border border-zinc-900 text-center">
              <span className="block text-[8px] text-zinc-500 uppercase leading-none">TIEMPO</span>
              <span className="text-sm font-sans font-black text-white">{monthlyStats.totalTime}m</span>
            </div>
            <div className="p-2 bg-zinc-900/60 rounded border border-zinc-900 text-center">
              <span className="block text-[8px] text-zinc-500 uppercase leading-none">VOLUMEN</span>
              <span className="text-sm font-sans font-black text-[#5D36FF]">{monthlyStats.totalSeries} Ser</span>
            </div>
          </div>
          <p className="text-[9px] text-zinc-500 text-center">Meses con datos: <span className="text-zinc-300 font-bold">{monthsWithSchedules.size}</span></p>
        </div>
      </div>

      <div id="calendar_grid_container" className="xl:col-span-2 space-y-5">
        <div className="bg-[#121214] border border-zinc-800 p-4 rounded-xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[#5D36FF]">
              <CalendarIcon size={16} aria-hidden="true" />
            </div>
            <div>
              <p className="font-mono text-[9px] text-zinc-500 uppercase">Acondicionamiento Técnico Mensual</p>
              <h2 className="text-white font-sans font-bold text-sm uppercase tracking-wide">{monthLabel(viewedMonth)}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onChangeViewedMonth(shiftMonth(viewedMonth, -1))}
              aria-label="Mes anterior"
              className="p-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded text-zinc-400 hover:text-white transition"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <button
              onClick={goToToday}
              disabled={isViewingCurrentMonth}
              className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded font-mono text-[8px] uppercase font-bold text-zinc-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hoy
            </button>
            <button
              onClick={() => onChangeViewedMonth(shiftMonth(viewedMonth, 1))}
              aria-label="Mes siguiente"
              className="p-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded text-zinc-400 hover:text-white transition"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            <span className="w-px h-5 bg-zinc-800 mx-1" aria-hidden="true" />
            <button
              onClick={() => setExpandedWeeks({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true })}
              className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded font-mono text-[8px] uppercase font-bold text-zinc-400 hover:text-white transition"
            >
              Expandir
            </button>
            <button
              onClick={() => setExpandedWeeks({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false })}
              className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 rounded font-mono text-[8px] uppercase font-bold text-zinc-400 hover:text-white transition"
            >
              Colapsar
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

        <div className="space-y-4">
          {calendarWeeks.map(week => {
            const isWeekExpanded = expandedWeeks[week.weekNumber] ?? true;
            const stats = getPeriodStats(week.days);
            return (
              <div
                key={week.weekNumber}
                className={`border rounded-xl overflow-hidden bg-[#121214] transition-all duration-300 ${
                  isWeekExpanded ? 'border-zinc-800 shadow-md' : 'border-zinc-900/60 hover:border-zinc-800'
                }`}
              >
                <button
                  onClick={() => setExpandedWeeks(prev => ({ ...prev, [week.weekNumber]: !(prev[week.weekNumber] ?? true) }))}
                  aria-expanded={isWeekExpanded}
                  aria-controls={`week-body-${week.weekNumber}`}
                  className="w-full px-5 py-3 bg-zinc-900/70 hover:bg-zinc-900 transition flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="font-mono text-[9px] font-extrabold text-[#5D36FF] bg-[#5D36FF]/10 px-2 py-0.5 rounded border border-[#5D36FF]/20">
                      WK-{week.weekNumber}
                    </span>
                    <h4 className="text-white font-sans font-bold text-xs uppercase tracking-wide">{week.title}</h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1 text-[8.5px] font-mono">
                      <span className="bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded border border-zinc-900">{stats.totalRoutinesCount} Pautas</span>
                      <span className="bg-zinc-950 text-[#5D36FF] px-2 py-0.5 rounded border border-zinc-900 font-bold">{stats.totalSeries} Series</span>
                    </div>
                    <span className="p-1 rounded text-zinc-500" aria-hidden="true">
                      {isWeekExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>
                </button>

                {isWeekExpanded && (
                  <div id={`week-body-${week.weekNumber}`} className="p-4 bg-zinc-950/40 border-t border-zinc-900">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                      {week.days.map(day => {
                        const list = day.isPadding ? [] : (schedulesByDay.get(day.dayOfMonth) ?? []);
                        const isDayOpen = dayAddMenuOpen === day.dayOfMonth;
                        return (
                          <DroppableDay
                            key={`${week.weekNumber}-${day.dayIndex}`}
                            dayOfMonth={day.dayOfMonth}
                            disabled={day.isPadding}
                            baseClassName={`flex flex-col bg-zinc-950/80 border p-2.5 rounded-xl min-h-[160px] relative transition-all duration-200 ${
                              day.isPadding
                                ? 'opacity-20 bg-zinc-900/20 border-zinc-950 select-none'
                                : day.isToday
                                  ? 'border-[#5D36FF] ring-1 ring-[#5D36FF]/25 shadow-lg shadow-[#5D36FF]/5 bg-[#5D36FF]/5'
                                  : 'border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2 pb-1 border-b border-zinc-900/80">
                              <span className={`text-[8.5px] font-mono leading-none tracking-wide text-left ${
                                day.isToday ? 'text-[#5D36FF] font-black' : 'text-zinc-500 font-bold'
                              }`}>
                                {day.dayName.substring(0, 3)}
                              </span>
                              <span className={`font-mono text-[9px] font-bold leading-none ${
                                day.isToday ? 'text-white bg-[#5D36FF] px-1 rounded' : 'text-zinc-400'
                              }`}>
                                {String(day.dayOfMonth).padStart(2, '0')}
                              </span>
                            </div>

                            <div className="flex-1 space-y-2 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                              {list.map(sch => {
                                const parent = routinesById.get(sch.routineId);
                                if (!parent) return null;
                                const config = CATEGORY_CONFIG[parent.category];
                                return (
                                  <DragArea
                                    key={sch.id}
                                    id={`move-${sch.id}`}
                                    data={{ kind: 'move', scheduledId: sch.id, label: parent.title }}
                                    className={`p-1.5 bg-zinc-900 border rounded-lg group relative ${config.border} shadow-sm`}
                                  >
                                    <div className="pr-3 text-left">
                                      <span className={`inline-block px-1 py-0.5 text-[6px] font-mono font-bold rounded uppercase ${config.bg} ${config.color}`}>
                                        {parent.category.substring(0, 3)}
                                      </span>
                                      <h5 className="text-[10px] font-bold text-white line-clamp-1 leading-snug mt-0.5">{parent.title}</h5>
                                      <div className="text-[8px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5 flex-wrap">
                                        <span>{parent.estimatedDuration}m</span>
                                        <span aria-hidden="true">•</span>
                                        <span>{parent.exercises.length} ej.</span>
                                        {parent.exercises.some(e => e.endurance) && (
                                          <span className="text-[#F59E0B] font-bold" title="Incluye bloque(s) de cardio/endurance">·CARDIO</span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="absolute top-1 right-1 flex flex-col gap-0.5 bg-zinc-900 border border-zinc-800 p-0.5 rounded opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                      <button onClick={(e) => handleRemoveScheduled(sch.id, e)} aria-label="Quitar del calendario" className="text-zinc-500 hover:text-red-400">
                                        <Trash2 size={8} aria-hidden="true" />
                                      </button>
                                      <button onClick={() => handleOpenEditor(parent)} aria-label="Editar pauta" className="text-zinc-500 hover:text-[#5D36FF]">
                                        <Edit3 size={8} aria-hidden="true" />
                                      </button>
                                    </div>
                                  </DragArea>
                                );
                              })}

                              {list.length === 0 && !day.isPadding && (
                                <div className="h-full min-h-[70px] flex flex-col items-center justify-center border border-dashed border-zinc-900/60 rounded-lg text-center p-1 select-none">
                                  <span className="text-[8px] font-mono text-zinc-600 tracking-wider font-extrabold uppercase">DESCANSO</span>
                                </div>
                              )}
                            </div>

                            {!day.isPadding && (
                              <div className="relative mt-2" data-popover>
                                <button
                                  onClick={() => setDayAddMenuOpen(isDayOpen ? null : day.dayOfMonth)}
                                  aria-haspopup="dialog"
                                  aria-expanded={isDayOpen}
                                  className="w-full py-0.5 border border-zinc-900 hover:border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 rounded text-[8px] font-mono uppercase text-zinc-500 hover:text-white transition"
                                >
                                  + Carga
                                </button>

                                {isDayOpen && (
                                  <div role="dialog" aria-label={`Asignar carga al día ${day.dayOfMonth}`} className="absolute bottom-6 left-0 right-0 z-40 bg-[#121214] border border-zinc-800 rounded-lg p-2 shadow-2xl min-w-[140px] text-left space-y-1">
                                    <div className="flex justify-between items-center text-[7px] font-mono uppercase text-zinc-500 pb-1 border-b border-zinc-900">
                                      <span>Asignar Carga</span>
                                      <button onClick={() => setDayAddMenuOpen(null)} aria-label="Cerrar"><X size={8} aria-hidden="true" /></button>
                                    </div>
                                    <div className="max-h-[110px] overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                                      {routines.length === 0 && (
                                        <p className="text-zinc-600 text-[9px] py-2 text-center">Sin pautas en biblioteca</p>
                                      )}
                                      {routines.map(r => (
                                        <button
                                          key={r.id}
                                          onClick={() => handleAddRoutineToDay(r.id, day.dayOfMonth)}
                                          className="w-full text-left p-1 text-[9px] text-zinc-300 hover:bg-[#5D36FF]/10 hover:text-[#5D36FF] rounded transition truncate"
                                        >
                                          {r.title}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => handleOpenCreator(day.dayOfMonth)}
                                      className="w-full text-center py-1 mt-1 font-mono text-[7px] uppercase bg-[#5D36FF]/10 text-[#5D36FF] rounded hover:bg-[#5D36FF] hover:text-white transition"
                                    >
                                      + Crear Nueva
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </DroppableDay>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {isEditorOpen && editingRoutine && (
          <RoutineEditorModal
            routine={editingRoutine}
            setRoutine={setEditingRoutine}
            availableEquipment={activeClientEquipment}
            onSave={handleSaveRoutine}
            onClose={() => { setIsEditorOpen(false); setEditingRoutine(null); }}
          />
        )}
      </AnimatePresence>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[120] bg-[#121214] border border-[#5D36FF]/40 px-4 py-2 rounded-lg font-mono text-[11px] text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>

      <DragOverlay dropAnimation={null}>
        {activeDragLabel ? (
          <div className="px-3 py-2 rounded-lg bg-[#5D36FF] text-white font-bold text-[11px] shadow-2xl max-w-[200px] truncate pointer-events-none">
            {activeDragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface RoutineEditorModalProps {
  routine: WorkoutRoutine;
  setRoutine: (r: WorkoutRoutine) => void;
  availableEquipment: string[];
  onSave: () => void;
  onClose: () => void;
}

function RoutineEditorModal({ routine, setRoutine, availableEquipment, onSave, onClose }: RoutineEditorModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showNscaPicker, setShowNscaPicker] = useState(false);

  useEffect(() => {
    const first = dialogRef.current?.querySelector<HTMLElement>('input, select, textarea, button');
    first?.focus();
  }, []);

  const updateExercise = (idx: number, patch: Partial<Exercise>) => {
    const updated = routine.exercises.map((ex, i) => i === idx ? { ...ex, ...patch } : ex);
    setRoutine({ ...routine, exercises: updated });
  };

  const addNscaExercise = (nsca: import('../lib/nsca').NscaExercise) => {
    const endurance = buildEnduranceParamsFromNsca(nsca);
    const newEx: Exercise = endurance
      ? {
          // Bloque endurance: los campos sets/reps se quedan placeholder ya que
          // el render condicional usa EnduranceFields, no sets/reps.
          id: `ex-${Date.now()}-${nsca.id}`,
          name: nsca.name,
          sets: 1,
          reps: '—',
          rest: '—',
          intensity: nsca.technique?.intensidad ?? 'Ver bloque',
          notes: nsca.englishName,
          nscaId: nsca.id,
          endurance
        }
      : {
          id: `ex-${Date.now()}-${nsca.id}`,
          name: nsca.name,
          sets: 4,
          reps: '8-10',
          rest: '90s',
          intensity: 'RPE 8',
          notes: nsca.englishName,
          nscaId: nsca.id
        };
    setRoutine({ ...routine, exercises: [...routine.exercises, newEx] });
  };

  /** Añade un bloque de endurance vacío (manual) para que el coach lo configure. */
  const addBlankEnduranceBlock = () => {
    const newEx: Exercise = {
      id: `ex-${Date.now()}-end`,
      name: 'Nuevo bloque de cardio / endurance',
      sets: 1,
      reps: '—',
      rest: '—',
      intensity: 'Z2',
      endurance: {
        modality: 'run',
        protocol: 'continuous',
        zone: 'Z2'
      }
    };
    setRoutine({ ...routine, exercises: [...routine.exercises, newEx] });
  };

  /** Convierte un Exercise existente en bloque endurance (o lo desconvierte). */
  const toggleEndurance = (idx: number) => {
    const ex = routine.exercises[idx];
    if (ex.endurance) {
      // Quitar endurance → vuelve a ser bloque fuerza
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { endurance: _drop, ...rest } = ex;
      updateExercise(idx, { ...rest, endurance: undefined } as Partial<Exercise>);
    } else {
      updateExercise(idx, {
        endurance: { modality: 'run', protocol: 'continuous', zone: 'Z2' }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor_title"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Briefcase className="text-[#5D36FF]" size={16} aria-hidden="true" />
            <div>
              <h3 id="editor_title" className="font-sans font-bold text-xs text-white uppercase tracking-wider">
                Diseñador de Estímulos
              </h3>
              <p className="font-mono text-[8px] text-[#5D36FF] text-left">MANKIND LABS AUTOREGULATION</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar editor" className="p-1 hover:bg-zinc-800 rounded text-zinc-400">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5 text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ModalField label="Título de Pauta">
              <input
                type="text"
                value={routine.title}
                onChange={e => setRoutine({ ...routine, title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-sans text-xs focus:outline-none focus:border-[#5D36FF] transition"
                placeholder="e.g. MF-03 | Piernas Fuerza"
              />
            </ModalField>

            <ModalField label="Estímulo Fisiológico">
              <select
                value={routine.category}
                onChange={e => setRoutine({ ...routine, category: e.target.value as WorkoutCategory })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 text-xs py-1 text-white focus:outline-none focus:border-[#5D36FF] transition"
              >
                <option value="fuerza">Fuerza Máxima (Alta Carga)</option>
                <option value="potencia">Potencia Explosiva (Velocidad)</option>
                <option value="hipertrofia">Hipertrofia Estructural (Volumen)</option>
                <option value="aerobico">Capacidad Aeróbica (HIIT/MetCon corto)</option>
                <option value="resistencia">Resistencia / Endurance (Z2, tempo, intervalos largos)</option>
                <option value="cross_training">Cross-Training (mixto fuerza+cardio)</option>
              </select>
            </ModalField>

            <ModalField label="Duración (min)">
              <input
                type="number"
                min={5}
                max={240}
                value={routine.estimatedDuration}
                onChange={e => setRoutine({ ...routine, estimatedDuration: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#5D36FF]"
              />
            </ModalField>

            <div className="md:col-span-3">
              <ModalField label="Descripción General de Bloque">
                <textarea
                  value={routine.description}
                  onChange={e => setRoutine({ ...routine, description: e.target.value })}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNscaPicker(s => !s)}
                  aria-pressed={showNscaPicker}
                  className={`px-2 py-0.5 border rounded text-[8px] font-mono uppercase font-bold transition flex items-center gap-1 ${
                    showNscaPicker
                      ? 'bg-[#5D36FF] border-[#5D36FF] text-white'
                      : 'bg-zinc-900 border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Library size={10} aria-hidden="true" /> NSCA
                </button>
                <button
                  onClick={addBlankEnduranceBlock}
                  className="px-2 py-0.5 bg-[#F59E0B]/10 border border-[#F59E0B]/40 hover:bg-[#F59E0B]/20 text-[#F59E0B] rounded text-[8px] font-mono uppercase font-bold transition flex items-center gap-1"
                  title="Añadir bloque de cardio / endurance / cross-training"
                >
                  <Plus size={10} aria-hidden="true" /> Cardio
                </button>
                <button
                  onClick={() => {
                    const newEx: Exercise = {
                      id: `ex-${Date.now()}`,
                      name: 'Nuevo Ejercicio',
                      sets: 3,
                      reps: '10',
                      rest: '90s',
                      intensity: 'RPE 8'
                    };
                    setRoutine({ ...routine, exercises: [...routine.exercises, newEx] });
                  }}
                  className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white rounded text-[8px] font-mono uppercase text-zinc-400 font-bold transition flex items-center gap-1"
                >
                  <Plus size={10} aria-hidden="true" /> Manual
                </button>
              </div>
            </div>

            {showNscaPicker && (
              <NscaPicker
                availableEquipment={availableEquipment}
                onPick={addNscaExercise}
                onClose={() => setShowNscaPicker(false)}
              />
            )}

            <div className="space-y-2 max-h-[290px] overflow-y-auto pr-0.5 scrollbar-thin">
              {routine.exercises.map((ex, exIdx) => {
                const nscaRef = findNscaExerciseById(ex.nscaId)
                  ?? NSCA_EXERCISES.find(n => n.name === ex.name || n.englishName === ex.name);
                // Si no hay match exacto en la biblioteca NSCA, deducir el patrón por nombre del ejercicio.
                const fallbackPattern = patternFromName(ex.name);
                const removeBtn = (
                  <button
                    onClick={() => {
                      if (routine.exercises.length === 1) return;
                      setRoutine({ ...routine, exercises: routine.exercises.filter((_, idx) => idx !== exIdx) });
                    }}
                    aria-label="Eliminar ejercicio"
                    disabled={routine.exercises.length === 1}
                    className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed self-start"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                );

                // ────────────────────────────────────────────────────────────
                // Render para bloques de Endurance / Cross-Training
                // ────────────────────────────────────────────────────────────
                if (ex.endurance) {
                  return (
                    <div key={ex.id} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <EnduranceFields
                          exercise={ex}
                          endurance={ex.endurance}
                          onChange={(patch) => updateExercise(exIdx, patch)}
                          onRemoveEndurance={() => toggleEndurance(exIdx)}
                        />
                      </div>
                      {removeBtn}
                    </div>
                  );
                }

                // ────────────────────────────────────────────────────────────
                // Render para bloques clásicos de Fuerza (sets/reps/rest)
                // ────────────────────────────────────────────────────────────
                return (
                <div key={ex.id} className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-900 flex flex-col md:flex-row gap-2.5 items-end">
                  {/* Ícono del patrón */}
                  <div className="shrink-0 w-10 h-10 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-[#5D36FF] self-start">
                    {nscaRef ? (
                      <MovementIconForExercise exercise={nscaRef} size={32} />
                    ) : (
                      <MovementIcon pattern={fallbackPattern} size={32} />
                    )}
                  </div>
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <label className="font-mono text-[7.5px] text-zinc-500 uppercase flex items-center justify-between">
                      <span>Ejercicio {exIdx + 1}</span>
                      <button
                        type="button"
                        onClick={() => toggleEndurance(exIdx)}
                        className="text-[#F59E0B] hover:underline normal-case"
                        title="Convertir este bloque en bloque de cardio/endurance"
                      >
                        → Cardio
                      </button>
                    </label>
                    <input type="text" value={ex.name} onChange={e => updateExercise(exIdx, { name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs" />
                  </div>

                  <div className="w-12 space-y-1">
                    <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Sets</label>
                    <input type="number" min={1} max={20} value={ex.sets} onChange={e => updateExercise(exIdx, { sets: Math.max(1, Number(e.target.value) || 1) })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                  </div>

                  <div className="w-16 space-y-1">
                    <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Reps</label>
                    <input type="text" value={ex.reps} onChange={e => updateExercise(exIdx, { reps: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                  </div>

                  <div className="w-20 space-y-1">
                    <label className="font-mono text-[7.5px] text-zinc-500 uppercase">RPE / Carga</label>
                    <input type="text" value={ex.intensity} onChange={e => updateExercise(exIdx, { intensity: e.target.value })} className="w-full bg-purple-950/20 border border-[#5D36FF]/20 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                  </div>

                  <div className="w-16 space-y-1">
                    <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Rest</label>
                    <input type="text" value={ex.rest} onChange={e => updateExercise(exIdx, { rest: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs text-center font-mono" />
                  </div>

                  <div className="flex-1 min-w-[100px] space-y-1">
                    <label className="font-mono text-[7.5px] text-zinc-500 uppercase">Notas</label>
                    <input type="text" value={ex.notes || ''} onChange={e => updateExercise(exIdx, { notes: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-xs" placeholder="Ej. excéntrica controlada..." />
                  </div>

                  {removeBtn}
                </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-between gap-3 font-mono text-[8px]">
          <span className="self-center text-zinc-500 uppercase">MANKIND ATHLETICS CO.</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="p-1.5 px-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded font-bold uppercase">Cancelar</button>
            <button onClick={onSave} className="p-1.5 px-5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-bold uppercase flex items-center gap-1">
              <Check size={12} aria-hidden="true" /> Guardar
            </button>
          </div>
        </div>
      </motion.div>
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutTemplate, Save, Plus, Trash2, Wand, X } from 'lucide-react';
import { MicrocycleTemplate, MonthRef, ScheduledRoutine, WorkoutRoutine } from '../types';
import { DAY_NAMES, monthLabel, weekdayIndexFor } from '../constants';

interface TemplatesPanelProps {
  templates: MicrocycleTemplate[];
  routines: WorkoutRoutine[];
  scheduledRoutines: ScheduledRoutine[];
  activeClientId: string;
  viewedMonth: MonthRef;
  onUpdateTemplates: (templates: MicrocycleTemplate[]) => void;
  onUpdateScheduled: (scheduled: ScheduledRoutine[]) => void;
}

type ApplyMode = 'append' | 'replace';

export default function TemplatesPanel({
  templates,
  routines,
  scheduledRoutines,
  activeClientId,
  viewedMonth,
  onUpdateTemplates,
  onUpdateScheduled
}: TemplatesPanelProps) {
  const [open, setOpen] = useState(false);
  const [savingName, setSavingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onClickOutside);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const routineById = useMemo(() => {
    const map = new Map<string, WorkoutRoutine>();
    routines.forEach(r => map.set(r.id, r));
    return map;
  }, [routines]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 2400);
  };

  const captureFromMonth = () => {
    setError(null);
    const days: Record<number, string[]> = {};
    const slots: Record<number, ('am' | 'pm')[]> = {};
    scheduledRoutines.forEach(s => {
      if (s.clientId !== activeClientId) return;
      if (s.year !== viewedMonth.year || s.monthIndex !== viewedMonth.monthIndex) return;
      const wd = weekdayIndexFor(s.year, s.monthIndex, s.dayOfMonth);
      const slot = s.slot ?? 'am';
      const list = days[wd] ?? [];
      const slotList = slots[wd] ?? [];
      /* dedup por pauta + franja: una misma pauta puede ir en AM y PM. */
      const dup = list.some((rid, i) => rid === s.routineId && (slotList[i] ?? 'am') === slot);
      if (!dup) { list.push(s.routineId); slotList.push(slot); }
      days[wd] = list;
      slots[wd] = slotList;
    });
    if (Object.keys(days).length === 0) {
      setError('No hay cargas en el mes activo para capturar.');
      return;
    }
    const name = savingName.trim() || `Plantilla ${monthLabel(viewedMonth)}`;
    const template: MicrocycleTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      days,
      slots,
      createdAt: Date.now()
    };
    onUpdateTemplates([...templates, template]);
    setSavingName('');
    showFeedback(`Plantilla "${name}" guardada`);
  };

  const applyTemplate = (template: MicrocycleTemplate, mode: ApplyMode) => {
    setError(null);
    const daysInMonth = new Date(viewedMonth.year, viewedMonth.monthIndex + 1, 0).getDate();
    const newSchedules: ScheduledRoutine[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const wd = weekdayIndexFor(viewedMonth.year, viewedMonth.monthIndex, day);
      const ids = template.days[wd] ?? [];
      ids.forEach((rid, i) => {
        if (!routineById.has(rid)) return; // pauta borrada — ignoramos
        newSchedules.push({
          id: `s-tpl-${Date.now()}-${day}-${i}`,
          clientId: activeClientId,
          routineId: rid,
          year: viewedMonth.year,
          monthIndex: viewedMonth.monthIndex,
          dayOfMonth: day,
          slot: template.slots?.[wd]?.[i] ?? 'am'
        });
      });
    }

    const filtered = mode === 'replace'
      ? scheduledRoutines.filter(s =>
        !(s.clientId === activeClientId && s.year === viewedMonth.year && s.monthIndex === viewedMonth.monthIndex)
      )
      : scheduledRoutines;
    onUpdateScheduled([...filtered, ...newSchedules]);
    showFeedback(
      mode === 'replace'
        ? `Mes reemplazado con "${template.name}" (${newSchedules.length} cargas)`
        : `${newSchedules.length} cargas añadidas desde "${template.name}"`
    );
  };

  const deleteTemplate = (id: string) => {
    onUpdateTemplates(templates.filter(t => t.id !== id));
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="px-3 py-1 bg-zinc-950 border border-zinc-800 hover:border-[#5D36FF]/50 hover:bg-[#5D36FF]/5 rounded font-mono text-[9px] uppercase font-bold text-zinc-300 hover:text-white transition flex items-center gap-1.5"
      >
        <LayoutTemplate size={11} className="text-[#5D36FF]" aria-hidden="true" />
        Plantillas ({templates.length})
      </button>

      {open && (
        <div role="dialog" aria-label="Plantillas de microciclo" className="absolute right-0 top-full mt-2 w-[340px] bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl p-4 z-50 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="font-sans font-bold text-xs text-white uppercase tracking-wider">Plantillas de microciclo</h3>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="p-1 text-zinc-500 hover:text-white">
              <X size={12} aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
              Capturá la disposición semanal del mes activo y reusala en otros meses (Push/Pull/Legs, Upper/Lower, etc.).
            </p>

            <div className="flex gap-2">
              <input
                value={savingName}
                onChange={e => setSavingName(e.target.value)}
                placeholder={`Nombre (Plantilla ${monthLabel(viewedMonth)})`}
                aria-label="Nombre de la plantilla"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white font-mono text-[10px] focus:outline-none focus:border-[#5D36FF]"
              />
              <button
                onClick={captureFromMonth}
                className="px-2 py-1 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[9px] uppercase font-bold transition flex items-center gap-1"
              >
                <Save size={10} aria-hidden="true" /> Capturar
              </button>
            </div>

            {error && <p role="alert" className="text-red-400 text-[10px] font-mono">{error}</p>}
            {feedback && <p role="status" className="text-emerald-400 text-[10px] font-mono">{feedback}</p>}
          </div>

          <div className="border-t border-zinc-900 pt-2 space-y-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {templates.length === 0 && (
              <p className="text-zinc-600 text-[10px] font-mono text-center py-3">Sin plantillas guardadas todavía.</p>
            )}
            {templates.map(t => {
              const totalIds = Object.values(t.days).flat().length;
              const activeDays = Object.keys(t.days).length;
              return (
                <div key={t.id} className="bg-zinc-950/60 border border-zinc-900 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white font-bold truncate">{t.name}</span>
                    <button
                      onClick={() => deleteTemplate(t.id)}
                      aria-label={`Eliminar plantilla ${t.name}`}
                      className="p-0.5 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 size={10} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-500">
                    <span>{activeDays}/7 días</span>
                    <span aria-hidden="true">•</span>
                    <span>{totalIds} cargas</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {DAY_NAMES.map((d, idx) => {
                      const has = (t.days[idx] ?? []).length > 0;
                      return (
                        <span
                          key={idx}
                          className={`text-[8px] font-mono px-1 py-0.5 rounded ${
                            has ? 'bg-[#5D36FF]/20 text-[#5D36FF]' : 'bg-zinc-900 text-zinc-600'
                          }`}
                          title={d}
                        >
                          {d.substring(0, 1)}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <button
                      onClick={() => applyTemplate(t, 'append')}
                      className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:text-white text-zinc-300 rounded font-mono text-[9px] uppercase font-bold transition flex items-center justify-center gap-1"
                    >
                      <Plus size={9} aria-hidden="true" /> Añadir
                    </button>
                    <button
                      onClick={() => applyTemplate(t, 'replace')}
                      className="flex-1 px-2 py-1 bg-[#5D36FF]/10 border border-[#5D36FF]/30 text-[#5D36FF] hover:bg-[#5D36FF] hover:text-white rounded font-mono text-[9px] uppercase font-bold transition flex items-center justify-center gap-1"
                    >
                      <Wand size={9} aria-hidden="true" /> Reemplazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

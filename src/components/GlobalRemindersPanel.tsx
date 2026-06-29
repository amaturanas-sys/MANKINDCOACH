/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Recordatorios globales del coach (no vinculados a un paciente).
 * Ej: "Actualizar catálogo", "Posteo de marketing", "Pagar impuestos".
 * Se ve en Inicio. Cada item: texto, fecha opcional, categoría, done.
 */

import React, { useMemo, useState } from 'react';
import { ListTodo, Plus, Check, Trash2, Calendar as CalIcon } from 'lucide-react';
import { GlobalReminder } from '../types';

interface GlobalRemindersPanelProps {
  reminders: GlobalReminder[];
  onAdd: (r: GlobalReminder) => void;
  onUpdate: (r: GlobalReminder) => void;
  onRemove: (id: string) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const CATEGORIES = ['admin', 'marketing', 'estudio', 'producto', 'finanzas', 'otro'];

function daysFromNow(ts?: number): number | null {
  if (!ts) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(ts); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / MS_PER_DAY);
}

export default function GlobalRemindersPanel({ reminders, onAdd, onUpdate, onRemove }: GlobalRemindersPanelProps) {
  const [text, setText] = useState('');
  const [due, setDue] = useState('');
  const [category, setCategory] = useState('admin');
  const [showCompleted, setShowCompleted] = useState(false);

  const sorted = useMemo(() => {
    const list = [...reminders];
    list.sort((a, b) => {
      /* incompletos primero, luego por dueAt asc, luego por createdAt desc */
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.dueAt && b.dueAt) return a.dueAt - b.dueAt;
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return b.createdAt - a.createdAt;
    });
    return list;
  }, [reminders]);

  const visible = useMemo(() => showCompleted ? sorted : sorted.filter(r => !r.done), [sorted, showCompleted]);
  const completedCount = reminders.filter(r => r.done).length;
  const pendingCount = reminders.filter(r => !r.done).length;

  const submit = () => {
    if (!text.trim()) return;
    const dueTs = due ? new Date(due).getTime() : undefined;
    onAdd({
      id: `gr-${Date.now()}`,
      text: text.trim(),
      dueAt: dueTs,
      done: false,
      category,
      createdAt: Date.now()
    });
    setText(''); setDue('');
  };

  return (
    <section className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <ListTodo size={16} className="text-[#5D36FF]" aria-hidden="true" /> Mis tareas del coach
        </h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-zinc-500 uppercase">
            {pendingCount} pendiente{pendingCount === 1 ? '' : 's'} · {completedCount} hecha{completedCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 rounded font-mono text-[9px] uppercase tracking-wider text-zinc-400 hover:text-white transition"
          >
            {showCompleted ? 'Ocultar hechas' : 'Mostrar hechas'}
          </button>
        </div>
      </div>

      {/* Form rápido */}
      <div className="flex flex-col md:flex-row gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) submit(); }}
          placeholder="Ej: Actualizar catálogo de precios, postear en IG..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="date"
          value={due}
          onChange={e => setDue(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          title="Fecha opcional"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className="px-4 py-2 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-2 shrink-0"
        >
          <Plus size={11} aria-hidden="true" /> Agregar
        </button>
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <p className="text-zinc-500 font-mono text-xs text-center py-6">
          {pendingCount === 0 ? '✓ Todo al día. Bien jugado.' : 'Sin tareas visibles. Cambiá el filtro.'}
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
          {visible.map(r => {
            const delta = r.dueAt ? daysFromNow(r.dueAt) : null;
            const overdue = delta !== null && delta < 0 && !r.done;
            return (
              <li key={r.id} className={`flex items-start gap-3 p-2.5 bg-zinc-950/40 border rounded group transition ${
                r.done ? 'border-zinc-900 opacity-50' : overdue ? 'border-[#FF3C00]/30' : 'border-zinc-800'
              }`}>
                <button
                  type="button"
                  onClick={() => onUpdate({ ...r, done: !r.done })}
                  className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center mt-0.5 transition ${
                    r.done ? 'bg-[#10B981] border-[#10B981] text-white' : 'border-zinc-700 hover:border-[#5D36FF]'
                  }`}
                  aria-label={r.done ? 'Marcar como pendiente' : 'Marcar como hecho'}
                >
                  {r.done && <Check size={10} aria-hidden="true" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-white ${r.done ? 'line-through text-zinc-500' : ''}`}>{r.text}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.category && (
                      <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-mono uppercase tracking-wider rounded">
                        {r.category}
                      </span>
                    )}
                    {r.dueAt && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${overdue ? 'text-[#FF3C00]' : 'text-zinc-500'}`}>
                        <CalIcon size={9} aria-hidden="true" />
                        {overdue ? 'Vencido hace' : 'Para'} {Math.abs(delta ?? 0)} días · {new Date(r.dueAt).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { if (window.confirm('¿Eliminar tarea?')) onRemove(r.id); }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition shrink-0 mt-0.5"
                  aria-label="Eliminar tarea"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

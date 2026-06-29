/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Timeline de sesiones clínicas / controles / mensajes de un paciente.
 * Cada entrada queda con fecha, tipo, título, contenido y duración.
 */

import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  Stethoscope,
  Dumbbell,
  MessageSquare,
  CircleDot,
  Clock,
  X,
  Check
} from 'lucide-react';
import { SessionKind, SessionNote } from '../types';

interface SessionNotesPanelProps {
  clientId: string;
  notes: SessionNote[];     // ya filtrados por el caller
  onAdd: (n: SessionNote) => void;
  onUpdate: (n: SessionNote) => void;
  onRemove: (id: string) => void;
}

const KIND_META: Record<SessionKind, { label: string; icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>; color: string }> = {
  control: { label: 'Control', icon: Stethoscope, color: 'text-[#5D36FF] border-[#5D36FF]/40 bg-[#5D36FF]/10' },
  sesion: { label: 'Sesión', icon: Dumbbell, color: 'text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10' },
  evaluacion: { label: 'Evaluación', icon: ClipboardList, color: 'text-[#FFB020] border-[#FFB020]/40 bg-[#FFB020]/10' },
  mensaje: { label: 'Comunicación', icon: MessageSquare, color: 'text-zinc-300 border-zinc-700 bg-zinc-900/40' },
  otro: { label: 'Otro', icon: CircleDot, color: 'text-zinc-400 border-zinc-800 bg-zinc-900/40' }
};

function isoFromTimestamp(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timestampFromIso(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export default function SessionNotesPanel({ clientId, notes, onAdd, onUpdate, onRemove }: SessionNotesPanelProps) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SessionNote | null>(null);

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => b.takenAt - a.takenAt), [notes]);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft({
      id: `note-${Date.now()}`,
      clientId,
      takenAt: Date.now(),
      kind: 'control',
      title: '',
      content: '',
      createdAt: Date.now()
    });
  };

  const startEdit = (n: SessionNote) => {
    setCreating(false);
    setEditingId(n.id);
    setDraft({ ...n });
  };

  const cancel = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(null);
  };

  const commit = () => {
    if (!draft || !draft.title.trim()) return;
    if (creating) onAdd(draft);
    else onUpdate(draft);
    cancel();
  };

  const remove = (id: string) => {
    if (!window.confirm('¿Eliminar esta entrada del timeline?')) return;
    onRemove(id);
  };

  return (
    <section className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h2 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <ClipboardList size={16} className="text-[#5D36FF]" aria-hidden="true" /> Timeline de sesiones
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-zinc-500 uppercase">{notes.length} entradas</span>
          {!creating && !editingId && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
            >
              <Plus size={11} aria-hidden="true" /> Nueva entrada
            </button>
          )}
        </div>
      </div>

      {(creating || editingId) && draft && (
        <NoteEditor draft={draft} isCreating={creating} onChange={setDraft} onCommit={commit} onCancel={cancel} />
      )}

      {sortedNotes.length === 0 && !creating ? (
        <div className="py-8 text-center space-y-2">
          <ClipboardList size={24} className="text-zinc-700 mx-auto" aria-hidden="true" />
          <p className="text-zinc-400 font-mono text-xs">Sin sesiones registradas todavía.</p>
          <p className="text-zinc-600 font-mono text-[10px]">Registra controles, sesiones presenciales y conversaciones importantes.</p>
        </div>
      ) : (
        <ol className="relative space-y-3">
          {/* línea del timeline */}
          {sortedNotes.length > 1 && (
            <div className="absolute left-3 top-2 bottom-2 w-px bg-zinc-800" aria-hidden="true" />
          )}
          {sortedNotes.map(n => editingId === n.id
            ? <li key={n.id} className="bg-zinc-900/40 border border-[#5D36FF]/30 rounded p-3 text-[10px] text-zinc-500 italic font-mono ml-8">Editando arriba...</li>
            : <NoteCard key={n.id} note={n} onEdit={() => startEdit(n)} onRemove={() => remove(n.id)} />
          )}
        </ol>
      )}
    </section>
  );
}

/* ----------------------------------------------------------------------- *
 * NoteCard
 * ----------------------------------------------------------------------- */

function NoteCard({ note, onEdit, onRemove }: { note: SessionNote; onEdit: () => void; onRemove: () => void }) {
  const meta = KIND_META[note.kind];
  const Icon = meta.icon;
  const dateLabel = new Date(note.takenAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <li className="relative pl-8 group">
      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 ${meta.color}`} aria-hidden="true">
        <Icon size={11} />
      </div>
      <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3 space-y-1.5 hover:border-[#5D36FF]/30 transition">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-1.5 py-0.5 border text-[9px] font-mono uppercase tracking-wider rounded font-bold ${meta.color}`}>
                {meta.label}
              </span>
              <span className="text-[10px] font-mono text-zinc-500">{dateLabel}</span>
              {note.durationMinutes !== undefined && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                  <Clock size={9} aria-hidden="true" /> {note.durationMinutes} min
                </span>
              )}
            </div>
            <h4 className="font-sans font-bold text-sm text-white mt-1">{note.title}</h4>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button type="button" onClick={onEdit} className="p-1 text-zinc-500 hover:text-[#5D36FF] rounded" aria-label="Editar">
              <Pencil size={11} aria-hidden="true" />
            </button>
            <button type="button" onClick={onRemove} className="p-1 text-zinc-500 hover:text-red-400 rounded" aria-label="Eliminar">
              <Trash2 size={11} aria-hidden="true" />
            </button>
          </div>
        </div>
        {note.content && (
          <p className="text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
        )}
      </div>
    </li>
  );
}

/* ----------------------------------------------------------------------- *
 * Editor
 * ----------------------------------------------------------------------- */

function NoteEditor({ draft, isCreating, onChange, onCommit, onCancel }: {
  draft: SessionNote;
  isCreating: boolean;
  onChange: (n: SessionNote) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-zinc-950/60 border border-[#5D36FF]/40 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Tipo">
          <select
            value={draft.kind}
            onChange={e => onChange({ ...draft, kind: e.target.value as SessionKind })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          >
            {(Object.entries(KIND_META) as [SessionKind, typeof KIND_META[SessionKind]][]).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input
            type="date"
            value={isoFromTimestamp(draft.takenAt)}
            onChange={e => onChange({ ...draft, takenAt: timestampFromIso(e.target.value) })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Duración (min, opcional)">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={draft.durationMinutes ?? ''}
            onChange={e => onChange({ ...draft, durationMinutes: e.target.value === '' ? undefined : Number(e.target.value) })}
            placeholder="45"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Título" wide>
          <input
            type="text"
            value={draft.title}
            onChange={e => onChange({ ...draft, title: e.target.value })}
            placeholder="Ej: Control mayo · evaluación 1RM banca"
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Contenido / observaciones" wide>
          <textarea
            rows={4}
            value={draft.content}
            onChange={e => onChange({ ...draft, content: e.target.value })}
            placeholder="Qué se trabajó, cómo se sintió, observaciones técnicas, próximos pasos..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 resize-y font-mono leading-relaxed"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px] uppercase font-bold hover:bg-zinc-800 transition"
        >
          <X size={11} aria-hidden="true" /> Cancelar
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={!draft.title.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-[10px] uppercase font-bold transition"
        >
          <Check size={11} aria-hidden="true" /> {isCreating ? 'Agregar' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1 ${wide ? 'md:col-span-3' : ''}`}>
      <span className="block text-[9px] uppercase text-zinc-500 tracking-wider font-mono">{label}</span>
      {children}
    </label>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, UserPlus, Pencil, Trash2, Check, X } from 'lucide-react';
import { ClientProfile } from '../types';
import { Avatar } from './Avatar';

interface ClientSwitcherProps {
  clients: ClientProfile[];
  activeClientId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export default function ClientSwitcher({
  clients,
  activeClientId,
  onSelect,
  onCreate,
  onRename,
  onDelete
}: ClientSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creatingName, setCreatingName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setEditingId(null);
        setConfirmingDeleteId(null);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  const active = clients.find(c => c.id === activeClientId) ?? clients[0];

  const submitCreate = () => {
    const name = creatingName.trim();
    if (!name) return;
    onCreate(name);
    setCreatingName('');
    setOpen(false);
  };

  const submitRename = (id: string) => {
    onRename(id, editingName);
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div ref={wrapperRef} className="relative font-mono text-xs flex-1 max-w-md">
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 hover:border-[#5D36FF]/50 rounded-lg px-3 py-2 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          {active && <Avatar name={active.name} dataUrl={active.avatarDataUrl} size={28} />}
          <div className="text-left min-w-0">
            <span className="block text-[9px] uppercase text-zinc-500 tracking-wider">Atleta activo</span>
            <span className="text-white font-bold text-sm truncate block">{active?.name || 'Sin atleta'}</span>
          </div>
        </div>
        <ChevronDown size={14} className={`text-zinc-400 transition shrink-0 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div role="listbox" aria-label="Selector de atleta" className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-zinc-800 rounded-lg shadow-2xl p-2 z-[60] space-y-1 max-h-[420px] overflow-y-auto scrollbar-thin">
          {clients.map(c => {
            const isActive = c.id === activeClientId;
            const isEditing = editingId === c.id;
            const isConfirming = confirmingDeleteId === c.id;
            return (
              <div
                key={c.id}
                className={`group relative rounded-md border transition ${
                  isActive ? 'border-[#5D36FF]/40 bg-[#5D36FF]/5' : 'border-transparent hover:bg-zinc-900'
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 p-1.5">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitRename(c.id);
                        if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-xs"
                      aria-label="Nuevo nombre"
                    />
                    <button onClick={() => submitRename(c.id)} aria-label="Guardar nombre" className="p-1 text-emerald-400 hover:text-emerald-300">
                      <Check size={12} aria-hidden="true" />
                    </button>
                    <button onClick={() => { setEditingId(null); setEditingName(''); }} aria-label="Cancelar" className="p-1 text-zinc-500 hover:text-white">
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                ) : isConfirming ? (
                  <div className="flex items-center justify-between gap-2 p-2 bg-red-950/40 rounded-md">
                    <span className="text-[10px] text-red-200">¿Eliminar “{c.name}”?</span>
                    <div className="flex gap-1">
                      <button onClick={() => { onDelete(c.id); setConfirmingDeleteId(null); }} className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white rounded text-[9px] uppercase font-bold">Sí</button>
                      <button onClick={() => setConfirmingDeleteId(null)} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[9px] uppercase font-bold">No</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2">
                    <button
                      role="option"
                      aria-selected={isActive}
                      onClick={() => { onSelect(c.id); setOpen(false); }}
                      className="flex-1 text-left"
                    >
                      <span className={`block text-xs font-bold ${isActive ? 'text-white' : 'text-zinc-300'}`}>{c.name}</span>
                      <span className="block text-[9px] text-zinc-500">{c.experienceLevel}</span>
                    </button>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                      <button
                        onClick={() => { setEditingId(c.id); setEditingName(c.name); }}
                        aria-label={`Renombrar ${c.name}`}
                        className="p-1 text-zinc-500 hover:text-[#5D36FF] rounded"
                      >
                        <Pencil size={11} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(c.id)}
                        aria-label={`Eliminar ${c.name}`}
                        className="p-1 text-zinc-500 hover:text-red-400 rounded"
                      >
                        <Trash2 size={11} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 mt-2 border-t border-zinc-900">
            <div className="flex items-center gap-1">
              <UserPlus size={12} className="text-[#5D36FF] ml-1" aria-hidden="true" />
              <input
                value={creatingName}
                onChange={e => setCreatingName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitCreate(); }}
                placeholder="Nombre del nuevo atleta"
                aria-label="Nombre del nuevo atleta"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-white text-[11px] focus:outline-none focus:border-[#5D36FF]"
              />
              <button
                onClick={submitCreate}
                disabled={!creatingName.trim()}
                className="px-2 py-1 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded text-[9px] uppercase font-bold disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

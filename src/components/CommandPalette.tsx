/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Command Palette (Cmd+K / Ctrl+K).
 * Búsqueda global de pacientes (por nombre, tags, notas) + acciones rápidas
 * de navegación. Operable solo por teclado.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  ArrowRight,
  Home as HomeIcon,
  Users,
  Briefcase,
  HardDrive,
  Library,
  Plus,
  CornerDownLeft,
  Keyboard
} from 'lucide-react';
import { ClientProfile } from '../types';
import { Avatar } from './Avatar';

export type CommandResult =
  | { kind: 'patient'; clientId: string; label: string; subtitle?: string }
  | { kind: 'nav'; section: 'inicio' | 'pacientes' | 'practica' | 'biblioteca' | 'offline' | 'landing'; label: string; subtitle?: string }
  | { kind: 'action'; id: string; label: string; subtitle?: string };

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  clients: ClientProfile[];
  onSelectResult: (r: CommandResult) => void;
}

const NAV_OPTIONS: CommandResult[] = [
  { kind: 'nav', section: 'inicio', label: 'Ir a Inicio', subtitle: 'Tareas y agenda' },
  { kind: 'nav', section: 'practica', label: 'Ir a Práctica', subtitle: 'Dashboard económico, controles y plantillas' },
  { kind: 'nav', section: 'pacientes', label: 'Ir a Pacientes', subtitle: 'Tabla con estatus' },
  { kind: 'nav', section: 'biblioteca', label: 'Ir a Biblioteca de movimientos', subtitle: 'NSCA + ejercicios personales' },
  { kind: 'nav', section: 'offline', label: 'Ir a Datos y Respaldos', subtitle: 'Backups, PWA, almacenamiento' },
  { kind: 'nav', section: 'landing', label: 'Volver al inicio (pantalla principal)', subtitle: 'Pantalla de bienvenida' }
];

const ACTION_OPTIONS: CommandResult[] = [
  { kind: 'action', id: 'new-patient', label: 'Crear nuevo paciente', subtitle: 'N' },
  { kind: 'action', id: 'show-shortcuts', label: 'Mostrar atajos de teclado', subtitle: '?' }
];

export default function CommandPalette({ open, onClose, clients, onSelectResult }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /* Reset al abrir/cerrar */
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo<CommandResult[]>(() => {
    const q = query.trim().toLowerCase();

    const patientResults: CommandResult[] = [];
    for (const c of clients) {
      const inName = c.name.toLowerCase().includes(q);
      const inTag = (c.tags ?? []).some(t => t.toLowerCase().includes(q));
      const inNotes = (c.coachNotes ?? '').toLowerCase().includes(q);
      const inExp = c.experienceLevel.includes(q);
      const matches = q === '' || inName || inTag || inNotes || inExp;
      if (!matches) continue;
      const matchType = inName ? '' : inTag ? ' · match en tags' : inNotes ? ' · match en notas' : '';
      patientResults.push({
        kind: 'patient',
        clientId: c.id,
        label: c.name,
        subtitle: `${c.experienceLevel}${matchType}`
      });
      if (patientResults.length >= 8) break;
    }

    const navResults = NAV_OPTIONS.filter(n => q === '' || n.label.toLowerCase().includes(q) || n.subtitle?.toLowerCase().includes(q));
    const actionResults = ACTION_OPTIONS.filter(a => q === '' || a.label.toLowerCase().includes(q));

    return [...patientResults, ...navResults, ...actionResults];
  }, [query, clients]);

  /* Reset cursor cuando cambia el query */
  useEffect(() => { setSelectedIdx(0); }, [query]);

  /* Scroll cursor al elemento visible */
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  if (!open) return null;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, Math.max(0, results.length - 1)));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(0, i - 1));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[selectedIdx];
      if (r) {
        onSelectResult(r);
        onClose();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda y acciones rápidas"
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-xl bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* Input */}
        <div className="relative border-b border-zinc-800">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar pacientes, ir a una sección, acciones..."
            className="w-full bg-transparent pl-12 pr-12 py-4 text-white text-base focus:outline-none placeholder:text-zinc-600"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Lista */}
        <ul ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-zinc-500 font-mono text-xs">
              Sin resultados. Prueba con otro término.
            </li>
          ) : results.map((r, idx) => {
            const active = idx === selectedIdx;
            const client = r.kind === 'patient' ? clients.find(c => c.id === r.clientId) : null;
            const Icon = r.kind === 'nav'
              ? (r.section === 'inicio' ? HomeIcon
                : r.section === 'pacientes' ? Users
                : r.section === 'practica' ? Briefcase
                : r.section === 'biblioteca' ? Library
                : r.section === 'offline' ? HardDrive
                : HomeIcon)
              : r.kind === 'action'
                ? Plus
                : null;
            return (
              <li key={`${r.kind}-${idx}`} data-idx={idx}>
                <button
                  type="button"
                  onClick={() => { onSelectResult(r); onClose(); }}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition ${
                    active ? 'bg-[#5D36FF]/15 border border-[#5D36FF]/40' : 'border border-transparent hover:bg-zinc-900/60'
                  }`}
                >
                  {r.kind === 'patient' && client && (
                    <Avatar name={client.name} dataUrl={client.avatarDataUrl} size={28} />
                  )}
                  {Icon && (
                    <div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Icon size={13} className="text-[#5D36FF]" aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-white truncate">{r.label}</span>
                    {r.subtitle && <span className="block text-[10px] font-mono text-zinc-500 truncate">{r.subtitle}</span>}
                  </div>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase rounded bg-zinc-900 border border-zinc-800 text-zinc-500 shrink-0">
                    {r.kind === 'patient' ? 'Paciente' : r.kind === 'nav' ? 'Ir a' : 'Acción'}
                  </span>
                  {active && <ArrowRight size={12} className="text-[#5D36FF] shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> mover
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd><CornerDownLeft size={9} aria-hidden="true" /></Kbd> elegir
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>Esc</Kbd> cerrar
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-zinc-600">
            <Keyboard size={10} aria-hidden="true" />
            Cmd+K / Ctrl+K
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300 font-mono text-[9px]">
      {children}
    </kbd>
  );
}

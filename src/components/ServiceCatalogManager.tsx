/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Catálogo interno de servicios y precios.
 * Define las prestaciones reusables (evaluación, controles, packs, sesiones)
 * con sus montos, monedas, sesiones incluidas y validez. Cada item se puede
 * activar/desactivar sin perder histórico.
 */

import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Tag,
  Stethoscope,
  CalendarClock,
  Package,
  Clock,
  CircleDot,
  Wallet
} from 'lucide-react';
import { ServiceCatalogItem, ServiceKind } from '../types';

interface ServiceCatalogManagerProps {
  services: ServiceCatalogItem[];
  onUpdate: (services: ServiceCatalogItem[]) => void;
}

const KIND_LABEL: Record<ServiceKind, string> = {
  evaluacion: 'Evaluación',
  control: 'Control',
  pack: 'Pack',
  sesion: 'Sesión',
  otro: 'Otro'
};

const KIND_ICON: Record<ServiceKind, React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  evaluacion: Stethoscope,
  control: CalendarClock,
  pack: Package,
  sesion: Clock,
  otro: CircleDot
};

const CURRENCIES = ['CLP', 'USD', 'EUR', 'ARS', 'MXN', 'COP', 'PEN', 'BRL'];

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function ServiceCatalogManager({ services, onUpdate }: ServiceCatalogManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceCatalogItem | null>(null);
  const [creating, setCreating] = useState(false);

  const stats = useMemo(() => {
    const active = services.filter(s => s.active);
    const byKind: Record<ServiceKind, number> = {
      evaluacion: 0, control: 0, pack: 0, sesion: 0, otro: 0
    };
    services.forEach(s => { byKind[s.kind] += 1; });
    const totalMonthlyPotential = active
      .filter(s => s.kind === 'control')
      .reduce((acc, s) => acc + s.amount, 0);
    return { total: services.length, active: active.length, byKind, totalMonthlyPotential };
  }, [services]);

  const startEdit = (item: ServiceCatalogItem) => {
    setEditingId(item.id);
    setDraft({ ...item });
    setCreating(false);
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft({
      id: `svc-${Date.now()}`,
      name: '',
      kind: 'control',
      amount: 0,
      currency: 'CLP',
      active: true,
      createdAt: Date.now()
    });
  };

  const cancel = () => {
    setEditingId(null);
    setCreating(false);
    setDraft(null);
  };

  const commit = () => {
    if (!draft || !draft.name.trim()) return;
    if (creating) {
      onUpdate([...services, draft]);
    } else {
      onUpdate(services.map(s => s.id === draft.id ? draft : s));
    }
    cancel();
  };

  const toggleActive = (id: string) => {
    onUpdate(services.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const remove = (id: string) => {
    if (!window.confirm('¿Eliminar este servicio del catálogo? Los pagos ya registrados que lo referencian no se borran.')) return;
    onUpdate(services.filter(s => s.id !== id));
  };

  const grouped = useMemo(() => {
    const groups: Partial<Record<ServiceKind, ServiceCatalogItem[]>> = {};
    services.forEach(s => {
      if (!groups[s.kind]) groups[s.kind] = [];
      groups[s.kind]!.push(s);
    });
    return groups;
  }, [services]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCell label="Servicios totales" value={`${stats.total}`} />
        <KpiCell label="Activos" value={`${stats.active}`} tone="success" />
        <KpiCell label="Packs definidos" value={`${stats.byKind.pack}`} />
        <KpiCell label="Ingreso potencial mes (controles)" value={formatCurrency(stats.totalMonthlyPotential, 'CLP')} tone="success" />
      </div>

      {/* Header acciones */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Tag size={16} className="text-[#5D36FF]" aria-hidden="true" /> Catálogo de servicios y precios
          </h3>
          {!creating && !editingId && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
            >
              <Plus size={12} aria-hidden="true" /> Nuevo servicio
            </button>
          )}
        </div>

        {creating && draft && (
          <ServiceEditor
            draft={draft}
            isCreating
            onChange={setDraft}
            onCommit={commit}
            onCancel={cancel}
          />
        )}

        {(Object.entries(grouped) as [ServiceKind, ServiceCatalogItem[]][]).map(([kind, items]) => (
          <div key={kind} className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-zinc-900">
              {React.createElement(KIND_ICON[kind], { size: 14, className: 'text-[#5D36FF]' })}
              <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-zinc-300">{KIND_LABEL[kind]}</h4>
              <span className="text-[10px] font-mono text-zinc-500">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map(item => editingId === item.id && draft
                ? (
                  <ServiceEditor
                    key={item.id}
                    draft={draft}
                    isCreating={false}
                    onChange={setDraft}
                    onCommit={commit}
                    onCancel={cancel}
                  />
                ) : (
                  <ServiceRow
                    key={item.id}
                    item={item}
                    onEdit={() => startEdit(item)}
                    onToggleActive={() => toggleActive(item.id)}
                    onRemove={() => remove(item.id)}
                  />
                )
              )}
            </div>
          </div>
        ))}

        {services.length === 0 && !creating && (
          <div className="text-center py-10 space-y-2">
            <Wallet size={28} className="text-zinc-700 mx-auto" aria-hidden="true" />
            <p className="text-zinc-400 font-mono text-xs">El catálogo está vacío.</p>
            <p className="text-zinc-600 font-mono text-[10px]">Agregá tu primer servicio para empezar a estandarizar precios.</p>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Tip: los servicios desactivados no aparecen al registrar un pago, pero conservan los pagos históricos asociados.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Editor
 * ----------------------------------------------------------------------- */

interface EditorProps {
  draft: ServiceCatalogItem;
  isCreating: boolean;
  onChange: (next: ServiceCatalogItem) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function ServiceEditor({ draft, isCreating, onChange, onCommit, onCancel }: EditorProps) {
  const isPack = draft.kind === 'pack';

  return (
    <div className="bg-zinc-950/60 border border-[#5D36FF]/40 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nombre">
          <input
            type="text"
            value={draft.name}
            onChange={e => onChange({ ...draft, name: e.target.value })}
            placeholder="Ej: Pack semestral"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
            autoFocus
          />
        </Field>
        <Field label="Tipo">
          <select
            value={draft.kind}
            onChange={e => onChange({ ...draft, kind: e.target.value as ServiceKind })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          >
            {(Object.entries(KIND_LABEL) as [ServiceKind, string][]).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Monto">
          <input
            type="number"
            inputMode="decimal"
            value={draft.amount}
            onChange={e => onChange({ ...draft, amount: Number(e.target.value) || 0 })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Moneda">
          <select
            value={draft.currency}
            onChange={e => onChange({ ...draft, currency: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        {isPack && (
          <>
            <Field label="Sesiones incluidas">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={draft.sessionsIncluded ?? ''}
                onChange={e => onChange({ ...draft, sessionsIncluded: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="3"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
              />
            </Field>
            <Field label="Validez (días)">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={draft.durationDays ?? ''}
                onChange={e => onChange({ ...draft, durationDays: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="90"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
              />
            </Field>
          </>
        )}
        <Field label="Estado" wide={!isPack}>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={e => onChange({ ...draft, active: e.target.checked })}
              className="sr-only peer"
            />
            <span className="w-9 h-5 bg-zinc-800 peer-checked:bg-[#5D36FF] rounded-full relative transition" aria-hidden="true">
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${draft.active ? 'translate-x-4' : ''}`} />
            </span>
            <span className="text-xs text-white font-mono">{draft.active ? 'Activo' : 'Inactivo'}</span>
          </label>
        </Field>
      </div>
      <Field label="Notas / detalles">
        <textarea
          rows={2}
          value={draft.notes ?? ''}
          onChange={e => onChange({ ...draft, notes: e.target.value })}
          placeholder="Qué incluye, condiciones, descuentos..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 resize-none"
        />
      </Field>

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
          disabled={!draft.name.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-[10px] uppercase font-bold transition"
        >
          <Check size={11} aria-hidden="true" /> {isCreating ? 'Crear' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function ServiceRow({ item, onEdit, onToggleActive, onRemove }: {
  item: ServiceCatalogItem;
  onEdit: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={`bg-zinc-950/40 border rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 ${
      item.active ? 'border-zinc-800' : 'border-zinc-900 opacity-60'
    }`}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-sans font-bold text-sm text-white">{item.name}</span>
          {!item.active && (
            <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[8px] font-mono uppercase tracking-wider rounded">
              Inactivo
            </span>
          )}
          {item.kind === 'pack' && item.sessionsIncluded && (
            <span className="px-1.5 py-0.5 bg-[#5D36FF]/20 text-[#5D36FF] text-[8px] font-mono uppercase tracking-wider rounded">
              {item.sessionsIncluded} sesiones
            </span>
          )}
          {item.kind === 'pack' && item.durationDays && (
            <span className="px-1.5 py-0.5 bg-[#5D36FF]/20 text-[#5D36FF] text-[8px] font-mono uppercase tracking-wider rounded">
              {item.durationDays} días
            </span>
          )}
        </div>
        {item.notes && (
          <p className="text-[11px] text-zinc-500 font-mono leading-relaxed">{item.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="font-sans font-black text-base text-white whitespace-nowrap">
          {formatCurrency(item.amount, item.currency)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleActive}
            className="p-1.5 text-zinc-500 hover:text-[#5D36FF] rounded transition"
            title={item.active ? 'Desactivar' : 'Activar'}
            aria-label={item.active ? 'Desactivar servicio' : 'Activar servicio'}
          >
            <span className={`block w-7 h-3.5 rounded-full relative transition ${item.active ? 'bg-[#5D36FF]' : 'bg-zinc-800'}`}>
              <span className={`absolute top-0 left-0 w-3.5 h-3.5 bg-white rounded-full transition ${item.active ? 'translate-x-3.5' : ''}`} />
            </span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-zinc-500 hover:text-[#5D36FF] rounded transition"
            aria-label="Editar"
          >
            <Pencil size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-zinc-500 hover:text-red-400 rounded transition"
            aria-label="Eliminar"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="block text-[9px] uppercase text-zinc-500 tracking-wider font-mono">{label}</span>
      {children}
    </label>
  );
}

function KpiCell({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' }) {
  const border = tone === 'success' ? 'border-[#10B981]/30' : 'border-zinc-800';
  return (
    <div className={`bg-zinc-950/60 border ${border} rounded-lg p-3 space-y-1`}>
      <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">{label}</span>
      <span className="block text-base font-bold text-white">{value}</span>
    </div>
  );
}

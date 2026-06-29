/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de campañas de fidelización en formato kanban por estado.
 * Cada campaña tiene título, descripción, segmento objetivo, costo estimado,
 * notas y tags. Se puede arrastrar entre columnas vía botones de cambio de
 * estado (la app no tiene drag-and-drop nativo para mantener bundle liviano).
 */

import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
  Lightbulb,
  Calendar as CalIcon,
  Play,
  CheckCircle2,
  Pause,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Target,
  Tag as TagIcon
} from 'lucide-react';
import { LoyaltyCampaign, LoyaltyStatus } from '../types';

interface LoyaltyCampaignsPanelProps {
  campaigns: LoyaltyCampaign[];
  onUpdate: (next: LoyaltyCampaign[]) => void;
}

const STATUSES: { id: LoyaltyStatus; label: string; icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>; tone: 'idea' | 'plan' | 'live' | 'done' | 'paused' | 'killed' }[] = [
  { id: 'idea', label: 'Ideas', icon: Lightbulb, tone: 'idea' },
  { id: 'planificada', label: 'Planificadas', icon: CalIcon, tone: 'plan' },
  { id: 'en_curso', label: 'En curso', icon: Play, tone: 'live' },
  { id: 'implementada', label: 'Implementadas', icon: CheckCircle2, tone: 'done' },
  { id: 'pausada', label: 'Pausadas', icon: Pause, tone: 'paused' },
  { id: 'descartada', label: 'Descartadas', icon: XCircle, tone: 'killed' }
];

const STATUS_LABEL: Record<LoyaltyStatus, string> = {
  idea: 'Idea',
  planificada: 'Planificada',
  en_curso: 'En curso',
  implementada: 'Implementada',
  pausada: 'Pausada',
  descartada: 'Descartada'
};

const STATUS_ORDER: LoyaltyStatus[] = ['idea', 'planificada', 'en_curso', 'implementada', 'pausada', 'descartada'];

function nextStatus(s: LoyaltyStatus): LoyaltyStatus | null {
  const idx = STATUS_ORDER.indexOf(s);
  if (idx === -1 || idx >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[idx + 1];
}
function prevStatus(s: LoyaltyStatus): LoyaltyStatus | null {
  const idx = STATUS_ORDER.indexOf(s);
  if (idx <= 0) return null;
  return STATUS_ORDER[idx - 1];
}

function formatCurrency(amount?: number, currency = 'CLP'): string {
  if (amount === undefined) return '—';
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export default function LoyaltyCampaignsPanel({ campaigns, onUpdate }: LoyaltyCampaignsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LoyaltyCampaign | null>(null);
  const [creating, setCreating] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<LoyaltyStatus, LoyaltyCampaign[]> = {
      idea: [], planificada: [], en_curso: [], implementada: [], pausada: [], descartada: []
    };
    for (const c of campaigns) groups[c.status].push(c);
    return groups;
  }, [campaigns]);

  const stats = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'en_curso' || c.status === 'implementada').length;
    const ideas = grouped.idea.length + grouped.planificada.length;
    const budget = campaigns
      .filter(c => c.status === 'en_curso' || c.status === 'implementada')
      .reduce((acc, c) => acc + (c.costEstimate ?? 0), 0);
    return { total: campaigns.length, active, ideas, budget };
  }, [campaigns, grouped]);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft({
      id: `loy-${Date.now()}`,
      title: '',
      description: '',
      status: 'idea',
      tags: [],
      createdAt: Date.now()
    });
  };

  const startEdit = (c: LoyaltyCampaign) => {
    setEditingId(c.id);
    setCreating(false);
    setDraft({ ...c, tags: c.tags ?? [] });
  };

  const cancel = () => {
    setEditingId(null);
    setCreating(false);
    setDraft(null);
  };

  const commit = () => {
    if (!draft || !draft.title.trim()) return;
    if (creating) onUpdate([...campaigns, draft]);
    else onUpdate(campaigns.map(c => c.id === draft.id ? draft : c));
    cancel();
  };

  const changeStatus = (id: string, status: LoyaltyStatus) => {
    onUpdate(campaigns.map(c => {
      if (c.id !== id) return c;
      const patch: Partial<LoyaltyCampaign> = { status };
      if (status === 'en_curso' && !c.startedAt) patch.startedAt = Date.now();
      if (status === 'implementada' && !c.completedAt) patch.completedAt = Date.now();
      return { ...c, ...patch };
    }));
  };

  const remove = (id: string) => {
    if (!window.confirm('¿Eliminar esta campaña?')) return;
    onUpdate(campaigns.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCell label="Total" value={`${stats.total}`} />
        <KpiCell label="Activas (en curso + implementadas)" value={`${stats.active}`} tone="success" />
        <KpiCell label="Pipeline (ideas + planificadas)" value={`${stats.ideas}`} />
        <KpiCell label="Presupuesto activo" value={formatCurrency(stats.budget, 'CLP')} />
      </div>

      {/* Header */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={16} className="text-[#5D36FF]" aria-hidden="true" /> Banco de campañas de fidelización
          </h3>
          {!creating && !editingId && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
            >
              <Plus size={12} aria-hidden="true" /> Nueva campaña
            </button>
          )}
        </div>

        {(creating || editingId) && draft && (
          <CampaignEditor
            draft={draft}
            isCreating={creating}
            onChange={setDraft}
            onCommit={commit}
            onCancel={cancel}
          />
        )}

        {/* KANBAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {STATUSES.map(col => (
            <KanbanColumn
              key={col.id}
              status={col.id}
              label={col.label}
              icon={col.icon}
              tone={col.tone}
              items={grouped[col.id]}
              onEdit={startEdit}
              onChangeStatus={changeStatus}
              onRemove={remove}
              editingId={editingId}
            />
          ))}
        </div>

        {campaigns.length === 0 && !creating && (
          <div className="text-center py-10 space-y-2">
            <Sparkles size={28} className="text-zinc-700 mx-auto" aria-hidden="true" />
            <p className="text-zinc-400 font-mono text-xs">Sin campañas registradas.</p>
            <p className="text-zinc-600 font-mono text-[10px]">Vuelca tus ideas de fidelización para no perderlas.</p>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Tip: usa las flechas → para mover una campaña al siguiente estado. Las fechas de inicio/fin se autocompletan.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Columna kanban
 * ----------------------------------------------------------------------- */

function KanbanColumn({ status, label, icon: Icon, tone, items, onEdit, onChangeStatus, onRemove, editingId }: {
  status: LoyaltyStatus;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  tone: 'idea' | 'plan' | 'live' | 'done' | 'paused' | 'killed';
  items: LoyaltyCampaign[];
  onEdit: (c: LoyaltyCampaign) => void;
  onChangeStatus: (id: string, status: LoyaltyStatus) => void;
  onRemove: (id: string) => void;
  editingId: string | null;
}) {
  const toneClass = tone === 'idea' ? 'border-zinc-800'
    : tone === 'plan' ? 'border-[#5D36FF]/40'
    : tone === 'live' ? 'border-[#FFB020]/40'
    : tone === 'done' ? 'border-[#10B981]/40'
    : tone === 'paused' ? 'border-zinc-700'
    : 'border-zinc-900 opacity-70';

  return (
    <div className={`bg-zinc-950/40 border ${toneClass} rounded-lg p-3 space-y-3 min-h-[200px] flex flex-col`}>
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[#5D36FF]" aria-hidden="true" />
          <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">{label}</h4>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-[11px] text-zinc-600 font-mono flex-1 flex items-center justify-center text-center">Sin campañas</p>
      ) : (
        <ul className="space-y-2 flex-1">
          {items.map(c => editingId === c.id
            ? <li key={c.id} className="bg-zinc-900/40 border border-[#5D36FF]/30 rounded p-2 text-[10px] text-zinc-500 italic font-mono">Editando arriba...</li>
            : (
              <li key={c.id}>
                <CampaignCard
                  campaign={c}
                  onEdit={() => onEdit(c)}
                  onPrev={() => {
                    const ps = prevStatus(c.status);
                    if (ps) onChangeStatus(c.id, ps);
                  }}
                  onNext={() => {
                    const ns = nextStatus(c.status);
                    if (ns) onChangeStatus(c.id, ns);
                  }}
                  onRemove={() => onRemove(c.id)}
                  canPrev={!!prevStatus(c.status)}
                  canNext={!!nextStatus(c.status)}
                />
              </li>
            )
          )}
        </ul>
      )}

      <select
        value={status}
        onChange={() => { /* visual only */ }}
        className="hidden"
        aria-hidden="true"
      >
        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

function CampaignCard({ campaign, onEdit, onPrev, onNext, onRemove, canPrev, canNext }: {
  campaign: LoyaltyCampaign;
  onEdit: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRemove: () => void;
  canPrev: boolean;
  canNext: boolean;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3 space-y-2 group hover:border-[#5D36FF]/40 transition">
      <div className="flex items-start justify-between gap-2">
        <h5 className="font-sans font-bold text-xs text-white leading-tight">{campaign.title}</h5>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 text-zinc-500 hover:text-[#5D36FF] rounded"
            aria-label="Editar"
          >
            <Pencil size={11} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-zinc-500 hover:text-red-400 rounded"
            aria-label="Eliminar"
          >
            <Trash2 size={11} aria-hidden="true" />
          </button>
        </div>
      </div>

      {campaign.description && (
        <p className="text-[10px] font-mono text-zinc-400 leading-relaxed line-clamp-3">{campaign.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {campaign.targetSegment && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#5D36FF]/10 text-[#5D36FF] text-[9px] font-mono rounded">
            <Target size={9} aria-hidden="true" />
            {campaign.targetSegment}
          </span>
        )}
        {campaign.costEstimate !== undefined && (
          <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-mono rounded">
            {formatCurrency(campaign.costEstimate, campaign.currency ?? 'CLP')}
          </span>
        )}
        {(campaign.tags ?? []).map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[9px] font-mono rounded">
            <TagIcon size={9} aria-hidden="true" /> {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          aria-label="Estado anterior"
        >
          <ChevronLeft size={11} aria-hidden="true" />
        </button>
        <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-600">
          {campaign.startedAt && `iniciada ${new Date(campaign.startedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
          {campaign.completedAt && ` · finalizada ${new Date(campaign.completedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          aria-label="Estado siguiente"
        >
          <ChevronRight size={11} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Editor
 * ----------------------------------------------------------------------- */

function CampaignEditor({ draft, isCreating, onChange, onCommit, onCancel }: {
  draft: LoyaltyCampaign;
  isCreating: boolean;
  onChange: (next: LoyaltyCampaign) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-zinc-950/60 border border-[#5D36FF]/40 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Título de la campaña" wide>
          <input
            type="text"
            value={draft.title}
            onChange={e => onChange({ ...draft, title: e.target.value })}
            placeholder="Ej: Programa Refer-a-friend"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
            autoFocus
          />
        </Field>
        <Field label="Estado">
          <select
            value={draft.status}
            onChange={e => onChange({ ...draft, status: e.target.value as LoyaltyStatus })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          >
            {(Object.entries(STATUS_LABEL) as [LoyaltyStatus, string][]).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Segmento objetivo">
          <input
            type="text"
            value={draft.targetSegment ?? ''}
            onChange={e => onChange({ ...draft, targetSegment: e.target.value || undefined })}
            placeholder="Ej: Pacientes >6 meses"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Costo estimado">
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={draft.costEstimate ?? ''}
              onChange={e => onChange({ ...draft, costEstimate: e.target.value === '' ? undefined : Number(e.target.value) })}
              placeholder="0"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
            />
            <input
              type="text"
              value={draft.currency ?? 'CLP'}
              onChange={e => onChange({ ...draft, currency: e.target.value.toUpperCase() })}
              placeholder="CLP"
              maxLength={4}
              className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm uppercase focus:outline-none focus:border-[#5D36FF]/60"
            />
          </div>
        </Field>
        <Field label="Tags (separados por coma)" wide>
          <input
            type="text"
            value={(draft.tags ?? []).join(', ')}
            onChange={e => onChange({ ...draft, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            placeholder="retención, low-cost, automatizable"
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Descripción" wide>
          <textarea
            rows={3}
            value={draft.description}
            onChange={e => onChange({ ...draft, description: e.target.value })}
            placeholder="Qué se hace, cómo se ejecuta, qué se espera lograr..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 resize-none"
          />
        </Field>
        <Field label="Notas internas" wide>
          <textarea
            rows={2}
            value={draft.notes ?? ''}
            onChange={e => onChange({ ...draft, notes: e.target.value || undefined })}
            placeholder="Recordatorios, links, contactos..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 resize-none"
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
          <Check size={11} aria-hidden="true" /> {isCreating ? 'Crear' : 'Guardar'}
        </button>
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

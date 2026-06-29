/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Plantillas de mensajes reusables (WhatsApp, email, etc.) con placeholders.
 *
 * v5.5: ahora cada plantilla tiene 2 acciones de copia:
 *  - "Copiar texto crudo" → con placeholders sin reemplazar.
 *  - "Copiar para un paciente" → abre selector de paciente, reemplaza
 *    {{nombre}}, {{fecha}}, {{monto}}, {{control}}, {{servicio}} y registra
 *    el envío en el log de comunicaciones.
 */

import React, { useMemo, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Copy,
  CheckCircle,
  Mail,
  Phone,
  Hash,
  Instagram,
  Search,
  User
} from 'lucide-react';
import { ClientProfile, CommunicationLog, MessageChannel, MessageTemplate } from '../types';
import { Avatar } from './Avatar';

interface MessageTemplatesPanelProps {
  templates: MessageTemplate[];
  onUpdate: (next: MessageTemplate[]) => void;
  /** v5.5: clientes y handler de log para copia con contexto. */
  clients?: ClientProfile[];
  onLogCommunication?: (log: CommunicationLog) => void;
}

const CHANNEL_META: Record<MessageChannel, { label: string; icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare },
  email: { label: 'Email', icon: Mail },
  sms: { label: 'SMS', icon: Phone },
  instagram: { label: 'Instagram', icon: Instagram },
  generico: { label: 'Genérico', icon: Hash }
};

const PLACEHOLDERS = ['{{nombre}}', '{{fecha}}', '{{monto}}', '{{control}}', '{{servicio}}'];

/* Reemplaza placeholders con datos del paciente */
function fillTemplate(body: string, client: ClientProfile): string {
  const pricing = client.practice?.pricing;
  const moneyStr = pricing?.amount
    ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: pricing.currency ?? 'CLP', maximumFractionDigits: 0 }).format(pricing.amount)
    : '—';
  const today = new Date().toLocaleDateString('es-ES');
  const nextCtrl = client.practice?.nextControlAt
    ? new Date(client.practice.nextControlAt).toLocaleDateString('es-ES')
    : today;
  return body
    .replaceAll('{{nombre}}', client.name)
    .replaceAll('{{fecha}}', nextCtrl)
    .replaceAll('{{monto}}', moneyStr)
    .replaceAll('{{control}}', nextCtrl)
    .replaceAll('{{servicio}}', '');
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export default function MessageTemplatesPanel({ templates, onUpdate, clients = [], onLogCommunication }: MessageTemplatesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<MessageTemplate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  /** Plantilla actual que está pidiendo seleccionar paciente. */
  const [pickingForTemplate, setPickingForTemplate] = useState<MessageTemplate | null>(null);

  const grouped = useMemo(() => {
    const groups: Partial<Record<MessageChannel, MessageTemplate[]>> = {};
    for (const t of templates) {
      if (!groups[t.channel]) groups[t.channel] = [];
      groups[t.channel]!.push(t);
    }
    return groups;
  }, [templates]);

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft({
      id: `tpl-${Date.now()}`,
      name: '',
      channel: 'whatsapp',
      body: 'Hola {{nombre}}, ',
      category: '',
      createdAt: Date.now()
    });
  };

  const startEdit = (t: MessageTemplate) => {
    setCreating(false);
    setEditingId(t.id);
    setDraft({ ...t });
  };

  const cancel = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(null);
  };

  const commit = () => {
    if (!draft || !draft.name.trim() || !draft.body.trim()) return;
    if (creating) onUpdate([...templates, draft]);
    else onUpdate(templates.map(t => t.id === draft.id ? draft : t));
    cancel();
  };

  const remove = (id: string) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    onUpdate(templates.filter(t => t.id !== id));
  };

  const copyRaw = async (template: MessageTemplate) => {
    await copyText(template.body);
    setCopiedId(template.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const copyForClient = async (template: MessageTemplate, client: ClientProfile) => {
    const text = fillTemplate(template.body, client);
    await copyText(text);
    setCopiedId(`${template.id}-${client.id}`);
    window.setTimeout(() => setCopiedId(null), 2500);
    if (onLogCommunication) {
      onLogCommunication({
        id: `log-${Date.now()}`,
        clientId: client.id,
        channel: template.channel,
        templateId: template.id,
        preview: text.slice(0, 80),
        sentAt: Date.now()
      });
    }
    setPickingForTemplate(null);
  };

  return (
    <div className="space-y-6">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCell label="Plantillas totales" value={`${templates.length}`} />
        <KpiCell label="WhatsApp" value={`${(grouped.whatsapp ?? []).length}`} />
        <KpiCell label="Email" value={`${(grouped.email ?? []).length}`} />
        <KpiCell label="Otras" value={`${templates.length - (grouped.whatsapp ?? []).length - (grouped.email ?? []).length}`} />
      </div>

      {/* Header */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={16} className="text-[#5D36FF]" aria-hidden="true" /> Plantillas de mensajes reusables
          </h3>
          {!creating && !editingId && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
            >
              <Plus size={12} aria-hidden="true" /> Nueva plantilla
            </button>
          )}
        </div>

        {(creating || editingId) && draft && (
          <TemplateEditor
            draft={draft}
            isCreating={creating}
            onChange={setDraft}
            onCommit={commit}
            onCancel={cancel}
          />
        )}

        <div className="space-y-4">
          {(Object.entries(grouped) as [MessageChannel, MessageTemplate[]][]).map(([ch, items]) => {
            const meta = CHANNEL_META[ch];
            const Icon = meta.icon;
            return (
              <div key={ch} className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-zinc-900">
                  <Icon size={14} className="text-[#5D36FF]" aria-hidden="true" />
                  <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-zinc-300">{meta.label}</h4>
                  <span className="text-[10px] font-mono text-zinc-500">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map(t => editingId === t.id ? null : (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      copied={copiedId === t.id}
                      hasClients={clients.length > 0}
                      onEdit={() => startEdit(t)}
                      onRemove={() => remove(t.id)}
                      onCopyRaw={() => copyRaw(t)}
                      onCopyForClient={() => setPickingForTemplate(t)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {templates.length === 0 && !creating && (
          <div className="text-center py-10 space-y-2">
            <MessageSquare size={28} className="text-zinc-700 mx-auto" aria-hidden="true" />
            <p className="text-zinc-400 font-mono text-xs">Sin plantillas registradas.</p>
            <p className="text-zinc-600 font-mono text-[10px]">Crea plantillas que uses seguido (cobros, recordatorios, saludos) para reutilizarlas.</p>
          </div>
        )}
      </div>

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Tip: usa <code className="text-[#5D36FF]">{`{{nombre}}`}</code>, <code className="text-[#5D36FF]">{`{{fecha}}`}</code>, <code className="text-[#5D36FF]">{`{{monto}}`}</code> como placeholders. Se reemplazan al copiar para un paciente.
      </p>

      {/* MODAL: selector de paciente para copia con contexto */}
      {pickingForTemplate && (
        <PatientPicker
          template={pickingForTemplate}
          clients={clients}
          onPick={(client) => copyForClient(pickingForTemplate, client)}
          onCancel={() => setPickingForTemplate(null)}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Card de plantilla
 * ----------------------------------------------------------------------- */

function TemplateCard({ template, copied, hasClients, onEdit, onRemove, onCopyRaw, onCopyForClient }: {
  template: MessageTemplate;
  copied: boolean;
  hasClients: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onCopyRaw: () => void;
  onCopyForClient: () => void;
}) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-3 space-y-2 group hover:border-[#5D36FF]/30 transition flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h5 className="font-sans font-bold text-sm text-white leading-tight">{template.name}</h5>
          {template.category && (
            <span className="inline-block px-1.5 py-0.5 mt-1 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-mono uppercase tracking-wider rounded">
              {template.category}
            </span>
          )}
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
      <p className="text-[11px] font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap flex-1 max-h-[120px] overflow-y-auto scrollbar-thin">
        {template.body}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onCopyRaw}
          className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition border ${
            copied
              ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
              : 'bg-zinc-900 border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-300 hover:text-white'
          }`}
          title="Copiar texto sin reemplazar placeholders"
        >
          {copied ? <><CheckCircle size={11} aria-hidden="true" /> Copiado</> : <><Copy size={11} aria-hidden="true" /> Texto crudo</>}
        </button>
        <button
          type="button"
          onClick={onCopyForClient}
          disabled={!hasClients}
          className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
          title={hasClients ? 'Elegir paciente y copiar con sus datos rellenados' : 'No hay pacientes cargados'}
        >
          <User size={11} aria-hidden="true" /> Para un paciente
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * PatientPicker — modal de selección de paciente
 * ----------------------------------------------------------------------- */

function PatientPicker({ template, clients, onPick, onCancel }: {
  template: MessageTemplate;
  clients: ClientProfile[];
  onPick: (client: ClientProfile) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  }, [clients, query]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Elegir paciente"
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="border-b border-zinc-800 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">¿Para quién es?</h3>
              <p className="text-[10px] font-mono text-zinc-500 mt-1">
                Plantilla: <span className="text-zinc-300">{template.name}</span>
              </p>
            </div>
            <button type="button" onClick={onCancel} className="p-1.5 text-zinc-500 hover:text-white" aria-label="Cerrar">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar paciente..."
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-zinc-500 font-mono text-xs">
              Ningún paciente coincide con la búsqueda.
            </li>
          ) : filtered.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c)}
                className="w-full flex items-center gap-3 p-2.5 rounded-md text-left border border-transparent hover:bg-[#5D36FF]/10 hover:border-[#5D36FF]/30 transition group"
              >
                <Avatar name={c.name} dataUrl={c.avatarDataUrl} size={32} />
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white truncate">{c.name}</span>
                  <span className="block text-[10px] font-mono text-zinc-500 truncate">
                    {c.experienceLevel}
                    {c.practice?.contactValue && ` · ${c.practice.contactValue}`}
                  </span>
                </div>
                <Copy size={12} className="text-zinc-600 group-hover:text-[#5D36FF] shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-zinc-800 p-3 text-[10px] font-mono text-zinc-500 text-center">
          Se reemplazarán <code className="text-[#5D36FF]">{`{{nombre}}`}</code>, <code className="text-[#5D36FF]">{`{{fecha}}`}</code>, <code className="text-[#5D36FF]">{`{{monto}}`}</code> con los datos del paciente elegido.
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Editor
 * ----------------------------------------------------------------------- */

function TemplateEditor({ draft, isCreating, onChange, onCommit, onCancel }: {
  draft: MessageTemplate;
  isCreating: boolean;
  onChange: (next: MessageTemplate) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const insertPlaceholder = (ph: string) => {
    onChange({ ...draft, body: draft.body + ph });
  };

  return (
    <div className="bg-zinc-950/60 border border-[#5D36FF]/40 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Nombre">
          <input
            type="text"
            value={draft.name}
            onChange={e => onChange({ ...draft, name: e.target.value })}
            placeholder="Ej: Recordatorio de control"
            autoFocus
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Canal">
          <select
            value={draft.channel}
            onChange={e => onChange({ ...draft, channel: e.target.value as MessageChannel })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          >
            {(Object.entries(CHANNEL_META) as [MessageChannel, typeof CHANNEL_META[MessageChannel]][]).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Categoría (opcional)">
          <input
            type="text"
            value={draft.category ?? ''}
            onChange={e => onChange({ ...draft, category: e.target.value || undefined })}
            placeholder="recordatorio, cobro, fidelización..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
      </div>

      <Field label="Cuerpo del mensaje">
        <textarea
          rows={5}
          value={draft.body}
          onChange={e => onChange({ ...draft, body: e.target.value })}
          placeholder="Hola {{nombre}}, te recuerdo que..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60 font-mono resize-y"
        />
      </Field>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 mr-1">Insertar:</span>
        {PLACEHOLDERS.map(ph => (
          <button
            key={ph}
            type="button"
            onClick={() => insertPlaceholder(ph)}
            className="px-2 py-0.5 bg-[#5D36FF]/10 border border-[#5D36FF]/30 text-[#5D36FF] text-[10px] font-mono rounded hover:bg-[#5D36FF]/20 transition"
          >
            {ph}
          </button>
        ))}
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
          disabled={!draft.name.trim() || !draft.body.trim()}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-[10px] uppercase font-bold transition"
        >
          <Check size={11} aria-hidden="true" /> {isCreating ? 'Crear' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * UI auxiliares
 * ----------------------------------------------------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[9px] uppercase text-zinc-500 tracking-wider font-mono">{label}</span>
      {children}
    </label>
  );
}

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 space-y-1">
      <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">{label}</span>
      <span className="block text-base font-bold text-white">{value}</span>
    </div>
  );
}

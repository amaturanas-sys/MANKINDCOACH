/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Creador de contenido para difusión.
 * 4 modos:
 *  - Instagram (post / caption / historia)
 *  - WhatsApp (estado / mensaje masivo)
 *  - Email (newsletter / anuncio)
 *  - Manual (editor libre)
 *
 * Cada modo tiene presets que se rellenan con datos reales del workspace
 * (paciente activo, plan, métricas) y permite copiar/descargar el output.
 */

import React, { useMemo, useState } from 'react';
import {
  Pen, Instagram, MessageSquare, Mail, Copy, Download, CheckCircle, FileText,
  Sparkles, Tag, Image as ImageIcon, Book, Plus, Trash2, ExternalLink, Eye
} from 'lucide-react';
import { ClientProfile, ServiceCatalogItem, UserImage } from '../types';
import { DocumentSpec, DocumentSection, DocumentKind, DOCUMENT_PRESETS, documentHtml, downloadBlob, SectionImage, SectionImagePosition } from '../lib/exporters';
import ImagePicker from './ImagePicker';

type ContentMode = 'instagram' | 'whatsapp' | 'email' | 'manual' | 'documento';
type ContentPreset = string;

interface ContentCreatorPanelProps {
  clients: ClientProfile[];
  services: ServiceCatalogItem[];
  coachName: string;
  /** v13: banco de imágenes para el picker */
  userImages: UserImage[];
  onAddUserImage: (img: UserImage) => void;
  onRemoveUserImage: (id: string) => void;
}

interface PresetTemplate {
  id: string;
  label: string;
  description: string;
  /** Genera el cuerpo a partir del contexto */
  generate: (ctx: PresetContext) => string;
  /** Sugerencia visual / hashtags */
  hint?: string;
}

interface PresetContext {
  coachName: string;
  patientName?: string;
  servicePrice?: string;
  serviceName?: string;
  patientCount: number;
  date: string;
}

const INSTAGRAM_PRESETS: PresetTemplate[] = [
  {
    id: 'tip-semanal',
    label: 'Tip semanal',
    description: 'Consejo educativo breve sobre entrenamiento o salud.',
    generate: (c) => `💡 TIP DE LA SEMANA

¿Sabías que la consistencia vence a la intensidad en el largo plazo?

3 sesiones por semana durante 6 meses generan más adaptaciones que 6 sesiones intensas durante 1 mes.

La clave: encontrar la dosis MÍNIMA EFECTIVA que puedas sostener.

— ${c.coachName}

#entrenamientopersonalizado #fuerza #salud #medicinadeportiva`,
    hint: 'Foto sugerida: pizarrón con la frase clave, o foto de un atleta entrenando.'
  },
  {
    id: 'transformacion',
    label: 'Caso de transformación',
    description: 'Antes/después destacando proceso (con permiso del paciente).',
    generate: (c) => `🔥 TRANSFORMACIÓN REAL

${c.patientName ? `${c.patientName} llegó hace 6 meses con dolor lumbar y baja fuerza general.` : '[Nombre del paciente] llegó hace [X meses] con [situación inicial].'}

📊 Resultados:
• +35% en sentadilla 1RM
• -8% grasa corporal
• Cero molestias lumbares en los últimos 3 meses

La clave: progresión controlada, técnica primero, sin atajos.

¿Quieres ser el próximo? Link en bio.

— ${c.coachName}

#transformacion #fuerza #medicinadeportiva #training`,
    hint: 'Imagen: collage antes/después o gráfico de progreso. Pedir permiso explícito.'
  },
  {
    id: 'oferta',
    label: 'Oferta / promoción',
    description: 'Anuncio comercial con precio y CTA.',
    generate: (c) => `🎯 EVALUACIÓN INICIAL CON 20% OFF

Solo durante ${c.date}.

Incluye:
✓ Antropometría completa
✓ Evaluación de 1RM
✓ Diseño de plan personalizado
✓ Primera sesión de prescripción

Precio normal: ${c.servicePrice ?? '[$60.000]'}
Precio promoción: ${c.servicePrice ?? '[$48.000]'}

Cupos limitados. Reserva por DM.

— ${c.coachName}

#promocion #entrenamiento #salud`,
    hint: 'Imagen: tarjeta con el precio destacado. CTA visible.'
  },
  {
    id: 'educativo',
    label: 'Mito vs realidad',
    description: 'Desmonta un mito común del entrenamiento.',
    generate: (c) => `❌ MITO: "La sentadilla profunda daña las rodillas"

✅ REALIDAD: La sentadilla profunda EJECUTADA CON BUENA TÉCNICA fortalece el cartílago articular y mejora la salud de la rodilla.

Lo que sí daña la rodilla:
• Cargas excesivas mal progresadas
• Técnica deficiente bajo fatiga
• Volumen sin recuperación

La profundidad NO es el problema.

— ${c.coachName}

#mitosdelentrenamiento #fuerza #medicinadeportiva`,
    hint: 'Imagen: foto de sentadilla profunda correcta con flecha indicando la articulación.'
  }
];

const WHATSAPP_PRESETS: PresetTemplate[] = [
  {
    id: 'estado-tip',
    label: 'Estado de WhatsApp · tip rápido',
    description: 'Mensaje corto para estado/historia.',
    generate: (c) => `💪 Recordatorio del día:

3 días de entrenamiento bien hechos > 6 días apurados.

Calidad > Cantidad.

— ${c.coachName}`,
    hint: 'Acompañar con sticker o foto motivacional.'
  },
  {
    id: 'masivo-recordatorio',
    label: 'Mensaje masivo · recordatorio',
    description: 'Para enviar a todos tus pacientes activos.',
    generate: (c) => `Hola! Te recuerdo que esta semana es importante:

1. Completar tu sesión planificada
2. Registrar tu RPE en cada sesión
3. Avisar si tienes molestias

Cualquier ajuste lo coordinamos en el próximo control.

¡Vamos con todo! 💪

— ${c.coachName}`,
    hint: 'Personalizar con {{nombre}} si lo envías individual desde la sección Plantillas.'
  },
  {
    id: 'masivo-promo',
    label: 'Mensaje masivo · promoción',
    description: 'Anuncio comercial para tu lista.',
    generate: (c) => `Hola! 🎯

Durante ${c.date} tengo una promo especial:

📦 Pack trimestral (3 controles) con 15% OFF
💰 ${c.servicePrice ?? '[$100.000]'} en vez del precio regular

Si te interesa, responde este mensaje y te confirmo cupo.

— ${c.coachName}`,
    hint: 'Mandar a contactos VIP primero.'
  }
];

const EMAIL_PRESETS: PresetTemplate[] = [
  {
    id: 'newsletter-mes',
    label: 'Newsletter mensual',
    description: 'Resumen del mes con tip educativo y novedades.',
    generate: (c) => `Asunto: Tu actualización del mes — ${c.date}

Hola!

Espero te encuentres entrenando con ganas. Te dejo el resumen del mes y un tip que me parece valioso compartir.

📚 TIP DEL MES
La recuperación NO es opcional. Si entrenas 4 días, descansa 3. Si entrenas 5, descansa 2 pero asegúrate que sean días reales de descanso (sueño, alimentación, hidratación).

🎯 NOVEDADES
• Nuevos packs disponibles desde el próximo mes
• Espacios limitados para evaluaciones iniciales

📊 TU PRÓXIMO PASO
${c.patientName ? `${c.patientName}, te recuerdo que tu próximo control es importante para evaluar adaptaciones.` : 'Reserva tu próximo control para evaluar adaptaciones.'}

Cualquier consulta, responde este mail.

Un abrazo,
${c.coachName}`,
    hint: 'Personalizar el asunto con el mes actual.'
  },
  {
    id: 'anuncio-pack',
    label: 'Anuncio · nuevo servicio',
    description: 'Lanzamiento de un nuevo servicio o pack.',
    generate: (c) => `Asunto: Nuevo servicio disponible

Hola!

Quería contarte que estoy lanzando un nuevo servicio que creo te puede interesar:

🆕 ${c.serviceName ?? '[NOMBRE DEL SERVICIO]'}

¿Qué incluye?
• [punto 1]
• [punto 2]
• [punto 3]

Inversión: ${c.servicePrice ?? '[$XX.XXX]'}

Por ser parte de mi cartera tienes prioridad. Si te interesa, responde este mail para coordinar.

— ${c.coachName}`,
    hint: 'Completar nombre y detalles del servicio.'
  }
];

export default function ContentCreatorPanel({ clients, services, coachName, userImages, onAddUserImage, onRemoveUserImage }: ContentCreatorPanelProps) {
  const [mode, setMode] = useState<ContentMode>('instagram');
  const [selectedPreset, setSelectedPreset] = useState<ContentPreset>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [copied, setCopied] = useState(false);
  /* Estado específico del modo Documento */
  const [docSpec, setDocSpec] = useState<DocumentSpec | null>(null);
  /* Image picker: si está abierto y para qué destino. Puede ser portada,
     "añadir imagen nueva a la sección N", o "reemplazar la imagen K de la sección N". */
  const [pickerTarget, setPickerTarget] = useState<
    | { kind: 'cover' }
    | { kind: 'section-add'; sectionIdx: number }
    | { kind: 'section-replace'; sectionIdx: number; imageIdx: number }
    | null
  >(null);
  /* Drag & drop de secciones */
  const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);

  const presets = mode === 'instagram' ? INSTAGRAM_PRESETS
    : mode === 'whatsapp' ? WHATSAPP_PRESETS
    : mode === 'email' ? EMAIL_PRESETS
    : [];

  const ctx = useMemo<PresetContext>(() => {
    const client = clients.find(c => c.id === selectedClientId);
    const service = services.find(s => s.id === selectedServiceId);
    const servicePrice = service?.amount
      ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: service.currency ?? 'CLP', maximumFractionDigits: 0 }).format(service.amount)
      : undefined;
    return {
      coachName,
      patientName: client?.name,
      servicePrice,
      serviceName: service?.name,
      patientCount: clients.length,
      date: new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    };
  }, [clients, services, selectedClientId, selectedServiceId, coachName]);

  const applyPreset = (preset: PresetTemplate) => {
    setSelectedPreset(preset.id);
    setBody(preset.generate(ctx));
  };

  /* Re-generar cuando cambian contexto y hay preset seleccionado */
  React.useEffect(() => {
    if (!selectedPreset) return;
    const preset = presets.find(p => p.id === selectedPreset);
    if (preset) setBody(preset.generate(ctx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, selectedPreset]);

  const charCount = body.length;
  /* Límites prácticos por canal */
  const charLimit = mode === 'instagram' ? 2200
    : mode === 'whatsapp' ? 700
    : mode === 'email' ? 5000
    : 10000;

  const overLimit = charCount > charLimit;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(body); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = body; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([body], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mankind_${mode}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hint = selectedPreset
    ? presets.find(p => p.id === selectedPreset)?.hint
    : undefined;

  /* Handlers del modo Documento */
  const applyDocumentPreset = (presetId: string) => {
    const preset = DOCUMENT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setDocSpec(preset.build(coachName));
  };

  const newBlankDoc = (kind: DocumentKind) => {
    setSelectedPreset('');
    setDocSpec({
      kind, author: coachName,
      title: 'Título del documento',
      subtitle: 'Subtítulo descriptivo',
      sections: [{ heading: 'Primera sección', content: 'Escribe aquí el contenido. Separa párrafos con doble salto de línea. Para listas usa "- " al inicio de cada línea.' }]
    });
  };

  const updateDocField = <K extends keyof DocumentSpec>(key: K, value: DocumentSpec[K]) => {
    if (!docSpec) return;
    setDocSpec({ ...docSpec, [key]: value });
  };

  const updateSection = (idx: number, patch: Partial<DocumentSection>) => {
    if (!docSpec) return;
    setDocSpec({
      ...docSpec,
      sections: docSpec.sections.map((s, i) => i === idx ? { ...s, ...patch } : s)
    });
  };

  const addSection = () => {
    if (!docSpec) return;
    setDocSpec({
      ...docSpec,
      sections: [...docSpec.sections, { heading: 'Nueva sección', content: '' }]
    });
  };

  const removeSection = (idx: number) => {
    if (!docSpec) return;
    if (docSpec.sections.length <= 1) { alert('El documento debe tener al menos una sección.'); return; }
    setDocSpec({ ...docSpec, sections: docSpec.sections.filter((_, i) => i !== idx) });
  };

  const moveSection = (idx: number, direction: -1 | 1) => {
    if (!docSpec) return;
    const next = [...docSpec.sections];
    const target = idx + direction;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setDocSpec({ ...docSpec, sections: next });
  };

  const downloadDocument = () => {
    if (!docSpec) return;
    const html = documentHtml(docSpec);
    const slug = docSpec.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '_').slice(0, 50);
    downloadBlob(html, `mankind_${docSpec.kind}_${slug}.html`);
  };

  const previewDocument = () => {
    if (!docSpec) return;
    const html = documentHtml(docSpec);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  /**
   * Devuelve las imágenes "efectivas" de una sección: si tiene array `images`
   * usa eso. Si no, migra el campo legacy {imageDataUrl, imagePosition} a un
   * array de 1 elemento (transparente para el editor).
   */
  const effectiveImages = (s: DocumentSection): SectionImage[] => {
    if (s.images && s.images.length > 0) return s.images;
    if (s.imageDataUrl) {
      return [{
        id: `legacy-${Math.random().toString(36).slice(2, 8)}`,
        dataUrl: s.imageDataUrl,
        position: (s.imagePosition ?? 'top') as SectionImagePosition
      }];
    }
    return [];
  };

  /** Actualiza el array `images` de una sección y limpia los campos legacy. */
  const setSectionImages = (sectionIdx: number, images: SectionImage[]) => {
    if (!docSpec) return;
    setDocSpec({
      ...docSpec,
      sections: docSpec.sections.map((s, i) => i === sectionIdx
        ? { ...s, images, imageDataUrl: undefined, imagePosition: undefined }
        : s
      )
    });
  };

  /* Handler del ImagePicker: cambia comportamiento según destino. */
  const handleImageSelect = (dataUrl: string) => {
    if (!docSpec || !pickerTarget) return;
    if (pickerTarget.kind === 'cover') {
      setDocSpec({ ...docSpec, coverImageDataUrl: dataUrl });
      setPickerTarget(null);
      return;
    }
    const { sectionIdx } = pickerTarget;
    const section = docSpec.sections[sectionIdx];
    if (!section) { setPickerTarget(null); return; }
    const current = effectiveImages(section);
    if (pickerTarget.kind === 'section-add') {
      const newImg: SectionImage = {
        id: `img-${Date.now()}`,
        dataUrl,
        position: current.length === 0 ? 'top' : 'inline'
      };
      setSectionImages(sectionIdx, [...current, newImg]);
    } else {
      const { imageIdx } = pickerTarget;
      setSectionImages(sectionIdx, current.map((img, i) => i === imageIdx ? { ...img, dataUrl } : img));
    }
    setPickerTarget(null);
  };

  const removeCoverImage = () => {
    if (!docSpec) return;
    setDocSpec({ ...docSpec, coverImageDataUrl: undefined });
  };

  /** Quita el sub-bloque imagen `imageIdx` de la sección `sectionIdx`. */
  const removeSectionImage = (sectionIdx: number, imageIdx: number) => {
    if (!docSpec) return;
    const section = docSpec.sections[sectionIdx];
    if (!section) return;
    const next = effectiveImages(section).filter((_, i) => i !== imageIdx);
    setSectionImages(sectionIdx, next);
  };

  /** Cambia la posición de una imagen específica (top/left/right/inline/below). */
  const setSectionImagePosition = (sectionIdx: number, imageIdx: number, position: SectionImagePosition) => {
    if (!docSpec) return;
    const section = docSpec.sections[sectionIdx];
    if (!section) return;
    const next = effectiveImages(section).map((img, i) => i === imageIdx ? { ...img, position } : img);
    setSectionImages(sectionIdx, next);
  };

  /** Edita el caption opcional de una imagen. */
  const setSectionImageCaption = (sectionIdx: number, imageIdx: number, caption: string) => {
    if (!docSpec) return;
    const section = docSpec.sections[sectionIdx];
    if (!section) return;
    const next = effectiveImages(section).map((img, i) => i === imageIdx ? { ...img, caption: caption || undefined } : img);
    setSectionImages(sectionIdx, next);
  };

  /** Mueve una imagen dentro de la sección (reordenar dentro del bloque). */
  const moveSectionImage = (sectionIdx: number, imageIdx: number, direction: -1 | 1) => {
    if (!docSpec) return;
    const section = docSpec.sections[sectionIdx];
    if (!section) return;
    const next = [...effectiveImages(section)];
    const target = imageIdx + direction;
    if (target < 0 || target >= next.length) return;
    [next[imageIdx], next[target]] = [next[target], next[imageIdx]];
    setSectionImages(sectionIdx, next);
  };

  /* ──── Drag & drop de secciones ──── */
  const handleSectionDragStart = (idx: number) => setDraggedSectionIdx(idx);
  const handleSectionDragEnd = () => setDraggedSectionIdx(null);
  const handleSectionDrop = (targetIdx: number) => {
    if (!docSpec || draggedSectionIdx === null || draggedSectionIdx === targetIdx) {
      setDraggedSectionIdx(null);
      return;
    }
    const next = [...docSpec.sections];
    const [moved] = next.splice(draggedSectionIdx, 1);
    next.splice(targetIdx, 0, moved);
    setDocSpec({ ...docSpec, sections: next });
    setDraggedSectionIdx(null);
  };

  return (
    <div className="space-y-6">

      {/* HEADER + MODE SWITCHER */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
          <Pen size={18} className="text-[#5D36FF]" aria-hidden="true" />
          <div>
            <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">Creador de contenido</h3>
            <p className="font-mono text-[10px] text-zinc-500">
              Plantillas de difusión rellenadas con tus datos. Copia y publica.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <ModeButton active={mode === 'instagram'} onClick={() => { setMode('instagram'); setSelectedPreset(''); setBody(''); }}
            icon={<Instagram size={14} />} label="Instagram" />
          <ModeButton active={mode === 'whatsapp'} onClick={() => { setMode('whatsapp'); setSelectedPreset(''); setBody(''); }}
            icon={<MessageSquare size={14} />} label="WhatsApp" />
          <ModeButton active={mode === 'email'} onClick={() => { setMode('email'); setSelectedPreset(''); setBody(''); }}
            icon={<Mail size={14} />} label="Email" />
          <ModeButton active={mode === 'manual'} onClick={() => { setMode('manual'); setSelectedPreset(''); }}
            icon={<FileText size={14} />} label="Texto libre" />
          <ModeButton active={mode === 'documento'} onClick={() => { setMode('documento'); setSelectedPreset(''); setDocSpec(null); }}
            icon={<Book size={14} />} label="Documento" />
        </div>
      </div>

      {/* MODO DOCUMENTO — flujo dedicado con presets + editor estructurado */}
      {mode === 'documento' && (
        <DocumentMode
          docSpec={docSpec}
          selectedPreset={selectedPreset}
          onApplyPreset={applyDocumentPreset}
          onNewBlank={newBlankDoc}
          onUpdateField={updateDocField}
          onUpdateSection={updateSection}
          onAddSection={addSection}
          onRemoveSection={removeSection}
          onMoveSection={moveSection}
          onPreview={previewDocument}
          onDownload={downloadDocument}
          onPickCoverImage={() => setPickerTarget({ kind: 'cover' })}
          onRemoveCoverImage={removeCoverImage}
          effectiveImages={effectiveImages}
          onAddSectionImage={(sectionIdx) => setPickerTarget({ kind: 'section-add', sectionIdx })}
          onReplaceSectionImage={(sectionIdx, imageIdx) => setPickerTarget({ kind: 'section-replace', sectionIdx, imageIdx })}
          onRemoveSectionImage={removeSectionImage}
          onSetSectionImagePosition={setSectionImagePosition}
          onSetSectionImageCaption={setSectionImageCaption}
          onMoveSectionImage={moveSectionImage}
          draggedSectionIdx={draggedSectionIdx}
          onSectionDragStart={handleSectionDragStart}
          onSectionDragEnd={handleSectionDragEnd}
          onSectionDrop={handleSectionDrop}
        />
      )}

      {/* ImagePicker modal */}
      <ImagePicker
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleImageSelect}
        userImages={userImages}
        onAddUserImage={onAddUserImage}
        onRemoveUserImage={onRemoveUserImage}
      />

      {/* CONTEXT INPUTS — solo modos texto (no documento) */}
      {mode !== 'manual' && mode !== 'documento' && (
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">Paciente (opcional · llena {`{{nombre}}`})</span>
            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
              <option value="">— Sin paciente —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">Servicio (opcional · llena precio)</span>
            <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
              <option value="">— Sin servicio —</option>
              {services.filter(s => s.active).map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} · {new Intl.NumberFormat('es-CL', { style: 'currency', currency: s.currency, maximumFractionDigits: 0 }).format(s.amount)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* PRESETS — solo modos texto */}
      {mode !== 'manual' && mode !== 'documento' && (
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Sparkles size={14} className="text-[#5D36FF]" aria-hidden="true" />
            <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">Plantillas disponibles</h4>
            <span className="text-[10px] font-mono text-zinc-500">({presets.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {presets.map(p => {
              const active = selectedPreset === p.id;
              return (
                <button
                  key={p.id} type="button" onClick={() => applyPreset(p)}
                  className={`text-left p-3 rounded-lg border transition ${
                    active
                      ? 'bg-[#5D36FF]/10 border-[#5D36FF]/40'
                      : 'bg-zinc-950/40 border-zinc-800 hover:border-[#5D36FF]/30'
                  }`}
                >
                  <span className={`block font-sans font-bold text-sm ${active ? 'text-[#5D36FF]' : 'text-white'}`}>{p.label}</span>
                  <span className="block text-[10px] font-mono text-zinc-500 mt-0.5">{p.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* EDITOR — solo modos texto */}
      {mode !== 'documento' && (
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">Contenido a publicar</h4>
          <span className={`font-mono text-[10px] ${overLimit ? 'text-[#FF3C00] font-bold' : 'text-zinc-500'}`}>
            {charCount} / {charLimit} caracteres
          </span>
        </div>
        <textarea
          rows={16}
          value={body}
          onChange={e => { setBody(e.target.value); setSelectedPreset(''); }}
          placeholder={mode === 'manual'
            ? 'Escribe tu contenido aquí libremente. Útil para captions personalizados, copies de mailing, scripts de video...'
            : 'Elige una plantilla arriba o empieza a escribir.'}
          className={`w-full bg-zinc-900 border rounded px-3 py-2 text-white text-sm focus:outline-none font-mono resize-y leading-relaxed ${
            overLimit ? 'border-[#FF3C00]/60 focus:border-[#FF3C00]' : 'border-zinc-800 focus:border-[#5D36FF]/60'
          }`}
        />

        {hint && (
          <div className="bg-[#5D36FF]/5 border border-[#5D36FF]/30 rounded p-3 flex items-start gap-2 text-[11px] font-mono text-zinc-300">
            <ImageIcon size={14} className="text-[#5D36FF] shrink-0 mt-0.5" aria-hidden="true" />
            <span><strong className="text-[#5D36FF]">Sugerencia visual:</strong> {hint}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
          <button type="button" onClick={handleCopy} disabled={!body.trim()}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
              copied
                ? 'bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981]'
                : 'bg-[#5D36FF] hover:bg-[#4A22F0] text-white'
            }`}
          >
            {copied ? <><CheckCircle size={12} /> Copiado al portapapeles</> : <><Copy size={12} /> Copiar texto</>}
          </button>
          <button type="button" onClick={handleDownload} disabled={!body.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:text-white text-zinc-300 rounded font-mono text-[10px] uppercase tracking-wider transition disabled:opacity-40">
            <Download size={12} /> Descargar .txt
          </button>
          <button type="button" onClick={() => { setBody(''); setSelectedPreset(''); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded font-mono text-[10px] uppercase tracking-wider transition">
            Limpiar
          </button>

          {mode === 'instagram' && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500">
              <Tag size={11} aria-hidden="true" /> Hasta 30 hashtags por post
            </span>
          )}
        </div>
      </div>
      )}

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        {mode === 'documento'
          ? 'Los documentos generados mantienen la narrativa visual (morado, tipografías Inter + JetBrains Mono, layout limpio). Se descargan como HTML; ábrelos en el navegador y usa "Imprimir → PDF" para exportar.'
          : 'Tip: completa "Paciente" y "Servicio" arriba para que las plantillas se rellenen automáticamente con sus datos.'
        }
      </p>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border font-mono text-[11px] uppercase tracking-wider font-bold transition ${
        active
          ? 'bg-[#5D36FF] border-[#5D36FF] text-white'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-[#5D36FF]/50'
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ----------------------------------------------------------------------- *
 * Modo Documento: editor estructurado + preview/descarga
 * ----------------------------------------------------------------------- */

interface DocumentModeProps {
  docSpec: DocumentSpec | null;
  selectedPreset: string;
  onApplyPreset: (id: string) => void;
  onNewBlank: (kind: DocumentKind) => void;
  onUpdateField: <K extends keyof DocumentSpec>(key: K, value: DocumentSpec[K]) => void;
  onUpdateSection: (idx: number, patch: Partial<DocumentSection>) => void;
  onAddSection: () => void;
  onRemoveSection: (idx: number) => void;
  onMoveSection: (idx: number, direction: -1 | 1) => void;
  onPreview: () => void;
  onDownload: () => void;
  /* Portada */
  onPickCoverImage: () => void;
  onRemoveCoverImage: () => void;
  /* Imágenes multi por sección (bloques movibles) */
  effectiveImages: (s: DocumentSection) => SectionImage[];
  onAddSectionImage: (sectionIdx: number) => void;
  onReplaceSectionImage: (sectionIdx: number, imageIdx: number) => void;
  onRemoveSectionImage: (sectionIdx: number, imageIdx: number) => void;
  onSetSectionImagePosition: (sectionIdx: number, imageIdx: number, position: SectionImagePosition) => void;
  onSetSectionImageCaption: (sectionIdx: number, imageIdx: number, caption: string) => void;
  onMoveSectionImage: (sectionIdx: number, imageIdx: number, direction: -1 | 1) => void;
  /* Drag & drop de secciones */
  draggedSectionIdx: number | null;
  onSectionDragStart: (idx: number) => void;
  onSectionDragEnd: () => void;
  onSectionDrop: (targetIdx: number) => void;
}

const DOC_KIND_LABELS: Record<DocumentKind, string> = {
  ebook: 'Mini-guía / Ebook',
  flyer: 'Flyer (1 página)',
  ficha: 'Ficha técnica',
  manual: 'Manual',
  infografia: 'Infografía 1-pager'
};

function DocumentMode({
  docSpec, selectedPreset,
  onApplyPreset, onNewBlank, onUpdateField, onUpdateSection,
  onAddSection, onRemoveSection, onMoveSection,
  onPreview, onDownload,
  onPickCoverImage, onRemoveCoverImage,
  effectiveImages,
  onAddSectionImage, onReplaceSectionImage, onRemoveSectionImage,
  onSetSectionImagePosition, onSetSectionImageCaption, onMoveSectionImage,
  draggedSectionIdx, onSectionDragStart, onSectionDragEnd, onSectionDrop
}: DocumentModeProps) {

  /* Si no hay documento todavía: elegir preset o crear en blanco */
  if (!docSpec) {
    return (
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 space-y-5 shadow-lg">
        <div className="border-b border-zinc-800 pb-3">
          <h4 className="font-sans font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Book size={14} className="text-[#5D36FF]" aria-hidden="true" /> Elige un punto de partida
          </h4>
          <p className="font-mono text-[10px] text-zinc-500 mt-1">
            Plantillas pre-armadas con estructura sugerida, o crea uno desde cero.
          </p>
        </div>

        {/* Plantillas pre-armadas */}
        <div className="space-y-2">
          <span className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold">Plantillas listas</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {DOCUMENT_PRESETS.map(p => (
              <button
                key={p.id} type="button" onClick={() => onApplyPreset(p.id)}
                className="text-left p-3 rounded-lg border bg-zinc-950/40 border-zinc-800 hover:border-[#5D36FF]/50 hover:bg-[#5D36FF]/5 transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-sans font-bold text-sm text-white">{p.label}</span>
                  <span className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-[8px] font-mono uppercase rounded">
                    {DOC_KIND_LABELS[p.kind]}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Crear desde cero */}
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <span className="block text-[9px] uppercase font-mono tracking-wider text-zinc-400 font-bold">O empieza en blanco</span>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {(Object.entries(DOC_KIND_LABELS) as [DocumentKind, string][]).map(([kind, label]) => (
              <button
                key={kind} type="button" onClick={() => onNewBlank(kind)}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-[#5D36FF]/50 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
              >
                <Plus size={10} aria-hidden="true" /> {label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* Editor del documento */
  return (
    <div className="space-y-4">

      {/* Toolbar superior */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap shadow-lg">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-[#5D36FF]/15 text-[#5D36FF] text-[10px] font-mono uppercase tracking-wider rounded font-bold">
            <Book size={11} className="inline mr-1" /> {DOC_KIND_LABELS[docSpec.kind]}
          </span>
          {selectedPreset && (
            <span className="text-[10px] font-mono text-zinc-500">
              Basado en: {DOCUMENT_PRESETS.find(p => p.id === selectedPreset)?.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { if (window.confirm('¿Descartar este documento y empezar de nuevo?')) onUpdateField('sections', [{ heading: '', content: '' }]); window.location.reload(); }}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded font-mono text-[10px] uppercase tracking-wider transition">
            ← Volver a plantillas
          </button>
          <button type="button" onClick={onPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:text-white text-zinc-300 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
            <Eye size={11} aria-hidden="true" /> Vista previa
          </button>
          <button type="button" onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
            <Download size={11} aria-hidden="true" /> Descargar HTML
          </button>
        </div>
      </div>

      {/* Metadatos */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3 shadow-lg">
        <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white pb-2 border-b border-zinc-800">Portada del documento</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Tipo de documento">
            <select value={docSpec.kind} onChange={e => onUpdateField('kind', e.target.value as DocumentKind)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
              {(Object.entries(DOC_KIND_LABELS) as [DocumentKind, string][]).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Autor (aparece en la portada)">
            <input type="text" value={docSpec.author} onChange={e => onUpdateField('author', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
          <Field label="Título *" wide>
            <input type="text" value={docSpec.title} onChange={e => onUpdateField('title', e.target.value)}
              placeholder="Título principal del documento"
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-base font-bold focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
          <Field label="Subtítulo (opcional)" wide>
            <input type="text" value={docSpec.subtitle ?? ''} onChange={e => onUpdateField('subtitle', e.target.value || undefined)}
              placeholder="Bajada o descripción corta"
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
        </div>

        {/* Imagen de portada */}
        <div className="pt-3 border-t border-zinc-800">
          <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500 mb-2">Imagen de portada (opcional)</span>
          {docSpec.coverImageDataUrl ? (
            <div className="flex items-center gap-3 bg-zinc-950/40 border border-zinc-800 rounded p-3">
              <img src={docSpec.coverImageDataUrl} alt="" className="w-20 h-20 object-contain bg-[#5D36FF]/10 rounded border border-zinc-800" />
              <div className="flex-1">
                <p className="text-[11px] font-mono text-zinc-300">Imagen seleccionada</p>
                <p className="text-[10px] font-mono text-zinc-500">Aparecerá en la portada del documento debajo del subtítulo</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={onPickCoverImage}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-300 hover:text-white rounded font-mono text-[10px] uppercase tracking-wider transition">
                  Cambiar
                </button>
                <button type="button" onClick={onRemoveCoverImage}
                  className="p-1.5 text-zinc-500 hover:text-red-400 rounded" aria-label="Quitar imagen">
                  <Trash2 size={11} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={onPickCoverImage}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950/40 border border-zinc-800 border-dashed hover:border-[#5D36FF]/50 hover:bg-[#5D36FF]/5 text-zinc-400 hover:text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
              <ImageIcon size={12} aria-hidden="true" /> Agregar imagen de portada
            </button>
          )}
        </div>
      </div>

      {/* Secciones */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">
            Secciones ({docSpec.sections.length})
          </h4>
          <button type="button" onClick={onAddSection}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF]/10 border border-[#5D36FF]/30 hover:bg-[#5D36FF]/20 text-[#5D36FF] rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
            <Plus size={10} aria-hidden="true" /> Nueva sección
          </button>
        </div>
        <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
          Formato: separa párrafos con doble salto de línea. Para listas, empieza cada línea con <code className="text-[#5D36FF]">-</code> (no ordenada) o <code className="text-[#5D36FF]">1.</code> (numerada). Marca secciones clave con "Destacar".
        </p>

        <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
          Las secciones son <strong className="text-zinc-300">bloques movibles</strong>: arrástralas por el handle <span className="text-[#5D36FF]">⠿</span>, usá las flechas ↑/↓ o reordena imágenes dentro de cada sección.
        </p>

        <div className="space-y-3">
          {docSpec.sections.map((sec, idx) => {
            const sectionImages = effectiveImages(sec);
            const isDragging = draggedSectionIdx === idx;
            return (
            <div
              key={idx}
              onDragOver={(e) => { if (draggedSectionIdx !== null) e.preventDefault(); }}
              onDrop={() => onSectionDrop(idx)}
              className={`border rounded-lg p-3 space-y-2 transition ${
                isDragging ? 'opacity-50 border-[#5D36FF] border-dashed' : ''
              } ${sec.highlight ? 'bg-[#5D36FF]/5 border-[#5D36FF]/30' : 'bg-zinc-950/40 border-zinc-800'} ${
                draggedSectionIdx !== null && draggedSectionIdx !== idx ? 'hover:border-[#5D36FF]/40' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Handle de drag */}
                <span
                  draggable
                  onDragStart={() => onSectionDragStart(idx)}
                  onDragEnd={onSectionDragEnd}
                  className="cursor-grab active:cursor-grabbing select-none text-zinc-500 hover:text-[#5D36FF] px-1 font-bold text-base"
                  title="Arrastra para reordenar la sección"
                  aria-label="Mover sección"
                >
                  ⠿
                </span>
                <span className="px-1.5 py-0.5 bg-zinc-900 text-zinc-400 text-[9px] font-mono uppercase rounded font-bold">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <input
                  type="text" value={sec.heading} onChange={e => onUpdateSection(idx, { heading: e.target.value })}
                  placeholder="Título de la sección"
                  className="flex-1 bg-transparent border-b border-zinc-800 focus:border-[#5D36FF]/60 text-white text-sm font-bold focus:outline-none py-1"
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <label className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-zinc-500 cursor-pointer mr-1">
                    <input type="checkbox" checked={!!sec.highlight} onChange={e => onUpdateSection(idx, { highlight: e.target.checked })}
                      className="accent-[#5D36FF]" />
                    Destacar
                  </label>
                  <button type="button" onClick={() => onMoveSection(idx, -1)} disabled={idx === 0}
                    className="p-1 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Subir">↑</button>
                  <button type="button" onClick={() => onMoveSection(idx, 1)} disabled={idx === docSpec.sections.length - 1}
                    className="p-1 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" aria-label="Bajar">↓</button>
                  <button type="button" onClick={() => onRemoveSection(idx)}
                    className="p-1 text-zinc-500 hover:text-red-400" aria-label="Eliminar">
                    <Trash2 size={11} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <textarea
                rows={6} value={sec.content} onChange={e => onUpdateSection(idx, { content: e.target.value })}
                placeholder="Contenido de la sección. Doble salto = nuevo párrafo. Inicia con - para listas."
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60 font-mono resize-y leading-relaxed"
              />

              {/* ──── Galería de imágenes / pictogramas de la sección ──── */}
              <div className="space-y-2">
                {sectionImages.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <ImageIcon size={9} aria-hidden="true" /> Imágenes / pictogramas de esta sección ({sectionImages.length})
                    </span>
                    {sectionImages.map((img, imgIdx) => (
                      <div key={img.id} className="bg-zinc-950/60 border border-zinc-800 rounded p-2 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <img
                            src={img.dataUrl} alt=""
                            className="w-14 h-14 object-contain bg-[#5D36FF]/10 rounded border border-zinc-800 shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[8px] font-mono text-zinc-500">Posición:</span>
                              {(['top', 'left', 'right', 'inline', 'below'] as const).map(pos => (
                                <button
                                  key={pos} type="button"
                                  onClick={() => onSetSectionImagePosition(idx, imgIdx, pos)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider transition ${
                                    img.position === pos
                                      ? 'bg-[#5D36FF] text-white font-bold'
                                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                                  title={
                                    pos === 'top' ? 'Sobre el texto, full width' :
                                    pos === 'left' ? 'A la izquierda del texto' :
                                    pos === 'right' ? 'A la derecha del texto' :
                                    pos === 'inline' ? 'Galería entre el texto' :
                                    'Debajo del texto, full width'
                                  }
                                >
                                  {pos === 'top' ? '↑ Arriba' :
                                   pos === 'left' ? '← Izq' :
                                   pos === 'right' ? 'Der →' :
                                   pos === 'inline' ? '◫ Inline' : '↓ Debajo'}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={img.caption ?? ''}
                              onChange={e => onSetSectionImageCaption(idx, imgIdx, e.target.value)}
                              placeholder="Caption / leyenda (opcional)"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-white text-[10px] focus:outline-none focus:border-[#5D36FF]/60"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button type="button"
                              onClick={() => onMoveSectionImage(idx, imgIdx, -1)} disabled={imgIdx === 0}
                              className="p-0.5 text-zinc-500 hover:text-white disabled:opacity-30 text-[10px]"
                              aria-label="Subir imagen">↑</button>
                            <button type="button"
                              onClick={() => onMoveSectionImage(idx, imgIdx, 1)} disabled={imgIdx === sectionImages.length - 1}
                              className="p-0.5 text-zinc-500 hover:text-white disabled:opacity-30 text-[10px]"
                              aria-label="Bajar imagen">↓</button>
                          </div>
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button type="button" onClick={() => onReplaceSectionImage(idx, imgIdx)}
                              className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-300 hover:text-white rounded font-mono text-[8px] uppercase">
                              ↻
                            </button>
                            <button type="button" onClick={() => onRemoveSectionImage(idx, imgIdx)}
                              className="p-1 text-zinc-500 hover:text-red-400" aria-label="Quitar imagen">
                              <Trash2 size={10} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón añadir nueva imagen/pictograma */}
                <button type="button" onClick={() => onAddSectionImage(idx)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-950/40 border border-zinc-800 border-dashed hover:border-[#5D36FF]/40 hover:bg-[#5D36FF]/5 hover:text-white text-zinc-500 rounded font-mono text-[10px] uppercase tracking-wider transition">
                  <Plus size={11} aria-hidden="true" />
                  <ImageIcon size={11} aria-hidden="true" />
                  {sectionImages.length === 0 ? 'Añadir pictograma / imagen' : 'Añadir otro pictograma / imagen'}
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Call to action + contacto */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3 shadow-lg">
        <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white pb-2 border-b border-zinc-800">
          Llamada a acción final (opcional)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Texto principal del CTA">
            <input type="text" value={docSpec.callToAction ?? ''} onChange={e => onUpdateField('callToAction', e.target.value || undefined)}
              placeholder="Ej: Reserva tu cupo · Agenda tu evaluación"
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
          <Field label="Contacto (debajo del CTA)">
            <input type="text" value={docSpec.contact ?? ''} onChange={e => onUpdateField('contact', e.target.value || undefined)}
              placeholder="WhatsApp +56 9 ... · @usuario · email@..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
        </div>
      </div>

      {/* Acciones finales */}
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={onPreview}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:text-white text-zinc-300 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
          <Eye size={11} aria-hidden="true" /> Vista previa en nueva pestaña
        </button>
        <button type="button" onClick={onDownload}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition">
          <Download size={11} aria-hidden="true" /> Descargar HTML imprimible
        </button>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500">
          <ExternalLink size={10} aria-hidden="true" /> El HTML se ve igual al previsualizar e imprimir → PDF
        </span>
      </div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block space-y-1 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="block text-[9px] uppercase tracking-wider font-mono text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

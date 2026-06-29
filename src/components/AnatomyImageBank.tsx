/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banco de ilustraciones anatómicas con LICENCIA.
 *
 * El coach importa ilustraciones (CC / dominio público) desde su navegador,
 * indica autor y licencia (OBLIGATORIOS) y las etiqueta por grupo muscular.
 * Se guardan offline (dataURL comprimido) y se muestran en la Biblioteca de
 * movimientos junto a la atribución, que siempre viaja con la imagen.
 *
 * Exporta:
 *  - <AnatomyImageBank>: modal de gestión (alta/baja/listado, con filtros).
 *  - <AnatomyImageStrip>: tira de miniaturas + atribución para un ejercicio.
 *  - imagesForMuscles(): helper de emparejamiento por músculo.
 */

import { useMemo, useRef, useState } from 'react';
import {
  X, Plus, Trash2, Upload, ImageIcon, ExternalLink, AlertTriangle, Check
} from 'lucide-react';
import { AnatomyImage, ImageLicense } from '../types';
import { IMAGE_LICENSES, IMAGE_LICENSE_BY_CODE } from '../constants';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUPS_ORDERED, MuscleGroup } from '../lib/nsca';

const MAX_DIMENSION = 1024;
const TARGET_QUALITY = 0.85;
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB original

/** Comprime una imagen a JPEG ≤1024px (SVG se conserva como vector). */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      if (file.type === 'image/svg+xml') { resolve(String(reader.result ?? '')); return; }
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
          if (w >= h) { h = Math.round((h / w) * MAX_DIMENSION); w = MAX_DIMENSION; }
          else { w = Math.round((w / h) * MAX_DIMENSION); h = MAX_DIMENSION; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas no disponible')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL('image/jpeg', TARGET_QUALITY)); }
        catch (e) { reject(e as Error); }
      };
      img.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}

/** Línea de atribución legible a partir de una imagen. */
export function attributionLine(img: AnatomyImage): string {
  const lic = IMAGE_LICENSE_BY_CODE[img.license];
  return `${img.name} — ${img.author} · ${lic ? lic.label : img.license}`;
}

/** Imágenes cuyo etiquetado muscular intersecta con los músculos dados. */
export function imagesForMuscles(images: AnatomyImage[], muscles: string[]): AnatomyImage[] {
  if (!muscles.length) return [];
  const set = new Set(muscles);
  return images.filter(img => img.muscleGroups.some(m => set.has(m)));
}

/* ----------------------------------------------------------------------- *
 * Tira de miniaturas con atribución (se muestra dentro de cada ejercicio)
 * ----------------------------------------------------------------------- */
export function AnatomyImageStrip({ images }: { images: AnatomyImage[] }) {
  const [zoom, setZoom] = useState<AnatomyImage | null>(null);
  if (!images.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {images.map(img => {
          const lic = IMAGE_LICENSE_BY_CODE[img.license];
          return (
            <figure key={img.id} className="w-28 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <button type="button" onClick={() => setZoom(img)} className="block w-full" title="Ampliar">
                <img src={img.dataUrl} alt={img.name} className="w-full h-20 object-cover" loading="lazy" />
              </button>
              <figcaption className="p-1.5 space-y-0.5">
                <p className="text-[10px] text-zinc-300 leading-tight line-clamp-2">{img.name}</p>
                <p className="font-mono text-[8px] text-zinc-500 leading-tight">
                  {img.author} · {lic ? lic.code : img.license}
                </p>
              </figcaption>
            </figure>
          );
        })}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoom(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-3xl w-full bg-[#121214] border border-zinc-800 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-zinc-800">
              <h3 className="text-white text-sm font-bold">{zoom.name}</h3>
              <button type="button" onClick={() => setZoom(null)} className="text-zinc-400 hover:text-white"><X size={16} /></button>
            </div>
            <img src={zoom.dataUrl} alt={zoom.name} className="w-full max-h-[60vh] object-contain bg-black" />
            <div className="p-3 font-mono text-[10px] text-zinc-400 space-y-1">
              <p><span className="text-zinc-500">Autor:</span> {zoom.author}</p>
              <p>
                <span className="text-zinc-500">Licencia:</span> {IMAGE_LICENSE_BY_CODE[zoom.license]?.label ?? zoom.license}
                {IMAGE_LICENSE_BY_CODE[zoom.license]?.url && (
                  <a href={IMAGE_LICENSE_BY_CODE[zoom.license].url} target="_blank" rel="noopener noreferrer" className="text-[#5D36FF] hover:underline ml-1">ver licencia</a>
                )}
              </p>
              {zoom.sourceUrl && (
                <p className="flex items-center gap-1">
                  <span className="text-zinc-500">Fuente:</span>
                  <a href={zoom.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#5D36FF] hover:underline inline-flex items-center gap-1 break-all">
                    {zoom.sourceUrl} <ExternalLink size={10} />
                  </a>
                </p>
              )}
              {zoom.notes && <p><span className="text-zinc-500">Notas:</span> {zoom.notes}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Modal de gestión del banco
 * ----------------------------------------------------------------------- */
interface AnatomyImageBankProps {
  open: boolean;
  onClose: () => void;
  images: AnatomyImage[];
  onAdd: (img: AnatomyImage) => void;
  onRemove: (id: string) => void;
}

const EMPTY_FORM = {
  name: '', author: '', license: 'CC BY 4.0' as ImageLicense, sourceUrl: '', notes: '',
  muscleGroups: [] as string[], dataUrl: ''
};

export default function AnatomyImageBank({ open, onClose, images, onAdd, onRemove }: AnatomyImageBankProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filterMuscle, setFilterMuscle] = useState<string>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  const shown = useMemo(
    () => filterMuscle === 'all' ? images : images.filter(i => i.muscleGroups.includes(filterMuscle)),
    [images, filterMuscle]
  );

  if (!open) return null;

  const toggleMuscle = (m: string) =>
    setForm(f => ({ ...f, muscleGroups: f.muscleGroups.includes(m) ? f.muscleGroups.filter(x => x !== m) : [...f.muscleGroups, m] }));

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE) { setError('La imagen supera 8 MB. Usa una más liviana.'); return; }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      setForm(f => ({ ...f, dataUrl, name: f.name || file.name.replace(/\.[^.]+$/, '') }));
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };

  const canSave =
    form.dataUrl !== '' &&
    form.name.trim() !== '' &&
    form.author.trim() !== '' &&
    form.muscleGroups.length > 0;

  const handleSave = () => {
    if (!canSave) {
      setError('Faltan campos obligatorios: imagen, título, autor y al menos un músculo.');
      return;
    }
    onAdd({
      id: `anat-${Date.now()}-${Math.round(performance.now())}`,
      name: form.name.trim(),
      dataUrl: form.dataUrl,
      muscleGroups: form.muscleGroups,
      author: form.author.trim(),
      license: form.license,
      sourceUrl: form.sourceUrl.trim() || undefined,
      notes: form.notes.trim() || undefined,
      createdAt: Date.now()
    });
    setForm({ ...EMPTY_FORM });
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const selectedLicense = IMAGE_LICENSE_BY_CODE[form.license];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-[#121214] border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-[#121214] z-10">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-[#5D36FF]" />
            <h2 className="text-white font-bold text-base">Ilustraciones anatómicas (con licencia)</h2>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ---- ALTA ---- */}
          <section className="space-y-3">
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">Añadir ilustración</h3>

            {/* uploader */}
            <div className="border border-dashed border-zinc-700 rounded-lg p-3 text-center">
              {form.dataUrl ? (
                <img src={form.dataUrl} alt="preview" className="max-h-40 mx-auto rounded" />
              ) : (
                <p className="text-zinc-500 text-xs py-6">Sube una imagen (JPG/PNG/SVG, ≤8 MB)</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="mt-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-300 rounded-lg font-mono text-[10px] uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Upload size={12} /> {busy ? 'Procesando…' : form.dataUrl ? 'Cambiar imagen' : 'Subir imagen'}
              </button>
            </div>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Título *</span>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
                placeholder="p. ej. Músculos del muslo (vista anterior)" />
            </label>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Autor / crédito *</span>
              <input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
                placeholder="p. ej. AnatomyTOOL / autor original" />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Licencia *</span>
                <select value={form.license} onChange={e => setForm(f => ({ ...f, license: e.target.value as ImageLicense }))}
                  className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
                  {IMAGE_LICENSES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">URL fuente</span>
                <input value={form.sourceUrl} onChange={e => setForm(f => ({ ...f, sourceUrl: e.target.value }))}
                  className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
                  placeholder="https://…" />
              </label>
            </div>

            {selectedLicense?.nonCommercial && (
              <p className="flex items-start gap-1.5 text-[10px] text-[#FFB020] font-mono leading-relaxed">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                Licencia NO comercial: revisa si tu uso de la app es comercial antes de incluirla.
              </p>
            )}

            {/* músculos */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Músculos que ilustra * </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS_ORDERED.map((m: MuscleGroup) => {
                  const on = form.muscleGroups.includes(m);
                  return (
                    <button key={m} type="button" onClick={() => toggleMuscle(m)}
                      className={`px-2 py-1 rounded-md font-mono text-[10px] border transition ${on ? 'bg-[#5D36FF] border-[#5D36FF] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
                      {MUSCLE_GROUP_LABELS[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Notas</span>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
            </label>

            {error && (
              <p className="flex items-start gap-1.5 text-[11px] text-[#FF3C00] font-mono">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
              </p>
            )}

            <button type="button" onClick={handleSave} disabled={!canSave}
              className="w-full px-4 py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold inline-flex items-center justify-center gap-2">
              <Plus size={14} /> Guardar ilustración
            </button>
          </section>

          {/* ---- LISTADO ---- */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                Guardadas ({images.length})
              </h3>
              <select value={filterMuscle} onChange={e => setFilterMuscle(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-[11px] focus:outline-none">
                <option value="all">Todos los músculos</option>
                {MUSCLE_GROUPS_ORDERED.map(m => <option key={m} value={m}>{MUSCLE_GROUP_LABELS[m]}</option>)}
              </select>
            </div>

            {shown.length === 0 ? (
              <p className="text-zinc-500 text-xs py-8 text-center">Aún no hay ilustraciones{filterMuscle !== 'all' ? ' para ese músculo' : ''}.</p>
            ) : (
              <ul className="space-y-2">
                {shown.map(img => {
                  const lic = IMAGE_LICENSE_BY_CODE[img.license];
                  return (
                    <li key={img.id} className="flex gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-2">
                      <img src={img.dataUrl} alt={img.name} className="w-16 h-16 object-cover rounded shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-semibold truncate">{img.name}</p>
                        <p className="font-mono text-[10px] text-zinc-400 truncate">{img.author} · {lic ? lic.code : img.license}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {img.muscleGroups.map(m => (
                            <span key={m} className="px-1.5 py-0.5 bg-zinc-800 rounded text-[8px] font-mono text-zinc-400">
                              {MUSCLE_GROUP_LABELS[m as MuscleGroup] ?? m}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button type="button" onClick={() => onRemove(img.id)} title="Eliminar"
                        className="text-zinc-500 hover:text-[#FF3C00] shrink-0 self-start"><Trash2 size={14} /></button>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="flex items-start gap-1.5 text-[10px] text-zinc-500 font-mono leading-relaxed pt-2 border-t border-zinc-800">
              <Check size={12} className="mt-0.5 shrink-0 text-[#10B981]" />
              Usa solo imágenes con licencia que permita reutilización (CC0, CC BY, CC BY-SA…). La atribución (autor + licencia) se muestra siempre junto a la imagen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

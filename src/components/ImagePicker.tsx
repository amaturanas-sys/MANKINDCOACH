/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal de selección de imagen para insertar en documentos.
 * Dos tabs:
 *  - Pictogramas: biblioteca SVG nativa categorizada
 *  - Mis imágenes: banco personal subido por el usuario (base64 comprimido)
 *
 * Al seleccionar devuelve el dataURL al caller. Permite subir nuevas imágenes
 * y opcionalmente guardarlas en el banco personal.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  X, Image as ImageIcon, Upload, Search, Trash2, Sparkles, Check, ExternalLink
} from 'lucide-react';
import { UserImage } from '../types';
import {
  PICTOGRAMS, PICTOGRAM_CATEGORY_LABELS, PictogramCategory,
  pictogramDataUrl, PictogramView
} from '../lib/pictograms';

interface ImagePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dataUrl: string, source: 'pictogram' | 'user') => void;
  userImages: UserImage[];
  onAddUserImage: (img: UserImage) => void;
  onRemoveUserImage: (id: string) => void;
}

type Tab = 'pictogramas' | 'mias';

const MAX_DIMENSION = 600;
const TARGET_QUALITY = 0.82;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB original

/** Comprime una imagen subida a JPEG ≤600px de ancho. */
async function compressImage(file: File): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen'));
      img.onload = () => {
        const { width, height } = img;
        let targetW = width;
        let targetH = height;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width >= height) {
            targetW = MAX_DIMENSION;
            targetH = Math.round((height / width) * MAX_DIMENSION);
          } else {
            targetH = MAX_DIMENSION;
            targetW = Math.round((width / height) * MAX_DIMENSION);
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas no disponible')); return; }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        try {
          /* Para SVG conservamos formato original (no comprimir vector) */
          const isSvg = file.type === 'image/svg+xml';
          if (isSvg) {
            resolve({ dataUrl: String(reader.result ?? ''), sizeKb: file.size / 1024 });
            return;
          }
          const dataUrl = canvas.toDataURL('image/jpeg', TARGET_QUALITY);
          const sizeKb = Math.round(dataUrl.length * 0.75 / 1024); // base64 → bytes aprox
          resolve({ dataUrl, sizeKb });
        } catch (err) {
          reject(err as Error);
        }
      };
      img.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}

export default function ImagePicker({ open, onClose, onSelect, userImages, onAddUserImage, onRemoveUserImage }: ImagePickerProps) {
  // IMPORTANTE: todos los hooks deben llamarse SIEMPRE en el mismo orden.
  // El early return por `open === false` debe ir DESPUÉS de los hooks; de lo
  // contrario al abrir el picker React detecta un número distinto de hooks
  // entre renders y lanza el error #310 ("Rendered more hooks than during
  // the previous render").
  const [tab, setTab] = useState<Tab>('pictogramas');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | PictogramCategory>('all');
  const [uploadName, setUploadName] = useState('');
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [uploadSize, setUploadSize] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPictograms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PICTOGRAMS.filter(p => {
      if (filterCategory !== 'all' && p.category !== filterCategory) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.id.includes(q)) return false;
      return true;
    });
  }, [search, filterCategory]);

  const filteredUserImages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return userImages;
    return userImages.filter(u => u.name.toLowerCase().includes(q) || (u.category ?? '').toLowerCase().includes(q));
  }, [search, userImages]);

  if (!open) return null;

  const handleFile = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Solo se permiten imágenes (JPG/PNG/WebP/SVG).');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('La imagen es muy grande (máx 5MB original).');
      return;
    }
    try {
      const { dataUrl, sizeKb } = await compressImage(file);
      setUploadDataUrl(dataUrl);
      setUploadSize(sizeKb);
      if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Error al procesar la imagen.');
    }
  };

  const handleSaveAndUse = () => {
    if (!uploadDataUrl || !uploadName.trim()) return;
    const img: UserImage = {
      id: `img-${Date.now()}`,
      name: uploadName.trim(),
      dataUrl: uploadDataUrl,
      createdAt: Date.now()
    };
    onAddUserImage(img);
    onSelect(uploadDataUrl, 'user');
    resetUploader();
    onClose();
  };

  const handleUseWithoutSaving = () => {
    if (!uploadDataUrl) return;
    onSelect(uploadDataUrl, 'user');
    resetUploader();
    onClose();
  };

  const resetUploader = () => {
    setUploadDataUrl(null);
    setUploadName('');
    setUploadSize(0);
    setUploadError(null);
  };

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Seleccionar imagen"
      className="fixed inset-0 z-[230] flex items-start justify-center pt-[5vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-4xl bg-surface-card border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* HEADER */}
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon size={18} className="text-[#5D36FF]" aria-hidden="true" />
            <div>
              <h3 className="font-sans font-bold text-base text-white uppercase tracking-wider">Banco de imágenes</h3>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                Selecciona un pictograma o sube tu propia imagen
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white" aria-label="Cerrar">
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {/* TABS + SEARCH */}
        <div className="border-b border-zinc-800 px-4 pt-3 pb-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button" onClick={() => setTab('pictogramas')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition ${
                tab === 'pictogramas' ? 'bg-[#5D36FF] text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Sparkles size={11} aria-hidden="true" />
              Pictogramas ({PICTOGRAMS.length})
            </button>
            <button
              type="button" onClick={() => setTab('mias')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition ${
                tab === 'mias' ? 'bg-[#5D36FF] text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ImageIcon size={11} aria-hidden="true" />
              Mis imágenes ({userImages.length})
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tab === 'pictogramas' ? 'Buscar pictograma...' : 'Buscar en mis imágenes...'}
                className="w-full bg-zinc-900 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60"
              />
            </div>
            {tab === 'pictogramas' && (
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value as typeof filterCategory)}
                className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#5D36FF]/60"
              >
                <option value="all">Todas las categorías</option>
                {(Object.entries(PICTOGRAM_CATEGORY_LABELS) as [PictogramCategory, string][]).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            )}
            {tab === 'mias' && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
              >
                <Upload size={11} aria-hidden="true" /> Subir imagen
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              className="hidden"
            />
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4">

          {tab === 'pictogramas' && (
            <>
              {filteredPictograms.length === 0 ? (
                <p className="text-center py-12 text-zinc-500 font-mono text-xs">
                  Ningún pictograma coincide con la búsqueda.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                  {filteredPictograms.map(p => (
                    <button
                      key={p.id} type="button"
                      onClick={() => { onSelect(pictogramDataUrl(p), 'pictogram'); onClose(); }}
                      className="aspect-square bg-zinc-950/40 border border-zinc-800 hover:border-[#5D36FF] hover:bg-[#5D36FF]/10 rounded-lg p-3 flex flex-col items-center justify-center gap-1 group transition"
                      title={p.name}
                    >
                      <div className="flex-1 flex items-center justify-center">
                        <PictogramView id={p.id} size={64} color="#5D36FF" />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 group-hover:text-[#5D36FF] truncate w-full text-center">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'mias' && (
            <>
              {/* Estado: subiendo */}
              {uploadDataUrl && (
                <div className="mb-4 bg-[#5D36FF]/5 border border-[#5D36FF]/40 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <img src={uploadDataUrl} alt="" className="w-32 h-32 object-cover rounded border border-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <label className="block space-y-1">
                        <span className="block text-[9px] uppercase font-mono tracking-wider text-zinc-500">Nombre para guardar</span>
                        <input
                          type="text" value={uploadName} onChange={e => setUploadName(e.target.value)}
                          placeholder="Ej: Logo gimnasio"
                          autoFocus
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
                        />
                      </label>
                      <p className="text-[10px] font-mono text-zinc-500">
                        Tamaño optimizado: ~{uploadSize} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button type="button" onClick={resetUploader}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px] uppercase font-bold hover:bg-zinc-800">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleUseWithoutSaving}
                      className="px-3 py-1.5 bg-zinc-900 border border-[#5D36FF]/30 text-[#5D36FF] rounded font-mono text-[10px] uppercase font-bold hover:bg-[#5D36FF]/10">
                      Usar solo esta vez
                    </button>
                    <button type="button" onClick={handleSaveAndUse} disabled={!uploadName.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 text-white rounded font-mono text-[10px] uppercase font-bold">
                      <Check size={11} aria-hidden="true" /> Guardar y usar
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <div role="alert" className="mb-4 bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded text-xs font-mono">
                  {uploadError}
                </div>
              )}

              {/* Grid de imágenes propias */}
              {filteredUserImages.length === 0 && !uploadDataUrl ? (
                <div className="text-center py-12 space-y-3">
                  <Upload size={28} className="text-zinc-700 mx-auto" aria-hidden="true" />
                  <p className="text-zinc-400 font-mono text-xs">
                    {userImages.length === 0
                      ? 'Tu banco está vacío.'
                      : 'Ninguna imagen coincide con la búsqueda.'}
                  </p>
                  {userImages.length === 0 && (
                    <div className="space-y-1">
                      <p className="text-zinc-600 font-mono text-[10px]">
                        Sube fotos, logos o ilustraciones descargadas de bancos gratuitos:
                      </p>
                      <div className="flex items-center gap-3 justify-center pt-1">
                        <a href="https://undraw.co" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5D36FF] hover:underline">
                          unDraw <ExternalLink size={9} aria-hidden="true" />
                        </a>
                        <a href="https://storyset.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5D36FF] hover:underline">
                          Storyset <ExternalLink size={9} aria-hidden="true" />
                        </a>
                        <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5D36FF] hover:underline">
                          Unsplash <ExternalLink size={9} aria-hidden="true" />
                        </a>
                        <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5D36FF] hover:underline">
                          Pexels <ExternalLink size={9} aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filteredUserImages.map(img => (
                    <div key={img.id} className="aspect-square bg-zinc-950/40 border border-zinc-800 rounded-lg overflow-hidden group relative">
                      <button
                        type="button"
                        onClick={() => { onSelect(img.dataUrl, 'user'); onClose(); }}
                        className="w-full h-full"
                        title={img.name}
                      >
                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        <span className="text-[10px] font-mono text-white truncate block">{img.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar "${img.name}" del banco?`)) onRemoveUserImage(img.id);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition"
                        aria-label={`Eliminar ${img.name}`}
                      >
                        <Trash2 size={10} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t border-zinc-800 px-4 py-2.5 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
          <span>
            {tab === 'pictogramas'
              ? `${filteredPictograms.length} pictogramas SVG · color morado de marca`
              : `${filteredUserImages.length} imágenes · comprimidas a ≤600px JPEG`}
          </span>
          <span>Click para seleccionar · Esc para cerrar</span>
        </div>
      </div>
    </div>
  );
}

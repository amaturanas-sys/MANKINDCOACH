/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Avatar reusable: muestra foto del paciente (base64) o inicial.
 * AvatarUploader permite subir y comprimir una imagen a ~50KB base64.
 */

import React, { useRef } from 'react';
import { Camera, Trash2, User } from 'lucide-react';

interface AvatarProps {
  name: string;
  dataUrl?: string;
  size?: number;
  /** Color del fondo cuando no hay foto. */
  className?: string;
}

export function Avatar({ name, dataUrl, size = 32, className = '' }: AvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const style = { width: size, height: size };
  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={`Foto de ${name}`}
        style={style}
        className={`rounded-full object-cover shrink-0 border border-[#5D36FF]/40 ${className}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`rounded-full bg-[#5D36FF]/20 border border-[#5D36FF]/40 flex items-center justify-center font-bold text-[#5D36FF] shrink-0 ${className}`}
      aria-label={`Sin foto · ${name}`}
    >
      <span style={{ fontSize: Math.max(10, size * 0.4) }}>{initial}</span>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Avatar uploader (editable)
 * ----------------------------------------------------------------------- */

interface AvatarUploaderProps {
  name: string;
  dataUrl?: string;
  onChange: (next: string | undefined) => void;
  size?: number;
}

const MAX_DIMENSION = 256;     // px
const TARGET_QUALITY = 0.78;   // jpeg quality (≈ 30-50 KB para 256x256)

/**
 * Lee File como dataURL, redibuja en canvas a max 256x256, devuelve JPEG comprimido.
 */
async function compressImage(file: File): Promise<string> {
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
          const dataUrl = canvas.toDataURL('image/jpeg', TARGET_QUALITY);
          resolve(dataUrl);
        } catch (err) {
          reject(err as Error);
        }
      };
      img.src = String(reader.result ?? '');
    };
    reader.readAsDataURL(file);
  });
}

export function AvatarUploader({ name, dataUrl, onChange, size = 96 }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes (JPG/PNG/WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagen demasiado grande (máx 5MB).');
      return;
    }
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al procesar la imagen.');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} dataUrl={dataUrl} size={size} />
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          className="hidden"
          aria-label="Subir foto del paciente"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
        >
          <Camera size={12} aria-hidden="true" />
          {dataUrl ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {dataUrl && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-transparent border border-zinc-800 hover:border-red-500/50 hover:text-red-400 text-zinc-400 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
          >
            <Trash2 size={12} aria-hidden="true" />
            Eliminar
          </button>
        )}
        <p className="text-[9px] text-zinc-500 font-mono leading-relaxed normal-case max-w-[200px]">
          Se comprime a ≤50KB para no inflar el localStorage. Recomendado: foto cuadrada.
        </p>
      </div>
    </div>
  );
}

/* Ícono User reexportado por si lo quieres usar en otros lados sin re-import */
export { User };

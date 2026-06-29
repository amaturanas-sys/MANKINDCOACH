/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Panel de REFERENCIA anatómica (Biblioteca de movimientos).
 *
 * Importante (licencia): el modelo 3D de esqueleto de AnatomyTOOL está bajo
 * GNU GPL-3.0 (copyleft fuerte). Para NO contaminar la licencia de esta app
 * (Apache-2.0 / propietaria), el modelo NO se empaqueta ni se redistribuye:
 * este panel solo ENLAZA a la fuente original y muestra la atribución exigida.
 * Enlazar a una obra no constituye redistribución, así que no aplica copyleft.
 */

import { Bone, ExternalLink, Info } from 'lucide-react';

/** Metadatos de la fuente anatómica externa (AnatomyTOOL). */
export const ANATOMY_SOURCE = {
  name: 'AnatomyTOOL',
  org: 'Leiden UMC · UMC Utrecht · Maastricht · KU Leuven',
  /** Página de modelos 3D abiertos. */
  modelsUrl: 'https://anatomytool.org/open3dmodel',
  /** Vista interactiva filtrada por licencias abiertas (sistemas óseo/articular/muscular). */
  browseUrl:
    'https://anatomytool.org/interactive?f[]=field_anatomical_structures%253Afield_as_anatomical_system%253Aparents_all:709&f[]=field_anatomical_structures%253Afield_as_anatomical_system%253Aparents_all:707&f[]=field_anatomical_structures%253Afield_as_anatomical_system%253Aparents_all:708&f[]=field_di_license:695&f[]=field_di_license:696&f[]=field_di_license:692&f[]=field_di_license:285',
  license: 'GNU GPL-3.0',
  licenseUrl: 'https://www.gnu.org/licenses/gpl-3.0.en.html',
  authors:
    'O.P. Gobée, M.C. DeRuiter, D. Jansma (Leiden UMC); R.L.A.W. Bleys (UMC Utrecht); A. Herrler (U. Maastricht); E. Vereecke (KU Leuven)'
} as const;

interface AnatomyReferencePanelProps {
  /** Texto de músculo para enfocar la consulta (opcional, p. ej. el músculo primario filtrado). */
  muscleHint?: string;
}

export default function AnatomyReferencePanel({ muscleHint }: AnatomyReferencePanelProps) {
  return (
    <section className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2 bg-[#5D36FF]/10 border border-[#5D36FF]/30 px-3 py-1 rounded-full">
          <Bone size={12} className="text-[#5D36FF]" aria-hidden="true" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF]">
            Referencia anatómica
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 shrink-0">
          Fuente externa
        </span>
      </div>

      <div className="space-y-1">
        <h2 className="font-sans font-bold text-base text-white">
          Modelo 3D de esqueleto y atlas anatómico
        </h2>
        <p className="text-zinc-400 text-xs leading-relaxed">
          Consulta interactiva de huesos y estructuras para ilustrar el movimiento.
          {muscleHint ? <> Enfoque sugerido: <span className="text-zinc-200">{muscleHint}</span>.</> : null}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={ANATOMY_SOURCE.modelsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded-lg font-mono text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-2"
        >
          <Bone size={12} aria-hidden="true" /> Modelo 3D de esqueleto
          <ExternalLink size={11} aria-hidden="true" />
        </a>
        <a
          href={ANATOMY_SOURCE.browseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 text-zinc-300 hover:text-white rounded-lg font-mono text-[10px] uppercase tracking-wider transition flex items-center gap-2"
        >
          Explorar (licencias abiertas)
          <ExternalLink size={11} aria-hidden="true" />
        </a>
      </div>

      {/* Atribución obligatoria (GPL-3.0) */}
      <div className="flex gap-2 pt-3 border-t border-zinc-800">
        <Info size={12} className="text-zinc-500 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="font-mono text-[10px] leading-relaxed text-zinc-500">
          Modelo y referencias: equipo <span className="text-zinc-300">{ANATOMY_SOURCE.name}</span> —{' '}
          {ANATOMY_SOURCE.authors}. Licencia{' '}
          <a
            href={ANATOMY_SOURCE.licenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#5D36FF] hover:underline"
          >
            {ANATOMY_SOURCE.license}
          </a>
          . El material no se redistribuye en esta app; se enlaza a su fuente original.
        </p>
      </div>
    </section>
  );
}

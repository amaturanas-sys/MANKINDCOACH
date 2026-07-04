/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vista estática (no interactiva) de una ilustración de técnica hecha con el
 * maniquí: renderiza sus cuadros y perspectivas. Se usa en la ficha del
 * movimiento en la Biblioteca.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import RagdollMannequin from './RagdollMannequin';
import { Rig, RagdollDoc, loadRigs } from '../lib/ragdoll';

type ViewKey = 'frontal' | 'sagittal';

function computeViewBox(rig: Rig, pad = 130): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of rig.parts) {
    if (!p.rect) continue;
    const [x, y, w, h] = p.rect;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  }
  return `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;
}

export default function RagdollPreview({ doc }: { doc: RagdollDoc }) {
  const [rigs, setRigs] = useState<Record<ViewKey, Rig | null>>({ frontal: null, sagittal: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadRigs()
      .then(r => { if (alive) setRigs(r); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const viewBox = useMemo(() => ({
    frontal: rigs.frontal ? computeViewBox(rigs.frontal) : '0 0 1 1',
    sagittal: rigs.sagittal ? computeViewBox(rigs.sagittal) : '0 0 1 1'
  }), [rigs]);

  const show = doc.show ?? { frontal: true, sagittal: false };
  const views = (['frontal', 'sagittal'] as ViewKey[]).filter(v => show[v]);

  if (loading) return <div className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-zinc-600" /></div>;
  if (!rigs.frontal || doc.frames.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
      {doc.frames.map((frame, i) => (
        <div key={i} className="shrink-0 space-y-1">
          <div className="flex gap-1">
            {views.map(v => {
              const rig = rigs[v];
              if (!rig) return null;
              return (
                <div key={v} className="w-24 h-36 bg-white rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center">
                  <RagdollMannequin rig={rig} pose={frame[v]} viewBox={viewBox[v]} className="w-full h-full" />
                </div>
              );
            })}
          </div>
          {doc.frames.length > 1 && (
            <p className="text-center font-mono text-[8px] uppercase tracking-wider text-zinc-500">Cuadro {i + 1}</p>
          )}
        </div>
      ))}
    </div>
  );
}

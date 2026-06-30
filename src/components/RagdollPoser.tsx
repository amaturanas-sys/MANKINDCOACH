/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Editor de postura anatómica. Arranca con los maniquíes en postura neutra.
 * - Arrastra un segmento para rotarlo alrededor de su eje articular.
 * - Arrastra el eje articular (pivote dinámico) para reubicarlo.
 * - Elige qué perspectivas mostrar (frontal / sagital).
 * - Define cuántos cuadros de demostración ver (movimientos por etapas).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Loader2, RotateCcw, Plus, Minus, Move, Crosshair, Copy, Trash2
} from 'lucide-react';
import RagdollMannequin from './RagdollMannequin';
import {
  Rig, Pose, PartPose, partPose, loadRig, buildIndex,
  worldOf, pivotScreen, applyMat, invertAffine
} from '../lib/ragdoll';

type ViewKey = 'frontal' | 'sagittal';
interface Frame { frontal: Pose; sagittal: Pose; }

const VIEW_LABEL: Record<ViewKey, string> = { frontal: 'Frontal', sagittal: 'Sagital' };

function computeViewBox(rig: Rig, pad = 130): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of rig.parts) {
    if (!p.rect) continue;
    const [x, y, w, h] = p.rect;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  }
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): [number, number] {
  const pt = svg.createSVGPoint();
  pt.x = clientX; pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return [clientX, clientY];
  const p = pt.matrixTransform(ctm.inverse());
  return [p.x, p.y];
}

interface DragState {
  kind: 'rotate' | 'pivot';
  view: ViewKey;
  id: string;
  startAnglePointer: number;
  startPart: PartPose;
  basePivot: [number, number];
  parentWorldInv: number[];
}

export default function RagdollPoser() {
  const [rigs, setRigs] = useState<Record<ViewKey, Rig | null>>({ frontal: null, sagittal: null });
  const [frames, setFrames] = useState<Frame[]>([{ frontal: {}, sagittal: {} }]);
  const [active, setActive] = useState(0);
  const [show, setShow] = useState<Record<ViewKey, boolean>>({ frontal: true, sagittal: true });
  const [showJoints, setShowJoints] = useState(true);
  const [selected, setSelected] = useState<{ view: ViewKey; id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const svgRefs = useRef<Record<ViewKey, SVGSVGElement | null>>({ frontal: null, sagittal: null });
  const drag = useRef<DragState | null>(null);

  useEffect(() => {
    Promise.all([loadRig('frontal'), loadRig('sagittal')])
      .then(([f, s]) => setRigs({ frontal: f, sagittal: s }))
      .catch(() => { /* sin rig */ })
      .finally(() => setLoading(false));
  }, []);

  const byId = useMemo(() => ({
    frontal: rigs.frontal ? buildIndex(rigs.frontal) : null,
    sagittal: rigs.sagittal ? buildIndex(rigs.sagittal) : null
  }), [rigs]);
  const viewBox = useMemo(() => ({
    frontal: rigs.frontal ? computeViewBox(rigs.frontal) : '0 0 100 100',
    sagittal: rigs.sagittal ? computeViewBox(rigs.sagittal) : '0 0 100 100'
  }), [rigs]);

  const frame = frames[active];

  const setPartPose = (view: ViewKey, id: string, patch: Partial<PartPose>) => {
    setFrames(prev => prev.map((fr, i) => {
      if (i !== active) return fr;
      const cur = partPose(fr[view], id);
      return { ...fr, [view]: { ...fr[view], [id]: { ...cur, ...patch } } };
    }));
  };

  const beginDrag = (kind: 'rotate' | 'pivot', view: ViewKey, id: string, e: React.PointerEvent) => {
    const rig = rigs[view], index = byId[view];
    if (!rig || !index) return;
    const part = index.get(id)!;
    const svg = svgRefs.current[view];
    if (!svg) return;
    setSelected({ view, id });
    const [sx, sy] = clientToSvg(svg, e.clientX, e.clientY);
    const [pvx, pvy] = pivotScreen(rig, frame[view], part, index);
    const parentWorld = part.parent ? worldOf(rig, frame[view], part.parent, index) : [1, 0, 0, 0, 1, 0, 0, 0, 1];
    drag.current = {
      kind, view, id,
      startAnglePointer: Math.atan2(sy - pvy, sx - pvx),
      startPart: partPose(frame[view], id),
      basePivot: part.pivot ?? [0, 0],
      parentWorldInv: invertAffine(parentWorld)
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const svg = svgRefs.current[d.view];
      if (!svg) return;
      const [sx, sy] = clientToSvg(svg, e.clientX, e.clientY);
      if (d.kind === 'rotate') {
        const rig = rigs[d.view]!, index = byId[d.view]!;
        const part = index.get(d.id)!;
        const [pvx, pvy] = pivotScreen(rig, frame[d.view], part, index);
        const ang = Math.atan2(sy - pvy, sx - pvx);
        const deltaDeg = ((ang - d.startAnglePointer) * 180) / Math.PI;
        setPartPose(d.view, d.id, { angle: d.startPart.angle + deltaDeg });
      } else {
        const [lx, ly] = applyMat(d.parentWorldInv, sx, sy);
        setPartPose(d.view, d.id, { dx: lx - d.basePivot[0], dy: ly - d.basePivot[1] });
      }
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rigs, byId, frame, active]);

  const resetFrame = () => setFrames(prev => prev.map((fr, i) => i === active ? { frontal: {}, sagittal: {} } : fr));
  const addFrame = () => {
    setFrames(prev => {
      const copy: Frame = { frontal: { ...prev[active].frontal }, sagittal: { ...prev[active].sagittal } };
      const next = [...prev]; next.splice(active + 1, 0, copy); return next;
    });
    setActive(a => a + 1);
  };
  const removeFrame = () => {
    setFrames(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== active));
    setActive(a => Math.max(0, a - 1));
  };

  const activeViews = (['frontal', 'sagittal'] as ViewKey[]).filter(v => show[v]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white"><Loader2 className="animate-spin" /></div>;
  }
  if (!rigs.frontal) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400 text-sm p-6">No se pudo cargar el maniquí (rig no disponible).</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Barra de herramientas */}
      <header className="border-b border-zinc-900 px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 mr-2">
          <img src="/brand/mankind-logo.png" alt="" className="h-8 w-8 rounded-lg object-cover ring-1 ring-zinc-800" />
          <div>
            <p className="font-sans font-black text-sm leading-none">Editor de postura</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mt-0.5">Maniquí anatómico</p>
          </div>
        </div>

        {/* Perspectivas */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['frontal', 'sagittal'] as ViewKey[]).map(v => (
            <button key={v} type="button"
              onClick={() => setShow(s => ({ ...s, [v]: !s[v] }))}
              aria-pressed={show[v]}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-wider transition ${
                show[v] ? 'bg-[#5D36FF] text-white font-bold' : 'text-zinc-400 hover:text-white'}`}>
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>

        {/* Cuadros */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500 px-2">Cuadros</span>
          {frames.map((_, i) => (
            <button key={i} type="button" onClick={() => setActive(i)}
              className={`w-7 h-7 rounded font-mono text-[11px] font-bold transition ${
                active === i ? 'bg-[#5D36FF] text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'}`}>
              {i + 1}
            </button>
          ))}
          <button type="button" onClick={addFrame} title="Añadir cuadro (copia)" className="w-7 h-7 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-[#5D36FF] flex items-center justify-center"><Plus size={13} /></button>
          {frames.length > 1 && (
            <button type="button" onClick={removeFrame} title="Eliminar cuadro" className="w-7 h-7 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-400 flex items-center justify-center"><Minus size={13} /></button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={() => setShowJoints(s => !s)} aria-pressed={showJoints}
            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 border ${
              showJoints ? 'bg-[#5D36FF]/15 border-[#5D36FF]/40 text-[#5D36FF]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
            <Crosshair size={12} /> Ejes
          </button>
          <button type="button" onClick={resetFrame}
            className="px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white">
            <RotateCcw size={12} /> Neutra
          </button>
        </div>
      </header>

      {/* Lienzo */}
      <main className="flex-1 flex items-stretch justify-center gap-4 p-4 overflow-auto bg-[radial-gradient(circle_at_50%_30%,#15151a,#0a0a0c)]">
        {activeViews.length === 0 && (
          <div className="self-center text-zinc-500 font-mono text-xs">Activa al menos una perspectiva arriba.</div>
        )}
        {activeViews.map(v => {
          const rig = rigs[v];
          if (!rig) return (
            <div key={v} className="self-center text-zinc-600 font-mono text-[11px]">Sagital no disponible.</div>
          );
          return (
            <div key={v} className="flex flex-col items-center gap-2 flex-1 max-w-[520px]">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{VIEW_LABEL[v]}</span>
              <div className="flex-1 w-full bg-white rounded-2xl border border-zinc-800 overflow-hidden flex items-center justify-center">
                <RagdollMannequin
                  ref={(el) => { svgRefs.current[v] = el; }}
                  rig={rig}
                  pose={frame[v]}
                  viewBox={viewBox[v]}
                  interactive
                  showJoints={showJoints}
                  selectedId={selected?.view === v ? selected.id : null}
                  onPartDown={(id, e) => beginDrag('rotate', v, id, e)}
                  onJointDown={(id, e) => beginDrag('pivot', v, id, e)}
                  className="w-full h-full max-h-[78vh]"
                />
              </div>
            </div>
          );
        })}
      </main>

      <footer className="border-t border-zinc-900 px-4 py-2 flex items-center gap-4 text-[10px] font-mono text-zinc-500">
        <span className="flex items-center gap-1.5"><Move size={12} /> Arrastra un segmento para rotarlo</span>
        <span className="flex items-center gap-1.5"><Crosshair size={12} /> Arrastra el círculo del eje para moverlo</span>
        <span className="flex items-center gap-1.5"><Copy size={12} /> «+» duplica el cuadro</span>
        <span className="flex items-center gap-1.5"><Trash2 size={12} /> «−» elimina el cuadro</span>
        {selected && <span className="ml-auto text-zinc-400">Seleccionado: <span className="text-[#5D36FF]">{selected.id}</span></span>}
      </footer>
    </div>
  );
}

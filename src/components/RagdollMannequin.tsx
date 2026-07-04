/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Renderizador SVG del maniquí articulado. Dibuja sprites + discos articulares
 * en orden de capas según una pose. Opcionalmente expone manejadores para
 * arrastrar segmentos (rotar) y ejes articulares (mover pivote).
 *
 * Las matrices mundiales se calculan UNA vez por render (worldMap memoizado):
 * sprites, discos, pivotes y resalte leen del mismo mapa, lo que mantiene el
 * arrastre fluido incluso en móviles de gama media.
 */
import { forwardRef, useMemo } from 'react';
import {
  Rig, Pose, buildIndex, worldMap, spriteMatrixFrom, pivotScreenFrom,
  toSvgMatrix, rgb
} from '../lib/ragdoll';

const ASSET_BASE = '/ragdoll/';

export interface MannequinProps {
  rig: Rig;
  pose: Pose;
  viewBox: string;
  interactive?: boolean;
  showJoints?: boolean;
  selectedId?: string | null;
  onPartDown?: (id: string, e: React.PointerEvent) => void;
  onJointDown?: (id: string, e: React.PointerEvent) => void;
  className?: string;
}

const RagdollMannequin = forwardRef<SVGSVGElement, MannequinProps>(function RagdollMannequin(
  { rig, pose, viewBox, interactive, showJoints, selectedId, onPartDown, onJointDown, className }, ref
) {
  const byId = useMemo(() => buildIndex(rig), [rig]);
  const ordered = useMemo(() => [...rig.parts].sort((a, b) => a.z - b.z), [rig]);
  const sprites = useMemo(() => ordered.filter(p => p.kind !== 'disc'), [ordered]);
  /* Una sola pasada de cinemática por (rig, pose). */
  const worlds = useMemo(() => worldMap(rig, pose, byId), [rig, pose, byId]);

  return (
    <svg ref={ref} viewBox={viewBox} className={className} style={{ touchAction: 'none', userSelect: 'none' }}>
      {ordered.map(p => {
        if (p.kind === 'disc') {
          const w = worlds.get(p.parent ?? p.id)!;
          return (
            <circle key={p.id} cx={p.cx} cy={p.cy} r={p.r} transform={toSvgMatrix(w)}
              fill={rgb(p.fill)} stroke={rgb(p.stroke)} strokeWidth={5} />
          );
        }
        const m = spriteMatrixFrom(worlds, p);
        const [x, y, w, h] = p.rect!;
        return (
          <image
            key={p.id}
            href={ASSET_BASE + p.src}
            x={x} y={y} width={w} height={h}
            transform={toSvgMatrix(m)}
            style={{ pointerEvents: interactive ? 'auto' : 'none', cursor: interactive ? 'grab' : 'default' }}
            onPointerDown={interactive ? (e) => onPartDown?.(p.id, e) : undefined}
          />
        );
      })}

      {/* Resalte de la pieza seleccionada (contorno de su rect, transformado) */}
      {interactive && selectedId && (() => {
        const p = byId.get(selectedId);
        if (!p || !p.rect) return null;
        const [x, y, w, h] = p.rect;
        return (
          <rect x={x} y={y} width={w} height={h} transform={toSvgMatrix(spriteMatrixFrom(worlds, p))}
            fill="none" stroke="#5D36FF" strokeWidth={4} strokeDasharray="14 10" pointerEvents="none" opacity={0.7} />
        );
      })()}

      {/* Ejes articulares (pivotes) arrastrables */}
      {interactive && showJoints && sprites.map(p => {
        if (!p.pivot || !p.parent) return null;
        const [cx, cy] = pivotScreenFrom(worlds, pose, p);
        const sel = selectedId === p.id;
        return (
          <g key={`j-${p.id}`} style={{ cursor: 'move' }} onPointerDown={(e) => { e.stopPropagation(); onJointDown?.(p.id, e); }}>
            <circle cx={cx} cy={cy} r={22} fill="#5D36FF" fillOpacity={sel ? 0.35 : 0.15} stroke="#5D36FF" strokeWidth={4} />
            <circle cx={cx} cy={cy} r={5} fill="#5D36FF" />
          </g>
        );
      })}
    </svg>
  );
});

export default RagdollMannequin;

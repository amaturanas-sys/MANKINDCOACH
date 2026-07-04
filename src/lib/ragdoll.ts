/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Núcleo del maniquí articulado (editor de postura anatómica).
 *
 * Un "rig" describe un maniquí (frontal o sagital) como piezas (sprites) y
 * discos articulares en una jerarquía cinemática con pivotes. Una "pose" guarda,
 * por pieza, el ángulo de rotación y el desplazamiento de su eje articular
 * (pivote dinámico que el coach puede arrastrar). La postura neutra = pose vacía.
 *
 * La matemática es idéntica a la verificación offline: cada pieza obtiene una
 * matriz afín mundial componiendo, a lo largo de su cadena, rotaciones alrededor
 * de los pivotes (con sus desplazamientos). Se traduce a `transform: matrix(...)`.
 */

export interface RigPart {
  id: string;
  kind?: 'disc';
  /* sprite */
  src?: string;
  rect?: [number, number, number, number];
  mirror?: boolean;
  /* disc */
  cx?: number;
  cy?: number;
  r?: number;
  fill?: number[];
  stroke?: number[];
  /* común */
  parent: string | null;
  pivot?: [number, number];
  z: number;
}

export interface Rig {
  canvas: [number, number];
  view?: string;
  midline?: number;
  parts: RigPart[];
}

/** Ajuste por pieza: ángulo (grados) + desplazamiento del eje articular. */
export interface PartPose { angle: number; dx: number; dy: number; }
export type Pose = Record<string, PartPose>;

/** Un cuadro de demostración = postura de cada perspectiva. */
export interface RagdollFrame { frontal: Pose; sagittal: Pose; }
/** Ilustración de técnica de un movimiento: cuadros + perspectivas visibles. */
export interface RagdollDoc {
  frames: RagdollFrame[];
  show?: { frontal: boolean; sagittal: boolean };
}
export const emptyFrame = (): RagdollFrame => ({ frontal: {}, sagittal: {} });

export const ZERO_PART: PartPose = { angle: 0, dx: 0, dy: 0 };
export const partPose = (pose: Pose, id: string): PartPose => pose[id] ?? ZERO_PART;

/* ----------------------------- matrices 3x3 ----------------------------- */
export type Mat = number[]; // row-major 3x3

const I: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function mul(a: Mat, b: Mat): Mat {
  const m: Mat = new Array(9).fill(0);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (let k = 0; k < 3; k++)
        m[r * 3 + c] += a[r * 3 + k] * b[k * 3 + c];
  return m;
}
const translate = (x: number, y: number): Mat => [1, 0, x, 0, 1, y, 0, 0, 1];
const scale = (sx: number, sy: number): Mat => [sx, 0, 0, 0, sy, 0, 0, 0, 1];
function rotate(deg: number): Mat {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}
function rotateAbout(px: number, py: number, deg: number): Mat {
  return mul(translate(px, py), mul(rotate(deg), translate(-px, -py)));
}
export function applyMat(m: Mat, x: number, y: number): [number, number] {
  return [m[0] * x + m[1] * y + m[2], m[3] * x + m[4] * y + m[5]];
}
export function invertAffine(m: Mat): Mat {
  const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5];
  const det = a * e - b * d || 1e-9;
  const ia = e / det, ib = -b / det, id = -d / det, ie = a / det;
  return [ia, ib, -(ia * c + ib * f), id, ie, -(id * c + ie * f), 0, 0, 1];
}
/** SVG matrix(a,b,c,d,e,f): x'=a·x+c·y+e ; y'=b·x+d·y+f */
export function toSvgMatrix(m: Mat): string {
  return `matrix(${m[0]},${m[3]},${m[1]},${m[4]},${m[2]},${m[5]})`;
}

/* ----------------------------- cinemática ----------------------------- */
function localOf(part: RigPart, pp: PartPose): Mat {
  if (!part.pivot) return translate(pp.dx, pp.dy);
  const px = part.pivot[0] + pp.dx, py = part.pivot[1] + pp.dy;
  // mover el eje (dx,dy) y rotar alrededor del eje desplazado
  return mul(rotateAbout(px, py, pp.angle), translate(pp.dx, pp.dy));
}

/** Matriz mundial de una pieza (compone toda su cadena de padres). */
export function worldOf(rig: Rig, pose: Pose, id: string, byId: Map<string, RigPart>): Mat {
  const part = byId.get(id)!;
  const local = part.kind === 'disc' ? I : localOf(part, partPose(pose, id));
  if (!part.parent) return local;
  return mul(worldOf(rig, pose, part.parent, byId), local);
}

/** Matriz de render de un sprite (incluye el volteo horizontal si es espejo). */
export function spriteMatrix(rig: Rig, pose: Pose, part: RigPart, byId: Map<string, RigPart>): Mat {
  const world = worldOf(rig, pose, part.id, byId);
  if (!part.mirror || !part.rect) return world;
  const cx = part.rect[0] + part.rect[2] / 2;
  const flip = mul(translate(cx, 0), mul(scale(-1, 1), translate(-cx, 0)));
  return mul(world, flip);
}

/** Posición en pantalla (coords del lienzo) del eje articular de una pieza. */
export function pivotScreen(rig: Rig, pose: Pose, part: RigPart, byId: Map<string, RigPart>): [number, number] {
  if (!part.pivot || !part.parent) return part.pivot ?? [0, 0];
  const pp = partPose(pose, part.id);
  const eff: [number, number] = [part.pivot[0] + pp.dx, part.pivot[1] + pp.dy];
  return applyMat(worldOf(rig, pose, part.parent, byId), eff[0], eff[1]);
}

export const buildIndex = (rig: Rig) => new Map(rig.parts.map(p => [p.id, p]));

/* Caché a nivel de módulo: el rig es estático; una sola descarga por sesión. */
const rigCache: Partial<Record<'frontal' | 'sagittal', Promise<Rig>>> = {};

export function loadRig(view: 'frontal' | 'sagittal'): Promise<Rig> {
  if (!rigCache[view]) {
    rigCache[view] = fetch(`/ragdoll/rig_${view}.json`).then(res => {
      if (!res.ok) throw new Error(`No se pudo cargar el rig ${view}`);
      return res.json() as Promise<Rig>;
    }).catch(err => {
      delete rigCache[view]; // permitir reintento en el próximo mount
      throw err;
    });
  }
  return rigCache[view]!;
}

/**
 * Carga ambos rigs tolerando fallos individuales: si el sagital falla, el
 * frontal sigue disponible (antes un solo fallo tumbaba toda la herramienta).
 */
export async function loadRigs(): Promise<{ frontal: Rig | null; sagittal: Rig | null }> {
  const [f, s] = await Promise.allSettled([loadRig('frontal'), loadRig('sagittal')]);
  return {
    frontal: f.status === 'fulfilled' ? f.value : null,
    sagittal: s.status === 'fulfilled' ? s.value : null
  };
}

/**
 * Matrices mundiales de TODAS las piezas en una pasada (memoiza la cadena de
 * padres). Para render: evita recalcular la recursión por cada sprite, disco,
 * pivote y resalte del mismo frame.
 */
export function worldMap(rig: Rig, pose: Pose, byId: Map<string, RigPart>): Map<string, Mat> {
  const out = new Map<string, Mat>();
  const compute = (id: string): Mat => {
    const cached = out.get(id);
    if (cached) return cached;
    const m = worldOfWith(rig, pose, id, byId, compute);
    out.set(id, m);
    return m;
  };
  for (const p of rig.parts) compute(p.id);
  return out;
}

function worldOfWith(rig: Rig, pose: Pose, id: string, byId: Map<string, RigPart>, parentGetter: (id: string) => Mat): Mat {
  const part = byId.get(id)!;
  const local = part.kind === 'disc' ? I : localOf(part, partPose(pose, id));
  if (!part.parent) return local;
  return mul(parentGetter(part.parent), local);
}

/** Variante de spriteMatrix que lee de un worldMap precalculado. */
export function spriteMatrixFrom(worlds: Map<string, Mat>, part: RigPart): Mat {
  const world = worlds.get(part.id)!;
  if (!part.mirror || !part.rect) return world;
  const cx = part.rect[0] + part.rect[2] / 2;
  const flip = mul(translate(cx, 0), mul(scale(-1, 1), translate(-cx, 0)));
  return mul(world, flip);
}

/** Variante de pivotScreen que lee de un worldMap precalculado. */
export function pivotScreenFrom(worlds: Map<string, Mat>, pose: Pose, part: RigPart): [number, number] {
  if (!part.pivot || !part.parent) return part.pivot ?? [0, 0];
  const pp = partPose(pose, part.id);
  return applyMat(worlds.get(part.parent)!, part.pivot[0] + pp.dx, part.pivot[1] + pp.dy);
}

export const rgb = (a?: number[]) => a ? `rgb(${a[0]},${a[1]},${a[2]})` : 'none';

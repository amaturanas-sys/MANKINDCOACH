/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Wrapper sobre la biblioteca de ejercicios NSCA extraída del manual oficial.
 * Provee tipos, helpers de búsqueda por grupo muscular y filtros por equipamiento.
 */

import nscaJson from '../data/nsca-exercises.json';
import enduranceJson from '../data/endurance-exercises.json';
import type {
  EnduranceParams, EnduranceModality, EnduranceProtocol, EnduranceZone
} from '../types';

export type PushPullKind = 'push' | 'pull' | 'mixed' | 'power' | 'core';

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders'
  | 'biceps' | 'triceps' | 'forearm'
  | 'quads' | 'glutes' | 'hamstrings' | 'calves' | 'legs'
  | 'core' | 'fullbody';

export interface NscaExercise {
  id: string;
  englishName: string;
  name: string;
  chapter: string;
  category: string;
  pushPull: PushPullKind;
  primaryMuscle: MuscleGroup;
  muscleGroups: MuscleGroup[];
  equipment: string[];
  technique: Record<string, string>;
  source: string;
  sourceFile: string;
}

/**
 * NSCA_EXERCISES incluye:
 *  - Ejercicios del manual NSCA Exercise Technique (~123 de fuerza/halterofilia)
 *  - Ejercicios de endurance compilados desde NSCA ESSC Cap. 21, ACSM Guidelines,
 *    USA Triathlon Coaching Manual, USA Cycling Coaching Manual y bibliografía
 *    estándar de entrenamiento de resistencia (~25 ejercicios de running, ciclismo,
 *    natación, remo, cross-training).
 */
export const NSCA_EXERCISES: NscaExercise[] = [
  ...(nscaJson as unknown as NscaExercise[]),
  ...(enduranceJson as unknown as NscaExercise[])
];

/** Solo los ejercicios de endurance (running, ciclismo, natación, cross-training). */
export const ENDURANCE_EXERCISES: NscaExercise[] = enduranceJson as unknown as NscaExercise[];

/** Detecta si un ejercicio es de endurance/cross-training (por su id o categoría). */
export function isEnduranceExercise(ex: { id: string; category?: string; sourceFile?: string }): boolean {
  return ex.id.startsWith('end-') || ex.category === 'endurance' || ex.sourceFile === 'endurance';
}

/**
 * Infiere la modalidad de endurance a partir del id NSCA o el nombre.
 * Útil para auto-poblar EnduranceParams cuando se selecciona desde la biblioteca.
 */
export function inferEnduranceModality(ex: NscaExercise): EnduranceModality {
  const id = ex.id.toLowerCase();
  const n = `${ex.name} ${ex.englishName}`.toLowerCase();
  if (/swim|nat|crol|catch.?up|drill/.test(id + ' ' + n) && !/airbike|treadmill|run/.test(id)) return 'swim';
  if (/cycl|cycling|bike|ftp|sweet.?spot|spin|ciclismo/.test(id + ' ' + n)) return 'bike';
  if (/row|rem(o|er)|concept2|erg/.test(id) && !/run|jog|carrera/.test(id)) return 'row';
  if (/airbike|assault/.test(id + ' ' + n)) return 'airbike';
  if (/skierg/.test(id + ' ' + n)) return 'skierg';
  if (/rope|cuerda/.test(id + ' ' + n)) return 'rope';
  if (/stairs|escaleras|step/.test(id + ' ' + n)) return 'stairs';
  if (/brick|triat/.test(id + ' ' + n)) return 'brick';
  if (/metcon|amrap|emom|tabata|circuit/.test(id + ' ' + n)) return 'metcon';
  if (/run|carrera|sprint|tempo|fartlek|hill|lsd|stride|zone\s*2|z2|vo2|interval|jog|trote/.test(id + ' ' + n)) return 'run';
  return 'mixed';
}

/** Infiere el protocolo a partir del id o nombre del ejercicio NSCA. */
export function inferEnduranceProtocol(ex: NscaExercise): EnduranceProtocol {
  const t = `${ex.id} ${ex.name} ${ex.englishName}`.toLowerCase();
  if (/tabata/.test(t)) return 'tabata';
  if (/amrap/.test(t)) return 'amrap';
  if (/emom/.test(t)) return 'emom';
  if (/brick/.test(t)) return 'brick';
  if (/tempo/.test(t)) return 'tempo';
  if (/fartlek/.test(t)) return 'fartlek';
  if (/hill|cuesta|repeats/.test(t)) return 'hill_repeats';
  if (/strides|progresion/.test(t)) return 'strides';
  if (/lsd|long.?slow/.test(t)) return 'lsd';
  if (/test|2k|ftp|time.?trial/.test(t)) return 'time_trial';
  if (/interval|vo2|30[/\\]30/.test(t)) return 'intervals';
  if (/drill|technique|skip|cadence|cadencia/.test(t)) return 'technique';
  if (/zone\s*2|z2|continu|sweet.?spot|jog|trote/.test(t)) return 'continuous';
  return 'continuous';
}

/** Infiere la zona principal (Coggan/Friel) a partir del protocolo. */
export function inferEnduranceZone(protocol: EnduranceProtocol): EnduranceZone {
  switch (protocol) {
    case 'lsd':
    case 'continuous':
    case 'technique':
    case 'strides':       return 'Z2';
    case 'tempo':         return 'Z3';
    case 'hill_repeats':
    case 'intervals':
    case 'time_trial':    return 'Z4';
    case 'tabata':
    case 'amrap':
    case 'emom':          return 'Z5';
    case 'fartlek':
    case 'brick':
    default:              return 'mixed';
  }
}

/**
 * Construye un objeto EnduranceParams a partir de un NscaExercise de endurance.
 * Se usa al añadir el ejercicio desde la biblioteca a una rutina del paciente
 * para que el editor abra ya con los campos correctos pre-poblados.
 */
export function buildEnduranceParamsFromNsca(ex: NscaExercise): EnduranceParams | undefined {
  if (!isEnduranceExercise(ex)) return undefined;
  const protocol = inferEnduranceProtocol(ex);
  return {
    modality: inferEnduranceModality(ex),
    protocol,
    zone: inferEnduranceZone(protocol)
  };
}

export const ENDURANCE_MODALITY_LABELS: Record<EnduranceModality, string> = {
  run: 'Running',
  bike: 'Ciclismo',
  swim: 'Natación',
  row: 'Remo (erg)',
  airbike: 'AirBike / Assault',
  skierg: 'SkiErg',
  rope: 'Cuerda',
  stairs: 'Escaleras',
  brick: 'Brick (multi-disciplina)',
  metcon: 'MetCon / Circuito',
  mixed: 'Mixto / Otro'
};

export const ENDURANCE_PROTOCOL_LABELS: Record<EnduranceProtocol, string> = {
  continuous: 'Continuo (Z2)',
  lsd: 'LSD — Long Slow Distance',
  tempo: 'Tempo / Umbral (Z3-Z4)',
  intervals: 'Intervalos VO2max (Z4-Z5)',
  fartlek: 'Fartlek',
  hill_repeats: 'Cuestas / Hill Repeats',
  strides: 'Progresiones / Strides',
  time_trial: 'Time Trial / Test',
  tabata: 'Tabata (20/10 × 8)',
  amrap: 'AMRAP',
  emom: 'EMOM',
  brick: 'Brick (triatlón)',
  technique: 'Drills / Técnica'
};

export const ENDURANCE_ZONE_LABELS: Record<EnduranceZone, string> = {
  Z1: 'Z1 — Recovery (<55% FTP)',
  Z2: 'Z2 — Endurance (56-75% FTP)',
  Z3: 'Z3 — Tempo (76-90% FTP)',
  Z4: 'Z4 — Threshold (91-105% FTP)',
  Z5: 'Z5 — VO2max (>106% FTP)',
  mixed: 'Mixta / Variable'
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pectoral',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebrazo',
  quads: 'Cuádriceps',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiales',
  calves: 'Pantorrillas',
  legs: 'Tren inferior (general)',
  core: 'Core',
  fullbody: 'Cuerpo completo'
};

/** Listado de los grupos en un orden anatómico cómodo para selectores. */
export const MUSCLE_GROUPS_ORDERED: MuscleGroup[] = [
  'chest', 'back', 'shoulders',
  'biceps', 'triceps', 'forearm',
  'quads', 'hamstrings', 'glutes', 'calves', 'legs',
  'core', 'fullbody'
];

export const PUSH_PULL_LABELS: Record<PushPullKind, string> = {
  push: 'Empuje',
  pull: 'Tracción',
  mixed: 'Mixto',
  power: 'Potencia / Olímpicos',
  core: 'Core / Estabilidad'
};

const byId = new Map<string, NscaExercise>();
NSCA_EXERCISES.forEach(e => byId.set(e.id, e));

export const findNscaExerciseById = (id?: string | null): NscaExercise | null => {
  if (!id) return null;
  return byId.get(id) ?? null;
};

/**
 * Devuelve todos los ejercicios que tocan un grupo muscular,
 * ordenados por: primero los de pushPull elegido (si se da) y luego por nombre.
 */
export function exercisesForMuscle(muscle: MuscleGroup, pushPull?: PushPullKind, equipment?: string[]): NscaExercise[] {
  const list = NSCA_EXERCISES.filter(e =>
    e.primaryMuscle === muscle || e.muscleGroups.includes(muscle)
  );
  const filteredByEq = (equipment && equipment.length > 0)
    ? list.filter(e => e.equipment.some(eq => equipment.includes(eq) || eq === 'Peso Corporal'))
    : list;
  const sorted = [...filteredByEq].sort((a, b) => {
    if (pushPull) {
      const aMatch = a.pushPull === pushPull ? 0 : 1;
      const bMatch = b.pushPull === pushPull ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
    }
    return a.name.localeCompare(b.name);
  });
  return sorted;
}

export function exercisesByPushPull(kind: PushPullKind): NscaExercise[] {
  return NSCA_EXERCISES.filter(e => e.pushPull === kind);
}

/** Mapa de claves técnicas conocidas → label en español a mostrar. */
const TECH_LABEL_ORDER: Array<[string, string]> = [
  ['posicion_inicial', 'Posición inicial'],
  ['posicion_inicial_atleta', 'Posición inicial — atleta'],
  ['posicion_inicial_asistente', 'Posición inicial — asistente'],
  ['fase_descendente', 'Fase descendente'],
  ['fase_descendente_atleta', 'Fase descendente — atleta'],
  ['fase_descendente_asistente', 'Fase descendente — asistente'],
  ['fase_ascendente', 'Fase ascendente'],
  ['fase_ascendente_atleta', 'Fase ascendente — atleta'],
  ['fase_ascendente_asistente', 'Fase ascendente — asistente'],
  ['fase_hacia_adelante', 'Fase hacia adelante'],
  ['fase_hacia_atras', 'Fase hacia atrás'],
  ['movimiento', 'Movimiento'],
  ['primer_tiron', 'Primer tirón'],
  ['segundo_tiron', 'Segundo tirón'],
  ['transicion', 'Transición'],
  ['recepcion', 'Recepción'],
  ['errores_frecuentes', 'Errores frecuentes'],
  ['variaciones', 'Variaciones'],
  ['respiracion', 'Respiración']
];

/**
 * Genera un texto explicativo en español para el glosario.
 * Usa las claves traducidas conocidas en orden, y agrega cualquier otra al final.
 */
export function nscaTechniqueSummary(ex: NscaExercise): string {
  const used = new Set<string>();
  const ordered: Array<[string, string]> = [];
  for (const [key, label] of TECH_LABEL_ORDER) {
    const v = ex.technique[key];
    if (typeof v === 'string' && v.length > 0) {
      ordered.push([label, v]);
      used.add(key);
    }
  }
  for (const [key, value] of Object.entries(ex.technique)) {
    if (used.has(key)) continue;
    if (typeof value === 'string' && value.length > 0) {
      const label = key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
      ordered.push([label, value]);
    }
  }
  return ordered.map(([label, content]) => `${label}: ${content}`).join('\n\n');
}

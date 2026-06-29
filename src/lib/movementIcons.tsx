/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ilustraciones SVG originales (v3) por patrón de movimiento.
 * Estilo: pictograma atlético — cuerpo dibujado con tramos gruesos redondeados
 * (efecto "tubular" tipo señalética olímpica) en vez de stick-figure plano.
 *
 * Cada ícono incluye:
 *  · Cabeza filled
 *  · Cuerpo + extremidades con stroke grueso (linecap round)
 *  · Equipamiento detallado (barra con mangas/collares, banca, cajón)
 *  · Resaltado del músculo principal en naranja translúcido
 *  · Flecha direccional indicando el esfuerzo concéntrico
 *  · Línea de piso punteada como referencia espacial
 *
 * ViewBox 96x96. Diseñadas originalmente para MankindFactory — NO reproducen
 * imágenes del manual NSCA ni de ningún otro material protegido.
 */

import React from 'react';
import type { NscaExercise } from './nsca';

export type MovementPattern =
  | 'push-horizontal'
  | 'push-vertical'
  | 'pull-horizontal'
  | 'pull-vertical'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'core'
  | 'jump'
  | 'throw'
  | 'isolation-arm'
  | 'isolation-leg'
  | 'cardio'
  | 'rotation'
  | 'generic';

export const PATTERN_LABELS: Record<MovementPattern, string> = {
  'push-horizontal': 'Empuje horizontal',
  'push-vertical': 'Empuje vertical',
  'pull-horizontal': 'Tracción horizontal',
  'pull-vertical': 'Tracción vertical',
  'squat': 'Sentadilla',
  'hinge': 'Bisagra de cadera',
  'lunge': 'Zancada / unilateral',
  'carry': 'Carga / acarreo',
  'core': 'Estabilidad de core',
  'jump': 'Salto / pliometría',
  'throw': 'Lanzamiento',
  'isolation-arm': 'Aislamiento de brazo',
  'isolation-leg': 'Aislamiento de pierna',
  'cardio': 'Cardio / ergómetro',
  'rotation': 'Rotación',
  'generic': 'Patrón general'
};

/**
 * Detecta el patrón biomecánico a partir SOLO del nombre del ejercicio,
 * sin necesidad de un NscaExercise completo. Útil cuando una rutina contiene
 * ejercicios escritos por el coach que no están en la biblioteca NSCA.
 *
 * Incluye sinónimos en español + inglés para máxima cobertura.
 */
export function patternFromName(name: string): MovementPattern {
  const n = (name || '').toLowerCase();

  // ES + EN combinados, frases largas primero
  if (/snatch|arranque|power\s*clean|hang|cargada|clean\s*and\s*jerk|env[ií]on/.test(n)) return 'pull-vertical';

  // Empuje vertical (over-head)
  if (/push\s*press|overhead\s*press|military|press\s*militar|press\s*hombro|press\s*de\s*hombro|shoulder\s*press|pike\s*push|hspu|handstand|arnold|z-press|z\s*press|landmine\s*press/.test(n)) return 'push-vertical';

  // Tracción vertical
  if (/pull-?up|chin-?up|dominadas|jal[óo]n|pulldown|lat\s*pull|muscle-?up|trepada|rope\s*climb|trepa/.test(n)) return 'pull-vertical';

  // Tracción horizontal
  if (/remo|row\b|pendlay|meadows|face\s*pull|encogimientos|shrug|t-?bar|seated\s*row|jal[óo]n\s*horizontal|pull-?through/.test(n)) return 'pull-horizontal';

  // Empuje horizontal (banca y derivados)
  if (/press\s*de\s*banca|press\s*banca|bench\s*press|fondos|paralelas|push-?up|flexi[óo]n|flexiones|press\s*franc[ée]s|press\s*frances|skull|fly|aperturas|crossover|cruce\s*de\s*polea|chest\s*press|pec\s*deck|floor\s*press|jm\s*press|tate|press\s*franc|kickback|press\s*pec/.test(n)) return 'push-horizontal';

  // Bisagra de cadera
  if (/peso\s*muerto|deadlift|rdl|romanian|hinge|good\s*morning|buenos\s*d[ií]as|swing|hip\s*thrust|gl[úu]teo\s*puente|puente\s*de\s*gl|glute\s*bridge|jefferson|reverse\s*hyper|glute\s*ham|stiff/.test(n)) return 'hinge';

  // Sentadilla
  if (/sentadilla|squat|leg\s*press|prensa\s*de\s*piernas|hack|hip\s*sled|goblet|cossack|belt\s*squat/.test(n)) return 'squat';

  // Zancada / unilateral
  if (/zancada|lunge|split\s*squat|step.?up|step\s*up|paso\s*adelante|b[úu]lgara/.test(n)) return 'lunge';

  // Carga / acarreo
  if (/farmer|granjero|carry|carga\s*caminando|sled|trineo|tire\s*flip|volteo|sandbag|caminata/.test(n)) return 'carry';

  // Core / estabilidad
  if (/plancha|plank|hollow|dragon\s*flag|pallof|crunch|sit-?up|abdominal|wood\s*chop|le[ñn]ador|leg\s*raise|elevaci[óo]n\s*de\s*piernas|ab\s*wheel|rueda\s*abdominal|jackknife|pike|rollout|bear\s*crawl/.test(n)) return 'core';

  // Salto
  if (/salto|box\s*jump|broad\s*jump|jump\b|burpee|bound|hop|brinco|pliom[ée]tr/.test(n)) return 'jump';

  // Lanzamiento
  if (/lanzamiento|throw|toss|slam|wall\s*ball|lanzar/.test(n)) return 'throw';

  // Rotación
  if (/rotaci[óo]n|twist|chop|woodchop|russian|le[ñn]ador|molino|windmill/.test(n)) return 'rotation';

  // Aislamiento de brazo
  if (/curl|biceps|b[ií]ceps|hammer\s*curl|curl\s*martillo|preacher|curl\s*predicador|spider/.test(n)) return 'isolation-arm';
  if (/triceps|tr[ií]ceps|press\s*franc[ée]s|skullcrusher|skull\s*crusher|pressdown|pushdown|kickback|extensi[óo]n\s*de\s*tr[ií]ceps|french\s*press/.test(n)) return 'isolation-arm';
  if (/elevaci[óo]n\s*lateral|elevaci[óo]n\s*frontal|lateral\s*raise|side\s*raise|front\s*raise|p[áa]jaros|reverse\s*fly|rear\s*delt|upright\s*row|curl\s*de\s*mu[ñn]eca|wrist\s*curl/.test(n)) return 'isolation-arm';

  // Aislamiento de pierna
  if (/elevaci[óo]n\s*de\s*talones|calf\s*raise|leg\s*curl|curl\s*femoral|leg\s*extension|extensi[óo]n\s*de\s*cu[áa]driceps|abductores|aductores/.test(n)) return 'isolation-leg';

  // Cardio / endurance / cross-training
  if (/airbike|air\s*bike|assault|rower|remo\s*erg|ergometro|rowing\s*erg|jump\s*rope|saltar\s*la\s*cuerda|cuerda\s*para\s*saltar|treadmill|cinta|skierg|burpee|thruster|carrera|sprint|run\b|tempo|fartlek|long\s*slow|lsd|hill\s*repeats|cuesta|strides|progresiones|cadence|cadencia|natación|nataci[óo]n|swim|nado|crol|catch.?up|drill|cycling|ciclismo|ftp|sweet\s*spot|brick|metcon|amrap|emom|tabata|escaleras|stairs|stride|skip|z2|zona\s*[0-9]|vo2|umbral|threshold|drill|triat|triathlon|maraton|maratón|5k|10k|21k|42k|cardio|aer[óo]bic/.test(n)) return 'cardio';

  // Turkish get-up / variantes integrales → core
  if (/turkish\s*get-?up|get-?up|renegade/.test(n)) return 'core';

  return 'generic';
}

export function patternForExercise(ex: NscaExercise): MovementPattern {
  // Primero por nombre — la heurística cubre la mayoría de casos
  const byName = patternFromName(ex.name + ' ' + ex.englishName);
  if (byName !== 'generic') return byName;

  // Fallback por metadata
  const m = ex.primaryMuscle;
  const pp = ex.pushPull;
  if (pp === 'power') return 'pull-vertical';
  if (pp === 'core') return 'core';
  if (pp === 'push') return m === 'shoulders' ? 'push-vertical' : 'push-horizontal';
  if (pp === 'pull') return m === 'back' ? 'pull-horizontal' : 'pull-vertical';
  return 'generic';
}

/* ----------------------------------------------------------------------- *
 * Paleta y helpers reutilizables
 * ----------------------------------------------------------------------- */

const ACCENT = '#FF6B35';        // naranja para flechas + músculo destacado
const ACCENT_SOFT = '#FF6B35';   // mismo color con opacity baja

/** Define un marcador de flecha que se referencia con marker-end="url(#mfAr)". */
const ARROW_DEFS = `
  <defs>
    <marker id="mfAr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="${ACCENT}"/>
    </marker>
  </defs>
`;

const FLOOR = `<line x1="6" y1="90" x2="90" y2="90" stroke="currentColor" stroke-opacity="0.25" stroke-dasharray="3,3" stroke-width="1.2"/>`;

/** Cabeza filled. */
const head = (cx: number, cy: number, r = 6) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor"/>`;

/**
 * Tramo corporal "tubular": stroke grueso con linecap redondo.
 * Esto da el efecto silueta filled sin tener que dibujar contornos cerrados.
 */
const limb = (x1: number, y1: number, x2: number, y2: number, w = 7) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"/>`;

/** Tronco como un trapecio filled más anatómico. */
const torsoPath = (top: number, bottom: number, topW: number, bottomW: number, cx = 48) => {
  const x1 = cx - topW / 2, x2 = cx + topW / 2;
  const x3 = cx + bottomW / 2, x4 = cx - bottomW / 2;
  return `<path d="M${x1} ${top} L${x2} ${top} L${x3} ${bottom} L${x4} ${bottom} Z" fill="currentColor" opacity="0.92"/>`;
};

/** Barra olímpica con mangas y collares visibles. */
const barbell = (cx: number, cy: number, span = 70, plateR = 6) => {
  const half = span / 2;
  const sleeveW = 6;
  return `
    <line x1="${cx - half + sleeveW}" y1="${cy}" x2="${cx + half - sleeveW}" y2="${cy}" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
    <rect x="${cx - half}" y="${cy - 2}" width="${sleeveW}" height="4" fill="currentColor"/>
    <rect x="${cx + half - sleeveW}" y="${cy - 2}" width="${sleeveW}" height="4" fill="currentColor"/>
    <circle cx="${cx - half + 1}" cy="${cy}" r="${plateR}" fill="currentColor" opacity="0.85"/>
    <circle cx="${cx + half - 1}" cy="${cy}" r="${plateR}" fill="currentColor" opacity="0.85"/>
    <circle cx="${cx - half + 1}" cy="${cy}" r="${plateR * 0.35}" fill="currentColor" opacity="0.4"/>
    <circle cx="${cx + half - 1}" cy="${cy}" r="${plateR * 0.35}" fill="currentColor" opacity="0.4"/>
  `;
};

/** Mancuerna pequeña. */
const dumbbell = (cx: number, cy: number, vertical = false) => {
  if (vertical) {
    return `
      <rect x="${cx - 2}" y="${cy - 8}" width="4" height="16" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>
      <rect x="${cx - 4}" y="${cy - 10}" width="8" height="5" rx="1" fill="currentColor"/>
      <rect x="${cx - 4}" y="${cy + 5}" width="8" height="5" rx="1" fill="currentColor"/>
    `;
  }
  return `
    <rect x="${cx - 8}" y="${cy - 2}" width="16" height="4" fill="currentColor" stroke="currentColor" stroke-width="0.5"/>
    <rect x="${cx - 10}" y="${cy - 4}" width="5" height="8" rx="1" fill="currentColor"/>
    <rect x="${cx + 5}" y="${cy - 4}" width="5" height="8" rx="1" fill="currentColor"/>
  `;
};

/** Resaltado de músculo objetivo (zona coloreada translúcida). */
const muscle = (path: string) =>
  `<path d="${path}" fill="${ACCENT}" opacity="0.45" stroke="${ACCENT}" stroke-width="0.5" stroke-opacity="0.7"/>`;

/** Flecha direccional recta. */
const arrow = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ACCENT}" stroke-width="2.6" stroke-linecap="round" marker-end="url(#mfAr)"/>`;

/** Flecha curva (trayectoria) — útil para saltos, lanzamientos, rotaciones. */
const arcArrow = (d: string) =>
  `<path d="${d}" stroke="${ACCENT}" stroke-width="2.4" fill="none" stroke-linecap="round" marker-end="url(#mfAr)"/>`;

/* ----------------------------------------------------------------------- *
 * Inner SVG por patrón
 * ----------------------------------------------------------------------- */

const SVG_INNER: Record<MovementPattern, string> = {
  // EMPUJE HORIZONTAL — figura acostada en banca empujando barra
  'push-horizontal': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Banca -->
    <rect x="12" y="64" width="72" height="5" rx="2" fill="currentColor" opacity="0.85"/>
    <rect x="14" y="69" width="4" height="18" fill="currentColor" opacity="0.7"/>
    <rect x="78" y="69" width="4" height="18" fill="currentColor" opacity="0.7"/>
    <!-- Cuerpo acostado: cabeza + torso + piernas (plegadas, pies en banca) -->
    ${head(20, 58)}
    ${torsoPath(57, 64, 14, 18, 38)}
    ${limb(38, 64, 56, 64, 8)}
    <!-- Piernas plegadas/apoyo -->
    ${limb(58, 62, 70, 56, 6)}
    ${limb(70, 56, 80, 64, 6)}
    <!-- Brazos extendidos hacia arriba sosteniendo la barra -->
    ${limb(36, 60, 36, 38, 6)}
    ${limb(44, 60, 44, 38, 6)}
    <!-- Músculo: pecho -->
    ${muscle('M28 56 Q40 50 52 56 L52 62 Q40 60 28 60 Z')}
    <!-- Barra -->
    ${barbell(40, 36, 64, 7)}
    <!-- Flecha hacia arriba -->
    ${arrow(72, 60, 72, 34)}
  `,

  // EMPUJE VERTICAL — figura de pie haciendo press de hombro
  'push-vertical': `
    ${ARROW_DEFS}${FLOOR}
    ${head(48, 26)}
    ${torsoPath(32, 56, 18, 14)}
    <!-- Brazos arriba sosteniendo barra -->
    ${limb(40, 34, 32, 18, 7)}
    ${limb(56, 34, 64, 18, 7)}
    <!-- Piernas -->
    ${limb(44, 56, 40, 86, 7)}
    ${limb(52, 56, 56, 86, 7)}
    <!-- Músculo: hombros / deltoides -->
    ${muscle('M36 30 Q48 24 60 30 L58 38 Q48 34 38 38 Z')}
    <!-- Barra olímpica encima -->
    ${barbell(48, 14, 64, 6)}
    <!-- Flecha hacia arriba -->
    ${arrow(78, 32, 78, 14)}
  `,

  // TRACCIÓN HORIZONTAL — remo con barra
  'pull-horizontal': `
    ${ARROW_DEFS}${FLOOR}
    ${head(28, 30)}
    <!-- Torso inclinado adelante -->
    <path d="M22 36 L36 36 L58 50 L48 52 Z" fill="currentColor" opacity="0.92"/>
    <!-- Músculo: dorsal/espalda -->
    ${muscle('M26 36 Q44 38 56 50 L52 54 Q38 46 24 44 Z')}
    <!-- Brazos tirando barra hacia el torso -->
    ${limb(32, 36, 30, 58, 7)}
    ${limb(50, 52, 48, 70, 7)}
    <!-- Barra al final de los brazos -->
    ${barbell(40, 70, 56, 6)}
    <!-- Piernas semi-flexionadas -->
    ${limb(56, 52, 60, 86, 7)}
    ${limb(64, 52, 70, 86, 7)}
    <!-- Flecha indicando dirección del tirón -->
    ${arrow(16, 70, 36, 60)}
  `,

  // TRACCIÓN VERTICAL — pull-up
  'pull-vertical': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Barra fija arriba -->
    <line x1="10" y1="14" x2="86" y2="14" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <line x1="12" y1="14" x2="12" y2="6" stroke="currentColor" stroke-width="3"/>
    <line x1="84" y1="14" x2="84" y2="6" stroke="currentColor" stroke-width="3"/>
    <!-- Manos agarrando barra (pequeños puños) -->
    <circle cx="34" cy="14" r="3.5" fill="currentColor"/>
    <circle cx="62" cy="14" r="3.5" fill="currentColor"/>
    <!-- Brazos -->
    ${limb(34, 16, 42, 36, 7)}
    ${limb(62, 16, 54, 36, 7)}
    <!-- Cabeza un poco bajo la barra (a mitad de subida) -->
    ${head(48, 34)}
    <!-- Torso colgando -->
    ${torsoPath(40, 64, 16, 13)}
    <!-- Músculo: dorsales -->
    ${muscle('M38 44 Q48 40 58 44 L58 58 Q48 54 38 58 Z')}
    <!-- Piernas colgando flexionadas -->
    ${limb(44, 64, 38, 84, 7)}
    ${limb(52, 64, 58, 84, 7)}
    <!-- Flecha subiendo -->
    ${arrow(78, 50, 78, 22)}
  `,

  // SENTADILLA — barra trasera, sentadilla profunda
  'squat': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Cabeza inclinada levemente adelante -->
    ${head(46, 22)}
    <!-- Tronco con leve inclinación -->
    <path d="M40 26 L56 26 L58 50 L40 50 Z" fill="currentColor" opacity="0.92"/>
    <!-- Brazos sosteniendo barra trasera -->
    ${limb(40, 28, 26, 30, 6)}
    ${limb(56, 28, 70, 30, 6)}
    <!-- Barra detrás de los hombros -->
    ${barbell(48, 28, 64, 7)}
    <!-- Muslos casi paralelos al piso -->
    ${limb(42, 52, 30, 64, 9)}
    ${limb(54, 52, 66, 64, 9)}
    <!-- Tibias rectas -->
    ${limb(30, 64, 32, 86, 7)}
    ${limb(66, 64, 64, 86, 7)}
    <!-- Músculo: cuádriceps marcados -->
    ${muscle('M30 52 Q42 50 42 64 L36 66 Q30 60 26 56 Z')}
    ${muscle('M54 52 Q66 50 70 56 L66 66 Q60 64 54 64 Z')}
    <!-- Flecha hacia arriba (concéntrica) -->
    ${arrow(84, 62, 84, 30)}
  `,

  // BISAGRA DE CADERA — deadlift / RDL
  'hinge': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Cabeza adelante y abajo -->
    ${head(28, 30)}
    <!-- Tronco horizontal -->
    <path d="M22 36 L36 32 L60 38 L54 44 Z" fill="currentColor" opacity="0.92"/>
    <!-- Músculo: cadena posterior (lumbar/glúteo) -->
    ${muscle('M40 36 Q56 38 64 56 L58 58 Q50 48 38 44 Z')}
    <!-- Cadera y piernas -->
    ${limb(54, 42, 64, 64, 9)}
    ${limb(64, 64, 66, 86, 7)}
    <!-- Brazos colgando -->
    ${limb(36, 36, 36, 60, 6)}
    ${limb(38, 38, 42, 60, 6)}
    <!-- Barra colgando bajo -->
    ${barbell(40, 62, 56, 7)}
    <!-- Flecha curva subiendo -->
    ${arcArrow('M30 76 Q50 80 76 50')}
  `,

  // ZANCADA — paso adelante con flexión profunda
  'lunge': `
    ${ARROW_DEFS}${FLOOR}
    ${head(48, 22)}
    ${torsoPath(28, 50, 14, 12)}
    <!-- Brazos al costado con mancuernas -->
    ${limb(42, 30, 32, 56, 6)}
    ${limb(54, 30, 64, 56, 6)}
    ${dumbbell(32, 58, false)}
    ${dumbbell(64, 58, false)}
    <!-- Pierna delantera flexionada (izq) -->
    ${limb(46, 50, 28, 68, 9)}
    ${limb(28, 68, 28, 86, 7)}
    <!-- Pierna trasera extendida (der) -->
    ${limb(50, 50, 70, 78, 8)}
    ${limb(70, 78, 78, 86, 6)}
    <!-- Músculo: cuádriceps de la pierna delantera -->
    ${muscle('M28 56 Q42 58 42 68 L36 70 Q28 64 24 60 Z')}
    <!-- Flecha hacia abajo+arriba -->
    ${arrow(48, 72, 48, 52)}
  `,

  // CARGA / FARMER WALK — caminata con peso
  'carry': `
    ${ARROW_DEFS}${FLOOR}
    ${head(48, 20)}
    ${torsoPath(26, 56, 18, 14)}
    <!-- Brazos rectos a los lados sosteniendo peso -->
    ${limb(40, 30, 26, 60, 7)}
    ${limb(56, 30, 70, 60, 7)}
    <!-- Pesos pesados a cada lado (cajas o sacos) -->
    <rect x="20" y="60" width="14" height="18" rx="2" fill="currentColor" opacity="0.9"/>
    <rect x="62" y="60" width="14" height="18" rx="2" fill="currentColor" opacity="0.9"/>
    <line x1="27" y1="64" x2="27" y2="74" stroke="white" stroke-opacity="0.35" stroke-width="1.5"/>
    <line x1="69" y1="64" x2="69" y2="74" stroke="white" stroke-opacity="0.35" stroke-width="1.5"/>
    <!-- Piernas en paso (una adelante, otra atrás) -->
    ${limb(44, 56, 40, 86, 7)}
    ${limb(52, 56, 58, 84, 7)}
    <!-- Músculo: core / antebrazos -->
    ${muscle('M40 44 Q48 42 56 44 L56 54 Q48 50 40 54 Z')}
    <!-- Flecha de avance horizontal -->
    ${arrow(20, 88, 76, 88)}
  `,

  // CORE — plancha frontal
  'core': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Cabeza a la izquierda, cuerpo horizontal -->
    ${head(18, 54)}
    <!-- Antebrazos apoyados -->
    ${limb(18, 60, 22, 78, 7)}
    ${limb(22, 78, 30, 78, 7)}
    <!-- Cuerpo recto desde hombros a tobillos -->
    <path d="M22 56 L26 50 L80 58 L80 64 L26 62 Z" fill="currentColor" opacity="0.92"/>
    <!-- Pierna -->
    ${limb(80, 60, 84, 78, 7)}
    <!-- Pies apoyados -->
    <line x1="80" y1="78" x2="88" y2="78" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
    <!-- Músculo: abdominales destacados -->
    ${muscle('M30 54 Q54 52 76 60 L76 62 Q54 60 30 62 Z')}
    <!-- Etiqueta indicando isometría -->
    <text x="56" y="44" text-anchor="middle" font-family="monospace" font-size="9" font-weight="800" fill="${ACCENT}" opacity="0.85">ISO</text>
  `,

  // SALTO — figura en el aire con trayectoria de arco
  'jump': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Cajón pliométrico -->
    <rect x="54" y="62" width="34" height="24" rx="2" fill="currentColor" opacity="0.3" stroke="currentColor" stroke-width="2"/>
    <line x1="54" y1="70" x2="88" y2="70" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.5"/>
    <!-- Figura en el aire (lado izquierdo) -->
    ${head(24, 22)}
    ${torsoPath(28, 48, 13, 11, 24)}
    <!-- Brazos hacia arriba en preparación -->
    ${limb(20, 30, 12, 14, 6)}
    ${limb(28, 30, 36, 14, 6)}
    <!-- Piernas flexionadas en aire -->
    ${limb(22, 48, 16, 60, 7)}
    ${limb(26, 48, 30, 60, 7)}
    <!-- Músculo: cuádriceps -->
    ${muscle('M18 52 L24 60 L30 60 L24 50 Z')}
    <!-- Arco de trayectoria del salto -->
    ${arcArrow('M22 56 Q48 18 68 60')}
  `,

  // LANZAMIENTO — figura lanzando balón con trayectoria
  'throw': `
    ${ARROW_DEFS}${FLOOR}
    ${head(26, 30)}
    ${torsoPath(34, 60, 14, 12, 26)}
    <!-- Piernas en base de apoyo -->
    ${limb(22, 60, 18, 86, 7)}
    ${limb(30, 60, 34, 86, 7)}
    <!-- Brazo lanzando atrás → adelante -->
    ${limb(20, 38, 14, 52, 5)}
    ${limb(32, 38, 50, 28, 6)}
    ${limb(50, 28, 64, 18, 6)}
    <!-- Balón saliendo de la mano -->
    <circle cx="68" cy="14" r="6.5" fill="${ACCENT}" opacity="0.9"/>
    <circle cx="66" cy="12" r="2" fill="white" opacity="0.4"/>
    <!-- Músculo: deltoide/pecho -->
    ${muscle('M18 36 Q26 32 34 36 L34 46 Q26 42 18 46 Z')}
    <!-- Trayectoria del balón -->
    ${arcArrow('M76 14 Q86 4 90 24')}
  `,

  // AISLAMIENTO DE BRAZO — curl con mancuerna
  'isolation-arm': `
    ${ARROW_DEFS}${FLOOR}
    ${head(48, 20)}
    ${torsoPath(26, 56, 16, 13)}
    <!-- Piernas -->
    ${limb(44, 56, 40, 86, 7)}
    ${limb(52, 56, 56, 86, 7)}
    <!-- Brazo izquierdo al costado (descansando) -->
    ${limb(42, 30, 38, 52, 5)}
    ${dumbbell(38, 54, true)}
    <!-- Brazo derecho en curl arriba (hombro→codo→mano cerca del hombro) -->
    ${limb(54, 30, 64, 46, 6)}
    ${limb(64, 46, 56, 38, 6)}
    ${dumbbell(56, 38, true)}
    <!-- Músculo: bíceps grande resaltado en el brazo activo -->
    ${muscle('M55 32 Q66 36 68 46 L62 48 Q56 40 52 36 Z')}
    <!-- Flecha curva indicando el curl -->
    ${arcArrow('M72 50 Q78 38 60 28')}
  `,

  // AISLAMIENTO DE PIERNA — extensión de cuádriceps en máquina
  'isolation-leg': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Asiento de la máquina -->
    <rect x="10" y="56" width="40" height="6" rx="2" fill="currentColor" opacity="0.85"/>
    <rect x="10" y="62" width="40" height="22" rx="1" fill="currentColor" opacity="0.4"/>
    <!-- Respaldo -->
    <rect x="10" y="28" width="6" height="30" rx="1" fill="currentColor" opacity="0.7"/>
    <!-- Cabeza sentada -->
    ${head(22, 36)}
    <!-- Torso sentado erguido -->
    ${torsoPath(42, 58, 12, 12, 24)}
    <!-- Brazo apoyado -->
    ${limb(18, 44, 16, 56, 5)}
    ${limb(30, 44, 32, 56, 5)}
    <!-- Pierna en extensión (más larga, hacia arriba/adelante) -->
    ${limb(30, 60, 70, 50, 10)}
    <!-- Palanca de carga -->
    <rect x="68" y="46" width="8" height="10" rx="2" fill="currentColor" opacity="0.85"/>
    <rect x="62" y="50" width="20" height="3" rx="1" fill="currentColor"/>
    <!-- Músculo: cuádriceps -->
    ${muscle('M34 56 Q50 52 68 50 L68 54 Q50 56 34 60 Z')}
    <!-- Otra pierna sin movimiento -->
    ${limb(30, 60, 32, 84, 5)}
    <!-- Flecha curva -->
    ${arcArrow('M60 66 Q76 62 74 50')}
  `,

  // CARDIO — figura en ergómetro de remo
  'cardio': `
    ${ARROW_DEFS}${FLOOR}
    <!-- Volante del rower con marcas -->
    <circle cx="76" cy="56" r="14" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.5"/>
    <line x1="76" y1="56" x2="68" y2="48" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
    <line x1="76" y1="56" x2="84" y2="48" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
    <line x1="76" y1="56" x2="68" y2="64" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
    <line x1="76" y1="56" x2="84" y2="64" stroke="currentColor" stroke-width="1.5" stroke-opacity="0.5"/>
    <!-- Cable + manija -->
    <line x1="62" y1="56" x2="40" y2="56" stroke="currentColor" stroke-width="2" stroke-dasharray="2,2"/>
    <rect x="34" y="53" width="8" height="6" rx="1" fill="currentColor"/>
    <!-- Asiento -->
    <rect x="10" y="64" width="20" height="4" rx="1" fill="currentColor" opacity="0.7"/>
    <!-- Figura sentada inclinada atrás (fin del tirón) -->
    ${head(18, 36)}
    ${torsoPath(40, 62, 12, 10, 22)}
    <!-- Brazos tirando manija -->
    ${limb(18, 40, 32, 56, 6)}
    ${limb(26, 40, 36, 56, 6)}
    <!-- Piernas extendidas -->
    ${limb(30, 64, 52, 76, 8)}
    ${limb(30, 64, 50, 84, 7)}
    <!-- Músculo: espalda alta -->
    ${muscle('M16 42 Q24 38 32 44 L30 50 Q22 46 16 50 Z')}
    <!-- Flecha del tirón -->
    ${arrow(40, 80, 22, 80)}
  `,

  // ROTACIÓN — wood chop / russian twist
  'rotation': `
    ${ARROW_DEFS}${FLOOR}
    ${head(48, 22)}
    <!-- Torso rotado (visto desde frente, con leve giro) -->
    ${torsoPath(28, 56, 17, 13)}
    <!-- Piernas en base sólida -->
    ${limb(44, 56, 40, 86, 7)}
    ${limb(52, 56, 56, 86, 7)}
    <!-- Brazos con leño/cuerda en posición alta (origen del chop) -->
    ${limb(40, 32, 22, 16, 6)}
    ${limb(48, 32, 30, 14, 6)}
    <!-- Mancuerna o disco en las manos arriba a la izquierda -->
    <circle cx="22" cy="14" r="5" fill="currentColor"/>
    <!-- Sombra del extremo opuesto (donde termina el chop, abajo a la derecha) -->
    <circle cx="72" cy="60" r="4" fill="currentColor" opacity="0.25"/>
    <!-- Músculo: oblicuos -->
    ${muscle('M38 42 Q48 38 58 42 L56 56 Q48 50 40 56 Z')}
    <!-- Arco grande de rotación arriba-izq → abajo-der -->
    ${arcArrow('M24 22 Q48 30 70 58')}
  `,

  // GENERIC — figura neutra de pie
  'generic': `
    ${ARROW_DEFS}${FLOOR}
    ${head(48, 20)}
    ${torsoPath(26, 56, 16, 13)}
    ${limb(40, 30, 32, 54, 6)}
    ${limb(56, 30, 64, 54, 6)}
    ${limb(44, 56, 40, 86, 7)}
    ${limb(52, 56, 56, 86, 7)}
  `
};

/* ----------------------------------------------------------------------- *
 * Wrappers React + helpers string-only
 * ----------------------------------------------------------------------- */

interface IconProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

function patternInnerHtml(pattern: MovementPattern): string {
  return SVG_INNER[pattern] ?? SVG_INNER.generic;
}

export function MovementIcon({ pattern, size = 64, className, ariaLabel }: { pattern: MovementPattern } & IconProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={ariaLabel ?? PATTERN_LABELS[pattern]}
      dangerouslySetInnerHTML={{ __html: patternInnerHtml(pattern) }}
    />
  );
}

export function MovementIconForExercise({ exercise, ...rest }: { exercise: NscaExercise } & IconProps) {
  const pattern = patternForExercise(exercise);
  return <MovementIcon pattern={pattern} {...rest} ariaLabel={`Patrón ${PATTERN_LABELS[pattern]}`} />;
}

/** Versión string-only para embeber en HTML exportado (sin React). */
export function movementSvgString(pattern: MovementPattern): string {
  const inner = patternInnerHtml(pattern);
  return `<svg viewBox="0 0 96 96" width="96" height="96" role="img" aria-label="${PATTERN_LABELS[pattern]}">${inner}</svg>`;
}

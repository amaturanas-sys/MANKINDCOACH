/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banco de pictogramas SVG nativos.
 * Cada pictograma es un SVG de 120×120 inline, en estilo línea + acento morado
 * para integrarse al branding MankindFactory.
 *
 * Categorías: anatomía · entrenamiento · salud · mediciones · finanzas ·
 * comunicación · logros.
 *
 * Se usan tanto en la UI (componente Pictogram) como serializados a Data URL
 * para embeber en documentos generados por exporters.ts.
 */

import React from 'react';

export type PictogramCategory =
  | 'anatomia'
  | 'entrenamiento'
  | 'ejercicios'
  | 'equipamiento'
  | 'personajes'
  | 'deportes'
  | 'salud'
  | 'mediciones'
  | 'finanzas'
  | 'comunicacion'
  | 'logros';

export const PICTOGRAM_CATEGORY_LABELS: Record<PictogramCategory, string> = {
  anatomia: 'Anatomía',
  entrenamiento: 'Entrenamiento (símbolos)',
  ejercicios: 'Ejercicios (figuras)',
  equipamiento: 'Equipamiento',
  personajes: 'Personajes / Siluetas',
  deportes: 'Deportes / Cardio',
  salud: 'Salud',
  mediciones: 'Mediciones',
  finanzas: 'Finanzas',
  comunicacion: 'Comunicación',
  logros: 'Logros'
};

export interface Pictogram {
  id: string;
  name: string;
  category: PictogramCategory;
  /** SVG sin las etiquetas envoltorias. El consumidor las añade. */
  body: string;
}

/* ----------------------------------------------------------------------- *
 * Definiciones SVG
 * Estilo: viewBox 120x120 · stroke = currentColor · fill complementario en
 * morado #5D36FF translúcido cuando aplica. Diseñados a mano.
 * ----------------------------------------------------------------------- */

const BRAND = '#5D36FF';
const BRAND_SOFT = '#5D36FF20';

export const PICTOGRAMS: Pictogram[] = [
  /* ============ ANATOMÍA ============ */
  {
    id: 'corazon', name: 'Corazón', category: 'anatomia',
    body: `<path d="M60 95 C 25 70, 15 45, 30 30 C 42 18, 55 25, 60 38 C 65 25, 78 18, 90 30 C 105 45, 95 70, 60 95 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M40 55 L48 55 L52 47 L58 65 L64 55 L72 55" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    id: 'musculo', name: 'Músculo (bíceps)', category: 'anatomia',
    body: `<path d="M20 70 Q 25 50, 45 45 Q 55 30, 70 35 Q 90 38, 95 60 Q 90 80, 75 82 Q 60 85, 50 75 Q 35 80, 20 70 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M55 50 Q 65 55, 70 65 M50 60 Q 60 65, 65 75" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round"/>`
  },
  {
    id: 'pulmones', name: 'Pulmones', category: 'anatomia',
    body: `<path d="M60 28 L60 80" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<path d="M55 28 Q 35 38, 30 60 Q 28 82, 45 88 Q 55 88, 55 78 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M65 28 Q 85 38, 90 60 Q 92 82, 75 88 Q 65 88, 65 78 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="32" r="3" fill="${BRAND}"/>`
  },
  {
    id: 'cerebro', name: 'Cerebro', category: 'anatomia',
    body: `<path d="M40 35 Q 30 40, 30 55 Q 25 65, 32 75 Q 35 88, 50 88 Q 55 95, 65 92 Q 80 95, 85 82 Q 95 78, 92 65 Q 95 55, 88 48 Q 85 35, 70 35 Q 60 25, 50 30 Q 42 28, 40 35 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 35 L60 85 M48 50 Q 60 48, 72 50 M50 70 Q 60 72, 70 70" fill="none" stroke="${BRAND}" stroke-width="1.8"/>`
  },
  {
    id: 'columna', name: 'Columna vertebral', category: 'anatomia',
    body: `<rect x="50" y="20" width="20" height="14" rx="3" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<rect x="48" y="38" width="24" height="10" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<rect x="46" y="52" width="28" height="10" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<rect x="44" y="66" width="32" height="10" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<rect x="42" y="80" width="36" height="14" rx="3" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<line x1="60" y1="34" x2="60" y2="80" stroke="${BRAND}" stroke-width="2" stroke-dasharray="2 3"/>`
  },

  /* ============ ENTRENAMIENTO ============ */
  {
    id: 'mancuerna', name: 'Mancuerna', category: 'entrenamiento',
    body: `<rect x="50" y="50" width="20" height="20" fill="${BRAND}" rx="2"/>
<rect x="20" y="40" width="14" height="40" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" rx="3"/>
<rect x="86" y="40" width="14" height="40" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" rx="3"/>
<rect x="10" y="48" width="10" height="24" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" rx="2"/>
<rect x="100" y="48" width="10" height="24" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" rx="2"/>
<line x1="34" y1="60" x2="86" y2="60" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    id: 'barra', name: 'Barra olímpica', category: 'entrenamiento',
    body: `<line x1="5" y1="60" x2="115" y2="60" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="22" cy="60" r="20" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="98" cy="60" r="20" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="22" cy="60" r="12" fill="${BRAND}" opacity="0.4"/>
<circle cx="98" cy="60" r="12" fill="${BRAND}" opacity="0.4"/>
<circle cx="22" cy="60" r="3" fill="${BRAND}"/>
<circle cx="98" cy="60" r="3" fill="${BRAND}"/>`
  },
  {
    id: 'kettlebell', name: 'Kettlebell', category: 'entrenamiento',
    body: `<path d="M44 40 Q 44 28, 60 28 Q 76 28, 76 40 L 76 50 L 44 50 Z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M30 60 Q 30 50, 45 50 L 75 50 Q 90 50, 90 60 L 90 80 Q 90 100, 60 100 Q 30 100, 30 80 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<text x="60" y="82" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="${BRAND}">16</text>`
  },
  {
    id: 'banda', name: 'Banda elástica', category: 'entrenamiento',
    body: `<path d="M15 30 Q 60 90, 105 30" fill="none" stroke="${BRAND}" stroke-width="6" stroke-linecap="round"/>
<path d="M15 30 Q 60 90, 105 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 3"/>
<circle cx="15" cy="30" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<circle cx="105" cy="30" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'corredor', name: 'Persona corriendo', category: 'entrenamiento',
    body: `<circle cx="70" cy="28" r="9" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M65 38 L60 58 L48 70 L40 60" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M70 38 L78 56 L72 78 L62 92 L70 96" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M78 56 L92 50 L100 58" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M72 78 L88 86 L96 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="40" cy="60" r="3" fill="${BRAND}"/>
<circle cx="96" cy="80" r="3" fill="${BRAND}"/>`
  },
  {
    id: 'sentadilla', name: 'Sentadilla', category: 'entrenamiento',
    body: `<circle cx="60" cy="22" r="9" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 31 L60 50 L42 70 L42 88 L52 88" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 50 L78 70 L78 88 L68 88" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M60 50 L40 50 L40 56 M60 50 L80 50 L80 56" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
<rect x="32" y="44" width="14" height="14" rx="2" fill="${BRAND_SOFT}" stroke="${BRAND}" stroke-width="2"/>
<rect x="74" y="44" width="14" height="14" rx="2" fill="${BRAND_SOFT}" stroke="${BRAND}" stroke-width="2"/>`
  },

  /* ============ SALUD ============ */
  {
    id: 'estetoscopio', name: 'Estetoscopio', category: 'salud',
    body: `<circle cx="40" cy="20" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="80" cy="20" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M40 26 Q 40 65, 60 70 Q 80 65, 80 26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="60" y1="70" x2="60" y2="80" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="92" r="12" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="92" r="5" fill="${BRAND}"/>`
  },
  {
    id: 'pastilla', name: 'Pastilla / cápsula', category: 'salud',
    body: `<rect x="22" y="46" width="76" height="28" rx="14" fill="none" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 46 L60 74" stroke="currentColor" stroke-width="2.5"/>
<rect x="22" y="46" width="38" height="28" rx="14" fill="${BRAND_SOFT}"/>
<rect x="60" y="46" width="38" height="28" rx="14" fill="${BRAND}" opacity="0.7"/>`
  },
  {
    id: 'vendaje', name: 'Vendaje', category: 'salud',
    body: `<rect x="20" y="45" width="80" height="30" rx="14" transform="rotate(-25 60 60)" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="60" r="14" fill="${BRAND}" opacity="0.2"/>
<circle cx="50" cy="58" r="2.5" fill="currentColor"/>
<circle cx="62" cy="55" r="2.5" fill="currentColor"/>
<circle cx="58" cy="65" r="2.5" fill="currentColor"/>
<circle cx="68" cy="64" r="2.5" fill="currentColor"/>`
  },
  {
    id: 'agua', name: 'Hidratación', category: 'salud',
    body: `<path d="M60 14 Q 30 50, 30 72 Q 30 96, 60 96 Q 90 96, 90 72 Q 90 50, 60 14 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M45 70 Q 50 80, 60 80" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="48" cy="62" r="2" fill="${BRAND}"/>`
  },
  {
    id: 'sueno', name: 'Sueño', category: 'salud',
    body: `<path d="M30 60 Q 30 35, 60 35 Q 50 50, 60 65 Q 75 70, 90 60 Q 88 90, 60 90 Q 30 90, 30 60 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<text x="80" y="38" font-family="monospace" font-size="14" font-weight="bold" fill="${BRAND}">Z</text>
<text x="92" y="28" font-family="monospace" font-size="10" font-weight="bold" fill="${BRAND}">z</text>`
  },

  /* ============ MEDICIONES ============ */
  {
    id: 'balanza', name: 'Balanza', category: 'mediciones',
    body: `<rect x="20" y="60" width="80" height="35" rx="4" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<rect x="40" y="50" width="40" height="10" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="78" r="14" fill="white" stroke="currentColor" stroke-width="2"/>
<text x="60" y="84" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="${BRAND}">kg</text>
<line x1="56" y1="68" x2="56" y2="74" stroke="currentColor" stroke-width="2"/>
<line x1="60" y1="66" x2="60" y2="74" stroke="${BRAND}" stroke-width="2.5"/>
<line x1="64" y1="68" x2="64" y2="74" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'regla', name: 'Cinta métrica', category: 'mediciones',
    body: `<rect x="14" y="50" width="92" height="22" rx="3" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="22" y1="50" x2="22" y2="58" stroke="currentColor" stroke-width="2"/>
<line x1="34" y1="50" x2="34" y2="62" stroke="currentColor" stroke-width="2"/>
<line x1="46" y1="50" x2="46" y2="58" stroke="currentColor" stroke-width="2"/>
<line x1="58" y1="50" x2="58" y2="62" stroke="currentColor" stroke-width="2"/>
<line x1="70" y1="50" x2="70" y2="58" stroke="currentColor" stroke-width="2"/>
<line x1="82" y1="50" x2="82" y2="62" stroke="currentColor" stroke-width="2"/>
<line x1="94" y1="50" x2="94" y2="58" stroke="currentColor" stroke-width="2"/>
<text x="60" y="92" text-anchor="middle" font-family="monospace" font-size="11" font-weight="bold" fill="${BRAND}">cm</text>`
  },
  {
    id: 'cronometro', name: 'Cronómetro', category: 'mediciones',
    body: `<rect x="48" y="14" width="24" height="8" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<line x1="60" y1="22" x2="60" y2="32" stroke="currentColor" stroke-width="2"/>
<circle cx="60" cy="68" r="32" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="60" y1="44" x2="60" y2="50" stroke="currentColor" stroke-width="2"/>
<line x1="60" y1="86" x2="60" y2="92" stroke="currentColor" stroke-width="2"/>
<line x1="36" y1="68" x2="42" y2="68" stroke="currentColor" stroke-width="2"/>
<line x1="78" y1="68" x2="84" y2="68" stroke="currentColor" stroke-width="2"/>
<line x1="60" y1="68" x2="74" y2="56" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
<circle cx="60" cy="68" r="3" fill="${BRAND}"/>`
  },
  {
    id: 'grafico', name: 'Gráfico de progreso', category: 'mediciones',
    body: `<line x1="20" y1="95" x2="100" y2="95" stroke="currentColor" stroke-width="2.5"/>
<line x1="20" y1="95" x2="20" y2="25" stroke="currentColor" stroke-width="2.5"/>
<polyline points="28,82 44,68 60,72 76,48 92,32" fill="none" stroke="${BRAND}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="28" cy="82" r="3" fill="${BRAND}"/>
<circle cx="44" cy="68" r="3" fill="${BRAND}"/>
<circle cx="60" cy="72" r="3" fill="${BRAND}"/>
<circle cx="76" cy="48" r="3" fill="${BRAND}"/>
<circle cx="92" cy="32" r="4" fill="${BRAND}"/>
<path d="M88 36 L98 28 M92 26 L100 26 M100 26 L100 34" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" fill="none"/>`
  },
  {
    id: 'calendario', name: 'Calendario', category: 'mediciones',
    body: `<rect x="20" y="22" width="80" height="76" rx="4" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="20" y1="40" x2="100" y2="40" stroke="currentColor" stroke-width="2.5"/>
<rect x="32" y="14" width="6" height="16" rx="2" fill="currentColor"/>
<rect x="82" y="14" width="6" height="16" rx="2" fill="currentColor"/>
<circle cx="40" cy="58" r="3" fill="currentColor"/>
<circle cx="60" cy="58" r="3" fill="currentColor"/>
<circle cx="80" cy="58" r="3" fill="currentColor"/>
<circle cx="40" cy="74" r="3" fill="currentColor"/>
<circle cx="60" cy="74" r="6" fill="${BRAND}"/>
<circle cx="80" cy="74" r="3" fill="currentColor"/>`
  },

  /* ============ FINANZAS ============ */
  {
    id: 'billete', name: 'Dinero / billete', category: 'finanzas',
    body: `<rect x="14" y="38" width="92" height="48" rx="4" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<rect x="22" y="46" width="76" height="32" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>
<circle cx="60" cy="62" r="11" fill="${BRAND}" opacity="0.25" stroke="${BRAND}" stroke-width="2"/>
<text x="60" y="67" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="${BRAND}">$</text>
<circle cx="28" cy="46" r="2" fill="${BRAND}"/>
<circle cx="92" cy="78" r="2" fill="${BRAND}"/>`
  },
  {
    id: 'factura', name: 'Factura / boleta', category: 'finanzas',
    body: `<path d="M30 14 L90 14 L90 100 L80 94 L70 100 L60 94 L50 100 L40 94 L30 100 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<line x1="40" y1="30" x2="80" y2="30" stroke="currentColor" stroke-width="2"/>
<line x1="40" y1="42" x2="76" y2="42" stroke="currentColor" stroke-width="1.5"/>
<line x1="40" y1="52" x2="72" y2="52" stroke="currentColor" stroke-width="1.5"/>
<line x1="40" y1="62" x2="76" y2="62" stroke="currentColor" stroke-width="1.5"/>
<line x1="40" y1="76" x2="60" y2="76" stroke="${BRAND}" stroke-width="2.5"/>
<text x="80" y="79" text-anchor="end" font-family="monospace" font-size="11" font-weight="bold" fill="${BRAND}">$</text>`
  },
  {
    id: 'calculadora', name: 'Calculadora', category: 'finanzas',
    body: `<rect x="22" y="14" width="76" height="92" rx="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<rect x="30" y="22" width="60" height="20" rx="2" fill="white" stroke="currentColor" stroke-width="2"/>
<text x="84" y="38" text-anchor="end" font-family="monospace" font-size="13" font-weight="bold" fill="${BRAND}">123</text>
<circle cx="36" cy="56" r="4" fill="currentColor"/>
<circle cx="52" cy="56" r="4" fill="currentColor"/>
<circle cx="68" cy="56" r="4" fill="currentColor"/>
<circle cx="84" cy="56" r="4" fill="${BRAND}"/>
<circle cx="36" cy="72" r="4" fill="currentColor"/>
<circle cx="52" cy="72" r="4" fill="currentColor"/>
<circle cx="68" cy="72" r="4" fill="currentColor"/>
<circle cx="84" cy="72" r="4" fill="${BRAND}"/>
<circle cx="36" cy="88" r="4" fill="currentColor"/>
<circle cx="52" cy="88" r="4" fill="currentColor"/>
<circle cx="68" cy="88" r="4" fill="currentColor"/>
<circle cx="84" cy="88" r="4" fill="${BRAND}"/>`
  },
  {
    id: 'tarjeta', name: 'Tarjeta de pago', category: 'finanzas',
    body: `<rect x="14" y="34" width="92" height="56" rx="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<rect x="14" y="44" width="92" height="10" fill="currentColor"/>
<rect x="24" y="64" width="14" height="10" rx="1" fill="${BRAND}" opacity="0.6"/>
<line x1="44" y1="70" x2="76" y2="70" stroke="currentColor" stroke-width="2"/>
<line x1="44" y1="80" x2="64" y2="80" stroke="currentColor" stroke-width="2"/>
<circle cx="86" cy="78" r="6" fill="${BRAND}" opacity="0.5"/>
<circle cx="92" cy="78" r="6" fill="${BRAND}" opacity="0.5"/>`
  },

  /* ============ COMUNICACIÓN ============ */
  {
    id: 'chat', name: 'Conversación / chat', category: 'comunicacion',
    body: `<path d="M18 30 Q 18 22, 26 22 L 78 22 Q 86 22, 86 30 L 86 56 Q 86 64, 78 64 L 50 64 L 36 76 L 36 64 L 26 64 Q 18 64, 18 56 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M40 60 Q 40 52, 48 52 L 96 52 Q 104 52, 104 60 L 104 84 Q 104 92, 96 92 L 86 92 L 86 100 L 72 92 L 48 92 Q 40 92, 40 84 Z" fill="white" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="38" cy="42" r="2.5" fill="currentColor"/>
<circle cx="50" cy="42" r="2.5" fill="currentColor"/>
<circle cx="62" cy="42" r="2.5" fill="currentColor"/>
<circle cx="62" cy="72" r="2.5" fill="${BRAND}"/>
<circle cx="74" cy="72" r="2.5" fill="${BRAND}"/>
<circle cx="86" cy="72" r="2.5" fill="${BRAND}"/>`
  },
  {
    id: 'sobre', name: 'Sobre / email', category: 'comunicacion',
    body: `<rect x="14" y="32" width="92" height="60" rx="4" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M14 38 L60 68 L106 38" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M14 88 L42 60 M106 88 L78 60" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"/>
<circle cx="90" cy="42" r="6" fill="${BRAND}" opacity="0.6"/>`
  },
  {
    id: 'libro', name: 'Libro / guía', category: 'comunicacion',
    body: `<path d="M16 26 Q 16 22, 20 22 L 56 22 Q 60 22, 60 26 L 60 96 L 20 96 Q 16 96, 16 92 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M60 26 Q 60 22, 64 22 L 100 22 Q 104 22, 104 26 L 104 92 Q 104 96, 100 96 L 60 96 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<line x1="60" y1="22" x2="60" y2="96" stroke="currentColor" stroke-width="2.5"/>
<line x1="26" y1="38" x2="50" y2="38" stroke="currentColor" stroke-width="1.5"/>
<line x1="26" y1="48" x2="50" y2="48" stroke="currentColor" stroke-width="1.5"/>
<line x1="26" y1="58" x2="44" y2="58" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="38" x2="94" y2="38" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="48" x2="94" y2="48" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="58" x2="88" y2="58" stroke="currentColor" stroke-width="1.5"/>
<rect x="70" y="68" width="24" height="3" fill="${BRAND}"/>`
  },
  {
    id: 'megafono', name: 'Megáfono / anuncio', category: 'comunicacion',
    body: `<path d="M20 50 L60 30 L60 90 L20 70 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M60 30 L92 18 L92 102 L60 90 Z" fill="${BRAND}" opacity="0.5" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M96 50 L106 46 M96 60 L108 60 M96 70 L106 74" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<rect x="38" y="74" width="10" height="22" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>`
  },

  /* ============ LOGROS ============ */
  {
    id: 'trofeo', name: 'Trofeo', category: 'logros',
    body: `<path d="M40 20 L80 20 L80 50 Q 80 70, 60 70 Q 40 70, 40 50 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M40 28 L24 28 Q 22 28, 22 32 L 22 42 Q 22 54, 38 54" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<path d="M80 28 L96 28 Q 98 28, 98 32 L 98 42 Q 98 54, 82 54" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<rect x="48" y="70" width="24" height="10" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<rect x="38" y="82" width="44" height="14" rx="2" fill="${BRAND}" opacity="0.6" stroke="currentColor" stroke-width="2.5"/>
<path d="M52 38 L58 44 L70 32" fill="none" stroke="${BRAND}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    id: 'meta', name: 'Meta / objetivo', category: 'logros',
    body: `<circle cx="60" cy="60" r="40" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="60" r="28" fill="white" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="60" r="16" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<circle cx="60" cy="60" r="6" fill="${BRAND}"/>
<path d="M84 36 L96 24 M88 32 L98 32 L98 22" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    id: 'estrella', name: 'Estrella', category: 'logros',
    body: `<path d="M60 14 L72 46 L106 46 L78 66 L88 98 L60 78 L32 98 L42 66 L14 46 L48 46 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="60" cy="56" r="6" fill="${BRAND}"/>`
  },
  {
    id: 'fuego', name: 'Racha / fuego', category: 'logros',
    body: `<path d="M60 14 Q 76 32, 76 50 Q 76 58, 70 60 Q 76 48, 60 38 Q 50 50, 52 60 Q 52 68, 60 70 Q 50 70, 44 60 Q 36 70, 36 82 Q 36 102, 60 102 Q 84 102, 84 82 Q 84 60, 60 14 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M52 82 Q 56 70, 60 78 Q 64 70, 68 82 Q 64 92, 60 88 Q 56 92, 52 82 Z" fill="${BRAND}"/>`
  },
  {
    id: 'escudo', name: 'Escudo / protección', category: 'logros',
    body: `<path d="M60 14 L96 26 L96 60 Q 96 90, 60 106 Q 24 90, 24 60 L 24 26 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M44 58 L56 70 L78 46" fill="none" stroke="${BRAND}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
  },

  /* ============ EJERCICIOS (figuras humanas haciendo el movimiento) ============ */
  {
    id: 'ej-sentadilla', name: 'Sentadilla con barra', category: 'ejercicios',
    body: `<line x1="18" y1="30" x2="102" y2="30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="22" cy="30" r="6" fill="${BRAND}"/><circle cx="98" cy="30" r="6" fill="${BRAND}"/>
<circle cx="60" cy="42" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 48 L60 70 M60 70 L46 92 M60 70 L74 92 M50 36 L60 50 L70 36" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="42" y1="100" x2="50" y2="100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="70" y1="100" x2="78" y2="100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    id: 'ej-peso-muerto', name: 'Peso muerto', category: 'ejercicios',
    body: `<circle cx="60" cy="22" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 28 L60 60 M60 36 L72 56 M60 36 L48 56 M60 60 L52 92 M60 60 L68 92" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="20" y1="100" x2="100" y2="100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="26" cy="100" r="8" fill="${BRAND}"/><circle cx="94" cy="100" r="8" fill="${BRAND}"/>
<line x1="48" y1="58" x2="48" y2="100" stroke="${BRAND}" stroke-width="2.5" stroke-dasharray="3 3"/>
<line x1="72" y1="58" x2="72" y2="100" stroke="${BRAND}" stroke-width="2.5" stroke-dasharray="3 3"/>`
  },
  {
    id: 'ej-press-banca', name: 'Press de banca', category: 'ejercicios',
    body: `<rect x="14" y="62" width="92" height="10" rx="3" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="20" y1="72" x2="20" y2="92" stroke="currentColor" stroke-width="2.5"/>
<line x1="100" y1="72" x2="100" y2="92" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="50" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 56 L60 62 M52 62 L36 62 M68 62 L84 62 M36 62 L36 40 M84 62 L84 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="20" y1="34" x2="100" y2="34" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="24" cy="34" r="6" fill="${BRAND}"/><circle cx="96" cy="34" r="6" fill="${BRAND}"/>`
  },
  {
    id: 'ej-press-militar', name: 'Press militar / OHP', category: 'ejercicios',
    body: `<line x1="20" y1="20" x2="100" y2="20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="24" cy="20" r="6" fill="${BRAND}"/><circle cx="96" cy="20" r="6" fill="${BRAND}"/>
<path d="M48 28 L48 22 M72 28 L72 22 M48 28 L48 50 M72 28 L72 50" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="60" cy="52" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 58 L60 86 M60 70 L46 80 M60 70 L74 80 M60 86 L52 106 M60 86 L68 106" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    id: 'ej-dominada', name: 'Dominada / Pull-up', category: 'ejercicios',
    body: `<line x1="14" y1="24" x2="106" y2="24" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="20" y1="14" x2="20" y2="24" stroke="currentColor" stroke-width="2.5"/>
<line x1="100" y1="14" x2="100" y2="24" stroke="currentColor" stroke-width="2.5"/>
<path d="M48 24 L48 32 M72 24 L72 32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="60" cy="42" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 48 L60 78 M60 60 L46 36 M60 60 L74 36 M60 78 L50 100 M60 78 L70 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    id: 'ej-flexion', name: 'Flexión / Push-up', category: 'ejercicios',
    body: `<line x1="14" y1="98" x2="106" y2="98" stroke="currentColor" stroke-width="2.5"/>
<circle cx="32" cy="50" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M38 52 L80 62 M80 62 L96 88 M76 64 L94 88 M30 56 L24 86 M34 58 L30 86 M22 88 L34 88 M88 88 L100 88" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M44 38 Q 50 30, 56 38" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M40 28 Q 50 18, 60 26" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 2"/>`
  },
  {
    id: 'ej-plancha', name: 'Plancha / Plank', category: 'ejercicios',
    body: `<line x1="14" y1="92" x2="106" y2="92" stroke="currentColor" stroke-width="2.5"/>
<circle cx="24" cy="56" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M30 56 L98 68 M30 70 L24 84 M24 84 L36 84 M86 68 L86 84 M86 84 L94 84" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="40" y1="78" x2="80" y2="68" stroke="${BRAND}" stroke-width="2" stroke-dasharray="3 3"/>`
  },
  {
    id: 'ej-burpee', name: 'Burpee', category: 'ejercicios',
    body: `<circle cx="30" cy="36" r="5" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<path d="M30 42 L30 60 M22 50 L38 50 M30 60 L24 76 M30 60 L36 76" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<path d="M50 50 L62 50 M58 46 L62 50 L58 54" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="80" cy="74" r="5" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<path d="M84 76 L100 80 M76 78 L66 86 M80 80 L74 96 M80 80 L86 96" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>
<text x="60" y="22" font-family="monospace" font-size="9" font-weight="bold" fill="${BRAND}" text-anchor="middle">BURPEE</text>`
  },
  {
    id: 'ej-zancada', name: 'Zancada / Lunge', category: 'ejercicios',
    body: `<circle cx="60" cy="22" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 28 L60 58 M60 38 L48 50 M60 38 L72 50 M60 58 L36 96 M60 58 L80 86" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M80 86 L100 86" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="20" y1="100" x2="100" y2="100" stroke="currentColor" stroke-width="2"/>
<path d="M44 50 Q 36 64, 44 74" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 2"/>`
  },
  {
    id: 'ej-kettlebell-swing', name: 'KB Swing', category: 'ejercicios',
    body: `<circle cx="60" cy="22" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 28 L60 56 M60 38 L40 56 M60 38 L80 56 M60 56 L48 90 M60 56 L72 90" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="20" y1="100" x2="100" y2="100" stroke="currentColor" stroke-width="2"/>
<path d="M40 56 L24 70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M20 68 Q 16 72, 18 78 Q 22 84, 30 80" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="20" cy="84" r="10" fill="${BRAND}" stroke="currentColor" stroke-width="2"/>
<path d="M14 90 Q 12 100, 20 102 Q 28 100, 26 90" fill="none" stroke="${BRAND}" stroke-width="2" stroke-dasharray="3 3"/>`
  },
  {
    id: 'ej-curl-biceps', name: 'Curl de bíceps', category: 'ejercicios',
    body: `<circle cx="60" cy="22" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 28 L60 70 M60 38 L40 30 M60 38 L80 30 M60 70 L48 100 M60 70 L72 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="30" y="22" width="20" height="8" rx="2" fill="${BRAND}"/>
<rect x="70" y="22" width="20" height="8" rx="2" fill="${BRAND}"/>
<line x1="20" y1="100" x2="100" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'ej-remo-inclinado', name: 'Remo inclinado', category: 'ejercicios',
    body: `<circle cx="50" cy="32" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M56 36 L88 60 M56 36 L60 70 M60 70 L48 100 M60 70 L74 100 M88 60 L88 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="76" y1="80" x2="100" y2="80" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="80" cy="80" r="6" fill="${BRAND}"/><circle cx="96" cy="80" r="6" fill="${BRAND}"/>
<line x1="20" y1="100" x2="100" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'ej-abdominal', name: 'Crunch / Abdominal', category: 'ejercicios',
    body: `<line x1="14" y1="92" x2="106" y2="92" stroke="currentColor" stroke-width="2"/>
<circle cx="40" cy="56" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M46 60 L60 76 M60 76 L80 64 M60 76 L60 88 M44 64 L40 88" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M76 60 Q 90 50, 88 64" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 2"/>`
  },
  {
    id: 'ej-box-jump', name: 'Box Jump', category: 'ejercicios',
    body: `<rect x="58" y="62" width="44" height="30" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="28" cy="48" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M28 54 L28 76 M22 60 L34 60 M28 76 L22 92 M28 76 L34 92" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="14" y1="92" x2="58" y2="92" stroke="currentColor" stroke-width="2"/>
<path d="M40 48 Q 48 30, 60 38" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="3 3"/>
<path d="M54 38 L60 38 L60 44" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    id: 'ej-saltar-cuerda', name: 'Saltar la cuerda', category: 'ejercicios',
    body: `<circle cx="60" cy="34" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 40 L60 72 M60 50 L46 56 M60 50 L74 56 M60 72 L52 90 M60 72 L68 90" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="20" y1="96" x2="100" y2="96" stroke="currentColor" stroke-width="2"/>
<path d="M46 56 Q 18 60, 18 86 Q 18 96, 30 96" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M74 56 Q 102 60, 102 86 Q 102 96, 90 96" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>`
  },
  {
    id: 'ej-mountain-climber', name: 'Mountain climber', category: 'ejercicios',
    body: `<line x1="14" y1="98" x2="106" y2="98" stroke="currentColor" stroke-width="2"/>
<circle cx="28" cy="52" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M34 54 L84 64 M28 58 L22 86 M22 86 L34 86 M84 64 L94 88 M82 66 L66 80" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M66 80 L70 64" fill="none" stroke="${BRAND}" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 3"/>`
  },
  {
    id: 'ej-hip-thrust', name: 'Hip Thrust', category: 'ejercicios',
    body: `<rect x="14" y="56" width="46" height="14" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="20" y1="70" x2="20" y2="86" stroke="currentColor" stroke-width="2"/>
<line x1="54" y1="70" x2="54" y2="86" stroke="currentColor" stroke-width="2"/>
<circle cx="42" cy="44" r="6" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M48 48 L86 68 M48 48 L48 64 M48 64 L60 80 M86 68 L100 88" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="40" y1="50" x2="58" y2="58" stroke="${BRAND}" stroke-width="3"/>
<line x1="20" y1="98" x2="100" y2="98" stroke="currentColor" stroke-width="2"/>`
  },

  /* ============ EQUIPAMIENTO ============ */
  {
    id: 'eq-barra', name: 'Barra olímpica', category: 'equipamiento',
    body: `<line x1="10" y1="60" x2="110" y2="60" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<rect x="14" y="40" width="12" height="40" rx="2" fill="${BRAND}"/>
<rect x="28" y="34" width="14" height="52" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<rect x="94" y="40" width="12" height="40" rx="2" fill="${BRAND}"/>
<rect x="78" y="34" width="14" height="52" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'eq-mancuerna', name: 'Mancuerna', category: 'equipamiento',
    body: `<line x1="38" y1="60" x2="82" y2="60" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
<rect x="10" y="38" width="14" height="44" rx="3" fill="${BRAND}"/>
<rect x="24" y="44" width="14" height="32" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<rect x="96" y="38" width="14" height="44" rx="3" fill="${BRAND}"/>
<rect x="82" y="44" width="14" height="32" rx="2" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'eq-kettlebell', name: 'Kettlebell', category: 'equipamiento',
    body: `<path d="M44 30 Q 44 18, 60 18 Q 76 18, 76 30 L 76 44 Q 76 46, 74 46 L 70 46" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M50 46 L46 46 Q 44 46, 44 44 L 44 30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M30 70 Q 30 46, 60 46 Q 90 46, 90 70 Q 90 102, 60 102 Q 30 102, 30 70 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="74" r="6" fill="${BRAND}"/>`
  },
  {
    id: 'eq-disco', name: 'Disco / Placa', category: 'equipamiento',
    body: `<circle cx="60" cy="60" r="42" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="3"/>
<circle cx="60" cy="60" r="10" fill="none" stroke="currentColor" stroke-width="3"/>
<circle cx="60" cy="60" r="6" fill="white"/>
<text x="60" y="68" font-family="monospace" font-size="18" font-weight="900" fill="${BRAND}" text-anchor="middle">20</text>
<text x="60" y="84" font-family="monospace" font-size="9" fill="currentColor" text-anchor="middle" opacity="0.6">KG</text>`
  },
  {
    id: 'eq-banca', name: 'Banca de pesas', category: 'equipamiento',
    body: `<rect x="14" y="52" width="92" height="14" rx="3" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="22" y1="66" x2="22" y2="94" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="98" y1="66" x2="98" y2="94" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="14" y1="94" x2="30" y2="94" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="90" y1="94" x2="106" y2="94" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="40" y1="48" x2="80" y2="48" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
<circle cx="38" cy="48" r="4" fill="${BRAND}"/>
<circle cx="82" cy="48" r="4" fill="${BRAND}"/>`
  },
  {
    id: 'eq-banda', name: 'Banda elástica', category: 'equipamiento',
    body: `<path d="M14 60 Q 30 30, 60 60 Q 90 90, 106 60" fill="none" stroke="${BRAND_SOFT}" stroke-width="14" stroke-linecap="round"/>
<path d="M14 60 Q 30 30, 60 60 Q 90 90, 106 60" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="14" cy="60" r="5" fill="${BRAND}" stroke="currentColor" stroke-width="2"/>
<circle cx="106" cy="60" r="5" fill="${BRAND}" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'eq-rower', name: 'Remo Concept2', category: 'equipamiento',
    body: `<rect x="40" y="40" width="50" height="22" rx="3" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="32" cy="52" r="14" fill="none" stroke="currentColor" stroke-width="2.5"/>
<path d="M28 48 L36 56 M36 48 L28 56" stroke="${BRAND}" stroke-width="2.5"/>
<line x1="90" y1="52" x2="106" y2="52" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<rect x="56" y="74" width="34" height="6" rx="2" fill="${BRAND}"/>
<line x1="40" y1="62" x2="46" y2="92" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="100" y1="62" x2="100" y2="92" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="14" y1="96" x2="106" y2="96" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'eq-airbike', name: 'AirBike', category: 'equipamiento',
    body: `<circle cx="60" cy="56" r="34" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="56" r="22" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="30" x2="60" y2="82" stroke="${BRAND}" stroke-width="2"/>
<line x1="34" y1="56" x2="86" y2="56" stroke="${BRAND}" stroke-width="2"/>
<line x1="42" y1="38" x2="78" y2="74" stroke="${BRAND}" stroke-width="2"/>
<line x1="78" y1="38" x2="42" y2="74" stroke="${BRAND}" stroke-width="2"/>
<circle cx="60" cy="56" r="6" fill="currentColor"/>
<line x1="30" y1="20" x2="30" y2="40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="90" y1="20" x2="90" y2="40" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="20" y1="90" x2="40" y2="90" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="80" y1="90" x2="100" y2="90" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    id: 'eq-cinta-correr', name: 'Cinta de correr', category: 'equipamiento',
    body: `<rect x="14" y="62" width="88" height="22" rx="4" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="14" y1="84" x2="14" y2="94" stroke="currentColor" stroke-width="2.5"/>
<line x1="102" y1="84" x2="102" y2="94" stroke="currentColor" stroke-width="2.5"/>
<line x1="80" y1="62" x2="80" y2="22" stroke="currentColor" stroke-width="2.5"/>
<rect x="70" y="14" width="28" height="20" rx="2" fill="${BRAND}"/>
<text x="84" y="27" font-family="monospace" font-size="8" font-weight="900" fill="white" text-anchor="middle">10K</text>
<line x1="20" y1="73" x2="78" y2="73" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>`
  },
  {
    id: 'eq-trx', name: 'TRX / suspensión', category: 'equipamiento',
    body: `<line x1="14" y1="20" x2="106" y2="20" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="60" y1="20" x2="40" y2="80" stroke="currentColor" stroke-width="2.5"/>
<line x1="60" y1="20" x2="80" y2="80" stroke="currentColor" stroke-width="2.5"/>
<path d="M30 80 L50 80 L50 92 L 30 92 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M70 80 L90 80 L90 92 L 70 92 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="60" cy="20" r="5" fill="${BRAND}"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'eq-foam-roller', name: 'Foam roller', category: 'equipamiento',
    body: `<ellipse cx="20" cy="60" rx="6" ry="20" fill="${BRAND}" stroke="currentColor" stroke-width="2.5"/>
<rect x="20" y="40" width="80" height="40" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<ellipse cx="100" cy="60" rx="6" ry="20" fill="${BRAND}" stroke="currentColor" stroke-width="2.5"/>
<line x1="36" y1="40" x2="36" y2="80" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
<line x1="52" y1="40" x2="52" y2="80" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
<line x1="68" y1="40" x2="68" y2="80" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>
<line x1="84" y1="40" x2="84" y2="80" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/>`
  },
  {
    id: 'eq-fitball', name: 'Pelota suiza / Fitball', category: 'equipamiento',
    body: `<circle cx="60" cy="60" r="44" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M16 60 Q 60 80, 104 60" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M16 60 Q 60 40, 104 60" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M60 16 Q 80 60, 60 104" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M60 16 Q 40 60, 60 104" fill="none" stroke="currentColor" stroke-width="1.5"/>
<circle cx="44" cy="42" r="6" fill="${BRAND}" opacity="0.7"/>`
  },

  /* ============ PERSONAJES / SILUETAS ============ */
  {
    id: 'per-atleta', name: 'Atleta de pie', category: 'personajes',
    body: `<circle cx="60" cy="24" r="9" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 33 L60 70" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
<path d="M60 42 L42 60 M60 42 L78 60" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
<path d="M60 70 L48 102 M60 70 L72 102" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
<path d="M56 38 L52 50 M64 38 L68 50" stroke="${BRAND}" stroke-width="2" stroke-linecap="round"/>`
  },
  {
    id: 'per-coach', name: 'Coach con tablero', category: 'personajes',
    body: `<circle cx="42" cy="26" r="8" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M42 34 L42 68 M42 44 L30 60 M42 44 L54 64 M42 68 L34 100 M42 68 L52 100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<rect x="62" y="40" width="44" height="38" rx="3" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<line x1="68" y1="50" x2="100" y2="50" stroke="${BRAND}" stroke-width="2.5"/>
<line x1="68" y1="58" x2="92" y2="58" stroke="currentColor" stroke-width="2"/>
<line x1="68" y1="66" x2="96" y2="66" stroke="currentColor" stroke-width="2"/>
<line x1="68" y1="74" x2="88" y2="74" stroke="currentColor" stroke-width="2"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'per-yogui', name: 'Yogui / meditación', category: 'personajes',
    body: `<circle cx="60" cy="30" r="9" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 39 L60 68 M60 50 L30 56 M60 50 L90 56" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="30" cy="58" r="5" fill="${BRAND}" stroke="currentColor" stroke-width="2"/>
<circle cx="90" cy="58" r="5" fill="${BRAND}" stroke="currentColor" stroke-width="2"/>
<path d="M60 68 Q 30 76, 22 92 Q 22 96, 30 96 L 90 96 Q 98 96, 98 92 Q 90 76, 60 68 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>
<path d="M50 22 Q 60 12, 70 22" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 2"/>`
  },
  {
    id: 'per-estirando', name: 'Persona estirando', category: 'personajes',
    body: `<circle cx="40" cy="30" r="7" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M40 37 L40 62 M40 48 L60 30 M40 48 L20 56 M40 62 L26 98 M40 62 L60 80" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M60 80 L86 60" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>
<path d="M64 32 L72 24 L80 32" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round"/>`
  },
  {
    id: 'per-flexionando', name: 'Atleta flexionando músculo', category: 'personajes',
    body: `<circle cx="60" cy="24" r="9" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 33 L60 68 M60 68 L46 100 M60 68 L74 100" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
<path d="M60 40 Q 36 38, 32 50 Q 32 60, 44 56 Q 50 50, 60 50" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M44 48 Q 38 50, 40 56" stroke="${BRAND}" stroke-width="2" stroke-linecap="round"/>
<path d="M60 40 L90 38 L88 50" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
  },
  {
    id: 'per-equipo', name: 'Equipo / 3 personas', category: 'personajes',
    body: `<circle cx="30" cy="34" r="7" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M30 41 L30 70 M30 50 L20 64 M30 50 L40 64 M30 70 L24 96 M30 70 L36 96" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="60" cy="28" r="8" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 36 L60 70 M60 48 L48 62 M60 48 L72 62 M60 70 L52 100 M60 70 L68 100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<circle cx="90" cy="34" r="7" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M90 41 L90 70 M90 50 L80 64 M90 50 L100 64 M90 70 L84 96 M90 70 L96 96" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'per-saltando', name: 'Saltando victoria', category: 'personajes',
    body: `<circle cx="60" cy="22" r="8" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 30 L60 58 M60 38 L40 16 M60 38 L80 16 M60 58 L46 78 M60 58 L74 78 M46 78 L50 92 M74 78 L70 92" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="14" y1="98" x2="106" y2="98" stroke="currentColor" stroke-width="2"/>
<path d="M40 88 Q 50 100, 60 88" fill="none" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 2"/>
<path d="M22 30 L26 26 M22 26 L26 30" stroke="${BRAND}" stroke-width="2"/>
<path d="M94 30 L98 26 M94 26 L98 30" stroke="${BRAND}" stroke-width="2"/>`
  },

  /* ============ DEPORTES / CARDIO (siluetas dinámicas) ============ */
  {
    id: 'dp-runner', name: 'Corredor', category: 'deportes',
    body: `<circle cx="48" cy="20" r="7" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M48 27 L56 50 L48 70 L40 96" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M56 50 L80 60 L96 50 M56 50 L34 38 L26 50" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M48 70 L80 84" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>
<path d="M20 56 L8 58 M22 64 L10 70 M26 50 L12 48" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 2"/>`
  },
  {
    id: 'dp-ciclista', name: 'Ciclista', category: 'deportes',
    body: `<circle cx="30" cy="78" r="16" fill="none" stroke="currentColor" stroke-width="3"/>
<circle cx="90" cy="78" r="16" fill="none" stroke="currentColor" stroke-width="3"/>
<circle cx="30" cy="78" r="3" fill="${BRAND}"/>
<circle cx="90" cy="78" r="3" fill="${BRAND}"/>
<line x1="30" y1="78" x2="55" y2="78" stroke="currentColor" stroke-width="2.5"/>
<line x1="55" y1="78" x2="68" y2="50" stroke="currentColor" stroke-width="2.5"/>
<line x1="55" y1="78" x2="90" y2="78" stroke="currentColor" stroke-width="2.5"/>
<line x1="68" y1="50" x2="90" y2="78" stroke="currentColor" stroke-width="2.5"/>
<line x1="68" y1="50" x2="78" y2="40" stroke="currentColor" stroke-width="2.5"/>
<circle cx="80" cy="34" r="7" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M80 41 L70 52" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M70 52 L60 42 M70 52 L82 42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<path d="M55 78 L42 80" stroke="${BRAND}" stroke-width="2" stroke-linecap="round"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'dp-nadador', name: 'Nadador', category: 'deportes',
    body: `<path d="M10 78 Q 30 70, 50 78 Q 70 86, 90 78 Q 100 74, 110 78" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M10 92 Q 30 84, 50 92 Q 70 100, 90 92 Q 100 88, 110 92" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="40" cy="56" r="8" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M48 60 L80 58 L100 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M48 60 L40 76" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M40 76 L20 76" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M40 76 L66 80" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M66 80 L60 64" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    id: 'dp-remero', name: 'Remero', category: 'deportes',
    body: `<path d="M14 80 Q 60 70, 106 80 L 106 92 L 14 92 Z" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="50" cy="48" r="7" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M50 55 L62 76 L50 92" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M50 60 L74 50 L92 60" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M92 60 L102 38" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<path d="M70 52 L26 30 L14 26" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'dp-triatleta', name: 'Triatleta (3 disciplinas)', category: 'deportes',
    body: `<text x="18" y="36" font-family="monospace" font-size="9" font-weight="900" fill="${BRAND}">SWIM</text>
<path d="M14 44 Q 26 40, 38 44" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M14 50 Q 26 46, 38 50" fill="none" stroke="${BRAND}" stroke-width="2.5" stroke-linecap="round"/>
<text x="46" y="36" font-family="monospace" font-size="9" font-weight="900" fill="${BRAND}">BIKE</text>
<circle cx="50" cy="50" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="68" cy="50" r="6" fill="none" stroke="currentColor" stroke-width="2"/>
<line x1="50" y1="50" x2="68" y2="50" stroke="currentColor" stroke-width="2"/>
<line x1="58" y1="40" x2="68" y2="50" stroke="currentColor" stroke-width="2"/>
<text x="78" y="36" font-family="monospace" font-size="9" font-weight="900" fill="${BRAND}">RUN</text>
<circle cx="92" cy="46" r="5" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2"/>
<path d="M92 51 L100 60 L94 70 M92 56 L82 60" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
<text x="60" y="92" font-family="monospace" font-size="16" font-weight="900" fill="currentColor" text-anchor="middle">3</text>
<text x="60" y="106" font-family="monospace" font-size="7" fill="${BRAND}" text-anchor="middle">DISCIPLINAS</text>`
  },
  {
    id: 'dp-boxeador', name: 'Boxeador', category: 'deportes',
    body: `<circle cx="56" cy="26" r="9" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M56 35 L56 70 M56 50 L34 56 M56 50 L80 38 M56 70 L46 100 M56 70 L66 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="28" cy="58" r="9" fill="${BRAND}" stroke="currentColor" stroke-width="2.5"/>
<circle cx="86" cy="36" r="9" fill="${BRAND}" stroke="currentColor" stroke-width="2.5"/>
<path d="M88 28 L96 18 M84 30 L78 24" stroke="${BRAND}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 2"/>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'dp-esquiador', name: 'SkiErg / Esquí', category: 'deportes',
    body: `<circle cx="60" cy="22" r="7" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="2.5"/>
<path d="M60 29 L60 62 M60 38 L70 24 M60 38 L50 24 M60 62 L70 88 M60 62 L50 88" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
<line x1="70" y1="24" x2="100" y2="14" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
<line x1="50" y1="24" x2="20" y2="14" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
<line x1="40" y1="92" x2="100" y2="92" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="20" y1="100" x2="80" y2="100" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    id: 'dp-medalla-finish', name: 'Línea de meta', category: 'deportes',
    body: `<rect x="20" y="14" width="80" height="20" fill="white" stroke="currentColor" stroke-width="2"/>
<rect x="20" y="14" width="10" height="10" fill="currentColor"/>
<rect x="40" y="14" width="10" height="10" fill="currentColor"/>
<rect x="60" y="14" width="10" height="10" fill="currentColor"/>
<rect x="80" y="14" width="10" height="10" fill="currentColor"/>
<rect x="30" y="24" width="10" height="10" fill="currentColor"/>
<rect x="50" y="24" width="10" height="10" fill="currentColor"/>
<rect x="70" y="24" width="10" height="10" fill="currentColor"/>
<rect x="90" y="24" width="10" height="10" fill="currentColor"/>
<line x1="60" y1="34" x2="60" y2="100" stroke="currentColor" stroke-width="3"/>
<text x="60" y="64" font-family="monospace" font-size="18" font-weight="900" fill="${BRAND}" text-anchor="middle">FIN</text>
<text x="60" y="84" font-family="monospace" font-size="9" fill="currentColor" text-anchor="middle" opacity="0.6">META</text>
<line x1="14" y1="100" x2="106" y2="100" stroke="currentColor" stroke-width="2"/>`
  },
  {
    id: 'dp-hiit', name: 'HIIT / Intervalos', category: 'deportes',
    body: `<polyline points="14,90 20,90 26,40 32,40 38,90 44,90 50,30 56,30 62,90 68,90 74,50 80,50 86,90 92,90 98,60 104,60" fill="none" stroke="${BRAND}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
<text x="60" y="22" font-family="monospace" font-size="9" font-weight="900" fill="currentColor" text-anchor="middle">HIIT</text>
<line x1="14" y1="90" x2="106" y2="90" stroke="currentColor" stroke-width="2"/>
<line x1="14" y1="22" x2="14" y2="100" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="6" y="32" font-family="monospace" font-size="6" fill="currentColor" opacity="0.5">Z5</text>
<text x="6" y="92" font-family="monospace" font-size="6" fill="currentColor" opacity="0.5">Z1</text>`
  },
  {
    id: 'dp-stopwatch', name: 'Cronómetro deportivo', category: 'deportes',
    body: `<circle cx="60" cy="62" r="34" fill="${BRAND_SOFT}" stroke="currentColor" stroke-width="3"/>
<line x1="60" y1="28" x2="60" y2="22" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<rect x="54" y="14" width="12" height="10" rx="2" fill="${BRAND}" stroke="currentColor" stroke-width="2"/>
<line x1="60" y1="62" x2="60" y2="38" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
<line x1="60" y1="62" x2="78" y2="50" stroke="${BRAND}" stroke-width="3" stroke-linecap="round"/>
<circle cx="60" cy="62" r="4" fill="currentColor"/>
<line x1="60" y1="34" x2="60" y2="40" stroke="currentColor" stroke-width="1.5"/>
<line x1="60" y1="84" x2="60" y2="90" stroke="currentColor" stroke-width="1.5"/>
<line x1="32" y1="62" x2="38" y2="62" stroke="currentColor" stroke-width="1.5"/>
<line x1="82" y1="62" x2="88" y2="62" stroke="currentColor" stroke-width="1.5"/>`
  },
  {
    id: 'dp-zona-fc', name: 'Zonas de frecuencia cardíaca', category: 'deportes',
    body: `<rect x="14" y="20" width="92" height="14" rx="3" fill="#10B981" opacity="0.7"/>
<rect x="14" y="36" width="92" height="14" rx="3" fill="#84CC16" opacity="0.7"/>
<rect x="14" y="52" width="92" height="14" rx="3" fill="#FBBF24" opacity="0.8"/>
<rect x="14" y="68" width="92" height="14" rx="3" fill="#F97316" opacity="0.8"/>
<rect x="14" y="84" width="92" height="14" rx="3" fill="#EF4444" opacity="0.8"/>
<text x="22" y="31" font-family="monospace" font-size="8" font-weight="900" fill="white">Z1</text>
<text x="22" y="47" font-family="monospace" font-size="8" font-weight="900" fill="white">Z2</text>
<text x="22" y="63" font-family="monospace" font-size="8" font-weight="900" fill="white">Z3</text>
<text x="22" y="79" font-family="monospace" font-size="8" font-weight="900" fill="white">Z4</text>
<text x="22" y="95" font-family="monospace" font-size="8" font-weight="900" fill="white">Z5</text>`
  }
];

/* ----------------------------------------------------------------------- *
 * Helpers
 * ----------------------------------------------------------------------- */

/** SVG string completo (con `<svg>`) listo para usar como dataURL o embed. */
export function pictogramSvgString(p: Pictogram, color = '#5D36FF'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" style="color: ${color}">${p.body}</svg>`;
}

/** Data URL listo para usar como src de <img>. */
export function pictogramDataUrl(p: Pictogram, color = '#5D36FF'): string {
  const svg = pictogramSvgString(p, color);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Componente React para renderizar un pictograma. */
export function PictogramView({ id, size = 80, color, className }: {
  id: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const pic = PICTOGRAMS.find(p => p.id === id);
  if (!pic) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      style={color ? { color } : undefined}
      className={className}
      dangerouslySetInnerHTML={{ __html: pic.body }}
    />
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActivityLevel, ClientProfile, LoyaltyCampaign, MedicalCondition, MessageTemplate, MonthRef, PatientMetrics, ServiceCatalogItem, Sex, WorkoutRoutine } from './types';

export const INITIAL_CALENDAR: MonthRef = {
  year: 2026,
  monthIndex: 4 // Mayo
};

export const SCHEMA_VERSION = 14;

/* ----------------------------------------------------------------------- *
 * Licencias para ilustraciones reutilizables (banco de imágenes anatómicas).
 * `requiresAttribution` decide si la UI exige mostrar autor/fuente.
 * `nonCommercial` marca licencias NC (relevante para uso comercial de la app).
 * ----------------------------------------------------------------------- */
export const IMAGE_LICENSES: {
  code: import('./types').ImageLicense;
  label: string;
  url: string;
  requiresAttribution: boolean;
  nonCommercial: boolean;
}[] = [
  { code: 'CC0', label: 'CC0 (dominio público)', url: 'https://creativecommons.org/publicdomain/zero/1.0/', requiresAttribution: false, nonCommercial: false },
  { code: 'Public Domain', label: 'Dominio público', url: 'https://en.wikipedia.org/wiki/Public_domain', requiresAttribution: false, nonCommercial: false },
  { code: 'CC BY 4.0', label: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', requiresAttribution: true, nonCommercial: false },
  { code: 'CC BY-SA 4.0', label: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', requiresAttribution: true, nonCommercial: false },
  { code: 'CC BY-NC 4.0', label: 'CC BY-NC 4.0 (no comercial)', url: 'https://creativecommons.org/licenses/by-nc/4.0/', requiresAttribution: true, nonCommercial: true },
  { code: 'CC BY-NC-SA 4.0', label: 'CC BY-NC-SA 4.0 (no comercial)', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', requiresAttribution: true, nonCommercial: true },
  { code: 'Other', label: 'Otra / personalizada', url: '', requiresAttribution: true, nonCommercial: false }
];

export const IMAGE_LICENSE_BY_CODE = Object.fromEntries(
  IMAGE_LICENSES.map(l => [l.code, l])
) as Record<import('./types').ImageLicense, (typeof IMAGE_LICENSES)[number]>;

/* ----------------------------------------------------------------------- *
 * Catálogo de condiciones médicas para warnings de ejercicios
 * ----------------------------------------------------------------------- */

export const MEDICAL_CONDITIONS: { code: MedicalCondition; label: string; category: string; emoji: string }[] = [
  /* Columna */
  { code: 'dolor_lumbar_cronico', label: 'Dolor lumbar crónico', category: 'Columna', emoji: '🩹' },
  { code: 'hernia_discal', label: 'Hernia discal', category: 'Columna', emoji: '⚠️' },
  { code: 'inestabilidad_lumbar', label: 'Inestabilidad lumbar', category: 'Columna', emoji: '🩹' },
  { code: 'cervicalgia', label: 'Cervicalgia', category: 'Columna', emoji: '🩹' },
  { code: 'post_quirurgico_columna', label: 'Post-quirúrgico columna', category: 'Columna', emoji: '🏥' },
  /* Rodilla / pierna */
  { code: 'artrosis_rodilla', label: 'Artrosis de rodilla', category: 'Rodilla', emoji: '🦵' },
  { code: 'lesion_meniscal', label: 'Lesión meniscal', category: 'Rodilla', emoji: '🦵' },
  { code: 'post_quirurgico_rodilla', label: 'Post-quirúrgico rodilla', category: 'Rodilla', emoji: '🏥' },
  { code: 'tendinopatia_aquiles', label: 'Tendinopatía de Aquiles', category: 'Pierna', emoji: '🩹' },
  { code: 'fascitis_plantar', label: 'Fascitis plantar', category: 'Pie', emoji: '🦶' },
  /* Cadera */
  { code: 'artrosis_cadera', label: 'Artrosis de cadera', category: 'Cadera', emoji: '🦴' },
  /* Hombro / brazo */
  { code: 'artrosis_hombro', label: 'Artrosis de hombro', category: 'Hombro', emoji: '💪' },
  { code: 'tendinopatia_hombro', label: 'Tendinopatía de hombro', category: 'Hombro', emoji: '💪' },
  { code: 'manguito_rotador', label: 'Lesión manguito rotador', category: 'Hombro', emoji: '💪' },
  { code: 'epicondilitis', label: 'Epicondilitis (codo de tenista)', category: 'Brazo', emoji: '🎾' },
  /* Sistémicas */
  { code: 'hipertension', label: 'Hipertensión arterial', category: 'Sistémica', emoji: '❤️' },
  { code: 'cardiopatia', label: 'Cardiopatía', category: 'Sistémica', emoji: '❤️' },
  { code: 'osteoporosis', label: 'Osteoporosis', category: 'Sistémica', emoji: '🦴' },
  { code: 'embarazo', label: 'Embarazo', category: 'Especial', emoji: '🤰' }
];

export const SEVERITY_META: Record<'evitar' | 'precaucion' | 'consultar', { label: string; color: string; emoji: string }> = {
  evitar:     { label: 'Evitar',     color: '#FF3C00', emoji: '🛑' },
  precaucion: { label: 'Precaución', color: '#FFB020', emoji: '⚠️' },
  consultar:  { label: 'Consultar',  color: '#5D36FF', emoji: '💬' }
};

export const CUSTOM_EXERCISE_CATEGORIES: { code: string; label: string }[] = [
  { code: 'fuerza',      label: 'Fuerza' },
  { code: 'potencia',    label: 'Potencia' },
  { code: 'hipertrofia', label: 'Hipertrofia' },
  { code: 'aerobico',    label: 'Aeróbico' },
  { code: 'movilidad',   label: 'Movilidad / flexibilidad' },
  { code: 'tecnica',     label: 'Técnica / habilidad' }
];

export const STORAGE_KEYS = {
  workspace: 'mankind_workspace',
  schemaVersion: 'mankind_schema_version',
  // Legacy
  profile: 'mankind_profile',
  routines: 'mankind_routines',
  scheduled: 'mankind_scheduled'
} as const;

export const DEFAULT_CLIENT_ID = 'client-default';

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

export const monthLabel = (m: MonthRef) => `${MONTH_NAMES[m.monthIndex]} ${m.year}`;
export const sameMonth = (a: MonthRef, b: MonthRef) => a.year === b.year && a.monthIndex === b.monthIndex;
export const shiftMonth = (m: MonthRef, delta: number): MonthRef => {
  const total = m.year * 12 + m.monthIndex + delta;
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 };
};
export const weekdayIndexFor = (year: number, monthIndex: number, dayOfMonth: number): number => {
  const date = new Date(year, monthIndex, dayOfMonth);
  return (date.getDay() + 6) % 7;
};

export const parseLeadingNumber = (value: string | undefined): number | null => {
  if (!value) return null;
  const match = value.replace(',', '.').match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
};

/* ----------------------------------------------------------------------- *
 * Cálculos médicos
 * ----------------------------------------------------------------------- */

/** IMC = peso(kg) / talla(m)² */
export function computeBmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const m = heightCm / 100;
  const bmi = weightKg / (m * m);
  return Number.isFinite(bmi) ? Number(bmi.toFixed(1)) : null;
}

export function bmiCategory(bmi: number | null): { label: string; color: string } | null {
  if (bmi === null) return null;
  if (bmi < 18.5) return { label: 'Bajo peso', color: '#FFB020' };
  if (bmi < 25) return { label: 'Normal', color: '#10B981' };
  if (bmi < 30) return { label: 'Sobrepeso', color: '#FFB020' };
  if (bmi < 35) return { label: 'Obesidad I', color: '#FF6B35' };
  if (bmi < 40) return { label: 'Obesidad II', color: '#FF3C00' };
  return { label: 'Obesidad III', color: '#A20000' };
}

/**
 * Tasa metabólica basal (Harris-Benedict 1919, fórmula clásica solicitada).
 * - Hombre: 66.5 + (13.75 × kg) + (5.003 × cm) − (6.755 × edad)
 * - Mujer: 655.1 + (9.563 × kg) + (1.850 × cm) − (4.676 × edad)
 * Para "otro" usamos el promedio de ambas fórmulas como aproximación neutra.
 */
export function computeBmr(metrics: PatientMetrics): number | null {
  const { weightKg, heightCm, age, sex } = metrics;
  if (!weightKg || !heightCm || !age) return null;
  const male = 66.5 + 13.75 * weightKg + 5.003 * heightCm - 6.755 * age;
  const female = 655.1 + 9.563 * weightKg + 1.850 * heightCm - 4.676 * age;
  let bmr: number;
  if (sex === 'masculino') bmr = male;
  else if (sex === 'femenino') bmr = female;
  else bmr = (male + female) / 2;
  return Number.isFinite(bmr) ? Math.round(bmr) : null;
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muy_intenso: 1.9
};

export function computeTdee(metrics: PatientMetrics): number | null {
  const bmr = computeBmr(metrics);
  if (bmr === null) return null;
  const factor = ACTIVITY_FACTOR[metrics.activityLevel ?? 'moderado'];
  return Math.round(bmr * factor);
}

export function activityLabel(level?: ActivityLevel): string {
  switch (level) {
    case 'sedentario': return 'Sedentario (sin ejercicio)';
    case 'ligero': return 'Ligero (1-3 sesiones/semana)';
    case 'moderado': return 'Moderado (3-5 sesiones/semana)';
    case 'intenso': return 'Intenso (6-7 sesiones/semana)';
    case 'muy_intenso': return 'Muy intenso (2 sesiones/día)';
    default: return 'No especificado';
  }
}

export function sexLabel(sex?: Sex): string {
  switch (sex) {
    case 'masculino': return 'Masculino';
    case 'femenino': return 'Femenino';
    case 'otro': return 'Otro';
    default: return 'No especificado';
  }
}

/* ----------------------------------------------------------------------- *
 * Equipamiento ampliado
 * ----------------------------------------------------------------------- */

export const EQUIPMENT_OPTIONS = [
  // Espacios completos
  'Gimnasio de Fuerza Completo',
  'Box CrossFit / HIIT',
  'Centro de Alto Rendimiento',
  // Barras y discos
  'Barra Olímpica',
  'Barra Hexagonal (Trap Bar)',
  'Barra Z / EZ',
  'Barra de Hombros (Safety Bar)',
  'Discos Olímpicos',
  'Discos Bumper',
  'Discos Fraccionarios',
  // Mancuernas y kettlebells
  'Mancuernas Libres (Dumbbells)',
  'Mancuernas Ajustables',
  'Kettlebells',
  'Kettlebell Pesado (>32kg)',
  // Racks y bancas
  'Rack de Sentadillas (Squat Rack)',
  'Power Rack / Jaula',
  'Banca Plana',
  'Banca Inclinable',
  'Banca Declinada',
  'Banca Scott / Predicador',
  // Máquinas
  'Sistema de Poleas y Cables',
  'Máquina Smith',
  'Máquinas Selectorizadas',
  'Hack Squat / Prensa de Piernas',
  'Máquina de Peso Muerto Rumano',
  'Máquina de Curl Femoral',
  'Máquina de Extensión de Cuádriceps',
  'Pec Deck',
  'Lat Pulldown',
  'Remo Sentado en Polea',
  // Calistenia y suspensión
  'Barra de Dominadas',
  'Barras Paralelas',
  'Anillas de Gimnasia',
  'Suspensión / TRX',
  'Bandas de Resistencia',
  'Mini Bandas (Glute Bands)',
  'Peso Corporal (Calistenia)',
  // Pliometría / acondicionamiento
  'Cajón Pliométrico',
  'Balón Medicinal',
  'Balón Wall Ball',
  'Sogas de Batalla (Battle Ropes)',
  'Sandbag',
  'Trineo (Sled)',
  'Neumático (Tire)',
  'Cadenas de Lastre',
  'Saco de Boxeo',
  // Cardio
  'Cinta de Correr',
  'AirBike / Assault Bike',
  'Remo Ergómetro (Concept2)',
  'SkiErg',
  'Bicicleta Estática',
  'Elíptica',
  'Cuerda para Saltar',
  // Otros
  'Foam Roller / Recovery',
  'Anillo Pilates',
  'Bosu / Half-Ball',
  'Slider Discs'
];

/* ----------------------------------------------------------------------- *
 * Datos iniciales
 * ----------------------------------------------------------------------- */

export const INITIAL_PROFILE: ClientProfile = {
  id: DEFAULT_CLIENT_ID,
  name: 'Atleta de Alto Rendimiento #01',
  focus: 'Optimización del rendimiento neuromuscular, desarrollo de fuerza máxima e hipertrofia funcional bajo sobrecarga progresiva.',
  experienceLevel: 'intermedio',
  equipment: ['Gimnasio de Fuerza Completo', 'Mancuernas Libres (Dumbbells)', 'Barra Olímpica', 'Rack de Sentadillas (Squat Rack)'],
  suggestedMovements: 'Patrones de empuje plano y vertical, bisagra de cadera pura, dominadas y flexión de rodilla dominante.',
  suggestedLoads: 'Fuerza técnica: 80-85% 1RM (RPE 8-9). Hipertrofia: 70-75% 1RM con volumen acumulable.',
  metrics: {
    weightKg: 80,
    heightCm: 178,
    age: 30,
    sex: 'masculino',
    activityLevel: 'moderado',
    fatPercentage: 14,
    benchPress1RM: 100,
    squat1RM: 140,
    deadlift1RM: 180,
    pullUpMaxReps: 12,
    run400mSeconds: 75,
    vo2Max: 45,
    otherMetrics: ''
  },
  clinical: {
    morbidities: '',
    medications: '',
    allergies: '',
    surgeries: '',
    injuries: '',
    notes: ''
  },
  goals: {
    performance: 'Optimizar la transferencia de potencia y perfeccionar la técnica de levantamientos multiarticulares.',
    aesthetic: 'Mantener composición magra (≤14% grasa) priorizando hipertrofia funcional.',
    health: ''
  },
  practice: {
    pricing: { amount: 80000, currency: 'CLP', cadence: 'mensual' },
    controlIntervalDays: 30,
    contactMethod: 'whatsapp',
    contactValue: '',
    loyaltyNotes: '',
    paymentNotes: '',
    controlNotes: ''
  }
};

export const INITIAL_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'r-fuerza-1',
    title: 'MF-01 | Fuerza General (Push day)',
    category: 'fuerza',
    description: 'Bloque enfocado en empujes pesados con control excéntrico y máxima producción de fuerza.',
    estimatedDuration: 75,
    createdAt: Date.now() - 1000000,
    exercises: [
      { id: 'e1', name: 'Press de Banca Plano (Barra)', sets: 4, reps: '5', rest: '3 min', intensity: '82.5% 1RM (RPE 8.5)', notes: 'Asegurar retracción escapular y pausa breve en el pecho.', nscaId: 'nsca-flat-barbell-bench-press' },
      { id: 'e2', name: 'Press Militar de Pie', sets: 4, reps: '6', rest: '2.5 min', intensity: '78% 1RM', notes: 'Mantener core activo y evitar hiperextensión lumbar.' },
      { id: 'e3', name: 'Fondos en Paralelas Lastrados', sets: 3, reps: '6-8', rest: '2 min', intensity: 'RPE 8 (+15kg)', notes: 'Inclinación leve para priorizar fibras pectorales bajas.' },
      { id: 'e4', name: 'Press Francés con Barra Z', sets: 3, reps: '10', rest: '90s', intensity: 'RPE 7.5', notes: 'Movimiento controlado en fase excéntrica de 3 segundos.' }
    ]
  },
  {
    id: 'r-potencia-1',
    title: 'MF-02 | Potencia & Triple Extensión',
    category: 'potencia',
    description: 'Estímulo neuro-muscular de alta velocidad. Foco en aceleración y pliometría reactiva.',
    estimatedDuration: 60,
    createdAt: Date.now() - 500000,
    exercises: [
      { id: 'e5', name: 'Cargada de Potencia (Power Clean)', sets: 5, reps: '3', rest: '3 min', intensity: '75% 1RM (Máxima Velocidad)', notes: 'Foco en la extensión explosiva de tobillo, rodilla y cadera.', nscaId: 'nsca-power-clean' },
      { id: 'e6', name: 'Saltos al Cajón (Box Jump)', sets: 4, reps: '5', rest: '90s', intensity: '90cm de Altura', notes: 'Amortiguar caída suave en squat parcial.' },
      { id: 'e7', name: 'Push Press', sets: 3, reps: '5', rest: '2 min', intensity: 'RPE 8', notes: 'Transferir fuerza del tren inferior de manera coordinada.' },
      { id: 'e8', name: 'Lanzamiento de Balón Medicinal de Espaldas', sets: 3, reps: '6', rest: '90s', intensity: 'Balón 9kg', notes: 'Extensión violenta de cadera.' }
    ]
  },
  {
    id: 'r-hipertrofia-1',
    title: 'MF-03 | Hipertrofia: Cadena Posterior',
    category: 'hipertrofia',
    description: 'Bloque de volumen para densidad y tracciones pesadas en isquiotibiales, glúteos y espalda alta.',
    estimatedDuration: 70,
    createdAt: Date.now() - 250000,
    exercises: [
      { id: 'e9', name: 'Peso Muerto Rumano (RDL)', sets: 4, reps: '8-10', rest: '2 min', intensity: '70% 1RM (RPE 8)', notes: 'Bisagra de cadera pura, empujando glúteos hacia atrás.', nscaId: 'nsca-romanian-deadlift' },
      { id: 'e10', name: 'Dominadas Lastradas Pronas', sets: 4, reps: '8', rest: '2 min', intensity: 'Carga: +10kg', notes: 'Extensión total abajo y contracción máxima arriba.' },
      { id: 'e11', name: 'Remo Sentado en Polea Unilateral', sets: 3, reps: '12 (por lado)', rest: '75s', intensity: 'RPE 9', notes: 'Conducir el codo hacia la cadera baja controlando la rotación.' },
      { id: 'e12', name: 'Curl de Bíceps en Banco Inclinado', sets: 3, reps: '12-15', rest: '60s', intensity: 'Carga controlada', notes: 'Estiramiento máximo en la parte baja del rango.' }
    ]
  },
  {
    id: 'r-aerobico-1',
    title: 'MF-04 | Capacidad Cardiovascular Z2-Z5',
    category: 'aerobico',
    description: 'Mejora del umbral de lactato, eficiencia mitocondrial y VO2 elevado en intervalos.',
    estimatedDuration: 50,
    createdAt: Date.now() - 100000,
    exercises: [
      { id: 'e13', name: 'Rower (Remo Ergómetro) - Calentamiento', sets: 1, reps: '10 min', rest: 'Ninguno', intensity: 'Zona 2 (Ritmo constante)', notes: 'Mantener split por debajo de 2:00/500m.' },
      { id: 'e14', name: 'AirBike - Intervalos VO2 Max', sets: 5, reps: '40s ON / 80s OFF', rest: '80s pasivo', intensity: 'Esfuerzo Máximo', notes: 'Cadencia > 75 RPM en fases de esfuerzo máximo.' },
      { id: 'e15', name: 'Carrera Continua de Recuperación', sets: 1, reps: '20 min', rest: 'Ninguno', intensity: 'Zona 2 regenerativa', notes: 'Mantener frecuencia cardiaca entre 130-142 ppm.' }
    ]
  },
  /* ===================================================================== *
   * Planes de Resistencia (running, ciclismo, natación, triatlón, cross)
   * Basados en NSCA ESSC Cap. 21, ACSM Guidelines, USA Triathlon/USA Cycling.
   * ===================================================================== */
  {
    id: 'r-resistencia-5k-principiante',
    title: 'MF-05 | Plan 5K — Principiante (sesión tipo)',
    category: 'resistencia',
    description: 'Sesión semanal estándar de un corredor que está construyendo base aeróbica para su primer 5K. Combina volumen Z2, técnica y fuerza-resistencia. Repetir 3 veces por semana con 1 día de descanso entre sesiones.',
    estimatedDuration: 45,
    createdAt: Date.now() - 90000,
    exercises: [
      { id: 'r5k-1', name: 'Calentamiento dinámico + drills (A-Skip, B-Skip)', sets: 1, reps: '8 min', rest: 'Ninguno', intensity: 'Activación', notes: 'A-skip 2x20m, B-skip 2x20m + movilidad cadera-tobillo.', nscaId: 'end-running-drills-a-skip' },
      { id: 'r5k-2', name: 'Carrera continua en Zona 2', sets: 1, reps: '25-30 min', rest: 'Ninguno', intensity: '60-70% FC máx · RPE 4-6', notes: 'Conversación posible. Si no puedes hablar, baja el ritmo. Cadencia objetivo 170-180 ppm.', nscaId: 'end-zone2-run' },
      { id: 'r5k-3', name: 'Progresiones de velocidad (strides)', sets: 4, reps: '20 segundos', rest: '60-90s', intensity: '85-90% sprint', notes: 'Acelerar progresivamente sin llegar al máximo. Foco en técnica y cadencia, no en velocidad bruta.', nscaId: 'end-run-strides' },
      { id: 'r5k-4', name: 'Estiramiento y enfriamiento', sets: 1, reps: '5 min', rest: 'Ninguno', intensity: 'Suave', notes: 'Caminar 3 min + estiramiento estático suave de cuádriceps, isquios, glúteos, pantorrillas.' }
    ]
  },
  {
    id: 'r-resistencia-10k-intermedio',
    title: 'MF-06 | Plan 10K — Intermedio (sesión clave de calidad)',
    category: 'resistencia',
    description: 'Sesión de calidad semanal para corredor intermedio (40-50 km/semana) preparando 10K. Combina tempo + VO2. Sólo una sesión así por semana. Otros días: 2 sesiones Z2 largas + 1 sesión técnica.',
    estimatedDuration: 60,
    createdAt: Date.now() - 80000,
    exercises: [
      { id: 'r10k-1', name: 'Calentamiento Z1-Z2 + drills', sets: 1, reps: '15 min', rest: 'Ninguno', intensity: 'Z2 + 3 progresiones', notes: '10 min Z2 + A/B-skip + 3 strides de 20s antes del bloque principal.' },
      { id: 'r10k-2', name: 'Carrera tempo (umbral)', sets: 2, reps: '10 minutos', rest: '3 min Z2 entre bloques', intensity: '80-87% FC máx · RPE 7-8', notes: 'Ritmo "cómodamente incómodo". Que la segunda mitad sea igual o un pelín más rápida que la primera.', nscaId: 'end-tempo-run' },
      { id: 'r10k-3', name: 'Intervalos VO2 cortos (a velocidad de 5K)', sets: 4, reps: '3 minutos', rest: '2 min trote suave', intensity: '92-95% FC máx · RPE 9', notes: 'Sólo después del calentamiento + tempo. Si las piernas no responden, saltarse el último intervalo.', nscaId: 'end-vo2-intervals' },
      { id: 'r10k-4', name: 'Enfriamiento Z1', sets: 1, reps: '10 min', rest: 'Ninguno', intensity: 'Trote muy suave', notes: 'Imprescindible para acelerar la limpieza de lactato y empezar la recuperación.' }
    ]
  },
  {
    id: 'r-ciclismo-base',
    title: 'MF-07 | Ciclismo — Base aeróbica + Sweet Spot',
    category: 'resistencia',
    description: 'Sesión de fondo medio del ciclista en construcción de base. Combina volumen Z2 con bloques de Sweet Spot para acumular adaptaciones de umbral. Plan recomendado: 2 salidas largas Z2 + 1 sesión como esta a la semana.',
    estimatedDuration: 90,
    createdAt: Date.now() - 75000,
    exercises: [
      { id: 'rcic-1', name: 'Calentamiento progresivo', sets: 1, reps: '15 min', rest: 'Ninguno', intensity: 'Z1 → Z2 progresivo', notes: 'Cadencia 85-95 RPM. Acabar con 3 aceleraciones de 30s para abrir el sistema.' },
      { id: 'rcic-2', name: 'Bloque Z2 sostenido', sets: 1, reps: '30 min', rest: 'Ninguno', intensity: '60-75% FTP', notes: 'Cadencia constante 85-95 RPM. Torso quieto, hombros relajados.', nscaId: 'end-cycling-z2' },
      { id: 'rcic-3', name: 'Sweet Spot Intervals', sets: 3, reps: '10 min', rest: '5 min Z2', intensity: '88-94% FTP · RPE 7-8', notes: 'Punto óptimo entre carga y adaptación. Mantener potencia constante sin "explosiones".', nscaId: 'end-cycling-sweet-spot' },
      { id: 'rcic-4', name: 'Vuelta a la calma', sets: 1, reps: '10 min', rest: 'Ninguno', intensity: 'Z1', notes: 'Pedaleo muy suave. Cadencia libre.' }
    ]
  },
  {
    id: 'r-triatlon-sprint',
    title: 'MF-08 | Triatlón Sprint — Sesión Brick (bici→carrera)',
    category: 'resistencia',
    description: 'Sesión brick semanal específica de triatlón sprint (750m nado + 20km bici + 5K carrera). Entrena la transición neuromuscular más complicada: cambiar de pedalear a correr con las piernas "pesadas". Otros días: 2 sesiones de cada disciplina por separado.',
    estimatedDuration: 75,
    createdAt: Date.now() - 70000,
    exercises: [
      { id: 'rtri-1', name: 'Calentamiento bici progresivo', sets: 1, reps: '10 min', rest: 'Ninguno', intensity: 'Z1 → Z2', notes: 'Subir gradualmente. Acabar con 2 aceleraciones de 30s.' },
      { id: 'rtri-2', name: 'Bici Z3-Z4 sostenido', sets: 1, reps: '40 min', rest: 'Ninguno', intensity: '85-95% FTP · RPE 7-8', notes: 'Simular el esfuerzo de la prueba real. Mantener cadencia 90 RPM.', nscaId: 'end-cycling-z2' },
      { id: 'rtri-3', name: 'Transición T2 (bici-carrera)', sets: 1, reps: '2-3 min', rest: 'Ninguno', intensity: 'Caminar/preparar', notes: 'Práctica realista: bajar de la bici, cambiar zapatillas, beber, salir corriendo. La calidad de la transición es donde se ganan minutos en triatlón.' },
      { id: 'rtri-4', name: 'Carrera progresiva (brick run)', sets: 1, reps: '20 min', rest: 'Ninguno', intensity: 'Z2 → Z3 progresivo', notes: 'Los primeros 5 min las piernas se sienten "pesadas". Es normal. Empezar suave y acelerar gradualmente al ritmo objetivo de carrera.', nscaId: 'end-brick-workout' },
      { id: 'rtri-5', name: 'Enfriamiento + estiramiento', sets: 1, reps: '5 min', rest: 'Ninguno', intensity: 'Suave', notes: 'Caminar + estiramiento de cuádriceps, isquios, glúteos.' }
    ]
  },
  {
    id: 'r-cross-training-fuerza-cardio',
    title: 'MF-09 | Cross-Training — Fuerza + MetCon',
    category: 'cross_training',
    description: 'Sesión de cross-training para deportista que combina fuerza con acondicionamiento metabólico. Útil para corredores/ciclistas que quieren añadir fuerza sin perder específico, o como sesión variada del fin de semana.',
    estimatedDuration: 55,
    createdAt: Date.now() - 65000,
    exercises: [
      { id: 'rxt-1', name: 'Calentamiento dinámico + movilidad', sets: 1, reps: '8 min', rest: 'Ninguno', intensity: 'Activación', notes: 'Cuerda 2 min + drills A/B-skip + movilidad cadera/tobillo + 5 sentadillas activación.' },
      { id: 'rxt-2', name: 'Sentadilla con barra', sets: 4, reps: '6', rest: '2 min', intensity: '75-80% 1RM · RPE 8', notes: 'Bloque de fuerza prioritario. Si la fatiga acumulada lo justifica, bajar a 70% RPE 7.', nscaId: 'nsca-back-squat' },
      { id: 'rxt-3', name: 'Peso muerto rumano', sets: 3, reps: '8', rest: '90s', intensity: '70% 1RM · RPE 8', notes: 'Cadena posterior. Bisagra de cadera pura, espalda neutra.', nscaId: 'nsca-romanian-deadlift' },
      { id: 'rxt-4', name: 'Circuito MetCon AMRAP 12 min', sets: 1, reps: 'Tantas rondas como sea posible', rest: 'Ninguno', intensity: 'RPE 8-9 sostenible', notes: 'Por ronda: 10 swings de kettlebell 16-20kg + 8 burpees + 100m carrera (o 20 calorías AirBike). Llevar registro de rondas/semanas.', nscaId: 'end-circuit-metcon' },
      { id: 'rxt-5', name: 'Cool-down + movilidad', sets: 1, reps: '8 min', rest: 'Ninguno', intensity: 'Z1', notes: 'Caminar 3 min + estiramiento global. Hidratación + carbohidratos de recuperación.' }
    ]
  }
];

/* ----------------------------------------------------------------------- *
 * Catálogo de servicios inicial (editable desde la sección Práctica)
 * ----------------------------------------------------------------------- */
export const INITIAL_SERVICES: ServiceCatalogItem[] = [
  {
    id: 'svc-evaluacion-inicial',
    name: 'Evaluación inicial',
    kind: 'evaluacion',
    amount: 60000,
    currency: 'CLP',
    notes: 'Anamnesis completa + antropometría + 1RM estimado + prescripción inicial.',
    active: true,
    createdAt: Date.now() - 100000
  },
  {
    id: 'svc-control-mensual',
    name: 'Control mensual',
    kind: 'control',
    amount: 40000,
    currency: 'CLP',
    notes: 'Revisión de adherencia, ajustes de cargas y nuevo bloque programático.',
    active: true,
    createdAt: Date.now() - 90000
  },
  {
    id: 'svc-pack-trimestral',
    name: 'Pack trimestral (3 meses)',
    kind: 'pack',
    amount: 100000,
    currency: 'CLP',
    sessionsIncluded: 3,
    durationDays: 90,
    notes: 'Incluye 3 controles mensuales con 15% de descuento sobre el precio por separado.',
    active: true,
    createdAt: Date.now() - 80000
  },
  {
    id: 'svc-sesion-presencial',
    name: 'Sesión presencial',
    kind: 'sesion',
    amount: 25000,
    currency: 'CLP',
    notes: 'Sesión de 60 minutos con supervisión directa.',
    active: true,
    createdAt: Date.now() - 70000
  }
];

/* ----------------------------------------------------------------------- *
 * Campañas de fidelización iniciales (ejemplos editables)
 * ----------------------------------------------------------------------- */
export const INITIAL_LOYALTY_CAMPAIGNS: LoyaltyCampaign[] = [
  {
    id: 'loy-cumple',
    title: 'Saludo de cumpleaños personalizado',
    description: 'Mensaje por WhatsApp con video corto del coach + 10% descuento próximo pack.',
    status: 'implementada',
    targetSegment: 'Todos los pacientes activos',
    startedAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    notes: 'Trigger automático desde la vista global; usar plantilla guardada.',
    tags: ['retención', 'low-cost'],
    createdAt: Date.now() - 70 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-referidos',
    title: 'Programa Refer-a-friend',
    description: 'Por cada nuevo paciente referido, el actual recibe un control gratis.',
    status: 'planificada',
    targetSegment: 'Pacientes >6 meses en cartera',
    costEstimate: 40000,
    currency: 'CLP',
    notes: 'Requiere crear landing + tracking de códigos de referido.',
    tags: ['adquisición', 'medium-effort'],
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-checkin-trimestral',
    title: 'Check-in trimestral por video',
    description: 'Reunión de 15 minutos con cada paciente cada 90 días para revisar objetivos macro.',
    status: 'idea',
    targetSegment: 'Todos',
    notes: 'Evaluar si conviene cobrarlo aparte o incluirlo en el pack trimestral.',
    tags: ['retención', 'experiencia'],
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-tarjeta-fidelidad',
    title: 'Tarjeta de fidelidad (10 controles = 1 gratis)',
    description: 'Cada 10 controles pagados, el paciente recibe el 11° gratis. Trackeo automático con N° de boleta.',
    status: 'planificada',
    targetSegment: 'Pacientes activos',
    costEstimate: 40000,
    currency: 'CLP',
    notes: 'Diseñar tarjeta visual digital para WhatsApp.',
    tags: ['retención', 'recurrencia'],
    createdAt: Date.now() - 18 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-descuento-permanencia',
    title: 'Descuento por permanencia (6m, 12m, 24m)',
    description: '5% off al cumplir 6 meses, 10% off al año, 15% off a los 2 años.',
    status: 'idea',
    targetSegment: 'Pacientes con +6 meses',
    notes: 'Revisar margen para que sea sostenible.',
    tags: ['retención', 'descuento'],
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-newsletter',
    title: 'Newsletter mensual con tips',
    description: 'Email mensual con un tip de nutrición/entrenamiento + estudio reciente + recomendación.',
    status: 'idea',
    targetSegment: 'Toda la cartera',
    notes: 'Definir herramienta (Mailchimp/Brevo) o hacerlo manual desde aquí.',
    tags: ['retención', 'contenido'],
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-clase-grupal',
    title: 'Clase grupal trimestral abierta',
    description: 'Clase técnica de 90 min con todos los pacientes invitados. Refuerza comunidad y permite traer +1.',
    status: 'idea',
    targetSegment: 'Toda la cartera + acompañante',
    costEstimate: 30000,
    currency: 'CLP',
    notes: 'Buscar espacio físico. Tema rotativo (técnica de levantamiento, movilidad, prevención de lesiones).',
    tags: ['adquisición', 'comunidad'],
    createdAt: Date.now() - 9 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-evaluacion-anual',
    title: 'Re-evaluación anual gratis',
    description: 'Al cumplir 12 meses con el coach, el paciente recibe una evaluación completa de regalo (valor $60k).',
    status: 'idea',
    targetSegment: 'Pacientes con 12 meses cumplidos',
    notes: 'Sirve para reactivar relación y proyectar próximo año.',
    tags: ['retención', 'milestone'],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-grupo-whatsapp',
    title: 'Grupo de WhatsApp comunidad',
    description: 'Grupo con todos los pacientes activos para compartir logros, tips y crear sentido de comunidad.',
    status: 'idea',
    targetSegment: 'Pacientes activos',
    notes: 'Definir reglas básicas (no spam, sin política, foco en entrenamiento).',
    tags: ['retención', 'comunidad', 'low-cost'],
    createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000
  },
  {
    id: 'loy-aniversario-cartera',
    title: 'Aniversario en la cartera',
    description: 'Mensaje + gift card simbólica (café, snack) cuando el paciente cumple X meses con el coach.',
    status: 'planificada',
    targetSegment: 'Todos los activos',
    costEstimate: 5000,
    currency: 'CLP',
    notes: 'Triggers: 6m, 12m, 24m. Generar recordatorios automáticos en el sistema.',
    tags: ['retención', 'experiencia'],
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000
  }
];

/* ----------------------------------------------------------------------- *
 * Plantillas de mensajes iniciales (con placeholders {{nombre}}, etc.)
 * ----------------------------------------------------------------------- */
export const INITIAL_MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'tpl-recordatorio-control',
    name: 'Recordatorio de control',
    channel: 'whatsapp',
    category: 'recordatorio',
    body: 'Hola {{nombre}}, te recuerdo que tenemos control agendado el {{fecha}}. Si necesitas reagendar, avísame con tiempo. ¡Nos vemos!',
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-cobro',
    name: 'Recordatorio de pago',
    channel: 'whatsapp',
    category: 'cobro',
    body: 'Hola {{nombre}}, te recuerdo que el {{fecha}} vence el pago del control mensual ({{monto}}). Datos de transferencia: [completar]. ¡Muchas gracias!',
    createdAt: Date.now() - 50 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-pago-recibido',
    name: 'Confirmación de pago recibido',
    channel: 'whatsapp',
    category: 'cobro',
    body: 'Hola {{nombre}}, confirmo la recepción de tu pago por {{monto}}. ¡Muchas gracias por la confianza! Cualquier cosa que necesites, me avisas.',
    createdAt: Date.now() - 48 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-cumple',
    name: 'Saludo de cumpleaños',
    channel: 'whatsapp',
    category: 'fidelización',
    body: '¡Feliz cumpleaños {{nombre}}! Que tengas un año lleno de PRs y buena salud 💪. Por tu día, tu próximo control tiene un 10% de descuento.',
    createdAt: Date.now() - 40 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-followup',
    name: 'Seguimiento post sesión',
    channel: 'whatsapp',
    category: 'seguimiento',
    body: 'Hola {{nombre}}, ¿cómo te fue con la pauta de esta semana? ¿Algún dolor o duda? Cualquier ajuste lo coordinamos en el próximo control.',
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-pedir-reporte',
    name: 'Pedir reporte de avance',
    channel: 'whatsapp',
    category: 'seguimiento',
    body: 'Hola {{nombre}}, te enviaré el formulario de avance para que lo completes antes de nuestro próximo control. Te demoras 5 minutos. ¡Gracias!',
    createdAt: Date.now() - 20 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-bienvenida',
    name: 'Bienvenida a la práctica',
    channel: 'whatsapp',
    category: 'onboarding',
    body: '¡Hola {{nombre}}! Bienvenido/a a la práctica. Te voy a enviar el formulario inicial para conocer tus antecedentes y objetivos. Cuando lo completes, agendamos tu primera sesión. ¡Vamos con todo!',
    createdAt: Date.now() - 70 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-meta-cumplida',
    name: 'Felicitación por meta cumplida',
    channel: 'whatsapp',
    category: 'fidelización',
    body: '¡Felicitaciones {{nombre}}! Cumpliste la meta que nos habíamos propuesto 🎉. Es el resultado de tu constancia. Estoy muy orgulloso/a de tu proceso. ¡Vamos por la próxima!',
    createdAt: Date.now() - 25 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-reactivacion',
    name: 'Reactivación de paciente inactivo',
    channel: 'whatsapp',
    category: 'reactivación',
    body: 'Hola {{nombre}}, hace un tiempo que no nos vemos. ¿Cómo has estado? Si quieres retomar el entrenamiento, te tengo agenda disponible esta semana. Avísame y coordinamos.',
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-encuesta',
    name: 'Encuesta de satisfacción',
    channel: 'whatsapp',
    category: 'feedback',
    body: 'Hola {{nombre}}, llevamos ya un tiempo trabajando juntos. ¿Me podrías contar en 2-3 líneas cómo te has sentido con el proceso? Tu feedback me ayuda a mejorar. ¡Gracias!',
    createdAt: Date.now() - 12 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-testimonio',
    name: 'Solicitud de testimonio',
    channel: 'whatsapp',
    category: 'marketing',
    body: 'Hola {{nombre}}, dado el avance que hemos logrado juntos, ¿te animarías a dejarme un breve testimonio que pueda compartir? Me ayudaría mucho con la difusión. ¡Por supuesto que con todo el respeto a tu privacidad!',
    createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-cambio-horario',
    name: 'Aviso de cambio de horario',
    channel: 'whatsapp',
    category: 'recordatorio',
    body: 'Hola {{nombre}}, te aviso que necesito reagendar nuestra sesión del {{fecha}}. ¿Te acomoda alguna de estas opciones? [completar opciones]. Disculpa las molestias.',
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000
  },
  {
    id: 'tpl-email-resumen',
    name: 'Resumen mensual del progreso (email)',
    channel: 'email',
    category: 'seguimiento',
    body: 'Hola {{nombre}},\n\nEspero te encuentres bien. Te envío un resumen de tu progreso este mes:\n\n- Sesiones realizadas: [N°]\n- Adherencia: [%]\n- PRs alcanzados: [completar]\n- Próximos objetivos: [completar]\n\nNos vemos el {{control}}.\n\nUn abrazo.',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000
  }
];

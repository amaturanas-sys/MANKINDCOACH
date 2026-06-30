/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorkoutCategory = 'fuerza' | 'potencia' | 'hipertrofia' | 'aerobico' | 'resistencia' | 'cross_training';

export const WORKOUT_CATEGORIES: WorkoutCategory[] = ['fuerza', 'potencia', 'hipertrofia', 'aerobico', 'resistencia', 'cross_training'];

export type Sex = 'masculino' | 'femenino' | 'otro';
export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'muy_intenso';

/**
 * Modalidad de un bloque de endurance / cross-training.
 * Determina qué disciplina se está entrenando (run, bike, swim, etc.).
 */
export type EnduranceModality =
  | 'run' | 'bike' | 'swim' | 'row' | 'airbike' | 'skierg'
  | 'rope' | 'stairs' | 'brick' | 'metcon' | 'mixed';

/**
 * Protocolo del bloque (NSCA ESSC Cap. 21 + Daniels Running Formula + Friel).
 * - continuous / lsd: largo a baja intensidad (Z1-Z2)
 * - tempo: ritmo de umbral aeróbico (Z3-Z4)
 * - intervals: VO2max work:rest controlado (Z4-Z5)
 * - fartlek: juego de velocidad
 * - hill_repeats: cuestas (Lydiard)
 * - strides: progresiones cortas
 * - time_trial: prueba de FTP/2K/5K/etc.
 * - tabata: 20s on / 10s off × 8 (Tabata I. 1996)
 * - amrap / emom: protocolos MetCon CrossFit
 * - brick: multi-disciplina (triatlón)
 * - technique: drills de técnica
 */
export type EnduranceProtocol =
  | 'continuous' | 'lsd' | 'tempo' | 'intervals' | 'fartlek'
  | 'hill_repeats' | 'strides' | 'time_trial' | 'tabata'
  | 'amrap' | 'emom' | 'brick' | 'technique';

/** Zona de entrenamiento (modelo 5 zonas Coggan / Friel). */
export type EnduranceZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'mixed';

/**
 * Parámetros específicos de un bloque de endurance / cross-training.
 * Cuando un Exercise tiene este objeto, el editor lo renderiza como bloque cardio
 * (con campos de zona/intervalos/cadencia/pace) en lugar del clásico sets/reps.
 *
 * Campos opcionales: el usuario llena lo que aplique a su deporte y protocolo.
 */
export interface EnduranceParams {
  modality: EnduranceModality;
  protocol: EnduranceProtocol;
  zone?: EnduranceZone;
  /** RPE Borg CR10 (1-10) o Borg 6-20. Se guarda como texto para preservar el rango. */
  rpe?: string;
  /** Duración total del bloque en minutos (incluye trabajo, no warmup). */
  durationMin?: number;
  /** Distancia total objetivo, p.ej. "5 km", "1500 m", "40 km". */
  distance?: string;
  /** Para intervals/tabata/emom: descripción del trabajo (p.ej. "3 min", "400 m", "20s"). */
  workInterval?: string;
  /** Recuperación entre intervalos (p.ej. "60s trote", "2 min Z1", "10s rest"). */
  restInterval?: string;
  /** Número de repeticiones del intervalo (p.ej. 8 para Tabata). */
  intervalReps?: number;
  /** Pace objetivo: "4:30/km", "1:45/100m", "M-pace", "T-pace", "I-pace" (Daniels). */
  pace?: string;
  /** Cadencia: 170-180 ppm (running), 85-95 RPM (cycling), 30-36 spm (rowing). */
  cadence?: string;
  /** Objetivo de FC: "140-160 bpm" o "75-85% FCmax". */
  fcTarget?: string;
  /** Objetivo de potencia: "85% FTP", "200-240W" (cycling/rowing). */
  powerTarget?: string;
  /** Descripción del warmup (10-15 min Z1, drills, etc.). */
  warmup?: string;
  /** Descripción del cooldown (5-10 min Z1, estiramientos). */
  cooldown?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  intensity: string;
  notes?: string;
  /** Si vino de la biblioteca NSCA, conservamos el id para referencia/glosario. */
  nscaId?: string;
  /**
   * Si está presente, el editor renderiza este Exercise como bloque de endurance/cardio
   * con campos específicos (zona, pace, intervalos, cadencia) en lugar del clásico
   * sets/reps/rest/intensity. Los campos sets/reps/rest/intensity siguen existiendo
   * por compatibilidad pero quedan en segundo plano (resumen de texto).
   */
  endurance?: EnduranceParams;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  category: WorkoutCategory;
  description: string;
  estimatedDuration: number;
  exercises: Exercise[];
  createdAt: number;
}

/**
 * Métricas del paciente. Datos antropométricos + rendimiento base + cálculos derivados.
 * IMC y Benedict se computan en runtime con `computeBmi` / `computeBmr` (constants.ts).
 */
export interface PatientMetrics {
  /** Antropometría */
  weightKg?: number;       // peso en kg
  heightCm?: number;       // talla en cm
  age?: number;            // años
  sex?: Sex;
  activityLevel?: ActivityLevel;
  fatPercentage?: number;  // % grasa corporal

  /** Rendimiento base */
  benchPress1RM?: number;  // kg
  squat1RM?: number;       // kg
  deadlift1RM?: number;    // kg
  pullUpMaxReps?: number;  // reps
  run400mSeconds?: number; // segundos
  vo2Max?: number;         // ml/kg/min
  otherMetrics?: string;   // texto libre
}

export interface ClinicalHistory {
  morbidities?: string;     // Antecedentes mórbidos / patologías
  medications?: string;     // Medicamentos en curso
  allergies?: string;       // Alergias
  surgeries?: string;       // Cirugías previas
  injuries?: string;        // Lesiones musculo-esqueléticas
  notes?: string;           // Notas adicionales
}

export interface ClientGoals {
  performance?: string;     // Objetivo de rendimiento (técnico-deportivo)
  aesthetic?: string;       // Objetivo estético (composición corporal)
  health?: string;          // Objetivo de salud (opcional)
}

/* ----------------------------------------------------------------------- *
 * Gestión de práctica (precios, controles, fidelización, contacto).
 * Datos comerciales/administrativos del paciente. Todo opcional para
 * mantener compatibilidad con perfiles existentes.
 * ----------------------------------------------------------------------- */

export type ContactMethod = 'whatsapp' | 'email' | 'telefono' | 'presencial';
export type BillingCadence = 'mensual' | 'quincenal' | 'semanal' | 'unico' | 'porSesion';

export interface PracticePricing {
  amount?: number;            // Monto cobrado por cadencia
  currency?: string;          // CLP, USD, EUR... default CLP
  cadence?: BillingCadence;
}

export interface PracticeBirthday {
  month: number;              // 1-12
  day: number;                // 1-31
}

export interface PracticeData {
  /** Plan comercial */
  pricing?: PracticePricing;
  lastPaymentAt?: number;     // timestamp ms
  nextPaymentAt?: number;     // timestamp ms
  paymentNotes?: string;      // medio de pago, comprobante, etc.

  /** Controles clínicos / sesiones */
  nextControlAt?: number;     // timestamp ms del próximo control
  controlIntervalDays?: number; // cada cuántos días pedir control
  lastControlAt?: number;     // timestamp ms del último control efectivo
  controlNotes?: string;      // recordatorios para el próximo control

  /** Fidelización / contacto */
  contactMethod?: ContactMethod;
  contactValue?: string;      // legacy: número, email o handle (un solo campo)
  birthday?: PracticeBirthday;
  loyaltyNotes?: string;      // hitos, regalos, comunicaciones a enviar
  acquiredAt?: number;        // cuándo se sumó a la práctica

  /** v11+: datos de contacto detallados (todos opcionales) */
  phone?: string;             // teléfono / WhatsApp (formato libre)
  email?: string;
  instagram?: string;         // handle sin @
  address?: string;           // dirección o ciudad
  emergencyContact?: string;  // nombre + relación + teléfono
}

/* ----------------------------------------------------------------------- *
 * v10: organización interna por paciente
 * ----------------------------------------------------------------------- */

export type PatientStatus = 'lead' | 'activo' | 'pausa' | 'churn';

export interface PatientReminder {
  id: string;
  text: string;
  dueAt?: number;            // timestamp opcional
  done: boolean;
  createdAt: number;
}

export interface ClientProfile {
  id: string;
  name: string;
  focus: string;
  experienceLevel: 'principiante' | 'intermedio' | 'avanzado' | 'elite';
  equipment: string[];
  suggestedMovements: string;
  suggestedLoads: string;
  metrics: PatientMetrics;
  clinical: ClinicalHistory;
  goals: ClientGoals;
  /** v8: datos comerciales/administrativos. Opcional para retrocompatibilidad. */
  practice?: PracticeData;
  /** v10: notas internas del coach (no visibles para el paciente). */
  coachNotes?: string;
  /** v10: etiquetas libres para clasificar (deportista, rehab, lead, etc.). */
  tags?: string[];
  /** v10: estado operacional del paciente. */
  status?: PatientStatus;
  /** v10: lista de recordatorios/tareas sobre este paciente. */
  reminders?: PatientReminder[];
  /** v11: foto del paciente en base64 (data URL). Comprimida a ~30-50KB max. */
  avatarDataUrl?: string;
  /** v11: cuándo se incorporó este paciente (timestamp ms). */
  joinedAt?: number;
}

export interface ScheduledRoutine {
  id: string;
  clientId: string;
  routineId: string;
  year: number;
  monthIndex: number;
  dayOfMonth: number;
  /**
   * Franja del día en el Planificador. Opcional para retrocompatibilidad:
   * las cargas antiguas sin slot se tratan como 'am'.
   */
  slot?: 'am' | 'pm';
}

export interface MonthRef {
  year: number;
  monthIndex: number;
}

export interface MetricSample {
  id: string;
  clientId: string;
  takenAt: number;
  benchPress1RM?: number;
  squat1RM?: number;
  deadlift1RM?: number;
  vo2Max?: number;
  fatPercentage?: number;
  weightKg?: number;
  pullUpMaxReps?: number;
  run400mSeconds?: number;
  notes?: string;
}

export const METRIC_FIELDS: Array<{ key: keyof Omit<MetricSample, 'id' | 'clientId' | 'takenAt' | 'notes'>; label: string; unit: string }> = [
  { key: 'benchPress1RM', label: 'Press Banca 1RM', unit: 'kg' },
  { key: 'squat1RM', label: 'Sentadilla 1RM', unit: 'kg' },
  { key: 'deadlift1RM', label: 'Peso Muerto 1RM', unit: 'kg' },
  { key: 'pullUpMaxReps', label: 'Pull-Ups Máx', unit: 'reps' },
  { key: 'run400mSeconds', label: 'Carrera 400m', unit: 's' },
  { key: 'vo2Max', label: 'VO2 Máximo', unit: 'ml/kg/min' },
  { key: 'weightKg', label: 'Peso Corporal', unit: 'kg' },
  { key: 'fatPercentage', label: 'Grasa Corporal', unit: '%' }
];

export interface MicrocycleTemplate {
  id: string;
  name: string;
  /** weekday (0=lunes) → ids de pautas, en orden. */
  days: Record<number, string[]>;
  /**
   * Franja AM/PM por entrada, alineada por índice con `days[weekday]`.
   * Opcional y retrocompatible: si falta, las plantillas antiguas se aplican
   * en AM (comportamiento previo a las franjas AM/PM).
   */
  slots?: Record<number, ('am' | 'pm')[]>;
  createdAt: number;
}

/* ----------------------------------------------------------------------- *
 * Gestión económica de la práctica (v9):
 * - PaymentRecord: pagos efectivos del paciente (cuándo, cuánto, qué concepto).
 * - ServiceCatalogItem: catálogo interno de precios (evaluación, controles, packs).
 * - LoyaltyCampaign: ideas/campañas de fidelización con kanban por estado.
 * ----------------------------------------------------------------------- */

export type PaymentMethod = 'transferencia' | 'efectivo' | 'tarjeta' | 'app' | 'otro';

export interface PaymentRecord {
  id: string;
  clientId: string;
  amount: number;
  currency: string;            // 'CLP', 'USD', etc.
  paidAt: number;              // timestamp ms (fecha del pago)
  concept: string;             // "Control mensual mayo", "Pack inicial 3 meses"
  method?: PaymentMethod;
  serviceId?: string;          // referencia opcional al catálogo
  receiptNumber?: string;      // boleta/factura
  notes?: string;
}

export type ServiceKind = 'evaluacion' | 'control' | 'pack' | 'sesion' | 'otro';

export interface ServiceCatalogItem {
  id: string;
  name: string;                // "Evaluación inicial", "Control mensual"
  kind: ServiceKind;
  amount: number;
  currency: string;            // CLP por defecto
  /** Solo aplica a packs: cuántas sesiones incluye. */
  sessionsIncluded?: number;
  /** Solo aplica a packs: validez en días. */
  durationDays?: number;
  notes?: string;
  active: boolean;             // si está disponible para asignar
  createdAt: number;
}

/* ----------------------------------------------------------------------- *
 * v11: timeline clínica, log de comunicaciones, agenda del coach
 * ----------------------------------------------------------------------- */

export type SessionKind = 'control' | 'sesion' | 'evaluacion' | 'mensaje' | 'otro';

export interface SessionNote {
  id: string;
  clientId: string;
  takenAt: number;             // cuándo ocurrió la sesión
  kind: SessionKind;
  title: string;               // "Control de marzo", "Sesión presencial"
  content: string;             // notas de lo que se hizo / observó
  durationMinutes?: number;
  createdAt: number;
}

export interface CommunicationLog {
  id: string;
  clientId: string;
  channel: MessageChannel;
  templateId?: string;         // si vino de plantilla
  preview: string;             // primeros 80 chars del mensaje copiado
  sentAt: number;              // cuándo se copió
}

export interface GlobalReminder {
  id: string;
  text: string;
  dueAt?: number;
  done: boolean;
  category?: string;           // "marketing", "admin", "estudio", etc.
  createdAt: number;
}

/* ----------------------------------------------------------------------- *
 * v12: Biblioteca de movimientos extendida + contraindicaciones
 * ----------------------------------------------------------------------- */

/** Códigos canónicos de condiciones médicas para contraindicaciones. */
export type MedicalCondition =
  | 'dolor_lumbar_cronico'
  | 'hernia_discal'
  | 'artrosis_rodilla'
  | 'artrosis_cadera'
  | 'artrosis_hombro'
  | 'lesion_meniscal'
  | 'tendinopatia_hombro'
  | 'manguito_rotador'
  | 'epicondilitis'
  | 'tendinopatia_aquiles'
  | 'fascitis_plantar'
  | 'hipertension'
  | 'cardiopatia'
  | 'osteoporosis'
  | 'embarazo'
  | 'post_quirurgico_columna'
  | 'post_quirurgico_rodilla'
  | 'inestabilidad_lumbar'
  | 'cervicalgia';

export interface ExerciseWarning {
  condition: MedicalCondition;
  /** 'evitar' = no hacer, 'precaucion' = adaptar carga/rango, 'consultar' = depende del caso */
  severity: 'evitar' | 'precaucion' | 'consultar';
  /** Nota libre opcional del coach con detalle/adaptación. */
  note?: string;
}

/** Ejercicios manuales creados por el usuario (no NSCA). */
export interface CustomExercise {
  id: string;
  name: string;
  englishName?: string;
  pattern: import('./lib/movementIcons').MovementPattern;
  category: 'fuerza' | 'potencia' | 'hipertrofia' | 'aerobico' | 'movilidad' | 'tecnica';
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string[];
  /** Descripción técnica del movimiento. */
  technique: string;
  /** Errores frecuentes a corregir. */
  commonErrors?: string;
  /** Variantes / progresiones. */
  variations?: string;
  /** Carga/intensidad sugerida (ej "70-85% 1RM", "RPE 7-8"). */
  suggestedIntensity?: string;
  /** Tempo sugerido (ej "3-1-1-0"). */
  tempo?: string;
  /** Warnings propios del ejercicio. */
  warnings: ExerciseWarning[];
  /** Notas libres adicionales. */
  notes?: string;
  createdAt: number;
}

/**
 * Corrección/edición que el coach aplica sobre un ejercicio NSCA (read-only).
 * Se guarda por id de ejercicio; cualquier campo presente sobreescribe al de la
 * biblioteca base. Permite arreglar catalogaciones erróneas (equipamiento,
 * patrón, músculo, categoría) sin tocar el manual NSCA empaquetado.
 */
export interface ExerciseOverride {
  name?: string;
  englishName?: string;
  pattern?: import('./lib/movementIcons').MovementPattern;
  primaryMuscle?: string;
  muscleGroups?: string[];
  equipment?: string[];
  category?: string;
  /** Reemplaza la técnica mostrada (texto libre). */
  technique?: string;
  notes?: string;
}

/* Plantillas de mensajes reusables (WhatsApp/email/etc.) */
export type MessageChannel = 'whatsapp' | 'email' | 'sms' | 'instagram' | 'generico';

export interface MessageTemplate {
  id: string;
  name: string;
  channel: MessageChannel;
  /** Texto con placeholders {{nombre}}, {{fecha}}, {{monto}}. */
  body: string;
  category?: string;        // "recordatorio", "fidelización", "cobro", etc.
  createdAt: number;
}

export type LoyaltyStatus = 'idea' | 'planificada' | 'en_curso' | 'implementada' | 'pausada' | 'descartada';

export interface LoyaltyCampaign {
  id: string;
  title: string;
  description: string;
  status: LoyaltyStatus;
  /** A quién va dirigida: "cumpleañeros", ">6 meses en cartera", etc. */
  targetSegment?: string;
  startedAt?: number;
  completedAt?: number;
  costEstimate?: number;
  currency?: string;
  notes?: string;
  tags?: string[];
  createdAt: number;
}

export interface BackupPayload {
  app: 'MankindFactory Routine Workspace';
  version: number;
  timestamp: number;
  data: {
    clients: ClientProfile[];
    activeClientId: string;
    routines: WorkoutRoutine[];
    scheduledRoutines: ScheduledRoutine[];
    metricSamples: MetricSample[];
    templates: MicrocycleTemplate[];
    /** v9: gestión económica */
    payments?: PaymentRecord[];
    services?: ServiceCatalogItem[];
    loyaltyCampaigns?: LoyaltyCampaign[];
    /** v10: plantillas de mensajes reusables */
    messageTemplates?: MessageTemplate[];
    /** v11: nuevas colecciones */
    sessionNotes?: SessionNote[];
    communicationLogs?: CommunicationLog[];
    globalReminders?: GlobalReminder[];
    /** v12: biblioteca extendida */
    customExercises?: CustomExercise[];
    /** Warnings que el usuario agregó a ejercicios NSCA (clave = nscaId). */
    exerciseWarnings?: Record<string, ExerciseWarning[]>;
    /** v15: correcciones del coach sobre ejercicios NSCA (clave = nscaId). */
    exerciseOverrides?: Record<string, ExerciseOverride>;
    /** v13: banco personal de imágenes (subidas por el usuario, comprimidas a base64). */
    userImages?: UserImage[];
    /** v14: banco de ilustraciones anatómicas con licencia (CC), etiquetadas por músculo. */
    anatomyImages?: AnatomyImage[];
  };
}

/* ----------------------------------------------------------------------- *
 * v13: banco personal de imágenes (para insertar en documentos)
 * ----------------------------------------------------------------------- */

export interface UserImage {
  id: string;
  name: string;
  /** Data URL (data:image/jpeg;base64,...) comprimido a ~300px ancho */
  dataUrl: string;
  /** Categoría libre para agrupar (ej "logos", "fondos", "ilustraciones") */
  category?: string;
  createdAt: number;
}

/* ----------------------------------------------------------------------- *
 * v14: banco de ilustraciones anatómicas con licencia (Creative Commons)
 *
 * Imágenes importadas por el coach (p. ej. de AnatomyTOOL / Wikimedia) que se
 * almacenan offline (dataURL) y se etiquetan por grupo muscular para mostrarse
 * en la Biblioteca de movimientos. Autor y licencia son OBLIGATORIOS para que
 * la atribución viaje siempre con la imagen.
 * ----------------------------------------------------------------------- */

/** Licencias admitidas para ilustraciones reutilizables. */
export type ImageLicense =
  | 'CC0'
  | 'CC BY 4.0'
  | 'CC BY-SA 4.0'
  | 'CC BY-NC 4.0'
  | 'CC BY-NC-SA 4.0'
  | 'Public Domain'
  | 'Other';

export interface AnatomyImage {
  id: string;
  /** Título de la ilustración. */
  name: string;
  /** Imagen comprimida (data:image/...;base64,…) — offline. */
  dataUrl: string;
  /** Grupos musculares que ilustra (códigos MuscleGroup: 'back', 'quads', …). */
  muscleGroups: string[];
  /** Autor/crédito — OBLIGATORIO. */
  author: string;
  /** Licencia — OBLIGATORIO. */
  license: ImageLicense;
  /** URL de la ficha/fuente original (recomendado para la atribución). */
  sourceUrl?: string;
  /** Notas libres del coach. */
  notes?: string;
  createdAt: number;
}

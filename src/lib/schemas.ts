/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const enduranceModalitySchema = z.enum([
  'run', 'bike', 'swim', 'row', 'airbike', 'skierg',
  'rope', 'stairs', 'brick', 'metcon', 'mixed'
]);

export const enduranceProtocolSchema = z.enum([
  'continuous', 'lsd', 'tempo', 'intervals', 'fartlek',
  'hill_repeats', 'strides', 'time_trial', 'tabata',
  'amrap', 'emom', 'brick', 'technique'
]);

export const enduranceZoneSchema = z.enum(['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'mixed']);

export const enduranceParamsSchema = z.object({
  modality: enduranceModalitySchema,
  protocol: enduranceProtocolSchema,
  zone: enduranceZoneSchema.optional(),
  rpe: z.string().optional(),
  durationMin: z.number().nonnegative().optional(),
  distance: z.string().optional(),
  workInterval: z.string().optional(),
  restInterval: z.string().optional(),
  intervalReps: z.number().int().nonnegative().optional(),
  pace: z.string().optional(),
  cadence: z.string().optional(),
  fcTarget: z.string().optional(),
  powerTarget: z.string().optional(),
  warmup: z.string().optional(),
  cooldown: z.string().optional()
});

export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sets: z.number().int().nonnegative(),
  reps: z.string(),
  rest: z.string(),
  intensity: z.string(),
  notes: z.string().optional(),
  nscaId: z.string().optional(),
  endurance: enduranceParamsSchema.optional()
});

export const workoutCategorySchema = z.enum(['fuerza', 'potencia', 'hipertrofia', 'aerobico', 'resistencia', 'cross_training']);

export const workoutRoutineSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: workoutCategorySchema,
  description: z.string(),
  estimatedDuration: z.number().nonnegative(),
  exercises: z.array(exerciseSchema),
  createdAt: z.number()
});

export const sexSchema = z.enum(['masculino', 'femenino', 'otro']);
export const activityLevelSchema = z.enum(['sedentario', 'ligero', 'moderado', 'intenso', 'muy_intenso']);

export const patientMetricsSchema = z.object({
  weightKg: z.number().optional(),
  heightCm: z.number().optional(),
  age: z.number().optional(),
  sex: sexSchema.optional(),
  activityLevel: activityLevelSchema.optional(),
  fatPercentage: z.number().optional(),
  benchPress1RM: z.number().optional(),
  squat1RM: z.number().optional(),
  deadlift1RM: z.number().optional(),
  pullUpMaxReps: z.number().optional(),
  run400mSeconds: z.number().optional(),
  vo2Max: z.number().optional(),
  otherMetrics: z.string().optional()
});

export const clinicalHistorySchema = z.object({
  morbidities: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  surgeries: z.string().optional(),
  injuries: z.string().optional(),
  notes: z.string().optional()
});

export const clientGoalsSchema = z.object({
  performance: z.string().optional(),
  aesthetic: z.string().optional(),
  health: z.string().optional()
});

export const contactMethodSchema = z.enum(['whatsapp', 'email', 'telefono', 'presencial']);
export const billingCadenceSchema = z.enum(['mensual', 'quincenal', 'semanal', 'unico', 'porSesion']);

export const practicePricingSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  cadence: billingCadenceSchema.optional()
});

export const practiceBirthdaySchema = z.object({
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31)
});

export const practiceDataSchema = z.object({
  pricing: practicePricingSchema.optional(),
  lastPaymentAt: z.number().optional(),
  nextPaymentAt: z.number().optional(),
  paymentNotes: z.string().optional(),
  nextControlAt: z.number().optional(),
  controlIntervalDays: z.number().int().positive().optional(),
  lastControlAt: z.number().optional(),
  controlNotes: z.string().optional(),
  contactMethod: contactMethodSchema.optional(),
  contactValue: z.string().optional(),
  birthday: practiceBirthdaySchema.optional(),
  loyaltyNotes: z.string().optional(),
  acquiredAt: z.number().optional(),
  /* v11+ datos de contacto extendidos */
  phone: z.string().optional(),
  email: z.string().optional(),
  instagram: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional()
});

export const patientStatusSchema = z.enum(['lead', 'activo', 'pausa', 'churn']);

export const patientReminderSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  dueAt: z.number().optional(),
  done: z.boolean(),
  createdAt: z.number()
});

export const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  focus: z.string(),
  experienceLevel: z.enum(['principiante', 'intermedio', 'avanzado', 'elite']),
  equipment: z.array(z.string()),
  suggestedMovements: z.string(),
  suggestedLoads: z.string(),
  metrics: patientMetricsSchema,
  clinical: clinicalHistorySchema,
  goals: clientGoalsSchema,
  practice: practiceDataSchema.optional(),
  /* v10 */
  coachNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: patientStatusSchema.optional(),
  reminders: z.array(patientReminderSchema).optional(),
  /* v11 */
  avatarDataUrl: z.string().optional(),
  joinedAt: z.number().optional()
});

export const clientsSchema = z.array(profileSchema).min(1);

export const routinesSchema = z.array(workoutRoutineSchema);

export const scheduledSchema = z.array(z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  routineId: z.string().min(1),
  year: z.number().int().min(1970).max(3000),
  monthIndex: z.number().int().min(0).max(11),
  dayOfMonth: z.number().int().min(1).max(31),
  slot: z.enum(['am', 'pm']).optional()
}));

export const metricSampleSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  takenAt: z.number(),
  benchPress1RM: z.number().optional(),
  squat1RM: z.number().optional(),
  deadlift1RM: z.number().optional(),
  vo2Max: z.number().optional(),
  fatPercentage: z.number().optional(),
  weightKg: z.number().optional(),
  pullUpMaxReps: z.number().optional(),
  run400mSeconds: z.number().optional(),
  notes: z.string().optional()
});

export const metricSamplesSchema = z.array(metricSampleSchema);

export const microcycleTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  days: z.record(z.string(), z.array(z.string())),
  slots: z.record(z.string(), z.array(z.enum(['am', 'pm']))).optional(),
  createdAt: z.number()
});

export const templatesSchema = z.array(microcycleTemplateSchema);

/* ----------------------------------------------------------------------- *
 * v9: gestión económica (pagos, catálogo, fidelización)
 * ----------------------------------------------------------------------- */

export const paymentMethodSchema = z.enum(['transferencia', 'efectivo', 'tarjeta', 'app', 'otro']);

export const paymentRecordSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  amount: z.number(),
  currency: z.string().min(1),
  paidAt: z.number(),
  concept: z.string(),
  method: paymentMethodSchema.optional(),
  serviceId: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional()
});
export const paymentsSchema = z.array(paymentRecordSchema);

export const serviceKindSchema = z.enum(['evaluacion', 'control', 'pack', 'sesion', 'otro']);
export const serviceCatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: serviceKindSchema,
  amount: z.number(),
  currency: z.string().min(1),
  sessionsIncluded: z.number().int().positive().optional(),
  durationDays: z.number().int().positive().optional(),
  notes: z.string().optional(),
  active: z.boolean(),
  createdAt: z.number()
});
export const servicesSchema = z.array(serviceCatalogItemSchema);

export const loyaltyStatusSchema = z.enum(['idea', 'planificada', 'en_curso', 'implementada', 'pausada', 'descartada']);
export const loyaltyCampaignSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  status: loyaltyStatusSchema,
  targetSegment: z.string().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  costEstimate: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.number()
});
export const loyaltyCampaignsSchema = z.array(loyaltyCampaignSchema);

export const messageChannelSchema = z.enum(['whatsapp', 'email', 'sms', 'instagram', 'generico']);

export const messageTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  channel: messageChannelSchema,
  body: z.string(),
  category: z.string().optional(),
  createdAt: z.number()
});
export const messageTemplatesSchema = z.array(messageTemplateSchema);

export const sessionKindSchema = z.enum(['control', 'sesion', 'evaluacion', 'mensaje', 'otro']);

export const sessionNoteSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  takenAt: z.number(),
  kind: sessionKindSchema,
  title: z.string(),
  content: z.string(),
  durationMinutes: z.number().optional(),
  createdAt: z.number()
});
export const sessionNotesSchema = z.array(sessionNoteSchema);

export const communicationLogSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  channel: messageChannelSchema,
  templateId: z.string().optional(),
  preview: z.string(),
  sentAt: z.number()
});
export const communicationLogsSchema = z.array(communicationLogSchema);

export const globalReminderSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  dueAt: z.number().optional(),
  done: z.boolean(),
  category: z.string().optional(),
  createdAt: z.number()
});
export const globalRemindersSchema = z.array(globalReminderSchema);

/* v12: warnings/contraindicaciones + ejercicios custom */
export const medicalConditionSchema = z.enum([
  'dolor_lumbar_cronico', 'hernia_discal', 'artrosis_rodilla', 'artrosis_cadera',
  'artrosis_hombro', 'lesion_meniscal', 'tendinopatia_hombro', 'manguito_rotador',
  'epicondilitis', 'tendinopatia_aquiles', 'fascitis_plantar', 'hipertension',
  'cardiopatia', 'osteoporosis', 'embarazo', 'post_quirurgico_columna',
  'post_quirurgico_rodilla', 'inestabilidad_lumbar', 'cervicalgia'
]);
export const exerciseWarningSchema = z.object({
  condition: medicalConditionSchema,
  severity: z.enum(['evitar', 'precaucion', 'consultar']),
  note: z.string().optional()
});

export const movementPatternSchema = z.enum([
  'push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical',
  'squat', 'hinge', 'lunge', 'carry', 'core', 'jump', 'throw',
  'isolation-arm', 'isolation-leg', 'cardio', 'rotation', 'generic'
]);

export const customExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  englishName: z.string().optional(),
  pattern: movementPatternSchema,
  category: z.enum(['fuerza', 'potencia', 'hipertrofia', 'aerobico', 'movilidad', 'tecnica']),
  primaryMuscle: z.string(),
  secondaryMuscles: z.array(z.string()),
  equipment: z.array(z.string()),
  technique: z.string(),
  commonErrors: z.string().optional(),
  variations: z.string().optional(),
  suggestedIntensity: z.string().optional(),
  tempo: z.string().optional(),
  warnings: z.array(exerciseWarningSchema),
  notes: z.string().optional(),
  createdAt: z.number()
});
export const customExercisesSchema = z.array(customExerciseSchema);
export const exerciseWarningsMapSchema = z.record(z.string(), z.array(exerciseWarningSchema));

/* v15: correcciones del coach sobre ejercicios NSCA (clave = id del ejercicio) */
export const exerciseOverrideSchema = z.object({
  name: z.string().optional(),
  englishName: z.string().optional(),
  pattern: movementPatternSchema.optional(),
  primaryMuscle: z.string().optional(),
  muscleGroups: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  category: z.string().optional(),
  technique: z.string().optional(),
  notes: z.string().optional()
});
export const exerciseOverridesMapSchema = z.record(z.string(), exerciseOverrideSchema);

/* v14: ilustraciones anatómicas con licencia (CC) etiquetadas por músculo */
export const imageLicenseSchema = z.enum([
  'CC0', 'CC BY 4.0', 'CC BY-SA 4.0', 'CC BY-NC 4.0', 'CC BY-NC-SA 4.0',
  'Public Domain', 'Other'
]);

export const anatomyImageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dataUrl: z.string().min(1),
  muscleGroups: z.array(z.string()),
  author: z.string().min(1),
  license: imageLicenseSchema,
  sourceUrl: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number()
});
export const anatomyImagesSchema = z.array(anatomyImageSchema);

export const workspaceSchema = z.object({
  clients: clientsSchema,
  activeClientId: z.string().min(1),
  routines: routinesSchema,
  scheduledRoutines: scheduledSchema,
  metricSamples: metricSamplesSchema.default([]),
  templates: templatesSchema.default([]),
  payments: paymentsSchema.default([]),
  services: servicesSchema.default([]),
  loyaltyCampaigns: loyaltyCampaignsSchema.default([]),
  messageTemplates: messageTemplatesSchema.default([]),
  sessionNotes: sessionNotesSchema.default([]),
  communicationLogs: communicationLogsSchema.default([]),
  globalReminders: globalRemindersSchema.default([]),
  /* v12 */
  customExercises: customExercisesSchema.default([]),
  exerciseWarnings: exerciseWarningsMapSchema.default({}),
  exerciseOverrides: exerciseOverridesMapSchema.default({}),
  /* v13 */
  userImages: z.array(z.object({
    id: z.string().min(1),
    name: z.string(),
    dataUrl: z.string(),
    category: z.string().optional(),
    createdAt: z.number()
  })).default([]),
  /* v14 */
  anatomyImages: anatomyImagesSchema.default([])
});

export const backupSchema = z.object({
  app: z.literal('MankindFactory Routine Workspace'),
  version: z.number().int(),
  timestamp: z.number(),
  data: workspaceSchema
});

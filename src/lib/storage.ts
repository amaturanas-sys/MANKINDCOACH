/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ClientProfile,
  CommunicationLog,
  CustomExercise,
  ExerciseWarning,
  GlobalReminder,
  LoyaltyCampaign,
  MessageTemplate,
  MetricSample,
  MicrocycleTemplate,
  PaymentRecord,
  ScheduledRoutine,
  ServiceCatalogItem,
  SessionNote,
  UserImage,
  WorkoutRoutine
} from '../types';
import {
  DEFAULT_CLIENT_ID,
  INITIAL_CALENDAR,
  INITIAL_LOYALTY_CAMPAIGNS,
  INITIAL_MESSAGE_TEMPLATES,
  INITIAL_PROFILE,
  INITIAL_ROUTINES,
  INITIAL_SERVICES,
  SCHEMA_VERSION,
  STORAGE_KEYS,
  parseLeadingNumber
} from '../constants';
import {
  backupSchema,
  workspaceSchema,
  scheduledSchema,
  clientsSchema,
  routinesSchema,
  profileSchema,
  metricSamplesSchema,
  templatesSchema,
  paymentsSchema,
  servicesSchema,
  loyaltyCampaignsSchema,
  messageTemplatesSchema
} from './schemas';

interface Workspace {
  clients: ClientProfile[];
  activeClientId: string;
  routines: WorkoutRoutine[];
  scheduledRoutines: ScheduledRoutine[];
  metricSamples: MetricSample[];
  templates: MicrocycleTemplate[];
  payments: PaymentRecord[];
  services: ServiceCatalogItem[];
  loyaltyCampaigns: LoyaltyCampaign[];
  messageTemplates: MessageTemplate[];
  sessionNotes: SessionNote[];
  communicationLogs: CommunicationLog[];
  globalReminders: GlobalReminder[];
  customExercises: CustomExercise[];
  exerciseWarnings: Record<string, ExerciseWarning[]>;
  userImages: UserImage[];
}

const FIRST_RUN_PRESCHEDULE = (): ScheduledRoutine[] => ([
  { id: 'presched-1', clientId: DEFAULT_CLIENT_ID, routineId: 'r-fuerza-1', year: INITIAL_CALENDAR.year, monthIndex: INITIAL_CALENDAR.monthIndex, dayOfMonth: 4 },
  { id: 'presched-2', clientId: DEFAULT_CLIENT_ID, routineId: 'r-potencia-1', year: INITIAL_CALENDAR.year, monthIndex: INITIAL_CALENDAR.monthIndex, dayOfMonth: 6 },
  { id: 'presched-3', clientId: DEFAULT_CLIENT_ID, routineId: 'r-hipertrofia-1', year: INITIAL_CALENDAR.year, monthIndex: INITIAL_CALENDAR.monthIndex, dayOfMonth: 8 },
  { id: 'presched-4', clientId: DEFAULT_CLIENT_ID, routineId: 'r-aerobico-1', year: INITIAL_CALENDAR.year, monthIndex: INITIAL_CALENDAR.monthIndex, dayOfMonth: 9 }
]);

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

/**
 * Migración progresiva:
 * - v6 y anteriores: `performanceMetrics` con strings y `specificGoals` único
 *   → v7 separa en `metrics` (números), `clinical` y `goals`.
 * - v7 → v8: añade bloque `practice` opcional (precios, controles, fidelización).
 * - v8 → v9: añade `payments`, `services`, `loyaltyCampaigns` a nivel workspace.
 *   Se inicializan con catálogo y campañas de ejemplo si están vacíos.
 */
function adaptProfileToV8(raw: any): ClientProfile | null {
  if (!raw || typeof raw !== 'object') return null;

  if (raw.metrics && raw.clinical && raw.goals) {
    const candidate = {
      ...raw,
      practice: raw.practice ?? {}
    };
    const parsed = profileSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  }

  const id = typeof raw.id === 'string' && raw.id ? raw.id : DEFAULT_CLIENT_ID;
  const pm = raw.performanceMetrics ?? {};
  const metrics = {
    weightKg: parseLeadingNumber(pm.weightKg) ?? undefined,
    heightCm: parseLeadingNumber(pm.heightCm) ?? undefined,
    age: parseLeadingNumber(pm.age) ?? undefined,
    sex: undefined,
    activityLevel: undefined,
    fatPercentage: parseLeadingNumber(pm.fatPercentage) ?? undefined,
    benchPress1RM: parseLeadingNumber(pm.benchPress1RM) ?? undefined,
    squat1RM: parseLeadingNumber(pm.squat1RM) ?? undefined,
    deadlift1RM: parseLeadingNumber(pm.deadlift1RM) ?? undefined,
    pullUpMaxReps: parseLeadingNumber(pm.pullUpMaxReps) ?? undefined,
    run400mSeconds: parseLeadingNumber(pm.run400mSeconds) ?? undefined,
    vo2Max: parseLeadingNumber(pm.vo2Max) ?? undefined,
    otherMetrics: typeof pm.otherMetrics === 'string' ? pm.otherMetrics : ''
  };

  const candidate: ClientProfile = {
    id,
    name: typeof raw.name === 'string' ? raw.name : 'Atleta',
    focus: typeof raw.focus === 'string' ? raw.focus : '',
    experienceLevel: ['principiante', 'intermedio', 'avanzado', 'elite'].includes(raw.experienceLevel)
      ? raw.experienceLevel
      : 'intermedio',
    equipment: Array.isArray(raw.equipment) ? raw.equipment.filter((e: unknown) => typeof e === 'string') : [],
    suggestedMovements: typeof raw.suggestedMovements === 'string' ? raw.suggestedMovements : '',
    suggestedLoads: typeof raw.suggestedLoads === 'string' ? raw.suggestedLoads : '',
    metrics,
    clinical: {
      morbidities: '', medications: '', allergies: '', surgeries: '', injuries: '', notes: ''
    },
    goals: {
      performance: typeof raw.specificGoals === 'string' ? raw.specificGoals : '',
      aesthetic: '',
      health: ''
    },
    practice: {}
  };

  const parsed = profileSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** Alias retrocompatible. */
const adaptProfileToV7 = adaptProfileToV8;

function adaptScheduledLegacy(raw: unknown, defaultClientId: string): ScheduledRoutine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry: any, idx) => {
      if (!entry || typeof entry !== 'object') return null;
      const dayOfMonth = typeof entry.dayOfMonth === 'number'
        ? entry.dayOfMonth
        : typeof entry.dayIndex === 'number' ? entry.dayIndex : null;
      if (dayOfMonth === null || !entry.routineId) return null;
      return {
        id: typeof entry.id === 'string' ? entry.id : `migrated-${Date.now()}-${idx}`,
        clientId: typeof entry.clientId === 'string' ? entry.clientId : defaultClientId,
        routineId: String(entry.routineId),
        year: typeof entry.year === 'number' ? entry.year : INITIAL_CALENDAR.year,
        monthIndex: typeof entry.monthIndex === 'number' ? entry.monthIndex : INITIAL_CALENDAR.monthIndex,
        dayOfMonth
      } satisfies ScheduledRoutine;
    })
    .filter((s): s is ScheduledRoutine => s !== null);
}

function writeSchemaVersion() {
  try { localStorage.setItem(STORAGE_KEYS.schemaVersion, JSON.stringify(SCHEMA_VERSION)); } catch {}
}

function freshWorkspace(): Workspace {
  return {
    clients: [{ ...INITIAL_PROFILE }],
    activeClientId: DEFAULT_CLIENT_ID,
    routines: [...INITIAL_ROUTINES],
    scheduledRoutines: FIRST_RUN_PRESCHEDULE(),
    metricSamples: [],
    templates: [],
    payments: [],
    services: [...INITIAL_SERVICES],
    loyaltyCampaigns: [...INITIAL_LOYALTY_CAMPAIGNS],
    messageTemplates: [...INITIAL_MESSAGE_TEMPLATES],
    sessionNotes: [],
    communicationLogs: [],
    globalReminders: [],
    customExercises: [],
    exerciseWarnings: {},
    userImages: []
  };
}

export function migrateAndLoad(): Workspace {
  if (typeof window === 'undefined') {
    return freshWorkspace();
  }

  // 1) Workspace unificado.
  const wsRaw = safeRead<unknown>(STORAGE_KEYS.workspace);
  if (wsRaw) {
    const r = wsRaw as Record<string, unknown>;
    if (Array.isArray(r.clients)) {
      r.clients = r.clients
        .map(c => adaptProfileToV7(c))
        .filter((c): c is ClientProfile => c !== null);
    }
    if (!r.metricSamples) r.metricSamples = [];
    if (!r.templates) r.templates = [];
    /* v8 → v9: garantizar arrays económicos. */
    if (!r.payments) r.payments = [];
    if (!r.services) r.services = [];
    if (!r.loyaltyCampaigns) r.loyaltyCampaigns = [];
    /* v9 → v10: plantillas de mensajes. */
    if (!r.messageTemplates) r.messageTemplates = [];
    /* v10 → v11: timeline, log comunicaciones, recordatorios globales. */
    if (!r.sessionNotes) r.sessionNotes = [];
    if (!r.communicationLogs) r.communicationLogs = [];
    if (!r.globalReminders) r.globalReminders = [];
    /* v11 → v12: biblioteca custom + warnings sobre NSCA. */
    if (!r.customExercises) r.customExercises = [];
    if (!r.exerciseWarnings) r.exerciseWarnings = {};
    /* v12 → v13: banco de imágenes propias. */
    if (!r.userImages) r.userImages = [];
    const wsParsed = workspaceSchema.safeParse(r);
    if (wsParsed.success) {
      const data = wsParsed.data;
      /* Si tras migración no hay servicios/campañas/plantillas, sembrar ejemplos (sin pisar datos del usuario). */
      if (data.services.length === 0 && data.loyaltyCampaigns.length === 0) {
        data.services = [...INITIAL_SERVICES];
        data.loyaltyCampaigns = [...INITIAL_LOYALTY_CAMPAIGNS];
      }
      if (data.messageTemplates.length === 0) {
        data.messageTemplates = [...INITIAL_MESSAGE_TEMPLATES];
      }
      writeSchemaVersion();
      return data;
    }
  }

  // 2) Legacy keys
  const legacyProfile = safeRead<unknown>(STORAGE_KEYS.profile);
  const legacyRoutines = safeRead<unknown>(STORAGE_KEYS.routines);
  const legacyScheduled = safeRead<unknown>(STORAGE_KEYS.scheduled);

  const hasAnyLegacy = legacyProfile !== null || legacyRoutines !== null || legacyScheduled !== null;
  if (!hasAnyLegacy) {
    writeSchemaVersion();
    return freshWorkspace();
  }

  const profile = adaptProfileToV7(legacyProfile) ?? { ...INITIAL_PROFILE };
  const routinesParsed = routinesSchema.safeParse(legacyRoutines);
  const routines = routinesParsed.success && routinesParsed.data.length > 0
    ? routinesParsed.data
    : [...INITIAL_ROUTINES];
  const scheduledRoutines = adaptScheduledLegacy(legacyScheduled, profile.id);

  writeSchemaVersion();
  return {
    clients: [profile],
    activeClientId: profile.id,
    routines,
    scheduledRoutines,
    metricSamples: [],
    templates: [],
    payments: [],
    services: [...INITIAL_SERVICES],
    loyaltyCampaigns: [...INITIAL_LOYALTY_CAMPAIGNS],
    messageTemplates: [...INITIAL_MESSAGE_TEMPLATES],
    sessionNotes: [],
    communicationLogs: [],
    globalReminders: [],
    customExercises: [],
    exerciseWarnings: {},
    userImages: []
  };
}

export function persist(state: Workspace): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.workspace, JSON.stringify(state));
    writeSchemaVersion();
    [STORAGE_KEYS.profile, STORAGE_KEYS.routines, STORAGE_KEYS.scheduled].forEach(k => {
      if (localStorage.getItem(k) !== null) localStorage.removeItem(k);
    });
  } catch (err) {
    console.warn('No se pudo persistir en localStorage:', err);
  }
}

export function parseBackup(json: unknown): Workspace {
  const inject = (raw: unknown) => {
    if (!raw || typeof raw !== 'object') return raw;
    const r = raw as Record<string, unknown>;
    const data = (r.data ?? {}) as Record<string, unknown>;
    if (Array.isArray(data.clients)) {
      data.clients = data.clients.map(c => adaptProfileToV7(c)).filter(Boolean);
    }
    if (!data.metricSamples) data.metricSamples = [];
    if (!data.templates) data.templates = [];
    if (!data.payments) data.payments = [];
    if (!data.services) data.services = [];
    if (!data.loyaltyCampaigns) data.loyaltyCampaigns = [];
    if (!data.messageTemplates) data.messageTemplates = [];
    if (!data.sessionNotes) data.sessionNotes = [];
    if (!data.communicationLogs) data.communicationLogs = [];
    if (!data.globalReminders) data.globalReminders = [];
    if (!data.customExercises) data.customExercises = [];
    if (!data.exerciseWarnings) data.exerciseWarnings = {};
    if (!data.userImages) data.userImages = [];
    return { ...r, data };
  };

  const direct = backupSchema.safeParse(inject(json));
  if (direct.success) return direct.data.data;

  const root = (json ?? {}) as Record<string, unknown>;
  const data = (root.data ?? {}) as Record<string, unknown>;
  if (data.profile && !data.clients) {
    const profile = adaptProfileToV7(data.profile) ?? { ...INITIAL_PROFILE };
    const routinesParsed = routinesSchema.safeParse(data.routines);
    const routines = routinesParsed.success ? routinesParsed.data : [...INITIAL_ROUTINES];
    const scheduledRoutines = adaptScheduledLegacy(data.scheduledRoutines, profile.id);
    const adapted: Workspace = {
      clients: [profile],
      activeClientId: profile.id,
      routines,
      scheduledRoutines,
      metricSamples: [],
      templates: [],
      payments: [],
      services: [],
      loyaltyCampaigns: [],
      messageTemplates: [],
      sessionNotes: [],
      communicationLogs: [],
      globalReminders: [],
      customExercises: [],
      exerciseWarnings: {},
      userImages: []
    };
    const final = workspaceSchema.safeParse(adapted);
    if (final.success) return final.data;
  }

  if (Array.isArray(data.clients)) {
    const adaptedClients = data.clients.map(c => adaptProfileToV7(c)).filter((c): c is ClientProfile => c !== null);
    const clientsParsed = clientsSchema.safeParse(adaptedClients);
    if (clientsParsed.success) {
      const fallbackId = clientsParsed.data[0].id;
      const samplesParsed = metricSamplesSchema.safeParse(data.metricSamples ?? []);
      const templatesParsed = templatesSchema.safeParse(data.templates ?? []);
      const paymentsParsed = paymentsSchema.safeParse(data.payments ?? []);
      const servicesParsed = servicesSchema.safeParse(data.services ?? []);
      const loyaltyParsed = loyaltyCampaignsSchema.safeParse(data.loyaltyCampaigns ?? []);
      const templatesMsgParsed = messageTemplatesSchema.safeParse(data.messageTemplates ?? []);
      const adapted: Workspace = {
        clients: clientsParsed.data,
        activeClientId: typeof data.activeClientId === 'string' ? data.activeClientId : fallbackId,
        routines: routinesSchema.safeParse(data.routines).success ? (data.routines as WorkoutRoutine[]) : [...INITIAL_ROUTINES],
        scheduledRoutines: adaptScheduledLegacy(data.scheduledRoutines, fallbackId),
        metricSamples: samplesParsed.success ? samplesParsed.data : [],
        templates: templatesParsed.success ? templatesParsed.data : [],
        payments: paymentsParsed.success ? paymentsParsed.data : [],
        services: servicesParsed.success ? servicesParsed.data : [],
        loyaltyCampaigns: loyaltyParsed.success ? loyaltyParsed.data : [],
        messageTemplates: templatesMsgParsed.success ? templatesMsgParsed.data : [],
        sessionNotes: Array.isArray(data.sessionNotes) ? data.sessionNotes as SessionNote[] : [],
        communicationLogs: Array.isArray(data.communicationLogs) ? data.communicationLogs as CommunicationLog[] : [],
        globalReminders: Array.isArray(data.globalReminders) ? data.globalReminders as GlobalReminder[] : [],
        customExercises: Array.isArray(data.customExercises) ? data.customExercises as CustomExercise[] : [],
        exerciseWarnings: (data.exerciseWarnings && typeof data.exerciseWarnings === 'object')
          ? data.exerciseWarnings as Record<string, ExerciseWarning[]>
          : {},
        userImages: Array.isArray(data.userImages) ? data.userImages as UserImage[] : []
      };
      const final = workspaceSchema.safeParse(adapted);
      if (final.success) return final.data;
    }
  }

  throw new Error('El archivo de backup no cumple el formato MankindFactory.');
}

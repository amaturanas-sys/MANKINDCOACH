/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Procesa los JSON generados por los formularios de intake / progress
 * y los traduce en updates para el ClientProfile y/o nuevos MetricSample.
 */

import { ClientProfile, MetricSample, PatientMetrics, Sex, ActivityLevel } from '../types';
import { EQUIPMENT_OPTIONS } from '../constants';

export interface IntakeApplyResult {
  patchedProfile: ClientProfile;
  newSample?: MetricSample;
}

const numberOrUndef = (v: unknown): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const stringOrUndef = (v: unknown): string | undefined => {
  if (typeof v !== 'string' || v.length === 0) return undefined;
  return v;
};

/**
 * Combina notas clínicas: si el paciente reportó detalles de equipamiento,
 * los anexa al final con un prefijo claro. Mantiene la nota previa del coach.
 */
function combineNotes(previous?: string, fromForm?: string, equipmentExtras?: string): string {
  const parts: string[] = [];
  if (fromForm && fromForm.trim()) parts.push(fromForm.trim());
  else if (previous && previous.trim()) parts.push(previous.trim());
  if (equipmentExtras && equipmentExtras.trim()) {
    parts.push(`Detalles de equipamiento (reportados por el paciente): ${equipmentExtras.trim()}`);
  }
  return parts.join('\n\n');
}

/** Normaliza un handle de Instagram quitando @, URL y espacios. */
function cleanHandle(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const h = v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/+$/, '').trim();
  return h.length ? h : undefined;
}

/** Convierte 'YYYY-MM-DD' en { month, day } (1-based) sin depender de zona horaria. */
function parseBirthday(v: unknown): { month: number; day: number } | undefined {
  if (typeof v !== 'string') return undefined;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return { month, day };
}

function isSex(v: unknown): v is Sex {
  return v === 'masculino' || v === 'femenino' || v === 'otro';
}

function isActivity(v: unknown): v is ActivityLevel {
  return v === 'sedentario' || v === 'ligero' || v === 'moderado' || v === 'intenso' || v === 'muy_intenso';
}

/**
 * Aplica un JSON de intake al perfil. Sobrescribe campos provistos,
 * preserva los demás. Genera además un MetricSample con los valores
 * de la fecha actual para tener registro temporal.
 */
export function applyIntake(json: any, current: ClientProfile): IntakeApplyResult {
  if (!json || typeof json !== 'object' || json.formType !== 'intake') {
    throw new Error('El archivo no es un intake válido (formType esperado: "intake").');
  }

  const newMetrics: PatientMetrics = {
    ...current.metrics,
    weightKg: numberOrUndef(json.weightKg) ?? current.metrics.weightKg,
    heightCm: numberOrUndef(json.heightCm) ?? current.metrics.heightCm,
    age: numberOrUndef(json.age) ?? current.metrics.age,
    sex: isSex(json.sex) ? json.sex : current.metrics.sex,
    activityLevel: isActivity(json.activityLevel) ? json.activityLevel : current.metrics.activityLevel,
    fatPercentage: numberOrUndef(json.fatPercentage) ?? current.metrics.fatPercentage,
    benchPress1RM: numberOrUndef(json.benchPress1RM) ?? current.metrics.benchPress1RM,
    squat1RM: numberOrUndef(json.squat1RM) ?? current.metrics.squat1RM,
    deadlift1RM: numberOrUndef(json.deadlift1RM) ?? current.metrics.deadlift1RM,
    pullUpMaxReps: numberOrUndef(json.pullUpMaxReps) ?? current.metrics.pullUpMaxReps,
    run400mSeconds: numberOrUndef(json.run400mSeconds) ?? current.metrics.run400mSeconds,
    vo2Max: numberOrUndef(json.vo2Max) ?? current.metrics.vo2Max
  };

  /**
   * Equipamiento:
   * - Formato nuevo (v5.2+): `equipment` es array de strings con ítems del catálogo.
   *   Validamos contra EQUIPMENT_OPTIONS para evitar valores corruptos.
   * - Formato viejo (texto libre): se preserva como nota.
   * - `equipmentNotes` (opcional, nuevo): texto libre con detalles que el paciente quiera agregar.
   */
  let newEquipment = current.equipment;
  let equipmentNoteFromIntake = '';
  if (Array.isArray(json.equipment)) {
    const validSet = new Set(EQUIPMENT_OPTIONS);
    const filtered = json.equipment
      .filter((e: unknown): e is string => typeof e === 'string' && validSet.has(e));
    // Dedup conservando orden de EQUIPMENT_OPTIONS
    newEquipment = EQUIPMENT_OPTIONS.filter(opt => filtered.includes(opt));
    if (typeof json.equipmentNotes === 'string' && json.equipmentNotes.trim().length > 0) {
      equipmentNoteFromIntake = json.equipmentNotes.trim();
    }
  } else if (typeof json.equipment === 'string' && json.equipment.trim().length > 0) {
    // Compatibilidad con formularios viejos que enviaban texto libre.
    equipmentNoteFromIntake = json.equipment.trim();
  }

  /* Datos de contacto / administrativos → bloque practice (evita transcripción manual). */
  const prevPractice = current.practice ?? {};
  const phone = stringOrUndef(json.phone);
  const birthday = parseBirthday(json.birthday);
  const newPractice = {
    ...prevPractice,
    phone: phone ?? prevPractice.phone,
    email: stringOrUndef(json.email) ?? prevPractice.email,
    instagram: cleanHandle(json.instagram) ?? prevPractice.instagram,
    address: stringOrUndef(json.address) ?? prevPractice.address,
    emergencyContact: stringOrUndef(json.emergencyContact) ?? prevPractice.emergencyContact,
    birthday: birthday ?? prevPractice.birthday,
    /* Si el paciente dio teléfono y no había método de contacto, asumimos WhatsApp. */
    contactMethod: prevPractice.contactMethod ?? (phone ? 'whatsapp' : prevPractice.contactMethod)
  };

  /* Ocupación/deporte: alimenta el foco si está vacío (no pisa lo que el coach escribió). */
  const occupation = stringOrUndef(json.occupation);
  const newFocus = current.focus && current.focus.trim()
    ? current.focus
    : (occupation ? `Ocupación / deporte: ${occupation}` : current.focus);

  const patchedProfile: ClientProfile = {
    ...current,
    name: stringOrUndef(json.name) ?? current.name,
    focus: newFocus,
    equipment: newEquipment,
    metrics: newMetrics,
    practice: newPractice,
    clinical: {
      ...current.clinical,
      morbidities: stringOrUndef(json.morbidities) ?? current.clinical.morbidities,
      medications: stringOrUndef(json.medications) ?? current.clinical.medications,
      allergies: stringOrUndef(json.allergies) ?? current.clinical.allergies,
      surgeries: stringOrUndef(json.surgeries) ?? current.clinical.surgeries,
      injuries: stringOrUndef(json.injuries) ?? current.clinical.injuries,
      notes: combineNotes(current.clinical.notes, stringOrUndef(json.clinicalNotes), equipmentNoteFromIntake)
    },
    goals: {
      ...current.goals,
      performance: stringOrUndef(json.performanceGoal) ?? current.goals.performance,
      aesthetic: stringOrUndef(json.aestheticGoal) ?? current.goals.aesthetic,
      health: stringOrUndef(json.healthGoal) ?? current.goals.health
    }
  };

  // Sample de baseline
  const sample: MetricSample = {
    id: `sample-intake-${Date.now()}`,
    clientId: current.id,
    takenAt: Date.now(),
    weightKg: newMetrics.weightKg,
    fatPercentage: newMetrics.fatPercentage,
    benchPress1RM: newMetrics.benchPress1RM,
    squat1RM: newMetrics.squat1RM,
    deadlift1RM: newMetrics.deadlift1RM,
    pullUpMaxReps: newMetrics.pullUpMaxReps,
    run400mSeconds: newMetrics.run400mSeconds,
    vo2Max: newMetrics.vo2Max,
    notes: 'Importado del intake inicial'
  };

  return { patchedProfile, newSample: sample };
}

/** Procesa un reporte de avance: solo genera un MetricSample. */
export function applyProgress(json: any, clientId: string): MetricSample {
  if (!json || typeof json !== 'object' || json.formType !== 'progress') {
    throw new Error('El archivo no es un reporte de avance (formType esperado: "progress").');
  }
  const isoDate = typeof json.takenAt === 'string' ? json.takenAt : null;
  const taken = isoDate ? new Date(isoDate).getTime() : Date.now();
  const noteParts: string[] = [];
  if (json.sessionsThisWeek) noteParts.push(`${json.sessionsThisWeek} sesiones esta semana`);
  if (json.avgRpe) noteParts.push(`RPE promedio ${json.avgRpe}`);
  if (json.sleepHours) noteParts.push(`Sueño ${json.sleepHours}h`);
  if (json.stressLevel) noteParts.push(`Estrés ${json.stressLevel}/10`);
  if (json.notes) noteParts.push(String(json.notes));

  return {
    id: `sample-progress-${taken}`,
    clientId,
    takenAt: taken,
    weightKg: numberOrUndef(json.weightKg),
    fatPercentage: numberOrUndef(json.fatPercentage),
    benchPress1RM: numberOrUndef(json.benchPress1RM),
    squat1RM: numberOrUndef(json.squat1RM),
    deadlift1RM: numberOrUndef(json.deadlift1RM),
    pullUpMaxReps: numberOrUndef(json.pullUpMaxReps),
    run400mSeconds: numberOrUndef(json.run400mSeconds),
    vo2Max: numberOrUndef(json.vo2Max),
    notes: noteParts.join(' · ') || undefined
  };
}

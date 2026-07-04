/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vinculación fuerte token → paciente (tabla patient_links).
 *
 * El primer paciente que reclama un token de invitación queda vinculado de
 * forma atómica (clave primaria en la BD) e inmutable. Los envíos de
 * formularios exigen ese vínculo (RLS), el dossier se entrega solo a la
 * cuenta vinculada, y el coach puede ver y revocar los vínculos.
 * Requiere supabase/patient-links.sql.
 */
import { supabase } from './supabase';

export interface PatientLink {
  coach_id: string;
  patient_token: string;
  patient_id: string;
  patient_email: string | null;
  patient_name: string | null;
  created_at: string;
}

export type EnrollmentStatus = 'enrolled' | 'conflict';

/**
 * LADO PACIENTE — reclama el token del enlace de invitación para la cuenta
 * autenticada. Idempotente: si ya lo reclamó esta cuenta, devuelve 'enrolled';
 * si otro lo reclamó primero (violación de unicidad), devuelve 'conflict'.
 */
export async function ensureEnrollment(
  coachId: string,
  patientToken: string,
  name: string | null,
  email: string | null
): Promise<EnrollmentStatus> {
  if (!supabase) throw new Error('Portal no disponible.');
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

  /* Por RLS el paciente solo ve SUS vínculos: si aparece, es suyo. */
  const { data: mine } = await supabase
    .from('patient_links')
    .select('patient_id')
    .eq('coach_id', coachId)
    .eq('patient_token', patientToken)
    .maybeSingle();
  if (mine) return 'enrolled';

  const { error } = await supabase.from('patient_links').insert({
    coach_id: coachId,
    patient_token: patientToken,
    patient_id: uid,
    patient_email: email,
    patient_name: name
  });
  if (!error) return 'enrolled';
  /* 23505 = unique_violation: otro usuario reclamó este token primero. */
  if ((error as { code?: string }).code === '23505') return 'conflict';
  throw error;
}

/** LADO COACH — todos los vínculos de mis tokens (para verificar identidad). */
export async function listPatientLinks(coachId: string): Promise<PatientLink[]> {
  if (!supabase || !coachId) return [];
  const { data, error } = await supabase
    .from('patient_links')
    .select('*')
    .eq('coach_id', coachId);
  if (error) throw error;
  return (data ?? []) as PatientLink[];
}

/**
 * LADO COACH — revoca el vínculo de un token (p.ej. el paciente perdió su
 * cuenta, o una cuenta ajena lo reclamó). El siguiente en abrir el enlace
 * podrá reclamarlo de nuevo.
 */
export async function revokePatientLink(coachId: string, patientToken: string): Promise<void> {
  if (!supabase) throw new Error('Backend no configurado.');
  const { error } = await supabase
    .from('patient_links')
    .delete()
    .eq('coach_id', coachId)
    .eq('patient_token', patientToken);
  if (error) throw error;
}

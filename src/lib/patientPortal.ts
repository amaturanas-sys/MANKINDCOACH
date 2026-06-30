/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lógica del portal de pacientes: registro/login y envío de los JSON de
 * ingreso (intake) y seguimiento (progress) hacia el coach correspondiente.
 */
import { supabase } from './supabase';

export type SubmissionKind = 'intake' | 'progress';

export interface PatientSubmission {
  id: string;
  coach_id: string;
  patient_id: string;
  patient_email: string | null;
  patient_name: string | null;
  kind: SubmissionKind;
  data: unknown;
  status: 'pending' | 'imported' | 'archived';
  created_at: string;
}

/** La plataforma exige contraseña de exactamente 9 dígitos (0-9). */
export function isValidPatientPassword(pw: string): boolean {
  return /^\d{9}$/.test(pw);
}

export async function patientSignUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }> {
  if (!supabase) throw new Error('Portal no disponible (backend no configurado).');
  if (!isValidPatientPassword(password)) {
    throw new Error('La contraseña debe ser de 9 dígitos numéricos (0-9).');
  }
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim(), role: 'patient' } }
  });
  if (error) throw error;
  /* Si la confirmación por email está activa, no hay sesión hasta confirmar. */
  return { needsConfirmation: !data.session };
}

export async function patientSignIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Portal no disponible (backend no configurado).');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Detecta el tipo de formulario a partir del JSON subido. */
export function detectKind(json: any): SubmissionKind | null {
  if (json && typeof json === 'object') {
    if (json.formType === 'intake') return 'intake';
    if (json.formType === 'progress') return 'progress';
  }
  return null;
}

/** Inserta un envío del paciente dirigido a su coach. */
export async function submitToCoach(params: {
  coachId: string;
  patientToken: string | null;
  kind: SubmissionKind;
  data: unknown;
  patientEmail: string | null;
  patientName: string | null;
}): Promise<void> {
  if (!supabase) throw new Error('Portal no disponible.');
  const { data: userData } = await supabase.auth.getUser();
  const patientId = userData.user?.id;
  if (!patientId) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

  const { error } = await supabase.from('patient_submissions').insert({
    coach_id: params.coachId,
    patient_id: patientId,
    patient_token: params.patientToken,
    patient_email: params.patientEmail,
    patient_name: params.patientName,
    kind: params.kind,
    data: params.data,
    status: 'pending'
  });
  if (error) throw error;
}

/**
 * ¿El paciente ya envió su ficha de ingreso PARA ESTE COACH?
 * Se filtra por coach (y por el token de su ficha, si lo hay) para que un mismo
 * paciente que use enlaces de coaches distintos vea el formulario de ingreso de
 * cada coach por separado.
 */
export async function hasSubmittedIntake(coachId: string, patientToken: string | null): Promise<boolean> {
  if (!supabase || !coachId) return false;
  let q = supabase
    .from('patient_submissions')
    .select('id')
    .eq('kind', 'intake')
    .eq('coach_id', coachId);
  if (patientToken) q = q.eq('patient_token', patientToken);
  const { data } = await q.limit(1);
  return (data?.length ?? 0) > 0;
}

/** Lista los envíos del propio paciente (más recientes primero). */
export async function listMySubmissions(): Promise<PatientSubmission[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('patient_submissions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PatientSubmission[];
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Lado COACH: rescata los envíos que los pacientes suben a su portal
 * (patient_submissions) para incorporarlos a la plataforma. La ficha de
 * evolución jala de aquí los reportes de avance; el coach no sube nada a mano.
 */
import { supabase } from './supabase';
import type { PatientSubmission } from './patientPortal';

/**
 * Envíos de avance (kind='progress') dirigidos a este coach y ligados a un
 * paciente (patient_token), aún no importados. Requiere sesión de coach.
 */
export async function fetchPendingProgress(coachId: string, patientToken: string): Promise<PatientSubmission[]> {
  if (!supabase || !coachId || !patientToken) return [];
  const { data, error } = await supabase
    .from('patient_submissions')
    .select('*')
    .eq('coach_id', coachId)
    .eq('patient_token', patientToken)
    .eq('kind', 'progress')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PatientSubmission[];
}

/** Marca envíos como importados para no volver a traerlos. */
export async function markSubmissionsImported(ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return;
  const { error } = await supabase
    .from('patient_submissions')
    .update({ status: 'imported' })
    .in('id', ids);
  if (error) throw error;
}

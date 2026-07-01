/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dossiers exportados que se ponen a disposición del paciente en su portal.
 * - Coach: sube el documento (HTML/PDF) dirigido a un paciente.
 * - Paciente: lista y descarga; al descargar, el archivo se elimina del
 *   servidor (Storage + fila) para ahorrar espacio.
 *
 * Ruta en Storage: {coach_id}/{patient_id}/{archivo}. Requiere el bucket
 * 'dossiers' y las políticas de supabase/patient-dossiers.sql.
 */
import { supabase } from './supabase';

const BUCKET = 'dossiers';

export type UploadResult = 'uploaded' | 'no-patient' | 'no-backend';

/**
 * Sube el dossier al portal del paciente. Busca el patient_id del paciente
 * (por sus envíos con este patient_token) para dirigírselo. Devuelve
 * 'no-patient' si el paciente aún no creó su cuenta en el portal.
 */
export async function uploadDossierToPortal(params: {
  coachId: string;
  patientToken: string;
  filename: string;
  format: 'html' | 'pdf';
  blob: Blob;
}): Promise<UploadResult> {
  if (!supabase || !params.coachId) return 'no-backend';

  const { data: subs } = await supabase
    .from('patient_submissions')
    .select('patient_id')
    .eq('coach_id', params.coachId)
    .eq('patient_token', params.patientToken)
    .limit(1);
  const patientId = subs?.[0]?.patient_id as string | undefined;
  if (!patientId) return 'no-patient';

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${params.coachId}/${patientId}/${stamp}_${params.filename}`;
  const contentType = params.format === 'pdf' ? 'application/pdf' : 'text/html';

  const up = await supabase.storage.from(BUCKET).upload(path, params.blob, { contentType, upsert: false });
  if (up.error) throw up.error;

  const ins = await supabase.from('patient_dossiers').insert({
    coach_id: params.coachId,
    patient_id: patientId,
    patient_token: params.patientToken,
    name: params.filename,
    format: params.format,
    storage_path: path
  });
  if (ins.error) throw ins.error;
  return 'uploaded';
}

export interface DossierRow {
  id: string;
  name: string;
  format: 'html' | 'pdf';
  storage_path: string;
  created_at: string;
}

/** Lista los dossiers disponibles para el paciente autenticado. */
export async function listMyDossiers(): Promise<DossierRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('patient_dossiers')
    .select('id,name,format,storage_path,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DossierRow[];
}

/**
 * Descarga el dossier y lo consume: dispara la descarga en el navegador y luego
 * elimina el archivo del Storage y su fila (ahorro de espacio).
 */
export async function downloadAndConsumeDossier(row: DossierRow): Promise<void> {
  if (!supabase) throw new Error('Portal no disponible.');
  const { data, error } = await supabase.storage.from(BUCKET).download(row.storage_path);
  if (error || !data) throw error ?? new Error('No se pudo descargar el archivo.');

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = row.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  /* Consumir: borra del servidor tras entregar la descarga. */
  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  await supabase.from('patient_dossiers').delete().eq('id', row.id);
}

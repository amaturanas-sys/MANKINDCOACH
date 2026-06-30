/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Enlace de invitación determinístico al portal del paciente.
 *
 * Forma: `<origin>/?portal=paciente&c=<coachId>&p=<clientId>&n=<nombre>`
 *  - c: id del coach (su user id en Supabase) → destinatario de los envíos.
 *  - p: id del paciente en el workspace del coach (patient_token) → liga los
 *       envíos a su ficha.
 *  - n: nombre con el que el coach lo registró, para prellenar el formulario.
 *
 * El enlace es estable: con el mismo coach + paciente siempre genera la misma
 * URL, por lo que puede reconstruirse en cualquier pantalla sin almacenarlo.
 */

export function buildPatientInviteLink(coachId: string, clientId: string, name: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({
    portal: 'paciente',
    c: coachId,
    p: clientId,
    n: name
  });
  return `${origin}/?${params.toString()}`;
}

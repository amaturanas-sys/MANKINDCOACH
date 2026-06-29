/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { applyIntake, applyProgress } from './intakeImporter';
import { INITIAL_PROFILE, EQUIPMENT_OPTIONS } from '../constants';
import type { ClientProfile } from '../types';

const makeProfile = (overrides: Partial<ClientProfile> = {}): ClientProfile => ({
  ...INITIAL_PROFILE,
  id: 'client-test',
  equipment: [],
  clinical: { notes: 'Nota previa del coach' },
  ...overrides
});

describe('applyIntake — equipamiento estructurado (formato nuevo)', () => {
  it('aplica el array de equipamiento marcado por el paciente al perfil', () => {
    const profile = makeProfile();
    const intake = {
      formType: 'intake',
      name: 'Juan Pérez',
      equipment: ['Mancuernas Libres (Dumbbells)', 'Banca Plana', 'Barra Olímpica'],
      equipmentNotes: 'Mancuernas hasta 30kg, banca regulable'
    };
    const { patchedProfile } = applyIntake(intake, profile);
    expect(patchedProfile.equipment).toEqual([
      'Barra Olímpica',
      'Mancuernas Libres (Dumbbells)',
      'Banca Plana'
    ]);
    // Las notas extras del paciente van a clinical.notes con prefijo identificable
    expect(patchedProfile.clinical.notes).toContain('Mancuernas hasta 30kg');
    expect(patchedProfile.clinical.notes).toContain('Detalles de equipamiento (reportados por el paciente)');
  });

  it('filtra entradas que no estén en el catálogo oficial', () => {
    const profile = makeProfile();
    const intake = {
      formType: 'intake',
      equipment: ['Barra Olímpica', 'XYZ-Inexistente', 'Mancuernas Libres (Dumbbells)']
    };
    const { patchedProfile } = applyIntake(intake, profile);
    expect(patchedProfile.equipment).toEqual([
      'Barra Olímpica',
      'Mancuernas Libres (Dumbbells)'
    ]);
  });

  it('respeta el orden canónico de EQUIPMENT_OPTIONS sin importar el orden de envío', () => {
    const profile = makeProfile();
    const intake = {
      formType: 'intake',
      // El paciente envía en orden alfabético — debe re-ordenarse al canónico
      equipment: ['Mancuernas Libres (Dumbbells)', 'Barra Olímpica']
    };
    const { patchedProfile } = applyIntake(intake, profile);
    // Verifica que estén en el orden de EQUIPMENT_OPTIONS
    const idxBarra = EQUIPMENT_OPTIONS.indexOf('Barra Olímpica');
    const idxMancuernas = EQUIPMENT_OPTIONS.indexOf('Mancuernas Libres (Dumbbells)');
    if (idxBarra < idxMancuernas) {
      expect(patchedProfile.equipment[0]).toBe('Barra Olímpica');
    } else {
      expect(patchedProfile.equipment[0]).toBe('Mancuernas Libres (Dumbbells)');
    }
  });

  it('no sobreescribe notas previas — las combina', () => {
    const profile = makeProfile({ clinical: { notes: 'Lesión rodilla 2023' } });
    const intake = {
      formType: 'intake',
      clinicalNotes: 'Nueva info clínica',
      equipment: ['Barra Olímpica'],
      equipmentNotes: 'Discos 1.25, 2.5, 5, 10, 20 kg'
    };
    const { patchedProfile } = applyIntake(intake, profile);
    expect(patchedProfile.clinical.notes).toContain('Nueva info clínica');
    expect(patchedProfile.clinical.notes).toContain('Discos 1.25, 2.5, 5, 10, 20 kg');
  });

  it('mapea datos de contacto/administrativos al bloque practice', () => {
    const profile = makeProfile({ focus: '' });
    const intake = {
      formType: 'intake',
      phone: '+56 9 1234 5678',
      email: 'paciente@correo.com',
      instagram: '@mi_usuario',
      address: 'Santiago',
      emergencyContact: 'María · hermana · +56 9 8765 4321',
      birthday: '1992-07-15',
      occupation: 'Triatleta amateur'
    };
    const { patchedProfile } = applyIntake(intake, profile);
    expect(patchedProfile.practice?.phone).toBe('+56 9 1234 5678');
    expect(patchedProfile.practice?.email).toBe('paciente@correo.com');
    // El handle se normaliza (sin @)
    expect(patchedProfile.practice?.instagram).toBe('mi_usuario');
    expect(patchedProfile.practice?.address).toBe('Santiago');
    expect(patchedProfile.practice?.emergencyContact).toContain('María');
    expect(patchedProfile.practice?.birthday).toEqual({ month: 7, day: 15 });
    // Con teléfono y sin método previo, asume whatsapp
    expect(patchedProfile.practice?.contactMethod).toBe('whatsapp');
    // Ocupación alimenta el foco si estaba vacío
    expect(patchedProfile.focus).toContain('Triatleta amateur');
  });

  it('no pisa el foco existente del coach con la ocupación', () => {
    const profile = makeProfile({ focus: 'Fuerza máxima e hipertrofia' });
    const { patchedProfile } = applyIntake(
      { formType: 'intake', occupation: 'Oficinista' },
      profile
    );
    expect(patchedProfile.focus).toBe('Fuerza máxima e hipertrofia');
  });

  it('genera un MetricSample baseline con la fecha del momento de import', () => {
    const profile = makeProfile();
    const intake = {
      formType: 'intake',
      equipment: ['Peso Corporal (Calistenia)'],
      benchPress1RM: '100',
      weightKg: '80'
    };
    const { newSample } = applyIntake(intake, profile);
    expect(newSample).toBeDefined();
    expect(newSample?.benchPress1RM).toBe(100);
    expect(newSample?.weightKg).toBe(80);
    expect(newSample?.clientId).toBe('client-test');
  });
});

describe('applyIntake — backward compatibility con texto libre', () => {
  it('si equipment llega como string (formato viejo), lo guarda en notas sin sobrescribir el catálogo', () => {
    const profile = makeProfile({ equipment: ['Barra Olímpica'] });
    const intake = {
      formType: 'intake',
      equipment: 'Mancuernas hasta 20kg, banda elástica'
    };
    const { patchedProfile } = applyIntake(intake, profile);
    // El catálogo previo se preserva
    expect(patchedProfile.equipment).toEqual(['Barra Olímpica']);
    // El texto libre va a notas con etiqueta clara
    expect(patchedProfile.clinical.notes).toContain('Mancuernas hasta 20kg');
  });
});

describe('applyProgress', () => {
  it('genera sample con valores numéricos del reporte', () => {
    const sample = applyProgress({
      formType: 'progress',
      takenAt: '2026-05-11',
      weightKg: '79.5',
      benchPress1RM: '105'
    }, 'client-1');
    expect(sample.weightKg).toBe(79.5);
    expect(sample.benchPress1RM).toBe(105);
    expect(sample.clientId).toBe('client-1');
  });

  it('compone notas con adherencia y feedback', () => {
    const sample = applyProgress({
      formType: 'progress',
      sessionsThisWeek: 4,
      avgRpe: 8,
      sleepHours: 7.5,
      stressLevel: 6,
      notes: 'Dolor leve en hombro derecho al press'
    }, 'client-1');
    expect(sample.notes).toContain('4 sesiones');
    expect(sample.notes).toContain('RPE promedio 8');
    expect(sample.notes).toContain('Sueño 7.5h');
    expect(sample.notes).toContain('Estrés 6/10');
    expect(sample.notes).toContain('Dolor leve');
  });

  it('rechaza JSON sin formType correcto', () => {
    expect(() => applyProgress({ formType: 'otra-cosa' }, 'client-1')).toThrow();
  });
});

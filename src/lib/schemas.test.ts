/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { backupSchema, profileSchema, scheduledSchema, workspaceSchema } from './schemas';

describe('profileSchema', () => {
  const validV7 = {
    id: 'client-1',
    name: 'Test',
    focus: 'foco',
    experienceLevel: 'intermedio',
    equipment: [],
    suggestedMovements: '',
    suggestedLoads: '',
    metrics: {},
    clinical: {},
    goals: {}
  };

  it('acepta un perfil válido v7', () => {
    expect(profileSchema.safeParse(validV7).success).toBe(true);
  });

  it('rechaza un perfil sin id', () => {
    const { id: _id, ...rest } = validV7;
    expect(profileSchema.safeParse(rest).success).toBe(false);
  });

  it('rechaza experienceLevel inválido', () => {
    expect(profileSchema.safeParse({ ...validV7, experienceLevel: 'super-saiyan' }).success).toBe(false);
  });
});

describe('scheduledSchema', () => {
  it('acepta entradas válidas', () => {
    const result = scheduledSchema.safeParse([
      { id: 's1', clientId: 'c1', routineId: 'r1', year: 2026, monthIndex: 4, dayOfMonth: 10 }
    ]);
    expect(result.success).toBe(true);
  });

  it('rechaza dayOfMonth fuera de rango', () => {
    const result = scheduledSchema.safeParse([
      { id: 's1', clientId: 'c1', routineId: 'r1', year: 2026, monthIndex: 4, dayOfMonth: 32 }
    ]);
    expect(result.success).toBe(false);
  });

  it('rechaza monthIndex fuera de rango', () => {
    const result = scheduledSchema.safeParse([
      { id: 's1', clientId: 'c1', routineId: 'r1', year: 2026, monthIndex: 12, dayOfMonth: 1 }
    ]);
    expect(result.success).toBe(false);
  });

  it('rechaza scheduled sin clientId', () => {
    const result = scheduledSchema.safeParse([
      { id: 's1', routineId: 'r1', year: 2026, monthIndex: 4, dayOfMonth: 10 }
    ]);
    expect(result.success).toBe(false);
  });

  it('preserva la franja slot (am/pm) sin descartarla', () => {
    const result = scheduledSchema.safeParse([
      { id: 's1', clientId: 'c1', routineId: 'r1', year: 2026, monthIndex: 4, dayOfMonth: 10, slot: 'pm' }
    ]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0].slot).toBe('pm');
  });

  it('rechaza un slot inválido', () => {
    const result = scheduledSchema.safeParse([
      { id: 's1', clientId: 'c1', routineId: 'r1', year: 2026, monthIndex: 4, dayOfMonth: 10, slot: 'noche' }
    ]);
    expect(result.success).toBe(false);
  });
});

describe('workspaceSchema', () => {
  it('valida un workspace mínimo', () => {
    const ws = {
      clients: [{
        id: 'c1', name: 'A', focus: '', experienceLevel: 'principiante',
        equipment: [], suggestedMovements: '', suggestedLoads: '',
        metrics: {}, clinical: {}, goals: {}
      }],
      activeClientId: 'c1',
      routines: [],
      scheduledRoutines: []
    };
    expect(workspaceSchema.safeParse(ws).success).toBe(true);
  });

  it('rechaza workspace sin clientes', () => {
    const ws = {
      clients: [],
      activeClientId: 'c1',
      routines: [],
      scheduledRoutines: []
    };
    expect(workspaceSchema.safeParse(ws).success).toBe(false);
  });
});

describe('backupSchema', () => {
  it('rechaza backups con app incorrecto', () => {
    const result = backupSchema.safeParse({
      app: 'OtraApp',
      version: 4,
      timestamp: 1,
      data: { clients: [], activeClientId: 'x', routines: [], scheduledRoutines: [] }
    });
    expect(result.success).toBe(false);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateAndLoad, parseBackup, persist } from './storage';
import { DEFAULT_CLIENT_ID, INITIAL_CALENDAR, SCHEMA_VERSION, STORAGE_KEYS } from '../constants';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  setItem(key: string, value: string): void { this.store.set(key, value); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
  key(i: number): string | null { return Array.from(this.store.keys())[i] ?? null; }
  get length(): number { return this.store.size; }
}

beforeEach(() => {
  const memory = new MemoryStorage();
  (globalThis as any).window = { localStorage: memory };
  (globalThis as any).localStorage = memory;
});

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).localStorage;
});

describe('migrateAndLoad — primer arranque', () => {
  it('devuelve un workspace inicial con el cliente default', () => {
    const ws = migrateAndLoad();
    expect(ws.clients).toHaveLength(1);
    expect(ws.clients[0].id).toBe(DEFAULT_CLIENT_ID);
    expect(ws.activeClientId).toBe(DEFAULT_CLIENT_ID);
    expect(ws.routines.length).toBeGreaterThan(0);
    expect(ws.scheduledRoutines.length).toBeGreaterThan(0);
  });

  it('escribe la versión del schema', () => {
    migrateAndLoad();
    const stored = localStorage.getItem(STORAGE_KEYS.schemaVersion);
    expect(stored).toBe(JSON.stringify(SCHEMA_VERSION));
  });
});

describe('migrateAndLoad — desde formato v1 (dayIndex)', () => {
  it('migra dayIndex → dayOfMonth y agrega clientId default', () => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify({
      name: 'Antiguo', focus: '', experienceLevel: 'intermedio',
      equipment: [], suggestedMovements: '', suggestedLoads: '',
      performanceMetrics: {}, specificGoals: ''
    }));
    localStorage.setItem(STORAGE_KEYS.scheduled, JSON.stringify([
      { id: 's1', routineId: 'r-fuerza-1', dayIndex: 4 }
    ]));

    const ws = migrateAndLoad();
    expect(ws.scheduledRoutines).toHaveLength(1);
    expect(ws.scheduledRoutines[0].dayOfMonth).toBe(4);
    expect(ws.scheduledRoutines[0].year).toBe(INITIAL_CALENDAR.year);
    expect(ws.scheduledRoutines[0].monthIndex).toBe(INITIAL_CALENDAR.monthIndex);
    expect(ws.scheduledRoutines[0].clientId).toBe(DEFAULT_CLIENT_ID);
    expect(ws.clients[0].name).toBe('Antiguo');
  });
});

describe('persist y migrate — round trip', () => {
  it('guarda y vuelve a cargar el mismo workspace', () => {
    const original = migrateAndLoad();
    persist({
      clients: original.clients,
      activeClientId: original.activeClientId,
      routines: original.routines,
      scheduledRoutines: original.scheduledRoutines,
      metricSamples: original.metricSamples,
      templates: original.templates,
      payments: original.payments,
      services: original.services,
      loyaltyCampaigns: original.loyaltyCampaigns,
      messageTemplates: original.messageTemplates,
      sessionNotes: original.sessionNotes,
      communicationLogs: original.communicationLogs,
      globalReminders: original.globalReminders,
      customExercises: original.customExercises,
      exerciseWarnings: original.exerciseWarnings,
      exerciseOverrides: original.exerciseOverrides,
      userImages: original.userImages,
      anatomyImages: original.anatomyImages
    });
    const reloaded = migrateAndLoad();
    expect(reloaded.activeClientId).toBe(original.activeClientId);
    expect(reloaded.routines.length).toBe(original.routines.length);
    expect(reloaded.scheduledRoutines.length).toBe(original.scheduledRoutines.length);
    expect(reloaded.metricSamples).toEqual(original.metricSamples);
  });

  it('limpia las keys legacy tras persistir', () => {
    localStorage.setItem(STORAGE_KEYS.profile, '{}');
    localStorage.setItem(STORAGE_KEYS.routines, '[]');
    localStorage.setItem(STORAGE_KEYS.scheduled, '[]');
    const ws = migrateAndLoad();
    persist(ws);
    expect(localStorage.getItem(STORAGE_KEYS.profile)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.routines)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.scheduled)).toBeNull();
  });
});

describe('parseBackup — formatos antiguos', () => {
  it('acepta backup v3 con `profile` único y lo convierte a clients[]', () => {
    const v3backup = {
      app: 'MankindFactory Routine Workspace',
      version: 3,
      timestamp: 1,
      data: {
        profile: {
          id: 'old', name: 'Antiguo', focus: '', experienceLevel: 'avanzado',
          equipment: [], suggestedMovements: '', suggestedLoads: '',
          performanceMetrics: {}, specificGoals: ''
        },
        routines: [],
        scheduledRoutines: [
          { id: 's1', routineId: 'r1', dayOfMonth: 5 }
        ]
      }
    };
    const ws = parseBackup(v3backup);
    expect(ws.clients).toHaveLength(1);
    expect(ws.clients[0].id).toBe('old');
    expect(ws.activeClientId).toBe('old');
    expect(ws.scheduledRoutines[0].clientId).toBe('old');
    expect(ws.scheduledRoutines[0].year).toBe(INITIAL_CALENDAR.year);
  });

  it('rechaza backups completamente inválidos', () => {
    expect(() => parseBackup({ foo: 'bar' })).toThrow();
  });
});

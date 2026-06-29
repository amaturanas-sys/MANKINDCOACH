/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearEvents, eventsToCsv, getEvents, isEnabled, setEnabled, summarize, track } from './telemetry';

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

describe('telemetry — opt-in', () => {
  it('está deshabilitada por defecto', () => {
    expect(isEnabled()).toBe(false);
  });

  it('no graba eventos cuando está deshabilitada', () => {
    track('test_event');
    expect(getEvents()).toEqual([]);
  });

  it('graba eventos cuando está habilitada', () => {
    setEnabled(true);
    track('foo', { a: 1 });
    track('bar');
    const events = getEvents();
    // El primer evento es 'telemetry_enabled' (auto), luego foo y bar.
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(events.find(e => e.name === 'foo')?.props).toEqual({ a: 1 });
  });

  it('apagar telemetría limpia eventos', () => {
    setEnabled(true);
    track('foo');
    expect(getEvents().length).toBeGreaterThan(0);
    setEnabled(false);
    expect(getEvents()).toEqual([]);
  });
});

describe('telemetry — capacidad y export', () => {
  it('caps a 200 eventos drop oldest', () => {
    setEnabled(true);
    for (let i = 0; i < 250; i++) {
      track('e', { i });
    }
    const events = getEvents();
    expect(events.length).toBe(200);
    expect(events[0].props?.i).toBeGreaterThanOrEqual(50);
  });

  it('exportCsv genera header + filas', () => {
    setEnabled(true);
    track('alpha', { ok: true });
    const csv = eventsToCsv(getEvents());
    expect(csv.split('\n')[0]).toBe('timestamp_iso,name,props_json');
    expect(csv).toContain('alpha');
  });

  it('summarize devuelve totals y rango temporal', () => {
    setEnabled(true);
    clearEvents();
    track('a');
    track('a');
    track('b');
    const sum = summarize(getEvents());
    expect(sum.total).toBe(3);
    expect(sum.top[0]).toEqual(['a', 2]);
    expect(sum.top[1]).toEqual(['b', 1]);
    expect(sum.oldest).not.toBeNull();
    expect(sum.newest).not.toBeNull();
  });
});

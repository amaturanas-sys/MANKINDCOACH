/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Telemetría local privacy-friendly.
 * - Sin terceros: todo vive en localStorage del navegador del usuario.
 * - Opt-in: por defecto deshabilitada hasta que el usuario la active.
 * - Cap a 200 eventos (drop circular del más antiguo).
 * - El usuario puede inspeccionar, exportar a CSV o limpiar todo.
 */

const STORAGE_KEY_EVENTS = 'mankind_telemetry_events';
const STORAGE_KEY_ENABLED = 'mankind_telemetry_enabled';
const MAX_EVENTS = 200;

export interface TelemetryEvent {
  name: string;
  timestamp: number;
  props?: Record<string, string | number | boolean | null>;
}

function safeRead<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // cuota llena
  }
}

export function isEnabled(): boolean {
  return safeRead<boolean>(STORAGE_KEY_ENABLED) === true;
}

export function setEnabled(value: boolean): void {
  safeWrite(STORAGE_KEY_ENABLED, value);
  if (!value) {
    // Apagar limpia los eventos para reforzar la promesa de privacidad.
    clearEvents();
  } else {
    track('telemetry_enabled');
  }
}

export function track(name: string, props?: TelemetryEvent['props']): void {
  if (!isEnabled()) return;
  const list = safeRead<TelemetryEvent[]>(STORAGE_KEY_EVENTS) ?? [];
  list.push({ name, timestamp: Date.now(), props });
  if (list.length > MAX_EVENTS) {
    list.splice(0, list.length - MAX_EVENTS);
  }
  safeWrite(STORAGE_KEY_EVENTS, list);
}

export function getEvents(): TelemetryEvent[] {
  return safeRead<TelemetryEvent[]>(STORAGE_KEY_EVENTS) ?? [];
}

export function clearEvents(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_EVENTS);
  } catch {
    // ignore
  }
}

export function eventsToCsv(events: TelemetryEvent[]): string {
  const header = 'timestamp_iso,name,props_json';
  const rows = events.map(e => {
    const iso = new Date(e.timestamp).toISOString();
    const props = e.props ? JSON.stringify(e.props).replace(/"/g, '""') : '';
    const safeName = e.name.replace(/[\r\n,]/g, ' ');
    return `${iso},${safeName},"${props}"`;
  });
  return [header, ...rows].join('\n');
}

/** Resumen: top de eventos por nombre y rango temporal. */
export function summarize(events: TelemetryEvent[]) {
  const counts = new Map<string, number>();
  let oldest: number | null = null;
  let newest: number | null = null;
  for (const e of events) {
    counts.set(e.name, (counts.get(e.name) ?? 0) + 1);
    if (oldest === null || e.timestamp < oldest) oldest = e.timestamp;
    if (newest === null || e.timestamp > newest) newest = e.timestamp;
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return { total: events.length, top, oldest, newest };
}

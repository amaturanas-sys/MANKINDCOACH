/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Helpers PWA reales:
 * - capturePromptDeferred(): intercepta el evento beforeinstallprompt para que
 *   más tarde podamos invocarlo y mostrar el diálogo nativo del navegador.
 * - getPwaState(): estado actual (standalone? SW? instalada?).
 * - getStorageEstimate(): cuota y uso del navegador (no solo localStorage).
 */

/* Tipo del evento beforeinstallprompt (no está en lib.dom estándar) */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerInstalled = false;

/** Llamar UNA VEZ al iniciar la app (en main.tsx o App). Captura el evento global. */
export function installPwaListeners(): void {
  if (listenerInstalled) return;
  if (typeof window === 'undefined') return;
  listenerInstalled = true;
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    /* Prevenir el mini-banner automático para mostrarlo cuando el user lo pida. */
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    /* Notifica al resto vía evento custom */
    window.dispatchEvent(new CustomEvent('mankind-pwa-installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('mankind-pwa-installed'));
  });
}

/** Dispara el diálogo nativo de instalación. Devuelve si el usuario aceptó. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

export function isInstallable(): boolean {
  return deferredPrompt !== null;
}

/** ¿La app está abierta como PWA standalone? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  /* iOS Safari */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const iosStandalone = (navigator as any).standalone === true;
  const mediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const minimalUi = window.matchMedia?.('(display-mode: minimal-ui)').matches ?? false;
  return iosStandalone || mediaStandalone || minimalUi;
}

/** Detecta el navegador para mostrar instrucciones específicas si no hay prompt. */
export function detectBrowser(): 'chrome' | 'edge' | 'safari' | 'firefox' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('firefox')) return 'firefox';
  return 'other';
}

/** Estado del Service Worker registrado. */
export async function getServiceWorkerState(): Promise<{
  registered: boolean;
  active: boolean;
  scope?: string;
}> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { registered: false, active: false };
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return { registered: false, active: false };
    return {
      registered: true,
      active: !!reg.active,
      scope: reg.scope
    };
  } catch {
    return { registered: false, active: false };
  }
}

/** Pide al SW comprobar actualizaciones. */
export async function checkForUpdates(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    await reg.update();
    return true;
  } catch {
    return false;
  }
}

/** Cuota real del navegador (Quota Management). Devuelve bytes. */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  usagePct: number;
} | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  try {
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    const usagePct = quota > 0 ? (usage / quota) * 100 : 0;
    return { usage, quota, usagePct };
  } catch {
    return null;
  }
}

/** Pide al navegador que el almacenamiento sea "persistente" (no se borre por presión de disco). */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** ¿El storage ya es persistente? */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------------- *
 * Tracking de último backup (localStorage)
 * ----------------------------------------------------------------------- */

const LAST_BACKUP_KEY = 'mankind_last_backup_at';

export function markBackupDone(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export function getLastBackupAt(): number | null {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Formato humano: "hace 3 días", "hoy", "nunca" */
export function lastBackupLabel(): string {
  const ts = getLastBackupAt();
  if (ts === null) return 'nunca';
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

/** Útil para mostrar bytes legibles. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

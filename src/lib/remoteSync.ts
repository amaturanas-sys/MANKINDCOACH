/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sincronización del workspace del coach con la nube (Supabase).
 *
 * Estrategia (offline-first, un coach): localStorage es el almacén de trabajo
 * inmediato; la nube guarda el workspace completo (JSON) por usuario. Al iniciar
 * sesión se reconcilia (la nube manda si existe; si no, se sube lo local) y, a
 * partir de ahí, cada cambio se empuja con debounce. Last-write-wins sobre el
 * workspace completo: simple y robusto para un único coach.
 */
import { useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { parseBackup } from './storage';
import { SCHEMA_VERSION } from '../constants';
import { useAuthState } from './auth';
import type { BackupPayload } from '../types';

const TABLE = 'coach_workspaces';
export type WorkspaceData = BackupPayload['data'];

/** Carga el workspace remoto del usuario (validado/migrado), o null si no hay. */
export async function loadRemoteWorkspace(userId: string): Promise<WorkspaceData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const raw = data?.data;
  if (!raw || typeof raw !== 'object') return null;
  /* Reutiliza la validación/migración del backup envolviendo el data. */
  const ws = parseBackup({
    app: 'MankindFactory Routine Workspace',
    version: SCHEMA_VERSION,
    timestamp: Date.now(),
    data: raw
  });
  return ws as unknown as WorkspaceData;
}

/** Sube (upsert) el workspace completo del usuario. */
export async function pushRemoteWorkspace(userId: string, workspace: WorkspaceData): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert({ user_id: userId, data: workspace }, { onConflict: 'user_id' });
  if (error) throw error;
}

/**
 * Hook de sincronización. No hace nada si no hay backend/sesión (modo local).
 * @param workspace  objeto memoizado con el estado completo del workspace.
 * @param applyRemote callback que aplica un workspace remoto al estado local.
 */
export function useCloudSync(
  workspace: WorkspaceData,
  applyRemote: (ws: WorkspaceData) => void
): void {
  const { configured, session, user } = useAuthState();

  const lastSyncedRef = useRef<string | null>(null);
  const reconciledForUser = useRef<string | null>(null);
  const readyRef = useRef(false);
  const applyRef = useRef(applyRemote);
  applyRef.current = applyRemote;
  const wsRef = useRef(workspace);
  wsRef.current = workspace;

  /* Reconciliación inicial al iniciar sesión (una vez por usuario). */
  useEffect(() => {
    if (!configured || !session || !user) { readyRef.current = false; return; }
    if (reconciledForUser.current === user.id) return;
    reconciledForUser.current = user.id;
    readyRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const remote = await loadRemoteWorkspace(user.id);
        if (cancelled) return;
        if (remote) {
          applyRef.current(remote);
          lastSyncedRef.current = JSON.stringify(remote);
        } else {
          await pushRemoteWorkspace(user.id, wsRef.current);
          lastSyncedRef.current = JSON.stringify(wsRef.current);
        }
      } catch (e) {
        console.warn('Sincronización inicial falló (se sigue en local):', e);
      } finally {
        if (!cancelled) readyRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, [configured, session, user]);

  /* Empuje con debounce ante cada cambio del workspace. */
  useEffect(() => {
    if (!configured || !session || !user || !readyRef.current) return;
    const serialized = JSON.stringify(workspace);
    if (serialized === lastSyncedRef.current) return;
    const t = setTimeout(() => {
      pushRemoteWorkspace(user.id, workspace)
        .then(() => { lastSyncedRef.current = serialized; })
        .catch(e => console.warn('No se pudo sincronizar con la nube:', e));
    }, 1200);
    return () => clearTimeout(t);
  }, [workspace, configured, session, user]);
}

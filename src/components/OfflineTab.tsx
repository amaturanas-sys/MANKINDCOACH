/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sección "Datos & Respaldos" (antes "Offline & Backups").
 *
 * Cambios vs. versión anterior:
 * - ❌ Eliminados los launchers .bat/.sh/HTML que no funcionaban en la práctica.
 * - ✅ Botón de instalar PWA REAL via beforeinstallprompt + fallback con
 *      instrucciones específicas por navegador.
 * - ✅ Storage quota REAL del navegador (navigator.storage.estimate), no solo
 *      el tamaño de localStorage.
 * - ✅ Tracking de último backup + alerta si pasó >7 días sin respaldar.
 * - ✅ Almacenamiento persistente (navigator.storage.persist).
 * - ✅ Estado real del Service Worker + botón para chequear actualizaciones.
 * - ✅ Exports parciales: solo catálogo / solo plantillas / solo pacientes
 *      sin datos comerciales (para compartir entre coaches sin filtrar info).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Wifi, WifiOff,
  Download, Upload, Trash2, HardDrive, FileText, CheckCircle, Database,
  Shield, Monitor, AlertTriangle, BarChart3, RefreshCw, Smartphone,
  Lock, Tag, MessageSquare, Users, Package, Clock, Cloud, LogOut, Copy, Check
} from 'lucide-react';
import {
  ClientProfile, MetricSample, MicrocycleTemplate, ScheduledRoutine, WorkoutRoutine,
  BackupPayload, LoyaltyCampaign, MessageTemplate, PaymentRecord, ServiceCatalogItem,
  SessionNote, CommunicationLog, GlobalReminder,
  CustomExercise, ExerciseWarning, UserImage, AnatomyImage
} from '../types';
import { SCHEMA_VERSION } from '../constants';
import { parseBackup } from '../lib/storage';
import { buildPatientInviteLink } from '../lib/invite';
import { useAuthState, signOut } from '../lib/auth';
import { clearEvents, eventsToCsv, getEvents, isEnabled as telemetryEnabled, setEnabled as setTelemetryEnabled, summarize, track } from '../lib/telemetry';
import {
  promptInstall, isInstallable, isStandalone, detectBrowser,
  getServiceWorkerState, checkForUpdates,
  getStorageEstimate, requestPersistentStorage, isStoragePersisted,
  markBackupDone, getLastBackupAt, lastBackupLabel, formatBytes
} from '../lib/pwa';

interface OfflineTabProps {
  clients: ClientProfile[];
  activeClientId: string;
  routines: WorkoutRoutine[];
  scheduledRoutines: ScheduledRoutine[];
  metricSamples: MetricSample[];
  templates: MicrocycleTemplate[];
  /* v9-v11 — opcionales para retrocompat */
  payments?: PaymentRecord[];
  services?: ServiceCatalogItem[];
  loyaltyCampaigns?: LoyaltyCampaign[];
  messageTemplates?: MessageTemplate[];
  sessionNotes?: SessionNote[];
  communicationLogs?: CommunicationLog[];
  globalReminders?: GlobalReminder[];
  /* v12-v14 — opcionales para retrocompat */
  customExercises?: CustomExercise[];
  exerciseWarnings?: Record<string, ExerciseWarning[]>;
  userImages?: UserImage[];
  anatomyImages?: AnatomyImage[];
  /** Restaura el workspace completo desde un backup ya validado. */
  onImportBackup: (data: BackupPayload['data']) => void;
  onClearDatabase: () => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BACKUP_REMINDER_DAYS = 7;

export default function OfflineTab(props: OfflineTabProps) {
  const {
    clients, activeClientId, routines, scheduledRoutines, metricSamples, templates,
    payments = [], services = [], loyaltyCampaigns = [], messageTemplates = [],
    sessionNotes = [], communicationLogs = [], globalReminders = [],
    customExercises = [], exerciseWarnings = {}, userImages = [], anatomyImages = [],
    onImportBackup, onClearDatabase
  } = props;
  const profile = clients.find(c => c.id === activeClientId) ?? clients[0];

  /* --- Estado: red, storage, backup, PWA, SW --- */
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number; usagePct: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lastBackupTs, setLastBackupTs] = useState<number | null>(() => getLastBackupAt());
  const [installable, setInstallable] = useState<boolean>(isInstallable());
  const [standaloneNow, setStandaloneNow] = useState<boolean>(isStandalone());
  const [swState, setSwState] = useState<{ registered: boolean; active: boolean; scope?: string } | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [confirmClear, setConfirmClear] = useState(false);
  const [telemetryOn, setTelemetryOn] = useState(() => telemetryEnabled());
  const [eventsTick, setEventsTick] = useState(0);

  const events = useMemo(() => getEvents(), [eventsTick, telemetryOn]);
  const eventsSummary = useMemo(() => summarize(events), [events]);

  /* Online/offline */
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* Storage estimate + persisted */
  useEffect(() => {
    let cancelled = false;
    Promise.all([getStorageEstimate(), isStoragePersisted()]).then(([est, pers]) => {
      if (cancelled) return;
      setStorageInfo(est);
      setPersisted(pers);
    });
    return () => { cancelled = true; };
  }, [clients, routines, payments, sessionNotes, lastBackupTs]);

  /* SW state */
  useEffect(() => {
    let cancelled = false;
    getServiceWorkerState().then(s => { if (!cancelled) setSwState(s); });
    return () => { cancelled = true; };
  }, []);

  /* Installable events */
  useEffect(() => {
    const onInstallable = () => setInstallable(true);
    const onInstalled = () => { setInstallable(false); setStandaloneNow(true); };
    window.addEventListener('mankind-pwa-installable', onInstallable);
    window.addEventListener('mankind-pwa-installed', onInstalled);
    return () => {
      window.removeEventListener('mankind-pwa-installable', onInstallable);
      window.removeEventListener('mankind-pwa-installed', onInstalled);
    };
  }, []);

  /* ----------------------------------------------------------------------- */
  /* Backup completo                                                          */
  /* ----------------------------------------------------------------------- */

  const downloadBlob = (content: string | Blob, fileName: string, mime = 'application/json') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportBackup = () => {
    track('backup_exported', { clients: clients.length, routines: routines.length });
    const backup: BackupPayload = {
      app: 'MankindFactory Routine Workspace',
      version: SCHEMA_VERSION,
      timestamp: Date.now(),
      data: {
        clients, activeClientId, routines, scheduledRoutines, metricSamples, templates,
        payments, services, loyaltyCampaigns, messageTemplates,
        sessionNotes, communicationLogs, globalReminders,
        customExercises, exerciseWarnings, userImages, anatomyImages
      }
    };
    const stamp = new Date().toISOString().slice(0, 10);
    const safeName = ((profile?.name) || 'workspace').toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadBlob(
      JSON.stringify(backup, null, 2),
      `mankind_backup_${safeName}_${stamp}.json`
    );
    markBackupDone();
    setLastBackupTs(Date.now());
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(String(e.target?.result ?? ''));
        const data = parseBackup(json);
        onImportBackup(data);
        setImportStatus({
          type: 'success',
          message: `Importado: ${data.clients.length} paciente(s), ${data.routines.length} pautas, ${data.metricSamples.length} mediciones, ${data.templates.length} plantillas. Recarga la pestaña para ver todo aplicado.`
        });
        window.setTimeout(() => setImportStatus({ type: null, message: '' }), 8000);
      } catch (err) {
        setImportStatus({ type: 'error', message: err instanceof Error ? err.message : 'Error al parsear el archivo JSON.' });
        window.setTimeout(() => setImportStatus({ type: null, message: '' }), 6000);
      }
    };
    reader.readAsText(file);
  };

  /* ----------------------------------------------------------------------- */
  /* Exports parciales (compartir piezas entre coaches)                      */
  /* ----------------------------------------------------------------------- */

  const exportSlice = (name: string, payload: unknown) => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(
      JSON.stringify({
        app: 'MankindFactory Routine Workspace',
        slice: name,
        version: SCHEMA_VERSION,
        timestamp: Date.now(),
        data: payload
      }, null, 2),
      `mankind_${name}_${stamp}.json`
    );
  };

  const exportTemplates = () => exportSlice('plantillas', messageTemplates);
  const exportCatalog = () => exportSlice('catalogo', services);
  const exportCampaigns = () => exportSlice('campanas', loyaltyCampaigns);
  const exportPatientsAnonymized = () => {
    /* Copia de clientes sin datos comerciales/notas internas: solo perfil clínico. */
    const slim = clients.map(c => ({
      id: c.id,
      name: c.name,
      focus: c.focus,
      experienceLevel: c.experienceLevel,
      equipment: c.equipment,
      suggestedMovements: c.suggestedMovements,
      suggestedLoads: c.suggestedLoads,
      metrics: c.metrics,
      clinical: c.clinical,
      goals: c.goals,
      tags: c.tags
      /* practice, coachNotes, reminders, avatar, communicationLogs → excluidos */
    }));
    exportSlice('pacientes_sin_datos_privados', slim);
  };

  /* ----------------------------------------------------------------------- */
  /* PWA install + SW                                                         */
  /* ----------------------------------------------------------------------- */

  const handleInstallPwa = async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setUpdateMsg('App instalada. Buscala en tus aplicaciones / pantalla de inicio.');
    } else if (outcome === 'dismissed') {
      setUpdateMsg('Instalación cancelada. Podés intentarlo más tarde.');
    } else {
      setUpdateMsg('Tu navegador no expone el botón nativo. Usá las instrucciones manuales abajo.');
    }
    window.setTimeout(() => setUpdateMsg(null), 5000);
  };

  const handleCheckUpdates = async () => {
    setUpdateChecking(true);
    setUpdateMsg(null);
    const ok = await checkForUpdates();
    setUpdateChecking(false);
    if (ok) {
      const fresh = await getServiceWorkerState();
      setSwState(fresh);
      setUpdateMsg('Chequeo completado. Si había una nueva versión, se descargó en background.');
    } else {
      setUpdateMsg('No hay Service Worker activo o no se pudo contactar.');
    }
    window.setTimeout(() => setUpdateMsg(null), 5000);
  };

  const handlePersistRequest = async () => {
    const ok = await requestPersistentStorage();
    setPersisted(ok);
    setUpdateMsg(ok
      ? 'Almacenamiento persistente concedido. El navegador no borrará tus datos por falta de espacio.'
      : 'El navegador rechazó la solicitud (puede requerir instalar la app como PWA primero).'
    );
    window.setTimeout(() => setUpdateMsg(null), 6000);
  };

  /* ----------------------------------------------------------------------- */
  /* Cálculos auxiliares                                                      */
  /* ----------------------------------------------------------------------- */

  const daysSinceBackup = lastBackupTs ? Math.floor((Date.now() - lastBackupTs) / MS_PER_DAY) : null;
  const backupOverdue = lastBackupTs === null || (daysSinceBackup !== null && daysSinceBackup >= BACKUP_REMINDER_DAYS);
  const browser = detectBrowser();

  return (
    <div className="space-y-8">

      {/* SESIÓN / CUENTA (solo con backend configurado) */}
      <AccountCard clients={clients} />

      {/* ALERTA DE BACKUP VENCIDO */}
      {backupOverdue && (
        <div role="alert" className="p-4 bg-[#FFB020]/10 border border-[#FFB020]/40 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-[#FFB020] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[#FFB020] font-bold font-mono text-xs uppercase tracking-wider">
                {lastBackupTs === null ? 'Nunca has hecho un backup' : `Tu último backup fue hace ${daysSinceBackup} días`}
              </p>
              <p className="text-zinc-400 text-[11px] font-mono mt-0.5">
                Si tu navegador limpia el storage o cambias de equipo, pierdes todo. Descarga un respaldo ahora.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2 bg-[#FFB020] hover:bg-[#D97706] text-zinc-950 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition flex items-center gap-2 shrink-0"
          >
            <Download size={12} aria-hidden="true" /> Respaldar ahora
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          icon={isOnline ? <Wifi size={14} className="text-[#10B981]" /> : <WifiOff size={14} className="text-[#FFB020]" />}
          label="Red"
          value={isOnline ? 'Online' : 'Sin conexión'}
          detail={isOnline ? 'Tu app sigue funcionando offline' : 'Todo local · sin pérdida de datos'}
          tone={isOnline ? 'success' : 'warning'}
        />
        <Kpi
          icon={<HardDrive size={14} className="text-[#5D36FF]" />}
          label="Espacio usado"
          value={storageInfo ? formatBytes(storageInfo.usage) : 'Calculando...'}
          detail={storageInfo ? `${storageInfo.usagePct.toFixed(2)}% de ${formatBytes(storageInfo.quota)}` : ''}
        />
        <Kpi
          icon={<Lock size={14} className={persisted ? 'text-[#10B981]' : 'text-zinc-500'} />}
          label="Persistente"
          value={persisted === null ? '...' : persisted ? 'Sí · protegido' : 'No · solicitar'}
          detail={persisted ? 'El navegador no borrará tus datos' : 'Click abajo para proteger'}
          tone={persisted ? 'success' : 'neutral'}
        />
        <Kpi
          icon={<Clock size={14} className={backupOverdue ? 'text-[#FFB020]' : 'text-[#10B981]'} />}
          label="Último backup"
          value={lastBackupLabel()}
          detail={lastBackupTs ? new Date(lastBackupTs).toLocaleDateString('es-ES') : 'Nunca'}
          tone={backupOverdue ? 'warning' : 'success'}
        />
      </div>

      {/* BACKUP COMPLETO — PROTAGONISTA */}
      <div className="bg-surface-card border-2 border-[#5D36FF]/40 rounded-xl p-6 shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#5D36FF] text-white rounded-xl">
              <Database size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-base text-primary-fg uppercase tracking-wider">
                Backup completo de la práctica
              </h2>
              <p className="text-muted-fg font-mono text-[11px] mt-1">
                JSON con TODOS tus datos: pacientes, rutinas, pagos, sesiones, plantillas, campañas, recordatorios.
              </p>
            </div>
          </div>
          <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider shrink-0">
            Schema v{SCHEMA_VERSION}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-3 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
          >
            <Download size={14} aria-hidden="true" /> Exportar todo (.json)
          </button>
          <label className="px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:bg-[#5D36FF]/10 text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition cursor-pointer flex items-center justify-center gap-2">
            <Upload size={14} aria-hidden="true" /> Importar / restaurar
            <input type="file" accept=".json,application/json" onChange={handleImportBackup} className="hidden" />
          </label>
        </div>

        {importStatus.type && (
          <div role={importStatus.type === 'error' ? 'alert' : 'status'} className={`p-3 rounded-lg font-mono text-[11px] border ${
            importStatus.type === 'success' ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {importStatus.message}
          </div>
        )}

        <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 text-[10px] font-mono text-zinc-400 leading-relaxed">
          <strong className="text-zinc-300">¿Qué hacer con el archivo?</strong> Guárdalo en Google Drive / iCloud / Dropbox o envíatelo por correo. Para restaurar en otro equipo (o si se borra el storage del navegador), entra aquí y usa "Importar".
          <br />
          <span className="text-[#FFB020]">⚠ Sin cifrar:</span> contiene datos personales de tus pacientes. No lo subas a sitios públicos.
        </div>
      </div>

      {/* EXPORTS PARCIALES (compartir con otros coaches sin filtrar info privada) */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
          <Package size={18} className="text-[#5D36FF]" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">
              Exports parciales
            </h3>
            <p className="font-mono text-[10px] text-zinc-500 uppercase mt-0.5">
              Compartí piezas específicas (catálogo, plantillas) sin filtrar datos de pacientes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SliceCard
            icon={<MessageSquare size={14} className="text-[#5D36FF]" />}
            title="Plantillas de mensajes"
            count={messageTemplates.length}
            description="Los textos reusables sin datos de pacientes."
            onExport={exportTemplates}
            disabled={messageTemplates.length === 0}
          />
          <SliceCard
            icon={<Tag size={14} className="text-[#5D36FF]" />}
            title="Catálogo de precios"
            count={services.length}
            description="Tu lista de servicios (evaluaciones, controles, packs)."
            onExport={exportCatalog}
            disabled={services.length === 0}
          />
          <SliceCard
            icon={<BarChart3 size={14} className="text-[#5D36FF]" />}
            title="Campañas fidelización"
            count={loyaltyCampaigns.length}
            description="Banco de ideas de retención."
            onExport={exportCampaigns}
            disabled={loyaltyCampaigns.length === 0}
          />
          <SliceCard
            icon={<Users size={14} className="text-[#5D36FF]" />}
            title="Pacientes anonimizados"
            count={clients.length}
            description="Ficha clínica sin datos comerciales ni notas internas."
            onExport={exportPatientsAnonymized}
            disabled={clients.length === 0}
          />
        </div>
      </div>

      {/* PWA + ALMACENAMIENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* PWA */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <Smartphone size={18} className="text-[#5D36FF]" aria-hidden="true" />
            <div>
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">Instalar como app</h3>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                {standaloneNow ? '✓ Ya está instalada como PWA' : 'Usá la app como nativa en escritorio / móvil'}
              </p>
            </div>
          </div>

          {standaloneNow ? (
            <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded p-3 text-[11px] font-mono text-[#10B981]">
              <CheckCircle size={14} className="inline mr-2" aria-hidden="true" />
              Estás usando MankindFactory como aplicación instalada. Persistencia y velocidad máximas.
            </div>
          ) : installable ? (
            <button
              type="button"
              onClick={handleInstallPwa}
              className="w-full px-4 py-3 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded-lg font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
            >
              <Download size={14} aria-hidden="true" /> Instalar MankindFactory
            </button>
          ) : (
            <PwaInstallFallback browser={browser} />
          )}

          {/* SW status */}
          <div className="pt-3 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Service Worker</span>
              {swState?.active && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#10B981]">
                  <CheckCircle size={11} aria-hidden="true" /> Activo
                </span>
              )}
              {swState && !swState.active && swState.registered && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#FFB020]">
                  <AlertTriangle size={11} aria-hidden="true" /> Registrado, instalando
                </span>
              )}
              {swState && !swState.registered && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                  <WifiOff size={11} aria-hidden="true" /> No disponible
                </span>
              )}
            </div>
            {swState && !swState.registered && (
              <p className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                {typeof window !== 'undefined' && window.location.protocol === 'file:'
                  ? 'El archivo portable no necesita Service Worker: ya funciona 100% offline porque todo el código está en el HTML.'
                  : 'El navegador no registró el SW. Verifica que la app se sirva desde https:// o localhost.'}
              </p>
            )}
            {swState?.registered && (
              <button
                type="button"
                onClick={handleCheckUpdates}
                disabled={updateChecking}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:text-white text-zinc-300 rounded font-mono text-[10px] uppercase tracking-wider font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw size={11} className={updateChecking ? 'animate-spin' : ''} aria-hidden="true" />
                {updateChecking ? 'Buscando actualizaciones...' : 'Buscar actualización'}
              </button>
            )}
          </div>
        </div>

        {/* ALMACENAMIENTO */}
        <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <HardDrive size={18} className="text-[#5D36FF]" aria-hidden="true" />
            <div>
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">Almacenamiento</h3>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">Quota real del navegador</p>
            </div>
          </div>

          {storageInfo ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="text-zinc-400">Usado</span>
                  <span className="text-white font-bold">{formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.max(1, storageInfo.usagePct)}%`,
                      backgroundColor: storageInfo.usagePct > 80 ? '#FF3C00' : storageInfo.usagePct > 50 ? '#FFB020' : '#10B981'
                    }}
                  />
                </div>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">
                  {storageInfo.usagePct.toFixed(3)}% del espacio del navegador
                </p>
              </div>

              {persisted === false && (
                <button
                  type="button"
                  onClick={handlePersistRequest}
                  className="w-full px-3 py-2 bg-zinc-900 border border-[#FFB020]/40 hover:bg-[#FFB020]/10 text-[#FFB020] rounded font-mono text-[10px] uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
                >
                  <Lock size={11} aria-hidden="true" /> Solicitar almacenamiento persistente
                </button>
              )}
              {persisted === true && (
                <div className="bg-[#10B981]/10 border border-[#10B981]/30 rounded p-2 text-[10px] font-mono text-[#10B981] flex items-center gap-2">
                  <Lock size={11} aria-hidden="true" />
                  Storage protegido: el navegador no lo borrará por presión de disco.
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] font-mono text-zinc-500">
              Tu navegador no expone la API Storage Estimate. Datos guardados sin información de quota.
            </p>
          )}

          <div className="pt-3 border-t border-zinc-800 grid grid-cols-2 gap-2 text-[10px] font-mono">
            <CountCell label="Pacientes" value={clients.length} />
            <CountCell label="Rutinas" value={routines.length} />
            <CountCell label="Programadas" value={scheduledRoutines.length} />
            <CountCell label="Mediciones" value={metricSamples.length} />
            <CountCell label="Pagos" value={payments.length} />
            <CountCell label="Sesiones" value={sessionNotes.length} />
          </div>
        </div>
      </div>

      {updateMsg && (
        <div role="status" aria-live="polite" className="bg-zinc-900 border border-[#5D36FF]/50 p-3 rounded-lg flex items-center gap-2 font-mono text-[11px] text-[#5D36FF]">
          <Monitor size={12} aria-hidden="true" /> {updateMsg}
        </div>
      )}

      {/* TELEMETRÍA (compacta) */}
      <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <BarChart3 size={18} className="text-[#5D36FF]" aria-hidden="true" />
            <div>
              <h3 className="font-sans font-bold text-sm text-white uppercase tracking-wider">Telemetría local</h3>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                Tracking 100% privado. Eventos en tu navegador (máx 200). Útil para auto-diagnóstico.
              </p>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={telemetryOn}
              onChange={e => { setTelemetryEnabled(e.target.checked); setTelemetryOn(e.target.checked); setEventsTick(t => t + 1); }}
              className="sr-only peer"
            />
            <span className="w-9 h-5 bg-zinc-800 peer-checked:bg-[#5D36FF] rounded-full relative transition" aria-hidden="true">
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${telemetryOn ? 'translate-x-4' : ''}`} />
            </span>
            <span className="font-mono text-[10px] uppercase font-bold text-zinc-300">{telemetryOn ? 'On' : 'Off'}</span>
          </label>
        </div>

        {telemetryOn ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
              <CountCell label="Eventos" value={eventsSummary.total} />
              <CountCell label="Tipos únicos" value={eventsSummary.top.length} />
              <CountCell label="Último" value={eventsSummary.newest ? new Date(eventsSummary.newest).toLocaleDateString('es-ES') : '—'} />
            </div>
            {eventsSummary.top.length > 0 && (
              <div className="space-y-1">
                {eventsSummary.top.slice(0, 5).map(([name, count]) => {
                  const max = eventsSummary.top[0][1];
                  const widthPct = Math.max(8, (count / max) * 100);
                  return (
                    <div key={name} className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-zinc-300 w-28 truncate">{name}</span>
                      <div className="flex-1 h-1.5 bg-zinc-900 rounded overflow-hidden">
                        <div className="h-full bg-[#5D36FF]" style={{ width: `${widthPct}%` }} />
                      </div>
                      <span className="text-white font-bold w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-zinc-900">
              <button
                onClick={() => { downloadBlob(eventsToCsv(events), 'mankind_telemetry.csv', 'text/csv'); }}
                disabled={events.length === 0}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 disabled:opacity-50 text-zinc-300 hover:text-white rounded font-mono text-[9px] uppercase font-bold transition flex items-center gap-1.5"
              >
                <Download size={11} aria-hidden="true" /> Exportar CSV
              </button>
              <button
                onClick={() => { clearEvents(); setEventsTick(t => t + 1); }}
                disabled={events.length === 0}
                className="px-3 py-1.5 bg-red-950/30 border border-red-800/40 hover:border-red-700 disabled:opacity-50 text-red-300 hover:text-white rounded font-mono text-[9px] uppercase font-bold transition flex items-center gap-1.5"
              >
                <Trash2 size={11} aria-hidden="true" /> Limpiar
              </button>
            </div>
          </div>
        ) : (
          <p className="font-mono text-[10px] text-zinc-500">
            Activa el switch para empezar a registrar eventos (cambios de pestaña, exports, etc).
          </p>
        )}
      </div>

      {/* ZONA DESTRUCTIVA */}
      <div className="p-5 bg-zinc-950/60 border border-red-500/20 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-red-400 shrink-0" aria-hidden="true" />
          <div>
            <span className="text-white font-bold block font-mono text-[10px] uppercase">Zona destructiva</span>
            <span className="text-zinc-500 text-[11px] font-mono">Limpia TODO el localStorage. Haz un backup antes.</span>
          </div>
        </div>
        <button
          onClick={() => setConfirmClear(true)}
          className="px-4 py-2 border border-red-500/40 hover:border-red-500 bg-red-950/10 hover:bg-red-950/40 text-red-400 hover:text-white rounded font-mono text-[10px] uppercase font-bold transition flex items-center gap-2"
        >
          <Trash2 size={12} aria-hidden="true" /> Limpiar workspace
        </button>
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setConfirmClear(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm_title" onClick={(e) => e.stopPropagation()}
               className="bg-[#121214] border border-red-500/40 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-400" size={20} aria-hidden="true" />
              <h2 id="confirm_title" className="font-sans font-bold text-sm uppercase text-white">Confirmar limpieza total</h2>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Esto elimina TODOS los pacientes, pautas, pagos, notas y configuración del workspace. La acción es irreversible.
            </p>
            <p className="text-[#FFB020] text-xs font-mono">
              ¿Hiciste backup? <strong>{lastBackupTs ? lastBackupLabel() : 'Nunca'}</strong>
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setConfirmClear(false)} className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded font-mono text-[10px] uppercase font-bold hover:bg-zinc-800">
                Cancelar
              </button>
              <button onClick={() => { setConfirmClear(false); onClearDatabase(); }} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded font-mono text-[10px] uppercase font-bold">
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Tip: si vas a cambiar de equipo o reinstalar el navegador, exporta un backup primero · Schema v{SCHEMA_VERSION}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * UI helpers
 * ----------------------------------------------------------------------- */

function Kpi({ icon, label, value, detail, tone = 'neutral' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const border = tone === 'success' ? 'border-[#10B981]/30'
    : tone === 'warning' ? 'border-[#FFB020]/30'
    : 'border-zinc-800';
  return (
    <div className={`bg-zinc-950/60 border ${border} rounded-lg p-3 space-y-1`}>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-mono text-zinc-500">
        {icon}<span>{label}</span>
      </div>
      <span className="block text-sm font-bold text-white truncate" title={value}>{value}</span>
      {detail && <span className="block text-[9px] font-mono text-zinc-500 truncate" title={detail}>{detail}</span>}
    </div>
  );
}

function CountCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2 text-center">
      <span className="block text-[8px] uppercase text-zinc-500 tracking-wider">{label}</span>
      <span className="block text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function SliceCard({ icon, title, count, description, onExport, disabled }: {
  icon: React.ReactNode;
  title: string;
  count: number;
  description: string;
  onExport: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4 space-y-3 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">{icon}
          <h4 className="font-mono text-[10px] uppercase tracking-wider font-bold text-white">{title}</h4>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">{count}</span>
      </div>
      <p className="text-[10px] font-mono text-zinc-500 leading-relaxed flex-1">{description}</p>
      <button
        type="button"
        onClick={onExport}
        disabled={disabled}
        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:bg-[#5D36FF]/10 text-zinc-300 hover:text-white rounded font-mono text-[9px] uppercase tracking-wider font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FileText size={10} aria-hidden="true" /> Exportar
      </button>
    </div>
  );
}

function PwaInstallFallback({ browser }: { browser: 'chrome' | 'edge' | 'safari' | 'firefox' | 'other' }) {
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const isFile = protocol === 'file:';

  /* Caso 1: el HTML está abierto directamente desde el disco (file://). No se puede instalar como PWA. */
  if (isFile) {
    return (
      <div className="bg-zinc-950/60 border border-[#FFB020]/30 rounded p-3 space-y-2">
        <p className="text-[11px] font-mono text-[#FFB020] font-bold">
          ⚠ Estás usando el HTML portable (archivo local)
        </p>
        <p className="text-[10px] font-mono text-zinc-300 leading-relaxed">
          La instalación como PWA solo funciona cuando la app se sirve desde una URL <strong className="text-white">https://</strong>.
          El archivo portable es ideal para probar / compartir sin instalación, pero no se puede convertir en app instalable.
          Si quieres la versión PWA, despliega la app en un dominio (Vercel, Netlify, etc.) y vuelve a abrirla desde ahí.
        </p>
      </div>
    );
  }

  /* Caso 2: Safari (no soporta beforeinstallprompt pero sí "Añadir a inicio") */
  if (browser === 'safari') {
    return (
      <div className="bg-zinc-950/60 border border-zinc-800 rounded p-3 space-y-2">
        <p className="text-[11px] font-mono text-zinc-400">
          Safari no expone un botón nativo. Instálala manualmente:
        </p>
        <p className="text-[10px] font-mono text-zinc-300 leading-relaxed">
          <strong className="text-white">iOS:</strong> toca el botón <strong className="text-white">Compartir</strong> (cuadrado con flecha) → <strong className="text-white">"Añadir a pantalla de inicio"</strong>.
          <br />
          <strong className="text-white">Mac:</strong> Archivo → <strong className="text-white">"Añadir al Dock..."</strong>.
        </p>
      </div>
    );
  }

  /* Caso 3: Firefox (no soporta PWA en escritorio) */
  if (browser === 'firefox') {
    return (
      <div className="bg-zinc-950/60 border border-zinc-800 rounded p-3 space-y-2">
        <p className="text-[11px] font-mono text-zinc-400">
          Firefox no soporta instalación PWA en escritorio.
        </p>
        <p className="text-[10px] font-mono text-zinc-300 leading-relaxed">
          En <strong className="text-white">Firefox móvil:</strong> menú → <strong className="text-white">"Instalar"</strong>.
          <br />
          En escritorio, prueba con <strong className="text-white">Chrome</strong> o <strong className="text-white">Edge</strong> para tener app instalable.
        </p>
      </div>
    );
  }

  /* Caso 4: Chrome o Edge sin prompt (puede ser que ya esté instalada o que no se cumplan los criterios PWA aún) */
  if (browser === 'chrome' || browser === 'edge') {
    const menuIcon = browser === 'chrome' ? '⋮' : '···';
    return (
      <div className="bg-zinc-950/60 border border-zinc-800 rounded p-3 space-y-2">
        <p className="text-[11px] font-mono text-zinc-400">
          El botón nativo no apareció aún. Esto puede ser porque la app ya está instalada o porque el navegador todavía no la marcó como instalable.
        </p>
        <p className="text-[10px] font-mono text-zinc-300 leading-relaxed">
          Instalación manual: ve a <strong className="text-white">{menuIcon} (menú)</strong> → busca <strong className="text-white">"Instalar MankindFactory..."</strong> o haz click en el ícono de instalar (+) en la barra de URL.
        </p>
      </div>
    );
  }

  /* Caso 5: otro navegador */
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded p-3">
      <p className="text-[11px] font-mono text-zinc-400">
        Tu navegador no soporta instalación PWA. Para usarla como aplicación, prueba con <strong className="text-white">Chrome</strong>, <strong className="text-white">Edge</strong> o <strong className="text-white">Safari</strong>.
      </p>
    </div>
  );
}

/**
 * Tarjeta de cuenta/sesión: solo aparece cuando hay backend de red configurado
 * y una sesión activa. Muestra el email y permite cerrar sesión. En modo local
 * (sin backend) no renderiza nada.
 */
function AccountCard({ clients }: { clients: ClientProfile[] }) {
  const { configured, session, user } = useAuthState();
  const [busy, setBusy] = useState(false);
  if (!configured || !session) return null;

  const coachId = user?.id ?? '';

  const handleSignOut = async () => {
    setBusy(true);
    try { await signOut(); } finally { setBusy(false); }
  };

  return (
    <div className="bg-[#121214] border border-[#5D36FF]/30 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#5D36FF]/15 border border-[#5D36FF]/30 flex items-center justify-center shrink-0">
            <Cloud size={16} className="text-[#5D36FF]" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#10B981]">Sincronizado en la nube</p>
            <p className="text-white text-sm font-semibold truncate">{user?.email ?? 'Sesión activa'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={busy}
          className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:border-[#FF3C00]/50 text-zinc-300 hover:text-[#FF3C00] rounded-lg font-mono text-[10px] uppercase tracking-wider transition flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          <LogOut size={12} aria-hidden="true" /> Cerrar sesión
        </button>
      </div>

      {/* Enlaces de invitación por paciente */}
      <div className="pt-3 border-t border-zinc-800 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          Enlaces de invitación · uno por paciente
        </p>
        <p className="text-[10px] font-mono text-zinc-600 leading-relaxed">
          Cada paciente abre su enlace, crea su acceso (9 dígitos) y completa su ingreso. La identidad mostrada es el nombre con el que lo registraste; se actualiza si el paciente se nombra distinto al ingresar.
        </p>
        {clients.length === 0 ? (
          <p className="text-[11px] font-mono text-zinc-600 italic py-2">
            Aún no hay pacientes. Crea uno en «Pacientes» para generar su enlace.
          </p>
        ) : (
          <ul className="space-y-1.5 max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
            {clients.map(c => (
              <PatientInviteRow key={c.id} coachId={coachId} clientId={c.id} name={c.name} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PatientInviteRow({ coachId, clientId, name }: { coachId: string; clientId: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const link = buildPatientInviteLink(coachId, clientId, name);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <li className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-white text-xs font-semibold truncate">{name}</p>
        <p className="font-mono text-[9px] text-zinc-500 truncate" title={link}>{link}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="px-2.5 py-1.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-[9px] uppercase tracking-wider font-bold transition flex items-center gap-1.5 shrink-0"
      >
        {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </li>
  );
}

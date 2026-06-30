/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App v5.3 — tres niveles de navegación + gestión económica completa.
 */

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClientProfile,
  CommunicationLog,
  CustomExercise,
  ExerciseWarning,
  GlobalReminder,
  LoyaltyCampaign,
  MessageTemplate,
  MetricSample,
  MicrocycleTemplate,
  MonthRef,
  PaymentRecord,
  ScheduledRoutine,
  ServiceCatalogItem,
  SessionNote,
  UserImage,
  AnatomyImage,
  WorkoutRoutine
} from './types';
import {
  DEFAULT_CLIENT_ID,
  INITIAL_CALENDAR,
  INITIAL_LOYALTY_CAMPAIGNS,
  INITIAL_MESSAGE_TEMPLATES,
  INITIAL_PROFILE,
  INITIAL_ROUTINES,
  INITIAL_SERVICES,
  STORAGE_KEYS
} from './constants';
import { migrateAndLoad, persist } from './lib/storage';
import { useCloudSync } from './lib/remoteSync';
import { track } from './lib/telemetry';
import { motion, AnimatePresence } from 'motion/react';
import ErrorBoundary from './components/ErrorBoundary';
import ClientSwitcher from './components/ClientSwitcher';
import LandingPage from './components/LandingPage';
import AppShell, { ShellSection, PatientSection } from './components/AppShell';
import type { PracticeSubTab } from './components/CoachDashboardTab';
import CommandPalette, { CommandResult } from './components/CommandPalette';
import AboutModal from './components/AboutModal';

const HomeTab = lazy(() => import('./components/HomeTab'));
const PatientsListTab = lazy(() => import('./components/PatientsListTab'));
const CoachDashboardTab = lazy(() => import('./components/CoachDashboardTab'));
const PreambleTab = lazy(() => import('./components/PreambleTab'));
const CalendarTab = lazy(() => import('./components/CalendarTab'));
const ExportTab = lazy(() => import('./components/ExportTab'));
const OfflineTab = lazy(() => import('./components/OfflineTab'));
const EvolutionTab = lazy(() => import('./components/EvolutionTab'));
const ExerciseLibraryTab = lazy(() => import('./components/ExerciseLibraryTab'));

type ViewMode = 'landing' | 'shell' | 'patient';
const SHELL_SECTIONS: ShellSection[] = ['inicio', 'practica', 'pacientes', 'biblioteca', 'offline'];
const PATIENT_SECTIONS: PatientSection[] = ['ficha', 'planificador', 'evolucion', 'exportar'];
const PRACTICE_SUB_TABS: PracticeSubTab[] = ['plantillas', 'calculadoras', 'fidelizacion', 'catalogo', 'comercial'];

const COACH_NAME = 'Alberto Maturana S.';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TabFallback = () => (
  <div className="flex items-center justify-center py-24 font-mono text-xs text-faint-fg uppercase tracking-widest">
    Cargando módulo…
  </div>
);

interface InitialNav {
  view: ViewMode;
  shellSection: ShellSection;
  patientSection: PatientSection;
  practiceSubTab: PracticeSubTab;
  pendingClientId: string | null;
}

function getInitialNav(): InitialNav {
  if (typeof window === 'undefined') {
    return { view: 'landing', shellSection: 'inicio', patientSection: 'ficha', practiceSubTab: 'resumen', pendingClientId: null };
  }
  const params = new URLSearchParams(window.location.search);
  const rawView = params.get('view');
  let view: ViewMode = 'landing';
  if (rawView === 'shell' || rawView === 'patient') view = rawView;
  const rawSection = params.get('section');
  const shellSection = SHELL_SECTIONS.includes(rawSection as ShellSection) ? (rawSection as ShellSection) : 'inicio';
  const rawTab = params.get('tab');
  const patientSection = PATIENT_SECTIONS.includes(rawTab as PatientSection) ? (rawTab as PatientSection) : 'ficha';
  const practiceSubTab = PRACTICE_SUB_TABS.includes(rawTab as PracticeSubTab) ? (rawTab as PracticeSubTab) : 'comercial';
  const pendingClientId = params.get('clientId');
  return { view, shellSection, patientSection, practiceSubTab, pendingClientId };
}

/**
 * App principal — workspace clínico del coach. 100% local (datos en
 * localStorage del navegador, cero backend).
 *
 * La landing pública promocional se construye en un bundle SEPARADO
 * (ver `main-landing.tsx` y `vite.config.landing.ts`). Esa landing se
 * sube a Vercel; este `App` se queda local en el equipo del coach y se
 * abre con `MankindFactory.bat` o el HTML standalone admin-only.
 */
export default function App() {
  return <AuthenticatedApp />;
}

export interface AuthenticatedAppProps {
  /** Reservado para compatibilidad. Hoy no se usa (la app vuelve a ser local-only). */
  onLogout?: () => void;
}

export function AuthenticatedApp({ onLogout: _unused }: AuthenticatedAppProps = {}) {
  const initialNav = useMemo(getInitialNav, []);
  const [viewMode, setViewMode] = useState<ViewMode>(initialNav.view);
  const [shellSection, setShellSection] = useState<ShellSection>(initialNav.shellSection);
  const [patientSection, setPatientSection] = useState<PatientSection>(initialNav.patientSection);
  const [practiceSubTab, setPracticeSubTab] = useState<PracticeSubTab>(initialNav.practiceSubTab);

  const initialState = useMemo(() => migrateAndLoad(), []);

  const [clients, setClients] = useState<ClientProfile[]>(initialState.clients);
  const [activeClientId, setActiveClientId] = useState<string>(
    initialNav.pendingClientId && initialState.clients.some(c => c.id === initialNav.pendingClientId)
      ? initialNav.pendingClientId
      : initialState.activeClientId
  );
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(initialState.routines);
  const [scheduledRoutines, setScheduledRoutines] = useState<ScheduledRoutine[]>(initialState.scheduledRoutines);
  const [metricSamples, setMetricSamples] = useState<MetricSample[]>(initialState.metricSamples);
  const [templates, setTemplates] = useState<MicrocycleTemplate[]>(initialState.templates);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialState.payments);
  const [services, setServices] = useState<ServiceCatalogItem[]>(initialState.services);
  const [loyaltyCampaigns, setLoyaltyCampaigns] = useState<LoyaltyCampaign[]>(initialState.loyaltyCampaigns);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(initialState.messageTemplates);
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>(initialState.sessionNotes);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>(initialState.communicationLogs);
  const [globalReminders, setGlobalReminders] = useState<GlobalReminder[]>(initialState.globalReminders);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>(initialState.customExercises);
  const [exerciseWarnings, setExerciseWarnings] = useState<Record<string, ExerciseWarning[]>>(initialState.exerciseWarnings);
  const [userImages, setUserImages] = useState<UserImage[]>(initialState.userImages);
  const [anatomyImages, setAnatomyImages] = useState<AnatomyImage[]>(initialState.anatomyImages);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [viewedMonth, setViewedMonth] = useState<MonthRef>(() => {
    if (initialState.scheduledRoutines.length === 0) {
      const today = new Date();
      return { year: today.getFullYear(), monthIndex: today.getMonth() };
    }
    return INITIAL_CALENDAR;
  });

  /* Workspace completo memoizado: fuente única para persistir y sincronizar. */
  const workspace = useMemo(() => ({
    clients, activeClientId, routines, scheduledRoutines,
    metricSamples, templates, payments, services, loyaltyCampaigns, messageTemplates,
    sessionNotes, communicationLogs, globalReminders,
    customExercises, exerciseWarnings, userImages, anatomyImages
  }), [clients, activeClientId, routines, scheduledRoutines, metricSamples, templates, payments, services, loyaltyCampaigns, messageTemplates, sessionNotes, communicationLogs, globalReminders, customExercises, exerciseWarnings, userImages, anatomyImages]);

  const persistTimer = useRef<number | null>(null);
  useEffect(() => {
    if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      persist(workspace);
    }, 350);
    return () => {
      if (persistTimer.current !== null) window.clearTimeout(persistTimer.current);
    };
  }, [workspace]);

  /* Sincronización con la nube (no-op si no hay backend/sesión).
     Arrow para diferir la lectura de handleImportBackup (declarado más abajo). */
  useCloudSync(workspace, (ws) => handleImportBackup(ws));

  /* URL sync */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', viewMode);
    if (viewMode === 'shell') {
      url.searchParams.set('section', shellSection);
      if (shellSection === 'practica') {
        url.searchParams.set('tab', practiceSubTab);
      } else {
        url.searchParams.delete('tab');
      }
      url.searchParams.delete('clientId');
    } else if (viewMode === 'patient') {
      url.searchParams.set('tab', patientSection);
      url.searchParams.set('clientId', activeClientId);
      url.searchParams.delete('section');
    } else {
      url.searchParams.delete('section');
      url.searchParams.delete('tab');
      url.searchParams.delete('clientId');
    }
    window.history.replaceState({}, '', url.toString());
    track('view_changed', { view: viewMode, section: viewMode === 'patient' ? patientSection : shellSection });
  }, [viewMode, shellSection, patientSection, practiceSubTab, activeClientId]);

  useEffect(() => {
    track('app_loaded', {
      clients: clients.length,
      routines: routines.length,
      scheduled: scheduledRoutines.length
    });
    // mount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeClient = useMemo<ClientProfile>(() => {
    const found = clients.find(c => c.id === activeClientId);
    if (found) return found;
    const first = clients[0];
    if (first) {
      Promise.resolve().then(() => setActiveClientId(first.id));
      return first;
    }
    return { ...INITIAL_PROFILE };
  }, [clients, activeClientId]);

  const updateActiveClient = useCallback((updated: ClientProfile) => {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, []);

  const handleCreateClient = useCallback((name: string) => {
    track('client_created');
    const id = `client-${Date.now()}`;
    const newClient: ClientProfile = {
      ...INITIAL_PROFILE,
      id,
      name: name.trim() || 'Nuevo Atleta',
      metrics: {},
      clinical: {},
      goals: { performance: '', aesthetic: '', health: '' },
      practice: {}
    };
    setClients(prev => [...prev, newClient]);
    setActiveClientId(id);
    setPatientSection('ficha');
    setViewMode('patient');
  }, []);

  const handleRenameClient = useCallback((id: string, name: string) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() || c.name } : c));
  }, []);

  const handleDeleteClient = useCallback((id: string) => {
    track('client_deleted');
    setClients(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const fallback: ClientProfile = { ...INITIAL_PROFILE, id: `client-${Date.now()}`, name: 'Nuevo Atleta' };
        setActiveClientId(fallback.id);
        return [fallback];
      }
      if (id === activeClientId) setActiveClientId(filtered[0].id);
      return filtered;
    });
    setScheduledRoutines(prev => prev.filter(s => s.clientId !== id));
    setMetricSamples(prev => prev.filter(s => s.clientId !== id));
    setPayments(prev => prev.filter(s => s.clientId !== id));
    setSessionNotes(prev => prev.filter(s => s.clientId !== id));
    setCommunicationLogs(prev => prev.filter(s => s.clientId !== id));
  }, [activeClientId]);

  const handleImportBackup = useCallback((imported: {
    clients: ClientProfile[];
    activeClientId: string;
    routines: WorkoutRoutine[];
    scheduledRoutines: ScheduledRoutine[];
    metricSamples: MetricSample[];
    templates: MicrocycleTemplate[];
    payments?: PaymentRecord[];
    services?: ServiceCatalogItem[];
    loyaltyCampaigns?: LoyaltyCampaign[];
    messageTemplates?: MessageTemplate[];
    sessionNotes?: SessionNote[];
    communicationLogs?: CommunicationLog[];
    globalReminders?: GlobalReminder[];
    customExercises?: CustomExercise[];
    exerciseWarnings?: Record<string, ExerciseWarning[]>;
    userImages?: UserImage[];
    anatomyImages?: AnatomyImage[];
  }) => {
    setClients(imported.clients);
    setActiveClientId(imported.activeClientId);
    setRoutines(imported.routines);
    setScheduledRoutines(imported.scheduledRoutines);
    setMetricSamples(imported.metricSamples);
    setTemplates(imported.templates);
    setPayments(imported.payments ?? []);
    setServices(imported.services ?? [...INITIAL_SERVICES]);
    setLoyaltyCampaigns(imported.loyaltyCampaigns ?? [...INITIAL_LOYALTY_CAMPAIGNS]);
    setMessageTemplates(imported.messageTemplates ?? [...INITIAL_MESSAGE_TEMPLATES]);
    setSessionNotes(imported.sessionNotes ?? []);
    setCommunicationLogs(imported.communicationLogs ?? []);
    setGlobalReminders(imported.globalReminders ?? []);
    setCustomExercises(imported.customExercises ?? []);
    setExerciseWarnings(imported.exerciseWarnings ?? {});
    setUserImages(imported.userImages ?? []);
    setAnatomyImages(imported.anatomyImages ?? []);
    if (imported.scheduledRoutines.length > 0) {
      setViewedMonth({ year: imported.scheduledRoutines[0].year, monthIndex: imported.scheduledRoutines[0].monthIndex });
    }
  }, []);

  const handleClearDatabase = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    setClients([{ ...INITIAL_PROFILE }]);
    setActiveClientId(DEFAULT_CLIENT_ID);
    setRoutines([...INITIAL_ROUTINES]);
    setScheduledRoutines([]);
    setMetricSamples([]);
    setTemplates([]);
    setPayments([]);
    setServices([...INITIAL_SERVICES]);
    setLoyaltyCampaigns([...INITIAL_LOYALTY_CAMPAIGNS]);
    setMessageTemplates([...INITIAL_MESSAGE_TEMPLATES]);
    setSessionNotes([]);
    setCommunicationLogs([]);
    setGlobalReminders([]);
    setCustomExercises([]);
    setExerciseWarnings({});
    setUserImages([]);
    setAnatomyImages([]);
  }, []);

  /* Navegación */
  const enterPatient = useCallback((clientId: string, section: PatientSection = 'ficha') => {
    setActiveClientId(clientId);
    setPatientSection(section);
    setViewMode('patient');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);

  const exitPatient = useCallback(() => {
    setViewMode('shell');
    setShellSection('pacientes');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);

  const goToLanding = useCallback(() => {
    setViewMode('landing');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);

  const goToShellSection = useCallback((s: ShellSection) => {
    setShellSection(s);
    setViewMode('shell');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, []);

  const enterActivePatient = useCallback(() => {
    if (activeClient) enterPatient(activeClient.id, 'ficha');
  }, [activeClient, enterPatient]);

  const onAddMetricSample = useCallback((s: MetricSample) => {
    setMetricSamples(prev => [...prev, s]);
  }, []);

  const onAddPayment = useCallback((p: PaymentRecord) => {
    setPayments(prev => [...prev, p]);
  }, []);

  const onRemovePayment = useCallback((id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  }, []);

  /* Session notes handlers */
  const onAddSessionNote = useCallback((n: SessionNote) => setSessionNotes(prev => [...prev, n]), []);
  const onUpdateSessionNote = useCallback((n: SessionNote) => setSessionNotes(prev => prev.map(x => x.id === n.id ? n : x)), []);
  const onRemoveSessionNote = useCallback((id: string) => setSessionNotes(prev => prev.filter(x => x.id !== id)), []);

  /* Communication log */
  const onLogCommunication = useCallback((log: CommunicationLog) => {
    setCommunicationLogs(prev => [...prev, log]);
  }, []);

  /* Global reminders */
  const onAddGlobalReminder = useCallback((r: GlobalReminder) => setGlobalReminders(prev => [...prev, r]), []);
  const onUpdateGlobalReminder = useCallback((r: GlobalReminder) => setGlobalReminders(prev => prev.map(x => x.id === r.id ? r : x)), []);
  const onRemoveGlobalReminder = useCallback((id: string) => setGlobalReminders(prev => prev.filter(x => x.id !== id)), []);

  /* User images (banco personal) */
  const onAddUserImage = useCallback((img: UserImage) => setUserImages(prev => [...prev, img]), []);
  const onRemoveUserImage = useCallback((id: string) => setUserImages(prev => prev.filter(x => x.id !== id)), []);

  /* Ilustraciones anatómicas con licencia (banco para la Biblioteca) */
  const onAddAnatomyImage = useCallback((img: AnatomyImage) => setAnatomyImages(prev => [...prev, img]), []);
  const onRemoveAnatomyImage = useCallback((id: string) => setAnatomyImages(prev => prev.filter(x => x.id !== id)), []);

  /* Pagos del paciente activo (filtrados) */
  const paymentsForActive = useMemo(
    () => payments.filter(p => p.clientId === activeClient.id),
    [payments, activeClient.id]
  );

  /* Notas de sesión del paciente activo (filtradas) */
  const notesForActive = useMemo(
    () => sessionNotes.filter(n => n.clientId === activeClient.id),
    [sessionNotes, activeClient.id]
  );

  /* Command palette resultado */
  const handleCommandResult = useCallback((r: CommandResult) => {
    if (r.kind === 'patient') {
      enterPatient(r.clientId, 'ficha');
    } else if (r.kind === 'nav') {
      if (r.section === 'landing') {
        setViewMode('landing');
      } else {
        goToShellSection(r.section);
      }
    } else if (r.kind === 'action') {
      if (r.id === 'new-patient') {
        const name = window.prompt('Nombre del nuevo paciente:');
        if (name && name.trim()) handleCreateClient(name.trim());
      } else if (r.id === 'show-shortcuts') {
        setAboutOpen(true);
      }
    }
  }, [enterPatient, goToShellSection, handleCreateClient]);

  /* Atajos de teclado globales */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let pendingG = false;
    let gTimer: number | null = null;

    const isTypingInField = (el: EventTarget | null) => {
      const e = el as HTMLElement | null;
      if (!e) return false;
      const tag = e.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.isContentEditable;
    };

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      /* Cmd+K abre palette */
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      /* Esc cierra palette o about */
      if (e.key === 'Escape') {
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (aboutOpen) { setAboutOpen(false); return; }
      }
      /* Atajos g+x, n, ? no funcionan si está escribiendo */
      if (meta || e.altKey) return;
      if (isTypingInField(e.target)) return;

      if (e.key === 'g' || e.key === 'G') {
        pendingG = true;
        if (gTimer !== null) window.clearTimeout(gTimer);
        gTimer = window.setTimeout(() => { pendingG = false; }, 700);
        return;
      }
      if (pendingG) {
        pendingG = false;
        const k = e.key.toLowerCase();
        if (k === 'h') { e.preventDefault(); goToShellSection('inicio'); return; }
        if (k === 'p') { e.preventDefault(); goToShellSection('pacientes'); return; }
        if (k === 'r') { e.preventDefault(); goToShellSection('practica'); return; }
        if (k === 'b') { e.preventDefault(); goToShellSection('biblioteca'); return; }
        if (k === 'd' || k === 'o') { e.preventDefault(); goToShellSection('offline'); return; }
        if (k === 'l') { e.preventDefault(); setViewMode('landing'); return; }
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const name = window.prompt('Nombre del nuevo paciente:');
        if (name && name.trim()) handleCreateClient(name.trim());
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setAboutOpen(true);
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (gTimer !== null) window.clearTimeout(gTimer);
    };
  }, [goToShellSection, handleCreateClient, paletteOpen, aboutOpen, handleCommandResult]);

  /* KPIs landing */
  const landingMetrics = useMemo(() => {
    let pendingTasks = 0;
    let overdueAccounts = 0;
    const now = Date.now();
    for (const c of clients) {
      const p = c.practice ?? {};
      if (p.nextControlAt && p.nextControlAt < now) pendingTasks += 1;
      if (p.nextPaymentAt && p.nextPaymentAt < now) { pendingTasks += 1; overdueAccounts += 1; }
      const samples = metricSamples.filter(s => s.clientId === c.id);
      const lastSample = samples.length ? Math.max(...samples.map(s => s.takenAt)) : null;
      const hasScheduled = scheduledRoutines.some(s => s.clientId === c.id);
      if (hasScheduled && (lastSample === null || (now - lastSample) > 30 * MS_PER_DAY)) pendingTasks += 1;
    }
    return { pendingTasks, overdueAccounts };
  }, [clients, metricSamples, scheduledRoutines]);

  /* Landing render */
  if (viewMode === 'landing') {
    return (
      <>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        clients={clients}
        onSelectResult={handleCommandResult}
      />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <LandingPage
        clients={clients}
        pendingTasks={landingMetrics.pendingTasks}
        overdueAccounts={landingMetrics.overdueAccounts}
        activeClient={clients.length > 0 ? activeClient : null}
        onSelectCategory={(cat) => {
          if (cat === 'patient') enterActivePatient();
          else goToShellSection(cat);
        }}
        onEnterActivePatient={enterActivePatient}
        coachName={COACH_NAME}
      />
      </>
    );
  }

  const inPatient = viewMode === 'patient';
  const currentSection: ShellSection | 'patient' = inPatient ? 'patient' : shellSection;

  const sectionMeta = inPatient
    ? { title: activeClient.name, subtitle: `Plataforma del paciente · ${labelForPatientSection(patientSection)}` }
    : sectionMetaFor(shellSection);

  /* Top tabs internas: patient = 4 subsecciones, practica = 3 sub-tabs */
  let innerTabs: { id: string; label: string }[] | undefined;
  let innerTab: string | undefined;
  let onSelectInnerTab: ((id: string) => void) | undefined;

  if (inPatient) {
    innerTabs = PATIENT_SECTIONS.map(s => ({ id: s, label: labelForPatientSection(s) }));
    innerTab = patientSection;
    onSelectInnerTab = (id) => setPatientSection(id as PatientSection);
  } else if (shellSection === 'practica') {
    innerTabs = [
      { id: 'plantillas', label: 'Plantillas' },
      { id: 'calculadoras', label: 'Calculadoras' },
      { id: 'fidelizacion', label: 'Fidelización' },
      { id: 'catalogo', label: 'Catálogo' },
      { id: 'comercial', label: 'Comercial' }
    ];
    innerTab = practiceSubTab;
    onSelectInnerTab = (id) => setPracticeSubTab(id as PracticeSubTab);
  }

  const topbarRight = inPatient ? (
    <div className="hidden md:block w-72">
      <ClientSwitcher
        clients={clients}
        activeClientId={activeClient.id}
        onSelect={(id) => enterPatient(id, patientSection)}
        onCreate={handleCreateClient}
        onRename={handleRenameClient}
        onDelete={handleDeleteClient}
      />
    </div>
  ) : null;

  return (
    <>
    <CommandPalette
      open={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      clients={clients}
      onSelectResult={handleCommandResult}
    />
    <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    <AppShell
      currentSection={currentSection}
      patientSection={patientSection}
      innerTab={innerTab}
      innerTabs={innerTabs}
      title={sectionMeta.title}
      subtitle={sectionMeta.subtitle}
      activeClient={clients.length > 0 ? activeClient : null}
      isInPatient={inPatient}
      onSelectShellSection={goToShellSection}
      onSelectPatientSection={(s) => {
        setPatientSection(s);
        setViewMode('patient');
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
      }}
      onSelectInnerTab={onSelectInnerTab}
      onExitToLanding={goToLanding}
      onExitPatient={exitPatient}
      topbarRight={topbarRight}
      onOpenAbout={() => setAboutOpen(true)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${inPatient ? patientSection : shellSection}-${shellSection === 'practica' ? practiceSubTab : ''}-${activeClient.id}`}
          id={`tabpanel_${inPatient ? patientSection : shellSection}`}
          role="tabpanel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          <ErrorBoundary>
            <Suspense fallback={<TabFallback />}>

              {/* SHELL SECTIONS */}
              {!inPatient && shellSection === 'inicio' && (
                <HomeTab
                  clients={clients}
                  metricSamples={metricSamples}
                  scheduledRoutines={scheduledRoutines}
                  routines={routines}
                  onEnterPatient={enterPatient}
                  onGoToTab={(tab) => goToShellSection(tab as ShellSection)}
                  onCreateClient={handleCreateClient}
                  globalReminders={globalReminders}
                  onAddGlobalReminder={onAddGlobalReminder}
                  onUpdateGlobalReminder={onUpdateGlobalReminder}
                  onRemoveGlobalReminder={onRemoveGlobalReminder}
                  onOpenCommandPalette={() => setPaletteOpen(true)}
                  loyaltyCampaigns={loyaltyCampaigns}
                />
              )}

              {!inPatient && shellSection === 'pacientes' && (
                <PatientsListTab
                  clients={clients}
                  metricSamples={metricSamples}
                  scheduledRoutines={scheduledRoutines}
                  onEnterPatient={enterPatient}
                  onCreateClient={handleCreateClient}
                  onUpdateClient={updateActiveClient}
                />
              )}

              {!inPatient && shellSection === 'practica' && (
                <CoachDashboardTab
                  clients={clients}
                  activeClient={activeClient}
                  metricSamples={metricSamples}
                  scheduledRoutines={scheduledRoutines}
                  payments={payments}
                  services={services}
                  loyaltyCampaigns={loyaltyCampaigns}
                  messageTemplates={messageTemplates}
                  subTab={practiceSubTab}
                  onUpdateProfile={updateActiveClient}
                  onSwitchClient={(id) => setActiveClientId(id)}
                  onEnterPatient={enterPatient}
                  onUpdateServices={setServices}
                  onUpdateLoyaltyCampaigns={setLoyaltyCampaigns}
                  onUpdateMessageTemplates={setMessageTemplates}
                  onLogCommunication={onLogCommunication}
                  onAddPayment={onAddPayment}
                  userImages={userImages}
                  onAddUserImage={onAddUserImage}
                  onRemoveUserImage={onRemoveUserImage}
                  coachName={COACH_NAME}
                />
              )}

              {!inPatient && shellSection === 'biblioteca' && (
                <ExerciseLibraryTab
                  customExercises={customExercises}
                  exerciseWarnings={exerciseWarnings}
                  onUpdateCustom={setCustomExercises}
                  onUpdateWarnings={setExerciseWarnings}
                  anatomyImages={anatomyImages}
                  onAddAnatomyImage={onAddAnatomyImage}
                  onRemoveAnatomyImage={onRemoveAnatomyImage}
                />
              )}

              {!inPatient && shellSection === 'offline' && (
                <OfflineTab
                  clients={clients}
                  activeClientId={activeClient.id}
                  routines={routines}
                  scheduledRoutines={scheduledRoutines}
                  metricSamples={metricSamples}
                  templates={templates}
                  payments={payments}
                  services={services}
                  loyaltyCampaigns={loyaltyCampaigns}
                  messageTemplates={messageTemplates}
                  sessionNotes={sessionNotes}
                  communicationLogs={communicationLogs}
                  globalReminders={globalReminders}
                  customExercises={customExercises}
                  exerciseWarnings={exerciseWarnings}
                  userImages={userImages}
                  anatomyImages={anatomyImages}
                  onImportBackup={(data) => handleImportBackup(data)}
                  onClearDatabase={handleClearDatabase}
                />
              )}

              {/* PATIENT SECTIONS */}
              {inPatient && patientSection === 'ficha' && (
                <PreambleTab
                  profile={activeClient}
                  onUpdateProfile={updateActiveClient}
                  onAddMetricSample={onAddMetricSample}
                  coachName={COACH_NAME}
                  payments={paymentsForActive}
                  services={services}
                  onAddPayment={onAddPayment}
                  onRemovePayment={onRemovePayment}
                  sessionNotes={notesForActive}
                  onAddSessionNote={onAddSessionNote}
                  onUpdateSessionNote={onUpdateSessionNote}
                  onRemoveSessionNote={onRemoveSessionNote}
                  allMetricSamples={metricSamples}
                  allPayments={payments}
                  allSessionNotes={sessionNotes}
                  scheduledRoutines={scheduledRoutines}
                />
              )}

              {inPatient && patientSection === 'planificador' && (
                <CalendarTab
                  routines={routines}
                  onUpdateRoutines={setRoutines}
                  scheduledRoutines={scheduledRoutines}
                  onUpdateScheduledRoutines={setScheduledRoutines}
                  activeClientId={activeClient.id}
                  activeClientEquipment={activeClient.equipment}
                  viewedMonth={viewedMonth}
                  onChangeViewedMonth={setViewedMonth}
                  templates={templates}
                  onUpdateTemplates={setTemplates}
                />
              )}

              {inPatient && patientSection === 'evolucion' && (
                <EvolutionTab
                  profile={activeClient}
                  metricSamples={metricSamples}
                  onUpdateMetricSamples={setMetricSamples}
                />
              )}

              {inPatient && patientSection === 'exportar' && (
                <ExportTab
                  profile={activeClient}
                  routines={routines}
                  scheduledRoutines={scheduledRoutines}
                  activeClientId={activeClient.id}
                  viewedMonth={viewedMonth}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </AppShell>
    </>
  );
}

/* ----------------------------------------------------------------------- *
 * Helpers de etiquetas
 * ----------------------------------------------------------------------- */

function sectionMetaFor(s: ShellSection): { title: string; subtitle: string } {
  switch (s) {
    case 'inicio': return { title: 'Inicio', subtitle: 'Resumen del día' };
    case 'pacientes': return { title: 'Pacientes', subtitle: 'Cartera completa' };
    case 'practica': return { title: 'Práctica', subtitle: 'Gestión clínica & comercial' };
    case 'biblioteca': return { title: 'Biblioteca de movimientos', subtitle: 'Ejercicios NSCA + personales con contraindicaciones' };
    case 'offline': return { title: 'Datos & Respaldos', subtitle: 'Backups, PWA, almacenamiento y telemetría' };
  }
}

function labelForPatientSection(s: PatientSection): string {
  switch (s) {
    case 'ficha': return 'Ficha';
    case 'planificador': return 'Planificador';
    case 'evolucion': return 'Evolución';
    case 'exportar': return 'Exportar';
  }
}

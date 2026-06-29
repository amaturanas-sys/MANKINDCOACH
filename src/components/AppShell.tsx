/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell de la aplicación cuando ya entraste desde la landing.
 *
 * Layout:
 *   ┌───────────────────────────────────────────────────────┐
 *   │ Sidebar │ Topbar (título + acciones)                  │
 *   │         ├─────────────────────────────────────────────┤
 *   │  Logo   │ Top tabs internas (si aplica)               │
 *   │  Nav    ├─────────────────────────────────────────────┤
 *   │  ...    │                                             │
 *   │  Back   │ Contenido (children)                        │
 *   └─────────┴─────────────────────────────────────────────┘
 *
 * En móvil el sidebar se vuelve un drawer que se abre con un botón.
 */

import React, { useState } from 'react';
import {
  Home as HomeIcon,
  Users,
  Briefcase,
  HardDrive,
  UserCheck,
  Calendar,
  TrendingUp,
  DownloadCloud,
  ChevronLeft,
  Dumbbell,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Library
} from 'lucide-react';
import { ClientProfile } from '../types';
import { useTheme } from '../lib/theme';
import { Avatar } from './Avatar';

export type ShellSection = 'inicio' | 'pacientes' | 'practica' | 'biblioteca' | 'offline';
export type PatientSection = 'ficha' | 'planificador' | 'evolucion' | 'exportar';

interface AppShellProps {
  /** Sección actual (shell o patient). */
  currentSection: ShellSection | 'patient';
  /** Sub-tab actual cuando currentSection === 'patient'. */
  patientSection: PatientSection;
  /** Sub-tab interno opcional de la sección actual del shell. */
  innerTab?: string;
  /** Definición de pestañas internas para la sección actual (vacío = sin top tabs). */
  innerTabs?: { id: string; label: string }[];
  /** Título grande de la página. */
  title: string;
  /** Subtítulo / breadcrumb pequeño. */
  subtitle?: string;
  /** Paciente activo (puede ser null si no hay ninguno cargado). */
  activeClient: ClientProfile | null;
  /** Si patient mode está abierto, este es el nombre del paciente. */
  isInPatient: boolean;
  /** Navegación */
  onSelectShellSection: (s: ShellSection) => void;
  onSelectPatientSection: (s: PatientSection) => void;
  onSelectInnerTab?: (id: string) => void;
  onExitToLanding: () => void;
  onExitPatient: () => void;
  /** Acción opcional en topbar (ej: ClientSwitcher cuando estás en paciente). */
  topbarRight?: React.ReactNode;
  /** Abrir modal "Acerca de" desde el sidebar */
  onOpenAbout?: () => void;
  children: React.ReactNode;
}

const SHELL_NAV: { id: ShellSection; label: string; icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }[] = [
  { id: 'inicio', label: 'Inicio', icon: HomeIcon },
  { id: 'practica', label: 'Práctica', icon: Briefcase },
  { id: 'pacientes', label: 'Pacientes', icon: Users },
  { id: 'biblioteca', label: 'Biblioteca', icon: Library },
  { id: 'offline', label: 'Datos', icon: HardDrive }
];

const PATIENT_NAV: { id: PatientSection; label: string; icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }> }[] = [
  { id: 'ficha', label: 'Ficha', icon: UserCheck },
  { id: 'planificador', label: 'Planificador', icon: Calendar },
  { id: 'evolucion', label: 'Evolución', icon: TrendingUp },
  { id: 'exportar', label: 'Exportar', icon: DownloadCloud }
];

function ThemeToggleSmall() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Activar tema oscuro' : 'Activar tema claro'}
      title={isLight ? 'Activar tema oscuro' : 'Activar tema claro'}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-surface-muted border-surface-strong text-secondary-fg hover:text-primary-fg hover:border-brand-soft transition font-mono text-[10px] uppercase tracking-wider"
    >
      {isLight ? <Moon size={12} aria-hidden="true" /> : <Sun size={12} aria-hidden="true" />}
      <span className="hidden sm:inline">{isLight ? 'Noche' : 'Día'}</span>
    </button>
  );
}

export default function AppShell({
  currentSection,
  patientSection,
  innerTab,
  innerTabs,
  title,
  subtitle,
  activeClient,
  isInPatient,
  onSelectShellSection,
  onSelectPatientSection,
  onSelectInnerTab,
  onExitToLanding,
  onExitPatient,
  topbarRight,
  onOpenAbout,
  children
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [patientGroupOpen, setPatientGroupOpen] = useState(true);

  return (
    <div className="min-h-screen bg-surface-base text-primary-fg flex flex-col antialiased">

      {/* Print alert */}
      <div id="print_media_alert" className="hidden print:block bg-white text-black p-4 text-center font-mono text-xs font-bold border-b border-zinc-300">
        MankindFactory Athletics Lab • Reporte Técnico Generado el {new Date().toLocaleDateString('es-ES')}
      </div>

      <div className="flex flex-1 min-h-0">

        {/* SIDEBAR — desktop (sticky) */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-surface-soft bg-surface-sub sticky top-0 h-screen overflow-y-auto scrollbar-thin">
          <SidebarContents
            currentSection={currentSection}
            patientSection={patientSection}
            activeClient={activeClient}
            isInPatient={isInPatient}
            patientGroupOpen={patientGroupOpen}
            setPatientGroupOpen={setPatientGroupOpen}
            onSelectShellSection={(s) => { onSelectShellSection(s); }}
            onSelectPatientSection={(s) => { onSelectPatientSection(s); }}
            onExitToLanding={onExitToLanding}
            onExitPatient={onExitPatient}
            onOpenAbout={onOpenAbout}
          />
        </aside>

        {/* DRAWER — móvil */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
            <aside className="relative w-72 max-w-[85vw] bg-surface-sub border-r border-surface-soft overflow-y-auto scrollbar-thin">
              <SidebarContents
                currentSection={currentSection}
                patientSection={patientSection}
                activeClient={activeClient}
                isInPatient={isInPatient}
                patientGroupOpen={patientGroupOpen}
                setPatientGroupOpen={setPatientGroupOpen}
                onSelectShellSection={(s) => { onSelectShellSection(s); setDrawerOpen(false); }}
                onSelectPatientSection={(s) => { onSelectPatientSection(s); setDrawerOpen(false); }}
                onExitToLanding={() => { onExitToLanding(); setDrawerOpen(false); }}
                onExitPatient={() => { onExitPatient(); setDrawerOpen(false); }}
                onOpenAbout={onOpenAbout ? () => { onOpenAbout(); setDrawerOpen(false); } : undefined}
              />
            </aside>
          </div>
        )}

        {/* COLUMNA PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* TOPBAR */}
          <header className="sticky top-0 z-40 bg-surface-overlay backdrop-blur border-b border-surface-soft px-4 md:px-6 py-3 flex items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden p-2 rounded border border-surface-strong bg-surface-muted text-secondary-fg hover:text-primary-fg shrink-0"
                aria-label="Abrir menú"
              >
                <Menu size={16} aria-hidden="true" />
              </button>
              <div className="min-w-0">
                {subtitle && (
                  <p className="font-mono text-[9px] tracking-widest uppercase text-faint-fg truncate">{subtitle}</p>
                )}
                <h1 className="font-sans font-black text-lg md:text-xl tracking-tight text-primary-fg truncate">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {topbarRight}
              <ThemeToggleSmall />
            </div>
          </header>

          {/* TOP TABS INTERNAS (si aplica) */}
          {innerTabs && innerTabs.length > 0 && onSelectInnerTab && (
            <nav aria-label="Sub-secciones" className="bg-surface-sub border-b border-surface-soft px-4 md:px-6 py-2 print:hidden overflow-x-auto scrollbar-thin">
              <div role="tablist" className="flex items-center gap-1 min-w-max">
                {innerTabs.map(tab => {
                  const active = innerTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => onSelectInnerTab(tab.id)}
                      className={`px-3 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider transition border ${
                        active
                          ? 'bg-brand text-white border-brand font-bold'
                          : 'bg-transparent border-transparent text-faint-fg hover:text-primary-fg hover:bg-surface-muted'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {/* CONTENIDO */}
          <main className="flex-1 w-full p-4 md:p-8 print:p-0 print:m-0">
            <div className="max-w-7xl mx-auto print:max-w-none">
              {children}
            </div>
          </main>

          {/* FOOTER */}
          <footer className="bg-surface-sub border-t border-surface-soft py-4 text-center font-mono text-[10px] text-faint-fg uppercase tracking-widest print:hidden">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2">
              <p className="text-secondary-fg font-bold normal-case tracking-normal text-[10px]">
                Plataforma desarrollada para <span className="text-brand">Alberto Maturana S.</span>
              </p>
              <span className="text-brand">● Workspace Local</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Contenidos del sidebar (compartidos entre desktop y drawer móvil)
 * ----------------------------------------------------------------------- */

interface SidebarContentsProps {
  currentSection: ShellSection | 'patient';
  patientSection: PatientSection;
  activeClient: ClientProfile | null;
  isInPatient: boolean;
  patientGroupOpen: boolean;
  setPatientGroupOpen: (v: boolean) => void;
  onSelectShellSection: (s: ShellSection) => void;
  onSelectPatientSection: (s: PatientSection) => void;
  onExitToLanding: () => void;
  onExitPatient: () => void;
  onOpenAbout?: () => void;
}

function SidebarContents({
  currentSection,
  patientSection,
  activeClient,
  isInPatient,
  patientGroupOpen,
  setPatientGroupOpen,
  onSelectShellSection,
  onSelectPatientSection,
  onExitToLanding,
  onExitPatient,
  onOpenAbout
}: SidebarContentsProps) {
  return (
    <div className="flex flex-col h-full">

      {/* Branding */}
      <div className="px-4 py-5 border-b border-surface-soft">
        <button
          type="button"
          onClick={onExitToLanding}
          className="w-full flex items-center gap-3 group"
          title="Volver al inicio"
        >
          <div className="p-2 bg-brand text-white rounded-lg shadow-lg group-hover:opacity-90 transition">
            <Dumbbell size={18} className="rotate-[-12deg]" aria-hidden="true" />
          </div>
          <div className="text-left min-w-0">
            <span className="block font-sans font-black text-sm tracking-tight leading-none text-brand">
              MANKIND<span className="text-primary-fg">FACTORY</span>
            </span>
            <span className="block font-mono text-[8px] tracking-widest uppercase text-faint-fg mt-1 truncate">
              Pro Lab v5.2 · Maturana S.
            </span>
          </div>
        </button>
      </div>

      {/* Volver al inicio */}
      <div className="px-3 py-3 border-b border-surface-soft">
        <button
          type="button"
          onClick={onExitToLanding}
          className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md border border-surface-strong bg-surface-muted text-secondary-fg hover:text-primary-fg hover:border-brand-soft transition font-mono text-[10px] uppercase tracking-wider"
        >
          <ChevronLeft size={12} aria-hidden="true" />
          <span>Volver al inicio</span>
        </button>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin" aria-label="Navegación general">
        <div className="px-2 pb-2">
          <span className="font-mono text-[8px] uppercase tracking-widest text-faint-fg">Sistema</span>
        </div>
        {SHELL_NAV.map(item => {
          const Icon = item.icon;
          const active = currentSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectShellSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition group ${
                active
                  ? 'bg-brand text-white font-bold'
                  : 'text-secondary-fg hover:bg-surface-muted hover:text-primary-fg'
              }`}
            >
              <Icon size={15} className={active ? 'text-white' : 'text-faint-fg group-hover:text-brand'} aria-hidden="true" />
              <span className="font-sans text-[13px] tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* Grupo del paciente */}
        {activeClient && (
          <>
            <div className="pt-4 px-2 pb-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-faint-fg">Paciente activo</span>
            </div>
            <button
              type="button"
              onClick={() => setPatientGroupOpen(!patientGroupOpen)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition ${
                isInPatient
                  ? 'bg-brand-soft border border-brand-soft text-primary-fg'
                  : 'text-secondary-fg hover:bg-surface-muted'
              }`}
              aria-expanded={patientGroupOpen}
            >
              <Avatar name={activeClient.name} dataUrl={activeClient.avatarDataUrl} size={28} />
              <div className="flex-1 min-w-0">
                <span className="block font-sans font-bold text-[12px] tracking-tight truncate text-primary-fg">{activeClient.name}</span>
                <span className="block font-mono text-[9px] uppercase text-faint-fg">{activeClient.experienceLevel}</span>
              </div>
              {patientGroupOpen
                ? <ChevronDown size={12} className="text-faint-fg shrink-0" aria-hidden="true" />
                : <ChevronRight size={12} className="text-faint-fg shrink-0" aria-hidden="true" />
              }
            </button>

            {patientGroupOpen && (
              <div className="pl-2 space-y-1 pt-1">
                {PATIENT_NAV.map(item => {
                  const Icon = item.icon;
                  const active = isInPatient && patientSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectPatientSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-left transition group ${
                        active
                          ? 'bg-brand-soft-strong text-primary-fg font-bold border-l-2 border-brand'
                          : 'text-faint-fg hover:bg-surface-muted hover:text-secondary-fg'
                      }`}
                    >
                      <Icon size={13} className={active ? 'text-brand' : 'text-disabled-fg group-hover:text-faint-fg'} aria-hidden="true" />
                      <span className="font-sans text-[12px] tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
                {isInPatient && (
                  <button
                    type="button"
                    onClick={onExitPatient}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-faint-fg hover:text-primary-fg hover:bg-surface-muted transition mt-2"
                  >
                    <X size={11} aria-hidden="true" />
                    <span className="font-mono text-[9px] uppercase tracking-wider">Salir del paciente</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-surface-soft space-y-2">
        {onOpenAbout && (
          <button
            type="button"
            onClick={onOpenAbout}
            className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md border border-surface-strong bg-surface-muted text-secondary-fg hover:text-primary-fg hover:border-brand-soft transition font-mono text-[10px] uppercase tracking-wider"
            title="Atajos, guía de uso y créditos (?)"
          >
            <HelpCircle size={12} aria-hidden="true" />
            <span>Acerca de · ?</span>
          </button>
        )}
        <p className="font-mono text-[8px] uppercase tracking-widest text-faint-fg leading-relaxed px-1">
          Práctica de<br />
          <span className="text-brand normal-case text-[10px] tracking-normal font-bold">Alberto Maturana S.</span>
        </p>
      </div>
    </div>
  );
}

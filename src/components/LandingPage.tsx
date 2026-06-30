/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Landing limpia del centro de práctica.
 * Diseñada para entrar SIN SCROLL en viewports estándar (≥720px de alto).
 * En pantallas más bajas / móvil estrecho cae en scroll natural.
 */

import React from 'react';
import {
  Home as HomeIcon,
  Users,
  Briefcase,
  HardDrive,
  UserCheck,
  ArrowRight,
  Sparkles,
  Dumbbell,
  Sun,
  Moon,
  Library
} from 'lucide-react';
import { ClientProfile } from '../types';
import { useTheme } from '../lib/theme';
import { Avatar } from './Avatar';

export type LandingCategory = 'inicio' | 'pacientes' | 'practica' | 'biblioteca' | 'offline' | 'patient';

interface LandingPageProps {
  clients: ClientProfile[];
  pendingTasks: number;
  overdueAccounts: number;
  activeClient: ClientProfile | null;
  onSelectCategory: (cat: LandingCategory) => void;
  onEnterActivePatient: () => void;
  coachName: string;
}

function ThemeToggleSmall() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Activar tema oscuro' : 'Activar tema claro'}
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border bg-surface-muted border-surface-strong text-secondary-fg hover:text-primary-fg hover:border-brand-soft transition font-mono text-[10px] uppercase tracking-wider"
    >
      {isLight ? <Moon size={13} aria-hidden="true" /> : <Sun size={13} aria-hidden="true" />}
      <span className="hidden sm:inline">{isLight ? 'Noche' : 'Día'}</span>
    </button>
  );
}

export default function LandingPage({
  clients,
  pendingTasks,
  overdueAccounts,
  activeClient,
  onSelectCategory,
  onEnterActivePatient,
  coachName
}: LandingPageProps) {
  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  const todayLabel = today.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="h-screen bg-surface-base text-primary-fg flex flex-col overflow-y-auto">

      {/* HEADER mínimo */}
      <header className="px-4 md:px-8 py-3 flex items-center justify-between border-b border-surface-soft shrink-0">
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/mankind-logo.png"
            alt="MankindFactory"
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-surface-strong shadow-lg shrink-0"
          />
          <div>
            <span className="font-sans font-black text-base tracking-tight leading-none text-brand">
              MANKIND<span className="text-primary-fg">FACTORY</span>
            </span>
            <p className="font-mono text-[8px] tracking-widest text-faint-fg uppercase mt-0.5">
              Routine Workspace · v5.5
            </p>
          </div>
        </div>
        <ThemeToggleSmall />
      </header>

      {/* CONTENIDO PRINCIPAL — usa flex-1 con padding ajustado para caber en viewport */}
      <section className="flex-1 flex flex-col justify-center px-4 md:px-8 py-4 md:py-6 gap-4 md:gap-5 max-w-7xl mx-auto w-full">

        {/* HERO compacto */}
        <div className="space-y-1.5 text-center md:text-left shrink-0">
          <div className="inline-flex items-center gap-1.5 bg-brand-soft border border-brand-soft px-2.5 py-0.5 rounded-full">
            <Sparkles size={10} className="text-brand" aria-hidden="true" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-brand">Centro de práctica clínica</span>
          </div>
          <h1 className="font-sans font-black text-2xl md:text-4xl tracking-tight text-primary-fg leading-none">
            {greeting}, <span className="text-brand">{coachName.split(' ')[0]}</span>.
          </h1>
          <p className="text-muted-fg font-mono text-xs normal-case">
            {todayLabel} · {clients.length} {clients.length === 1 ? 'paciente en cartera' : 'pacientes en cartera'}
            {pendingTasks > 0 && <span className="text-[#FFB020]"> · {pendingTasks} {pendingTasks === 1 ? 'tarea' : 'tareas'}</span>}
            {overdueAccounts > 0 && <span className="text-[#FF3C00]"> · {overdueAccounts} {overdueAccounts === 1 ? 'cuenta vencida' : 'cuentas vencidas'}</span>}
          </p>
        </div>

        {/* TILES — 5 columnas en desktop, 2 en tablet, 1 en mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 flex-1 max-h-[420px]">
          <CategoryTile
            icon={<HomeIcon size={22} className="text-brand" />}
            title="Inicio"
            subtitle="Resumen del día"
            description="Tareas y agenda."
            accent={pendingTasks > 0 ? `${pendingTasks} pend.` : 'al día'}
            accentTone={pendingTasks > 0 ? 'warning' : 'success'}
            onClick={() => onSelectCategory('inicio')}
          />
          <CategoryTile
            icon={<Briefcase size={22} className="text-brand" />}
            title="Práctica"
            subtitle="Gestión clínica y comercial"
            description="KPIs, cobros, plantillas, contenido."
            accent={overdueAccounts > 0 ? `${overdueAccounts} venc.` : 'al día'}
            accentTone={overdueAccounts > 0 ? 'urgent' : 'success'}
            onClick={() => onSelectCategory('practica')}
          />
          <CategoryTile
            icon={<Users size={22} className="text-brand" />}
            title="Pacientes"
            subtitle="Cartera completa"
            description="Tabla con estatus y tareas."
            accent={`${clients.length} ${clients.length === 1 ? 'activo' : 'activos'}`}
            accentTone="neutral"
            onClick={() => onSelectCategory('pacientes')}
          />
          <CategoryTile
            icon={<Library size={22} className="text-brand" />}
            title="Biblioteca"
            subtitle="Movimientos NSCA + personales"
            description="Ejercicios, técnica, warnings clínicos."
            accent="referencia"
            accentTone="neutral"
            onClick={() => onSelectCategory('biblioteca')}
          />
          <CategoryTile
            icon={<HardDrive size={22} className="text-brand" />}
            title="Datos y Respaldos"
            subtitle="Backups y almacenamiento"
            description="Exportar/importar, instalar PWA."
            accent="local"
            accentTone="neutral"
            onClick={() => onSelectCategory('offline')}
          />
        </div>

        {/* ATAJO AL PACIENTE ACTIVO — compacto */}
        {activeClient && (
          <button
            type="button"
            onClick={onEnterActivePatient}
            className="w-full bg-surface-card border border-surface-strong hover:border-brand-soft rounded-xl p-3 transition group flex items-center justify-between gap-3 shrink-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar name={activeClient.name} dataUrl={activeClient.avatarDataUrl} size={36} />
              <div className="text-left min-w-0">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-faint-fg">Último paciente abierto</span>
                <span className="block font-sans font-bold text-sm text-primary-fg truncate">{activeClient.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-brand font-mono text-[10px] uppercase tracking-wider font-bold shrink-0">
              <UserCheck size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Continuar</span>
              <ArrowRight size={13} aria-hidden="true" className="group-hover:translate-x-1 transition" />
            </div>
          </button>
        )}
      </section>

      {/* FOOTER mínimo */}
      <footer className="border-t border-surface-soft py-2.5 text-center font-mono text-[10px] text-faint-fg uppercase tracking-widest shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-1.5">
          <p className="text-secondary-fg font-bold normal-case tracking-normal text-[10px]">
            Plataforma desarrollada para <span className="text-brand">Alberto Maturana S.</span> · Interno de último año de Medicina
          </p>
          <span className="text-brand text-[9px]">● Workspace Local</span>
        </div>
      </footer>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Tile de categoría — compacto, sin padding excesivo
 * ----------------------------------------------------------------------- */

interface CategoryTileProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  accentTone: 'neutral' | 'success' | 'warning' | 'urgent';
  onClick: () => void;
}

function CategoryTile({ icon, title, subtitle, description, accent, accentTone, onClick }: CategoryTileProps) {
  const accentColor = accentTone === 'success' ? 'text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10'
    : accentTone === 'warning' ? 'text-[#FFB020] border-[#FFB020]/40 bg-[#FFB020]/10'
    : accentTone === 'urgent' ? 'text-[#FF3C00] border-[#FF3C00]/40 bg-[#FF3C00]/10'
    : 'text-faint-fg border-surface-strong bg-surface-muted';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative bg-surface-card border border-surface-strong hover:border-brand-soft rounded-xl p-4 text-left transition overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#5D36FF]/40 flex flex-col"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="p-2 bg-brand-soft border border-brand-soft rounded-lg">
          {icon}
        </div>
        <span className={`text-[8px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${accentColor} normal-case`}>
          {accent}
        </span>
      </div>

      <div className="space-y-0.5 flex-1">
        <span className="block font-mono text-[9px] uppercase tracking-wider text-faint-fg">{subtitle}</span>
        <h2 className="font-sans font-black text-lg lg:text-xl tracking-tight text-primary-fg leading-tight">{title}</h2>
        <p className="text-[11px] text-muted-fg leading-relaxed normal-case font-mono mt-1">{description}</p>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-brand font-mono text-[9px] uppercase tracking-wider font-bold pt-2 border-t border-surface-soft mt-3">
        <span>Entrar</span>
        <ArrowRight size={11} aria-hidden="true" className="group-hover:translate-x-1 transition" />
      </div>
    </button>
  );
}

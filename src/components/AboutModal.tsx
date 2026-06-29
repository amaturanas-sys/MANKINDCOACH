/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal "Acerca de" con:
 * - Atajos de teclado completos
 * - Guía de uso rápida
 * - Versión y créditos
 * - Datos técnicos (schema version, browser, almacenamiento)
 */

import React, { useEffect, useState } from 'react';
import {
  X, Keyboard, BookOpen, Info, Dumbbell, Heart, Sparkles, ExternalLink
} from 'lucide-react';
import { SCHEMA_VERSION } from '../constants';
import { detectBrowser, isStandalone, getStorageEstimate, formatBytes } from '../lib/pwa';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

interface StorageInfo {
  usage: number;
  quota: number;
  usagePct: number;
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    if (!open) return;
    getStorageEstimate().then(setStorageInfo);
  }, [open]);

  /* Cerrar con Esc */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const browser = detectBrowser();
  const standalone = isStandalone();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Acerca de MankindFactory"
      className="fixed inset-0 z-[250] flex items-start justify-center pt-[5vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-3xl bg-surface-card border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="border-b border-zinc-800 p-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5D36FF] text-white rounded-lg shadow-lg">
              <Dumbbell size={22} className="rotate-[-12deg]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-sans font-black text-xl tracking-tight text-primary-fg">
                MANKIND<span className="text-brand">FACTORY</span>
                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-brand-soft text-brand rounded">
                  v5.7
                </span>
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint-fg mt-0.5">
                Routine Workspace · Práctica clínica
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-primary-fg transition"
            aria-label="Cerrar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-7">

          {/* Atajos */}
          <section>
            <h3 className="font-sans font-bold text-sm text-primary-fg uppercase tracking-wider flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
              <Keyboard size={14} className="text-brand" aria-hidden="true" /> Atajos de teclado
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
              <ShortcutRow keys={['Cmd', 'K']} label="Búsqueda global / paleta de comandos" />
              <ShortcutRow keys={['/']} label="Búsqueda global (alternativo)" />
              <ShortcutRow keys={['G', 'H']} label="Ir a Inicio" />
              <ShortcutRow keys={['G', 'R']} label="Ir a Práctica" />
              <ShortcutRow keys={['G', 'P']} label="Ir a Pacientes" />
              <ShortcutRow keys={['G', 'D']} label="Ir a Datos y Respaldos" />
              <ShortcutRow keys={['G', 'L']} label="Volver a pantalla principal" />
              <ShortcutRow keys={['N']} label="Crear nuevo paciente" />
              <ShortcutRow keys={['?']} label="Mostrar este diálogo" />
              <ShortcutRow keys={['Esc']} label="Cerrar modal o popover" />
            </div>
            <p className="text-[10px] font-mono text-faint-fg mt-3 leading-relaxed">
              Los atajos <strong className="text-primary-fg">G+letra</strong> se activan presionando G y luego la letra (estilo Gmail).
              No funcionan mientras escribes en un campo de texto.
            </p>
          </section>

          {/* Guía rápida */}
          <section>
            <h3 className="font-sans font-bold text-sm text-primary-fg uppercase tracking-wider flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
              <BookOpen size={14} className="text-brand" aria-hidden="true" /> Guía rápida de uso
            </h3>
            <div className="space-y-3 text-[12px] text-secondary-fg leading-relaxed">
              <Step n="1" title="Configura tu catálogo de servicios">
                Práctica → Catálogo: define los precios de evaluación, controles mensuales, packs.
              </Step>
              <Step n="2" title="Crea tus pacientes">
                Pacientes → "Nuevo paciente", o usa el atajo <Kbd>N</Kbd>. Llena sus datos en la Ficha.
              </Step>
              <Step n="3" title="Asigna plan comercial a cada paciente">
                Ficha → Datos del paciente → Práctica (monto, cadencia, próximo cobro). Esto activa las deudas automáticas.
              </Step>
              <Step n="4" title="Programa sus rutinas">
                Planificador → arrastra pautas de la biblioteca al calendario, o usa el planificador rápido.
              </Step>
              <Step n="5" title="Registra controles y pagos">
                Ficha → Timeline de sesiones (controles) y Libro de pagos (cobros con autocálculo del siguiente).
              </Step>
              <Step n="6" title="Comunícate con plantillas">
                Práctica → Plantillas: copia con un click los datos del paciente reemplazados automáticamente.
              </Step>
              <Step n="7" title="Respalda regularmente">
                Datos y Respaldos → Backup completo (.json). Guarda el archivo en Drive/iCloud.
              </Step>
            </div>
          </section>

          {/* Datos técnicos */}
          <section>
            <h3 className="font-sans font-bold text-sm text-primary-fg uppercase tracking-wider flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
              <Info size={14} className="text-brand" aria-hidden="true" /> Información técnica
            </h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
              <TechRow label="Versión" value="v5.7" />
              <TechRow label="Schema de datos" value={`v${SCHEMA_VERSION}`} />
              <TechRow label="Modo de ejecución" value={standalone ? 'PWA instalada' : 'Navegador'} />
              <TechRow label="Navegador detectado" value={browser} />
              <TechRow
                label="Almacenamiento usado"
                value={storageInfo ? `${formatBytes(storageInfo.usage)} de ${formatBytes(storageInfo.quota)}` : 'Calculando...'}
              />
              <TechRow
                label="Protocolo"
                value={typeof window !== 'undefined' ? window.location.protocol : '—'}
              />
            </dl>
          </section>

          {/* Créditos */}
          <section className="bg-brand-soft border border-brand-soft rounded-lg p-4 space-y-2">
            <h3 className="font-sans font-bold text-sm text-primary-fg flex items-center gap-2">
              <Sparkles size={14} className="text-brand" aria-hidden="true" /> Acerca de esta plataforma
            </h3>
            <p className="text-[12px] text-secondary-fg leading-relaxed">
              Plataforma desarrollada para <strong className="text-brand">Alberto Maturana S.</strong>, interno de último año de Medicina, para la gestión integral de su práctica clínico-deportiva.
            </p>
            <p className="text-[11px] text-muted-fg leading-relaxed font-mono normal-case">
              Sistema de prescripción de cargas basado en NSCA (National Strength and Conditioning Association). Datos almacenados localmente en tu navegador. Privacidad por defecto.
            </p>
            <div className="flex items-center gap-1.5 pt-2 text-[10px] font-mono text-faint-fg">
              <Heart size={11} className="text-[#FF6B35]" aria-hidden="true" />
              <span>MankindFactory WorkSpace Lab Co.</span>
            </div>
          </section>

          {/* Privacidad */}
          <section className="text-[11px] font-mono text-faint-fg leading-relaxed border-t border-zinc-800 pt-4">
            <p>
              <strong className="text-primary-fg">100% local · sin servidores · sin tracking externo.</strong>
              {' '}Todos tus datos (pacientes, pagos, notas, plantillas) viven en tu navegador en este equipo. Si limpias el storage del navegador o cambias de equipo, tus datos se pierden a menos que hayas hecho un backup. Recomendado: exportar backup al menos semanalmente.
            </p>
            <p className="mt-2 flex items-center gap-1.5">
              <ExternalLink size={10} aria-hidden="true" />
              <span>Para reportar bugs o sugerir mejoras, contacta directamente al desarrollador.</span>
            </p>
          </section>
        </div>

        {/* FOOTER */}
        <div className="border-t border-zinc-800 px-5 py-3 flex items-center justify-between bg-surface-muted">
          <p className="text-[10px] font-mono text-faint-fg">
            Presiona <Kbd>?</Kbd> en cualquier momento para abrir este diálogo
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-brand hover:bg-[#4A22F0] text-white rounded font-mono text-[10px] uppercase tracking-wider font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Helpers UI
 * ----------------------------------------------------------------------- */

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-900/50">
      <span className="text-secondary-fg">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-faint-fg text-[10px]">luego</span>}
            <Kbd>{k}</Kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center font-mono text-xs font-bold">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <h4 className="font-sans font-bold text-[13px] text-primary-fg">{title}</h4>
        <p className="text-[12px] text-muted-fg mt-0.5 leading-relaxed normal-case">{children}</p>
      </div>
    </div>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-faint-fg">{label}</dt>
      <dd className="font-mono text-[11px] text-primary-fg font-bold">{value}</dd>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded border border-zinc-700 bg-zinc-900 text-secondary-fg font-mono text-[10px] font-bold shadow-sm">
      {children}
    </kbd>
  );
}

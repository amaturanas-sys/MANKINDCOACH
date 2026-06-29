/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  Dumbbell,
  Target,
  Activity,
  Check,
  Flame,
  Scale,
  HeartPulse,
  Stethoscope,
  Pill,
  Ruler,
  Calculator,
  Send,
  Download,
  Upload,
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  Instagram,
  MapPin,
  AlertOctagon,
  Copy as CopyIcon
} from 'lucide-react';
import {
  ClientProfile, PatientMetrics, Sex, ActivityLevel, MetricSample, PaymentRecord,
  ServiceCatalogItem, SessionNote, ScheduledRoutine
} from '../types';
import {
  EQUIPMENT_OPTIONS,
  computeBmi,
  bmiCategory,
  computeBmr,
  computeTdee,
  activityLabel,
  sexLabel
} from '../constants';
import { intakeFormHtml, progressReportHtml } from '../lib/coachForms';
import { applyIntake, applyProgress } from '../lib/intakeImporter';
import { patientDossierHtml, downloadBlob } from '../lib/exporters';
import PaymentLedger from './PaymentLedger';
import { AvatarUploader } from './Avatar';
import SessionNotesPanel from './SessionNotesPanel';

interface PreambleTabProps {
  profile: ClientProfile;
  onUpdateProfile: (profile: ClientProfile) => void;
  /** Callback opcional para registrar un nuevo MetricSample al importar JSON. */
  onAddMetricSample?: (sample: MetricSample) => void;
  /** Nombre del coach que aparece en los formularios generados. */
  coachName?: string;
  /** Pagos del paciente activo (ya filtrados). */
  payments?: PaymentRecord[];
  /** Catálogo de servicios global. */
  services?: ServiceCatalogItem[];
  /** Callbacks para gestionar pagos. */
  onAddPayment?: (p: PaymentRecord) => void;
  onRemovePayment?: (id: string) => void;
  /** Timeline de sesiones */
  sessionNotes?: SessionNote[];
  onAddSessionNote?: (n: SessionNote) => void;
  onUpdateSessionNote?: (n: SessionNote) => void;
  onRemoveSessionNote?: (id: string) => void;
  /** Contexto para expediente */
  allMetricSamples?: MetricSample[];
  allPayments?: PaymentRecord[];
  allSessionNotes?: SessionNote[];
  scheduledRoutines?: ScheduledRoutine[];
}

export default function PreambleTab({
  profile,
  onUpdateProfile,
  onAddMetricSample,
  coachName = 'MankindFactory Elite Lab',
  payments = [],
  services = [],
  onAddPayment,
  onRemovePayment,
  sessionNotes = [],
  onAddSessionNote,
  onUpdateSessionNote,
  onRemoveSessionNote,
  allMetricSamples = [],
  allPayments = [],
  allSessionNotes = [],
  scheduledRoutines = []
}: PreambleTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ClientProfile>(profile);
  useEffect(() => { setDraft(profile); }, [profile]);

  const commit = (updated: ClientProfile) => {
    setDraft(updated);
    onUpdateProfile(updated);
  };

  const updateField = <K extends keyof ClientProfile>(key: K, value: ClientProfile[K]) => {
    commit({ ...draft, [key]: value });
  };

  const updateMetric = <K extends keyof PatientMetrics>(key: K, value: PatientMetrics[K]) => {
    commit({ ...draft, metrics: { ...draft.metrics, [key]: value } });
  };

  const updateClinical = (key: keyof ClientProfile['clinical'], value: string) => {
    commit({ ...draft, clinical: { ...draft.clinical, [key]: value } });
  };

  const updateGoal = (key: keyof ClientProfile['goals'], value: string) => {
    commit({ ...draft, goals: { ...draft.goals, [key]: value } });
  };

  const handleCheckboxChange = (eq: string) => {
    const equipment = draft.equipment.includes(eq)
      ? draft.equipment.filter(e => e !== eq)
      : [...draft.equipment, eq];
    commit({ ...draft, equipment });
  };

  const bmi = useMemo(() => computeBmi(draft.metrics.weightKg, draft.metrics.heightCm), [draft.metrics.weightKg, draft.metrics.heightCm]);
  const bmiCat = useMemo(() => bmiCategory(bmi), [bmi]);
  const bmr = useMemo(() => computeBmr(draft.metrics), [draft.metrics]);
  const tdee = useMemo(() => computeTdee(draft.metrics), [draft.metrics]);

  return (
    <div id="preamble_container" className="space-y-8">
      <div id="welcome_bento" className="relative overflow-hidden bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#5D36FF]/5 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="space-y-3 z-10">
          <div className="inline-flex items-center gap-2 bg-[#5D36FF]/10 border border-[#5D36FF]/30 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#5D36FF] animate-pulse" aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#5D36FF]">Ficha clínica del paciente</span>
          </div>
          <h1 className="font-sans font-black text-4xl tracking-tight text-[#5D36FF] md:text-5xl">
            MANKIND<span className="text-white">FACTORY</span>
          </h1>
          <p className="text-zinc-400 font-mono text-sm max-w-xl">
            Workspace clínico-deportivo. Define datos antropométricos, rendimiento base, antecedentes y objetivos antes de prescribir la pauta.
          </p>
        </div>
        <button
          id="toggle_edit_btn"
          onClick={() => setIsEditing(prev => !prev)}
          aria-pressed={isEditing}
          className={`px-5 py-2.5 font-mono text-xs uppercase tracking-wider rounded-lg font-bold transition-all duration-300 border ${
            isEditing
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-600'
              : 'bg-[#5D36FF] hover:bg-[#4A22F0] text-white border-transparent hover:scale-[1.02]'
          }`}
        >
          {isEditing ? '✓ Finalizar Edición' : '⚙ Modificar Ficha'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">

          {/* IDENTIFICACIÓN */}
          <Section icon={<User size={22} className="text-[#5D36FF]" />} title="Identificación del Atleta">
            <div className="space-y-5">
              {/* Foto del paciente */}
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4">
                <span className="block text-[10px] uppercase text-zinc-500 tracking-wider font-mono font-bold mb-3">Foto del paciente</span>
                <AvatarUploader
                  name={draft.name}
                  dataUrl={draft.avatarDataUrl}
                  onChange={(next) => commit({ ...draft, avatarDataUrl: next })}
                  size={96}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Nombre Completo">
                  <Input disabled={!isEditing} value={draft.name} onChange={v => updateField('name', v)} placeholder="Ej: Juan Pérez" />
                </Field>
                <Field label="Nivel de Experiencia">
                  <Select disabled={!isEditing} value={draft.experienceLevel} onChange={v => updateField('experienceLevel', v as ClientProfile['experienceLevel'])}>
                    <option value="principiante">Principiante (Adaptación Anatómica)</option>
                    <option value="intermedio">Intermedio (Hipertrofia/Fuerza base)</option>
                    <option value="avanzado">Avanzado (Sobrecarga Específica)</option>
                    <option value="elite">Elite (Súpercompensación / Competición)</option>
                  </Select>
                </Field>
                <Field label="Foco General del Entrenamiento" full>
                  <Textarea disabled={!isEditing} value={draft.focus} onChange={v => updateField('focus', v)} rows={2} />
                </Field>
              </div>
            </div>
          </Section>

          {/* DATOS DE CONTACTO */}
          <Section icon={<Phone size={22} className="text-[#5D36FF]" />} title="Datos de Contacto" hint="Comunicación directa con el paciente">
            <ContactBlock profile={draft} isEditing={isEditing} onChange={(patch) => commit({ ...draft, practice: { ...(draft.practice ?? {}), ...patch } })} />
          </Section>

          {/* MÉTRICAS DEL PACIENTE — antropometría + rendimiento */}
          <Section
            icon={<Ruler size={22} className="text-[#5D36FF]" />}
            title="Métricas del Paciente"
            hint="Antropometría + Rendimiento Base"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <Metric icon={<Scale size={12} />} label="Peso (kg)">
                <NumberInput disabled={!isEditing} value={draft.metrics.weightKg} onChange={v => updateMetric('weightKg', v)} placeholder="80" />
              </Metric>
              <Metric icon={<Ruler size={12} />} label="Talla (cm)">
                <NumberInput disabled={!isEditing} value={draft.metrics.heightCm} onChange={v => updateMetric('heightCm', v)} placeholder="178" />
              </Metric>
              <Metric icon={<HeartPulse size={12} />} label="Edad (años)">
                <NumberInput disabled={!isEditing} value={draft.metrics.age} onChange={v => updateMetric('age', v)} placeholder="30" />
              </Metric>
              <Metric icon={<User size={12} />} label="Sexo">
                <SelectInline disabled={!isEditing} value={draft.metrics.sex ?? ''} onChange={v => updateMetric('sex', (v || undefined) as Sex | undefined)}>
                  <option value="">—</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </SelectInline>
              </Metric>

              <Metric icon={<Activity size={12} />} label="Nivel de Actividad" wide>
                <SelectInline disabled={!isEditing} value={draft.metrics.activityLevel ?? ''} onChange={v => updateMetric('activityLevel', (v || undefined) as ActivityLevel | undefined)}>
                  <option value="">—</option>
                  <option value="sedentario">Sedentario (sin ejercicio)</option>
                  <option value="ligero">Ligero (1-3 sesiones/semana)</option>
                  <option value="moderado">Moderado (3-5 sesiones/semana)</option>
                  <option value="intenso">Intenso (6-7 sesiones/semana)</option>
                  <option value="muy_intenso">Muy intenso (2 sesiones/día)</option>
                </SelectInline>
              </Metric>

              <Metric icon={<Scale size={12} />} label="Grasa (%)">
                <NumberInput disabled={!isEditing} value={draft.metrics.fatPercentage} onChange={v => updateMetric('fatPercentage', v)} placeholder="14" step={0.1} />
              </Metric>
            </div>

            {/* Cálculos derivados */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <DerivedCard
                icon={<Calculator size={14} />}
                label="IMC (kg/m²)"
                value={bmi !== null ? bmi.toFixed(1) : '—'}
                hint={bmiCat ? bmiCat.label : 'Peso o talla incompletos'}
                hintColor={bmiCat?.color}
              />
              <DerivedCard
                icon={<Flame size={14} />}
                label="Benedict TMB"
                value={bmr !== null ? `${bmr} kcal` : '—'}
                hint="Metabolismo basal en reposo"
              />
              <DerivedCard
                icon={<Flame size={14} />}
                label="Calorías diarias (TDEE)"
                value={tdee !== null ? `${tdee} kcal` : '—'}
                hint={`Factor: ${activityLabel(draft.metrics.activityLevel)}`}
              />
            </div>

            <div className="border-t border-zinc-800 pt-5 mt-2">
              <p className="text-[10px] uppercase font-mono text-zinc-500 mb-3 tracking-wider font-bold">Rendimiento base</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <Metric icon={<Flame size={12} />} label="1RM Press Banca (kg)">
                  <NumberInput disabled={!isEditing} value={draft.metrics.benchPress1RM} onChange={v => updateMetric('benchPress1RM', v)} placeholder="100" />
                </Metric>
                <Metric icon={<Flame size={12} />} label="1RM Sentadilla (kg)">
                  <NumberInput disabled={!isEditing} value={draft.metrics.squat1RM} onChange={v => updateMetric('squat1RM', v)} placeholder="140" />
                </Metric>
                <Metric icon={<Flame size={12} />} label="1RM Peso Muerto (kg)">
                  <NumberInput disabled={!isEditing} value={draft.metrics.deadlift1RM} onChange={v => updateMetric('deadlift1RM', v)} placeholder="180" />
                </Metric>
                <Metric icon={<Activity size={12} />} label="Pull-Ups Máx (reps)">
                  <NumberInput disabled={!isEditing} value={draft.metrics.pullUpMaxReps} onChange={v => updateMetric('pullUpMaxReps', v)} placeholder="12" />
                </Metric>
                <Metric icon={<Activity size={12} />} label="400m (segundos)">
                  <NumberInput disabled={!isEditing} value={draft.metrics.run400mSeconds} onChange={v => updateMetric('run400mSeconds', v)} placeholder="75" />
                </Metric>
                <Metric icon={<HeartPulse size={12} />} label="VO2 Máx (ml/kg/min)" wide>
                  <NumberInput disabled={!isEditing} value={draft.metrics.vo2Max} onChange={v => updateMetric('vo2Max', v)} placeholder="45" />
                </Metric>
                <div className="col-span-2 sm:col-span-3 lg:col-span-3">
                  <Field label="Otras métricas / observaciones">
                    <Input disabled={!isEditing} value={draft.metrics.otherMetrics ?? ''} onChange={v => updateMetric('otherMetrics', v)} placeholder="Ratios, marcas extra…" />
                  </Field>
                </div>
              </div>
            </div>
          </Section>

          {/* ANTECEDENTES CLÍNICOS */}
          <Section icon={<Stethoscope size={22} className="text-[#5D36FF]" />} title="Antecedentes Clínicos" hint="Historia médica relevante">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Antecedentes mórbidos">
                <Textarea disabled={!isEditing} value={draft.clinical.morbidities ?? ''} onChange={v => updateClinical('morbidities', v)} rows={2} placeholder="HTA, DM2, asma, dislipidemia…" />
              </Field>
              <Field label="Medicamentos en curso">
                <Textarea disabled={!isEditing} value={draft.clinical.medications ?? ''} onChange={v => updateClinical('medications', v)} rows={2} placeholder="Dosis y frecuencia" icon={<Pill size={11} />} />
              </Field>
              <Field label="Alergias">
                <Input disabled={!isEditing} value={draft.clinical.allergies ?? ''} onChange={v => updateClinical('allergies', v)} placeholder="Penicilina, AINEs…" />
              </Field>
              <Field label="Cirugías previas">
                <Input disabled={!isEditing} value={draft.clinical.surgeries ?? ''} onChange={v => updateClinical('surgeries', v)} placeholder="Año + procedimiento" />
              </Field>
              <Field label="Lesiones musculo-esqueléticas" full>
                <Textarea disabled={!isEditing} value={draft.clinical.injuries ?? ''} onChange={v => updateClinical('injuries', v)} rows={2} placeholder="Ej: Manguito rotador derecho 2023, lumbalgia recidivante…" />
              </Field>
              <Field label="Notas adicionales" full>
                <Textarea disabled={!isEditing} value={draft.clinical.notes ?? ''} onChange={v => updateClinical('notes', v)} rows={2} />
              </Field>
            </div>
          </Section>

          {/* OBJETIVOS */}
          <Section icon={<Target size={22} className="text-[#5D36FF]" />} title="Objetivos del Paciente">
            <div className="space-y-4">
              <Field label="Objetivo de rendimiento" hint="Meta deportiva / técnica">
                <Textarea disabled={!isEditing} value={draft.goals.performance ?? ''} onChange={v => updateGoal('performance', v)} rows={2} placeholder="Ej: Subir 1RM peso muerto a 200kg en 3 meses…" />
              </Field>
              <Field label="Objetivo estético" hint="Composición corporal">
                <Textarea disabled={!isEditing} value={draft.goals.aesthetic ?? ''} onChange={v => updateGoal('aesthetic', v)} rows={2} placeholder="Ej: Bajar a 12% grasa manteniendo masa muscular…" />
              </Field>
              <Field label="Objetivo de salud (opcional)" hint="Bienestar / prevención">
                <Textarea disabled={!isEditing} value={draft.goals.health ?? ''} onChange={v => updateGoal('health', v)} rows={2} placeholder="Ej: Reducir lumbalgia, mejorar postura…" />
              </Field>
            </div>
          </Section>

          {/* PRESCRIPCIÓN TÉCNICA */}
          <Section icon={<Target size={22} className="text-[#5D36FF]" />} title="Prescripción Técnica" hint="Pauta general del coach">
            <div className="space-y-4">
              <Field label="Movimientos clave sugeridos">
                <Textarea disabled={!isEditing} value={draft.suggestedMovements} onChange={v => updateField('suggestedMovements', v)} rows={2} />
              </Field>
              <Field label="Dosificación de cargas e intensidades sugeridas">
                <Textarea disabled={!isEditing} value={draft.suggestedLoads} onChange={v => updateField('suggestedLoads', v)} rows={2} />
              </Field>
            </div>
          </Section>
        </div>

        {/* COLUMNA DERECHA: equipamiento */}
        <div className="space-y-8">
          <Section icon={<Dumbbell size={22} className="text-[#5D36FF]" />} title="Equipamiento Disponible">
            <p className="text-xs text-zinc-500 font-mono">
              Selecciona las herramientas accesibles. La biblioteca de ejercicios filtrará sugerencias según el equipo marcado.
            </p>
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-2 scrollbar-thin">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const checked = draft.equipment.includes(eq);
                return (
                  <label
                    key={eq}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border font-mono text-[11px] cursor-pointer transition ${
                      checked
                        ? 'bg-[#5D36FF]/5 border-[#5D36FF]/30 text-white'
                        : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900/60 hover:text-white'
                    } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      disabled={!isEditing}
                      onChange={() => handleCheckboxChange(eq)}
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 border shrink-0 ${
                      checked ? 'bg-[#5D36FF] border-[#5D36FF] text-white' : 'border-zinc-700'
                    }`} aria-hidden="true">
                      {checked && <Check size={11} strokeWidth={3} />}
                    </div>
                    {eq}
                  </label>
                );
              })}
            </div>
            <div className="font-mono text-[10px] text-zinc-500 flex justify-between border-t border-zinc-800 pt-2">
              <span>Seleccionados:</span>
              <span className="text-[#5D36FF] font-bold">{draft.equipment.length} / {EQUIPMENT_OPTIONS.length}</span>
            </div>
          </Section>

          {/* Resumen rápido de la ficha */}
          <Section icon={<HeartPulse size={22} className="text-[#5D36FF]" />} title="Snapshot del Paciente">
            <dl className="grid grid-cols-2 gap-3 font-mono text-[11px]">
              <SummaryItem label="Sexo" value={sexLabel(draft.metrics.sex)} />
              <SummaryItem label="Edad" value={draft.metrics.age ? `${draft.metrics.age} a` : '—'} />
              <SummaryItem label="Talla" value={draft.metrics.heightCm ? `${draft.metrics.heightCm} cm` : '—'} />
              <SummaryItem label="Peso" value={draft.metrics.weightKg ? `${draft.metrics.weightKg} kg` : '—'} />
              <SummaryItem label="IMC" value={bmi !== null ? bmi.toFixed(1) : '—'} accentColor={bmiCat?.color} />
              <SummaryItem label="TDEE" value={tdee !== null ? `${tdee} kcal` : '—'} />
            </dl>
          </Section>
        </div>
      </div>

      {/* Timeline de sesiones */}
      {onAddSessionNote && onUpdateSessionNote && onRemoveSessionNote && (
        <SessionNotesPanel
          clientId={profile.id}
          notes={sessionNotes}
          onAdd={onAddSessionNote}
          onUpdate={onUpdateSessionNote}
          onRemove={onRemoveSessionNote}
        />
      )}

      {/* Libro de pagos del paciente (KPIs, historial, recorder) */}
      {onAddPayment && onRemovePayment && (
        <PaymentLedger
          client={profile}
          payments={payments}
          services={services}
          onAddPayment={onAddPayment}
          onRemovePayment={onRemovePayment}
          onUpdatePractice={onUpdateProfile}
        />
      )}

      {/* Comunicación con el paciente: formularios HTML + importador JSON + expediente */}
      <PatientCommunicationSection
        profile={profile}
        coachName={coachName}
        onUpdateProfile={onUpdateProfile}
        onAddMetricSample={onAddMetricSample}
        allMetricSamples={allMetricSamples}
        allPayments={allPayments}
        allSessionNotes={allSessionNotes}
        scheduledRoutines={scheduledRoutines}
      />
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Comunicación con el paciente (intake / progress / importar)
 * ----------------------------------------------------------------------- */

interface CommunicationProps {
  profile: ClientProfile;
  coachName: string;
  onUpdateProfile: (p: ClientProfile) => void;
  onAddMetricSample?: (s: MetricSample) => void;
  allMetricSamples: MetricSample[];
  allPayments: PaymentRecord[];
  allSessionNotes: SessionNote[];
  scheduledRoutines: ScheduledRoutine[];
}

function PatientCommunicationSection({
  profile, coachName, onUpdateProfile, onAddMetricSample,
  allMetricSamples, allPayments, allSessionNotes, scheduledRoutines
}: CommunicationProps) {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadBlob = (content: string, filename: string, mime = 'text/html') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const slug = profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const downloadIntake = () => {
    const html = intakeFormHtml({ coachName, clientName: profile.name, clientId: profile.id });
    downloadBlob(html, `mankind_intake_${slug}.html`);
    setStatus({ type: 'success', message: `Intake generado para ${profile.name}. Envíalo por correo o WhatsApp.` });
    window.setTimeout(() => setStatus({ type: null, message: '' }), 5000);
  };

  const downloadProgress = () => {
    const html = progressReportHtml({ coachName, clientName: profile.name, clientId: profile.id, lastSnapshot: profile });
    downloadBlob(html, `mankind_progreso_${slug}.html`);
    setStatus({ type: 'success', message: `Reporte de avance generado para ${profile.name}. Envíalo y pídele que lo complete.` });
    window.setTimeout(() => setStatus({ type: null, message: '' }), 5000);
  };

  /* Genera y descarga el expediente completo */
  const downloadDossier = () => {
    const html = patientDossierHtml({
      client: profile,
      metricSamples: allMetricSamples,
      payments: allPayments,
      sessionNotes: allSessionNotes,
      scheduledRoutines,
      coachName
    });
    downloadBlob(html, `mankind_expediente_${slug}.html`);
    setStatus({ type: 'success', message: 'Expediente completo generado. Ábrelo y usa "Imprimir → PDF" del navegador.' });
    window.setTimeout(() => setStatus({ type: null, message: '' }), 5000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(String(ev.target?.result ?? ''));
        if (json.formType === 'intake') {
          const { patchedProfile, newSample } = applyIntake(json, profile);
          onUpdateProfile(patchedProfile);
          if (newSample && onAddMetricSample) onAddMetricSample(newSample);
          setStatus({ type: 'success', message: `Intake aplicado. Perfil actualizado y baseline registrado.` });
        } else if (json.formType === 'progress') {
          const sample = applyProgress(json, profile.id);
          if (onAddMetricSample) onAddMetricSample(sample);
          setStatus({ type: 'success', message: `Reporte de avance importado. Medición agregada al historial del atleta.` });
        } else {
          throw new Error('formType desconocido. Solo se aceptan archivos generados por los formularios MankindFactory.');
        }
      } catch (err) {
        setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Error al procesar el archivo JSON.' });
      }
      window.setTimeout(() => setStatus({ type: null, message: '' }), 7000);
    };
    reader.readAsText(file);
  };

  return (
    <section className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h2 className="font-sans font-bold text-lg text-white tracking-tight uppercase flex items-center gap-2">
          <Send size={18} className="text-[#5D36FF]" aria-hidden="true" /> Comunicación con el paciente
        </h2>
        <span className="font-mono text-[10px] text-zinc-500 uppercase">
          Formularios HTML · Importador JSON
        </span>
      </div>

      {status.type && (
        <div role={status.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-lg border flex items-center gap-3 font-mono text-xs ${
            status.type === 'success'
              ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
          {status.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CommCard icon={<ClipboardList size={18} className="text-[#5D36FF]" />} title="Ficha inicial" subtitle="Enviar una sola vez">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Genera un HTML interactivo con el formulario completo. Al completarlo, el paciente descarga un JSON que vuelves a importar aquí.
          </p>
          <button
            onClick={downloadIntake}
            className="w-full py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
          >
            <Download size={13} aria-hidden="true" /> Descargar HTML
          </button>
        </CommCard>

        <CommCard icon={<Activity size={18} className="text-[#5D36FF]" />} title="Reporte de avance" subtitle="Enviar semanal/mensual">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Genera un HTML con las últimas métricas precargadas. Cada respuesta importada agrega una medición al historial.
          </p>
          <button
            onClick={downloadProgress}
            className="w-full py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
          >
            <Download size={13} aria-hidden="true" /> Descargar HTML
          </button>
        </CommCard>

        <CommCard icon={<Upload size={18} className="text-[#5D36FF]" />} title="Importar respuesta" subtitle="Cargá el JSON del paciente">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Detecta automáticamente si es un intake (sobreescribe la ficha) o un reporte de avance (agrega una medición).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 bg-zinc-900 border border-zinc-800 hover:border-[#5D36FF]/50 hover:bg-[#5D36FF]/10 text-white rounded font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
          >
            <Upload size={13} aria-hidden="true" /> Cargar JSON
          </button>
        </CommCard>
      </div>

      {/* Expediente del paciente */}
      <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div>
          <h3 className="font-sans font-bold text-sm text-white uppercase tracking-tight flex items-center gap-2">
            <FileText size={16} className="text-[#5D36FF]" aria-hidden="true" /> Expediente clínico completo
          </h3>
          <p className="text-[11px] text-zinc-400 font-mono mt-1">
            HTML autocontenido con ficha + mediciones + sesiones + pagos + notas. Imprimible como PDF desde el navegador.
          </p>
        </div>
        <button
          onClick={downloadDossier}
          className="py-2.5 px-5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2 shrink-0"
        >
          <Download size={13} aria-hidden="true" /> Descargar expediente
        </button>
      </div>

      <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-4 space-y-2">
        <h3 className="font-mono text-[10px] uppercase text-[#5D36FF] tracking-wider font-bold flex items-center gap-2">
          <FileText size={12} aria-hidden="true" /> Flujo recomendado
        </h3>
        <ol className="text-[11px] text-zinc-400 space-y-1 font-mono leading-relaxed list-decimal list-inside">
          <li>Descarga la <strong className="text-white">Ficha inicial</strong> y envíasela al paciente.</li>
          <li>El paciente la completa en su navegador y te devuelve un JSON.</li>
          <li>Cargas el JSON aquí y la ficha del paciente se llena automáticamente.</li>
          <li>Cada semana/mes, repite con <strong className="text-white">Reporte de avance</strong> para nutrir la curva de evolución.</li>
        </ol>
      </div>
    </section>
  );
}

function CommCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-sans font-bold text-sm text-white uppercase tracking-tight">{title}</h3>
        </div>
        {subtitle && <span className="font-mono text-[8px] uppercase text-zinc-500 tracking-wider">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Componentes utilitarios
 * ----------------------------------------------------------------------- */

const inputCls = 'w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-[#5D36FF] disabled:opacity-60 transition';

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="font-sans font-bold text-lg text-white tracking-tight uppercase">{title}</h2>
        </div>
        {hint && <span className="font-mono text-[11px] text-zinc-500 uppercase">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${full ? 'md:col-span-2' : ''}`}>
      <div className="flex justify-between items-center">
        <label className="font-mono text-xs text-zinc-400 uppercase tracking-wider">{label}</label>
        {hint && <span className="text-[10px] text-zinc-500 font-mono">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Metric({ icon, label, wide, children }: { icon: React.ReactNode; label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800/80 rounded-lg p-3 space-y-1 ${wide ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
        <span className="text-zinc-400" aria-hidden="true">{icon}</span>
        {label}
      </div>
      {children}
    </div>
  );
}

function DerivedCard({ icon, label, value, hint, hintColor }: { icon: React.ReactNode; label: string; value: string; hint?: string; hintColor?: string }) {
  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-[#5D36FF]/30 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#5D36FF] uppercase tracking-wider">
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <p className="text-white text-xl font-black font-sans">{value}</p>
      {hint && <p className="font-mono text-[9px] uppercase tracking-wider" style={{ color: hintColor || '#71717a' }}>{hint}</p>}
    </div>
  );
}

function SummaryItem({ label, value, accentColor }: { label: string; value: string; accentColor?: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-md p-2">
      <dt className="text-[8.5px] uppercase text-zinc-500 tracking-wider">{label}</dt>
      <dd className="text-sm font-bold mt-0.5" style={{ color: accentColor || '#fff' }}>{value}</dd>
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputCls}
    />
  );
}

function NumberInput({ value, onChange, placeholder, disabled, step }: { value?: number; onChange: (v: number | undefined) => void; placeholder?: string; disabled?: boolean; step?: number }) {
  return (
    <input
      type="number"
      step={step ?? 'any'}
      value={typeof value === 'number' ? value : ''}
      onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-transparent border-b border-zinc-800 hover:border-zinc-700 focus:border-[#5D36FF] focus:outline-none text-white font-mono text-base py-1 disabled:opacity-60 transition"
    />
  );
}

function Textarea({ value, onChange, placeholder, rows, disabled, icon }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3 top-3 text-zinc-600 pointer-events-none">{icon}</span>}
      <textarea
        rows={rows ?? 2}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${inputCls} resize-none ${icon ? 'pl-9' : ''}`}
      />
    </div>
  );
}

function Select({ value, onChange, disabled, children }: { value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={inputCls}>
      {children}
    </select>
  );
}

function SelectInline({ value, onChange, disabled, children }: { value: string; onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-transparent border-b border-zinc-800 hover:border-zinc-700 focus:border-[#5D36FF] focus:outline-none text-white font-mono text-sm py-1 disabled:opacity-60 transition"
    >
      {children}
    </select>
  );
}

/* ----------------------------------------------------------------------- *
 * Bloque "Datos de Contacto"
 * ----------------------------------------------------------------------- */

interface ContactBlockProps {
  profile: ClientProfile;
  isEditing: boolean;
  onChange: (patch: Partial<NonNullable<ClientProfile['practice']>>) => void;
}

function ContactBlock({ profile, isEditing, onChange }: ContactBlockProps) {
  const p = profile.practice ?? {};

  const copyToClipboard = async (text: string) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch { /* noop */ }
  };

  const openWhatsapp = () => {
    if (!p.phone) return;
    /* normaliza el número (quita espacios, paréntesis y guiones) */
    const num = p.phone.replace(/[\s()\-+]/g, '');
    window.open(`https://wa.me/${num}`, '_blank', 'noopener');
  };

  const openMail = () => {
    if (!p.email) return;
    window.open(`mailto:${p.email}`, '_blank', 'noopener');
  };

  const openInstagram = () => {
    if (!p.instagram) return;
    const handle = p.instagram.replace(/^@/, '');
    window.open(`https://instagram.com/${handle}`, '_blank', 'noopener');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ContactField
        icon={<Phone size={14} className="text-[#5D36FF]" />}
        label="Teléfono / WhatsApp"
        value={p.phone ?? ''}
        placeholder="+56 9 1234 5678"
        disabled={!isEditing}
        onChange={(v) => onChange({ phone: v })}
        action={p.phone ? { label: 'WhatsApp', icon: <Send size={11} />, onClick: openWhatsapp, color: 'text-[#10B981] border-[#10B981]/40 hover:bg-[#10B981]/10' } : undefined}
        canCopy={!!p.phone}
        onCopy={() => copyToClipboard(p.phone ?? '')}
      />
      <ContactField
        icon={<Mail size={14} className="text-[#5D36FF]" />}
        label="Email"
        value={p.email ?? ''}
        placeholder="paciente@correo.com"
        disabled={!isEditing}
        onChange={(v) => onChange({ email: v })}
        action={p.email ? { label: 'Abrir mail', icon: <Send size={11} />, onClick: openMail, color: 'text-[#5D36FF] border-[#5D36FF]/40 hover:bg-[#5D36FF]/10' } : undefined}
        canCopy={!!p.email}
        onCopy={() => copyToClipboard(p.email ?? '')}
      />
      <ContactField
        icon={<Instagram size={14} className="text-[#5D36FF]" />}
        label="Instagram (sin @)"
        value={p.instagram ?? ''}
        placeholder="usuario"
        disabled={!isEditing}
        onChange={(v) => onChange({ instagram: v })}
        action={p.instagram ? { label: 'Abrir perfil', icon: <Send size={11} />, onClick: openInstagram, color: 'text-[#FF6B35] border-[#FF6B35]/40 hover:bg-[#FF6B35]/10' } : undefined}
        canCopy={!!p.instagram}
        onCopy={() => copyToClipboard(p.instagram ?? '')}
      />
      <ContactField
        icon={<MapPin size={14} className="text-[#5D36FF]" />}
        label="Dirección / ciudad"
        value={p.address ?? ''}
        placeholder="Las Condes, Santiago"
        disabled={!isEditing}
        onChange={(v) => onChange({ address: v })}
        canCopy={!!p.address}
        onCopy={() => copyToClipboard(p.address ?? '')}
      />
      <div className="md:col-span-2">
        <ContactField
          icon={<AlertOctagon size={14} className="text-[#FFB020]" />}
          label="Contacto de emergencia (nombre · relación · teléfono)"
          value={p.emergencyContact ?? ''}
          placeholder="Ej: María Pérez · hermana · +56 9 8888 7777"
          disabled={!isEditing}
          onChange={(v) => onChange({ emergencyContact: v })}
          canCopy={!!p.emergencyContact}
          onCopy={() => copyToClipboard(p.emergencyContact ?? '')}
        />
      </div>
    </div>
  );
}

interface ContactFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (v: string) => void;
  action?: { label: string; icon: React.ReactNode; onClick: () => void; color: string };
  canCopy?: boolean;
  onCopy?: () => void;
}

function ContactField({ icon, label, value, placeholder, disabled, onChange, action, canCopy, onCopy }: ContactFieldProps) {
  const [justCopied, setJustCopied] = useState(false);
  const handleCopy = () => {
    if (!onCopy) return;
    onCopy();
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1500);
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <label className="font-mono text-[10px] uppercase text-zinc-400 tracking-wider">{label}</label>
      </div>
      <div className="flex items-stretch gap-1.5">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#5D36FF] disabled:opacity-60 transition"
        />
        {canCopy && onCopy && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar al portapapeles"
            className={`px-2.5 rounded-lg border transition font-mono text-[10px] uppercase tracking-wider font-bold ${
              justCopied
                ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white'
            }`}
            aria-label={`Copiar ${label}`}
          >
            {justCopied ? <CheckCircle size={12} aria-hidden="true" /> : <CopyIcon size={12} aria-hidden="true" />}
          </button>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={`px-3 rounded-lg border bg-zinc-900 transition flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider font-bold ${action.color}`}
            title={action.label}
          >
            {action.icon}
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        )}
      </div>
    </div>
  );
}

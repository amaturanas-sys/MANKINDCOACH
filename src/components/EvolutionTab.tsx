/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  TrendingUp,
  Plus,
  Trash2,
  Activity,
  Calendar as CalendarIcon,
  Upload,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ClientProfile, METRIC_FIELDS, MetricSample } from '../types';
import { applyProgress } from '../lib/intakeImporter';

interface EvolutionTabProps {
  profile: ClientProfile;
  metricSamples: MetricSample[];
  onUpdateMetricSamples: (samples: MetricSample[]) => void;
}

type DraftSample = Partial<Omit<MetricSample, 'id' | 'clientId' | 'takenAt'>> & {
  takenAt: string; // YYYY-MM-DD
  notes?: string;
};

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function prefillFromProfile(profile: ClientProfile): DraftSample {
  const m = profile.metrics;
  return {
    takenAt: isoToday(),
    benchPress1RM: m.benchPress1RM,
    squat1RM: m.squat1RM,
    deadlift1RM: m.deadlift1RM,
    vo2Max: m.vo2Max,
    weightKg: m.weightKg,
    fatPercentage: m.fatPercentage,
    pullUpMaxReps: m.pullUpMaxReps,
    run400mSeconds: m.run400mSeconds,
    notes: ''
  };
}

export default function EvolutionTab({ profile, metricSamples, onUpdateMetricSamples }: EvolutionTabProps) {
  const [draft, setDraft] = useState<DraftSample>(() => prefillFromProfile(profile));
  const [error, setError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(String(ev.target?.result ?? ''));
        if (json.formType === 'progress') {
          const sample = applyProgress(json, profile.id);
          onUpdateMetricSamples([...metricSamples, sample]);
          setImportStatus({
            type: 'success',
            message: `Reporte importado · medición del ${new Date(sample.takenAt).toLocaleDateString('es-ES')} agregada al historial.`
          });
        } else if (json.formType === 'intake') {
          // Tomar solo las métricas como sample inicial
          const sample = applyProgress({ ...json, formType: 'progress', takenAt: new Date().toISOString().slice(0, 10) }, profile.id);
          onUpdateMetricSamples([...metricSamples, sample]);
          setImportStatus({
            type: 'success',
            message: 'Intake convertido en medición baseline. Para actualizar la ficha completa usa el Dashboard del Coach.'
          });
        } else {
          throw new Error('formType desconocido. Solo se aceptan archivos generados por los formularios MankindFactory.');
        }
      } catch (err) {
        setImportStatus({
          type: 'error',
          message: err instanceof Error ? err.message : 'No se pudo leer el archivo JSON.'
        });
      }
      window.setTimeout(() => setImportStatus({ type: null, message: '' }), 6000);
    };
    reader.readAsText(file);
  };

  const ofClient = useMemo(
    () => metricSamples
      .filter(s => s.clientId === profile.id)
      .sort((a, b) => a.takenAt - b.takenAt),
    [metricSamples, profile.id]
  );

  const addSample = () => {
    setError(null);
    const [y, m, d] = draft.takenAt.split('-').map(Number);
    if (!y || !m || !d) {
      setError('Fecha inválida.');
      return;
    }
    const takenAt = new Date(y, m - 1, d).getTime();
    const hasAny = METRIC_FIELDS.some(f => typeof draft[f.key] === 'number');
    if (!hasAny && !draft.notes) {
      setError('Cargá al menos una métrica o una nota.');
      return;
    }

    const sample: MetricSample = {
      id: `m-${Date.now()}`,
      clientId: profile.id,
      takenAt,
      ...(typeof draft.benchPress1RM === 'number' ? { benchPress1RM: draft.benchPress1RM } : {}),
      ...(typeof draft.squat1RM === 'number' ? { squat1RM: draft.squat1RM } : {}),
      ...(typeof draft.deadlift1RM === 'number' ? { deadlift1RM: draft.deadlift1RM } : {}),
      ...(typeof draft.vo2Max === 'number' ? { vo2Max: draft.vo2Max } : {}),
      ...(typeof draft.weightKg === 'number' ? { weightKg: draft.weightKg } : {}),
      ...(typeof draft.fatPercentage === 'number' ? { fatPercentage: draft.fatPercentage } : {}),
      ...(draft.notes ? { notes: draft.notes } : {})
    };

    onUpdateMetricSamples([...metricSamples, sample]);
    setDraft(prefillFromProfile(profile));
  };

  const deleteSample = (id: string) => {
    onUpdateMetricSamples(metricSamples.filter(s => s.id !== id));
  };

  const updateDraft = (key: keyof DraftSample, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const summary = useMemo(() => {
    if (ofClient.length < 2) return null;
    const first = ofClient[0];
    const last = ofClient[ofClient.length - 1];
    const days = Math.max(1, Math.round((last.takenAt - first.takenAt) / 86_400_000));
    return { first, last, days, count: ofClient.length };
  }, [ofClient]);

  return (
    <div id="evolution_tab_container" className="space-y-8">
      <div className="bg-gradient-to-r from-zinc-950 via-purple-950/20 to-zinc-950 border border-zinc-800 rounded-xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#5D36FF]/10 border border-[#5D36FF]/30 px-3 py-1 rounded-full">
            <TrendingUp size={12} className="text-[#5D36FF]" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF]">Tracking longitudinal</span>
          </div>
          <h1 className="font-sans font-black text-3xl tracking-tight text-white">
            Evolución de <span className="text-[#5D36FF]">{profile.name || 'el atleta'}</span>
          </h1>
          <p className="text-zinc-400 font-mono text-xs max-w-xl">
            Registra mediciones periódicas para visualizar la curva de progreso de fuerza, biometría y capacidad aeróbica.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <Stat label="Mediciones" value={`${summary.count}`} />
            <Stat label="Días registrados" value={`${summary.days}`} />
          </div>
        )}
      </div>

      {/* IMPORTER del JSON de avance — sube y autocarga */}
      <section aria-labelledby="import_heading" className="bg-[#121214] border border-[#5D36FF]/30 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5D36FF]/10 text-[#5D36FF] rounded-lg">
              <Upload size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 id="import_heading" className="font-sans font-bold text-sm text-white uppercase tracking-wider">Importar reporte de avance</h2>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                Cargá el JSON que tu paciente generó completando el HTML enviado desde el Dashboard. La medición se agrega sola, sin que llenes nada.
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportProgress}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-xs uppercase tracking-wider font-bold transition flex items-center gap-2 shrink-0"
          >
            <Upload size={13} aria-hidden="true" /> Subir JSON
          </button>
        </div>

        {importStatus.type && (
          <div role={importStatus.type === 'error' ? 'alert' : 'status'}
            className={`p-3 rounded-lg border flex items-center gap-2 font-mono text-xs ${
              importStatus.type === 'success'
                ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            {importStatus.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            <span>{importStatus.message}</span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Formulario de nueva medición manual */}
        <section aria-labelledby="new_sample_heading" className="lg:col-span-1 bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
            <div className="p-2 bg-[#5D36FF]/10 text-[#5D36FF] rounded-lg">
              <Plus size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 id="new_sample_heading" className="font-sans font-bold text-sm text-white uppercase tracking-wider">Medición manual</h2>
              <p className="font-mono text-[9px] text-zinc-500 mt-0.5">Si preferís cargar a mano</p>
            </div>
          </div>

          <div className="space-y-3">
            <DraftField label="Fecha">
              <input
                type="date"
                value={draft.takenAt}
                onChange={e => updateDraft('takenAt', e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#5D36FF]"
              />
            </DraftField>

            {METRIC_FIELDS.map(f => (
              <DraftField key={f.key} label={`${f.label} (${f.unit})`}>
                <input
                  type="number"
                  step="0.1"
                  value={typeof draft[f.key] === 'number' ? draft[f.key] : ''}
                  onChange={e => updateDraft(f.key, e.target.value === '' ? undefined : Number(e.target.value))}
                  placeholder="—"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#5D36FF]"
                />
              </DraftField>
            ))}

            <DraftField label="Notas (opcional)">
              <textarea
                value={draft.notes ?? ''}
                onChange={e => updateDraft('notes', e.target.value)}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#5D36FF] resize-none"
                placeholder="Sensación, dolencias, contexto…"
              />
            </DraftField>

            {error && (
              <p role="alert" className="text-red-400 text-[11px] font-mono">{error}</p>
            )}

            <button
              onClick={addSample}
              className="w-full py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] text-white rounded font-mono text-xs uppercase tracking-wider font-bold transition flex items-center justify-center gap-2"
            >
              <Plus size={14} aria-hidden="true" /> Registrar medición
            </button>
          </div>
        </section>

        {/* Gráficos + historial */}
        <section className="lg:col-span-2 space-y-6">

          <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-5">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2 bg-[#5D36FF]/10 text-[#5D36FF] rounded-lg">
                <Activity size={16} aria-hidden="true" />
              </div>
              <h2 className="font-sans font-bold text-sm text-white uppercase tracking-wider">Curvas de progreso</h2>
            </div>

            {ofClient.length < 2 ? (
              <p className="text-zinc-500 font-mono text-[11px] py-8 text-center">
                Cargá al menos 2 mediciones para ver gráficos.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {METRIC_FIELDS.map(f => (
                  <MetricChart key={f.key} samples={ofClient} field={f.key} label={f.label} unit={f.unit} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#121214] border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-900 text-zinc-400 rounded-lg">
                  <CalendarIcon size={16} aria-hidden="true" />
                </div>
                <h2 className="font-sans font-bold text-sm text-white uppercase tracking-wider">Historial ({ofClient.length})</h2>
              </div>
            </div>

            {ofClient.length === 0 ? (
              <p className="text-zinc-500 font-mono text-[11px] py-6 text-center">
                Sin mediciones para este atleta. Registra la primera.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[9px] tracking-wider">
                      <th className="py-2 pr-3">Fecha</th>
                      {METRIC_FIELDS.map(f => (
                        <th key={f.key} className="py-2 pr-3 text-right">{f.label.split(' ')[0]}</th>
                      ))}
                      <th className="py-2 pr-3">Notas</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...ofClient].reverse().map(s => (
                      <tr key={s.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30">
                        <td className="py-2 pr-3 text-zinc-300">{new Date(s.takenAt).toLocaleDateString('es-ES')}</td>
                        {METRIC_FIELDS.map(f => (
                          <td key={f.key} className="py-2 pr-3 text-right text-white">
                            {typeof s[f.key] === 'number' ? `${s[f.key]}${f.unit === '%' ? '%' : ''}` : '—'}
                          </td>
                        ))}
                        <td className="py-2 pr-3 text-zinc-500 text-[10px] max-w-[160px] truncate" title={s.notes}>{s.notes || '—'}</td>
                        <td className="py-2">
                          <button
                            onClick={() => deleteSample(s.id)}
                            aria-label="Eliminar medición"
                            className="p-1 text-zinc-500 hover:text-red-400 rounded"
                          >
                            <Trash2 size={11} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DraftField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[9px] text-zinc-400 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-center">
      <span className="block text-[8px] uppercase text-zinc-500 tracking-wider">{label}</span>
      <span className="block text-lg font-black text-white">{value}</span>
    </div>
  );
}

interface MetricChartProps {
  samples: MetricSample[];
  field: keyof Omit<MetricSample, 'id' | 'clientId' | 'takenAt' | 'notes'>;
  label: string;
  unit: string;
}

function MetricChart({ samples, field, label, unit }: MetricChartProps) {
  const points = useMemo(
    () => samples
      .filter(s => typeof s[field] === 'number')
      .map(s => ({ t: s.takenAt, v: s[field] as number })),
    [samples, field]
  );

  if (points.length < 2) {
    return (
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-4 space-y-2">
        <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">{label}</p>
        <p className="text-zinc-600 text-[10px]">Sin datos suficientes.</p>
      </div>
    );
  }

  const width = 280;
  const height = 90;
  const pad = { top: 8, right: 6, bottom: 14, left: 28 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const minT = points[0].t;
  const maxT = points[points.length - 1].t;
  const tRange = Math.max(1, maxT - minT);
  const minV = Math.min(...points.map(p => p.v));
  const maxV = Math.max(...points.map(p => p.v));
  const vRange = maxV - minV || 1;

  const scaleX = (t: number) => pad.left + ((t - minT) / tRange) * innerW;
  const scaleY = (v: number) => pad.top + (1 - (v - minV) / vRange) * innerH;

  const polyline = points.map(p => `${scaleX(p.t).toFixed(1)},${scaleY(p.v).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const delta = last.v - first.v;
  const trendColor = delta >= 0 ? '#10B981' : '#FF6464';
  const trendLabel = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} ${unit}`;

  return (
    <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">{label}</p>
        <span className="font-mono text-[10px] font-bold" style={{ color: trendColor }}>{trendLabel}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolución de ${label}`} className="w-full h-auto">
        {/* Grid horizontal */}
        {[0, 0.5, 1].map(p => {
          const y = pad.top + p * innerH;
          return (
            <line key={p} x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#27272a" strokeDasharray="2,2" strokeWidth="0.5" />
          );
        })}
        {/* Eje Y labels */}
        <text x={pad.left - 4} y={pad.top + 3} fontSize="8" fill="#71717a" textAnchor="end" fontFamily="JetBrains Mono">{maxV.toFixed(1)}</text>
        <text x={pad.left - 4} y={pad.top + innerH + 3} fontSize="8" fill="#71717a" textAnchor="end" fontFamily="JetBrains Mono">{minV.toFixed(1)}</text>
        {/* Polyline */}
        <polyline fill="none" stroke="#5D36FF" strokeWidth="1.6" points={polyline} />
        {/* Puntos */}
        {points.map((p, i) => (
          <circle key={i} cx={scaleX(p.t)} cy={scaleY(p.v)} r="2" fill="#5D36FF" />
        ))}
        {/* Eje X labels */}
        <text x={pad.left} y={height - 2} fontSize="7" fill="#71717a" textAnchor="start" fontFamily="JetBrains Mono">
          {new Date(minT).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
        </text>
        <text x={width - pad.right} y={height - 2} fontSize="7" fill="#71717a" textAnchor="end" fontFamily="JetBrains Mono">
          {new Date(maxT).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
        </text>
      </svg>
      <div className="flex items-center justify-between font-mono text-[9px] text-zinc-500">
        <span>{points.length} mediciones</span>
        <span>último: <strong className="text-white">{last.v} {unit}</strong></span>
      </div>
    </div>
  );
}

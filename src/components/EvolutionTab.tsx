/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Trash2,
  Activity,
  Calendar as CalendarIcon,
  CloudDownload,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { ClientProfile, METRIC_FIELDS, MetricSample } from '../types';
import { applyProgress } from '../lib/intakeImporter';
import { useAuthState } from '../lib/auth';
import { isBackendConfigured } from '../lib/supabase';
import { fetchPendingProgress, markSubmissionsImported } from '../lib/coachInbox';

interface EvolutionTabProps {
  profile: ClientProfile;
  metricSamples: MetricSample[];
  onUpdateMetricSamples: (samples: MetricSample[]) => void;
}

export default function EvolutionTab({ profile, metricSamples, onUpdateMetricSamples }: EvolutionTabProps) {
  const { user } = useAuthState();
  const coachId = user?.id ?? '';
  const [pull, setPull] = useState<{ busy: boolean; type: 'success' | 'error' | null; msg: string | null }>({ busy: false, type: null, msg: null });

  /**
   * Rescata del portal los avances que el paciente registró (kind='progress',
   * ligados a este paciente) y los incorpora al historial. Los marca como
   * importados para no duplicarlos. El coach no sube nada a mano.
   */
  const handlePullFromPortal = async () => {
    setPull({ busy: true, type: null, msg: null });
    try {
      const subs = await fetchPendingProgress(coachId, profile.id);
      if (subs.length === 0) {
        setPull({ busy: false, type: 'success', msg: 'No hay avances nuevos en el portal del paciente.' });
      } else {
        const newSamples: MetricSample[] = [];
        const okIds: string[] = [];
        for (const s of subs) {
          try {
            newSamples.push(applyProgress(s.data, profile.id));
            okIds.push(s.id);
          } catch { /* envío no interpretable: se deja PENDIENTE, no se marca importado */ }
        }
        if (newSamples.length) onUpdateMetricSamples([...metricSamples, ...newSamples]);
        /* Solo lo aplicado se marca importado; lo fallido queda visible para diagnóstico. */
        if (okIds.length) await markSubmissionsImported(okIds);
        const failed = subs.length - okIds.length;
        setPull({
          busy: false,
          type: 'success',
          msg: `${newSamples.length} avance(s) incorporado(s) desde el portal.${failed ? ` ${failed} envío(s) no interpretable(s) quedaron pendientes.` : ''}`
        });
      }
    } catch (err) {
      setPull({ busy: false, type: 'error', msg: (err as Error)?.message ?? 'No se pudieron traer los avances.' });
    }
    window.setTimeout(() => setPull(p => ({ ...p, type: null, msg: null })), 7000);
  };

  const ofClient = useMemo(
    () => metricSamples
      .filter(s => s.clientId === profile.id)
      .sort((a, b) => a.takenAt - b.takenAt),
    [metricSamples, profile.id]
  );

  const deleteSample = (id: string) => {
    onUpdateMetricSamples(metricSamples.filter(s => s.id !== id));
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
            Curvas de progreso e historial de fuerza, biometría y capacidad aeróbica, alimentados por los formularios que tu paciente sube a su portal.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <Stat label="Mediciones" value={`${summary.count}`} />
            <Stat label="Días registrados" value={`${summary.days}`} />
          </div>
        )}
      </div>

      {/* AVANCES DEL PORTAL — el paciente los registra, la plataforma los rescata */}
      <section aria-labelledby="pull_heading" className="bg-[#121214] border border-[#5D36FF]/30 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#5D36FF]/10 text-[#5D36FF] rounded-lg">
              <CloudDownload size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 id="pull_heading" className="font-sans font-bold text-sm text-white uppercase tracking-wider">Avances del portal del paciente</h2>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                El paciente registra sus avances en su portal. La plataforma los trae aquí y actualiza las curvas. Tú no cargas nada a mano.
              </p>
            </div>
          </div>
          <button
            onClick={handlePullFromPortal}
            disabled={pull.busy || !isBackendConfigured || !coachId}
            title={!isBackendConfigured || !coachId ? 'Inicia sesión en la nube (Datos & Respaldo) para traer avances.' : undefined}
            className="px-4 py-2.5 bg-[#5D36FF] hover:bg-[#4A22F0] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-mono text-xs uppercase tracking-wider font-bold transition flex items-center gap-2 shrink-0"
          >
            {pull.busy ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <CloudDownload size={13} aria-hidden="true" />}
            {pull.busy ? 'Trayendo…' : 'Traer avances'}
          </button>
        </div>

        {!isBackendConfigured && (
          <p className="font-mono text-[10px] text-zinc-500">
            Los avances viven en la nube: requiere backend configurado e inicio de sesión de coach.
          </p>
        )}
        {pull.type && (
          <div role={pull.type === 'error' ? 'alert' : 'status'}
            className={`p-3 rounded-lg border flex items-center gap-2 font-mono text-xs ${
              pull.type === 'success'
                ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
            {pull.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            <span>{pull.msg}</span>
          </div>
        )}
      </section>

      <div className="space-y-6">

        {/* Gráficos + historial (ancho completo) */}
        <section className="space-y-6">

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

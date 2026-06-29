/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Calculadoras útiles para la práctica:
 * - 1RM estimado a partir de peso × reps (Epley, Brzycki, Lombardi).
 * - Distribución de macros a partir de TDEE y objetivo.
 * - Zonas de FC máxima (220 - edad) con 5 zonas.
 * - Conversor kg ↔ lb / km ↔ mi.
 */

import React, { useMemo, useState } from 'react';
import { Calculator, Dumbbell, HeartPulse, Flame, Ruler } from 'lucide-react';

export default function CalculatorsPanel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OneRMCalculator />
        <MacrosCalculator />
        <HRZonesCalculator />
        <UnitConverter />
      </div>
      <p className="text-center text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
        Todas las fórmulas son aproximaciones de uso clínico. Verificá siempre con el atleta antes de prescribir.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * 1RM Estimator
 * ----------------------------------------------------------------------- */

function OneRMCalculator() {
  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(5);

  const results = useMemo(() => {
    if (weight <= 0 || reps <= 0 || reps > 15) return null;
    const epley = weight * (1 + reps / 30);
    const brzycki = weight * (36 / (37 - reps));
    const lombardi = weight * Math.pow(reps, 0.10);
    const lander = (100 * weight) / (101.3 - 2.67123 * reps);
    const oconner = weight * (1 + 0.025 * reps);
    return { epley, brzycki, lombardi, lander, oconner, avg: (epley + brzycki + lombardi + lander + oconner) / 5 };
  }, [weight, reps]);

  return (
    <Card icon={<Dumbbell size={16} className="text-[#5D36FF]" />} title="1RM Estimado (cinco fórmulas)">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso levantado (kg)">
          <input
            type="number"
            inputMode="decimal"
            min={1}
            value={weight}
            onChange={e => setWeight(Number(e.target.value) || 0)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
        <Field label="Repeticiones completadas">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={15}
            value={reps}
            onChange={e => setReps(Number(e.target.value) || 0)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60"
          />
        </Field>
      </div>

      {results ? (
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <div className="bg-[#5D36FF]/10 border border-[#5D36FF]/30 rounded p-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#5D36FF] font-bold">Promedio</span>
            <span className="font-sans font-black text-xl text-white">{results.avg.toFixed(1)} kg</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <FormulaRow label="Epley" value={results.epley} />
            <FormulaRow label="Brzycki" value={results.brzycki} />
            <FormulaRow label="Lombardi" value={results.lombardi} />
            <FormulaRow label="Lander" value={results.lander} />
            <FormulaRow label="O'Conner" value={results.oconner} />
          </div>
          <p className="text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-900">
            Recomendado para 1-10 reps. Sobre 10 reps las fórmulas pierden precisión.
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500 font-mono italic">Ingresa peso y reps (1-15) para calcular.</p>
      )}
    </Card>
  );
}

function FormulaRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded px-2 py-1">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white font-bold">{value.toFixed(1)} kg</span>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Macros calculator
 * ----------------------------------------------------------------------- */

function MacrosCalculator() {
  const [tdee, setTdee] = useState(2400);
  const [goal, setGoal] = useState<'cut' | 'maintain' | 'bulk'>('maintain');
  const [bodyWeight, setBodyWeight] = useState(80);

  const results = useMemo(() => {
    if (tdee <= 0 || bodyWeight <= 0) return null;
    const adjusted = goal === 'cut' ? tdee * 0.8 : goal === 'bulk' ? tdee * 1.1 : tdee;
    const proteinG = goal === 'cut' ? bodyWeight * 2.2 : bodyWeight * 1.8;
    const fatG = (adjusted * 0.25) / 9;
    const carbsG = (adjusted - proteinG * 4 - fatG * 9) / 4;
    return {
      kcal: Math.round(adjusted),
      protein: Math.round(proteinG),
      fat: Math.round(fatG),
      carbs: Math.round(Math.max(0, carbsG))
    };
  }, [tdee, goal, bodyWeight]);

  return (
    <Card icon={<Flame size={16} className="text-[#FF6B35]" />} title="Distribución de macronutrientes">
      <div className="grid grid-cols-3 gap-2">
        <Field label="TDEE (kcal)">
          <input type="number" min={0} value={tdee} onChange={e => setTdee(Number(e.target.value) || 0)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
        </Field>
        <Field label="Peso (kg)">
          <input type="number" min={0} value={bodyWeight} onChange={e => setBodyWeight(Number(e.target.value) || 0)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
        </Field>
        <Field label="Objetivo">
          <select value={goal} onChange={e => setGoal(e.target.value as typeof goal)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60">
            <option value="cut">Cut (-20%)</option>
            <option value="maintain">Mantener</option>
            <option value="bulk">Bulk (+10%)</option>
          </select>
        </Field>
      </div>
      {results ? (
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded p-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF6B35] font-bold">Calorías ajustadas</span>
            <span className="font-sans font-black text-xl text-white">{results.kcal} kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MacroCell label="Proteínas" value={`${results.protein}g`} kcal={results.protein * 4} color="#5D36FF" />
            <MacroCell label="Carbohidratos" value={`${results.carbs}g`} kcal={results.carbs * 4} color="#10B981" />
            <MacroCell label="Grasas" value={`${results.fat}g`} kcal={results.fat * 9} color="#FFB020" />
          </div>
          <p className="text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-900">
            Proteínas: 1.8-2.2 g/kg · Grasas: 25% kcal · Carbos: resto.
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500 font-mono italic">Ingresa TDEE y peso para calcular.</p>
      )}
    </Card>
  );
}

function MacroCell({ label, value, kcal, color }: { label: string; value: string; kcal: number; color: string }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded p-2 text-center" style={{ borderColor: `${color}40` }}>
      <span className="block text-[9px] font-mono uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="block text-lg font-black text-white" style={{ color }}>{value}</span>
      <span className="block text-[9px] font-mono text-zinc-500">{kcal} kcal</span>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * HR Zones
 * ----------------------------------------------------------------------- */

function HRZonesCalculator() {
  const [age, setAge] = useState(30);

  const zones = useMemo(() => {
    if (age <= 0 || age > 100) return null;
    const max = 220 - age;
    return {
      max,
      z1: { lo: Math.round(max * 0.5), hi: Math.round(max * 0.6) },
      z2: { lo: Math.round(max * 0.6), hi: Math.round(max * 0.7) },
      z3: { lo: Math.round(max * 0.7), hi: Math.round(max * 0.8) },
      z4: { lo: Math.round(max * 0.8), hi: Math.round(max * 0.9) },
      z5: { lo: Math.round(max * 0.9), hi: max }
    };
  }, [age]);

  return (
    <Card icon={<HeartPulse size={16} className="text-[#FF3C00]" />} title="Zonas de frecuencia cardíaca">
      <Field label="Edad del paciente">
        <input type="number" min={0} max={100} value={age} onChange={e => setAge(Number(e.target.value) || 0)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
      </Field>
      {zones ? (
        <div className="space-y-1.5 pt-3 border-t border-zinc-800">
          <div className="bg-[#FF3C00]/10 border border-[#FF3C00]/30 rounded p-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF3C00] font-bold">FC máxima</span>
            <span className="font-sans font-black text-lg text-white">{zones.max} ppm</span>
          </div>
          <ZoneRow z="Z1" name="Recuperación" range={zones.z1} color="#10B981" />
          <ZoneRow z="Z2" name="Aeróbico ligero" range={zones.z2} color="#5D36FF" />
          <ZoneRow z="Z3" name="Aeróbico intenso" range={zones.z3} color="#FFB020" />
          <ZoneRow z="Z4" name="Umbral" range={zones.z4} color="#FF6B35" />
          <ZoneRow z="Z5" name="VO2 max" range={zones.z5} color="#FF3C00" />
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500 font-mono italic">Ingresa edad.</p>
      )}
    </Card>
  );
}

function ZoneRow({ z, name, range, color }: { z: string; name: string; range: { lo: number; hi: number }; color: string }) {
  return (
    <div className="flex items-center justify-between bg-zinc-950/40 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono">
      <div className="flex items-center gap-2">
        <span className="font-bold w-6 text-center" style={{ color }}>{z}</span>
        <span className="text-zinc-300">{name}</span>
      </div>
      <span className="text-white font-bold">{range.lo} - {range.hi} ppm</span>
    </div>
  );
}

/* ----------------------------------------------------------------------- *
 * Unit converter
 * ----------------------------------------------------------------------- */

function UnitConverter() {
  const [kg, setKg] = useState(80);
  const [km, setKm] = useState(5);
  const lb = (kg * 2.20462).toFixed(2);
  const mi = (km * 0.621371).toFixed(3);

  return (
    <Card icon={<Ruler size={16} className="text-[#5D36FF]" />} title="Conversores rápidos">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 items-end">
          <Field label="Kilogramos">
            <input type="number" inputMode="decimal" value={kg} onChange={e => setKg(Number(e.target.value) || 0)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
          <div className="bg-zinc-950/40 border border-zinc-800 rounded px-3 py-2">
            <span className="block text-[9px] uppercase text-zinc-500 tracking-wider font-mono">Libras</span>
            <span className="block text-base font-bold text-white">{lb} lb</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 items-end">
          <Field label="Kilómetros">
            <input type="number" inputMode="decimal" value={km} onChange={e => setKm(Number(e.target.value) || 0)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#5D36FF]/60" />
          </Field>
          <div className="bg-zinc-950/40 border border-zinc-800 rounded px-3 py-2">
            <span className="block text-[9px] uppercase text-zinc-500 tracking-wider font-mono">Millas</span>
            <span className="block text-base font-bold text-white">{mi} mi</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------------- *
 * Helpers
 * ----------------------------------------------------------------------- */

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-xl p-5 shadow-lg space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        {icon}
        <h3 className="font-sans font-bold text-sm text-white uppercase tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="block text-[9px] uppercase text-zinc-500 tracking-wider font-mono">{label}</span>
      {children}
    </label>
  );
}

/* unused */
export { Calculator };

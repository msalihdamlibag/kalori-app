"use client";

import { useState } from "react";

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

interface GoalViewProps {
  target: number;
  macroTargets: MacroTargets;
  consumed: number;
  protein: number;
  carbs: number;
  fat: number;
  onSave: (target: number, macros: MacroTargets) => void;
}

/** Distribute a calorie target into macro grams using a 30P / 40C / 30F split. */
export function macrosFromCalories(cal: number): MacroTargets {
  return {
    protein: Math.round((cal * 0.3) / 4),
    carbs: Math.round((cal * 0.4) / 4),
    fat: Math.round((cal * 0.3) / 9),
  };
}

function Stepper({
  value,
  onChange,
  step,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center active:scale-90 transition-transform"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" />
        </svg>
      </button>
      <div className="flex-1 text-center">
        <span className="text-2xl font-extrabold">{value}</span>
        <span className="text-sm text-muted ml-1">{suffix}</span>
      </div>
      <button
        onClick={() => onChange(value + step)}
        className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center active:scale-90 transition-transform"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

function ProgressRow({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">
          {Math.round(value)} / {target}
        </span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function GoalView({
  target,
  macroTargets,
  consumed,
  protein,
  carbs,
  fat,
  onSave,
}: GoalViewProps) {
  const [cal, setCal] = useState(target);
  const [macros, setMacros] = useState<MacroTargets>(macroTargets);
  const [saved, setSaved] = useState(false);

  const dirty = cal !== target || JSON.stringify(macros) !== JSON.stringify(macroTargets);

  const handleSave = () => {
    onSave(cal, macros);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const autoDistribute = () => setMacros(macrosFromCalories(cal));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Hedef</h1>

      {/* Today's progress */}
      <div className="bg-surface rounded-3xl p-5">
        <span className="text-xs font-bold text-muted uppercase tracking-wider">Bugünkü İlerleme</span>
        <div className="flex items-baseline gap-1 mt-2 mb-4">
          <span className="text-4xl font-extrabold">{consumed}</span>
          <span className="text-sm text-muted">/ {target} kcal</span>
        </div>
        <div className="space-y-3">
          <ProgressRow label="Kalori" value={consumed} target={target} color="bg-accent-dark" />
          <ProgressRow label="Protein" value={protein} target={macroTargets.protein} color="bg-blue-500" />
          <ProgressRow label="Yağ" value={fat} target={macroTargets.fat} color="bg-rose-400" />
          <ProgressRow label="Karbonhidrat" value={carbs} target={macroTargets.carbs} color="bg-amber-500" />
        </div>
      </div>

      {/* Calorie target */}
      <div className="bg-card-bg rounded-3xl p-5 border border-border">
        <h2 className="font-bold text-sm mb-3">Günlük Kalori Hedefi</h2>
        <Stepper value={cal} onChange={setCal} step={50} suffix="kcal" />
        <p className="text-[11px] text-muted text-center mt-3">
          Önerilen: Kadın 1800–2200 / Erkek 2200–2800 kcal
        </p>
      </div>

      {/* Macro targets */}
      <div className="bg-card-bg rounded-3xl p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-sm">Makro Hedefleri</h2>
          <button
            onClick={autoDistribute}
            className="text-xs font-semibold text-accent-strong bg-accent/30 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            Otomatik dağıt
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-xs font-semibold text-muted mb-2">Protein</div>
            <Stepper value={macros.protein} onChange={(v) => setMacros((m) => ({ ...m, protein: v }))} step={5} suffix="g" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted mb-2">Yağ</div>
            <Stepper value={macros.fat} onChange={(v) => setMacros((m) => ({ ...m, fat: v }))} step={5} suffix="g" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted mb-2">Karbonhidrat</div>
            <Stepper value={macros.carbs} onChange={(v) => setMacros((m) => ({ ...m, carbs: v }))} step={5} suffix="g" />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!dirty && !saved}
        className="w-full py-3.5 rounded-2xl bg-accent text-foreground font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {saved ? "Kaydedildi ✓" : "Hedefi Kaydet"}
      </button>
    </div>
  );
}

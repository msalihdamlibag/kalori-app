"use client";

import { useState } from "react";

interface Exercise {
  name: string;
  duration: string;
  caloriesBurned: number;
  intensity: string;
  description: string;
}

interface WorkoutViewProps {
  consumed: number;
  target: number;
}

const intensityStyle: Record<string, string> = {
  yüksek: "bg-rose-50 text-rose-600",
  orta: "bg-amber-50 text-amber-600",
  düşük: "bg-emerald-50 text-emerald-600",
};

const PRESETS = [200, 300, 500];

export default function WorkoutView({ consumed, target }: WorkoutViewProps) {
  const excess = Math.max(0, consumed - target);
  const [burnGoal, setBurnGoal] = useState(excess > 0 ? Math.min(excess, 500) : 300);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    setExercises([]);
    try {
      const res = await fetch("/api/suggest-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excessCalories: burnGoal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Öneriler yüklenemedi");
      setExercises(data.exercises || []);
      setMessage(data.message || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Öneriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Egzersiz</h1>

      {/* Status card */}
      <div className={`rounded-3xl p-5 ${excess > 0 ? "bg-danger-light/50" : "bg-surface"}`}>
        {excess > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-danger/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="font-bold text-danger">Hedefi {excess} kcal aştın</span>
            </div>
            <p className="text-xs text-foreground/60 mt-2">
              Fazla kaloriyi dengelemek için aşağıdan egzersiz önerisi al.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-accent/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-bold">Hedefin içindesin</span>
            </div>
            <p className="text-xs text-foreground/60 mt-2">
              Yine de hareket etmek için bir antrenman planı alabilirsin.
            </p>
          </>
        )}
      </div>

      {/* Burn goal selector */}
      <div className="bg-card-bg rounded-3xl p-5 border border-border">
        <h2 className="font-bold text-sm mb-3">Yakmak istediğin kalori</h2>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setBurnGoal(p)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                burnGoal === p ? "bg-accent text-foreground" : "bg-surface text-muted"
              }`}
            >
              {p} kcal
            </button>
          ))}
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="w-full mt-4 py-3.5 rounded-2xl bg-foreground text-card-bg font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-card-bg border-t-transparent rounded-full animate-spin" />
              Hazırlanıyor...
            </span>
          ) : (
            "Egzersiz Önerisi Al"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-danger-light/50 text-danger p-4 rounded-2xl text-sm font-medium border border-danger/10">
          {error}
        </div>
      )}

      {message && <p className="text-sm text-foreground/60 px-1">{message}</p>}

      <div className="space-y-3">
        {exercises.map((ex, i) => (
          <div
            key={i}
            className="bg-card-bg rounded-2xl p-4 border border-border animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm">{ex.name}</div>
                <div className="text-xs text-muted mt-0.5">{ex.description}</div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="font-extrabold text-accent-strong text-sm">-{ex.caloriesBurned}</div>
                <div className="text-[10px] text-muted">kcal</div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] font-semibold bg-surface px-2.5 py-1 rounded-lg">{ex.duration} dk</span>
              <span
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${
                  intensityStyle[ex.intensity] || "bg-surface text-muted"
                }`}
              >
                {ex.intensity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

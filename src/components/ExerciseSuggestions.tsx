"use client";

import { useState } from "react";

interface Exercise {
  name: string;
  duration: string;
  caloriesBurned: number;
  intensity: string;
  description: string;
}

interface ExerciseSuggestionsProps {
  excessCalories: number;
}

const intensityStyle: Record<string, string> = {
  "yuksek": "bg-rose-50 text-rose-600",
  "orta": "bg-amber-50 text-amber-600",
  "dusuk": "bg-emerald-50 text-emerald-600",
};

export default function ExerciseSuggestions({
  excessCalories,
}: ExerciseSuggestionsProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suggest-exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excessCalories }),
      });
      const data = await res.json();
      setExercises(data.exercises || []);
      setMessage(data.message || "");
      setShown(true);
    } catch {
      setMessage("Oneriler yuklenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (!shown) {
    return (
      <div className="bg-danger-light/60 border border-danger/15 rounded-2xl p-4 text-center">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-danger/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p className="text-danger font-bold text-sm">
          Kalori limitini {excessCalories} kcal astiniz
        </p>
        <p className="text-xs text-foreground/50 mt-1 mb-3">
          Fazla kaloriyi yakmak icin egzersiz onerileri alin
        </p>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="bg-danger text-white px-5 py-2.5 rounded-xl text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Yukleniyor...
            </span>
          ) : (
            "Egzersiz Onerisi Al"
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-danger-light/40 border border-danger/10 rounded-2xl p-4">
      <h3 className="font-bold text-sm text-danger mb-1">Egzersiz Onerileri</h3>
      {message && <p className="text-xs text-foreground/50 mb-3">{message}</p>}
      <div className="space-y-2">
        {exercises.map((ex, i) => (
          <div key={i} className="bg-card-bg rounded-xl p-3 shadow-sm border border-border animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm">{ex.name}</div>
                <div className="text-xs text-muted mt-0.5">{ex.description}</div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="font-bold text-danger text-sm">-{ex.caloriesBurned}</div>
                <div className="text-[10px] text-muted">kcal</div>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="text-[10px] font-medium bg-background px-2 py-1 rounded-lg">
                {ex.duration} dk
              </span>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-lg ${intensityStyle[ex.intensity] || "bg-gray-100 text-gray-600"}`}>
                {ex.intensity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

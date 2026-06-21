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
      setMessage("Öneriler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  if (!shown) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-danger font-medium mb-1">
          Kalori limitini {excessCalories} kcal aştınız!
        </p>
        <p className="text-sm text-gray-600 mb-3">
          Fazla kaloriyi yakmak için egzersiz önerileri alın
        </p>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="bg-danger text-white px-4 py-2 rounded-lg text-sm font-medium active:scale-95 transition-transform disabled:opacity-50"
        >
          {loading ? "Yükleniyor..." : "Egzersiz Önerisi Al"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <h3 className="font-semibold text-danger mb-1">Egzersiz Önerileri</h3>
      {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}
      <div className="space-y-2">
        {exercises.map((ex, i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{ex.name}</div>
                <div className="text-xs text-gray-500">{ex.description}</div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="font-bold text-danger">
                  -{ex.caloriesBurned}
                </div>
                <div className="text-xs text-gray-500">kcal</div>
              </div>
            </div>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="bg-gray-100 px-2 py-0.5 rounded">
                {ex.duration} dk
              </span>
              <span
                className={`px-2 py-0.5 rounded ${
                  ex.intensity === "yüksek"
                    ? "bg-red-100 text-red-700"
                    : ex.intensity === "orta"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
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

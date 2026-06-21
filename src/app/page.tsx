"use client";

import { useState, useEffect, useCallback } from "react";
import CalorieRing from "@/components/CalorieRing";
import FoodLog, { FoodItem } from "@/components/FoodLog";
import CameraCapture from "@/components/CameraCapture";
import ExerciseSuggestions from "@/components/ExerciseSuggestions";
import RecipeSuggestions from "@/components/RecipeSuggestions";

type Tab = "tracker" | "recipes";

const STORAGE_KEY_FOODS = "kalori-foods";
const STORAGE_KEY_TARGET = "kalori-target";
const STORAGE_KEY_DATE = "kalori-date";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("tracker");
  const [target, setTarget] = useState(2000);
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState("2000");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    items: Array<{
      name: string;
      portion: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
    totalCalories: number;
    notes?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedDate = localStorage.getItem(STORAGE_KEY_DATE);
    const today = getTodayStr();

    if (savedDate !== today) {
      localStorage.setItem(STORAGE_KEY_DATE, today);
      localStorage.removeItem(STORAGE_KEY_FOODS);
      setFoods([]);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY_FOODS);
      if (saved) setFoods(JSON.parse(saved));
    }

    const savedTarget = localStorage.getItem(STORAGE_KEY_TARGET);
    if (savedTarget) setTarget(Number(savedTarget));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FOODS, JSON.stringify(foods));
  }, [foods]);

  const consumed = foods.reduce((sum, f) => sum + f.calories, 0);
  const remaining = target - consumed;
  const isOver = consumed > target;

  const handleCapture = useCallback(async (imageData: string) => {
    setPreviewImage(imageData);
    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Analiz başarısız");

      setAnalysisResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Fotoğraf analiz edilemedi. Lütfen tekrar deneyin."
      );
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const confirmAnalysis = () => {
    if (!analysisResult) return;

    const newItems: FoodItem[] = analysisResult.items.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      portion: item.portion,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      time: new Date().toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      imageUrl: previewImage || undefined,
    }));

    setFoods((prev) => [...prev, ...newItems]);
    setPreviewImage(null);
    setAnalysisResult(null);
  };

  const cancelAnalysis = () => {
    setPreviewImage(null);
    setAnalysisResult(null);
    setError(null);
  };

  const removeFood = (id: string) => {
    setFoods((prev) => prev.filter((f) => f.id !== id));
  };

  const saveTarget = () => {
    const val = parseInt(tempTarget);
    if (val > 0 && val < 10000) {
      setTarget(val);
      localStorage.setItem(STORAGE_KEY_TARGET, String(val));
    }
    setEditingTarget(false);
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto w-full">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">KaloriTakip</h1>
        <button
          onClick={() => {
            setEditingTarget(true);
            setTempTarget(String(target));
          }}
          className="text-sm bg-white/20 px-3 py-1 rounded-full"
        >
          Hedef: {target} kcal
        </button>
      </header>

      {/* Target Edit Modal */}
      {editingTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-lg mb-4">Günlük Kalori Hedefi</h2>
            <input
              type="number"
              value={tempTarget}
              onChange={(e) => setTempTarget(e.target.value)}
              className="w-full border border-border rounded-xl p-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
              min="500"
              max="10000"
            />
            <div className="text-xs text-gray-500 text-center mt-2">
              Önerilen: Kadın 1800-2200 / Erkek 2200-2800 kcal
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditingTarget(false)}
                className="flex-1 py-2.5 rounded-xl border border-border font-medium"
              >
                İptal
              </button>
              <button
                onClick={saveTarget}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {(previewImage || analyzing) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-lg">Yemek Analizi</h2>
                <button onClick={cancelAnalysis} className="text-gray-400 p-1">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {previewImage && (
                <img
                  src={previewImage}
                  alt="Yiyecek"
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
              )}

              {analyzing && (
                <div className="flex flex-col items-center py-8">
                  <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-gray-500">AI analiz ediyor...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-danger p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {analysisResult && (
                <div className="space-y-3">
                  {analysisResult.items.map((item, i) => (
                    <div
                      key={i}
                      className="bg-background rounded-xl p-3 border border-border"
                    >
                      <div className="flex justify-between">
                        <div className="font-medium">{item.name}</div>
                        <div className="font-bold text-primary">
                          {item.calories} kcal
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.portion}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400 mt-2">
                        <span>Protein: {item.protein}g</span>
                        <span>Karb: {item.carbs}g</span>
                        <span>Yağ: {item.fat}g</span>
                      </div>
                    </div>
                  ))}

                  <div className="bg-primary/10 rounded-xl p-3 text-center">
                    <span className="text-sm text-gray-600">Toplam: </span>
                    <span className="text-xl font-bold text-primary">
                      {analysisResult.totalCalories} kcal
                    </span>
                  </div>

                  {analysisResult.notes && (
                    <p className="text-xs text-gray-500 bg-yellow-50 p-2 rounded-lg">
                      {analysisResult.notes}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={cancelAnalysis}
                      className="flex-1 py-2.5 rounded-xl border border-border font-medium"
                    >
                      İptal
                    </button>
                    <button
                      onClick={confirmAnalysis}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium active:scale-[0.98] transition-transform"
                    >
                      Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <nav className="flex border-b border-border bg-card-bg">
        <button
          onClick={() => setTab("tracker")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "tracker"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500"
          }`}
        >
          Kalori Takip
        </button>
        <button
          onClick={() => setTab("recipes")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === "recipes"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500"
          }`}
        >
          Yemek Önerisi
        </button>
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {tab === "tracker" && (
          <div className="space-y-4">
            <CalorieRing consumed={consumed} target={target} />

            {isOver && (
              <ExerciseSuggestions excessCalories={consumed - target} />
            )}

            <div>
              <h2 className="font-semibold mb-2">Bugün Yediklerim</h2>
              <FoodLog items={foods} onRemove={removeFood} />
            </div>
          </div>
        )}

        {tab === "recipes" && (
          <RecipeSuggestions
            remainingCalories={remaining > 0 ? remaining : undefined}
          />
        )}
      </main>

      {/* Camera FAB */}
      {tab === "tracker" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <CameraCapture onCapture={handleCapture} disabled={analyzing} />
        </div>
      )}
    </div>
  );
}

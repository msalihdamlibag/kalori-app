"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import CalorieRing from "@/components/CalorieRing";
import { FoodItem } from "@/components/FoodLog";
import DailyTimeline from "@/components/DailyTimeline";
import CameraCapture from "@/components/CameraCapture";
import ExerciseSuggestions from "@/components/ExerciseSuggestions";
import RecipeSuggestions from "@/components/RecipeSuggestions";
import HistoryView from "@/components/HistoryView";

type Tab = "tracker" | "history" | "recipes";

const STORAGE_KEY_FOODS = "kalori-foods";
const STORAGE_KEY_TARGET = "kalori-target";
const STORAGE_KEY_DATE = "kalori-date";
const STORAGE_KEY_DEVICE = "kalori-device-id";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getTodayDisplay() {
  return new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY_DEVICE, id);
  }
  return id;
}

async function uploadPhoto(imageData: string): Promise<string> {
  try {
    const res = await fetch("/api/upload-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageData }),
    });
    if (!res.ok) return imageData;
    const data = await res.json();
    return data.url || imageData;
  } catch {
    return imageData;
  }
}

async function syncToDb(deviceId: string, date: string, target: number, foods: FoodItem[]) {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, date, target, foods }),
    });
    const data = await res.json();
    if (!res.ok) console.warn("Sync hatasi:", data.detail || data.error);
  } catch (e) {
    console.warn("Sync baglanti hatasi:", e);
  }
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
  const [deviceId, setDeviceId] = useState("");
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);

    const savedDate = localStorage.getItem(STORAGE_KEY_DATE);
    const today = getTodayStr();

    if (savedDate !== today) {
      // Sync previous day before resetting
      const oldFoods = localStorage.getItem(STORAGE_KEY_FOODS);
      if (savedDate && oldFoods) {
        const savedTarget = localStorage.getItem(STORAGE_KEY_TARGET);
        syncToDb(id, savedDate, Number(savedTarget) || 2000, JSON.parse(oldFoods));
      }
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

    if (!deviceId) return;

    // Debounced sync to DB
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncToDb(deviceId, getTodayStr(), target, foods);
    }, 3000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [foods, deviceId, target]);

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

      if (!res.ok) throw new Error(data.error || "Analiz basarisiz");

      setAnalysisResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Fotograf analiz edilemedi. Lutfen tekrar deneyin."
      );
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const confirmAnalysis = async () => {
    if (!analysisResult) return;

    // Upload photo to Blob in background, fall back to base64
    let photoUrl = previewImage || undefined;
    if (previewImage) {
      uploadPhoto(previewImage).then((url) => {
        if (url !== previewImage) {
          setFoods((prev) =>
            prev.map((f) =>
              f.imageUrl === previewImage ? { ...f, imageUrl: url } : f
            )
          );
        }
      });
    }

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
      imageUrl: photoUrl,
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
      <header className="bg-gradient-to-br from-primary to-primary-dark text-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">KaloriTakip</h1>
            <p className="text-xs text-white/60 mt-0.5">{getTodayDisplay()}</p>
          </div>
          <button
            onClick={() => {
              setEditingTarget(true);
              setTempTarget(String(target));
            }}
            className="text-xs font-semibold bg-white/15 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/20 active:bg-white/25 transition-colors"
          >
            Hedef: {target} kcal
          </button>
        </div>
      </header>

      {/* Target Edit Modal */}
      {editingTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card-bg rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
            <h2 className="font-bold text-lg mb-4">Gunluk Kalori Hedefi</h2>
            <input
              type="number"
              value={tempTarget}
              onChange={(e) => setTempTarget(e.target.value)}
              className="w-full border border-border rounded-xl p-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              min="500"
              max="10000"
            />
            <div className="text-xs text-muted text-center mt-2">
              Onerilen: Kadin 1800-2200 / Erkek 2200-2800 kcal
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingTarget(false)}
                className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm active:bg-background transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={saveTarget}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm active:scale-[0.98] transition-transform shadow-sm"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Modal */}
      {(previewImage || analyzing) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center animate-fade-in">
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Yemek Analizi</h2>
                <button onClick={cancelAnalysis} className="w-8 h-8 rounded-full bg-background flex items-center justify-center active:bg-border transition-colors">
                  <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {previewImage && (
                <img
                  src={previewImage}
                  alt="Yiyecek"
                  className="w-full h-48 object-cover rounded-2xl mb-4"
                />
              )}

              {analyzing && (
                <div className="flex flex-col items-center py-10">
                  <div className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                  <p className="text-sm text-muted font-medium">AI analiz ediyor...</p>
                </div>
              )}

              {error && (
                <div className="bg-danger-light/50 text-danger p-4 rounded-2xl text-sm space-y-3 border border-danger/10">
                  <p className="font-medium">{error}</p>
                  <button
                    onClick={() => {
                      if (previewImage) {
                        handleCapture(previewImage);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-danger text-white font-semibold text-sm active:scale-[0.98] transition-transform"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-3 animate-fade-in-up">
                  {analysisResult.items.map((item, i) => (
                    <div
                      key={i}
                      className="bg-background rounded-xl p-3.5 border border-border"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-sm">{item.name}</div>
                          <div className="text-xs text-muted mt-0.5">{item.portion}</div>
                        </div>
                        <div className="font-bold text-primary text-sm">
                          {item.calories} kcal
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">P {item.protein}g</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-medium">K {item.carbs}g</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 font-medium">Y {item.fat}g</span>
                      </div>
                    </div>
                  ))}

                  <div className="bg-primary-light/50 rounded-xl p-3.5 text-center border border-primary/10">
                    <span className="text-xs text-primary-dark/60">Toplam: </span>
                    <span className="text-xl font-extrabold text-primary">
                      {analysisResult.totalCalories} kcal
                    </span>
                  </div>

                  {analysisResult.notes && (
                    <div className="flex gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-amber-700">{analysisResult.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={cancelAnalysis}
                      className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm active:bg-background transition-colors"
                    >
                      Iptal
                    </button>
                    <button
                      onClick={confirmAnalysis}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm active:scale-[0.98] transition-transform shadow-sm"
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
      <nav className="flex bg-card-bg px-2 pt-1 border-b border-border">
        <button
          onClick={() => setTab("tracker")}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            tab === "tracker"
              ? "border-primary text-primary"
              : "border-transparent text-muted"
          }`}
        >
          Takip
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            tab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted"
          }`}
        >
          Gecmis
        </button>
        <button
          onClick={() => setTab("recipes")}
          className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            tab === "recipes"
              ? "border-primary text-primary"
              : "border-transparent text-muted"
          }`}
        >
          Tarifler
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
              <h2 className="font-bold text-sm mb-3 text-foreground/80">Bugun Yediklerim</h2>
              <DailyTimeline items={foods} onRemove={removeFood} />
            </div>
          </div>
        )}

        {tab === "history" && deviceId && (
          <HistoryView deviceId={deviceId} />
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

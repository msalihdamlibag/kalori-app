"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { FoodItem } from "@/components/FoodLog";
import TodayMeals from "@/components/TodayMeals";
import BottomNav, { View } from "@/components/BottomNav";
import SummaryCard from "@/components/SummaryCard";
import FreeAccessBanner from "@/components/FreeAccessBanner";
import GoalView, { MacroTargets, macrosFromCalories } from "@/components/GoalView";
import WorkoutView from "@/components/WorkoutView";
import ProfileView from "@/components/ProfileView";
import RoleSelect from "@/components/RoleSelect";
import TrainerDashboard from "@/components/TrainerDashboard";
import LoginSheet from "@/components/LoginSheet";
import { savePhoto, getPhotos, deletePhotos, prunePhotos } from "@/lib/photoStore";

const STORAGE_KEY_FOODS = "kalori-foods";
const STORAGE_KEY_TARGET = "kalori-target";
const STORAGE_KEY_MACROS = "kalori-macros";
const STORAGE_KEY_DATE = "kalori-date";
const STORAGE_KEY_DEVICE = "kalori-device-id";
const STORAGE_KEY_REGISTER = "kalori-register-date";
const STORAGE_KEY_CLEANUP = "kalori-cleanup-date";

const FREE_TRIAL_DAYS = 7;
const PHOTO_RETENTION_DAYS = 7;

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY_DEVICE, id);
  }
  return id;
}

function getRegisterDate(): string {
  let d = localStorage.getItem(STORAGE_KEY_REGISTER);
  if (!d) {
    d = getTodayStr();
    localStorage.setItem(STORAGE_KEY_REGISTER, d);
  }
  return d;
}

function daysLeftFrom(registerDate: string): number {
  const reg = new Date(registerDate).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - reg) / (1000 * 60 * 60 * 24));
  return Math.max(0, FREE_TRIAL_DAYS - elapsed);
}

function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIZE = 800;
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.src = dataUrl;
  });
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

// Inline base64 photos are kept in app state for display but must not be sent
// to the database (too large) — replace them with undefined before syncing.
function stripInlineImages(foods: FoodItem[]): FoodItem[] {
  return foods.map((f) => (f.imageUrl?.startsWith("data:") ? { ...f, imageUrl: undefined } : f));
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
  const { data: session, status } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const claimedRef = useRef(false);
  const [view, setView] = useState<View>("home");
  const [target, setTarget] = useState(2000);
  const [macroTargets, setMacroTargets] = useState<MacroTargets>(macrosFromCalories(2000));
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
  const [registerDate, setRegisterDate] = useState("");
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = getDeviceId();
    setDeviceId(id);
    setRegisterDate(getRegisterDate());

    const savedDate = localStorage.getItem(STORAGE_KEY_DATE);
    const today = getTodayStr();

    if (savedDate !== today) {
      const oldFoods = localStorage.getItem(STORAGE_KEY_FOODS);
      if (savedDate && oldFoods) {
        const savedTarget = localStorage.getItem(STORAGE_KEY_TARGET);
        syncToDb(id, savedDate, Number(savedTarget) || 2000, stripInlineImages(JSON.parse(oldFoods)));
      }
      localStorage.setItem(STORAGE_KEY_DATE, today);
      localStorage.removeItem(STORAGE_KEY_FOODS);
      setFoods([]);
    } else {
      const saved = localStorage.getItem(STORAGE_KEY_FOODS);
      if (saved) {
        const parsed: FoodItem[] = JSON.parse(saved);
        setFoods(parsed);
        // Re-attach on-device photos that were stripped from localStorage.
        const missing = parsed.filter((f) => !f.imageUrl).map((f) => f.id);
        if (missing.length) {
          getPhotos(missing).then((local) => {
            if (Object.keys(local).length === 0) return;
            setFoods((prev) =>
              prev.map((f) => (!f.imageUrl && local[f.id] ? { ...f, imageUrl: local[f.id] } : f))
            );
          });
        }
      }
    }

    // Enforce the photo retention window: prune on-device photos older than it,
    // and ask the server (once per day) to drop hosted photos for older logs.
    prunePhotos(PHOTO_RETENTION_DAYS * 86400000);
    if (localStorage.getItem(STORAGE_KEY_CLEANUP) !== today) {
      fetch("/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: id }),
      })
        .then((res) => {
          if (res.ok) localStorage.setItem(STORAGE_KEY_CLEANUP, today);
        })
        .catch(() => {});
    }

    const savedTarget = localStorage.getItem(STORAGE_KEY_TARGET);
    const t = savedTarget ? Number(savedTarget) : 2000;
    if (savedTarget) setTarget(t);

    const savedMacros = localStorage.getItem(STORAGE_KEY_MACROS);
    if (savedMacros) {
      setMacroTargets(JSON.parse(savedMacros));
    } else {
      setMacroTargets(macrosFromCalories(t));
    }
  }, []);

  useEffect(() => {
    try {
      // Keep inline photos when they fit so they persist across reloads.
      localStorage.setItem(STORAGE_KEY_FOODS, JSON.stringify(foods));
    } catch {
      try {
        // Quota exceeded — drop inline base64 photos, keep any hosted URLs.
        const stripped = foods.map((f) => ({
          ...f,
          imageUrl: f.imageUrl?.startsWith("data:") ? undefined : f.imageUrl,
        }));
        localStorage.setItem(STORAGE_KEY_FOODS, JSON.stringify(stripped));
      } catch {
        try {
          const minimal = foods.map(({ imageUrl: _, ...rest }) => rest);
          localStorage.setItem(STORAGE_KEY_FOODS, JSON.stringify(minimal));
        } catch {
          // Still fails — nothing we can do
        }
      }
    }

    if (!deviceId) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      syncToDb(deviceId, getTodayStr(), target, stripInlineImages(foods));
    }, 3000);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [foods, deviceId, target]);

  // On first login, attach this device's anonymous logs to the account so the
  // user's existing history follows them (and becomes visible to a trainer).
  useEffect(() => {
    if (status !== "authenticated" || !deviceId || claimedRef.current) return;
    claimedRef.current = true;
    fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    }).catch(() => {
      claimedRef.current = false;
    });
  }, [status, deviceId]);

  const consumed = foods.reduce((sum, f) => sum + f.calories, 0);
  const protein = foods.reduce((s, f) => s + (f.protein || 0), 0);
  const carbs = foods.reduce((s, f) => s + (f.carbs || 0), 0);
  const fat = foods.reduce((s, f) => s + (f.fat || 0), 0);
  const remaining = target - consumed;
  const daysLeft = registerDate ? daysLeftFrom(registerDate) : FREE_TRIAL_DAYS;

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
        err instanceof Error ? err.message : "Fotograf analiz edilemedi. Lutfen tekrar deneyin."
      );
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      const compressed = await compressImage(result);
      handleCapture(compressed);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setAddMenuOpen(false);
  };

  const confirmAnalysis = async () => {
    if (!analysisResult || adding) return;
    setAdding(true);

    // Upload to Blob when configured; otherwise keep the base64 preview so the
    // photo still shows in-session (stripped before any DB sync).
    let photoUrl: string | undefined;
    if (previewImage) {
      photoUrl = await uploadPhoto(previewImage);
    }

    const newItems: FoodItem[] = analysisResult.items.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      portion: item.portion,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      imageUrl: photoUrl,
    }));

    // Persist the photo on-device (keyed by food id) so it survives reloads and
    // shows in history, even when there is no hosted Blob URL to store in the DB.
    if (previewImage && (!photoUrl || photoUrl.startsWith("data:"))) {
      await Promise.all(newItems.map((it) => savePhoto(it.id, previewImage)));
    }

    setFoods((prev) => [...prev, ...newItems]);
    setPreviewImage(null);
    setAnalysisResult(null);
    setEditingItemIndex(null);
    setAdding(false);
  };

  const cancelAnalysis = () => {
    setPreviewImage(null);
    setAnalysisResult(null);
    setError(null);
    setEditingItemIndex(null);
  };

  const updateAnalysisItem = (index: number, field: string, value: string | number) => {
    if (!analysisResult) return;
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((item, i) => (i !== index ? item : { ...item, [field]: value }));
      const totalCalories = items.reduce((s, item) => s + item.calories, 0);
      return { ...prev, items, totalCalories };
    });
  };

  const removeAnalysisItem = (index: number) => {
    if (!analysisResult) return;
    setAnalysisResult((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter((_, i) => i !== index);
      if (items.length === 0) return null;
      const totalCalories = items.reduce((s, item) => s + item.calories, 0);
      return { ...prev, items, totalCalories };
    });
    setEditingItemIndex(null);
  };

  const removeFood = (id: string) => {
    setFoods((prev) => prev.filter((f) => f.id !== id));
    deletePhotos([id]);
  };

  const resetToday = () => {
    deletePhotos(foods.map((f) => f.id));
    setFoods([]);
  };

  const saveGoal = (newTarget: number, newMacros: MacroTargets) => {
    setTarget(newTarget);
    setMacroTargets(newMacros);
    localStorage.setItem(STORAGE_KEY_TARGET, String(newTarget));
    localStorage.setItem(STORAGE_KEY_MACROS, JSON.stringify(newMacros));
  };

  const role = session?.user?.role ?? null;

  // Signed-in but no role yet → force the one-time role selection.
  if (status === "authenticated" && role === null) {
    return <RoleSelect />;
  }

  // Trainers get a dedicated experience instead of the client tracker.
  if (status === "authenticated" && role === "trainer") {
    return <TrainerDashboard />;
  }

  // Anonymous or client → the calorie-tracking app below.
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto w-full bg-background">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />

      {/* Add action sheet */}
      {addMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={() => setAddMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-card-bg rounded-t-3xl w-full max-w-md p-5 pb-8 animate-slide-up shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <h2 className="font-bold text-lg mb-4">Yemek Ekle</h2>
            <div className="space-y-2.5">
              <button
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-3 w-full p-4 rounded-2xl bg-surface active:scale-[0.98] transition-transform"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Kamera</div>
                  <div className="text-xs text-muted">Yemeğin fotoğrafını çek</div>
                </div>
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex items-center gap-3 w-full p-4 rounded-2xl bg-surface active:scale-[0.98] transition-transform"
              >
                <div className="w-11 h-11 rounded-xl bg-accent/40 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Galeri</div>
                  <div className="text-xs text-muted">Mevcut bir fotoğraf seç</div>
                </div>
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
                <button onClick={cancelAnalysis} className="w-8 h-8 rounded-full bg-surface flex items-center justify-center active:bg-border transition-colors">
                  <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {previewImage && (
                <img src={previewImage} alt="Yiyecek" className="w-full h-48 object-cover rounded-2xl mb-4" />
              )}

              {analyzing && (
                <div className="flex flex-col items-center py-10">
                  <div className="w-12 h-12 border-3 border-accent/30 border-t-accent-dark rounded-full animate-spin mb-4" />
                  <p className="text-sm text-muted font-medium">AI analiz ediyor...</p>
                </div>
              )}

              {error && (
                <div className="bg-danger-light/50 text-danger p-4 rounded-2xl text-sm space-y-3 border border-danger/10">
                  <p className="font-medium">{error}</p>
                  <button
                    onClick={() => {
                      if (previewImage) handleCapture(previewImage);
                    }}
                    className="w-full py-2.5 rounded-xl bg-danger text-white font-semibold text-sm active:scale-[0.98] transition-transform"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}

              {analysisResult && (
                <div className="space-y-3 animate-fade-in-up">
                  {analysisResult.items.map((item, i) => {
                    const isEditing = editingItemIndex === i;

                    return isEditing ? (
                      <div key={i} className="bg-surface rounded-xl p-3.5 border-2 border-accent-dark/40 space-y-3 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Duzenle</span>
                          <div className="flex gap-1">
                            <button onClick={() => removeAnalysisItem(i)} className="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center active:bg-danger/20 transition-colors">
                              <svg className="w-3.5 h-3.5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            <button onClick={() => setEditingItemIndex(null)} className="w-7 h-7 rounded-lg bg-accent/30 flex items-center justify-center active:bg-accent/50 transition-colors">
                              <svg className="w-3.5 h-3.5 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-muted font-medium">Ad</label>
                          <input type="text" value={item.name} onChange={(e) => updateAnalysisItem(i, "name", e.target.value)} className="w-full bg-card-bg border border-border rounded-lg px-2.5 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30" />
                        </div>

                        <div>
                          <label className="text-[10px] text-muted font-medium">Porsiyon</label>
                          <input type="text" value={item.portion} onChange={(e) => updateAnalysisItem(i, "portion", e.target.value)} className="w-full bg-card-bg border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted font-medium">Kalori (kcal)</label>
                            <input type="number" value={item.calories} onChange={(e) => updateAnalysisItem(i, "calories", parseInt(e.target.value) || 0)} className="w-full bg-card-bg border border-border rounded-lg px-2.5 py-1.5 text-sm font-bold text-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted font-medium">Protein (g)</label>
                            <input type="number" value={item.protein} onChange={(e) => updateAnalysisItem(i, "protein", parseFloat(e.target.value) || 0)} className="w-full bg-card-bg border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted font-medium">Karbonhidrat (g)</label>
                            <input type="number" value={item.carbs} onChange={(e) => updateAnalysisItem(i, "carbs", parseFloat(e.target.value) || 0)} className="w-full bg-card-bg border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted font-medium">Yag (g)</label>
                            <input type="number" value={item.fat} onChange={(e) => updateAnalysisItem(i, "fat", parseFloat(e.target.value) || 0)} className="w-full bg-card-bg border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button key={i} onClick={() => setEditingItemIndex(i)} className="w-full text-left bg-surface rounded-xl p-3.5 border border-border active:border-accent-dark/30 transition-colors group">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{item.name}</div>
                            <div className="text-xs text-muted mt-0.5">{item.portion}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="font-bold text-accent-strong text-sm">{item.calories} kcal</div>
                            <svg className="w-3.5 h-3.5 text-muted/0 group-active:text-muted/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">P {item.protein}g</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-medium">K {item.carbs}g</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 font-medium">Y {item.fat}g</span>
                        </div>
                      </button>
                    );
                  })}

                  <div className="bg-accent/20 rounded-xl p-3.5 text-center border border-accent-dark/10">
                    <span className="text-xs text-accent-strong/70">Toplam: </span>
                    <span className="text-xl font-extrabold text-accent-strong">{analysisResult.totalCalories} kcal</span>
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
                    <button onClick={cancelAnalysis} className="flex-1 py-3 rounded-xl border border-border font-semibold text-sm active:bg-surface transition-colors">
                      Iptal
                    </button>
                    <button onClick={confirmAnalysis} disabled={adding} className="flex-1 py-3 rounded-xl bg-accent text-foreground font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-60">
                      {adding ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                          Ekleniyor...
                        </span>
                      ) : (
                        "Ekle"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-4 pt-5 pb-28">
        {view === "home" && (
          <div className="space-y-5">
            <SummaryCard
              consumed={consumed}
              target={target}
              protein={protein}
              carbs={carbs}
              fat={fat}
              macroTargets={macroTargets}
            />
            <FreeAccessBanner daysLeft={daysLeft} totalDays={FREE_TRIAL_DAYS} />
            <div>
              <h2 className="text-xl font-extrabold mb-3">Bugün Yediklerim</h2>
              <TodayMeals items={foods} onRemove={removeFood} />
            </div>
          </div>
        )}

        {view === "goal" && (
          <GoalView
            target={target}
            macroTargets={macroTargets}
            consumed={consumed}
            protein={protein}
            carbs={carbs}
            fat={fat}
            onSave={saveGoal}
          />
        )}

        {view === "workout" && <WorkoutView consumed={consumed} target={target} />}

        {view === "profile" && (
          <ProfileView
            deviceId={deviceId}
            target={target}
            consumed={consumed}
            remaining={remaining}
            totalItems={foods.length}
            daysLeft={daysLeft}
            onReset={resetToday}
            user={
              session?.user
                ? {
                    name: session.user.name ?? null,
                    email: session.user.email ?? null,
                    image: session.user.image ?? null,
                    role: session.user.role,
                  }
                : null
            }
            onLogin={() => setLoginOpen(true)}
          />
        )}
      </main>

      <BottomNav active={view} onChange={setView} onAdd={() => setAddMenuOpen(true)} addDisabled={analyzing} />

      {loginOpen && <LoginSheet onClose={() => setLoginOpen(false)} />}
    </div>
  );
}

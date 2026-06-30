"use client";

import { useState, useEffect, useCallback } from "react";
import { getPhotos } from "@/lib/photoStore";

interface HistoryFood {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  imageUrl?: string;
}

interface HistoryDay {
  date: string;
  target: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foods: HistoryFood[];
}

interface HistoryViewProps {
  // Device-scoped history for the current user (anonymous or self). When the
  // session is signed in, the server returns account-owned history regardless.
  deviceId?: string;
  // Trainer mode: read a linked client's history through the authorized endpoint.
  clientId?: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "short",
  });
}

function CalorieBar({ consumed, target }: { consumed: number; target: number }) {
  const pct = Math.min((consumed / target) * 100, 100);
  const isOver = consumed > target;

  return (
    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-danger" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function HistoryView({ deviceId, clientId }: HistoryViewProps) {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadHistory = useCallback(async (offset = 0) => {
    try {
      setError(null);
      const url = clientId
        ? `/api/trainer/clients/${clientId}/history?limit=30&offset=${offset}`
        : `/api/history?deviceId=${deviceId ?? ""}&limit=30&offset=${offset}`;
      const res = await fetch(url);

      if (res.status === 503) {
        setError("db_not_configured");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Bilinmeyen hata");

      const newDays: HistoryDay[] = data.days || [];

      // Foods without a hosted image URL may still have an on-device photo
      // (captured when Blob hosting was unavailable) — re-attach those.
      const missingIds = newDays.flatMap((d) =>
        d.foods.filter((f) => !f.imageUrl).map((f) => f.id)
      );
      if (missingIds.length) {
        const local = await getPhotos(missingIds);
        if (Object.keys(local).length) {
          for (const d of newDays) {
            for (const f of d.foods) {
              if (!f.imageUrl && local[f.id]) f.imageUrl = local[f.id];
            }
          }
        }
      }

      if (offset === 0) {
        setDays(newDays);
      } else {
        setDays((prev) => [...prev, ...newDays]);
      }
      setHasMore(newDays.length === 30);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
      setError(`Gecmis yuklenemedi: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [deviceId, clientId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 text-muted">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Gecmis yukleniyor...</p>
      </div>
    );
  }

  if (error === "db_not_configured") {
    return (
      <div className="bg-card-bg rounded-2xl p-6 border border-border text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>
        </div>
        <h3 className="font-bold text-sm mb-1">Veritabani Baglantisi Gerekli</h3>
        <p className="text-xs text-muted mb-4">
          Gecmis takibi icin Vercel Postgres veritabanini projenize baglayip
          <code className="bg-background px-1.5 py-0.5 rounded text-[10px] font-mono mx-1">POSTGRES_URL</code>
          ortam degiskenini ekleyin.
        </p>
        <a
          href="https://vercel.com/docs/storage/vercel-postgres/quickstart"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-primary"
        >
          Kurulum Rehberi →
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-light/50 rounded-2xl p-5 text-center border border-danger/10">
        <p className="text-sm text-danger font-medium mb-3">{error}</p>
        <button
          onClick={() => { setLoading(true); loadHistory(); }}
          className="text-sm font-semibold text-danger underline"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="font-medium text-foreground/60">Henuz gecmis kaydi yok</p>
        <p className="text-sm mt-1">Gunluk verileriniz otomatik kaydedilecek</p>
      </div>
    );
  }

  // Weekly averages
  const last7 = days.slice(0, 7);
  const avgCalories = Math.round(last7.reduce((s, d) => s + d.totalCalories, 0) / last7.length);
  const avgProtein = Math.round(last7.reduce((s, d) => s + d.totalProtein, 0) / last7.length);
  const avgCarbs = Math.round(last7.reduce((s, d) => s + d.totalCarbs, 0) / last7.length);
  const avgFat = Math.round(last7.reduce((s, d) => s + d.totalFat, 0) / last7.length);

  return (
    <>
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={fullscreenImage} alt="Yiyecek" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}

      <div className="space-y-4">
        {/* Weekly averages */}
        <div className="bg-card-bg rounded-2xl p-4 border border-border shadow-sm">
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
            Son {last7.length} Gun Ortalamasi
          </span>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{avgCalories}</div>
              <div className="text-[10px] text-muted">kcal</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-500">{avgProtein}g</div>
              <div className="text-[10px] text-muted">protein</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-500">{avgCarbs}g</div>
              <div className="text-[10px] text-muted">karb</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-rose-400">{avgFat}g</div>
              <div className="text-[10px] text-muted">yag</div>
            </div>
          </div>
        </div>

        {/* Day list */}
        <div className="space-y-2">
          {days.map((day, idx) => {
            const isExpanded = expandedDay === day.date;
            const isOver = day.totalCalories > day.target;
            const photos = day.foods.filter((f) => f.imageUrl).map((f) => f.imageUrl!);
            const uniquePhotos = [...new Set(photos)];

            return (
              <div
                key={day.date}
                className="bg-card-bg rounded-2xl border border-border shadow-sm overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Photo strip preview (collapsed) */}
                {!isExpanded && uniquePhotos.length > 0 && (
                  <div className="flex overflow-hidden">
                    {uniquePhotos.slice(0, 4).map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setFullscreenImage(url)}
                        className="relative flex-1 min-w-0"
                      >
                        <img
                          src={url}
                          alt="Ogun"
                          className="w-full h-24 object-cover"
                        />
                        {i === 3 && uniquePhotos.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">+{uniquePhotos.length - 4}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Expanded photo gallery */}
                {isExpanded && uniquePhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto p-3 pb-0">
                    {uniquePhotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setFullscreenImage(url)}
                        className="shrink-0 rounded-xl overflow-hidden"
                      >
                        <img
                          src={url}
                          alt="Ogun"
                          className="w-28 h-28 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold">{formatDate(day.date)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${isOver ? "text-danger" : "text-primary"}`}>
                        {day.totalCalories}
                      </span>
                      <span className="text-[10px] text-muted">/ {day.target} kcal</span>
                      <svg
                        className={`w-4 h-4 text-muted transition-transform duration-200 ml-1 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <CalorieBar consumed={day.totalCalories} target={day.target} />
                  <div className="flex gap-3 mt-2 text-[10px] text-muted">
                    <span>P: {Math.round(day.totalProtein)}g</span>
                    <span>K: {Math.round(day.totalCarbs)}g</span>
                    <span>Y: {Math.round(day.totalFat)}g</span>
                    <span className="ml-auto">{day.foods.length} kalem</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 animate-fade-in-up">
                    {day.foods.map((food) => (
                      <div key={food.id} className="flex items-start gap-2.5 bg-background rounded-xl p-2.5">
                        {food.imageUrl && (
                          <button
                            onClick={() => setFullscreenImage(food.imageUrl!)}
                            className="shrink-0 rounded-lg overflow-hidden"
                          >
                            <img
                              src={food.imageUrl}
                              alt={food.name}
                              className="w-14 h-14 object-cover"
                            />
                          </button>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold truncate">{food.name}</div>
                          <div className="text-xs text-muted mt-0.5">{food.portion}</div>
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">P {food.protein}g</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-medium">K {food.carbs}g</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 font-medium">Y {food.fat}g</span>
                          </div>
                        </div>
                        <div className="shrink-0 ml-1 text-right">
                          <span className="text-sm font-bold text-primary">{food.calories}</span>
                          <div className="text-[10px] text-muted">{food.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Load more */}
        {hasMore && (
          <button
            onClick={() => { setLoading(true); loadHistory(days.length); }}
            className="w-full py-3 text-sm font-semibold text-primary bg-primary/5 rounded-xl active:bg-primary/10 transition-colors"
          >
            Daha Fazla Yukle
          </button>
        )}
      </div>
    </>
  );
}

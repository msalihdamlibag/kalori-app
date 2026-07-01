"use client";

import { useState, useEffect, useCallback } from "react";
import { getPhotos } from "@/lib/photoStore";
import { localDateStr } from "@/lib/date";
import SummaryCard from "./SummaryCard";
import { CalorieIcon, ProteinIcon, CarbIcon, FatIcon } from "./MetricIcons";

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
  macroTargets?: { protein: number; carbs: number; fat: number } | null;
  foods: HistoryFood[];
}

interface HistoryViewProps {
  // Device-scoped history for the current user (anonymous or self). When the
  // session is signed in, the server returns account-owned history regardless.
  deviceId?: string;
  // Trainer mode: read a linked client's history through the authorized endpoint.
  clientId?: string;
  // Render a goal/macro summary card for today and a weekly trend chart at the
  // top (used by the trainer's client detail).
  showTodaySummary?: boolean;
}

// Fallback macro split (30/40/30 by calories) when targets weren't synced.
function deriveMacros(cal: number) {
  return {
    protein: Math.round((cal * 0.3) / 4),
    carbs: Math.round((cal * 0.4) / 4),
    fat: Math.round((cal * 0.3) / 9),
  };
}

function todayStr() {
  return localDateStr();
}

// Compact 7-day calorie bars with the target as a faint reference line.
// The 7 dates (YYYY-MM-DD) of the current week, Monday → Sunday, in app-local
// time. We anchor on the local calendar date so the week matches the days the
// user actually logged under.
function currentWeekMonToSun(): string[] {
  const [y, m, d] = todayStr().split("-").map(Number);
  // Midnight UTC of today's local calendar date — used only to derive the
  // weekday and step day-by-day; the emitted strings stay calendar dates.
  const base = Date.UTC(y, m - 1, d);
  const sinceMon = (new Date(base).getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = base - sinceMon * 86400000;
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday + i * 86400000).toISOString().slice(0, 10)
  );
}

const WEEKDAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

// Fixed Monday→Sunday calorie bar chart for the current week, built from the
// loaded history. Days without a log render as a thin empty column; today's
// bar is highlighted, over-target days are red, and a dashed line marks the
// (most recent) calorie target.
function WeeklyTrend({ days }: { days: HistoryDay[] }) {
  const byDate = new Map(days.map((d) => [String(d.date).slice(0, 10), d]));
  const fallbackTarget = days[0]?.target ?? 2000;
  const today = todayStr();

  const week = currentWeekMonToSun().map((date, i) => {
    const d = byDate.get(date);
    return {
      date,
      label: WEEKDAY_LABELS[i],
      totalCalories: d?.totalCalories ?? 0,
      target: d?.target ?? fallbackTarget,
      hasData: !!d && d.totalCalories > 0,
      isFuture: date > today,
    };
  });

  const max = Math.max(...week.map((d) => Math.max(d.totalCalories, d.target)), 1);
  // Scale bars to ~82% of the plot so the value label above the tallest bar
  // still fits inside the card.
  const SCALE = 82;
  const targetLinePct = Math.min((fallbackTarget / max) * SCALE, SCALE);

  return (
    <div className="bg-card-bg rounded-3xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-accent/30 flex items-center justify-center">
          <svg className="w-4 h-4 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V11m5 5V7m5 9v-3M4 20h16" />
          </svg>
        </div>
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Haftalık Trend</span>
      </div>

      {/* Bars: container has an explicit height so % bar heights resolve. */}
      <div className="relative h-32 flex items-end gap-1.5">
        <div
          className="absolute inset-x-0 border-t border-dashed border-muted/40 z-0"
          style={{ bottom: `${targetLinePct}%` }}
        />
        {week.map((d) => {
          const pct = d.hasData ? Math.max((d.totalCalories / max) * SCALE, 5) : 0;
          const isOver = d.totalCalories > d.target;
          const isToday = d.date === today;
          return (
            <div key={d.date} className="relative z-10 flex-1 h-full flex flex-col items-center justify-end gap-1">
              {d.hasData && (
                <span className={`text-[8px] font-bold leading-none ${isOver ? "text-danger" : "text-foreground/70"}`}>
                  {d.totalCalories}
                </span>
              )}
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${
                  !d.hasData
                    ? "bg-border/60"
                    : isOver
                      ? "bg-danger"
                      : isToday
                        ? "bg-accent-strong"
                        : "bg-accent-dark"
                }`}
                style={{ height: `${Math.max(pct, d.hasData ? 5 : 2)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Weekday labels */}
      <div className="flex gap-1.5 mt-2">
        {week.map((d) => (
          <span
            key={d.date}
            className={`flex-1 text-center text-[10px] ${
              d.date === today ? "font-bold text-foreground" : "text-muted"
            }`}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
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

export default function HistoryView({ deviceId, clientId, showTodaySummary }: HistoryViewProps) {
  const [days, setDays] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  // Date-range filter (trainer client-detail only). null = all time.
  const [rangeDays, setRangeDays] = useState<number | null>(30);
  const showDateFilter = !!clientId;

  const loadHistory = useCallback(async (offset = 0) => {
    try {
      setError(null);
      let url: string;
      if (clientId) {
        const params = new URLSearchParams({ limit: "400", offset: String(offset) });
        if (rangeDays) {
          const from = localDateStr(new Date(Date.now() - (rangeDays - 1) * 86400000));
          params.set("from", from);
        }
        url = `/api/trainer/clients/${clientId}/history?${params.toString()}`;
      } else {
        url = `/api/history?deviceId=${deviceId ?? ""}&limit=30&offset=${offset}`;
      }
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
      // Trainer mode fetches the whole selected range at once (no paging).
      setHasMore(!clientId && newDays.length === 30);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bilinmeyen hata";
      setError(`Gecmis yuklenemedi: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [deviceId, clientId, rangeDays]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const rangeFilter = showDateFilter ? (
    <div className="flex gap-2 mb-4">
      {([
        { l: "7 gün", v: 7 },
        { l: "30 gün", v: 30 },
        { l: "90 gün", v: 90 },
        { l: "Tümü", v: null },
      ] as { l: string; v: number | null }[]).map((opt) => (
        <button
          key={String(opt.v)}
          onClick={() => {
            setLoading(true);
            setRangeDays(opt.v);
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
            rangeDays === opt.v ? "bg-accent text-foreground" : "bg-surface text-muted"
          }`}
        >
          {opt.l}
        </button>
      ))}
    </div>
  ) : null;

  if (loading) {
    return (
      <div>
        {rangeFilter}
        <div className="flex flex-col items-center py-16 text-muted">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Gecmis yukleniyor...</p>
        </div>
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
      <div>
        {rangeFilter}
        <div className="text-center py-12 text-muted">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="font-medium text-foreground/60">Bu aralıkta kayıt yok</p>
        <p className="text-sm mt-1">Farklı bir tarih aralığı seçebilirsin</p>
        </div>
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
        {rangeFilter}

        {/* Trainer view: today's goal/macro summary */}
        {showTodaySummary && days[0]?.date && String(days[0].date).slice(0, 10) === todayStr() && (
          <SummaryCard
            consumed={days[0].totalCalories}
            target={days[0].target}
            protein={Math.round(days[0].totalProtein)}
            carbs={Math.round(days[0].totalCarbs)}
            fat={Math.round(days[0].totalFat)}
            macroTargets={days[0].macroTargets ?? deriveMacros(days[0].target)}
          />
        )}

        {/* Weekly averages (directly under the daily summary) */}
        <div className="bg-card-bg rounded-3xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 7-7M21 8V3m0 0h-5" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Son {last7.length} Gün Ortalaması
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { v: `${avgCalories}`, label: "kcal", color: "text-primary", icon: <CalorieIcon className="w-3 h-3" /> },
              { v: `${avgProtein}g`, label: "protein", color: "text-blue-500", icon: <ProteinIcon className="w-3 h-3" /> },
              { v: `${avgCarbs}g`, label: "karb", color: "text-amber-500", icon: <CarbIcon className="w-3 h-3" /> },
              { v: `${avgFat}g`, label: "yağ", color: "text-rose-400", icon: <FatIcon className="w-3 h-3" /> },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-surface/60 py-2.5 text-center">
                <div className={`text-lg font-extrabold ${m.color}`}>{m.v}</div>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={m.color}>{m.icon}</span>
                  <span className="text-[10px] text-muted">{m.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly trend chart (Mon → Sun) */}
        {showTodaySummary && <WeeklyTrend days={days} />}

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
                className="bg-card-bg rounded-3xl border border-border shadow-sm overflow-hidden animate-fade-in-up"
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
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isOver ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.9}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-bold truncate">{formatDate(day.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-sm font-extrabold ${isOver ? "text-danger" : "text-primary"}`}>
                        {day.totalCalories}
                      </span>
                      <span className="text-[10px] text-muted">/ {day.target}</span>
                      <svg
                        className={`w-4 h-4 text-muted transition-transform duration-200 ml-1 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <CalorieBar consumed={day.totalCalories} target={day.target} />
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-semibold inline-flex items-center gap-1"><ProteinIcon className="w-2.5 h-2.5" />{Math.round(day.totalProtein)}g</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-semibold inline-flex items-center gap-1"><CarbIcon className="w-2.5 h-2.5" />{Math.round(day.totalCarbs)}g</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 font-semibold inline-flex items-center gap-1"><FatIcon className="w-2.5 h-2.5" />{Math.round(day.totalFat)}g</span>
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-muted font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                      </svg>
                      {day.foods.length}
                    </span>
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium inline-flex items-center gap-1"><ProteinIcon className="w-2.5 h-2.5" />{food.protein}g</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-medium inline-flex items-center gap-1"><CarbIcon className="w-2.5 h-2.5" />{food.carbs}g</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 font-medium inline-flex items-center gap-1"><FatIcon className="w-2.5 h-2.5" />{food.fat}g</span>
                          </div>
                        </div>
                        <div className="shrink-0 ml-1 text-right">
                          <span className="text-sm font-bold text-primary inline-flex items-center gap-1"><CalorieIcon className="w-3 h-3" />{food.calories}</span>
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

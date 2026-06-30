"use client";

import { useState } from "react";
import { FoodItem } from "./FoodLog";

interface Meal {
  id: string;
  time: string;
  imageUrl?: string;
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface TodayMealsProps {
  items: FoodItem[];
  onRemove: (id: string) => void;
}

function groupIntoMeals(items: FoodItem[]): Meal[] {
  const meals: Meal[] = [];
  const visited = new Set<string>();

  for (const item of items) {
    if (visited.has(item.id)) continue;

    const group = items.filter(
      (f) => !visited.has(f.id) && f.time === item.time && f.imageUrl === item.imageUrl
    );
    group.forEach((f) => visited.add(f.id));

    meals.push({
      id: group.map((f) => f.id).join("-"),
      time: item.time,
      imageUrl: item.imageUrl,
      items: group,
      totalCalories: group.reduce((s, f) => s + f.calories, 0),
      totalProtein: group.reduce((s, f) => s + f.protein, 0),
      totalCarbs: group.reduce((s, f) => s + f.carbs, 0),
      totalFat: group.reduce((s, f) => s + f.fat, 0),
    });
  }

  return meals;
}

function MacroPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex gap-1.5">
      <div className="w-0.5 rounded-full bg-foreground" />
      <div>
        <div className="text-sm font-bold leading-none">{Math.round(value)} g</div>
        <div className="text-[11px] text-muted">{label}</div>
      </div>
    </div>
  );
}

function Thumbnail({ url, onView }: { url?: string; onView: () => void }) {
  if (!url) {
    return (
      <div className="w-24 h-24 rounded-2xl bg-surface flex items-center justify-center shrink-0">
        <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    );
  }
  return (
    <button onClick={onView} className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 active:scale-[0.97] transition-transform">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Yemek" className="w-full h-full object-cover" />
    </button>
  );
}

export default function TodayMeals({ items, onRemove }: TodayMealsProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="bg-card-bg rounded-3xl border border-border p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center">
          <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="font-semibold text-foreground/70">Henüz yiyecek eklemedin</p>
        <p className="text-sm text-muted mt-1">
          Alttaki <span className="font-bold text-accent-strong">+</span> ile bir yemeğin fotoğrafını çek
        </p>
      </div>
    );
  }

  const meals = groupIntoMeals(items).reverse();

  return (
    <>
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fullscreenImage} alt="Yiyecek" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}

      <div className="space-y-3">
        {meals.map((meal) => {
          const isExpanded = expanded === meal.id;
          const multi = meal.items.length > 1;
          return (
            <div key={meal.id} className="bg-card-bg rounded-3xl border border-border overflow-hidden">
              <div className="flex items-center gap-4 p-3">
                <Thumbnail url={meal.imageUrl} onView={() => meal.imageUrl && setFullscreenImage(meal.imageUrl)} />

                <button
                  onClick={() => setExpanded(isExpanded ? null : meal.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <span className="inline-block text-sm font-bold text-accent-strong bg-accent/40 px-2.5 py-0.5 rounded-lg">
                    {meal.totalCalories} kcal
                  </span>
                  <h3 className="font-bold text-base mt-1.5 leading-snug truncate">
                    {meal.items.map((f) => f.name).join(", ")}
                  </h3>
                  <div className="flex items-stretch gap-3 mt-2">
                    <MacroPill value={meal.totalProtein} label="Protein" />
                    <MacroPill value={meal.totalFat} label="Yağ" />
                    <MacroPill value={meal.totalCarbs} label="Karb." />
                  </div>
                </button>

                <div className="flex flex-col items-end justify-between self-stretch py-1 shrink-0">
                  <span className="text-[11px] text-muted">{meal.time}</span>
                  {multi ? (
                    <button onClick={() => setExpanded(isExpanded ? null : meal.id)} className="p-1 text-muted">
                      <svg className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  ) : (
                    <button onClick={() => onRemove(meal.items[0].id)} className="p-1 text-muted/50 active:text-danger transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && multi && (
                <div className="px-3 pb-3 -mt-1 space-y-2 animate-fade-in-up">
                  {meal.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-surface rounded-2xl p-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{item.name}</div>
                        <div className="text-xs text-muted mt-0.5">{item.portion}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-sm font-bold text-accent-strong">{item.calories}</span>
                        <button onClick={() => onRemove(item.id)} className="p-1 text-muted/50 active:text-danger transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

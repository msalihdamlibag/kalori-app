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

interface DailyTimelineProps {
  items: FoodItem[];
  onRemove: (id: string) => void;
}

function groupIntoMeals(items: FoodItem[]): Meal[] {
  const meals: Meal[] = [];
  const visited = new Set<string>();

  for (const item of items) {
    if (visited.has(item.id)) continue;

    const group = items.filter(
      (f) =>
        !visited.has(f.id) &&
        f.time === item.time &&
        f.imageUrl === item.imageUrl
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

function MacroBar({ label, value, color, unit = "g" }: { label: string; value: number; color: string; unit?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-semibold text-foreground ml-auto">
        {value}{unit}
      </span>
    </div>
  );
}

export default function DailyTimeline({
  items,
  onRemove,
}: DailyTimelineProps) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="font-medium text-foreground/60">Henuz yiyecek eklenmedi</p>
        <p className="text-sm mt-1">Fotografla ekleyin</p>
      </div>
    );
  }

  const meals = groupIntoMeals(items);
  const totalDayCalories = items.reduce((s, f) => s + f.calories, 0);
  const totalDayProtein = items.reduce((s, f) => s + f.protein, 0);
  const totalDayCarbs = items.reduce((s, f) => s + f.carbs, 0);
  const totalDayFat = items.reduce((s, f) => s + f.fat, 0);

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
          <img
            src={fullscreenImage}
            alt="Yiyecek"
            className="max-w-full max-h-full rounded-2xl object-contain"
          />
        </div>
      )}

      <div className="space-y-4">
        {/* Daily summary */}
        <div className="bg-card-bg rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Gunluk Ozet</span>
            <span className="text-sm font-bold text-primary">{totalDayCalories} kcal</span>
          </div>
          <div className="space-y-2">
            <MacroBar label="Protein" value={totalDayProtein} color="bg-blue-500" />
            <MacroBar label="Karbonhidrat" value={totalDayCarbs} color="bg-amber-500" />
            <MacroBar label="Yag" value={totalDayFat} color="bg-rose-400" />
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />

          <div className="space-y-3">
            {meals.map((meal, idx) => {
              const isExpanded = expandedMeal === meal.id;

              return (
                <div
                  key={meal.id}
                  className="relative flex gap-3 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Time dot */}
                  <div className="relative z-10 flex flex-col items-center shrink-0 pt-3">
                    <div className="w-10 h-10 rounded-full bg-card-bg border-2 border-primary shadow-sm flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary leading-none">
                        {meal.time}
                      </span>
                    </div>
                  </div>

                  {/* Meal card */}
                  <div className="flex-1 min-w-0 bg-card-bg rounded-2xl border border-border shadow-sm overflow-hidden">
                    {meal.imageUrl && (
                      <button
                        onClick={() => setFullscreenImage(meal.imageUrl!)}
                        className="w-full block relative group"
                      >
                        <img
                          src={meal.imageUrl}
                          alt="Ogun"
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </button>
                    )}

                    <div className="p-3.5">
                      <button
                        onClick={() =>
                          setExpandedMeal(isExpanded ? null : meal.id)
                        }
                        className="w-full"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-left min-w-0 pr-2">
                            <div className="font-semibold text-sm truncate">
                              {meal.items.map((f) => f.name).join(", ")}
                            </div>
                            <div className="text-xs text-muted mt-0.5">
                              {meal.items.length} kalem
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {meal.totalCalories}
                            </span>
                            <span className="text-xs text-muted">kcal</span>
                            <svg
                              className={`w-4 h-4 text-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2.5 border-t border-border pt-3 animate-fade-in-up">
                          {meal.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between bg-background rounded-xl p-2.5"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate">
                                  {item.name}
                                </div>
                                <div className="text-xs text-muted mt-0.5">
                                  {item.portion}
                                </div>
                                <div className="flex gap-2 mt-1.5">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium">P {item.protein}g</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 font-medium">K {item.carbs}g</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 font-medium">Y {item.fat}g</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <span className="text-sm font-bold text-primary">
                                  {item.calories}
                                </span>
                                <button
                                  onClick={() => onRemove(item.id)}
                                  className="text-muted/40 active:text-danger p-1 transition-colors"
                                >
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

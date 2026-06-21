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

export default function DailyTimeline({
  items,
  onRemove,
}: DailyTimelineProps) {
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📷</div>
        <p>Henüz yiyecek eklenmedi</p>
        <p className="text-sm">Fotoğraf çekerek başlayın</p>
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
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 p-2">
            <svg
              className="w-8 h-8"
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
          <img
            src={fullscreenImage}
            alt="Yiyecek"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2 bg-card-bg rounded-xl p-3 border border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">
              {totalDayCalories}
            </div>
            <div className="text-xs text-gray-500">kcal</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-500">
              {totalDayProtein}g
            </div>
            <div className="text-xs text-gray-500">protein</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-500">
              {totalDayCarbs}g
            </div>
            <div className="text-xs text-gray-500">karb</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">
              {totalDayFat}g
            </div>
            <div className="text-xs text-gray-500">yag</div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {meals.map((meal) => {
              const isExpanded = expandedMeal === meal.id;

              return (
                <div key={meal.id} className="relative flex gap-3">
                  <div className="relative z-10 flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {meal.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 bg-card-bg rounded-xl border border-border shadow-sm overflow-hidden">
                    {meal.imageUrl && (
                      <button
                        onClick={() => setFullscreenImage(meal.imageUrl!)}
                        className="w-full block"
                      >
                        <img
                          src={meal.imageUrl}
                          alt="Öğün"
                          className="w-full h-36 object-cover"
                        />
                      </button>
                    )}

                    <div className="p-3">
                      <button
                        onClick={() =>
                          setExpandedMeal(isExpanded ? null : meal.id)
                        }
                        className="w-full"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-left min-w-0">
                            <div className="font-medium truncate">
                              {meal.items.map((f) => f.name).join(", ")}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {meal.items.length} kalem
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-primary">
                              {meal.totalCalories} kcal
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 border-t border-border pt-3">
                          {meal.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">
                                  {item.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.portion}
                                </div>
                                <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                                  <span>P: {item.protein}g</span>
                                  <span>K: {item.carbs}g</span>
                                  <span>Y: {item.fat}g</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-semibold text-primary">
                                  {item.calories}
                                </span>
                                <button
                                  onClick={() => onRemove(item.id)}
                                  className="text-gray-300 hover:text-danger p-1"
                                >
                                  <svg
                                    className="w-4 h-4"
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
                            </div>
                          ))}

                          <div className="flex gap-3 text-xs text-gray-500 pt-2 border-t border-border">
                            <span>Protein: {meal.totalProtein}g</span>
                            <span>Karb: {meal.totalCarbs}g</span>
                            <span>Yag: {meal.totalFat}g</span>
                          </div>
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

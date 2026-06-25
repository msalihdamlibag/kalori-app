"use client";

import { useState } from "react";
import { FoodItem } from "./FoodLog";

interface CalorieRingProps {
  consumed: number;
  target: number;
  foods?: FoodItem[];
}

export default function CalorieRing({ consumed, target, foods = [] }: CalorieRingProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min((consumed / target) * 100, 100);
  const isOver = consumed > target;
  const overAmount = isOver ? consumed - target : 0;

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  const protein = Math.round(foods.reduce((s, f) => s + (f.protein || 0), 0));
  const carbs = Math.round(foods.reduce((s, f) => s + (f.carbs || 0), 0));
  const fat = Math.round(foods.reduce((s, f) => s + (f.fat || 0), 0));

  // Photographed foods that contribute to the calorie total, newest first
  const photographed = foods.filter((f) => f.imageUrl);

  return (
    <div className="bg-card-bg rounded-2xl p-5 shadow-sm border border-border">
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

      <div className="flex items-center justify-center">
        <div className="relative w-44 h-44">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={isOver ? "var(--danger)" : "var(--primary)"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isOver ? (
              <>
                <span className="text-3xl font-extrabold text-danger">
                  +{overAmount}
                </span>
                <span className="text-xs font-medium text-danger/70 mt-0.5">
                  fazla kcal
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl font-extrabold text-primary">
                  {remaining}
                </span>
                <span className="text-xs font-medium text-muted mt-0.5">
                  kalan kcal
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-10 mt-4">
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{consumed}</div>
          <div className="text-xs text-muted">tuketilen</div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="text-lg font-bold text-foreground">{target}</div>
          <div className="text-xs text-muted">hedef</div>
        </div>
      </div>

      {/* Macro breakdown from photographed foods */}
      {foods.length > 0 && (
        <div className="flex justify-center gap-2 mt-4">
          <span className="text-[11px] px-2 py-1 rounded-lg bg-blue-50 text-blue-600 font-semibold">
            Protein {protein}g
          </span>
          <span className="text-[11px] px-2 py-1 rounded-lg bg-amber-50 text-amber-600 font-semibold">
            Karb. {carbs}g
          </span>
          <span className="text-[11px] px-2 py-1 rounded-lg bg-rose-50 text-rose-500 font-semibold">
            Yag {fat}g
          </span>
        </div>
      )}

      {/* Photographed foods contributing to the calorie total */}
      {photographed.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">
              Cektigin Yemekler
            </span>
            <span className="text-[11px] text-muted">{photographed.length} fotograf</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
            {photographed.map((f) => (
              <button
                key={f.id}
                onClick={() => f.imageUrl && setFullscreenImage(f.imageUrl)}
                className="shrink-0 w-20 text-left active:scale-[0.97] transition-transform"
              >
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                  <img
                    src={f.imageUrl}
                    alt={f.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                    <span className="text-[10px] font-bold text-white leading-none">
                      {f.calories} kcal
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-muted mt-1 truncate">{f.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { FoodItem } from "./FoodLog";

interface StorySectionProps {
  foods: FoodItem[];
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

function FoodCard({ food, onView }: { food: FoodItem; onView: (url: string) => void }) {
  return (
    <div className="bg-card-bg rounded-3xl border border-border overflow-hidden">
      <div className="flex items-center gap-4 p-3">
        {/* Photographed thumbnail */}
        <button
          onClick={() => food.imageUrl && onView(food.imageUrl)}
          className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 active:scale-[0.97] transition-transform"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={food.imageUrl} alt={food.name} className="w-full h-full object-cover" />
        </button>

        <div className="flex-1 min-w-0">
          <span className="inline-block text-sm font-bold text-accent-strong bg-accent/40 px-2.5 py-0.5 rounded-lg">
            {food.calories} kcal
          </span>
          <h3 className="font-bold text-base mt-1.5 leading-snug truncate">{food.name}</h3>

          <div className="flex items-stretch gap-3 mt-2">
            <MacroPill value={food.protein} label="Protein" />
            <MacroPill value={food.fat} label="Yağ" />
            <MacroPill value={food.carbs} label="Karb." />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StorySection({ foods }: StorySectionProps) {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Only foods the user actually photographed, newest first.
  const photographed = foods.filter((f) => f.imageUrl).reverse();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
          <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M19 9a7 7 0 00-13-2M5 15a7 7 0 0013 2" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold">Hikaye</h2>
      </div>

      {photographed.length === 0 ? (
        <div className="bg-card-bg rounded-3xl border border-border p-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-surface flex items-center justify-center">
            <svg className="w-7 h-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="font-semibold text-foreground/70">Henüz yemek fotoğrafın yok</p>
          <p className="text-sm text-muted mt-1">
            Alttaki <span className="font-bold text-accent-strong">+</span> ile bir yemeğin fotoğrafını çek
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {photographed.map((food) => (
            <FoodCard key={food.id} food={food} onView={setFullscreenImage} />
          ))}
        </div>
      )}

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fullscreenImage} alt="Yiyecek" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

interface StoryRecipe {
  name: string;
  emoji: string;
  gradient: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  prepTime: string;
  ingredients: string[];
  steps: string[];
}

// Curated recipe "stories" shown on the home screen.
const RECIPES: StoryRecipe[] = [
  {
    name: "Avokadolu yengeç köftesi",
    emoji: "🥑",
    gradient: "from-lime-200 to-emerald-300",
    calories: 251,
    protein: 19,
    fat: 11,
    carbs: 18,
    prepTime: "25 dk",
    ingredients: ["200 g yengeç eti", "1 avokado", "1 yumurta", "2 yk galeta unu", "Roka, limon"],
    steps: [
      "Yengeç etini yumurta ve galeta unuyla karıştırıp köfte şekli verin.",
      "Az zeytinyağında her iki tarafını 3-4 dakika kızartın.",
      "Dilimlenmiş avokado ve roka ile servis edin, üzerine limon sıkın.",
    ],
  },
  {
    name: "Kinoalı hindi sandviç",
    emoji: "🥪",
    gradient: "from-amber-200 to-orange-300",
    calories: 371,
    protein: 28,
    fat: 12,
    carbs: 34,
    prepTime: "15 dk",
    ingredients: ["2 dilim tam buğday ekmek", "100 g hindi göğsü", "3 yk haşlanmış kinoa", "Domates, marul", "1 tk hardal"],
    steps: [
      "Hindi göğsünü baharatlayıp ızgarada pişirin.",
      "Ekmeğin arasına hardal sürün, kinoa, hindi ve sebzeleri yerleştirin.",
      "Hafifçe bastırıp ikiye bölerek servis edin.",
    ],
  },
  {
    name: "Izgara tavuklu buddha kasesi",
    emoji: "🥗",
    gradient: "from-emerald-200 to-teal-300",
    calories: 420,
    protein: 35,
    fat: 14,
    carbs: 38,
    prepTime: "30 dk",
    ingredients: ["150 g tavuk göğsü", "1/2 su bardağı bulgur", "Nohut, kırmızı lahana", "Avokado", "Tahin sos"],
    steps: [
      "Bulguru haşlayın, tavuğu ızgarada pişirip dilimleyin.",
      "Kaseye bulgur, nohut, lahana ve avokadoyu yerleştirin.",
      "Üzerine tavuğu ekleyip tahin sosla servis edin.",
    ],
  },
  {
    name: "Yulaflı muzlu krep",
    emoji: "🥞",
    gradient: "from-yellow-200 to-amber-300",
    calories: 295,
    protein: 14,
    fat: 8,
    carbs: 42,
    prepTime: "10 dk",
    ingredients: ["1 muz", "2 yumurta", "4 yk yulaf", "1 tk tarçın", "Bir tutam yoğurt"],
    steps: [
      "Muz, yumurta ve yulafı blenderdan geçirin.",
      "Yapışmaz tavada küçük krepler halinde pişirin.",
      "Yoğurt ve taze meyveyle servis edin.",
    ],
  },
];

function RecipeCard({ recipe }: { recipe: StoryRecipe }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card-bg rounded-3xl border border-border overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-4 p-3 text-left">
        {/* Thumbnail */}
        <div
          className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${recipe.gradient} flex items-center justify-center shrink-0`}
        >
          <span className="text-4xl">{recipe.emoji}</span>
        </div>

        <div className="flex-1 min-w-0">
          <span className="inline-block text-sm font-bold text-accent-strong bg-accent/40 px-2.5 py-0.5 rounded-lg">
            {recipe.calories} kcal
          </span>
          <h3 className="font-bold text-base mt-1.5 leading-snug truncate">{recipe.name}</h3>

          <div className="flex items-stretch gap-3 mt-2">
            <div className="flex gap-1.5">
              <div className="w-0.5 rounded-full bg-foreground" />
              <div>
                <div className="text-sm font-bold leading-none">{recipe.protein} g</div>
                <div className="text-[11px] text-muted">Protein</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="w-0.5 rounded-full bg-foreground" />
              <div>
                <div className="text-sm font-bold leading-none">{recipe.fat} g</div>
                <div className="text-[11px] text-muted">Yağ</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="w-0.5 rounded-full bg-foreground" />
              <div>
                <div className="text-sm font-bold leading-none">{recipe.carbs} g</div>
                <div className="text-[11px] text-muted">Karb.</div>
              </div>
            </div>
          </div>
        </div>

        <svg
          className={`w-5 h-5 text-muted shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-4 animate-fade-in-up">
          <div className="text-[11px] font-semibold text-muted">Hazırlık: {recipe.prepTime}</div>
          <div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Malzemeler</div>
            <div className="space-y-1.5">
              {recipe.ingredients.map((ing, j) => (
                <div key={j} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-dark shrink-0" />
                  {ing}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">Yapılışı</div>
            <div className="space-y-2.5">
              {recipe.steps.map((step, j) => (
                <div key={j} className="flex gap-2.5 text-sm">
                  <span className="w-5 h-5 rounded-full bg-accent/40 text-accent-strong text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {j + 1}
                  </span>
                  <span className="text-foreground/80">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StorySection() {
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

      <div className="space-y-3">
        {RECIPES.map((recipe) => (
          <RecipeCard key={recipe.name} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}

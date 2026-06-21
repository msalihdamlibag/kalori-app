"use client";

import { useState } from "react";

interface Recipe {
  name: string;
  calories: number;
  prepTime: string;
  ingredients: string[];
  steps: string[];
  nutritionNote: string;
}

interface RecipeSuggestionsProps {
  remainingCalories?: number;
}

export default function RecipeSuggestions({
  remainingCalories,
}: RecipeSuggestionsProps) {
  const [ingredients, setIngredients] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);

  const fetchRecipes = async () => {
    if (!ingredients.trim()) return;
    setLoading(true);
    setRecipes([]);
    try {
      const res = await fetch("/api/suggest-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients, remainingCalories }),
      });
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch {
      /* handled by empty state */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card-bg rounded-2xl p-4 shadow-sm border border-border">
        <h3 className="font-bold text-sm mb-3">Evdeki Malzemeler</h3>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Malzemelerinizi yazin... (orn: tavuk gogsu, pirinc, brokoli, zeytinyagi)"
          className="w-full bg-background border border-border rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted/60"
        />
        <button
          onClick={fetchRecipes}
          disabled={loading || !ingredients.trim()}
          className="w-full mt-3 bg-gradient-to-r from-primary to-primary-dark text-white py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 shadow-sm"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Tarifler hazirlaniyor...
            </span>
          ) : (
            "Yemek Onerisi Al"
          )}
        </button>
      </div>

      {recipes.map((recipe, i) => (
        <div
          key={i}
          className="bg-card-bg rounded-2xl shadow-sm border border-border overflow-hidden animate-fade-in-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <button
            onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}
            className="w-full p-4 text-left flex justify-between items-center"
          >
            <div>
              <div className="font-bold text-sm">{recipe.name}</div>
              <div className="flex gap-3 mt-1.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-primary-light text-primary-dark">
                  {recipe.calories} kcal
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-background text-muted">
                  {recipe.prepTime}
                </span>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-muted transition-transform duration-200 ${expandedRecipe === i ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedRecipe === i && (
            <div className="px-4 pb-4 border-t border-border pt-3 space-y-4 animate-fade-in-up">
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
                  Malzemeler
                </div>
                <div className="space-y-1.5">
                  {recipe.ingredients.map((ing, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      {ing}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
                  Yapilisi
                </div>
                <div className="space-y-2.5">
                  {recipe.steps.map((step, j) => (
                    <div key={j} className="flex gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      <span className="text-foreground/80">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              {recipe.nutritionNote && (
                <div className="flex gap-2 bg-primary-light/50 p-3 rounded-xl">
                  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-primary-dark/80">{recipe.nutritionNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

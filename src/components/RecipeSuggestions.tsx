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
      <div className="bg-card-bg rounded-xl p-4 shadow-sm border border-border">
        <h3 className="font-semibold mb-2">Evdeki Malzemeler</h3>
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          placeholder="Malzemelerinizi yazın... (örn: tavuk göğsü, pirinç, brokoli, zeytinyağı)"
          className="w-full bg-background border border-border rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={fetchRecipes}
          disabled={loading || !ingredients.trim()}
          className="w-full mt-2 bg-primary text-white py-2.5 rounded-lg font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Tarifler hazırlanıyor...
            </span>
          ) : (
            "Yemek Önerisi Al"
          )}
        </button>
      </div>

      {recipes.map((recipe, i) => (
        <div
          key={i}
          className="bg-card-bg rounded-xl shadow-sm border border-border overflow-hidden"
        >
          <button
            onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}
            className="w-full p-4 text-left flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{recipe.name}</div>
              <div className="flex gap-3 text-xs text-gray-500 mt-1">
                <span>{recipe.calories} kcal</span>
                <span>{recipe.prepTime}</span>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedRecipe === i ? "rotate-180" : ""}`}
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
          </button>
          {expandedRecipe === i && (
            <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Malzemeler
                </div>
                <ul className="text-sm space-y-1">
                  {recipe.ingredients.map((ing, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-primary">•</span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Yapılışı
                </div>
                <ol className="text-sm space-y-2">
                  {recipe.steps.map((step, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-primary font-semibold shrink-0">
                        {j + 1}.
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              {recipe.nutritionNote && (
                <p className="text-xs text-gray-500 bg-green-50 p-2 rounded-lg">
                  💡 {recipe.nutritionNote}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

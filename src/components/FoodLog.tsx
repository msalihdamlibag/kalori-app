"use client";

export interface FoodItem {
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

interface FoodLogProps {
  items: FoodItem[];
  onRemove: (id: string) => void;
}

export default function FoodLog({ items, onRemove }: FoodLogProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📷</div>
        <p>Henüz yiyecek eklenmedi</p>
        <p className="text-sm">Fotoğraf çekerek başlayın</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 bg-card-bg rounded-xl p-3 shadow-sm border border-border"
        >
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-14 h-14 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{item.name}</div>
            <div className="text-xs text-gray-500">{item.portion}</div>
            <div className="flex gap-3 text-xs text-gray-400 mt-1">
              <span>P: {item.protein}g</span>
              <span>K: {item.carbs}g</span>
              <span>Y: {item.fat}g</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-primary">{item.calories}</div>
            <div className="text-xs text-gray-500">kcal</div>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="text-gray-300 hover:text-danger p-1"
          >
            <svg
              className="w-5 h-5"
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
      ))}
    </div>
  );
}

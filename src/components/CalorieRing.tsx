"use client";

interface CalorieRingProps {
  consumed: number;
  target: number;
}

export default function CalorieRing({ consumed, target }: CalorieRingProps) {
  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min((consumed / target) * 100, 100);
  const isOver = consumed > target;
  const overAmount = isOver ? consumed - target : 0;

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={isOver ? "#ef4444" : "#10b981"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isOver ? (
            <>
              <span className="text-3xl font-bold text-danger">
                +{overAmount}
              </span>
              <span className="text-sm text-danger">fazla kcal</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold text-primary">
                {remaining}
              </span>
              <span className="text-sm text-gray-500">kalan kcal</span>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-8 mt-3 text-sm text-gray-500">
        <div className="text-center">
          <div className="font-semibold text-foreground">{consumed}</div>
          <div>tüketilen</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-foreground">{target}</div>
          <div>hedef</div>
        </div>
      </div>
    </div>
  );
}

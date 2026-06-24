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

  const protein = 0;
  const carbs = 0;
  const fat = 0;

  return (
    <div className="bg-card-bg rounded-2xl p-5 shadow-sm border border-border">
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
    </div>
  );
}

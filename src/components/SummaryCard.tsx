"use client";

interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

interface SummaryCardProps {
  consumed: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
  macroTargets: MacroTargets;
}

function GaugeRing({ consumed, target }: { consumed: number; target: number }) {
  const r = 50;
  const cx = 60;
  const cy = 60;
  const c = 2 * Math.PI * r;
  const visible = 0.75; // 270° arc, gap centered at bottom
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const isOver = consumed > target;

  return (
    <div className="relative w-[120px] h-[120px] shrink-0">
      <svg className="w-full h-full" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${visible * c} ${(1 - visible) * c}`}
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={isOver ? "var(--danger)" : "var(--accent-dark)"}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${pct * visible * c} ${c}`}
          transform={`rotate(135 ${cx} ${cy})`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold leading-none">{target}</span>
        <span className="text-xs text-muted mt-0.5">kcal</span>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  const isOver = value > target;
  return (
    <div className="flex-1">
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold leading-none">{Math.round(value)}</span>
        <span className="text-xs text-muted font-medium">/{target}</span>
      </div>
      <div className="text-sm font-semibold mt-1">{label}</div>
      <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-danger" : "bg-foreground"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SummaryCard({
  consumed,
  target,
  protein,
  carbs,
  fat,
  macroTargets,
}: SummaryCardProps) {
  return (
    <div className="bg-surface rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-card-bg flex items-center justify-center">
          <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold">Günlük Özet</h2>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold tracking-tight">{consumed}</span>
          <span className="text-sm text-muted font-medium">kcal</span>
        </div>
        <GaugeRing consumed={consumed} target={target} />
      </div>

      <div className="flex gap-4 mt-2">
        <MacroBar label="Protein" value={protein} target={macroTargets.protein} />
        <MacroBar label="Yağ" value={fat} target={macroTargets.fat} />
        <MacroBar label="Karb." value={carbs} target={macroTargets.carbs} />
      </div>
    </div>
  );
}

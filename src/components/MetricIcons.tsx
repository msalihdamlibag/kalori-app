// Small, consistent icons for the four nutrition metrics, reused across every
// card so calories/protein/carbs/fat always read the same way.
//   calorie → flame, protein → egg, carbs → wheat, fat → droplet

interface IconProps {
  className?: string;
}

// Calorie — flame (filled)
export function CalorieIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.7 2c.2 2.4-1.1 3.7-2.4 5C9 8.3 7.7 9.8 7.7 12c-.6-.5-1-1.3-1.2-2.4C4.9 11.1 4 13 4 14.8 4 18.8 7.6 22 12 22s8-3.2 8-7.2c0-4.7-3.7-6.8-4.9-10.5-.3-1-1.7-1.8-2.4-2.3z" />
    </svg>
  );
}

// Protein — egg (filled)
export function ProteinIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c3.2 0 6.5 5.6 6.5 10.2A6.5 6.5 0 0112 19a6.5 6.5 0 01-6.5-6.8C5.5 7.6 8.8 2 12 2z" />
    </svg>
  );
}

// Carbs — wheat (stroke)
export function CarbIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21V8" />
      <path d="M12 9c-2-1-4.5-.7-4.5-.7s.2 2.5 1.6 3.4 2.9.4 2.9.4M12 9c2-1 4.5-.7 4.5-.7s-.2 2.5-1.6 3.4-2.9.4-2.9.4" />
      <path d="M12 14c-2-1-4.5-.7-4.5-.7s.2 2.5 1.6 3.4 2.9.4 2.9.4M12 14c2-1 4.5-.7 4.5-.7s-.2 2.5-1.6 3.4-2.9.4-2.9.4" />
    </svg>
  );
}

// Fat — droplet (filled)
export function FatIcon({ className = "w-3.5 h-3.5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5S5.5 9.6 5.5 14.5a6.5 6.5 0 0013 0C18.5 9.6 12 2.5 12 2.5z" />
    </svg>
  );
}

// Shared colour convention for each metric.
export const METRIC_COLORS = {
  calorie: "text-primary",
  protein: "text-blue-500",
  carbs: "text-amber-500",
  fat: "text-rose-400",
} as const;

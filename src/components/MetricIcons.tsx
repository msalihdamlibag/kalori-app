// Small, consistent icons for the four nutrition metrics, reused across every
// card so calories/protein/carbs/fat always read the same way. We use real
// emoji glyphs (rendered in full colour by the OS) for a friendlier, more
// realistic look. They inherit the surrounding font-size, so the `className`
// passed by callers (e.g. for layout) still works; sizing follows the text.
//   calorie → 🔥, protein → 🥚, carbs → 🌾, fat → 💧

interface IconProps {
  className?: string;
}

function Emoji({
  char,
  label,
  className = "",
}: {
  char: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`not-italic ${className ?? ""}`}
      role="img"
      aria-label={label}
      style={{ fontSize: "0.95em", lineHeight: 1 }}
    >
      {char}
    </span>
  );
}

export function CalorieIcon({ className }: IconProps) {
  return <Emoji char="🔥" label="kalori" className={className} />;
}

export function ProteinIcon({ className }: IconProps) {
  return <Emoji char="🥚" label="protein" className={className} />;
}

export function CarbIcon({ className }: IconProps) {
  return <Emoji char="🌾" label="karbonhidrat" className={className} />;
}

export function FatIcon({ className }: IconProps) {
  return <Emoji char="💧" label="yağ" className={className} />;
}

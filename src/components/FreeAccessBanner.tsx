"use client";

interface FreeAccessBannerProps {
  /** Number of free-trial days remaining (0–total). */
  daysLeft: number;
  totalDays: number;
}

function CountdownRing({ daysLeft, totalDays }: { daysLeft: number; totalDays: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = totalDays > 0 ? daysLeft / totalDays : 0;
  const offset = c - pct * c;

  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-extrabold text-white leading-none">{daysLeft}</span>
      </div>
    </div>
  );
}

export default function FreeAccessBanner({ daysLeft, totalDays }: FreeAccessBannerProps) {
  if (daysLeft <= 0) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-neutral-800 to-neutral-700 px-5 py-4">
      {/* Decorative accent blob standing in for the photo in the reference */}
      <div className="absolute right-0 top-0 bottom-0 w-40 pointer-events-none">
        <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-accent/30 blur-2xl" />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 w-16 h-20 rounded-[55%] bg-gradient-to-br from-accent to-accent-dark shadow-lg rotate-12" />
      </div>

      <div className="relative flex items-center gap-4">
        <CountdownRing daysLeft={daysLeft} totalDays={totalDays} />
        <div className="min-w-0">
          <h3 className="text-white font-bold text-base">Ücretsiz erişim</h3>
          <p className="text-white/70 text-xs leading-snug mt-0.5 pr-16">
            Kayıt anından itibaren {totalDays} günlük ücretsiz erişiminiz var.
          </p>
        </div>
      </div>
    </div>
  );
}

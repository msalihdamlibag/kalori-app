"use client";

export type View = "home" | "goal" | "workout" | "profile";

interface BottomNavProps {
  active: View;
  onChange: (view: View) => void;
  onAdd: () => void;
  addDisabled?: boolean;
  profileBadge?: boolean;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h3.5v-5a1 1 0 011-1h3a1 1 0 011 1v5H18a1 1 0 001-1V9.5" />
    </svg>
  );
}

function GoalIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2.4 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4a1 1 0 011-1h11l-2.5 3.5L17 10H6" />
    </svg>
  );
}

function WorkoutIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2.4 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M4 9l-1.5 1.5a1.5 1.5 0 000 2L4 14m16-4l1.5-1.5a1.5 1.5 0 000-2L20 5M9 4L7.5 5.5a1.5 1.5 0 000 2L9 9m6 6l1.5 1.5a1.5 1.5 0 002 0L20 15" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.5 3.13-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

function NavItem({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-1.5 transition-colors ${
        active ? "text-foreground" : "text-muted"
      }`}
    >
      {children}
      <span className={`text-[11px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </button>
  );
}

export default function BottomNav({ active, onChange, onAdd, addDisabled, profileBadge }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40">
      <div className="bg-card-bg border-t border-border rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <NavItem label="Ana Sayfa" active={active === "home"} onClick={() => onChange("home")}>
            <HomeIcon active={active === "home"} />
          </NavItem>
          <NavItem label="Hedef" active={active === "goal"} onClick={() => onChange("goal")}>
            <GoalIcon active={active === "goal"} />
          </NavItem>

          {/* Center add button */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={onAdd}
              disabled={addDisabled}
              aria-label="Yemek ekle"
              className="w-14 h-14 -mt-1 rounded-2xl bg-accent flex items-center justify-center shadow-[0_6px_18px_rgba(163,230,53,0.45)] active:scale-90 transition-transform disabled:opacity-60"
            >
              {addDisabled ? (
                <div className="w-6 h-6 border-2 border-accent-strong border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
                </svg>
              )}
            </button>
          </div>

          <NavItem label="Egzersiz" active={active === "workout"} onClick={() => onChange("workout")}>
            <WorkoutIcon active={active === "workout"} />
          </NavItem>
          <NavItem label="Profil" active={active === "profile"} onClick={() => onChange("profile")}>
            <span className="relative">
              <ProfileIcon active={active === "profile"} />
              {profileBadge && (
                <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-danger ring-2 ring-card-bg" />
              )}
            </span>
          </NavItem>
        </div>
      </div>
    </nav>
  );
}

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

// Shown once, right after first sign-in, when the user has no role yet.
// Picking a role is permanent (set server-side, then the session is refreshed).
export default function RoleSelect() {
  const { update } = useSession();
  const [saving, setSaving] = useState<"client" | "trainer" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (role: "client" | "trainer") => {
    if (saving) return;
    setSaving(role);
    setError(null);
    try {
      const res = await fetch("/api/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Rol kaydedilemedi");
      }
      // Refresh the JWT so session.user.role reflects the new value.
      await update();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rol kaydedilemedi");
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto w-full bg-background px-5 py-10 justify-center">
      <h1 className="text-2xl font-extrabold mb-1">Nasıl kullanacaksın?</h1>
      <p className="text-sm text-muted mb-7">Hesabının türünü seç. Bu seçim daha sonra değiştirilemez.</p>

      <div className="space-y-3">
        <button
          onClick={() => pick("client")}
          disabled={saving !== null}
          className="w-full text-left bg-surface rounded-3xl p-5 border border-border active:scale-[0.99] transition-transform disabled:opacity-60"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <circle cx="12" cy="8" r="3.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.5 3.13-6 7-6s7 2.5 7 6" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold">Danışan / Öğrenci</div>
              <div className="text-xs text-muted mt-0.5">Kalori ve öğünlerini takip et</div>
            </div>
            {saving === "client" && (
              <div className="ml-auto w-5 h-5 border-2 border-accent-strong border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </button>

        <button
          onClick={() => pick("trainer")}
          disabled={saving !== null}
          className="w-full text-left bg-surface rounded-3xl p-5 border border-border active:scale-[0.99] transition-transform disabled:opacity-60"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4z" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold">Eğitmen / Diyetisyen</div>
              <div className="text-xs text-muted mt-0.5">Danışanlarını takip et</div>
            </div>
            {saving === "trainer" && (
              <div className="ml-auto w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </button>
      </div>

      {error && <p className="text-sm text-danger mt-5 text-center">{error}</p>}
    </div>
  );
}

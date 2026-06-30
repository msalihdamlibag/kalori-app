"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

interface LoginSheetProps {
  onClose: () => void;
}

const LABELS: Record<string, string> = {
  google: "Google ile devam et",
  apple: "Apple ile devam et",
};

// Bottom-sheet login. Only providers that are actually configured (have
// credentials) are shown; if none are configured we say so instead of
// rendering dead buttons.
export default function LoginSheet({ onClose }: LoginSheetProps) {
  const [providers, setProviders] = useState<string[] | null>(null);

  useEffect(() => {
    getProviders()
      .then((p) => setProviders(p ? Object.keys(p) : []))
      .catch(() => setProviders([]));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-card-bg rounded-t-3xl w-full max-w-md p-5 pb-8 animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
        <h2 className="font-bold text-lg mb-1">Giriş Yap</h2>
        <p className="text-sm text-muted mb-5">
          Verilerini hesabına bağla, cihazlar arasında senkronla ve eğitmeninle eşleş.
        </p>

        {providers === null ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-accent-strong border-t-transparent rounded-full animate-spin" />
          </div>
        ) : providers.length === 0 ? (
          <div className="bg-surface rounded-2xl p-4 text-sm text-muted text-center">
            Giriş sağlayıcıları henüz yapılandırılmamış.
          </div>
        ) : (
          <div className="space-y-2.5">
            {providers.map((id) => (
              <button
                key={id}
                onClick={() => signIn(id)}
                className="flex items-center justify-center gap-3 w-full p-3.5 rounded-2xl border border-border bg-surface font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                {LABELS[id] ?? `${id} ile devam et`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

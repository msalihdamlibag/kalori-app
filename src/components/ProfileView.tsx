"use client";

import { useState } from "react";
import HistoryView from "./HistoryView";
import RecipeSuggestions from "./RecipeSuggestions";

interface ProfileViewProps {
  deviceId: string;
  target: number;
  consumed: number;
  remaining: number;
  totalItems: number;
  daysLeft: number;
  onReset: () => void;
}

type Section = "overview" | "history" | "recipes";

function MenuRow({
  icon,
  label,
  sub,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 active:bg-surface transition-colors text-left"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          danger ? "bg-danger/10 text-danger" : "bg-accent/30 text-accent-strong"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${danger ? "text-danger" : ""}`}>{label}</div>
        {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
      </div>
      <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center active:scale-90 transition-transform"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="text-2xl font-extrabold">{title}</h1>
    </div>
  );
}

export default function ProfileView({
  deviceId,
  target,
  consumed,
  remaining,
  totalItems,
  daysLeft,
  onReset,
}: ProfileViewProps) {
  const [section, setSection] = useState<Section>("overview");
  const [confirmReset, setConfirmReset] = useState(false);

  if (section === "history") {
    return (
      <div>
        <SubHeader title="Geçmiş" onBack={() => setSection("overview")} />
        {deviceId && <HistoryView deviceId={deviceId} />}
      </div>
    );
  }

  if (section === "recipes") {
    return (
      <div>
        <SubHeader title="Tarifler" onBack={() => setSection("overview")} />
        <RecipeSuggestions remainingCalories={remaining > 0 ? remaining : undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Profil</h1>

      {/* Profile card */}
      <div className="bg-surface rounded-3xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shrink-0">
          <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <circle cx="12" cy="8" r="3.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.5 3.13-6 7-6s7 2.5 7 6" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-lg">KaloriTakip Kullanıcısı</div>
          <div className="text-xs text-muted mt-0.5">
            {daysLeft > 0 ? `${daysLeft} gün ücretsiz erişim kaldı` : "Ücretsiz deneme bitti"}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card-bg rounded-2xl p-4 border border-border text-center">
          <div className="text-xl font-extrabold">{consumed}</div>
          <div className="text-[11px] text-muted mt-0.5">tüketilen</div>
        </div>
        <div className="bg-card-bg rounded-2xl p-4 border border-border text-center">
          <div className="text-xl font-extrabold">{target}</div>
          <div className="text-[11px] text-muted mt-0.5">hedef</div>
        </div>
        <div className="bg-card-bg rounded-2xl p-4 border border-border text-center">
          <div className="text-xl font-extrabold">{totalItems}</div>
          <div className="text-[11px] text-muted mt-0.5">bugünkü kalem</div>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-card-bg rounded-3xl border border-border overflow-hidden divide-y divide-border">
        <MenuRow
          onClick={() => setSection("history")}
          label="Geçmiş"
          sub="Geçmiş günlerin kayıtları"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <MenuRow
          onClick={() => setSection("recipes")}
          label="Tarifler"
          sub="Evdeki malzemelerle yemek önerisi"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m0-18c-2 0-4 1.5-4 4s2 2 2 4-2 1-2 3 2 4 4 4m0-15c2 0 4 1.5 4 4s-2 2-2 4 2 1 2 3-2 4-4 4" />
            </svg>
          }
        />
      </div>

      {/* Settings */}
      <div className="bg-card-bg rounded-3xl border border-border overflow-hidden">
        <MenuRow
          onClick={() => setConfirmReset(true)}
          label="Bugünün verisini sıfırla"
          sub="Bugün eklenen tüm yiyecekleri sil"
          danger
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          }
        />
      </div>

      <p className="text-center text-[11px] text-muted">
        Cihaz: {deviceId ? deviceId.slice(0, 8) : "—"}
      </p>

      {confirmReset && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card-bg rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
            <h2 className="font-bold text-lg mb-2">Emin misin?</h2>
            <p className="text-sm text-muted mb-5">Bugün eklediğin tüm yiyecekler silinecek. Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm active:bg-surface transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

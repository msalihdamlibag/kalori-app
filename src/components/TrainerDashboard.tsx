"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import HistoryView from "./HistoryView";
import TrainerClientNotes from "./TrainerClientNotes";

interface TrainerClient {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  gender: string | null;
  linkedAt: string;
  today: { date: string; target: number; totalCalories: number } | null;
}

const GENDER_LABEL: Record<string, string> = {
  female: "Kadın",
  male: "Erkek",
  other: "Diğer",
};

// "32 yaş · 78 kg · 180 cm · Erkek" — only the parts that are filled in.
function clientMeta(c: TrainerClient): string {
  const parts: string[] = [];
  if (c.age != null) parts.push(`${c.age} yaş`);
  if (c.weight != null) parts.push(`${c.weight} kg`);
  if (c.height != null) parts.push(`${c.height} cm`);
  if (c.gender && GENDER_LABEL[c.gender]) parts.push(GENDER_LABEL[c.gender]);
  return parts.join(" · ");
}

interface Invitation {
  code: string;
  qr: string;
  expiresAt: string | null;
}

export default function TrainerDashboard() {
  const { data: session } = useSession();
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TrainerClient | null>(null);
  const [invite, setInvite] = useState<Invitation | null>(null);
  const [inviting, setInviting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/trainer/clients");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Danışanlar yüklenemedi");
      setClients(data.clients || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Danışanlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const createInvite = async () => {
    if (inviting) return;
    setInviting(true);
    try {
      const res = await fetch("/api/invitations", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Davet oluşturulamadı");
      setInvite({ code: data.code, qr: data.qr, expiresAt: data.expiresAt });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Davet oluşturulamadı");
    } finally {
      setInviting(false);
    }
  };

  const removeClient = async () => {
    if (!selected || removing) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/trainer/clients/${selected.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Kaldırılamadı");
      setConfirmRemove(false);
      setSelected(null);
      await loadClients();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaldırılamadı");
    } finally {
      setRemoving(false);
    }
  };

  // --- Client detail ----------------------------------------------------
  if (selected) {
    return (
      <div className="flex flex-col min-h-screen max-w-md mx-auto w-full bg-background px-4 pt-5 pb-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setSelected(null); loadClients(); }}
            className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="w-11 h-11 rounded-full bg-accent/40 flex items-center justify-center shrink-0 overflow-hidden">
            {selected.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-accent-strong">
                {(selected.name || selected.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold truncate">
              {selected.name || selected.email || "Danışan"}
            </h1>
            {selected.email && <p className="text-xs text-muted truncate">{selected.email}</p>}
          </div>
        </div>

        {clientMeta(selected) ? (
          <div className="bg-surface rounded-2xl px-4 py-3 mb-4 text-sm font-semibold">
            {clientMeta(selected)}
          </div>
        ) : (
          <div className="bg-surface rounded-2xl px-4 py-3 mb-4 text-xs text-muted">
            Danışan henüz yaş/kilo/boy bilgisi girmemiş.
          </div>
        )}

        <div className="mb-4">
          <TrainerClientNotes clientId={selected.id} />
        </div>

        <HistoryView clientId={selected.id} showTodaySummary />

        <button
          onClick={() => setConfirmRemove(true)}
          className="mt-6 w-full py-3 rounded-2xl border border-danger/30 text-danger font-semibold text-sm active:bg-danger/5 transition-colors"
        >
          Danışanı Kaldır
        </button>

        {confirmRemove && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-card-bg rounded-2xl p-6 w-full max-w-sm shadow-xl animate-scale-in">
              <h2 className="font-bold text-lg mb-2">Danışanı kaldır?</h2>
              <p className="text-sm text-muted mb-5">
                {selected.name || selected.email || "Bu danışan"} listenden çıkacak ve kayıtlarına
                erişimin sonlanacak. Danışan seni yeniden davet kabul ederek tekrar bağlanabilir.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-sm active:bg-surface transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  onClick={removeClient}
                  disabled={removing}
                  className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {removing ? "Kaldırılıyor..." : "Kaldır"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Client list ------------------------------------------------------
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto w-full bg-background px-4 pt-5 pb-10">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold truncate">{session?.user?.name || "Eğitmen"}</h1>
            <p className="text-xs text-muted">Eğitmen / Diyetisyen</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setLoading(true); loadClients(); }}
            aria-label="Yenile"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface active:scale-95 transition-transform"
          >
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5 9a7 7 0 0111.5-3.5L20 9M19 15a7 7 0 01-11.5 3.5L4 15" />
            </svg>
          </button>
          <button
            onClick={() => signOut()}
            className="text-xs font-semibold text-muted px-3 py-2 rounded-xl bg-surface active:scale-95 transition-transform"
          >
            Çıkış
          </button>
        </div>
      </div>

      <button
        onClick={createInvite}
        disabled={inviting}
        className="w-full mb-5 py-3.5 rounded-2xl bg-accent text-foreground font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" />
        </svg>
        {inviting ? "Oluşturuluyor..." : "Danışan Davet Et"}
      </button>

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-bold text-muted uppercase tracking-wider">Danışanlarım</h2>
        {clients.length > 0 && (
          <span className="text-[11px] font-bold text-accent-strong bg-accent/30 rounded-full px-2 py-0.5">
            {clients.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-9 h-9 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-danger-light/50 rounded-2xl p-5 text-center border border-danger/10">
          <p className="text-sm text-danger font-medium mb-3">{error}</p>
          <button onClick={() => { setLoading(true); loadClients(); }} className="text-sm font-semibold text-danger underline">
            Tekrar Dene
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="font-medium text-foreground/60">Henüz danışanın yok</p>
          <p className="text-sm mt-1">Bir davet oluşturup danışanınla paylaş.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => {
            const isOver = c.today && c.today.totalCalories > c.today.target;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full bg-card-bg rounded-3xl p-4 border border-border active:scale-[0.99] active:border-primary/30 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-accent/40 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-surface">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-accent-strong">
                        {(c.name || c.email || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{c.name || c.email || "Danışan"}</div>
                    {clientMeta(c) && (
                      <div className="text-[11px] text-muted/80 truncate mt-0.5 flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <circle cx="12" cy="8" r="3.2" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20c0-3.3 2.9-5.6 6.5-5.6s6.5 2.3 6.5 5.6" />
                        </svg>
                        {clientMeta(c)}
                      </div>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {c.today ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-muted flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-accent-strong" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13l0-8z" />
                        </svg>
                        Bugün
                      </span>
                      <span className="text-xs">
                        <span className={`font-extrabold ${isOver ? "text-danger" : "text-primary"}`}>
                          {c.today.totalCalories}
                        </span>
                        <span className="text-muted"> / {c.today.target} kcal</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? "bg-danger" : "bg-accent-dark"}`}
                        style={{ width: `${Math.min((c.today.totalCalories / c.today.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-[11px] text-muted flex items-center gap-1.5 bg-surface/60 rounded-xl px-3 py-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Bugün henüz kayıt yok
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Invitation modal */}
      {invite && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setInvite(null); loadClients(); }}
        >
          <div
            className="bg-card-bg rounded-3xl p-6 w-full max-w-sm shadow-xl animate-scale-in text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-extrabold text-lg mb-1">Danışan Daveti</h2>
            <p className="text-xs text-muted mb-4">QR kodu okut ya da kodu paylaş.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={invite.qr} alt="Davet QR" className="w-44 h-44 mx-auto rounded-2xl border border-border" />
            <div className="mt-4 mb-1 text-2xl font-extrabold tracking-[0.3em]">{invite.code}</div>
            <p className="text-[11px] text-muted mb-5">Danışan bu kodu profilinden girerek eşleşir.</p>
            <button
              onClick={() => { setInvite(null); loadClients(); }}
              className="w-full py-3 rounded-xl bg-accent text-foreground font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Tamam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

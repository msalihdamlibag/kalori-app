"use client";

import { useState, useEffect } from "react";
import { pushSupported, isSubscribed, subscribeToPush, unsubscribeFromPush } from "@/lib/push";

// Toggle card for daily reminder push notifications. Shared between the client
// profile and the trainer dashboard — only the description text differs.
export default function PushToggle({
  deviceId,
  description,
}: {
  deviceId?: string | null;
  description: string;
}) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok = pushSupported();
    setSupported(ok);
    if (ok) isSubscribed().then(setOn);
  }, []);

  if (!supported) {
    return (
      <div className="bg-card-bg rounded-3xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shrink-0 text-muted">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">Günlük Hatırlatma</div>
            <div className="text-xs text-muted mt-0.5">
              Bildirimler için uygulamayı ana ekrana ekle (iOS) veya destekleyen bir tarayıcı kullan.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    if (on) {
      await unsubscribeFromPush();
      setOn(false);
    } else {
      const res = await subscribeToPush(deviceId ?? null);
      if (res.ok) setOn(true);
      else setMsg(res.error || "Açılamadı");
    }
    setBusy(false);
  };

  return (
    <div className="bg-card-bg rounded-3xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/30 text-accent-strong flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">Günlük Hatırlatma</div>
          <div className="text-xs text-muted mt-0.5">{description}</div>
          {msg && <div className="text-xs text-danger mt-0.5">{msg}</div>}
        </div>
        <button
          onClick={toggle}
          disabled={busy}
          aria-label="Günlük hatırlatmayı aç/kapat"
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-60 ${on ? "bg-accent-dark" : "bg-border"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`}
          />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import HistoryView from "./HistoryView";
import RecipeSuggestions from "./RecipeSuggestions";
import { pushSupported, isSubscribed, subscribeToPush, unsubscribeFromPush } from "@/lib/push";

interface ProfileUser {
  name: string | null;
  email: string | null;
  image: string | null;
  role: "client" | "trainer" | null;
}

interface ProfileViewProps {
  deviceId: string;
  target: number;
  consumed: number;
  remaining: number;
  totalItems: number;
  daysLeft: number;
  onReset: () => void;
  user?: ProfileUser | null;
  onLogin: () => void;
  onApplyTarget?: (target: number) => void;
}

type Section = "overview" | "history" | "recipes" | "connect" | "info" | "notes";

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
  user,
  onLogin,
  onApplyTarget,
}: ProfileViewProps) {
  const [section, setSection] = useState<Section>("overview");
  const [confirmReset, setConfirmReset] = useState(false);

  if (section === "history") {
    return (
      <div>
        <SubHeader title="Geçmiş" onBack={() => setSection("overview")} />
        {(deviceId || user) && <HistoryView deviceId={deviceId} />}
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

  if (section === "connect") {
    return (
      <div>
        <SubHeader title="Eğitmene Bağlan" onBack={() => setSection("overview")} />
        <ConnectTrainer />
      </div>
    );
  }

  if (section === "info") {
    return (
      <div>
        <SubHeader title="Bilgilerim" onBack={() => setSection("overview")} />
        <MyInfo />
      </div>
    );
  }

  if (section === "notes") {
    return (
      <div>
        <SubHeader title="Eğitmenimden Mesajlar" onBack={() => setSection("overview")} />
        <ClientNotes onApplyTarget={onApplyTarget} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">Profil</h1>

      {/* Profile card */}
      <div className="bg-surface rounded-3xl p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shrink-0 overflow-hidden">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <circle cx="12" cy="8" r="3.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.5 3.13-6 7-6s7 2.5 7 6" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-lg truncate">
            {user?.name || user?.email || "KaloriTakip Kullanıcısı"}
          </div>
          <div className="text-xs text-muted mt-0.5 truncate">
            {user
              ? user.email || "Danışan"
              : daysLeft > 0
                ? `${daysLeft} gün ücretsiz erişim kaldı`
                : "Ücretsiz deneme bitti"}
          </div>
        </div>
        {!user && (
          <button
            onClick={onLogin}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-accent text-foreground font-bold text-xs active:scale-95 transition-transform"
          >
            Giriş Yap
          </button>
        )}
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
        {user?.role === "client" && (
          <MenuRow
            onClick={() => setSection("info")}
            label="Bilgilerim"
            sub="Yaş, kilo, boy — eğitmenin görebilir"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        )}
        {user?.role === "client" && (
          <MenuRow
            onClick={() => setSection("notes")}
            label="Eğitmenimden Mesajlar"
            sub="Eğitmeninin notları ve hedef önerileri"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" />
              </svg>
            }
          />
        )}
        {user?.role === "client" && (
          <MenuRow
            onClick={() => setSection("connect")}
            label="Eğitmene Bağlan"
            sub="Davet kodu ile eğitmeninle eşleş"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-2.13a4 4 0 10-4-4 4 4 0 004 4z" />
              </svg>
            }
          />
        )}
      </div>

      {/* Notifications */}
      <PushToggle deviceId={deviceId} />

      {/* Settings */}
      <div className="bg-card-bg rounded-3xl border border-border overflow-hidden divide-y divide-border">
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
        {user && (
          <MenuRow
            onClick={() => signOut()}
            label="Çıkış Yap"
            sub={user.email || undefined}
            danger
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
          />
        )}
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

// Client-side form to redeem a trainer's invitation code.
function ConnectTrainer() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || status === "saving") return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Bağlanılamadı");
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlanılamadı");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <div className="bg-surface rounded-3xl p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/40 flex items-center justify-center">
          <svg className="w-7 h-7 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-bold text-sm mb-1">Eğitmenine bağlandın</h3>
        <p className="text-xs text-muted">Eğitmenin artık günlük kayıtlarını görebilir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Eğitmeninin paylaştığı davet kodunu gir. Kabul ettiğinde eğitmenin günlük kalori
        ve öğün kayıtlarını (fotoğraflar dahil) görebilir.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="DAVET KODU"
        autoCapitalize="characters"
        className="w-full bg-card-bg border border-border rounded-2xl px-4 py-3.5 text-center text-lg font-bold tracking-[0.2em] uppercase focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30"
      />
      {error && <p className="text-sm text-danger text-center">{error}</p>}
      <button
        onClick={submit}
        disabled={status === "saving" || !code.trim()}
        className="w-full py-3.5 rounded-2xl bg-accent text-foreground font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {status === "saving" ? "Bağlanıyor..." : "Eğitmene Bağlan"}
      </button>
    </div>
  );
}

// Client editable profile (age/weight/height/gender) shared with the trainer.
function MyInfo() {
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female" | "other">("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setAge(d.age != null ? String(d.age) : "");
          setWeight(d.weight != null ? String(d.weight) : "");
          setHeight(d.height != null ? String(d.height) : "");
          setGender(d.gender ?? "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (status === "saving") return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: age === "" ? null : Number(age),
          weight: weight === "" ? null : Number(weight),
          height: height === "" ? null : Number(height),
          gender: gender || null,
        }),
      });
      if (!res.ok) throw new Error("Kaydedilemedi");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi");
      setStatus("idle");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent-strong border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const field = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    suffix: string
  ) => (
    <div>
      <label className="text-xs text-muted font-medium">{label}</label>
      <div className="relative mt-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-card-bg border border-border rounded-2xl px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent-dark/30"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Bu bilgiler eğitmenin/diyetisyenin tarafından görülebilir. Boş bırakabilirsin.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {field("Yaş", age, setAge, "yıl")}
        {field("Kilo", weight, setWeight, "kg")}
        {field("Boy", height, setHeight, "cm")}
      </div>

      <div>
        <label className="text-xs text-muted font-medium">Cinsiyet</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {([
            ["female", "Kadın"],
            ["male", "Erkek"],
            ["other", "Diğer"],
          ] as const).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setGender(gender === val ? "" : val)}
              className={`py-2.5 rounded-2xl text-sm font-semibold border transition-colors ${
                gender === val
                  ? "bg-accent border-accent-dark/30 text-foreground"
                  : "bg-card-bg border-border text-muted"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-danger text-center">{error}</p>}

      <button
        onClick={save}
        disabled={status === "saving"}
        className="w-full py-3.5 rounded-2xl bg-accent text-foreground font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {status === "saving" ? "Kaydediliyor..." : status === "saved" ? "Kaydedildi ✓" : "Kaydet"}
      </button>
    </div>
  );
}

// Client's view of notes/messages from their trainer, with a one-tap "apply
// suggested target" action.
function ClientNotes({ onApplyTarget }: { onApplyTarget?: (target: number) => void }) {
  const [notes, setNotes] = useState<
    { id: string; body: string; suggestedTarget: number | null; createdAt: string; trainerName?: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/notes")
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((d) => setNotes(d.notes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent-strong border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-muted">
        <p className="font-medium text-foreground/60">Henüz mesaj yok</p>
        <p className="text-sm mt-1">Eğitmenin sana not gönderdiğinde burada görünür.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <div key={n.id} className="bg-surface rounded-2xl p-4">
          {n.trainerName && <div className="text-xs font-bold text-accent-strong mb-1">{n.trainerName}</div>}
          <p className="text-sm whitespace-pre-wrap">{n.body}</p>
          {n.suggestedTarget != null && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-semibold">Önerilen hedef: {n.suggestedTarget} kcal</span>
              {onApplyTarget && (
                <button
                  onClick={() => {
                    onApplyTarget(n.suggestedTarget!);
                    setApplied(n.suggestedTarget!);
                  }}
                  className="ml-auto text-xs font-bold px-3 py-1.5 rounded-xl bg-accent text-foreground active:scale-95 transition-transform"
                >
                  {applied === n.suggestedTarget ? "Uygulandı ✓" : "Uygula"}
                </button>
              )}
            </div>
          )}
          <div className="text-[10px] text-muted mt-2">{formatWhen(n.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}

// Toggle for daily reminder push notifications.
function PushToggle({ deviceId }: { deviceId: string }) {
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
      const res = await subscribeToPush(deviceId);
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
          <div className="text-xs text-muted mt-0.5">Her akşam öğün eklemeyi hatırlat</div>
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

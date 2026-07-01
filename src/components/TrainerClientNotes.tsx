"use client";

import { useState, useEffect, useCallback } from "react";

type NoteKind = "message" | "note";

interface Note {
  id: string;
  body: string;
  suggestedTarget: number | null;
  kind: NoteKind;
  createdAt: string;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Collapsible card: tap to open the composer + full history. The trainer can
// send a "Mesaj" (delivered + pushed to the client) or keep a private "Not".
export default function TrainerClientNotes({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [kind, setKind] = useState<NoteKind>("message");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/notes`);
      const data = await res.json();
      if (res.ok) setNotes(data.notes || []);
    } catch {
      /* ignore */
    }
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const messageCount = notes.filter((n) => n.kind === "message").length;
  const noteCount = notes.filter((n) => n.kind === "note").length;

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          kind,
          suggestedTarget: kind === "message" ? target || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gönderilemedi");
      setNotes((prev) => [data.note, ...prev]);
      setBody("");
      setTarget("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card-bg rounded-3xl border border-border shadow-sm overflow-hidden">
      {/* Collapsed header */}
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Notlar & Mesajlar</div>
          <div className="text-xs text-muted mt-0.5">
            {notes.length ? `${messageCount} mesaj · ${noteCount} not` : "Not veya mesaj ekle"}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-border pt-4 animate-fade-in-up">
          {/* Kind toggle */}
          <div className="flex gap-1 p-1 bg-surface rounded-2xl mb-3">
            {([
              { v: "message", l: "Mesaj", sub: "Danışana gider" },
              { v: "note", l: "Not", sub: "Özel" },
            ] as { v: NoteKind; l: string; sub: string }[]).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setKind(opt.v)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                  kind === opt.v ? "bg-card-bg shadow-sm" : "text-muted"
                }`}
              >
                {opt.l}
                <span className="block text-[10px] font-medium text-muted">{opt.sub}</span>
              </button>
            ))}
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === "message" ? "Danışanına bir mesaj yaz..." : "Kendine özel bir not al..."}
            rows={3}
            className="w-full bg-surface rounded-2xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
          />

          <div className="flex items-center gap-2 mt-2">
            {kind === "message" && (
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Hedef öner (ops.)"
                  className="w-full bg-surface rounded-2xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                {target && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">kcal</span>}
              </div>
            )}
            <button
              onClick={send}
              disabled={sending || !body.trim()}
              className={`px-5 py-2.5 rounded-2xl bg-accent text-foreground font-bold text-sm active:scale-95 transition-transform disabled:opacity-60 ${
                kind === "message" ? "" : "flex-1"
              }`}
            >
              {sending ? "..." : kind === "message" ? "Gönder" : "Kaydet"}
            </button>
          </div>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}

          {/* History */}
          {notes.length > 0 && (
            <div className="mt-4 space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="bg-surface/60 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                        n.kind === "message"
                          ? "bg-accent/30 text-accent-strong"
                          : "bg-border text-muted"
                      }`}
                    >
                      {n.kind === "message" ? "Mesaj" : "Not"}
                    </span>
                    <span className="text-[10px] text-muted ml-auto">{formatWhen(n.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                  {n.suggestedTarget != null && (
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-accent-strong bg-accent/30 rounded-full px-2 py-0.5">
                      Hedef: {n.suggestedTarget} kcal
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

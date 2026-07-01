"use client";

import { useState, useEffect, useCallback } from "react";

interface Note {
  id: string;
  body: string;
  suggestedTarget: number | null;
  createdAt: string;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Trainer's compose box + history of notes sent to one client.
export default function TrainerClientNotes({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
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

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), suggestedTarget: target || null }),
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
    <div className="bg-card-bg rounded-3xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.9}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.5A8 8 0 1121 12z" />
          </svg>
        </div>
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Notlar & Mesajlar</span>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Danışanına bir not veya öneri yaz..."
        rows={3}
        className="w-full bg-surface rounded-2xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <div className="flex items-center gap-2 mt-2">
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
        <button
          onClick={send}
          disabled={sending || !body.trim()}
          className="px-5 py-2.5 rounded-2xl bg-accent text-foreground font-bold text-sm active:scale-95 transition-transform disabled:opacity-60"
        >
          {sending ? "..." : "Gönder"}
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}

      {notes.length > 0 && (
        <div className="mt-4 space-y-2">
          {notes.map((n) => (
            <div key={n.id} className="bg-surface/60 rounded-2xl p-3">
              <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {n.suggestedTarget != null && (
                  <span className="text-[10px] font-bold text-accent-strong bg-accent/30 rounded-full px-2 py-0.5">
                    Hedef: {n.suggestedTarget} kcal
                  </span>
                )}
                <span className="text-[10px] text-muted ml-auto">{formatWhen(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

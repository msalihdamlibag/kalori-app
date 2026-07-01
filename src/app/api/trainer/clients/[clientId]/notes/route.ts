import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { createTrainerNote, isTrainerOfClient, listNotesByTrainerForClient } from "@/lib/queries";
import { sendPushToUser } from "@/lib/notify";

export const runtime = "nodejs";

async function requireLinkedTrainer(clientId: string) {
  if (!isDbConfigured()) {
    return { error: NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 }) };
  }
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  if (user.role !== "trainer") {
    return { error: NextResponse.json({ error: "Bu islem icin egitmen olmalisiniz" }, { status: 403 }) };
  }
  await ensureTables();
  if (!(await isTrainerOfClient(user.id, clientId))) {
    return { error: NextResponse.json({ error: "Bu danisana erisiminiz yok" }, { status: 403 }) };
  }
  return { user };
}

// Trainer posts a note/message (optionally with a suggested daily calorie target).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const guard = await requireLinkedTrainer(clientId);
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const text = String(body?.body || "").trim();
  if (!text) {
    return NextResponse.json({ error: "İçerik boş olamaz" }, { status: 400 });
  }
  const kind = body?.kind === "note" ? "note" : "message";
  let suggestedTarget: number | null = null;
  if (kind === "message" && body?.suggestedTarget != null && body.suggestedTarget !== "") {
    const n = Math.round(Number(body.suggestedTarget));
    if (Number.isFinite(n) && n >= 800 && n <= 6000) suggestedTarget = n;
  }

  const note = await createTrainerNote(guard.user.id, clientId, text.slice(0, 2000), suggestedTarget, kind);

  // Only messages reach the client (push + unread badge). Notes stay private.
  if (kind === "message") {
    try {
      const trainerName = guard.user.name || "Eğitmenin";
      await sendPushToUser(clientId, {
        title: `${trainerName} mesaj gönderdi`,
        body: note.body.length > 120 ? `${note.body.slice(0, 120)}…` : note.body,
        url: "/",
      });
    } catch (e) {
      console.warn("Not push hatasi:", e);
    }
  }

  return NextResponse.json({ ok: true, note });
}

// Trainer lists the notes they've written for this client.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const guard = await requireLinkedTrainer(clientId);
  if ("error" in guard) return guard.error;

  const notes = await listNotesByTrainerForClient(guard.user.id, clientId);
  return NextResponse.json({ notes });
}

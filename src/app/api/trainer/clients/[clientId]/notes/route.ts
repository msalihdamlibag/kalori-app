import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { createTrainerNote, isTrainerOfClient, listNotesByTrainerForClient } from "@/lib/queries";

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
    return NextResponse.json({ error: "Mesaj bos olamaz" }, { status: 400 });
  }
  let suggestedTarget: number | null = null;
  if (body?.suggestedTarget != null && body.suggestedTarget !== "") {
    const n = Math.round(Number(body.suggestedTarget));
    if (Number.isFinite(n) && n >= 800 && n <= 6000) suggestedTarget = n;
  }

  const note = await createTrainerNote(guard.user.id, clientId, text.slice(0, 2000), suggestedTarget);
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

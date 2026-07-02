import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { listClientTrainers, revokeTrainerClient } from "@/lib/queries";

export const runtime = "nodejs";

// The signed-in client's currently linked trainer(s).
export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ trainers: [] });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  await ensureTables();
  const trainers = await listClientTrainers(user.id);
  return NextResponse.json({ trainers });
}

// Client removes their link to a trainer.
export async function DELETE(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ ok: true });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const trainerId = String(body?.trainerId || "");
  if (!trainerId) return NextResponse.json({ error: "trainerId gerekli" }, { status: 400 });

  await ensureTables();
  const removed = await revokeTrainerClient(trainerId, user.id);
  return NextResponse.json({ ok: true, removed });
}

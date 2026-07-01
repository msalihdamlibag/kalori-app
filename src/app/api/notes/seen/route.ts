import { NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { markNotesSeen } from "@/lib/queries";

export const runtime = "nodejs";

// Mark the client's trainer messages as read (clears the unread badge).
export async function POST() {
  if (!isDbConfigured()) return NextResponse.json({ ok: true });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  await ensureTables();
  await markNotesSeen(user.id);
  return NextResponse.json({ ok: true });
}

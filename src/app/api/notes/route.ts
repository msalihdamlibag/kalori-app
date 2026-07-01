import { NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { listNotesForClient } from "@/lib/queries";

export const runtime = "nodejs";

// A signed-in client fetches notes/messages their trainer(s) sent them.
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ notes: [] });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }
  await ensureTables();
  const notes = await listNotesForClient(user.id);
  return NextResponse.json({ notes });
}

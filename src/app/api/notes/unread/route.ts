import { NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { countUnreadNotes } from "@/lib/queries";

export const runtime = "nodejs";

// Lightweight unread-message count for the badge on app load.
export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ count: 0 });
  const user = await getSessionUser();
  if (!user || user.role !== "client") return NextResponse.json({ count: 0 });
  await ensureTables();
  const count = await countUnreadNotes(user.id);
  return NextResponse.json({ count });
}

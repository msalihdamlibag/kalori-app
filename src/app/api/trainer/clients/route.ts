import { NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { listTrainerClients } from "@/lib/queries";

export const runtime = "nodejs";

// List the signed-in trainer's active clients with today's summary.
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }
  if (user.role !== "trainer") {
    return NextResponse.json({ error: "Bu islem icin egitmen olmalisiniz" }, { status: 403 });
  }

  await ensureTables();
  const clients = await listTrainerClients(user.id);
  return NextResponse.json({ clients });
}

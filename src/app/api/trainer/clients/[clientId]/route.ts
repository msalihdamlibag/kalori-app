import { NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { revokeTrainerClient } from "@/lib/queries";

export const runtime = "nodejs";

// Trainer removes a client (revokes the link). Authorized by session + role.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
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

  const { clientId } = await params;
  await ensureTables();
  const removed = await revokeTrainerClient(user.id, clientId);
  return NextResponse.json({ ok: true, removed });
}

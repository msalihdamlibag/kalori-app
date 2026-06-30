import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { fetchHistory, isTrainerOfClient } from "@/lib/queries";

export const runtime = "nodejs";

// A trainer reads a linked client's daily history (incl. photo URLs). Access is
// authorized by an active trainer_clients link — never by client id alone.
export async function GET(
  req: NextRequest,
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

  if (!(await isTrainerOfClient(user.id, clientId))) {
    return NextResponse.json({ error: "Bu danisana erisiminiz yok" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "30"), 1), 90);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

  const days = await fetchHistory({ userId: clientId, limit, offset });
  return NextResponse.json({ days });
}

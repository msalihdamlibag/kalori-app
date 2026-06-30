import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { acceptInvitation } from "@/lib/queries";

export const runtime = "nodejs";

// A client redeems a trainer's invitation code, forming the trainer<->client link.
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }
  if (user.role !== "client") {
    return NextResponse.json({ error: "Sadece danisanlar davet kabul edebilir" }, { status: 403 });
  }

  const body = await req.json();
  const code = String(body?.code || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Davet kodu gerekli" }, { status: 400 });
  }

  await ensureTables();
  const result = await acceptInvitation(code, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

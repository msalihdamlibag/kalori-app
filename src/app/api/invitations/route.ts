import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { createInvitation, listTrainerInvitations } from "@/lib/queries";

export const runtime = "nodejs";

async function requireTrainer() {
  if (!isDbConfigured()) {
    return { error: NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 }) };
  }
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Oturum gerekli" }, { status: 401 }) };
  }
  if (user.role !== "trainer") {
    return { error: NextResponse.json({ error: "Bu islem icin egitmen olmalisiniz" }, { status: 403 }) };
  }
  return { user };
}

async function withQr(code: string) {
  const qr = await QRCode.toDataURL(`kalori-invite:${code}`, { margin: 1, width: 240 });
  return qr;
}

// Trainer mints a new invitation (returns code + QR data URL).
export async function POST() {
  const guard = await requireTrainer();
  if ("error" in guard) return guard.error;

  await ensureTables();
  const invite = await createInvitation(guard.user.id);
  return NextResponse.json({ ...invite, qr: await withQr(invite.code) });
}

// Trainer lists their open invitations.
export async function GET() {
  const guard = await requireTrainer();
  if ("error" in guard) return guard.error;

  await ensureTables();
  const invites = await listTrainerInvitations(guard.user.id);
  const withQrCodes = await Promise.all(
    invites.map(async (inv) => ({ ...inv, qr: await withQr(inv.code) }))
  );
  return NextResponse.json({ invitations: withQrCodes });
}

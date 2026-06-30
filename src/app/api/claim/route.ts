import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { claimDeviceLogs } from "@/lib/queries";

export const runtime = "nodejs";

// Attach a device's anonymous daily logs to the signed-in user. Called once
// after login so existing on-device history follows the account.
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true, skipped: "db_not_configured" });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { deviceId } = await req.json();
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId gerekli" }, { status: 400 });
  }

  await ensureTables();
  const claimed = await claimDeviceLogs(user.id, deviceId);
  return NextResponse.json({ ok: true, claimed });
}

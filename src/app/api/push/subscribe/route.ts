import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { upsertPushSubscription, deletePushSubscription } from "@/lib/queries";

export const runtime = "nodejs";

// Save (or refresh) a browser's push subscription, linked to the user if signed in.
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const endpoint = body?.endpoint as string | undefined;
  const p256dh = body?.keys?.p256dh as string | undefined;
  const auth = body?.keys?.auth as string | undefined;
  const deviceId = (body?.deviceId as string | undefined) ?? null;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Gecersiz abonelik" }, { status: 400 });
  }

  await ensureTables();
  const user = await getSessionUser();
  await upsertPushSubscription({
    userId: user?.id ?? null,
    deviceId,
    endpoint,
    p256dh,
    auth,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: true });
  }
  const body = await req.json().catch(() => ({}));
  const endpoint = body?.endpoint as string | undefined;
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint gerekli" }, { status: 400 });
  }
  await ensureTables();
  await deletePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}

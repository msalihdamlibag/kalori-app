import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { listPushSubscriptions } from "@/lib/queries";
import { sendPushToSubscriptions } from "@/lib/notify";

export const runtime = "nodejs";

// Daily reminder push. Triggered by the Vercel cron (see vercel.json). Sends a
// "log your meals" nudge to every stored subscription and prunes dead ones.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ ok: false, skipped: "vapid_not_configured" });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, skipped: "db_not_configured" });
  }

  await ensureTables();
  const subs = await listPushSubscriptions();
  const result = await sendPushToSubscriptions(subs, {
    title: "KaloriTakip",
    body: "Bugünkü öğünlerini eklemeyi unutma! 🍽️",
    url: "/",
  });

  return NextResponse.json({ ok: true, total: subs.length, ...result });
}

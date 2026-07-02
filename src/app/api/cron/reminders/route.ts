import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { listPushSubscriptions } from "@/lib/queries";
import { sendPushToSubscriptions } from "@/lib/notify";

export const runtime = "nodejs";

// Daily reminder push. Triggered by the Vercel cron (see vercel.json). Sends a
// role-appropriate nudge to every stored subscription and prunes dead ones:
// trainers get a "check your clients' data" reminder, everyone else the
// "log your meals" one.
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
  const trainerSubs = subs.filter((s) => s.role === "trainer");
  const clientSubs = subs.filter((s) => s.role !== "trainer");

  const [trainerResult, clientResult] = await Promise.all([
    sendPushToSubscriptions(trainerSubs, {
      title: "KaloriTakip",
      body: "Danışanlarının bugünkü verilerini kontrol etmeyi unutma! 📊",
      url: "/",
    }),
    sendPushToSubscriptions(clientSubs, {
      title: "KaloriTakip",
      body: "Bugünkü öğünlerini eklemeyi unutma! 🍽️",
      url: "/",
    }),
  ]);

  return NextResponse.json({
    ok: true,
    total: subs.length,
    sent: trainerResult.sent + clientResult.sent,
    removed: trainerResult.removed + clientResult.removed,
  });
}

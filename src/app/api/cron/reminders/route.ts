import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { listPushSubscriptions, deletePushSubscription } from "@/lib/queries";

export const runtime = "nodejs";

// Daily reminder push. Triggered by the Vercel cron (see vercel.json). Sends a
// "log your meals" nudge to every stored subscription and prunes dead ones.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json({ ok: false, skipped: "vapid_not_configured" });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, skipped: "db_not_configured" });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@example.com",
    publicKey,
    privateKey
  );

  await ensureTables();
  const subs = await listPushSubscriptions();
  const payload = JSON.stringify({
    title: "KaloriTakip",
    body: "Bugünkü öğünlerini eklemeyi unutma! 🍽️",
    url: "/",
  });

  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      if (status === 404 || status === 410) {
        await deletePushSubscription(s.endpoint);
        removed++;
      }
    }
  }

  return NextResponse.json({ ok: true, total: subs.length, sent, removed });
}

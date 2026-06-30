import { sql } from "@vercel/postgres";
import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";

// Photos are retained for this many days; older ones are removed from both the
// Blob store and the database (nutritional history itself is kept).
const RETENTION_DAYS = 7;

// Remove hosted photos for logs on/older than the retention cutoff. When
// deviceId is omitted, every device is cleaned (used by the cron job).
async function cleanupOldPhotos(deviceId?: string) {
  await ensureTables();

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000)
    .toISOString()
    .split("T")[0];

  const rows = deviceId
    ? (
        await sql`
          SELECT fi.id, fi.image_url
          FROM food_items fi
          JOIN daily_logs dl ON fi.daily_log_id = dl.id
          WHERE dl.device_id = ${deviceId}
            AND dl.date <= ${cutoff}
            AND fi.image_url IS NOT NULL
        `
      ).rows
    : (
        await sql`
          SELECT fi.id, fi.image_url
          FROM food_items fi
          JOIN daily_logs dl ON fi.daily_log_id = dl.id
          WHERE dl.date <= ${cutoff}
            AND fi.image_url IS NOT NULL
        `
      ).rows;

  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  let deleted = 0;

  for (const row of rows) {
    const url = row.image_url as string;
    // Remove the hosted file when it lives in our Blob store.
    if (hasBlob && url.includes("blob.vercel-storage.com")) {
      try {
        await del(url);
      } catch (e) {
        console.warn("Blob silme hatasi:", e);
      }
    }
    await sql`UPDATE food_items SET image_url = NULL WHERE id = ${row.id}`;
    deleted++;
  }

  return { deleted, cutoff };
}

// Per-device cleanup triggered by the client (once per day on load).
export async function POST(req: NextRequest) {
  try {
    if (!isDbConfigured()) {
      // Nothing hosted to clean up — device-side pruning handles the rest.
      return NextResponse.json({ ok: true, skipped: "db_not_configured" });
    }

    const { deviceId } = await req.json();
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId gerekli" }, { status: 400 });
    }

    const result = await cleanupOldPhotos(deviceId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Cleanup hatasi:", message);
    return NextResponse.json({ error: "Temizlik basarisiz", detail: message }, { status: 500 });
  }
}

// Global cleanup triggered by the Vercel cron job (see vercel.json). Vercel
// sends an Authorization: Bearer <CRON_SECRET> header when CRON_SECRET is set.
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    if (!isDbConfigured()) {
      return NextResponse.json({ ok: true, skipped: "db_not_configured" });
    }

    const result = await cleanupOldPhotos();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Cleanup (cron) hatasi:", message);
    return NextResponse.json({ error: "Temizlik basarisiz", detail: message }, { status: 500 });
  }
}

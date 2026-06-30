import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: "Veritabani yapilandirilmamis", detail: "POSTGRES_URL ortam degiskeni bulunamadi" },
        { status: 503 }
      );
    }

    await ensureTables();

    const { deviceId, date, target, foods } = await req.json();

    if (!deviceId || !date) {
      return NextResponse.json({ error: "deviceId ve date gerekli" }, { status: 400 });
    }

    // When signed in, the log is owned by the user (so it follows the account
    // and becomes visible to a linked trainer). Anonymous logs stay device-only.
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id ?? null;

    const totalCalories = (foods || []).reduce((s: number, f: { calories: number }) => s + f.calories, 0);
    const totalProtein = (foods || []).reduce((s: number, f: { protein: number }) => s + f.protein, 0);
    const totalCarbs = (foods || []).reduce((s: number, f: { carbs: number }) => s + f.carbs, 0);
    const totalFat = (foods || []).reduce((s: number, f: { fat: number }) => s + f.fat, 0);

    // For a signed-in user we keep a single row per (user_id, date) regardless
    // of which device synced it — otherwise each device_id would create its own
    // row for the same day and history (queried by user_id) would show
    // duplicates. We also collapse any pre-existing duplicate rows for that day
    // into the one we update, so the client's current data is the single source
    // of truth (and a linked trainer sees exactly that). Anonymous logs stay
    // keyed on (device_id, date).
    let logId: number;
    const existing = userId
      ? await sql`SELECT id FROM daily_logs WHERE user_id = ${userId} AND date = ${date} ORDER BY id ASC`
      : null;

    if (existing && existing.rows.length > 0) {
      logId = existing.rows[0].id;
      // Remove any extra duplicate rows for this user/date (CASCADE drops their
      // food_items) so only the row we're about to refresh remains.
      if (existing.rows.length > 1) {
        await sql`DELETE FROM daily_logs WHERE user_id = ${userId} AND date = ${date} AND id <> ${logId}`;
      }
      await sql`
        UPDATE daily_logs SET
          target = ${target || 2000},
          total_calories = ${totalCalories},
          total_protein = ${totalProtein},
          total_carbs = ${totalCarbs},
          total_fat = ${totalFat},
          device_id = ${deviceId}
        WHERE id = ${logId}
      `;
    } else {
      const logResult = await sql`
        INSERT INTO daily_logs (device_id, date, target, total_calories, total_protein, total_carbs, total_fat, user_id)
        VALUES (${deviceId}, ${date}, ${target || 2000}, ${totalCalories}, ${totalProtein}, ${totalCarbs}, ${totalFat}, ${userId})
        ON CONFLICT (device_id, date)
        DO UPDATE SET
          target = EXCLUDED.target,
          total_calories = EXCLUDED.total_calories,
          total_protein = EXCLUDED.total_protein,
          total_carbs = EXCLUDED.total_carbs,
          total_fat = EXCLUDED.total_fat,
          user_id = COALESCE(daily_logs.user_id, EXCLUDED.user_id)
        RETURNING id
      `;
      logId = logResult.rows[0].id;
    }

    await sql`DELETE FROM food_items WHERE daily_log_id = ${logId}`;

    for (const food of (foods || [])) {
      await sql`
        INSERT INTO food_items (daily_log_id, food_id, name, portion, calories, protein, carbs, fat, time, image_url)
        VALUES (${logId}, ${food.id}, ${food.name}, ${food.portion || ''}, ${food.calories}, ${food.protein}, ${food.carbs}, ${food.fat}, ${food.time || ''}, ${food.imageUrl || null})
      `;
    }

    return NextResponse.json({ ok: true, logId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("Sync hatasi:", message);
    return NextResponse.json(
      { error: "Senkronizasyon basarisiz", detail: message },
      { status: 500 }
    );
  }
}

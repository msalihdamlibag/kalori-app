import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";

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

    const totalCalories = (foods || []).reduce((s: number, f: { calories: number }) => s + f.calories, 0);
    const totalProtein = (foods || []).reduce((s: number, f: { protein: number }) => s + f.protein, 0);
    const totalCarbs = (foods || []).reduce((s: number, f: { carbs: number }) => s + f.carbs, 0);
    const totalFat = (foods || []).reduce((s: number, f: { fat: number }) => s + f.fat, 0);

    const logResult = await sql`
      INSERT INTO daily_logs (device_id, date, target, total_calories, total_protein, total_carbs, total_fat)
      VALUES (${deviceId}, ${date}, ${target || 2000}, ${totalCalories}, ${totalProtein}, ${totalCarbs}, ${totalFat})
      ON CONFLICT (device_id, date)
      DO UPDATE SET
        target = EXCLUDED.target,
        total_calories = EXCLUDED.total_calories,
        total_protein = EXCLUDED.total_protein,
        total_carbs = EXCLUDED.total_carbs,
        total_fat = EXCLUDED.total_fat
      RETURNING id
    `;

    const logId = logResult.rows[0].id;

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

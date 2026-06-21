import { sql } from "@vercel/postgres";
import { NextRequest, NextResponse } from "next/server";
import { ensureTables } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 });
    }

    await ensureTables();

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 90);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId gerekli" }, { status: 400 });
    }

    const logs = await sql`
      SELECT id, date, target, total_calories, total_protein, total_carbs, total_fat
      FROM daily_logs
      WHERE device_id = ${deviceId}
      ORDER BY date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const days = [];

    for (const log of logs.rows) {
      const items = await sql`
        SELECT food_id, name, portion, calories, protein, carbs, fat, time, image_url
        FROM food_items
        WHERE daily_log_id = ${log.id}
        ORDER BY created_at ASC
      `;

      days.push({
        date: log.date,
        target: log.target,
        totalCalories: log.total_calories,
        totalProtein: log.total_protein,
        totalCarbs: log.total_carbs,
        totalFat: log.total_fat,
        foods: items.rows.map((item) => ({
          id: item.food_id,
          name: item.name,
          portion: item.portion,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          time: item.time,
          imageUrl: item.image_url,
        })),
      });
    }

    return NextResponse.json({ days });
  } catch (error) {
    console.error("History hatasi:", error);
    return NextResponse.json({ error: "Gecmis yuklenemedi" }, { status: 500 });
  }
}

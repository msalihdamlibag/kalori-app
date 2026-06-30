import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { fetchHistory } from "@/lib/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { error: "Veritabani yapilandirilmamis", detail: "POSTGRES_URL ortam degiskeni bulunamadi" },
        { status: 503 }
      );
    }

    await ensureTables();

    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get("deviceId");
    const limitParam = parseInt(searchParams.get("limit") || "30");
    const offsetParam = parseInt(searchParams.get("offset") || "0");
    const safeLimit = Math.min(Math.max(limitParam, 1), 90);
    const safeOffset = Math.max(offsetParam, 0);

    // Signed-in users see their own (account-owned) history regardless of
    // device; anonymous callers fall back to device-scoped, unclaimed logs.
    const sessionUser = await getSessionUser();
    if (!sessionUser && !deviceId) {
      return NextResponse.json({ error: "deviceId gerekli" }, { status: 400 });
    }

    const days = await fetchHistory({
      userId: sessionUser?.id ?? null,
      deviceId: sessionUser ? null : deviceId,
      limit: safeLimit,
      offset: safeOffset,
    });

    return NextResponse.json({ days });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("History hatasi:", message);
    return NextResponse.json(
      { error: "Gecmis yuklenemedi", detail: message },
      { status: 500 }
    );
  }
}

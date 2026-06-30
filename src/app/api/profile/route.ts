import { NextRequest, NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { updateUserProfile } from "@/lib/queries";

export const runtime = "nodejs";

// Return the signed-in user's editable profile fields.
export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }
  return NextResponse.json({
    age: user.age ?? null,
    weight: user.weight ?? null,
    height: user.height ?? null,
    gender: user.gender ?? null,
  });
}

// Coerce a numeric field within sane bounds, or null when empty/invalid.
function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, min), max);
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const gender =
    body.gender === "male" || body.gender === "female" || body.gender === "other"
      ? body.gender
      : null;

  await ensureTables();
  const updated = await updateUserProfile(user.id, {
    age: body.age === null || body.age === "" ? null : num(body.age, 1, 120),
    weight: body.weight === null || body.weight === "" ? null : num(body.weight, 1, 500),
    height: body.height === null || body.height === "" ? null : num(body.height, 30, 260),
    gender,
  });

  return NextResponse.json({
    ok: true,
    age: updated?.age ?? null,
    weight: updated?.weight ?? null,
    height: updated?.height ?? null,
    gender: updated?.gender ?? null,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";
import { setUserRole } from "@/lib/queries";

export const runtime = "nodejs";

// Set the signed-in user's role exactly once (client | trainer).
export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Veritabani yapilandirilmamis" }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { role } = await req.json();
  if (role !== "client" && role !== "trainer") {
    return NextResponse.json({ error: "Gecersiz rol" }, { status: 400 });
  }

  if (user.role) {
    // Role already chosen — return it unchanged (roles are not switchable here).
    return NextResponse.json({ ok: true, role: user.role });
  }

  const updated = await setUserRole(user.id, role);
  return NextResponse.json({ ok: true, role: updated?.role ?? user.role });
}

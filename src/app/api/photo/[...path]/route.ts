import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getBlobToken } from "@/lib/blob";
import { getSessionUser } from "@/lib/auth-helpers";
import { isTrainerOfClient } from "@/lib/queries";

export const runtime = "nodejs";

// Serves a private meal photo. Pathnames are `p/<ownerUserId>/<file>`; access is
// granted only to the owner or a trainer with an active link to that owner.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!isDbConfigured()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const token = getBlobToken();
  if (!token) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { path } = await params;
  const pathname = path.join("/");
  const ownerId = path[1]; // p/<ownerId>/<file>
  if (path[0] !== "p" || !ownerId) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await ensureTables();
  const allowed = user.id === ownerId || (await isTrainerOfClient(user.id, ownerId));
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const res = await get(pathname, { access: "private", token });
    if (!res || res.statusCode !== 200) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(res.stream, {
      headers: {
        "Content-Type": res.blob.contentType || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    console.error("Foto proxy hatasi:", e);
    return new NextResponse("Not found", { status: 404 });
  }
}

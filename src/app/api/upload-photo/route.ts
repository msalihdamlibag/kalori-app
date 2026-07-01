import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getBlobToken } from "@/lib/blob";
import { isDbConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-helpers";

export const runtime = "nodejs";

// Photos are stored in a PRIVATE Blob store, namespaced by owner user id, and
// served back only through the authorized /api/photo proxy. Anonymous users
// get a 401 here and keep their on-device (IndexedDB) copy instead — hosting is
// only needed so a linked trainer can see a signed-in client's photos.
export async function POST(req: NextRequest) {
  try {
    const blobToken = getBlobToken();
    if (!blobToken) {
      return NextResponse.json({ error: "Blob yapilandirilmamis" }, { status: 503 });
    }

    const user = isDbConfigured() ? await getSessionUser() : null;
    if (!user) {
      // Not signed in → don't host; client falls back to its local copy.
      return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
    }

    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "Gorsel gerekli" }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const mediaType = image.match(/^data:(image\/\w+);/)?.[1] || "image/jpeg";
    const ext = mediaType.split("/")[1] || "jpg";

    const blob = await put(`p/${user.id}/photo.${ext}`, buffer, {
      access: "private",
      contentType: mediaType,
      token: blobToken,
      addRandomSuffix: true,
    });

    // Return our proxy path (not the raw private URL); it embeds the pathname so
    // the proxy can fetch and authorize it.
    return NextResponse.json({ url: `/api/photo/${blob.pathname}` });
  } catch (error) {
    console.error("Upload hatasi:", error);
    return NextResponse.json({ error: "Yukleme basarisiz" }, { status: 500 });
  }
}

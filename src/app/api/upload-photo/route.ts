import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Blob yapilandirilmamis" }, { status: 503 });
    }

    const { image, filename } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Gorsel gerekli" }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const mediaType = image.match(/^data:(image\/\w+);/)?.[1] || "image/jpeg";
    const ext = mediaType.split("/")[1] || "jpg";
    const name = filename || `food-${Date.now()}.${ext}`;

    const blob = await put(name, buffer, {
      access: "public",
      contentType: mediaType,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload hatasi:", error);
    return NextResponse.json({ error: "Yukleme basarisiz" }, { status: 500 });
  }
}

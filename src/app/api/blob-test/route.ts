import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getBlobToken } from "@/lib/blob";

export const runtime = "nodejs";

// Diagnostic: proves whether the server can actually write to Blob with the
// current token, isolating photo-hosting problems from the client flow. Writes
// a tiny throwaway file and deletes it. Returns only booleans / the host / an
// error message — never the token.
export async function GET() {
  const token = getBlobToken();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "no_token" });
  }
  try {
    const blob = await put(`diag/test-${Date.now()}.txt`, "ok", {
      access: "public",
      contentType: "text/plain",
      token,
      addRandomSuffix: true,
    });
    let deleted = false;
    try {
      await del(blob.url, { token });
      deleted = true;
    } catch {
      /* leaving the tiny test file is harmless */
    }
    return NextResponse.json({
      ok: true,
      host: new URL(blob.url).host,
      cleanedUp: deleted,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "unknown",
    });
  }
}

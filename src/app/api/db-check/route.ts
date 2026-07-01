import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { put, del } from "@vercel/blob";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getBlobToken } from "@/lib/blob";
import { auth } from "@/auth";

export const runtime = "nodejs";

// Lightweight diagnostics for deployment troubleshooting. Returns only booleans
// and which env var names are present — never the connection string or any
// secret value.
export async function GET() {
  const envPresent = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    DATABASE_URL_UNPOOLED: !!process.env.DATABASE_URL_UNPOOLED,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
    // Photos are only visible to a trainer when hosted in Blob (image_url).
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
  };

  // The Blob token can be injected under a store-prefixed name; show which env
  // keys look like a blob token (names only, never values) and whether we
  // resolved one.
  const blobEnvKeys = Object.keys(process.env).filter((k) => /BLOB/i.test(k));
  const blobResolved = !!getBlobToken();

  const result: Record<string, unknown> = {
    dbConfigured: isDbConfigured(),
    envPresent,
    blobEnvKeys,
    blobResolved,
  };

  // Can we actually run a query and see our tables?
  if (isDbConfigured()) {
    try {
      await ensureTables();
      const users = await sql`SELECT COUNT(*)::int AS n FROM users`;
      result.canConnect = true;
      result.userCount = users.rows[0]?.n ?? 0;

      // How many food items actually have a hosted photo URL? If this is 0, no
      // photo ever reached Blob (so a trainer can't see any). If > 0 but a
      // trainer sees none, the photos predate the linking or are on other days.
      const photos = await sql`SELECT COUNT(*)::int AS n FROM food_items WHERE image_url IS NOT NULL`;
      result.hostedPhotoCount = photos.rows[0]?.n ?? 0;
      const sample = await sql`SELECT image_url FROM food_items WHERE image_url IS NOT NULL ORDER BY id DESC LIMIT 1`;
      const lastUrl: string | undefined = sample.rows[0]?.image_url;
      result.lastPhotoIsBlob = lastUrl ? lastUrl.includes("blob.vercel-storage.com") : null;
    } catch (e) {
      result.canConnect = false;
      result.dbError = e instanceof Error ? e.message : "unknown";
    }
  }

  // Prove whether the server can actually WRITE to Blob with the current token
  // (a valid token for the wrong store still fails here). Writes and deletes a
  // tiny throwaway file.
  const blobToken = getBlobToken();
  if (blobToken) {
    try {
      const b = await put(`diag/dbcheck-${Date.now()}.txt`, "ok", {
        access: "public",
        contentType: "text/plain",
        token: blobToken,
        addRandomSuffix: true,
      });
      result.blobWrite = { ok: true, host: new URL(b.url).host };
      try {
        await del(b.url, { token: blobToken });
      } catch {
        /* harmless if the tiny file lingers */
      }
    } catch (e) {
      result.blobWrite = { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
  } else {
    result.blobWrite = { ok: false, reason: "no_token" };
  }

  // Is the caller signed in, and does the session carry a role yet?
  try {
    const session = await auth();
    result.session = session?.user
      ? { signedIn: true, hasId: !!session.user.id, role: session.user.role ?? null }
      : { signedIn: false };
  } catch (e) {
    result.sessionError = e instanceof Error ? e.message : "unknown";
  }

  return NextResponse.json(result);
}

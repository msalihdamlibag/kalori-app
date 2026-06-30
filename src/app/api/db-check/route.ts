import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { ensureTables, isDbConfigured } from "@/lib/db";
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
  };

  const result: Record<string, unknown> = {
    dbConfigured: isDbConfigured(),
    envPresent,
  };

  // Can we actually run a query and see our tables?
  if (isDbConfigured()) {
    try {
      await ensureTables();
      const users = await sql`SELECT COUNT(*)::int AS n FROM users`;
      result.canConnect = true;
      result.userCount = users.rows[0]?.n ?? 0;
    } catch (e) {
      result.canConnect = false;
      result.dbError = e instanceof Error ? e.message : "unknown";
    }
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

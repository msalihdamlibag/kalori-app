import { auth } from "@/auth";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { getUserById, type DbUser } from "@/lib/queries";

// Resolve the current session into a fresh users row (role read from DB, not
// the token). Returns null when there is no session or DB is unconfigured.
// Used by API routes to authorize access to user/client data.
export async function getSessionUser(): Promise<DbUser | null> {
  if (!isDbConfigured()) return null;
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  await ensureTables();
  return getUserById(id);
}

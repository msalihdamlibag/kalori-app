import { sql } from "@vercel/postgres";

let tablesCreated = false;

export async function ensureTables() {
  if (tablesCreated) return;

  try {
    // --- User accounts (Auth.js / OAuth) ---------------------------------
    // A user is identified by the provider ("google" | "apple") and the stable
    // provider account id (the OAuth "sub"). `role` is NULL until the user
    // picks one ("client" | "trainer") right after first sign-in.
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(32) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        image TEXT,
        role VARCHAR(16),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_account_id)
      )
    `;

    // --- Trainer <-> client links ---------------------------------------
    // Created when a client accepts a trainer's invitation. `status` is
    // "active" while the link is live, "revoked" once either side ends it.
    await sql`
      CREATE TABLE IF NOT EXISTS trainer_clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(trainer_id, client_id)
      )
    `;

    // --- Invitations -----------------------------------------------------
    // A trainer mints an invitation carrying a short `code` (embedded in a QR
    // and typeable by hand). A client redeems it to form a trainer_clients link.
    await sql`
      CREATE TABLE IF NOT EXISTS invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(16) NOT NULL UNIQUE,
        trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(16) NOT NULL DEFAULT 'open',
        accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id SERIAL PRIMARY KEY,
        device_id VARCHAR(36) NOT NULL,
        date DATE NOT NULL,
        target INTEGER NOT NULL DEFAULT 2000,
        total_calories INTEGER DEFAULT 0,
        total_protein REAL DEFAULT 0,
        total_carbs REAL DEFAULT 0,
        total_fat REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(device_id, date)
      )
    `;

    // Daily logs were originally keyed only by device_id (anonymous). Logged-in
    // users own their logs through user_id; anonymous logs keep it NULL.
    await sql`ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS user_id UUID`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON daily_logs(user_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS food_items (
        id SERIAL PRIMARY KEY,
        daily_log_id INTEGER REFERENCES daily_logs(id) ON DELETE CASCADE,
        food_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        portion VARCHAR(255),
        calories INTEGER NOT NULL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        time VARCHAR(10),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    tablesCreated = true;
  } catch (error) {
    console.error("Tablo olusturma hatasi:", error);
    throw error;
  }
}

export function isDbConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING);
}

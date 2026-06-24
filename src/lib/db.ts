import { sql } from "@vercel/postgres";

let tablesCreated = false;

export async function ensureTables() {
  if (tablesCreated) return;

  try {
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

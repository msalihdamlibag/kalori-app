import { sql } from "@vercel/postgres";
import { localDateStr } from "@/lib/date";

// Shared data-access helpers used by the API routes. All callers must have
// already verified isDbConfigured() and awaited ensureTables().

export interface DbUser {
  id: string;
  provider: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: "client" | "trainer" | null;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  gender?: string | null;
}

// Insert or update a user by (provider, provider_account_id). Returns the row.
// Profile fields are refreshed on every sign-in; `role` is preserved once set.
export async function upsertUser(params: {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<DbUser> {
  const { provider, providerAccountId, email, name, image } = params;
  const res = await sql`
    INSERT INTO users (provider, provider_account_id, email, name, image)
    VALUES (${provider}, ${providerAccountId}, ${email ?? null}, ${name ?? null}, ${image ?? null})
    ON CONFLICT (provider, provider_account_id)
    DO UPDATE SET
      email = COALESCE(EXCLUDED.email, users.email),
      name = COALESCE(EXCLUDED.name, users.name),
      image = COALESCE(EXCLUDED.image, users.image)
    RETURNING id, provider, email, name, image, role
  `;
  return res.rows[0] as DbUser;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const res = await sql`
    SELECT id, provider, email, name, image, role, age, weight, height, gender
    FROM users WHERE id = ${id}
  `;
  return (res.rows[0] as DbUser) ?? null;
}

// Fallback lookup used to heal sessions whose token lost the DB id (e.g. cookies
// minted before the DB was reachable). Picks the oldest row for the email.
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const res = await sql`
    SELECT id, provider, email, name, image, role, age, weight, height, gender
    FROM users
    WHERE email = ${email}
    ORDER BY created_at ASC
    LIMIT 1
  `;
  return (res.rows[0] as DbUser) ?? null;
}

export interface ProfileFields {
  age: number | null;
  weight: number | null;
  height: number | null;
  gender: string | null;
}

// Update a user's optional profile fields (age/weight/height/gender).
export async function updateUserProfile(id: string, p: ProfileFields): Promise<DbUser | null> {
  const res = await sql`
    UPDATE users SET
      age = ${p.age},
      weight = ${p.weight},
      height = ${p.height},
      gender = ${p.gender}
    WHERE id = ${id}
    RETURNING id, provider, email, name, image, role, age, weight, height, gender
  `;
  return (res.rows[0] as DbUser) ?? null;
}

// Set a user's role exactly once. Returns the updated row, or null if the user
// already has a role (in which case the existing role is left untouched).
export async function setUserRole(
  id: string,
  role: "client" | "trainer"
): Promise<DbUser | null> {
  const res = await sql`
    UPDATE users SET role = ${role}
    WHERE id = ${id} AND role IS NULL
    RETURNING id, provider, email, name, image, role
  `;
  return (res.rows[0] as DbUser) ?? null;
}

// Attach a device's anonymous daily logs to a user on first login. Only logs
// that aren't already owned by someone are claimed.
export async function claimDeviceLogs(
  userId: string,
  deviceId: string
): Promise<number> {
  const res = await sql`
    UPDATE daily_logs SET user_id = ${userId}
    WHERE device_id = ${deviceId} AND user_id IS NULL
  `;
  return res.rowCount ?? 0;
}

export interface HistoryDay {
  date: string;
  target: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  macroTargets: { protein: number; carbs: number; fat: number } | null;
  foods: {
    id: string;
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    time: string;
    imageUrl: string | null;
  }[];
}

// Fetch daily logs (with food items) for either a user or an anonymous device.
// Optional `from`/`to` (YYYY-MM-DD, inclusive) restrict the date range.
export async function fetchHistory(params: {
  userId?: string | null;
  deviceId?: string | null;
  limit: number;
  offset: number;
  from?: string | null;
  to?: string | null;
}): Promise<HistoryDay[]> {
  const { userId, deviceId, limit, offset, from, to } = params;
  const fromV = from ?? "0001-01-01";
  const toV = to ?? "9999-12-31";

  // A user may have more than one daily_logs row for the same date (e.g. logs
  // synced from different devices and later claimed to the same account, or
  // legacy duplicates). DISTINCT ON keeps exactly one row per date — the
  // "richest" one (highest total_calories) — so history shows a single,
  // non-inflated entry per date and empty duplicates are ignored.
  const logs = userId
    ? await sql`
        SELECT DISTINCT ON (date) id, date, target, total_calories, total_protein, total_carbs, total_fat,
               target_protein, target_carbs, target_fat
        FROM daily_logs
        WHERE user_id = ${userId} AND date >= ${fromV} AND date <= ${toV}
        ORDER BY date DESC, total_calories DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT DISTINCT ON (date) id, date, target, total_calories, total_protein, total_carbs, total_fat,
               target_protein, target_carbs, target_fat
        FROM daily_logs
        WHERE device_id = ${deviceId} AND user_id IS NULL AND date >= ${fromV} AND date <= ${toV}
        ORDER BY date DESC, total_calories DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

  const days: HistoryDay[] = [];
  for (const log of logs.rows) {
    const items = await sql`
      SELECT food_id, name, portion, calories, protein, carbs, fat, time, image_url
      FROM food_items
      WHERE daily_log_id = ${log.id}
      ORDER BY created_at ASC
    `;
    days.push({
      date: log.date,
      target: log.target,
      totalCalories: log.total_calories,
      totalProtein: log.total_protein,
      totalCarbs: log.total_carbs,
      totalFat: log.total_fat,
      macroTargets:
        log.target_protein != null || log.target_carbs != null || log.target_fat != null
          ? {
              protein: log.target_protein ?? 0,
              carbs: log.target_carbs ?? 0,
              fat: log.target_fat ?? 0,
            }
          : null,
      foods: items.rows.map((item) => ({
        id: item.food_id,
        name: item.name,
        portion: item.portion,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        time: item.time,
        imageUrl: item.image_url,
      })),
    });
  }
  return days;
}

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function upsertPushSubscription(params: {
  userId: string | null;
  deviceId: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const { userId, deviceId, endpoint, p256dh, auth } = params;
  await sql`
    INSERT INTO push_subscriptions (user_id, device_id, endpoint, p256dh, auth)
    VALUES (${userId}, ${deviceId}, ${endpoint}, ${p256dh}, ${auth})
    ON CONFLICT (endpoint) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      device_id = EXCLUDED.device_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth
  `;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

export async function listPushSubscriptions(): Promise<PushSub[]> {
  const res = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`;
  return res.rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

export async function listPushSubscriptionsForUser(userId: string): Promise<PushSub[]> {
  const res = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}`;
  return res.rows.map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

// Count trainer notes newer than the client's last "seen" timestamp.
export async function countUnreadNotes(clientId: string): Promise<number> {
  const res = await sql`
    SELECT COUNT(*)::int AS n
    FROM trainer_notes tn
    JOIN users u ON u.id = ${clientId}
    WHERE tn.client_id = ${clientId}
      AND tn.kind = 'message'
      AND (u.notes_seen_at IS NULL OR tn.created_at > u.notes_seen_at)
  `;
  return res.rows[0]?.n ?? 0;
}

export async function markNotesSeen(clientId: string): Promise<void> {
  await sql`UPDATE users SET notes_seen_at = NOW() WHERE id = ${clientId}`;
}

export type NoteKind = "message" | "note";

export interface TrainerNote {
  id: string;
  body: string;
  suggestedTarget: number | null;
  kind: NoteKind;
  createdAt: string;
  trainerName?: string | null;
}

export async function createTrainerNote(
  trainerId: string,
  clientId: string,
  body: string,
  suggestedTarget: number | null,
  kind: NoteKind
): Promise<TrainerNote> {
  const res = await sql`
    INSERT INTO trainer_notes (trainer_id, client_id, body, suggested_target, kind)
    VALUES (${trainerId}, ${clientId}, ${body}, ${suggestedTarget}, ${kind})
    RETURNING id, body, suggested_target, kind, created_at
  `;
  const r = res.rows[0];
  return { id: r.id, body: r.body, suggestedTarget: r.suggested_target, kind: r.kind, createdAt: r.created_at };
}

// Messages delivered to a client (private trainer notes are excluded).
export async function listNotesForClient(clientId: string): Promise<TrainerNote[]> {
  const res = await sql`
    SELECT n.id, n.body, n.suggested_target, n.kind, n.created_at, u.name AS trainer_name
    FROM trainer_notes n
    JOIN users u ON u.id = n.trainer_id
    WHERE n.client_id = ${clientId} AND n.kind = 'message'
    ORDER BY n.created_at DESC
    LIMIT 100
  `;
  return res.rows.map((r) => ({
    id: r.id,
    body: r.body,
    suggestedTarget: r.suggested_target,
    kind: r.kind,
    createdAt: r.created_at,
    trainerName: r.trainer_name,
  }));
}

// Everything (notes + messages) a trainer recorded for a client.
export async function listNotesByTrainerForClient(
  trainerId: string,
  clientId: string
): Promise<TrainerNote[]> {
  const res = await sql`
    SELECT id, body, suggested_target, kind, created_at
    FROM trainer_notes
    WHERE trainer_id = ${trainerId} AND client_id = ${clientId}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  return res.rows.map((r) => ({
    id: r.id,
    body: r.body,
    suggestedTarget: r.suggested_target,
    kind: r.kind,
    createdAt: r.created_at,
  }));
}

// Revoke a trainer<->client link (the client disappears from the trainer's
// list and the trainer loses access to their data).
export async function revokeTrainerClient(
  trainerId: string,
  clientId: string
): Promise<boolean> {
  const res = await sql`
    UPDATE trainer_clients SET status = 'revoked'
    WHERE trainer_id = ${trainerId} AND client_id = ${clientId} AND status = 'active'
  `;
  return (res.rowCount ?? 0) > 0;
}

// Does an active trainer<->client link exist between these two users?
export async function isTrainerOfClient(
  trainerId: string,
  clientId: string
): Promise<boolean> {
  const res = await sql`
    SELECT 1 FROM trainer_clients
    WHERE trainer_id = ${trainerId} AND client_id = ${clientId} AND status = 'active'
    LIMIT 1
  `;
  return res.rows.length > 0;
}

// Short, human-typeable invitation code (no ambiguous chars).
function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export interface Invitation {
  id: string;
  code: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

// Create a fresh invitation for a trainer (valid for 14 days). Retries on the
// astronomically unlikely code collision.
export async function createInvitation(trainerId: string): Promise<Invitation> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    try {
      const res = await sql`
        INSERT INTO invitations (code, trainer_id, expires_at)
        VALUES (${code}, ${trainerId}, NOW() + INTERVAL '14 days')
        RETURNING id, code, status, expires_at, created_at
      `;
      const row = res.rows[0];
      return {
        id: row.id,
        code: row.code,
        status: row.status,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      };
    } catch {
      // unique violation on code → try again
    }
  }
  throw new Error("Davet kodu uretilemedi");
}

export async function listTrainerInvitations(trainerId: string): Promise<Invitation[]> {
  const res = await sql`
    SELECT id, code, status, expires_at, created_at
    FROM invitations
    WHERE trainer_id = ${trainerId} AND status = 'open' AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY created_at DESC
  `;
  return res.rows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

// Redeem an invitation code as a client → creates the trainer_clients link.
// Returns { ok, error? } so the route can map to a friendly status.
export async function acceptInvitation(
  code: string,
  clientId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const inv = await sql`
    SELECT id, trainer_id, status, expires_at
    FROM invitations WHERE code = ${code}
  `;
  if (inv.rows.length === 0) return { ok: false, error: "Davet bulunamadi" };
  const row = inv.rows[0];

  if (row.status !== "open") return { ok: false, error: "Davet kullanilmis" };
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "Davet suresi dolmus" };
  }
  if (row.trainer_id === clientId) {
    return { ok: false, error: "Kendi davetinizi kabul edemezsiniz" };
  }

  await sql`
    INSERT INTO trainer_clients (trainer_id, client_id, status)
    VALUES (${row.trainer_id}, ${clientId}, 'active')
    ON CONFLICT (trainer_id, client_id) DO UPDATE SET status = 'active'
  `;
  await sql`
    UPDATE invitations SET status = 'accepted', accepted_by = ${clientId}
    WHERE id = ${row.id}
  `;
  return { ok: true };
}

export interface TrainerClient {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  age: number | null;
  weight: number | null;
  height: number | null;
  gender: string | null;
  linkedAt: string;
  today: {
    date: string;
    target: number;
    totalCalories: number;
  } | null;
}

// List a trainer's active clients, each with today's summary (if logged).
// Today's totals are aggregated per client in a subquery so a client with more
// than one daily_logs row for today (legacy duplicates) appears exactly once.
export async function listTrainerClients(trainerId: string): Promise<TrainerClient[]> {
  const today = localDateStr();
  const res = await sql`
    SELECT u.id, u.name, u.email, u.image, u.age, u.weight, u.height, u.gender,
           tc.created_at AS linked_at,
           t.total_calories, t.target
    FROM trainer_clients tc
    JOIN users u ON u.id = tc.client_id
    LEFT JOIN (
      SELECT user_id,
             MAX(total_calories) AS total_calories,
             MAX(target) AS target
      FROM daily_logs
      WHERE date = ${today} AND user_id IS NOT NULL
      GROUP BY user_id
    ) t ON t.user_id = u.id
    WHERE tc.trainer_id = ${trainerId} AND tc.status = 'active'
    ORDER BY u.name ASC NULLS LAST, u.email ASC
  `;
  return res.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    age: row.age ?? null,
    weight: row.weight ?? null,
    height: row.height ?? null,
    gender: row.gender ?? null,
    linkedAt: row.linked_at,
    today:
      row.total_calories !== null && row.total_calories !== undefined
        ? { date: today, target: row.target ?? 2000, totalCalories: row.total_calories }
        : null,
  }));
}

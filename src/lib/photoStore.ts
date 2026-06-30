// On-device photo store (IndexedDB).
//
// Captured meal photos are kept here keyed by food-item id so they survive
// reloads and show up in history even when Blob hosting is not configured and
// the database only stores nutritional data. IndexedDB has a far larger quota
// than localStorage, so storing compressed JPEG data URLs is safe.
//
// Each entry carries a timestamp so photos can be pruned after a retention
// window (see prunePhotos) — they are only meant to back the last few days of
// history.

const DB_NAME = "kalori-photos";
const STORE = "photos";
const VERSION = 1;

interface StoredPhoto {
  u: string; // data URL
  t: number; // saved-at timestamp (ms)
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

// Accepts both the current object format and the legacy plain-string format.
function readUrl(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as StoredPhoto).u === "string") {
    return (value as StoredPhoto).u;
  }
  return undefined;
}

export async function savePhoto(id: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const entry: StoredPhoto = { u: dataUrl, t: Date.now() };
    tx.objectStore(STORE).put(entry, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  db.close();
}

export async function getPhotos(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (ids.length === 0) return out;
  const db = await openDb();
  if (!db) return out;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    let pending = ids.length;
    const done = () => {
      if (--pending <= 0) resolve();
    };
    ids.forEach((id) => {
      const r = store.get(id);
      r.onsuccess = () => {
        const url = readUrl(r.result);
        if (url) out[id] = url;
        done();
      };
      r.onerror = () => done();
    });
  });
  db.close();
  return out;
}

export async function deletePhotos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  db.close();
}

// Delete every stored photo older than maxAgeMs. Legacy entries without a
// timestamp are left untouched (they predate retention tracking).
export async function prunePhotos(maxAgeMs: number): Promise<number> {
  const db = await openDb();
  if (!db) return 0;
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return; // iteration finished — wait for tx.oncomplete
      const v = cursor.value as StoredPhoto | string;
      if (v && typeof v === "object" && typeof v.t === "number" && v.t < cutoff) {
        cursor.delete();
        removed++;
      }
      cursor.continue();
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
  db.close();
  return removed;
}

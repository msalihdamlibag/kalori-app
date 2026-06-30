// On-device photo store (IndexedDB).
//
// Captured meal photos are kept here keyed by food-item id so they survive
// reloads and show up in history even when Blob hosting is not configured and
// the database only stores nutritional data. IndexedDB has a far larger quota
// than localStorage, so storing compressed JPEG data URLs is safe.

const DB_NAME = "kalori-photos";
const STORE = "photos";
const VERSION = 1;

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

export async function savePhoto(id: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
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
        if (typeof r.result === "string") out[id] = r.result;
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

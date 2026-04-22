/**
 * Tiny IndexedDB-based queue for fill-ups submitted while offline.
 *
 * Only the "insert fill-up" mutation is queued — edit/delete are rare and
 * would introduce conflict-resolution headaches we don't want to own.
 *
 * Structure:
 *   DB: fuellog-offline   (version 1)
 *   Store: pending-fillups (keyPath = "id", autoIncrement via crypto.randomUUID)
 *
 * Records look like a `fill_ups` insert payload plus `_queuedAt` (ISO).
 */

export type QueuedFillUp = {
  id: string;
  _queuedAt: string;
  vehicle_id: string;
  created_by: string;
  date: string;
  odometer_km: number;
  liters: number | null;
  total_price: number | null;
  currency: string;
  station_brand: string | null;
  city: string | null;
  region: string | null;
  country: string;
  address: string | null;
  is_full_tank: boolean;
  is_highway: boolean;
  note: string | null;
};

const DB_NAME = "fuellog-offline";
const DB_VERSION = 1;
const STORE = "pending-fillups";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueFillUp(payload: Omit<QueuedFillUp, "id" | "_queuedAt">): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: QueuedFillUp = { ...payload, id, _queuedAt: new Date().toISOString() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function listQueued(): Promise<QueuedFillUp[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedFillUp[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueued(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countQueued(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

import type { StoredRecording } from "~/types/screenRecorder";

/**
 * A tiny zero-dependency IndexedDB wrapper for persisting recordings locally.
 * Blobs are stored directly (IndexedDB supports Blob values), so recordings
 * survive reloads until the user deletes them. Everything stays on device.
 */
const DB_NAME = "ono-screen-recorder";
const DB_VERSION = 1;
const STORE = "recordings";

function isSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open the recordings database."));
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Recordings database request failed."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = await run(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Recordings transaction failed."));
      tx.onabort = () => reject(tx.error ?? new Error("Recordings transaction aborted."));
    });
    return result;
  } finally {
    db.close();
  }
}

export const recordingsDb = {
  isSupported,

  async list(): Promise<StoredRecording[]> {
    if (!isSupported()) return [];
    const all = await withStore("readonly", (store) => promisifyRequest(store.getAll()));
    return (all as StoredRecording[]).sort((a, b) => b.createdAt - a.createdAt);
  },

  async add(recording: StoredRecording): Promise<void> {
    if (!isSupported()) return;
    await withStore("readwrite", (store) => promisifyRequest(store.put(recording)));
  },

  async rename(id: string, name: string): Promise<void> {
    if (!isSupported()) return;
    await withStore("readwrite", async (store) => {
      const existing = (await promisifyRequest(store.get(id))) as StoredRecording | undefined;
      if (existing) await promisifyRequest(store.put({ ...existing, name }));
    });
  },

  async remove(id: string): Promise<void> {
    if (!isSupported()) return;
    await withStore("readwrite", (store) => promisifyRequest(store.delete(id)));
  },

  async clear(): Promise<void> {
    if (!isSupported()) return;
    await withStore("readwrite", (store) => promisifyRequest(store.clear()));
  }
};

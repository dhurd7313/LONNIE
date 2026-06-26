// Persistent memory via IndexedDB — survives browser cache clears, much larger than localStorage
// Falls back to localStorage if IndexedDB unavailable

export interface MemoryEntry {
  key: string;
  value: unknown;
  savedAt: string;
  updatedAt: string;
  tags?: string[];
  note?: string;
}

const DB_NAME = "lonnie_agent";
const DB_VERSION = 1;
const STORE = "memories";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("savedAt", "savedAt");
        store.createIndex("tags", "tags", { multiEntry: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const memory = {
  async set(key: string, value: unknown, note?: string, tags?: string[]): Promise<void> {
    try {
      const db = await openDB();
      const now = new Date().toISOString();
      const existing = await this.get(key);
      const entry: MemoryEntry = {
        key,
        value,
        savedAt: existing?.savedAt ?? now,
        updatedAt: now,
        tags,
        note,
      };
      await new Promise<void>((res, rej) => {
        const tx = db.transaction(STORE, "readwrite");
        const req = tx.objectStore(STORE).put(entry);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      });
    } catch {
      // Fallback to localStorage
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      mem[key] = { value, savedAt: new Date().toISOString(), note, tags };
      localStorage.setItem("lonnie_memory", JSON.stringify(mem));
    }
  },

  async get(key: string): Promise<MemoryEntry | null> {
    try {
      const db = await openDB();
      return await new Promise((res, rej) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => res(req.result ?? null);
        req.onerror = () => rej(req.error);
      });
    } catch {
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      return mem[key] ? { key, ...mem[key] } : null;
    }
  },

  async getAll(): Promise<MemoryEntry[]> {
    try {
      const db = await openDB();
      return await new Promise((res, rej) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => res(req.result ?? []);
        req.onerror = () => rej(req.error);
      });
    } catch {
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      return Object.entries(mem).map(([key, v]: any) => ({ key, ...v }));
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((res, rej) => {
        const tx = db.transaction(STORE, "readwrite");
        const req = tx.objectStore(STORE).delete(key);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      });
    } catch {
      const mem = JSON.parse(localStorage.getItem("lonnie_memory") ?? "{}");
      delete mem[key];
      localStorage.setItem("lonnie_memory", JSON.stringify(mem));
    }
  },

  async search(query: string): Promise<MemoryEntry[]> {
    const all = await this.getAll();
    const q = query.toLowerCase();
    return all.filter(e =>
      e.key.toLowerCase().includes(q) ||
      JSON.stringify(e.value).toLowerCase().includes(q) ||
      e.note?.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    );
  },

  async clear(): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((res, rej) => {
        const tx = db.transaction(STORE, "readwrite");
        const req = tx.objectStore(STORE).clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
      });
    } catch {
      localStorage.removeItem("lonnie_memory");
    }
  },

  async exportAll(): Promise<string> {
    const all = await this.getAll();
    return JSON.stringify(all, null, 2);
  },

  async importAll(json: string): Promise<number> {
    const entries: MemoryEntry[] = JSON.parse(json);
    for (const e of entries) await this.set(e.key, e.value, e.note, e.tags);
    return entries.length;
  },
};

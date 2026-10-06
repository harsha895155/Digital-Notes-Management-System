/**
 * MindDesk Offline & Sync Manager
 * Uses IndexedDB for reliable client-side caching and an offline mutation queue
 */

const DB_NAME = "MindDeskOfflineDB";
const DB_VERSION = 1;

let dbPromise = null;

const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported in this environment"));
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("todos")) {
        db.createObjectStore("todos", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("pendingQueue")) {
        db.createObjectStore("pendingQueue", { keyPath: "queueId", autoIncrement: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
};

// Generic read all from store
export const getOfflineStore = async (storeName) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`IndexedDB read error on ${storeName}:`, err);
    return [];
  }
};

// Generic bulk save to store (replaces cache with latest server data)
export const saveOfflineStore = async (storeName, items) => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      if (item && item._id) {
        store.put(item);
      }
    }
  } catch (err) {
    console.warn(`IndexedDB write error on ${storeName}:`, err);
  }
};

// Queue an offline mutation (Create, Update, Delete)
export const queueOfflineMutation = async (mutation) => {
  try {
    const db = await openDB();
    const tx = db.transaction("pendingQueue", "readwrite");
    const store = tx.objectStore("pendingQueue");
    store.add({
      ...mutation,
      queuedAt: new Date().toISOString(),
    });
    dispatchSyncStatus("pending");
  } catch (err) {
    console.error("Failed to queue offline mutation:", err);
  }
};

// Get pending queue items
export const getPendingQueue = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("pendingQueue", "readonly");
      const store = tx.objectStore("pendingQueue");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
};

// Clear processed mutation from queue
export const removeQueueItem = async (queueId) => {
  try {
    const db = await openDB();
    const tx = db.transaction("pendingQueue", "readwrite");
    const store = tx.objectStore("pendingQueue");
    store.delete(queueId);
  } catch (err) {
    console.warn("Failed to delete queue item:", err);
  }
};

// Custom event dispatcher for UI status updates
export const dispatchSyncStatus = (status, details = {}) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("minddesk:sync", {
        detail: { status, timestamp: Date.now(), ...details },
      })
    );
  }
};

// Execute sync queue when back online
export const syncPendingQueue = async (apiClient) => {
  if (!navigator.onLine) return;

  const queue = await getPendingQueue();
  if (queue.length === 0) {
    dispatchSyncStatus("synced");
    return;
  }

  dispatchSyncStatus("syncing", { count: queue.length });

  let successCount = 0;

  for (const item of queue) {
    try {
      if (item.entity === "notes") {
        if (item.action === "CREATE") {
          await apiClient.post("/api/notes", item.data);
        } else if (item.action === "UPDATE" && item.id) {
          await apiClient.put(`/api/notes/${item.id}`, item.data);
        } else if (item.action === "DELETE" && item.id) {
          await apiClient.delete(`/api/notes/${item.id}`);
        }
      } else if (item.entity === "todos") {
        if (item.action === "CREATE") {
          await apiClient.post("/api/todos", item.data);
        } else if (item.action === "UPDATE" && item.id) {
          await apiClient.put(`/api/todos/${item.id}`, item.data);
        } else if (item.action === "DELETE" && item.id) {
          await apiClient.delete(`/api/todos/${item.id}`);
        }
      } else if (item.entity === "categories") {
        if (item.action === "CREATE") {
          await apiClient.post("/api/categories", item.data);
        } else if (item.action === "DELETE" && item.id) {
          await apiClient.delete(`/api/categories/${item.id}`);
        }
      }

      await removeQueueItem(item.queueId);
      successCount++;
    } catch (err) {
      console.warn(`Failed to sync item ${item.queueId}:`, err);
    }
  }

  dispatchSyncStatus("synced", { syncedCount: successCount });
};

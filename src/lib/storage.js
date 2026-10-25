const DB_NAME = 'myc-muebles-local';
const DB_VERSION = 1;
const STORE_NAME = 'app';
const STATE_KEY = 'current-state';

let dbPromise;

function openDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB no está disponible en este navegador.'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('No se pudo abrir la base local.'));
      request.onblocked = () => reject(new Error('Cerrá otras pestañas de MyC Muebles y volvé a intentar.'));
    });
  }
  return dbPromise;
}

function readRecord(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('No se pudieron leer los datos locales.'));
  });
}

export async function loadAppState() {
  const db = await openDatabase();
  const state = await readRecord(db);
  if (state?.prices?.length) return state;

  // One-time migration from the price-list key used by previous app versions.
  let oldPrices = null;
  try { oldPrices = JSON.parse(localStorage.getItem('taller-prices') || 'null'); } catch {}
  if (oldPrices?.length) return { ...state, prices: oldPrices };
  return state;
}

export async function saveAppState(state) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error('No se pudieron guardar los datos locales.'));
    transaction.onabort = () => reject(transaction.error || new Error('Se canceló el guardado local.'));
  });
}

export async function requestPersistentStorage() {
  if (navigator.storage?.persist) {
    try { return await navigator.storage.persist(); } catch { return false; }
  }
  return false;
}

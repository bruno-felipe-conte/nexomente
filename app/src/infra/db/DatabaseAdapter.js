/**
 * DatabaseAdapter — Camada de Infraestrutura de Persistência Unificada (Hexagonal Adapter)
 *
 * Responsabilidades:
 * 1. Detectar ambiente de execução (Electron Desktop via IPC vs. Browser/Testes via SQL.js WASM).
 * 2. Gerenciar persistência não-bloqueante:
 *    - Usa IndexedDB assíncrono para snapshots binários do banco WASM (sem limite de 5MB do localStorage).
 *    - Aplica Debounce de escrita (350ms) na thread principal para eliminar engasgos no autosave do TipTap.
 *    - Mantém compatibilidade retroativa com `localStorage('nexomente_db')` para migração transparente e testes.
 */

const IDB_NAME = 'nexomente_idb';
const IDB_STORE = 'sqlite_snapshots';
const IDB_KEY = 'primary_db';

let idbPromise = null;

function openIndexedDB() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return idbPromise;
}

/**
 * Salva o snapshot Uint8Array no IndexedDB de forma 100% assíncrona (sem travar a UI e sem btoa).
 */
export async function saveSnapshotToIndexedDB(uint8Array) {
  const idb = await openIndexedDB();
  if (!idb) return false;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(uint8Array, IDB_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Carrega o snapshot Uint8Array do IndexedDB (se disponível).
 */
export async function loadSnapshotFromIndexedDB() {
  const idb = await openIndexedDB();
  if (!idb) return null;
  return new Promise((resolve) => {
    try {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Verifica se o driver nativo do Electron IPC está ativo.
 */
export function isElectronNativeDBAvailable() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.db);
}

/**
 * Agenda a serialização em background (idle callback ou debounce) para evitar bloqueio de UI.
 */
let flushTimeout = null;
export function scheduleBackgroundPersist(exportFn) {
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    try {
      const bytes = exportFn();
      if (bytes) {
        saveSnapshotToIndexedDB(bytes);
      }
    } catch (err) {
      console.error('[DatabaseAdapter] Erro ao persistir snapshot em IndexedDB:', err);
    }
  }, 300);
}

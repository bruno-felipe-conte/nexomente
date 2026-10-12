import { create } from 'zustand';
import { initDB, saveDB, getDB, createTables, dbPromise, setOnSaveCallback } from '../lib/db/wasmEngine';
import { createNotasRepository } from '../lib/db/repositories/notasRepo';
import { createPastasRepository } from '../lib/db/repositories/pastasRepo';
import { createMateriasRepository } from '../lib/db/repositories/materiasRepo';
import { createSessoesRepository } from '../lib/db/repositories/sessoesRepo';
import { createFlashcardsRepository } from '../lib/db/repositories/flashcardsRepo';
import { createXpRepository } from '../lib/db/repositories/xpRepo';
import { createPoemasRepository } from '../lib/db/repositories/poemasRepo';

export { initDB, saveDB, getDB, createTables, dbPromise };

export const useDBStore = create((set, get) => ({
  db: null,
  loading: true,
  error: null,
  totalXP: 0,
  version: 0,

  incrementVersion: () => set(state => ({ version: state.version + 1 })),

  init: async () => {
    try {
      const db = await initDB();
      set({ db, loading: false });
      get().syncXP();
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  syncXP: () => {
    const total = get().XP.getTotal();
    set({ totalXP: total });
  },

  Notas: createNotasRepository(get, saveDB),
  Pastas: createPastasRepository(get, saveDB),
  Materias: createMateriasRepository(get, saveDB),
  SessoesEstudo: createSessoesRepository(get, saveDB),
  Flashcards: createFlashcardsRepository(get, saveDB),
  XP: createXpRepository(get, saveDB),
  Poemas: createPoemasRepository(get, saveDB),
}));

setOnSaveCallback(() => {
  if (useDBStore.getState().incrementVersion) {
    useDBStore.getState().incrementVersion();
  }
});
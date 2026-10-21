import { create } from 'zustand';
import { initDB, saveDB, getDB, createTables, dbPromise, setOnSaveCallback } from '../lib/db/wasmEngine.js';
import { createNotasRepository } from '../lib/db/repositories/notasRepo.js';
import { createPastasRepository } from '../lib/db/repositories/pastasRepo.js';
import { createMateriasRepository } from '../lib/db/repositories/materiasRepo.js';
import { createSessoesRepository } from '../lib/db/repositories/sessoesRepo.js';
import { createFlashcardsRepository } from '../lib/db/repositories/flashcardsRepo.js';
import { createXpRepository } from '../lib/db/repositories/xpRepo.js';
import { createPoemasRepository } from '../lib/db/repositories/poemasRepo.js';

export { initDB, saveDB, getDB, createTables, dbPromise };

let defaultRepositoryFactory = (get, save) => ({
  Notas: createNotasRepository(get, save),
  Pastas: createPastasRepository(get, save),
  Materias: createMateriasRepository(get, save),
  SessoesEstudo: createSessoesRepository(get, save),
  Flashcards: createFlashcardsRepository(get, save),
  XP: createXpRepository(get, save),
  Poemas: createPoemasRepository(get, save),
});

export const useDBStore = create((set, get) => {
  const repos = defaultRepositoryFactory(get, saveDB);

  return {
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

    setRepositoryFactory: (customFactory) => {
      const customRepos = customFactory(get, saveDB);
      set(customRepos);
    },

    Notas: repos.Notas,
    Pastas: repos.Pastas,
    Materias: repos.Materias,
    SessoesEstudo: repos.SessoesEstudo,
    Flashcards: repos.Flashcards,
    XP: repos.XP,
    Poemas: repos.Poemas,
  };
});

setOnSaveCallback(() => {
  if (useDBStore.getState().incrementVersion) {
    useDBStore.getState().incrementVersion();
  }
});
// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Helper to create an in-memory IndexedDB mock conforming to DatabaseAdapter contracts
function createMockIndexedDB() {
  const stores = new Map();
  let closed = false;

  const mockDB = {
    objectStoreNames: {
      contains: (name) => stores.has(name)
    },
    createObjectStore: (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return {};
    },
    transaction: (storeName, mode) => {
      if (!stores.has(storeName)) stores.set(storeName, new Map());
      const storeMap = stores.get(storeName);
      const storeObj = {
        put: (val, key) => {
          storeMap.set(key, val);
        },
        get: (key) => {
          const req = { onsuccess: null, onerror: null, result: storeMap.get(key) };
          queueMicrotask(() => {
            if (req.onsuccess) req.onsuccess({ target: req });
          });
          return req;
        }
      };
      const tx = {
        objectStore: () => storeObj,
        oncomplete: null,
        onerror: null
      };
      queueMicrotask(() => {
        if (tx.oncomplete) tx.oncomplete();
      });
      return tx;
    },
    close: () => { closed = true; }
  };

  return {
    _stores: stores,
    open: (name, version) => {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB };
      queueMicrotask(() => {
        if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
    deleteDatabase: (name) => {
      stores.clear();
      const req = { onsuccess: null, onerror: null };
      queueMicrotask(() => {
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    }
  };
}

// Helper to create a controllable localStorage mock that can simulate QuotaExceededError
function createMockLocalStorage() {
  let store = {};
  let quotaErrorKey = null;

  return {
    _store: store,
    setQuotaErrorOn: (key) => { quotaErrorKey = key; },
    clearQuotaError: () => { quotaErrorKey = null; },
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      if (quotaErrorKey === key) {
        const err = new Error('QuotaExceededError: DOMException quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      }
      store[key] = String(val);
    },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

describe('Empirical Adversarial Challenge — Data Layer Resilience (Milestone 1)', () => {
  let mockLS;
  let mockIDB;

  beforeEach(() => {
    mockLS = createMockLocalStorage();
    mockIDB = createMockIndexedDB();
    globalThis.localStorage = mockLS;
    globalThis.sessionStorage = createMockLocalStorage();
    globalThis.indexedDB = mockIDB;
    globalThis.window = globalThis;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. QuotaExceededError Simulation & IndexedDB Snapshot Recovery', () => {
    it('switches to indexeddb mode and recovers data from IDB snapshot when localStorage throws QuotaExceededError', async () => {
      vi.resetModules();
      const wasmEngine = await import('../lib/db/wasmEngine.js');
      const { purgeAllStorage, loadSnapshotFromIndexedDB } = await import('../infra/db/DatabaseAdapter.js');

      // Inicializa DB e cria uma nota de teste
      const db = await wasmEngine.initDB();
      db.run("INSERT INTO notas (id, titulo, tipo, conteudo) VALUES ('nota_quota_1', 'Nota Sobrevivente', 'nota', 'Conteudo Importante')");

      // Simula estouro de cota (5MB limit) no localStorage ao salvar
      mockLS.setQuotaErrorOn('nexomente_db');

      // Chama saveDB(): deve disparar o catch com QuotaExceededError
      wasmEngine.saveDB();

      // Verifica se a chave corrompida/antiga foi removida e storage mode mudou
      expect(mockLS.getItem('nexomente_db')).toBeNull();
      expect(mockLS.getItem('nexomente_storage_mode')).toBe('indexeddb');

      // Aguarda persistência em background no IndexedDB (debounce 300ms + buffer)
      await new Promise(r => setTimeout(r, 450));

      // Verifica se o snapshot foi persistido com sucesso no IndexedDB
      const idbBytes = await loadSnapshotFromIndexedDB();
      expect(idbBytes).toBeInstanceOf(Uint8Array);
      expect(idbBytes.length).toBeGreaterThan(0);

      // Simula reinício a frio da aplicação (novo processo / nova aba)
      vi.resetModules();
      const freshWasmEngine = await import('../lib/db/wasmEngine.js');
      const restoredDB = await freshWasmEngine.initDB();

      // Confere se o dado sobreviveu no banco restaurado do IndexedDB
      const res = restoredDB.exec("SELECT id, titulo, conteudo FROM notas WHERE id = 'nota_quota_1'");
      expect(res[0]?.values[0]).toEqual(['nota_quota_1', 'Nota Sobrevivente', 'Conteudo Importante']);
    });

    it('adversarial probe: demonstrates data vulnerability if process is terminated within the 300ms debounce window', async () => {
      vi.resetModules();
      const wasmEngine = await import('../lib/db/wasmEngine.js');

      const db = await wasmEngine.initDB();
      db.run("INSERT INTO notas (id, titulo, tipo) VALUES ('nota_race', 'Nota Arriscada', 'nota')");

      // Simula cota estourada
      mockLS.setQuotaErrorOn('nexomente_db');
      wasmEngine.saveDB();

      // localStorage já foi apagado imediatamente!
      expect(mockLS.getItem('nexomente_db')).toBeNull();

      // MAS o snapshot do IndexedDB ainda não foi persistido (pois o debounce é de 300ms)
      const { loadSnapshotFromIndexedDB } = await import('../infra/db/DatabaseAdapter.js');
      const immediateSnapshot = await loadSnapshotFromIndexedDB();
      // Constatação empírica: dentro da janela de 300ms, o snapshot ainda não foi gravado!
      expect(immediateSnapshot).toBeNull();
    });
  });

  describe('2. Base64 Corruption Recovery in wasmEngine.js', () => {
    it('Case 2A: eradicates malformed base64 from localStorage and recovers safely from IndexedDB', async () => {
      vi.resetModules();
      const wasmEngine = await import('../lib/db/wasmEngine.js');
      const { saveSnapshotToIndexedDB } = await import('../infra/db/DatabaseAdapter.js');

      // Prepara um snapshot válido no IndexedDB
      const db = await wasmEngine.initDB();
      db.run("INSERT INTO notas (id, titulo, tipo) VALUES ('nota_idb_safe', 'Nota do IndexedDB', 'nota')");
      const validBytes = db.export();
      await saveSnapshotToIndexedDB(validBytes, { updatedAt: Date.now() });

      // Injeta lixo não-base64 no localStorage
      mockLS.setItem('nexomente_db', '!!!@#$%^&*()INVALID_BASE64_CORRUPTION');
      mockLS.setItem('nexomente_db_updated_at', String(Date.now() + 1000));

      // Simula reboot
      vi.resetModules();
      const freshWasmEngine = await import('../lib/db/wasmEngine.js');
      const restoredDB = await freshWasmEngine.initDB();

      // Confere se o lixo corrompido não está mais lá (foi expurgado e substituído por export válido gerado em createTables->saveDB)
      expect(mockLS.getItem('nexomente_db')).not.toBe('!!!@#$%^&*()INVALID_BASE64_CORRUPTION');

      // Confere se o banco foi restaurado a partir do snapshot do IndexedDB com o dado íntegro
      const res = restoredDB.exec("SELECT id, titulo FROM notas WHERE id = 'nota_idb_safe'");
      expect(res[0]?.values[0]).toEqual(['nota_idb_safe', 'Nota do IndexedDB']);
    });

    it('Case 2B (Empirical Vulnerability Reproduction): demonstrates that valid base64 with corrupted SQLite header bypasses try/catch and crashes initDB()', async () => {
      vi.resetModules();
      const wasmEngine = await import('../lib/db/wasmEngine.js');
      const { saveSnapshotToIndexedDB } = await import('../infra/db/DatabaseAdapter.js');

      // Prepara um snapshot de emergência válido no IndexedDB
      const db = await wasmEngine.initDB();
      db.run("INSERT INTO materias (id, nome, cor) VALUES ('mat_idb', 'Matéria Resiliente', '#10B981')");
      const validBytes = db.export();
      await saveSnapshotToIndexedDB(validBytes, { updatedAt: Date.now() });

      // Injeta base64 válido mas cujo payload NÃO é banco sqlite válido (header inválido)
      const fakeBinary = btoa('NOT A VALID SQLITE DATABASE BINARY HEADER AT ALL');
      mockLS.setItem('nexomente_db', fakeBinary);
      mockLS.setItem('nexomente_db_updated_at', String(Date.now() + 1000));

      // Simula reboot
      vi.resetModules();
      const freshWasmEngine = await import('../lib/db/wasmEngine.js');
      freshWasmEngine.dbPromise.catch(() => {}); // Evita unhandled rejection em dbPromise exportada

      // VULNERABILIDADE CONFIRMADA: new SQL.Database(fakeBinary) não lança erro no construtor.
      // O erro 'file is not a database' só é lançado durante createTables() fora do try/catch de recuperação!
      // Como resultado, initDB() falha com rejeição em vez de se recuperar do IndexedDB:
      await expect(freshWasmEngine.initDB()).rejects.toThrow(/file is not a database/);
    });

    it('Case 2C: initializes clean database with all required schema tables when BOTH localStorage and IDB are empty or corrupted', async () => {
      // Injeta base64 corrompido e sem nenhum dado no IndexedDB
      mockLS.setItem('nexomente_db', '###MALFORMED###');

      vi.resetModules();
      const freshWasmEngine = await import('../lib/db/wasmEngine.js');
      const cleanDB = await freshWasmEngine.initDB();

      expect(cleanDB).toBeDefined();
      // Verifica se todas as tabelas requeridas foram criadas
      const tables = cleanDB.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0].values.flat();
      expect(tables).toContain('pastas');
      expect(tables).toContain('notas');
      expect(tables).toContain('materias');
      expect(tables).toContain('sessoes_estudo');
      expect(tables).toContain('flashcards');
      expect(tables).toContain('transacoes_xp');
      expect(tables).toContain('poemas');

      // Verifica se a pasta_raiz e poemas default foram semeados
      const pastaCount = cleanDB.exec("SELECT COUNT(*) FROM pastas WHERE id = 'pasta_raiz'")[0].values[0][0];
      expect(pastaCount).toBe(1);

      const poemasCount = cleanDB.exec("SELECT COUNT(*) FROM poemas")[0].values[0][0];
      expect(poemasCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('3. Pre-Boot Notes Reconciliation in useDBStore.js', () => {
    it('reconciles pending notes from localStorage into SQLite on boot without loss', async () => {
      // Prepara notas criadas antes do boot (ex: modo offline ou carregamento assíncrono do WASM)
      const preBootNotes = [
        {
          id: 'pre_nota_1',
          titulo: 'Pensamento Rápido 1',
          tipo: 'ideia',
          conteudo: 'Ideia capturada antes do motor SQL carregar',
          tags: ['offline', 'ideia']
        },
        {
          id: 'pre_nota_2',
          titulo: 'Pensamento Rápido 2',
          tipo: 'livro',
          conteudo: 'Citação lida antes do boot',
          autor: 'Marco Aurélio',
          tags: ['filosofia']
        }
      ];
      mockLS.setItem('nexomente_notas', JSON.stringify(preBootNotes));

      vi.resetModules();
      const { useDBStore } = await import('../store/useDBStore.js');

      await useDBStore.getState().init();

      const { Notas } = useDBStore.getState();
      const allNotas = Notas.getAll();

      // Ambas as notas devem estar no banco SQLite
      const n1 = Notas.getById('pre_nota_1');
      expect(n1).toBeDefined();
      expect(n1.titulo).toBe('Pensamento Rápido 1');
      expect(n1.tipo).toBe('ideia');
      expect(n1.conteudo).toBe('Ideia capturada antes do motor SQL carregar');
      expect(n1.tags).toEqual(['offline', 'ideia']);

      const n2 = Notas.getById('pre_nota_2');
      expect(n2).toBeDefined();
      expect(n2.titulo).toBe('Pensamento Rápido 2');
      expect(n2.autor).toBe('Marco Aurélio');

      // Chave transitória deve ter sido removida do localStorage
      expect(mockLS.getItem('nexomente_notas')).toBeNull();

      // Versão do store deve ter sido incrementada para avisar os componentes UI
      expect(useDBStore.getState().version).toBeGreaterThan(0);
    });

    it('prevents duplication if note already exists in SQLite', async () => {
      vi.resetModules();
      const { useDBStore } = await import('../store/useDBStore.js');
      await useDBStore.getState().init();

      // Cria nota diretamente no SQLite
      const { Notas } = useDBStore.getState();
      Notas.create({
        id: 'nota_existente',
        titulo: 'Nota Original SQLite',
        tipo: 'nota',
        conteudo: 'Versão no banco'
      });

      // Simula entrada duplicada no nexomente_notas
      mockLS.setItem('nexomente_notas', JSON.stringify([
        { id: 'nota_existente', titulo: 'Tentativa de Sobrescrita Duplicada' },
        { id: 'nota_nova', titulo: 'Nota Genuinamente Nova' }
      ]));

      // Roda reconciliação
      useDBStore.getState().reconcileBootNotes();

      // Nota original não deve ter sido corrompida ou duplicada
      const existente = Notas.getById('nota_existente');
      expect(existente.titulo).toBe('Nota Original SQLite');

      // Nota nova deve ter sido adicionada
      const nova = Notas.getById('nota_nova');
      expect(nova).toBeDefined();
      expect(nova.titulo).toBe('Nota Genuinamente Nova');

      expect(mockLS.getItem('nexomente_notas')).toBeNull();
    });

    it('handles malformed JSON in localStorage without throwing or crashing boot', async () => {
      mockLS.setItem('nexomente_notas', '{ malformed json unclosed object');

      vi.resetModules();
      const { useDBStore } = await import('../store/useDBStore.js');

      // init() não deve lançar erro
      await expect(useDBStore.getState().init()).resolves.not.toThrow();
      expect(useDBStore.getState().loading).toBe(false);
      expect(useDBStore.getState().error).toBeNull();
    });

    it('normalizes unrecognized note tipo to "nota" avoiding SQLite CHECK constraint crashes', async () => {
      mockLS.setItem('nexomente_notas', JSON.stringify([
        { id: 'nota_alien', titulo: 'Tipo Inválido', tipo: 'tipo_totalmente_invalido' }
      ]));

      vi.resetModules();
      const { useDBStore } = await import('../store/useDBStore.js');
      await useDBStore.getState().init();

      const { Notas } = useDBStore.getState();
      const notaAlien = Notas.getById('nota_alien');
      expect(notaAlien).toBeDefined();
      expect(notaAlien.tipo).toBe('nota'); // Normalizado de forma defensiva
    });
  });

  describe('4. Factory Reset Purge (E8 Verification)', () => {
    it('purgeAllStorage completely wipes both localStorage and IndexedDB preventing ghost data resurrection', async () => {
      const { saveSnapshotToIndexedDB, loadSnapshotFromIndexedDB, purgeAllStorage } = await import('../infra/db/DatabaseAdapter.js');

      // Escreve dados tanto no localStorage quanto no IndexedDB
      mockLS.setItem('nexomente_db', 'sample_data');
      mockLS.setItem('nexomente_storage_mode', 'indexeddb');
      await saveSnapshotToIndexedDB(new Uint8Array([1, 2, 3]), { updatedAt: Date.now() });

      const idbBefore = await loadSnapshotFromIndexedDB();
      expect(idbBefore).toBeDefined();

      // Executa reset de fábrica
      await purgeAllStorage();

      // Confere se tudo foi purgado
      expect(mockLS.getItem('nexomente_db')).toBeNull();
      expect(mockLS.getItem('nexomente_storage_mode')).toBeNull();
      const idbAfter = await loadSnapshotFromIndexedDB();
      expect(idbAfter).toBeNull();
    });
  });
});

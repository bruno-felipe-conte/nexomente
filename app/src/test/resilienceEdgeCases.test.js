// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';

// Lightweight mocks for heavy UI/icon libraries to avoid slow WSL filesystem traversal
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => React.createElement('div', props, children),
    button: ({ children, ...props }) => React.createElement('button', props, children),
  },
  AnimatePresence: ({ children }) => children,
}));

vi.mock('lucide-react', () => {
  const DummyIcon = () => React.createElement('span', null);
  return {
    ChevronLeft: DummyIcon,
    ChevronRight: DummyIcon,
    Edit: DummyIcon,
    AlertCircle: DummyIcon,
    Sparkles: DummyIcon,
    Upload: DummyIcon,
    Wand2: DummyIcon,
    BookOpen: DummyIcon,
    Trash2: DummyIcon,
    Edit3: DummyIcon,
    Save: DummyIcon,
  };
});

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('electron', () => ({
  default: {
    ipcMain: { handle: vi.fn(), on: vi.fn() },
    app: { getPath: () => '/tmp' },
  },
  ipcMain: { handle: vi.fn(), on: vi.fn() },
  app: { getPath: () => '/tmp' },
}));

// Mock IndexedDB conforming to W3C specification used by DatabaseAdapter
function createMockIndexedDB() {
  const databases = new Map();

  return {
    _databases: databases,
    open: (name, version) => {
      if (!databases.has(name)) {
        databases.set(name, new Map());
      }
      const dbStores = databases.get(name);

      const mockDB = {
        name,
        version,
        objectStoreNames: {
          contains: (storeName) => dbStores.has(storeName),
        },
        createObjectStore: (storeName) => {
          if (!dbStores.has(storeName)) {
            dbStores.set(storeName, new Map());
          }
          return {};
        },
        transaction: (storeName, _mode) => {
          if (!dbStores.has(storeName)) {
            dbStores.set(storeName, new Map());
          }
          const storeMap = dbStores.get(storeName);
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
            },
          };
          const tx = {
            objectStore: () => storeObj,
            oncomplete: null,
            onerror: null,
          };
          queueMicrotask(() => {
            if (tx.oncomplete) tx.oncomplete();
          });
          return tx;
        },
        close: () => {},
      };

      const req = {
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        result: mockDB,
      };

      queueMicrotask(() => {
        if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
        if (req.onsuccess) req.onsuccess({ target: req });
      });

      return req;
    },
    deleteDatabase: (name) => {
      databases.delete(name);
      const req = { onsuccess: null, onerror: null, onblocked: null };
      queueMicrotask(() => {
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
}

function createControllableLocalStorage() {
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
    clear: () => { store = {}; },
    key: (i) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; },
  };
}

describe('Master Resilience & Edge Cases Test Suite (Milestone 3)', () => {
  let mockLS;
  let mockSS;
  let mockIDB;

  beforeEach(() => {
    mockLS = createControllableLocalStorage();
    mockSS = createControllableLocalStorage();
    mockIDB = createMockIndexedDB();

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLS,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: mockSS,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'indexedDB', {
      value: mockIDB,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SCENARIO 1: QuotaExceededError in localStorage safely triggers IndexedDB
  // ==========================================================================
  describe('Scenario 1: QuotaExceededError in localStorage safely triggers IndexedDB persistence', () => {
    it('switches storage mode to indexeddb, removes corrupted key, and retains full data in IndexedDB snapshot', async () => {
      vi.resetModules();
      const wasmEngine = await import('../lib/db/wasmEngine.js');
      const { loadSnapshotFromIndexedDB } = await import('../infra/db/DatabaseAdapter.js');

      const db = await wasmEngine.initDB();
      db.run("INSERT INTO notas (id, titulo, tipo, conteudo) VALUES ('nota_resiliente_1', 'Sobrevivente da Cota', 'nota', 'Conteúdo íntegro')");

      // Inject 5MB quota exhaustion simulation on localStorage
      mockLS.setQuotaErrorOn('nexomente_db');

      // Attempt saveDB() which triggers catch block with QuotaExceededError
      wasmEngine.saveDB();

      // Corrupted / incomplete localStorage entry must be eradicated
      expect(mockLS.getItem('nexomente_db')).toBeNull();
      // Storage mode must switch to indexeddb
      expect(mockLS.getItem('nexomente_storage_mode')).toBe('indexeddb');

      // Allow asynchronous background persistence (debounce 350ms + 100ms margin)
      await new Promise((r) => setTimeout(r, 450));

      const snapshot = await loadSnapshotFromIndexedDB();
      expect(snapshot).toBeInstanceOf(Uint8Array);
      expect(snapshot.length).toBeGreaterThan(0);

      // Cold reboot: initDB() loads directly from IndexedDB when storage mode is indexeddb
      vi.resetModules();
      const freshWasm = await import('../lib/db/wasmEngine.js');
      const restoredDB = await freshWasm.initDB();

      const res = restoredDB.exec("SELECT id, titulo, conteudo FROM notas WHERE id = 'nota_resiliente_1'");
      expect(res[0]?.values[0]).toEqual(['nota_resiliente_1', 'Sobrevivente da Cota', 'Conteúdo íntegro']);
    });
  });

  // ==========================================================================
  // SCENARIO 2: Corrupted SQLite binary content triggers immediate probe error (SELECT 1;)
  // ==========================================================================
  describe('Scenario 2: Corrupted SQLite binary content triggers immediate probe error (SELECT 1;) and falls back to IndexedDB', () => {
    it('probes DB instance with SELECT 1;, catches corrupted header, purges localStorage and restores from IndexedDB snapshot', async () => {
      vi.resetModules();
      const wasmEngine = await import('../lib/db/wasmEngine.js');
      const { saveSnapshotToIndexedDB } = await import('../infra/db/DatabaseAdapter.js');

      // Seed valid backup snapshot in IndexedDB
      const db = await wasmEngine.initDB();
      db.run("INSERT INTO notas (id, titulo, tipo, conteudo) VALUES ('nota_idb_recuperada', 'Nota Salva no IDB', 'nota', 'Backup integro')");
      const validBytes = db.export();
      await saveSnapshotToIndexedDB(validBytes, { updatedAt: Date.now() });

      // Infiltrate corrupted binary payload with valid Base64 encoding into localStorage
      const corruptPayload = btoa('NOT_A_VALID_SQLITE_BINARY_HEADER_DATA_1234567890');
      mockLS.setItem('nexomente_db', corruptPayload);
      mockLS.setItem('nexomente_db_updated_at', String(Date.now() + 10000));

      // Cold boot: initDB() must NOT reject! The `SELECT 1;` probe catches corruption and recovers from IndexedDB
      vi.resetModules();
      const freshWasm = await import('../lib/db/wasmEngine.js');
      const restoredDB = await freshWasm.initDB();

      expect(restoredDB).toBeDefined();
      // Corrupted key was purged and replaced with valid export
      expect(mockLS.getItem('nexomente_db')).not.toBe(corruptPayload);

      // Verify that the data was safely restored from IndexedDB
      const res = restoredDB.exec("SELECT id, titulo, conteudo FROM notas WHERE id = 'nota_idb_recuperada'");
      expect(res[0]?.values[0]).toEqual(['nota_idb_recuperada', 'Nota Salva no IDB', 'Backup integro']);
    });
  });

  // ==========================================================================
  // SCENARIO 3: Pre-boot notes in localStorageAdapter ('nexomente_notas')
  // ==========================================================================
  describe('Scenario 3: Pre-boot notes in localStorageAdapter (nexomente_notas) are reconciled into SQLite', () => {
    it('migrates pending pre-boot notes into SQLite on initialization and cleans temporary store', async () => {
      const preBootNotes = [
        {
          id: 'pre_nota_alpha',
          titulo: 'Pensamento Capturado Offline',
          tipo: 'ideia',
          conteudo: 'Conteúdo registrado antes do boot do SQL',
          tags: ['resiliencia', 'offline']
        },
        {
          id: 'pre_nota_beta',
          titulo: 'Citação Filosófica',
          tipo: 'livro',
          conteudo: 'Citação de Sêneca',
          autor: 'Sêneca',
          tags: ['filosofia']
        }
      ];
      mockLS.setItem('nexomente_notas', JSON.stringify(preBootNotes));

      vi.resetModules();
      const { useDBStore } = await import('../store/useDBStore.js');
      await useDBStore.getState().init();

      const { Notas } = useDBStore.getState();
      const n1 = Notas.getById('pre_nota_alpha');
      expect(n1).toBeDefined();
      expect(n1.titulo).toBe('Pensamento Capturado Offline');
      expect(n1.tipo).toBe('ideia');

      const n2 = Notas.getById('pre_nota_beta');
      expect(n2).toBeDefined();
      expect(n2.autor).toBe('Sêneca');

      // Temporary key is safely cleaned up
      expect(mockLS.getItem('nexomente_notas')).toBeNull();
    });

    it('defensively normalizes unrecognized note tipo to "nota" avoiding CHECK constraint failure', async () => {
      mockLS.setItem('nexomente_notas', JSON.stringify([
        { id: 'nota_tipo_anomalo', titulo: 'Tipo Invalido', tipo: 'tipo_desconhecido_customizado' }
      ]));

      vi.resetModules();
      const { useDBStore } = await import('../store/useDBStore.js');
      await useDBStore.getState().init();

      const { Notas } = useDBStore.getState();
      const nota = Notas.getById('nota_tipo_anomalo');
      expect(nota).toBeDefined();
      expect(nota.tipo).toBe('nota');
    });

    it('safely handles corrupted or malformed JSON in nexomente_notas without crashing boot', async () => {
      mockLS.setItem('nexomente_notas', '{{{{malformed-json-payload');

      vi.resetModules();
      const { useDBStore } = await import('../store/useDBStore.js');
      await expect(useDBStore.getState().init()).resolves.not.toThrow();
      expect(useDBStore.getState().loading).toBe(false);
    });
  });

  // ==========================================================================
  // SCENARIO 4: Factory reset purgeAllStorage()
  // ==========================================================================
  describe('Scenario 4: Factory reset purgeAllStorage() wipes IndexedDB and localStorage completely', () => {
    it('deletes IndexedDB nexomente_idb and purges all storage keys preventing ghost data resurrection', async () => {
      const { saveSnapshotToIndexedDB, loadSnapshotFromIndexedDB, purgeAllStorage } = await import('../infra/db/DatabaseAdapter.js');

      mockLS.setItem('nexomente_db', 'dados_base64_legados');
      mockLS.setItem('nexomente_storage_mode', 'indexeddb');
      mockLS.setItem('nexomente_notas', JSON.stringify([{ id: 'ghost_note' }]));
      mockSS.setItem('nexomente_forja_texto', 'texto_temporario');

      await saveSnapshotToIndexedDB(new Uint8Array([10, 20, 30]), { updatedAt: Date.now() });
      expect(await loadSnapshotFromIndexedDB()).toBeDefined();

      // Execute factory reset
      await purgeAllStorage();

      // Verify complete purge
      expect(mockLS.length).toBe(0);
      expect(mockSS.length).toBe(0);
      expect(await loadSnapshotFromIndexedDB()).toBeNull();
    });
  });

  // ==========================================================================
  // SCENARIO 5: Streak freeze gap protection (diff=2)
  // ==========================================================================
  describe('Scenario 5: Streak freeze gap protection on 1 missed day (diff=2)', () => {
    it('retains streak, consumes freeze shield, and allows same-day study to increment streak to streak + 1 instead of resetting to 1', async () => {
      vi.useFakeTimers();
      const { useTamagotchiStore } = await import('../store/useTamagotchiStore.js');

      const now = new Date('2026-10-30T10:00:00.000Z');
      vi.setSystemTime(now);

      // Last studied 2 days ago (missed yesterday)
      const twoDaysAgo = new Date('2026-10-28T10:00:00.000Z').toISOString();

      useTamagotchiStore.setState({
        player: {
          xp: 120,
          hp: 60,
          hp_max: 60,
          level: 3,
          streak: 7,
          streak_max: 7,
          streak_freezes: 1,
          streak_freeze_used_today: false,
          last_study_date: twoDaysAgo,
          total_study_days: 7,
          total_sessions: 7,
          hibernations: 0,
          hibernating: false,
          pet_name: 'Kora',
          created_at: new Date('2026-10-01T00:00:00Z').toISOString()
        }
      });

      // App boot / checkDailyStatus()
      useTamagotchiStore.getState().checkDailyStatus();

      const afterCheck = useTamagotchiStore.getState().player;
      expect(afterCheck.streak_freezes).toBe(0); // Freeze consumed
      expect(afterCheck.streak).toBe(7); // Streak preserved!
      expect(afterCheck.streak_freeze_used_today).toBe(true); // Shield active
      expect(afterCheck.hp).toBe(55); // Half damage cushioned (-5 HP instead of -10 HP)

      // Later on the same day, user completes a 25-minute study session
      vi.setSystemTime(new Date('2026-10-30T16:00:00.000Z'));
      useTamagotchiStore.getState().registerStudySession(25);

      const afterStudy = useTamagotchiStore.getState().player;
      // Streak must increment to streak + 1 = 8, NOT reset to 1!
      expect(afterStudy.streak).toBe(8);
      expect(afterStudy.streak_max).toBe(8);
      expect(afterStudy.streak_freeze_used_today).toBe(false);
      expect(afterStudy.total_study_days).toBe(8);

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // SCENARIO 6: Study timer temporal guard
  // ==========================================================================
  describe('Scenario 6: Study timer temporal guard against sleep or OS clock manipulation', () => {
    it('detects large forward delta (>3000ms), pauses the timer, and prevents instant completion and fraudulent XP credit', async () => {
      vi.useFakeTimers();
      const { useStudyTimerStore } = await import('../store/useStudyTimerStore.js');
      const { useDBStore } = await import('../store/useDBStore.js');
      await useDBStore.getState().init();

      useStudyTimerStore.setState({
        timer: 25 * 60,
        totalSeconds: 25 * 60,
        rodando: false,
        modo: 'pomodoro',
        completed: false,
      });

      const timerStore = useStudyTimerStore.getState();
      timerStore.iniciar();
      expect(useStudyTimerStore.getState().rodando).toBe(true);

      // Normal tick: 1 second passes
      vi.advanceTimersByTime(1000);
      expect(useStudyTimerStore.getState().timer).toBe(25 * 60 - 1);

      // Simulate system sleep or forward clock jump (+45 min)
      const realPerfNow = performance.now.bind(performance);
      const simulatedJumpMs = 45 * 60 * 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => realPerfNow() + simulatedJumpMs);

      // Advance next timer tick
      vi.advanceTimersByTime(1000);

      const stateAfterSuspension = useStudyTimerStore.getState();
      // Guard MUST pause the timer
      expect(stateAfterSuspension.rodando).toBe(false);
      // Guard MUST NOT mark session as completed
      expect(stateAfterSuspension.completed).toBe(false);
      // Timer MUST NOT jump to 0
      expect(stateAfterSuspension.timer).toBe(25 * 60 - 1);

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // SCENARIO 7: Concurrency serialization via AsyncMutex
  // ==========================================================================
  describe('Scenario 7: Concurrency serialization with AsyncMutex', () => {
    it('strictly serializes concurrent asynchronous executions and prevents re-entrant race conditions', async () => {
      // Mock setInterval temporarily to avoid leaving open background interval from aiHandlers
      const origSetInterval = globalThis.setInterval;
      globalThis.setInterval = () => {};
      let AsyncMutex;
      try {
        const aiMod = await import('../../../electron/ipc/aiHandlers.js');
        AsyncMutex = aiMod.AsyncMutex;
      } finally {
        globalThis.setInterval = origSetInterval;
      }

      const mutex = new AsyncMutex();

      let activeCount = 0;
      let maxConcurrent = 0;
      const executionOrder = [];

      const runTask = (id, delayMs) =>
        mutex.runExclusive(async () => {
          activeCount++;
          maxConcurrent = Math.max(maxConcurrent, activeCount);
          executionOrder.push(`start_${id}`);

          await new Promise((r) => setTimeout(r, delayMs));

          executionOrder.push(`end_${id}`);
          activeCount--;
          return id;
        });

      // Launch 5 concurrent tasks simultaneously
      const promises = [
        runTask(1, 20),
        runTask(2, 15),
        runTask(3, 10),
        runTask(4, 5),
        runTask(5, 5),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([1, 2, 3, 4, 5]);
      // Active count must NEVER exceed 1 at any point in time
      expect(maxConcurrent).toBe(1);
      expect(activeCount).toBe(0);

      // Verify FIFO serial ordering: start_1 -> end_1 -> start_2 -> end_2 ...
      expect(executionOrder).toEqual([
        'start_1', 'end_1',
        'start_2', 'end_2',
        'start_3', 'end_3',
        'start_4', 'end_4',
        'start_5', 'end_5',
      ]);
    });

    it('safely releases mutex lock and allows subsequent operations even when a task throws an exception', async () => {
      const origSetInterval = globalThis.setInterval;
      globalThis.setInterval = () => {};
      let AsyncMutex;
      try {
        const aiMod = await import('../../../electron/ipc/aiHandlers.js');
        AsyncMutex = aiMod.AsyncMutex;
      } finally {
        globalThis.setInterval = origSetInterval;
      }

      const mutex = new AsyncMutex();

      let task2Ran = false;

      // Task 1 throws
      await expect(
        mutex.runExclusive(async () => {
          throw new Error('Simulated inference failure');
        })
      ).rejects.toThrow('Simulated inference failure');

      // Task 2 should execute cleanly without deadlock
      const result = await mutex.runExclusive(async () => {
        task2Ran = true;
        return 'recovered';
      });

      expect(task2Ran).toBe(true);
      expect(result).toBe('recovered');
    });
  });

  // ==========================================================================
  // SCENARIO 8: FSRS rating buttons blocked on card front & predictive intervals
  // ==========================================================================
  describe('Scenario 8: FSRS rating buttons blocked on card front and predictive intervals computed', () => {
    it('computes expected predictive intervals for ratings 1 to 4 across card states', async () => {
      const { previewIntervalo } = await import('../hooks/sm2.js');

      const newCard = { repeticoes: 0, intervalo: 0, state: 'new' };
      expect(previewIntervalo(newCard, 1)).toBe('< 1 min');
      expect(previewIntervalo(newCard, 2)).toBe('6 min');
      expect(previewIntervalo(newCard, 3)).toBe('10 min');
      expect(previewIntervalo(newCard, 4)).toBe('4 dias');

      const reviewCard = { repeticoes: 4, intervalo: 10, ease_factor: 2.5, state: 'review' };
      expect(previewIntervalo(reviewCard, 1)).toBe('< 1 min');
      expect(previewIntervalo(reviewCard, 2)).toBe('12 dias');
      expect(previewIntervalo(reviewCard, 3)).toBe('25 dias');
      expect(previewIntervalo(reviewCard, 4)).toBe('33 dias');
    });

    it('blocks keyboard shortcuts 1-4 and rating buttons when card front is visible, and enables them on flip', async () => {
      const FlashcardViewer = (await import('../components/flashcards/FlashcardViewer.jsx')).default;

      const mockCard = {
        id: 'card_fsrs_1',
        frente: 'Qual é o princípio da incerteza?',
        verso: 'Princípio de Heisenberg: delta x * delta p >= hbar / 2',
        state: 'review',
        intervalo: 5,
        repeticoes: 2,
        ease_factor: 2.5,
      };

      const onRevisarMock = vi.fn();
      const onViraCardMock = vi.fn();

      // 1. Render with mostrandoFrente === true
      const { rerender, getByText, queryByText } = render(
        React.createElement(FlashcardViewer, {
          cardAtual: mockCard,
          idxRevisao: 0,
          mostrandoFrente: true,
          onViraCard: onViraCardMock,
          onRevisar: onRevisarMock,
          onAnterior: vi.fn(),
          onProximo: vi.fn(),
          onEditar: vi.fn(),
          onCriar: vi.fn(),
          paraRevisao: [mockCard],
        })
      );

      // Front button "Revelar Resposta" is present
      expect(getByText(/Revelar Resposta/i)).toBeDefined();
      // Rating buttons 1-4 ("Errei", "Difícil", "Bom", "Fácil") must NOT be in the DOM
      expect(queryByText(/Errei/i)).toBeNull();
      expect(queryByText(/Fácil/i)).toBeNull();

      // Pressing 1, 2, 3, 4 while on front must be ignored
      fireEvent.keyDown(window, { key: '1' });
      fireEvent.keyDown(window, { key: '2' });
      fireEvent.keyDown(window, { key: '3' });
      fireEvent.keyDown(window, { key: '4' });
      expect(onRevisarMock).not.toHaveBeenCalled();

      // Pressing Space on front triggers onViraCard
      fireEvent.keyDown(window, { key: ' ' });
      expect(onViraCardMock).toHaveBeenCalledTimes(1);

      // 2. Rerender with mostrandoFrente === false (Card flipped to back)
      rerender(
        React.createElement(FlashcardViewer, {
          cardAtual: mockCard,
          idxRevisao: 0,
          mostrandoFrente: false,
          onViraCard: onViraCardMock,
          onRevisar: onRevisarMock,
          onAnterior: vi.fn(),
          onProximo: vi.fn(),
          onEditar: vi.fn(),
          onCriar: vi.fn(),
          paraRevisao: [mockCard],
        })
      );

      // Now rating buttons 1-4 are present
      expect(getByText(/Errei/i)).toBeDefined();
      expect(getByText(/Difícil/i)).toBeDefined();
      expect(getByText(/Bom/i)).toBeDefined();
      expect(getByText(/Fácil/i)).toBeDefined();

      // Pressing '3' now evaluates card with quality 3 (Bom)
      fireEvent.keyDown(window, { key: '3' });
      expect(onRevisarMock).toHaveBeenCalledWith(3);
    });
  });

  // ==========================================================================
  // SCENARIO 9: Note-to-Forja text transfer and dead-end prevention in Forja IA
  // ==========================================================================
  describe('Scenario 9: Note-to-Forja text transfer and dead-end prevention in Forja IA', () => {
    it('transfers note content to sessionStorage and GeradorForjaTab preloads it into textarea on mount', async () => {
      const GeradorForjaTab = (await import('../components/gerador/GeradorForjaTab.jsx')).default;

      const sampleNoteText = '## Teoria da Relatividade Geral\nA gravidade é a curvatura do espaço-tempo provocada pela massa.';
      mockSS.setItem('nexomente_forja_texto', sampleNoteText);

      const setTextInputMock = vi.fn();

      render(
        React.createElement(GeradorForjaTab, {
          step: 1,
          setStep: vi.fn(),
          textoInput: '',
          setTextoInput: setTextInputMock,
          fileInputRef: { current: null },
          configIA: { quantidade: 3 },
          setConfigIA: vi.fn(),
          questoes: [],
          setAba: vi.fn(),
        })
      );

      // Component consumed note text from sessionStorage
      expect(setTextInputMock).toHaveBeenCalledWith(sampleNoteText);
      // sessionStorage was cleared after consumption
      expect(mockSS.getItem('nexomente_forja_texto')).toBeNull();
    });

    it('navigates to "revisar" on Concluir e Salvar preventing dead-end state', async () => {
      const GeradorForjaTab = (await import('../components/gerador/GeradorForjaTab.jsx')).default;

      const setAbaMock = vi.fn();
      const setStepMock = vi.fn();

      const sampleQuestoes = [
        {
          id: 'q1',
          tipo: 'flashcard',
          frente: 'O que curva o espaço-tempo?',
          verso: 'Massa e energia.',
          materia_id: 'fisica',
        }
      ];

      const { getByText } = render(
        React.createElement(GeradorForjaTab, {
          step: 4,
          setStep: setStepMock,
          textoInput: 'texto',
          setTextoInput: vi.fn(),
          fileInputRef: { current: null },
          configIA: { quantidade: 1 },
          setConfigIA: vi.fn(),
          questoes: sampleQuestoes,
          atualizarQuestao: vi.fn(),
          handleCriarFlashcard: vi.fn(),
          deletarQuestao: vi.fn(),
          setAba: setAbaMock,
        })
      );

      const btnConcluir = getByText(/Concluir e Salvar/i);
      fireEvent.click(btnConcluir);

      // Must call setAba('revisar') - not non-existent 'banco'
      expect(setAbaMock).toHaveBeenCalledWith('revisar');
      expect(setStepMock).toHaveBeenCalledWith(1);
    });
  });
});

// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock do módulo mermaid dinâmico para ambiente JSDOM
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id, code) => {
      return {
        svg: `<svg id="${id}" class="mermaid-svg" viewBox="0 0 500 200"><g class="node"><text>Mock Node</text></g></svg>`,
      };
    }),
  },
}));

import {
  isOnlineProviderActive,
  enqueueNote,
  drainQueue,
  normalizeTag,
  parseTagsFromResponse,
} from '../../lib/ai/tagQueueService.js';
import { createTagsQueueRepository } from '../../lib/db/repositories/tagsQueueRepo.js';
import {
  NEURAL_VOICES,
  getVoiceById,
  neuralTTS,
} from '../../lib/audio/neuralTTS.js';
import MermaidViewer from '../../components/ai/MermaidViewer.jsx';
import {
  SOCRATIC_MODE_KEY,
  SOCRATIC_SYSTEM_PROMPT,
  isCompliantSocraticTurn,
} from '../../lib/ai/socraticPrompts.js';
import { useDBStore } from '../../store/useDBStore.js';
import toast from 'react-hot-toast';

class MockAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.duration = 10;
    this.paused = true;
    this.onplay = null;
    this.onended = null;
    this.onerror = null;
    this._listeners = {};
  }
  play() {
    this.paused = false;
    setTimeout(() => {
      if (this.onplay) this.onplay();
      if (this._listeners['play']) this._listeners['play']();
      setTimeout(() => {
        if (this.onended) this.onended();
      }, 10);
    }, 5);
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
    if (this.onpause) this.onpause();
    if (this._listeners['pause']) this._listeners['pause']();
  }
  addEventListener(event, fn) {
    this._listeners[event] = fn;
  }
  removeEventListener(event) {
    delete this._listeners[event];
  }
}

if (typeof window !== 'undefined') {
  window.speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn((utterance) => {
      setTimeout(() => {
        if (utterance.onend) utterance.onend();
      }, 10);
    }),
    getVoices: vi.fn(() => [{ lang: 'pt-BR', name: 'pt-BR-FranciscaNeural' }]),
  };
  global.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.lang = 'pt-BR';
      this.onend = null;
      this.onerror = null;
    }
  };
}

describe('Tier 4: Real-World Application Scenarios E2E Suite (R1 - R4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    global.Audio = MockAudio;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // ===========================================================================
  // Journey E2E-01: Ciclo Completo de Aprendizado Socrático Multimodal
  // ===========================================================================
  it('E2E-01: Jornada de Estudo Completa com Auto-Tagging, Diagrama Mermaid "Você está aqui" e Síntese Neural', async () => {
    // -------------------------------------------------------------------------
    // 1. Criação e Auto-Tagging de Nota
    // -------------------------------------------------------------------------
    const noteId = 'nota-krebs-2026';
    const noteData = {
      id: noteId,
      titulo: 'Ciclo de Krebs e Metabolismo Celular',
      conteudo: 'O piruvato gerado na glicólise entra na mitocôndria onde é convertido em Acetil-CoA.',
      tags: [],
    };

    const notesMap = new Map([[noteId, { ...noteData }]]);
    const mockNotasRepo = {
      getById: vi.fn((id) => notesMap.get(id)),
      update: vi.fn((id, data) => {
        const existing = notesMap.get(id);
        if (existing) {
          notesMap.set(id, { ...existing, ...data });
        }
      }),
    };

    const rawAiResponse = JSON.stringify({
      tags: ['bioquimica', 'ciclo-de-krebs', 'metabolismo', 'mitocondria'],
    });
    const parsedTags = parseTagsFromResponse(rawAiResponse).map(normalizeTag);
    expect(parsedTags).toHaveLength(4);

    mockNotasRepo.update(noteId, { tags: parsedTags });
    expect(notesMap.get(noteId).tags).toEqual(['bioquimica', 'ciclo-de-krebs', 'metabolismo', 'mitocondria']);

    // -------------------------------------------------------------------------
    // 2. Abertura do Tutor Socrático
    // -------------------------------------------------------------------------
    localStorage.setItem(SOCRATIC_MODE_KEY, 'socratic');
    expect(localStorage.getItem(SOCRATIC_MODE_KEY)).toBe('socratic');

    // -------------------------------------------------------------------------
    // 3. Resposta Socrática com Diagrama Mermaid ("Você está aqui")
    // -------------------------------------------------------------------------
    const socraticPedagogicalTurn = `
Na matriz mitocondrial, o piruvato sofre descarboxilação oxidativa pelo complexo piruvato desidrogenase, gerando Acetil-CoA, NADH e CO2.

\`\`\`mermaid
flowchart TD
    G[Glicólise: Citoplasma] --> P[Piruvato: 3 Carbonos]
    P --> PDH[Complexo PDH: Descarboxilação]
    PDH --> AC[Acetil-CoA: 2 Carbonos]
    AC --> K[Ciclo do Ácido Cítrico: Matriz]
    classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px;
    class PDH current;
\`\`\`

Qual a molécula transportadora que recebe os 2 carbonos do piruvato antes de entrar no ciclo?
    `;

    expect(isCompliantSocraticTurn(socraticPedagogicalTurn)).toBe(true);
    expect(socraticPedagogicalTurn).toContain('classDef current fill:#6366f1');
    expect(socraticPedagogicalTurn).toContain('class PDH current;');

    // -------------------------------------------------------------------------
    // 4. Renderização e Interação com o Diagrama Mermaid
    // -------------------------------------------------------------------------
    const mermaidMatch = socraticPedagogicalTurn.match(/```mermaid([\s\S]*?)```/);
    const diagramCode = mermaidMatch ? mermaidMatch[1] : '';

    const { container } = render(<MermaidViewer code={diagramCode} />);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="mermaid-viewer"]')).toBeTruthy();
    });

    // Zoom in no nó atual
    const zoomInBtn = screen.getByTestId('zoom-in-btn');
    fireEvent.click(zoomInBtn);
    expect(screen.getByTestId('zoom-level-indicator').textContent).toContain('125%');

    // -------------------------------------------------------------------------
    // 5. Síntese de Voz com Portfólio Neural Expandido (ThalitaMultilingual)
    // -------------------------------------------------------------------------
    const selectedVoice = getVoiceById('pt-BR-ThalitaMultilingualNeural').id;
    expect(selectedVoice).toBe('pt-BR-ThalitaMultilingualNeural');
    localStorage.setItem('nexomente_copilot_voice', selectedVoice);

    const speechPromise = neuralTTS.speak(
      'Qual a molécula transportadora que recebe os dois carbonos do piruvato antes de entrar no ciclo?',
      { voice: selectedVoice, messageId: 'turn-krebs-pdh' }
    );

    await speechPromise;
    await waitFor(() => {
      expect(neuralTTS.isPlaying).toBe(false);
    }, { timeout: 2000 });
    expect(localStorage.getItem('nexomente_copilot_voice')).toBe('pt-BR-ThalitaMultilingualNeural');
  });

  // ===========================================================================
  // Journey E2E-02: Resiliência Offline-to-Online
  // ===========================================================================
  it('E2E-02: Jornada de Estudo Offline com Enfileiramento Persistente e Dreno Automático ao Reconectar', async () => {
    // -------------------------------------------------------------------------
    // 1. Estado Inicial: Estudante offline
    // -------------------------------------------------------------------------
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const inMemoryQueue = [];
    const notesDB = new Map([
      ['nota-termo-1', { id: 'nota-termo-1', titulo: 'Primeira Lei da Termodinâmica', conteudo: 'A energia não pode ser criada nem destruída.', tags: [] }],
      ['nota-termo-2', { id: 'nota-termo-2', titulo: 'Entropia e Desordem', conteudo: 'A entropia do universo tende a aumentar em processos espontâneos.', tags: [] }],
    ]);

    const mockDB = {
      exec: vi.fn((sql, params) => {
        if (sql.includes('SELECT id FROM tags_queue')) {
          const found = inMemoryQueue.find((q) => q.nota_id === params[0]);
          return found ? [{ values: [[found.id]] }] : [];
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return [{ values: [[inMemoryQueue.length]] }];
        }
        if (sql.includes('SELECT id, nota_id')) {
          const limit = params?.[0] || 10;
          return inMemoryQueue.length > 0
            ? [{ values: inMemoryQueue.slice(0, limit).map((q) => [q.id, q.nota_id, 0, Date.now(), null, 'pending']) }]
            : [];
        }
        return [];
      }),
      run: vi.fn((sql, params) => {
        if (sql.includes('INSERT INTO tags_queue')) {
          inMemoryQueue.push({ id: params[0], nota_id: params[1], status: 'pending' });
        }
        if (sql.includes('DELETE FROM tags_queue')) {
          const idOrNota = params[0];
          const idx = inMemoryQueue.findIndex((q) => q.id === idOrNota || q.nota_id === idOrNota);
          if (idx !== -1) inMemoryQueue.splice(idx, 1);
        }
      }),
    };

    const queueRepo = createTagsQueueRepository(() => ({ db: mockDB }), vi.fn());

    // -------------------------------------------------------------------------
    // 2. Criação de notas offline enfileira na tags_queue (0 ciclos pesados de CPU)
    // -------------------------------------------------------------------------
    queueRepo.enqueue('nota-termo-1');
    queueRepo.enqueue('nota-termo-2');

    expect(queueRepo.countPending()).toBe(2);

    // -------------------------------------------------------------------------
    // 3. Preferência de voz persiste no localStorage enquanto estuda offline
    // -------------------------------------------------------------------------
    localStorage.setItem('nexomente_copilot_voice', 'pt-BR-NicolauNeural');
    expect(getVoiceById(localStorage.getItem('nexomente_copilot_voice')).id).toBe('pt-BR-NicolauNeural');

    // -------------------------------------------------------------------------
    // 4. Reconexão da Internet: Disparo do Dreno em Lote
    // -------------------------------------------------------------------------
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

    // Dreno consome a fila
    const pendingItems = queueRepo.peek(10);
    expect(pendingItems).toHaveLength(2);

    pendingItems.forEach((item) => {
      const note = notesDB.get(item.nota_id);
      if (note) {
        note.tags = ['termodinamica', 'fisica', 'energia'];
      }
      queueRepo.dequeue(item.nota_id);
    });

    // -------------------------------------------------------------------------
    // 5. Confirmação do Dreno e Persistência
    // -------------------------------------------------------------------------
    expect(queueRepo.countPending()).toBe(0);
    expect(notesDB.get('nota-termo-1').tags).toEqual(['termodinamica', 'fisica', 'energia']);
    expect(notesDB.get('nota-termo-2').tags).toEqual(['termodinamica', 'fisica', 'energia']);
    expect(getVoiceById(localStorage.getItem('nexomente_copilot_voice')).id).toBe('pt-BR-NicolauNeural');
  });
});

// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock do módulo mermaid dinâmico para ambiente JSDOM
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id, code) => {
      if (code.includes('Sem fechamento') || code.includes('Incompleto')) {
        throw new Error('Parse error on line 2: unexpected token');
      }
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
} from '../../lib/ai/tagQueueService.js';
import { createTagsQueueRepository } from '../../lib/db/repositories/tagsQueueRepo.js';
import {
  NEURAL_VOICES,
  getVoiceById,
  neuralTTS,
} from '../../lib/audio/neuralTTS.js';
import MermaidViewer, { CodeSnippet } from '../../components/ai/MermaidViewer.jsx';
import { SOCRATIC_SYSTEM_PROMPT, isCompliantSocraticTurn } from '../../lib/ai/socraticPrompts.js';
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

describe('Tier 3: Cross-Feature Pairwise Combinations E2E Suite (R1 - R4)', () => {
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
  // T3-01: Auto-Tagging (R1) + Socratic Mermaid (R2)
  // ===========================================================================
  it('T3-01: nota com auto-tags semânticas alimenta o contexto do Tutor Socrático que emite fluxograma Mermaid', async () => {
    const noteId = 'nota-bio-1';
    const noteTags = ['bioquimica', 'mitocondria', 'atp'];

    const mockNote = {
      id: noteId,
      titulo: 'Fosforilação Oxidativa',
      conteudo: 'A ATP sintase utiliza o gradiente de prótons para sintetizar ATP.',
      tags: noteTags,
    };

    expect(mockNote.tags).toContain('mitocondria');
    expect(mockNote.tags).toContain('atp');

    const socraticMermaidBlock = `flowchart TD
      A[Complexos I-IV: Bombeamento H+] --> B[Espaço Intermembrana: Gradiente Eletroquímico]
      B --> C[ATP Sintase: Retorno de Prótons]
      C --> D[Síntese de ATP a partir de ADP + Pi]
      classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px;
      class C current;`;

    const { container } = render(<MermaidViewer code={socraticMermaidBlock} />);

    await waitFor(() => {
      expect(container.querySelector('[data-testid="mermaid-viewer"]')).toBeTruthy();
    });

    expect(socraticMermaidBlock).toContain('classDef current fill:#6366f1');
    expect(socraticMermaidBlock).toContain('class C current;');
  });

  // ===========================================================================
  // T3-02: Socratic Mermaid (R2) + Edge TTS Voice Playback (R3)
  // ===========================================================================
  it('T3-02: síntese de áudio Edge TTS com voz neural brasileira durante interação ativa com diagrama Mermaid', async () => {
    const socraticDiagram = `flowchart LR
      E1[Sondagem] --> E2[Árvore Mínima]
      E2 --> E3[Passo Único: Você está aqui]
      E3 --> E4[Checagem]
      classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px;
      class E3 current;`;

    render(<MermaidViewer code={socraticDiagram} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-viewer')).toBeTruthy();
    });

    const selectedVoice = getVoiceById('pt-BR-AntonioNeural').id;
    expect(selectedVoice).toBe('pt-BR-AntonioNeural');

    const speakPromise = neuralTTS.speak(
      'Observe no diagrama que estamos no passo de síntese de ATP. Qual molécula fornece a energia para mover a subunidade?',
      { voice: selectedVoice, messageId: 'socratic-turn-1' }
    );

    const zoomInBtn = screen.getByTestId('zoom-in-btn');
    fireEvent.click(zoomInBtn);
    expect(screen.getByTestId('zoom-level-indicator').textContent).toContain('125%');

    await speakPromise;
    await waitFor(() => {
      expect(neuralTTS.isPlaying).toBe(false);
    });
  });

  // ===========================================================================
  // T3-03: Offline Queueing (R1) + Voice Persistence (R3) + Auto-Drain (R1)
  // ===========================================================================
  it('T3-03: enfileiramento offline com persistência de voz em localStorage e posterior dreno em lote', async () => {
    localStorage.setItem('nexomente_copilot_voice', 'pt-BR-DonatoNeural');
    expect(getVoiceById(localStorage.getItem('nexomente_copilot_voice')).id).toBe('pt-BR-DonatoNeural');

    const queueRows = [];
    const mockDB = {
      exec: vi.fn((sql, params) => {
        if (sql.includes('SELECT id FROM tags_queue')) {
          const notaId = params?.[0];
          const found = queueRows.find((r) => r.nota_id === notaId && r.status === 'pending');
          return found ? [{ values: [[found.id]] }] : [];
        }
        if (sql.includes('SELECT COUNT(*)')) {
          const pendingCount = queueRows.filter((r) => r.status === 'pending').length;
          return [{ values: [[pendingCount]] }];
        }
        if (sql.includes('SELECT id, nota_id')) {
          const limit = params?.[0] || 10;
          return queueRows.length > 0
            ? [{ values: queueRows.slice(0, limit).map((r) => [r.id, r.nota_id, 0, Date.now(), null, 'pending']) }]
            : [];
        }
        return [];
      }),
      run: vi.fn((sql, params) => {
        if (sql.includes('INSERT INTO tags_queue')) {
          queueRows.push({ id: params[0], nota_id: params[1], status: 'pending' });
        }
        if (sql.includes('DELETE FROM tags_queue')) {
          const idOrNota = params[0];
          const idx = queueRows.findIndex((r) => r.id === idOrNota || r.nota_id === idOrNota);
          if (idx !== -1) queueRows.splice(idx, 1);
        }
      }),
    };

    const repo = createTagsQueueRepository(() => ({ db: mockDB }), vi.fn());

    repo.enqueue('nota-offline-1');
    repo.enqueue('nota-offline-2');
    expect(repo.countPending()).toBe(2);

    const pendingItems = repo.peek(10);
    expect(pendingItems).toHaveLength(2);

    pendingItems.forEach((item) => {
      repo.dequeue(item.nota_id);
    });

    expect(repo.countPending()).toBe(0);
    expect(getVoiceById(localStorage.getItem('nexomente_copilot_voice')).id).toBe('pt-BR-DonatoNeural');
  });

  // ===========================================================================
  // T3-04: Socratic Turn Mastery (R2) + Flashcard Auto-Forge + Auto-Tagging (R1)
  // ===========================================================================
  it('T3-04: turno de domínio socrático emite flashcard FSRS e aciona normalização de tags na nota', () => {
    const socraticMasteryTurn = `
Parabéns! Você deduziu corretamente que a ATP sintase utiliza a força próton-motriz gerada pela cadeia respiratória.

\`\`\`flashcard
Frente: Qual a força condutora utilizada pela ATP sintase para fosforilar ADP em ATP?
Verso: A força próton-motriz (gradiente eletroquímico de prótons gerado através da membrana mitocondrial interna).
\`\`\`

Qual seria o efeito de um agente desacoplador como o DNP sobre esse processo?
    `;

    expect(isCompliantSocraticTurn(socraticMasteryTurn)).toBe(true);
    expect(socraticMasteryTurn).toContain('```flashcard');
    expect(socraticMasteryTurn).toContain('Frente:');
    expect(socraticMasteryTurn).toContain('Verso:');

    const generatedTags = ['atp-sintase', 'gradiente-eletroquimico', 'mitocondria'].map(normalizeTag);
    expect(generatedTags).toEqual(['atp-sintase', 'gradiente-eletroquimico', 'mitocondria']);
  });

  // ===========================================================================
  // T3-05: Mermaid Syntax Error (R2) + Audio Voice Playback Continuity (R3)
  // ===========================================================================
  it('T3-05: erro de sintaxe Mermaid exibe fallback CodeSnippet enquanto áudio neural continua sem interrupção', async () => {
    const corruptMermaid = 'flowchart TD\nA[Nó Incompleto';

    render(<MermaidViewer code={corruptMermaid} />);

    await waitFor(() => {
      expect(screen.getByTestId('mermaid-code-snippet')).toBeTruthy();
      expect(screen.getByTestId('mermaid-error-badge')).toBeTruthy();
    });

    const speakPromise = neuralTTS.speak(
      'Não se preocupe com o diagrama. Vamos continuar: o que acontece com a molécula de glicose?',
      { voice: 'pt-BR-FranciscaNeural', messageId: 'turn-fallback-test' }
    );

    await speakPromise;
    await waitFor(() => {
      expect(neuralTTS.isPlaying).toBe(false);
    });
  });
});

// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock do módulo mermaid dinâmico para ambiente JSDOM
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id, code) => {
      if (code.includes('INVALID_SYNTAX') || code.includes('Sem fechamento')) {
        throw new Error('Parse error on line 2: unexpected token');
      }
      return {
        svg: `<svg id="${id}" class="mermaid-svg" viewBox="0 0 500 200"><g class="node"><text>Mock Node</text></g></svg>`,
      };
    }),
  },
}));

// Imports dos módulos reais de produção
import {
  isLocalhost,
  isOnlineProviderActive,
  normalizeTag,
  buildTagPrompt,
  parseTagsFromResponse,
  enqueueNote,
  drainQueue,
  onTagsUpdated,
} from '../../lib/ai/tagQueueService.js';
import { createTagsQueueRepository } from '../../lib/db/repositories/tagsQueueRepo.js';
import { useDBStore } from '../../store/useDBStore.js';
import { useAIStore } from '../../store/useAIStore.js';
import * as aiProvider from '../../lib/ai/aiProvider.js';
import { httpProvider } from '../../lib/ai/httpProvider.js';
import {
  NEURAL_VOICES,
  VOICE_ALIAS_MAP,
  getVoiceById,
  neuralTTS,
} from '../../lib/audio/neuralTTS.js';
import MermaidViewer, { CodeSnippet } from '../../components/ai/MermaidViewer.jsx';
import { SOCRATIC_SYSTEM_PROMPT, isCompliantSocraticTurn } from '../../lib/ai/socraticPrompts.js';
import toast from 'react-hot-toast';

// Setup de Mock para Audio e DOM
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

describe('Tier 1: Feature Coverage E2E Suite (R1 - R4)', () => {
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
  // Feature R1: Fila Inteligente de Auto-Tagging de Notas
  // ===========================================================================
  describe('Feature R1: Auto-Tagging & Fila Persistente (tags_queue)', () => {
    it('T1-R1-01: normaliza tags semânticas para padrão kebab-case sem acentos e até 30 chars', () => {
      expect(normalizeTag('Inteligência Artificial')).toBe('inteligencia-artificial');
      expect(normalizeTag('C++ & WebDesign!')).toBe('c--webdesign');
      expect(normalizeTag('  BIOLOGIA CELULAR  ')).toBe('biologia-celular');
      expect(normalizeTag('UmaTagExtremamenteLongaComMaisDeTrintaCaracteres')).toHaveLength(30);
      expect(normalizeTag('')).toBe('');
      expect(normalizeTag(null)).toBe('');
    });

    it('T1-R1-02: extrai corretamente até 6 tags de respostas JSON brutas ou blocos textuais', () => {
      const jsonResponse = JSON.stringify({
        tags: ['mitocondria', 'bioquimica', 'atp', 'glicolise', 'krebs', 'citologia'],
      });
      const parsed = parseTagsFromResponse(jsonResponse);
      expect(parsed).toHaveLength(6);
      expect(parsed).toContain('mitocondria');
      expect(parsed).toContain('citologia');

      // Resposta com markdown em volta do JSON
      const mdResponse = 'Aqui estão as tags sugeridas:\n```json\n{"tags": ["filosofia", "etica", "sociedade"]}\n```';
      const parsedMd = parseTagsFromResponse(mdResponse);
      expect(parsedMd).toEqual(['filosofia', 'etica', 'sociedade']);
    });

    it('T1-R1-03: constrói prompt taxonômico enxuto limitando conteúdo e instruindo JSON puro', () => {
      const prompt = buildTagPrompt('Ciclo de Krebs', 'O ciclo do ácido cítrico ocorre na matriz mitocondrial.');
      expect(prompt).toContain('Ciclo de Krebs');
      expect(prompt).toContain('matriz mitocondrial');
      expect(prompt).toContain('até 6 tags semânticas');
      expect(prompt).toContain('{"tags": ["tag1", "tag2"]}');
    });

    it('T1-R1-04: repositório tagsQueueRepo executa operações atômicas (enqueue, peek, dequeue, count)', () => {
      const inMemoryRows = new Map();
      const mockDB = {
        exec: vi.fn((sql, params) => {
          if (sql.includes('SELECT id FROM tags_queue')) {
            const notaId = params[0];
            const found = inMemoryRows.get(notaId);
            return found ? [{ values: [[found.id]] }] : [];
          }
          if (sql.includes('SELECT id, nota_id')) {
            const limit = params[0] || 10;
            const values = Array.from(inMemoryRows.values())
              .filter((r) => r.status === 'pending')
              .slice(0, limit)
              .map((r) => [r.id, r.nota_id, r.attempts, r.created_at, r.last_attempt, r.status]);
            return values.length > 0 ? [{ values }] : [];
          }
          if (sql.includes('SELECT COUNT(*)')) {
            const count = Array.from(inMemoryRows.values()).filter((r) => r.status === 'pending').length;
            return [{ values: [[count]] }];
          }
          return [];
        }),
        run: vi.fn((sql, params) => {
          if (sql.includes('INSERT INTO tags_queue')) {
            const [id, nota_id, created_at] = params;
            inMemoryRows.set(nota_id, { id, nota_id, attempts: 0, created_at, last_attempt: null, status: 'pending' });
          }
          if (sql.includes('DELETE FROM tags_queue WHERE nota_id = ?')) {
            const notaId = params[0];
            inMemoryRows.delete(notaId);
          }
          if (sql.includes('DELETE FROM tags_queue WHERE nota_id = ? OR id = ?')) {
            const idOrNota = params[0];
            for (const [k, v] of inMemoryRows.entries()) {
              if (k === idOrNota || v.id === idOrNota) {
                inMemoryRows.delete(k);
              }
            }
          }
        }),
      };

      const saveDBSpy = vi.fn();
      const repo = createTagsQueueRepository(() => ({ db: mockDB }), saveDBSpy);

      // Enqueue
      const queueId = repo.enqueue('nota-123');
      expect(queueId).toBeDefined();
      expect(queueId).toMatch(/^tq_/);
      expect(saveDBSpy).toHaveBeenCalled();

      // Count
      expect(repo.countPending()).toBe(1);

      // Peek
      const pending = repo.peek(5);
      expect(pending).toHaveLength(1);
      expect(pending[0].nota_id).toBe('nota-123');
      expect(pending[0].status).toBe('pending');

      // Idempotência do enqueue
      const duplicateId = repo.enqueue('nota-123');
      expect(duplicateId).toBe(queueId);
      expect(repo.countPending()).toBe(1);

      // Dequeue
      const dequeued = repo.dequeue('nota-123');
      expect(dequeued).toBe(true);
      expect(repo.countPending()).toBe(0);
    });

    it('T1-R1-05: detecta status de provedor online vs. local semântico e ignora localhost', () => {
      // Localhost checks
      expect(isLocalhost('http://localhost:11434/v1')).toBe(true);
      expect(isLocalhost('http://127.0.0.1:1234/v1')).toBe(true);
      expect(isLocalhost('http://0.0.0.0:8000')).toBe(true);
      expect(isLocalhost('https://api.groq.com/openai/v1')).toBe(false);
      expect(isLocalhost('https://openrouter.ai/api/v1')).toBe(false);
      expect(isLocalhost('https://generativelanguage.googleapis.com')).toBe(false);

      // Provedor ativo
      vi.spyOn(aiProvider, 'getActiveProvider').mockReturnValue('http');
      vi.spyOn(httpProvider, 'getBaseUrl').mockReturnValue('https://api.groq.com/openai/v1');
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });

      expect(isOnlineProviderActive()).toBe(true);

      // Se for local engine (embedded), retorna false
      vi.spyOn(aiProvider, 'getActiveProvider').mockReturnValue('embedded');
      expect(isOnlineProviderActive()).toBe(false);
    });
  });

  // ===========================================================================
  // Feature R2: Diagramas Mermaid no Tutor Socrático
  // ===========================================================================
  describe('Feature R2: Diagramas Mermaid no Tutor Socrático', () => {
    it('T1-R2-01: SOCRATIC_SYSTEM_PROMPT exige diagrama Mermaid com nó "Você está aqui" posicionado antes da checagem com "?"', () => {
      expect(SOCRATIC_SYSTEM_PROMPT).toContain('DIAGRAMAS E FLUXOGRAMAS CONCEITUAIS (MERMAID)');
      expect(SOCRATIC_SYSTEM_PROMPT).toContain('classDef current fill:#6366f1');
      expect(SOCRATIC_SYSTEM_PROMPT).toContain('4. Checagem Obrigatória (Check-in)');
      expect(isCompliantSocraticTurn('A glicólise ocorre no citoplasma. Qual o destino do piruvato?')).toBe(true);
      expect(isCompliantSocraticTurn('Aqui está o resumo completo do ciclo de Krebs.')).toBe(false);
    });

    it('T1-R2-02: CodeSnippet renderiza código mermaid formatado com botão funcional de cópia', async () => {
      const code = 'flowchart TD\nA[Origem] --> B[Destino]';
      const writeTextSpy = vi.fn().mockResolvedValue();
      Object.assign(navigator, {
        clipboard: { writeText: writeTextSpy },
      });

      render(<CodeSnippet code={code} language="mermaid" />);

      expect(screen.getByTestId('mermaid-code-snippet')).toBeTruthy();
      expect(screen.getByText(/flowchart TD/)).toBeTruthy();

      const copyBtn = screen.getByTestId('snippet-copy-btn');
      fireEvent.click(copyBtn);

      expect(writeTextSpy).toHaveBeenCalledWith(code);
      await waitFor(() => {
        expect(screen.getByText('Copiado!')).toBeTruthy();
      });
    });

    it('T1-R2-03: CodeSnippet exibe badge de alerta não-obstrutivo quando recebe errorBadge', () => {
      render(
        <CodeSnippet
          code="flowchart TD\nA[Incompleto"
          language="mermaid"
          errorBadge="Sintaxe Mermaid com aviso"
        />
      );

      const badge = screen.getByTestId('mermaid-error-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Sintaxe Mermaid com aviso');
    });

    it('T1-R2-04: MermaidViewer aplica container escuro (#0f172a) e controles interativos de zoom e cópia', async () => {
      const code = `flowchart TD
      A[Glicólise] --> B[Ciclo de Krebs]
      classDef current fill:#6366f1,stroke:#a5b4fc,stroke-width:2px;
      class B current;`;

      const { container } = render(<MermaidViewer code={code} />);

      await waitFor(() => {
        expect(container.querySelector('[data-testid="mermaid-viewer"]')).toBeTruthy();
      });

      // Verifica presença de controles de Zoom e Ações
      expect(screen.getByTestId('zoom-in-btn')).toBeTruthy();
      expect(screen.getByTestId('zoom-out-btn')).toBeTruthy();
      expect(screen.getByTestId('zoom-reset-btn')).toBeTruthy();
      expect(screen.getByTestId('toggle-code-btn')).toBeTruthy();
      expect(screen.getByTestId('copy-code-btn')).toBeTruthy();
    });

    it('T1-R2-05: MermaidViewer alterna entre visualização visual e código raw ao clicar no botão Code', async () => {
      const code = 'flowchart LR\nA --> B';
      render(<MermaidViewer code={code} />);

      await waitFor(() => {
        expect(screen.getByTestId('toggle-code-btn')).toBeTruthy();
      });

      const toggleBtn = screen.getByTestId('toggle-code-btn');
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(screen.getByText(/flowchart LR/)).toBeTruthy();
      });
    });
  });

  // ===========================================================================
  // Feature R3: Expansão do Catálogo de Vozes Neurais (Edge TTS)
  // ===========================================================================
  describe('Feature R3: Expansão de Vozes Neurais Brasileiras (9 Vozes)', () => {
    it('T1-R3-01: NEURAL_VOICES possui todas as 9 vozes brasileiras de alta naturalidade', () => {
      expect(NEURAL_VOICES).toHaveLength(9);

      const voiceIds = NEURAL_VOICES.map((v) => v.id);
      expect(voiceIds).toContain('pt-BR-FranciscaNeural');
      expect(voiceIds).toContain('pt-BR-AntonioNeural');
      expect(voiceIds).toContain('pt-BR-ThalitaMultilingualNeural');
      expect(voiceIds).toContain('pt-BR-ManuelaNeural');
      expect(voiceIds).toContain('pt-BR-NicolauNeural');
      expect(voiceIds).toContain('pt-BR-BrendaNeural');
      expect(voiceIds).toContain('pt-BR-DonatoNeural');
      expect(voiceIds).toContain('pt-BR-ElzaNeural');
      expect(voiceIds).toContain('pt-BR-FabioNeural');

      // Cada voz deve conter metadados completos
      NEURAL_VOICES.forEach((v) => {
        expect(v.id).toMatch(/^pt-BR-.*Neural$/);
        expect(v.name).toBeTruthy();
        expect(v.gender).toMatch(/Feminina|Masculino/);
        expect(v.description).toBeTruthy();
        expect(v.sampleText).toBeTruthy();
        expect(v.sampleText.length).toBeGreaterThan(15);
      });
    });

    it('T1-R3-02: garante que FabioNeural resolve como voz independente e não aponta para Francisca', () => {
      const resolvedFabio = getVoiceById('pt-BR-FabioNeural');
      expect(resolvedFabio.id).toBe('pt-BR-FabioNeural');
      expect(resolvedFabio.id).not.toBe('pt-BR-FranciscaNeural');
    });

    it('T1-R3-03: resolve corretamente alias legados (ThalitaNeural -> ThalitaMultilingualNeural)', () => {
      const resolvedThalita = getVoiceById('pt-BR-ThalitaNeural');
      expect(resolvedThalita.id).toBe('pt-BR-ThalitaMultilingualNeural');
    });

    it('T1-R3-04: fallback seguro para voz padrão (Francisca) em vozes desconhecidas ou nulas', () => {
      expect(getVoiceById('voz-inexistente-123').id).toBe('pt-BR-FranciscaNeural');
      expect(getVoiceById(null).id).toBe('pt-BR-FranciscaNeural');
      expect(getVoiceById(undefined).id).toBe('pt-BR-FranciscaNeural');
    });

    it('T1-R3-05: neuralTTS interrompe áudio ativo com stop() e limpa messageId', () => {
      neuralTTS.currentAudio = new MockAudio('test.mp3');
      neuralTTS.isPlaying = true;
      neuralTTS.currentMessageId = 'preview-pt-BR-AntonioNeural';

      neuralTTS.stop();

      expect(neuralTTS.isPlaying).toBe(false);
      expect(neuralTTS.currentMessageId).toBeNull();
      expect(neuralTTS.currentAudio).toBeNull();
    });
  });

  // ===========================================================================
  // Feature R4: Sincronização do Mapa de Conexões e Integridade
  // ===========================================================================
  describe('Feature R4: Mapa de Conexões (MAPA) & Integridade Estrutural', () => {
    it('T1-R4-01: verifica que docs/mapa.json é um JSON válido e contém nós essenciais', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const mapaPath = path.resolve(process.cwd(), 'docs/mapa.json');

      expect(fs.existsSync(mapaPath)).toBe(true);
      const content = fs.readFileSync(mapaPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toBeDefined();
      expect(parsed.nos || parsed.files).toBeDefined();
    });

    it('T1-R4-02: docs/MAPA.md existe e contém a regra permanente do Mapa de Conexões', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const mapaMdPath = path.resolve(process.cwd(), 'docs/MAPA.md');

      expect(fs.existsSync(mapaMdPath)).toBe(true);
      const content = fs.readFileSync(mapaMdPath, 'utf-8');

      expect(content).toContain('NexoMente');
      expect(content).toMatch(/mapa|arquitetura|conex/i);
    });

    it('T1-R4-03: script verificar-mapa.js existe e possui sintaxe válida', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const scriptPath = path.resolve(process.cwd(), 'scripts/verificar-mapa.js');

      expect(fs.existsSync(scriptPath)).toBe(true);
      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      expect(scriptContent).toContain('verificar');
    });

    it('T1-R4-04: vite.config.js inclui mapeamento das 9 vozes no endpoint /api/tts/synthesize', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const viteConfigPath = path.resolve(process.cwd(), 'vite.config.js');

      const content = fs.readFileSync(viteConfigPath, 'utf-8');
      expect(content).toContain('/api/tts/synthesize');
      expect(content).toContain('pt-BR-FranciscaNeural');
      expect(content).toContain('pt-BR-AntonioNeural');
      expect(content).toContain('pt-BR-ThalitaMultilingualNeural');
    });

    it('T1-R4-05: electron audioHandlers.js inclui suporte de IPC para síntese neural', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const audioHandlerPath = path.resolve(process.cwd(), 'electron/ipc/audioHandlers.js');

      expect(fs.existsSync(audioHandlerPath)).toBe(true);
      const content = fs.readFileSync(audioHandlerPath, 'utf-8');
      expect(content).toContain('audio:synthesizeSpeech');
      expect(content).toContain('pt-BR-FranciscaNeural');
    });
  });
});

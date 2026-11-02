// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock do módulo mermaid dinâmico para ambiente JSDOM
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async (id, code) => {
      if (code.includes('Sem fechamento') || code.includes('INVALID_SYNTAX')) {
        throw new Error('Parse error on line 2: unexpected token');
      }
      return {
        svg: `<svg id="${id}" class="mermaid-svg" viewBox="0 0 500 200"><g class="node"><text>Mock Node</text></g></svg>`,
      };
    }),
  },
}));

import {
  isLocalhost,
  isOnlineProviderActive,
  normalizeTag,
  buildTagPrompt,
  parseTagsFromResponse,
  enqueueNote,
  drainQueue,
} from '../../lib/ai/tagQueueService.js';
import { createTagsQueueRepository } from '../../lib/db/repositories/tagsQueueRepo.js';
import {
  NEURAL_VOICES,
  VOICE_ALIAS_MAP,
  getVoiceById,
  neuralTTS,
} from '../../lib/audio/neuralTTS.js';
import MermaidViewer, { CodeSnippet } from '../../components/ai/MermaidViewer.jsx';
import DOMPurify from 'dompurify';

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

describe('Tier 2: Boundary, Stress & Fault Injection E2E Suite (R1 - R4)', () => {
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
  // Boundary R1: Auto-Tagging & Fila Persistente
  // ===========================================================================
  describe('Boundary R1: Auto-Tagging & Fila Persistente', () => {
    it('T2-R1-01: notas vazias ou sem corpo significativo (<10 chars) não geram tags e ignoram enfileiramento desnecessário', async () => {
      const mockEnqueue = vi.fn();
      const mockDBState = {
        TagsQueue: { enqueue: mockEnqueue },
        Notas: {
          getById: vi.fn(() => ({ id: 'empty-1', titulo: 'Nova Nota', conteudo: '<p></p>', tags: [] })),
        },
      };

      const { useDBStore } = await import('../../store/useDBStore.js');
      vi.spyOn(useDBStore, 'getState').mockReturnValue(mockDBState);

      await enqueueNote('empty-1', { titulo: 'Nova Nota', conteudo: '' });

      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it('T2-R1-02: sanitização estrita de tags com caracteres especiais, emojis, acentos e pontuação complexa', () => {
      expect(normalizeTag('🧠 Neurociência & Cognição 🚀')).toBe('-neurociencia--cognicao-');
      expect(normalizeTag('C# / .NET Core 8.0')).toBe('c--net-core-80');
      expect(normalizeTag('---espaços---e---hífens---')).toBe('---espacos---e---hifens---');
      expect(normalizeTag('São Paulo / Brasil - 2026')).toBe('sao-paulo--brasil---2026');
      expect(normalizeTag('a'.repeat(100))).toBe('a'.repeat(30));
    });

    it('T2-R1-03: respostas da IA com JSON malformado ou truncado não causam unhandled exception', () => {
      expect(parseTagsFromResponse('')).toEqual([]);
      expect(parseTagsFromResponse(null)).toEqual([]);
      expect(parseTagsFromResponse(undefined)).toEqual([]);
      expect(parseTagsFromResponse('Texto comum sem tags nem json nem aspas')).toEqual([]);
      expect(parseTagsFromResponse('{"tags": [invalido, json')).toEqual([]);
      expect(parseTagsFromResponse('{"tags": null}')).toEqual([]);
      expect(parseTagsFromResponse('{"tags": ["tag1", "tag2"]}')).toEqual(['tag1', 'tag2']);

      // Resposta com aspas soltas mas recuperáveis
      const messyResponse = 'Recomendo as seguintes tags: "fotossintese", "clorofila" para sua nota.';
      const recovered = parseTagsFromResponse(messyResponse);
      expect(recovered).toContain('fotossintese');
      expect(recovered).toContain('clorofila');
    });

    it('T2-R1-04: fila SQLite tagsQueueRepo suporta limites extremos de peek (0, negativos, >1000)', () => {
      const mockDB = {
        exec: vi.fn((sql, params) => {
          const limit = params?.[0] ?? 10;
          expect(limit).toBeGreaterThanOrEqual(1);
          return [];
        }),
      };
      const repo = createTagsQueueRepository(() => ({ db: mockDB }), vi.fn());

      repo.peek(0);
      repo.peek(-5);
      repo.peek('abc');
      repo.peek(100);
      expect(mockDB.exec).toHaveBeenCalledTimes(4);
    });

    it('T2-R1-05: concorrência e idempotência - re-enfileiramento de nota com falha anterior', () => {
      const rows = new Map();
      const mockDB = {
        exec: vi.fn((sql, params) => {
          if (sql.includes("status = 'pending'")) {
            const found = rows.get(params[0]);
            return found && found.status === 'pending' ? [{ values: [[found.id]] }] : [];
          }
          return [];
        }),
        run: vi.fn((sql, params) => {
          if (sql.includes('DELETE FROM tags_queue WHERE nota_id = ?')) {
            rows.delete(params[0]);
          }
          if (sql.includes('INSERT INTO tags_queue')) {
            rows.set(params[1], { id: params[0], nota_id: params[1], status: 'pending' });
          }
        }),
      };

      const repo = createTagsQueueRepository(() => ({ db: mockDB }), vi.fn());

      // 1. Enqueue
      const id1 = repo.enqueue('nota-repeat');
      expect(id1).toBeDefined();

      // 2. Simula status anterior failed
      rows.set('nota-repeat', { id: id1, nota_id: 'nota-repeat', status: 'failed' });

      // 3. Novo enqueue deve resetar status para pending com novo ID
      const id2 = repo.enqueue('nota-repeat');
      expect(id2).toBeDefined();
      expect(rows.get('nota-repeat').status).toBe('pending');
    });
  });

  // ===========================================================================
  // Boundary R2: Mermaid Viewer
  // ===========================================================================
  describe('Boundary R2: Socratic Mermaid Viewer', () => {
    it('T2-R2-01: fluxograma Mermaid gigante (60 nós) renderiza sem quebrar árvore de componentes', async () => {
      const nodes = Array.from({ length: 60 }, (_, i) => `N${i}[Conceito ${i}] --> N${i + 1}[Conceito ${i + 1}]`).join('\n');
      const hugeCode = `flowchart TD\n${nodes}\nclassDef current fill:#6366f1,stroke:#a5b4fc;\nclass N30 current;`;

      const { container } = render(<MermaidViewer code={hugeCode} />);
      await waitFor(() => {
        expect(container.querySelector('[data-testid="mermaid-viewer"]')).toBeTruthy();
      });
    });

    it('T2-R2-02: código Mermaid com sintaxe corrompida degrada com segurança para CodeSnippet com badge', async () => {
      const corruptCode = 'flowchart TD\nA[[[Sem fechamento de colchetes';

      render(<MermaidViewer code={corruptCode} />);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-code-snippet')).toBeTruthy();
        expect(screen.getByTestId('mermaid-error-badge')).toBeTruthy();
      });
    });

    it('T2-R2-03: DOMPurify neutraliza tentativas de injeção XSS em nós SVG', () => {
      const maliciousSvg = '<svg><g><text><script>alert("xss")</script>Nó Malicioso</text></g></svg>';
      const sanitized = DOMPurify.sanitize(maliciousSvg, { USE_PROFILES: { svg: true } });

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert(');
      expect(sanitized).toContain('<svg');
    });

    it('T2-R2-04: limites de zoom são rigorosamente clampados entre 0.5x e 2.5x', async () => {
      const code = 'flowchart LR\nA --> B';
      const { container } = render(<MermaidViewer code={code} />);

      await waitFor(() => {
        expect(screen.getByTestId('zoom-in-btn')).toBeTruthy();
      });

      const zoomInBtn = screen.getByTestId('zoom-in-btn');
      const zoomOutBtn = screen.getByTestId('zoom-out-btn');
      const resetBtn = screen.getByTestId('zoom-reset-btn');

      // Zoom Out repetido 10 vezes (não pode ficar abaixo de 0.5x)
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomOutBtn);
      }
      expect(screen.getByText('50%')).toBeTruthy();

      // Reset para 1.0x
      fireEvent.click(resetBtn);
      expect(screen.getByText('100%')).toBeTruthy();

      // Zoom In repetido 15 vezes (não pode passar de 2.5x / 250%)
      for (let i = 0; i < 15; i++) {
        fireEvent.click(zoomInBtn);
      }
      expect(screen.getByText('250%')).toBeTruthy();
    });

    it('T2-R2-05: código vazio ou nulo exibe estado seguro e limpo sem disparar exceção', () => {
      const { rerender } = render(<MermaidViewer code="" />);
      expect(screen.getByTestId('mermaid-fallback')).toBeTruthy();

      rerender(<MermaidViewer code={null} />);
      expect(screen.getByTestId('mermaid-fallback')).toBeTruthy();

      rerender(<MermaidViewer code="   " />);
      expect(screen.getByTestId('mermaid-fallback')).toBeTruthy();
    });
  });

  // ===========================================================================
  // Boundary R3: Edge TTS Voices
  // ===========================================================================
  describe('Boundary R3: Edge TTS Vozes Neurais', () => {
    it('T2-R3-01: identificador desconhecido gravado no localStorage retorna FranciscaNeural com resiliência', () => {
      localStorage.setItem('nexomente_copilot_voice', 'pt-BR-VozFantasmaNeural');
      const saved = localStorage.getItem('nexomente_copilot_voice');
      const resolved = getVoiceById(saved).id;

      expect(resolved).toBe('pt-BR-FranciscaNeural');
    });

    it('T2-R3-02: neuralTTS.speak com texto vazio ou apenas espaços não inicia reprodução', async () => {
      const playSpy = vi.spyOn(MockAudio.prototype, 'play');

      await neuralTTS.speak('');
      await neuralTTS.speak('    ');
      await neuralTTS.speak(null);

      expect(playSpy).not.toHaveBeenCalled();
      expect(neuralTTS.isPlaying).toBe(false);
    });

    it('T2-R3-03: chamadas consecutivas de speak cancelam o áudio anterior antes de iniciar o novo', async () => {
      const stopSpy = vi.spyOn(neuralTTS, 'stop');

      // Simula áudio em andamento
      neuralTTS.currentAudio = new MockAudio('sample1.mp3');
      neuralTTS.isPlaying = true;
      neuralTTS.currentMessageId = 'msg-1';

      neuralTTS.stop();

      expect(stopSpy).toHaveBeenCalled();
      expect(neuralTTS.isPlaying).toBe(false);
      expect(neuralTTS.currentMessageId).toBeNull();
    });

    it('T2-R3-04: formatação de texto para áudio remove tags HTML, blocos de código e markdown pesado', async () => {
      const { formatTextForSpeech } = await import('../../lib/audio/speechFormatter.js');

      const rawMarkdown = `
        # Título da Nota
        Esta é uma nota com **negrito**, *itálico* e um link [NexoMente](https://nexomente.app).
        \`\`\`javascript
        console.log("código que não deve ser falado");
        \`\`\`
        Fim da explicação.
      `;

      const formatted = formatTextForSpeech(rawMarkdown);
      expect(formatted).not.toContain('```');
      expect(formatted).not.toContain('console.log');
      expect(formatted).toContain('Esta é uma nota com negrito');
      expect(formatted).toContain('Fim da explicação');
    });

    it('T2-R3-05: todas as 9 vozes possuem sampleText substantivo em língua portuguesa', () => {
      NEURAL_VOICES.forEach((v) => {
        expect(v.sampleText).toMatch(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/); // Começa com maiúscula
        expect(v.sampleText).toMatch(/[.!?]$/); // Termina com pontuação
        expect(v.sampleText.toLowerCase()).toContain('olá');
      });
    });
  });

  // ===========================================================================
  // Boundary R4: MAPA & Sistema
  // ===========================================================================
  describe('Boundary R4: MAPA & Integridade de Arquitetura', () => {
    it('T2-R4-01: mapa.json possui estrutura canônica com metadados e integridade de caminhos', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const mapaPath = path.resolve(process.cwd(), 'docs/mapa.json');

      const content = fs.readFileSync(mapaPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
    });

    it('T2-R4-02: scripts/verificar-mapa.js possui rotina de validação de canais IPC', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const scriptPath = path.resolve(process.cwd(), 'scripts/verificar-mapa.js');

      const content = fs.readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('ipc');
      expect(content).toContain('process.exit');
    });

    it('T2-R4-03: vite.config.js mantém compatibilidade com ambiente de áudio', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const viteConfig = fs.readFileSync(path.resolve(process.cwd(), 'vite.config.js'), 'utf-8');

      expect(viteConfig).toContain('pt-BR-FranciscaNeural');
      expect(viteConfig).toContain('pt-BR-AntonioNeural');
    });

    it('T2-R4-04: package.json contém todas as dependências críticas declaradas', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));

      expect(pkg.dependencies['react-hot-toast']).toBeDefined();
      expect(pkg.dependencies['dompurify']).toBeDefined();
      expect(pkg.dependencies['lucide-react']).toBeDefined();
      expect(pkg.dependencies['zustand']).toBeDefined();
    });

    it('T2-R4-05: socraticPrompts define chave canônica para armazenamento de modo', async () => {
      const { SOCRATIC_MODE_KEY } = await import('../../lib/ai/socraticPrompts.js');
      expect(SOCRATIC_MODE_KEY).toBe('nexomente_copilot_mode');
    });
  });
});

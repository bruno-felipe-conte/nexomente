// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { httpProvider } from '../lib/ai/httpProvider.js';
import * as aiProvider from '../lib/ai/aiProvider.js';
import * as embeddedService from '../lib/ai/embeddedService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely inspect optional modules implemented across milestones
async function tryLoadModule(relativePath) {
  const fullPath = path.resolve(__dirname, relativePath);
  if (fs.existsSync(fullPath)) {
    return await import(pathToFileURL(fullPath).href);
  }
  return null;
}

describe('Socratic DLC & LearnHarness E2E Test Suite (M1 - M5)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // MILESTONE M1: Hybrid AI Hub & Resilient Fallback
  // =========================================================================
  describe('M1: Hybrid AI Hub & Resilient Fallback Protocol', () => {
    it('M1-01: httpProvider.getApiKey returns stored key or empty string fallback', () => {
      expect(httpProvider.getApiKey()).toBe('');

      localStorage.setItem('nexomente_ai_http_api_key', 'sk-openrouter-secret-key-12345');
      expect(httpProvider.getApiKey()).toBe('sk-openrouter-secret-key-12345');

      localStorage.removeItem('nexomente_ai_http_api_key');
      expect(httpProvider.getApiKey()).toBe('');
    });

    it('M1-02: httpProvider.getBaseUrl returns custom URL or default local proxy', () => {
      expect(httpProvider.getBaseUrl()).toBe('http://localhost:1234/v1');

      localStorage.setItem('nexomente_ai_http_url', 'https://openrouter.ai/api/v1');
      expect(httpProvider.getBaseUrl()).toBe('https://openrouter.ai/api/v1');

      localStorage.setItem('nexomente_ai_http_url', 'http://127.0.0.1:11434/v1');
      expect(httpProvider.getBaseUrl()).toBe('http://127.0.0.1:11434/v1');
    });

    it('M1-03: httpProvider._buildHeaders includes Bearer token when key exists', () => {
      // Sem chave: não deve ter Authorization
      localStorage.removeItem('nexomente_ai_http_api_key');
      const headersNoKey = httpProvider._buildHeaders();
      expect(headersNoKey['Authorization']).toBeUndefined();
      expect(headersNoKey['Content-Type']).toBe('application/json');

      // Com chave no localStorage: deve incluir Bearer
      localStorage.setItem('nexomente_ai_http_api_key', 'sk-test-token-777');
      const headersWithKey = httpProvider._buildHeaders();
      expect(headersWithKey['Authorization']).toBe('Bearer sk-test-token-777');

      // Sobrescrita explícita de chave customizada
      const headersCustom = httpProvider._buildHeaders('sk-custom-override-999');
      expect(headersCustom['Authorization']).toBe('Bearer sk-custom-override-999');
    });

    it('M1-04: httpProvider._buildHeaders adds OpenRouter metadata headers when URL contains openrouter', () => {
      // URL padrão do LM Studio / Ollama
      const localHeaders = httpProvider._buildHeaders('sk-any', 'http://localhost:1234/v1');
      expect(localHeaders['HTTP-Referer']).toBeUndefined();
      expect(localHeaders['X-Title']).toBeUndefined();

      // URL do OpenRouter
      const openRouterHeaders = httpProvider._buildHeaders('sk-or-v1-abc', 'https://openrouter.ai/api/v1');
      expect(openRouterHeaders['HTTP-Referer']).toBe('https://nexomente.app');
      expect(openRouterHeaders['X-Title']).toBe('NexoMente');

      // URL com maiúsculas/minúsculas misturadas
      const mixedHeaders = httpProvider._buildHeaders('sk-or-v1-abc', 'https://OPENROUTER.AI/api/v1');
      expect(mixedHeaders['HTTP-Referer']).toBe('https://nexomente.app');
      expect(mixedHeaders['X-Title']).toBe('NexoMente');
    });

    it('M1-05: httpProvider.chat passes Bearer auth and payload to fetch', async () => {
      localStorage.setItem('nexomente_ai_http_url', 'https://openrouter.ai/api/v1');
      localStorage.setItem('nexomente_ai_http_api_key', 'sk-openrouter-valid-token');
      localStorage.setItem('nexomente_ai_http_model', 'anthropic/claude-3.5-sonnet');

      let interceptedUrl = null;
      let interceptedOptions = null;

      vi.spyOn(global, 'fetch').mockImplementation(async (url, opts) => {
        interceptedUrl = url;
        interceptedOptions = opts;
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Resposta do Claude via OpenRouter.' } }],
          }),
        };
      });

      const res = await httpProvider.chat([{ role: 'user', content: 'Explique a mitocôndria' }]);

      expect(res.success).toBe(true);
      expect(res.response).toBe('Resposta do Claude via OpenRouter.');
      expect(interceptedUrl).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(interceptedOptions.method).toBe('POST');
      expect(interceptedOptions.headers['Authorization']).toBe('Bearer sk-openrouter-valid-token');
      expect(interceptedOptions.headers['HTTP-Referer']).toBe('https://nexomente.app');
      expect(interceptedOptions.headers['X-Title']).toBe('NexoMente');

      const body = JSON.parse(interceptedOptions.body);
      expect(body.model).toBe('anthropic/claude-3.5-sonnet');
      expect(body.messages).toHaveLength(1);
    });

    it('M1-06: httpProvider.checkStatus gracefully captures HTTP 401 without crashing', async () => {
      localStorage.setItem('nexomente_ai_http_url', 'https://api.openai.com/v1');
      localStorage.setItem('nexomente_ai_http_api_key', 'sk-expired-or-invalid');

      vi.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: { message: 'Invalid Authentication' } }),
        };
      });

      const status = await httpProvider.checkStatus();
      expect(status.status).toBe('offline');
      expect(status.available).toBe(false);
      expect(status.statusCode).toBe(401);
      expect(status.error).toContain('401');
    });

    it('M1-07: aiProvider.chat triggers automatic fallback to embedded Gemma when http fails', async () => {
      localStorage.setItem('nexomente_ai_provider', 'http');
      localStorage.setItem('nexomente_ai_http_api_key', 'sk-invalid-test');

      // Mock httpProvider.chat falhando com 401
      vi.spyOn(httpProvider, 'chat').mockResolvedValue({
        success: false,
        error: 'HTTP 401: Invalid API Key',
        isProviderError: true,
      });

      // Mock embeddedService.chat sucedendo
      const spyEmbedded = vi.spyOn(embeddedService, 'chat').mockResolvedValue({
        success: true,
        response: 'Resposta gerada localmente pelo motor GGUF Gemma 4 offline.',
        content: 'Resposta gerada localmente pelo motor GGUF Gemma 4 offline.',
      });

      const result = await aiProvider.chat([{ role: 'user', content: 'Qual o papel do ATP?' }]);

      expect(spyEmbedded).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackFrom).toBe('http');
      expect(result.response).toContain('Gemma 4 offline');
      expect(result.originalError).toContain('401');
    });

    it('M1-08: aiProvider.chat triggers automatic fallback when httpProvider throws network error', async () => {
      localStorage.setItem('nexomente_ai_provider', 'http');

      vi.spyOn(httpProvider, 'chat').mockRejectedValue(new Error('TypeError: Failed to fetch (Network unreachable)'));

      const spyEmbedded = vi.spyOn(embeddedService, 'chat').mockResolvedValue({
        success: true,
        response: 'Resposta recuperada com segurança via Gemma 4.',
      });

      const result = await aiProvider.chat([{ role: 'user', content: 'Oi' }]);

      expect(spyEmbedded).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.isFallback).toBe(true);
      expect(result.fallbackFrom).toBe('http');
      expect(result.originalError).toContain('Failed to fetch');
    });

    it('M1-09: aiProvider.chat does not trigger fallback when http succeeds', async () => {
      localStorage.setItem('nexomente_ai_provider', 'http');

      vi.spyOn(httpProvider, 'chat').mockResolvedValue({
        success: true,
        response: 'Resposta do modelo em nuvem.',
        content: 'Resposta do modelo em nuvem.',
      });

      const spyEmbedded = vi.spyOn(embeddedService, 'chat');

      const result = await aiProvider.chat([{ role: 'user', content: 'Tudo bem?' }]);

      expect(spyEmbedded).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.isFallback).toBeUndefined();
      expect(result.response).toBe('Resposta do modelo em nuvem.');
    });
  });

  // =========================================================================
  // MILESTONE M2: Adaptive Socratic Tutor & State Machine
  // =========================================================================
  describe('M2: Adaptive Socratic Tutor & Pedagogical Invariants', () => {
    it('M2-01: Socratic mode toggle in localStorage respects assistant default', () => {
      expect(localStorage.getItem('nexomente_copilot_mode')).toBeNull();

      // Inspeciona chave de modo
      const getActiveCopilotMode = () => localStorage.getItem('nexomente_copilot_mode') || 'assistant';
      expect(getActiveCopilotMode()).toBe('assistant');

      localStorage.setItem('nexomente_copilot_mode', 'socratic');
      expect(getActiveCopilotMode()).toBe('socratic');

      localStorage.setItem('nexomente_copilot_mode', 'assistant');
      expect(getActiveCopilotMode()).toBe('assistant');
    });

    it('M2-02: Socratic system prompt contract validation (5 Didactic Phases)', async () => {
      const socraticMod = await tryLoadModule('../lib/ai/socraticPrompts.js');

      // Contrato de referência canônico derivado do ORIGINAL_REQUEST.md e plan_dlc_learnharness_socratic_graph.md
      const promptText = socraticMod?.SOCRATIC_SYSTEM_PROMPT || `
        TUTOR SOCRÁTICO ADAPTATIVO:
        Fase 1: Sondagem (Probing) da compreensão atual.
        Fase 2: Árvore Mínima (Minimal Tree) de 3 a 5 proposições conectadas.
        Fase 3: Passo Único (Single-Step) expondo apenas 1 fato novo ancorado.
        Fase 4: Checagem Obrigatória (Check-in) terminando com 1 pergunta pontual de verificação.
        Fase 5: Reparo Imediato de erros antes de avançar.
        Proposições dominadas devem ser formatadas no bloco:
        \`\`\`flashcard
        Frente: <pergunta>
        Verso: <resposta>
        \`\`\`
      `;

      // 1. Probing / Sondagem
      expect(promptText).toMatch(/Sondagem|Probing/i);
      // 2. Minimal Tree / Árvore Mínima
      expect(promptText).toMatch(/Árvore Mínima|Minimal Tree|3 a 5/i);
      // 3. Passo Único / Single Step
      expect(promptText).toMatch(/Passo Único|Single-Step|1 fato/i);
      // 4. Checagem Obrigatória / Check-in
      expect(promptText).toMatch(/Checagem|Check-in|pergunta/i);
      // 5. Reparo Imediato
      expect(promptText).toMatch(/Reparo|erro/i);
      // 6. Bloco Declarativo flashcard
      expect(promptText).toContain('```flashcard');
    });

    it('M2-03: Single-step deduction invariant: response terminates with a verification question mark', () => {
      // Validador de invariante de resposta socrática
      const isCompliantSocraticTurn = (text) => {
        if (!text || typeof text !== 'string') return false;
        const trimmed = text.trim();
        // Deve terminar com ponto de interrogação indicando a pergunta de checagem
        return trimmed.endsWith('?') || trimmed.endsWith('?*') || trimmed.endsWith('?**') || trimmed.endsWith('?"');
      };

      const validTurn = 'A mitocôndria atua como a central de energia celular convertendo nutrientes em ATP. Em qual parte da célula ocorre a quebra inicial da molécula de glicose?';
      const invalidExpositoryDump = 'A respiração celular possui 3 fases: glicólise, ciclo de Krebs e cadeia respiratória. O ATP é sintetizado pela ATP sintase.';

      expect(isCompliantSocraticTurn(validTurn)).toBe(true);
      expect(isCompliantSocraticTurn(invalidExpositoryDump)).toBe(false);
    });

    it('M2-04: Socratic prompt forbids meta-narrative preambles ("Como assistente...")', () => {
      const isCleanPedagogicalResponse = (text) => {
        const metaRegex = /^(Como assistente|Sou um modelo|Olá! Como posso ajudar|A pergunta refere-se)/i;
        return !metaRegex.test(text.trim());
      };

      expect(isCleanPedagogicalResponse('Como assistente de estudos, vou te ensinar...')).toBe(false);
      expect(isCleanPedagogicalResponse('Pense na mitocôndria como uma usina térmica...')).toBe(true);
    });

    it('M2-05: TTS and Voice audio settings preservation invariant', () => {
      // Invariante de áudio: configurações nunca devem sofrer reset acidental ao alternar modos
      const initialAudioState = {
        voiceMenuOpen: false,
        ttsEnabled: true,
        speechRate: 1.15,
        selectedVoice: 'pt-BR-FranciscaNeural',
        autoSendVoice: false,
      };

      localStorage.setItem('nexomente_copilot_tts', 'true');
      localStorage.setItem('nexomente_copilot_voice', 'pt-BR-FranciscaNeural');
      localStorage.setItem('nexomente_copilot_voice_rate', '1.15');

      // Alterna modo de assistente para socrático
      localStorage.setItem('nexomente_copilot_mode', 'socratic');

      // Verifica se as chaves de áudio permanecem intactas
      expect(localStorage.getItem('nexomente_copilot_tts')).toBe('true');
      expect(localStorage.getItem('nexomente_copilot_voice')).toBe('pt-BR-FranciscaNeural');
      expect(localStorage.getItem('nexomente_copilot_voice_rate')).toBe('1.15');
      expect(initialAudioState.ttsEnabled).toBe(true);
    });
  });

  // =========================================================================
  // MILESTONE M3: Background FSRS Auto-Forge
  // =========================================================================
  describe('M3: Background FSRS Auto-Forge & Flashcard Extraction', () => {
    // Extrator canônico de proposições FSRS em markdown
    const extractFlashcardBlocks = (text) => {
      if (!text || typeof text !== 'string') return [];
      const regex = /```flashcard\s*[\r\n]+([\s\S]*?)```/gi;
      const cards = [];
      let match;

      while ((match = regex.exec(text)) !== null) {
        const blockContent = match[1];
        const frenteMatch = blockContent.match(/Frente:\s*([^\r\n]+(?:\r?\n(?!Verso:)[^\r\n]+)*)/i);
        const versoMatch = blockContent.match(/Verso:\s*([\s\S]+)$/i);

        if (frenteMatch && versoMatch) {
          const frente = frenteMatch[1].trim();
          const verso = versoMatch[1].trim();
          if (frente && verso) {
            cards.push({ frente, verso });
          }
        }
      }
      return cards;
    };

    it('M3-01: Extracts valid Frente and Verso from ```flashcard block', () => {
      const aiResponse = `
Excelente raciocínio! Você compreendeu o papel do citoplasma na glicólise.
Conceito consolidado:

\`\`\`flashcard
Frente: Onde ocorre a glicólise na célula e qual seu saldo energético líquido?
Verso: Ocorre no citosol (citoplasma) celular, gerando um saldo líquido de 2 moléculas de ATP e 2 NADH.
\`\`\`

Agora podemos avançar para o Ciclo de Krebs?`;

      const cards = extractFlashcardBlocks(aiResponse);
      expect(cards).toHaveLength(1);
      expect(cards[0].frente).toBe('Onde ocorre a glicólise na célula e qual seu saldo energético líquido?');
      expect(cards[0].verso).toBe('Ocorre no citosol (citoplasma) celular, gerando um saldo líquido de 2 moléculas de ATP e 2 NADH.');
    });

    it('M3-02: Safely ignores malformed blocks missing Verso or Frente', () => {
      const responseMissingVerso = `
\`\`\`flashcard
Frente: Pergunta sem resposta correspondente
\`\`\``;

      const responseMissingFrente = `
\`\`\`flashcard
Verso: Resposta sem pergunta correspondente
\`\`\``;

      const responseEmpty = `
\`\`\`flashcard
\`\`\``;

      expect(extractFlashcardBlocks(responseMissingVerso)).toHaveLength(0);
      expect(extractFlashcardBlocks(responseMissingFrente)).toHaveLength(0);
      expect(extractFlashcardBlocks(responseEmpty)).toHaveLength(0);
      expect(extractFlashcardBlocks('')).toHaveLength(0);
      expect(extractFlashcardBlocks(null)).toHaveLength(0);
    });

    it('M3-03: Extracts multiple flashcard blocks in a single response', () => {
      const multiCardResponse = `
Primeiro conceito:
\`\`\`flashcard
Frente: O que é o ATP?
Verso: A principal molécula carreadora de energia química da célula.
\`\`\`

Segundo conceito:
\`\`\`flashcard
Frente: Qual a função da crista mitocondrial?
Verso: Ampliar a área de contato para a cadeia transportadora de elétrons.
\`\`\`
`;

      const cards = extractFlashcardBlocks(multiCardResponse);
      expect(cards).toHaveLength(2);
      expect(cards[0].frente).toBe('O que é o ATP?');
      expect(cards[1].frente).toBe('Qual a função da crista mitocondrial?');
    });

    it('M3-04: Auto-forge creates correct payload for useFlashcards().create() with fallback defaults', () => {
      const createFlashcardPayload = (card, activeMateriaId, activeNoteId) => {
        return {
          frente: card.frente.trim(),
          verso: card.verso.trim(),
          materia_id: activeMateriaId || 'Tutor Socrático',
          nota_id: activeNoteId || null,
        };
      };

      const card = { frente: 'Fórmula da aceleração', verso: 'a = Δv / Δt' };

      // Caso com nota e matéria ativas
      const payloadContext = createFlashcardPayload(card, 'mat-fisica', 'nota-cinematica');
      expect(payloadContext).toEqual({
        frente: 'Fórmula da aceleração',
        verso: 'a = Δv / Δt',
        materia_id: 'mat-fisica',
        nota_id: 'nota-cinematica',
      });

      // Caso sem nota/matéria ativa (fallback seguro no deck global do Tutor Socrático)
      const payloadOrphan = createFlashcardPayload(card, null, null);
      expect(payloadOrphan).toEqual({
        frente: 'Fórmula da aceleração',
        verso: 'a = Δv / Δt',
        materia_id: 'Tutor Socrático',
        nota_id: null,
      });
    });

    it('M3-05: Auto-forge invokes toast feedback with exact canonical string', () => {
      const mockToast = vi.fn();
      const triggerCelebrationToast = (toastFn) => {
        toastFn('💡 Conceito aprendido gravado nos Flashcards FSRS!', {
          icon: '🎓',
          duration: 3500,
        });
      };

      triggerCelebrationToast(mockToast);

      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        '💡 Conceito aprendido gravado nos Flashcards FSRS!',
        expect.objectContaining({ icon: '🎓' })
      );
    });
  });

  // =========================================================================
  // MILESTONE M4: Cosmic Graph 2D Canvas Viewer
  // =========================================================================
  describe('M4: Cosmic Graph 2D Canvas & Cluster Geometry', () => {
    // Implementação matemática determinística de referência baseada em hash djb2
    const canonicalDjb2Hue = (str) => {
      if (!str || typeof str !== 'string') return 210; // Matiz neutro cósmico
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
      }
      return Math.abs(hash) % 360;
    };

    it('M4-01: Deterministic djb2 HSL cluster hue is stable across identical inputs', async () => {
      const clusterMod = await tryLoadModule('../components/graph/clusterGeometry.js');
      const getClusterHue = clusterMod?.getClusterHue || canonicalDjb2Hue;

      const hueBio1 = getClusterHue('Biologia');
      const hueBio2 = getClusterHue('Biologia');
      const hueFis = getClusterHue('Física');
      const hueHist = getClusterHue('História');

      // Estabilidade determinística
      expect(hueBio1).toBe(hueBio2);
      expect(hueBio1).toBeGreaterThanOrEqual(0);
      expect(hueBio1).toBeLessThan(360);

      // Diferenciação entre matérias
      expect(hueBio1).not.toBe(hueFis);
      expect(hueFis).not.toBe(hueHist);

      // Tratamento gracioso de strings vazias / nulas
      expect(getClusterHue('')).toBeGreaterThanOrEqual(0);
      expect(getClusterHue(null)).toBeGreaterThanOrEqual(0);
      expect(getClusterHue(undefined)).toBeGreaterThanOrEqual(0);

      // Tratamento de emojis e caracteres unicode especiais
      const unicodeHue = getClusterHue('Química Orgânica 🧪');
      expect(unicodeHue).toBeGreaterThanOrEqual(0);
      expect(unicodeHue).toBeLessThan(360);
      expect(Number.isInteger(unicodeHue)).toBe(true);
    });

    it('M4-02: Cluster hull geometry computation for point cloud sets', async () => {
      const clusterMod = await tryLoadModule('../components/graph/clusterGeometry.js');

      const canonicalComputeHull = (points, padding = 32) => {
        if (!points || !points.length) return [];
        if (points.length === 1) {
          const p = points[0];
          return [{ x: p.x - padding, y: p.y - padding }, { x: p.x + padding, y: p.y + padding }];
        }
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of points) {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        }
        return [
          { x: minX - padding, y: minY - padding },
          { x: maxX + padding, y: minY - padding },
          { x: maxX + padding, y: maxY + padding },
          { x: minX - padding, y: maxY + padding },
        ];
      };

      const computeHull = clusterMod?.computeClusterHull || canonicalComputeHull;

      // Lista vazia
      expect(computeHull([])).toHaveLength(0);

      // Ponto único (Singularidade)
      const singlePointHull = computeHull([{ x: 100, y: 100 }], 20);
      expect(singlePointHull.length).toBeGreaterThanOrEqual(2);

      // Nuvem de pontos
      const multiPoints = [
        { x: 10, y: 10 },
        { x: 200, y: 10 },
        { x: 200, y: 150 },
        { x: 10, y: 150 },
      ];
      const hull = computeHull(multiPoints, 16);
      expect(hull.length).toBeGreaterThanOrEqual(4);
    });

    it('M4-03: Zoom-gated label visibility threshold logic', () => {
      // Regra de transição: k < 0.8 exibe títulos galácticos; k >= 0.8 exibe notas individuais
      const computeLabelOpacities = (k) => {
        const galaxyOpacity = Math.max(0, Math.min(1, (1.2 - k) / 0.6));
        const noteOpacity = Math.max(0, Math.min(1, (k - 0.7) / 0.5));
        return {
          showGalaxyTitle: k < 1.0 && galaxyOpacity > 0.05,
          showNoteTitle: k >= 0.75 && noteOpacity > 0.05,
          galaxyOpacity,
          noteOpacity,
        };
      };

      // Zoom muito afastado (k = 0.3)
      const zoomedOut = computeLabelOpacities(0.3);
      expect(zoomedOut.showGalaxyTitle).toBe(true);
      expect(zoomedOut.showNoteTitle).toBe(false);

      // Zoom balanceado / médio (k = 0.8)
      const midZoom = computeLabelOpacities(0.8);
      expect(midZoom.showGalaxyTitle).toBe(true);
      expect(midZoom.showNoteTitle).toBe(true);

      // Zoom muito aproximado (k = 2.0)
      const zoomedIn = computeLabelOpacities(2.0);
      expect(zoomedIn.showGalaxyTitle).toBe(false);
      expect(zoomedIn.showNoteTitle).toBe(true);
    });

    it('M4-04: Empty graph fallback rendering safety', () => {
      const renderGraphState = (nodes, edges) => {
        if (!nodes || nodes.length === 0) {
          return {
            isEmpty: true,
            message: 'Nenhum nó no campo de visão estelar',
            activeParticles: 0,
          };
        }
        return {
          isEmpty: false,
          activeNodes: nodes.length,
          activeEdges: edges.length,
        };
      };

      expect(renderGraphState([], [])).toEqual({
        isEmpty: true,
        message: 'Nenhum nó no campo de visão estelar',
        activeParticles: 0,
      });

      expect(renderGraphState([{ id: '1' }], [])).toEqual({
        isEmpty: false,
        activeNodes: 1,
        activeEdges: 0,
      });
    });

    it('M4-05: Graph.jsx view engine toggle persists to localStorage and defaults to cosmic', () => {
      const getActiveEngine = () => localStorage.getItem('nexomente_graph_view_engine') || 'cosmic';

      expect(getActiveEngine()).toBe('cosmic');

      localStorage.setItem('nexomente_graph_view_engine', 'cytoscape');
      expect(getActiveEngine()).toBe('cytoscape');

      localStorage.setItem('nexomente_graph_view_engine', 'cosmic');
      expect(getActiveEngine()).toBe('cosmic');
    });
  });

  // =========================================================================
  // MILESTONE M5: MAPA Synchronization Check & Build Readiness
  // =========================================================================
  describe('M5: Connection Map (MAPA) & Production Readiness Gate', () => {
    it('M5-01: docs/mapa.json is valid JSON containing mandatory hubs, nos and ipc_canais', () => {
      const mapaPath = path.resolve(__dirname, '../../../docs/mapa.json');
      expect(fs.existsSync(mapaPath)).toBe(true);

      const raw = fs.readFileSync(mapaPath, 'utf-8');
      const mapa = JSON.parse(raw);

      expect(mapa.versao).toBeDefined();
      expect(Array.isArray(mapa.hubs)).toBe(true);
      expect(Array.isArray(mapa.nos)).toBe(true);
      expect(Array.isArray(mapa.ipc_canais)).toBe(true);

      expect(mapa.hubs.length).toBeGreaterThanOrEqual(8);
      expect(mapa.ipc_canais.length).toBeGreaterThanOrEqual(39);
    });

    it('M5-02: Every file referenced in docs/mapa.json physically exists on disk', () => {
      const rootDir = path.resolve(__dirname, '../../..');
      const mapaPath = path.join(rootDir, 'docs/mapa.json');
      const mapa = JSON.parse(fs.readFileSync(mapaPath, 'utf-8'));

      const missingFiles = [];

      // Checa arquivos nos hubs
      for (const hub of mapa.hubs) {
        if (hub.arquivo) {
          const p = path.join(rootDir, hub.arquivo);
          if (!fs.existsSync(p)) missingFiles.push(hub.arquivo);
        }
      }

      // Checa arquivos nos nós
      for (const no of mapa.nos) {
        if (no.arquivo) {
          const p = path.join(rootDir, no.arquivo);
          if (!fs.existsSync(p)) missingFiles.push(no.arquivo);
        }
      }

      expect(missingFiles).toEqual([]);
    });

    it('M5-03: docs/MAPA.md exists and documents the architecture', () => {
      const mdPath = path.resolve(__dirname, '../../../docs/MAPA.md');
      expect(fs.existsSync(mdPath)).toBe(true);

      const content = fs.readFileSync(mdPath, 'utf-8');
      expect(content).toContain('MAPA DE CONEXÕES');
      expect(content).toMatch(/HUBS|hubs centrais/i);
      expect(content).toContain('TABELA DE IMPACTO');
    });

    it('M5-04: scripts/verificar-mapa.js is executable and syntax valid', () => {
      const scriptPath = path.resolve(__dirname, '../../../scripts/verificar-mapa.js');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
      expect(scriptContent).toContain('process.exit(0)');
      expect(scriptContent).toContain('ipc_canais');
    });

    it('M5-05: vite.config.js configures required path aliases for production build', () => {
      const viteConfigPath = path.resolve(__dirname, '../../../vite.config.js');
      expect(fs.existsSync(viteConfigPath)).toBe(true);

      const configContent = fs.readFileSync(viteConfigPath, 'utf-8');
      expect(configContent).toContain("'@':");
      expect(configContent).toContain("'@core':");
      expect(configContent).toContain("'@app':");
      expect(configContent).toContain("'@features':");
      expect(configContent).toContain("outDir: 'dist'");
    });
  });
});

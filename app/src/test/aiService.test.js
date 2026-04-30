import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/ai/lmStudioService', () => ({
  checkLMStudioStatus: vi.fn().mockResolvedValue({
    status: 'online',
    models: [{ name: 'lmstudio-model-1', id: 'lmstudio-model-1' }],
  }),
  generate: vi.fn().mockResolvedValue({ success: true, response: '[MOCK_LMSTUDIO] ok' }),
  chat: vi.fn().mockResolvedValue({ success: true, response: '[MOCK_LMSTUDIO] ok' }),
  suggestTags: vi.fn().mockResolvedValue(['tag1', 'tag2']),
  setModel: vi.fn(),
  getModel: vi.fn().mockReturnValue('test-model'),
  setTemperature: vi.fn(),
  getTemperature: vi.fn().mockReturnValue(0.4),
}));

vi.mock('../../src/lib/ai/ollamaService', () => ({
  checkOllamaStatus: vi.fn().mockResolvedValue({
    status: 'online',
    models: [{ name: 'llama3:latest' }, { name: 'mistral:latest' }],
  }),
  generate: vi.fn().mockResolvedValue({ success: true, response: '[MOCK_OLLAMA] ok' }),
}));

import * as LMStudio from '../../src/lib/ai/lmStudioService';
import * as Ollama from '../../src/lib/ai/ollamaService';

describe('AI Services Integration (MSW)', () => {
  describe('LMStudio Service', () => {
    it('checkLMStudioStatus retorna online e os modelos', async () => {
      const res = await LMStudio.checkLMStudioStatus();
      expect(res.status).toBe('online');
      expect(res.models.length).toBeGreaterThan(0);
      expect(res.models[0].name || res.models[0].id).toBe('lmstudio-model-1');
    });

    it('generate completa um prompt com sucesso', async () => {
      const res = await LMStudio.generate('Resuma isso', { model: 'test' });
      expect(res.success).toBe(true);
      expect(res.response).toContain('[MOCK_LMSTUDIO]');
    });

    it('chat completa um historico com sucesso', async () => {
      const msgs = [{ role: 'user', content: 'Ola' }];
      const res = await LMStudio.chat(msgs, { model: 'test' });
      expect(res.success).toBe(true);
      expect(res.response).toContain('[MOCK_LMSTUDIO]');
    });

    it('suggestTags retorna lista de tags', async () => {
      const tags = await LMStudio.suggestTags({ titulo: 'T', conteudo: 'c' });
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  describe('Ollama Service', () => {
    it('checkOllamaStatus retorna online e modelos', async () => {
      const res = await Ollama.checkOllamaStatus();
      expect(res.status).toBe('online');
      expect(res.models[0].name).toBe('llama3:latest');
    });

    it('generate completa um prompt com sucesso', async () => {
      const res = await Ollama.generate('Escreva', { model: 'test' });
      expect(res.success).toBe(true);
      expect(res.response).toContain('[MOCK_OLLAMA]');
    });
  });
});

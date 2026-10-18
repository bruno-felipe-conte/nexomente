import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as aiProvider from '../lib/ai/aiProvider';
import { eventBus, DOMAIN_EVENTS } from '@core/events/eventBus';

describe('AI Provider Interno (Embedded GGUF) & DomainEventBus', () => {
  beforeEach(() => {
    localStorage.clear();
    eventBus.clear();
  });

  describe('aiProvider (Motor Interno)', () => {
    it('getActiveProvider retorna sempre embedded', () => {
      expect(aiProvider.getActiveProvider()).toBe('embedded');
    });

    it('getAIConfig retorna configurações padrão com idioma em Português Brasileiro', () => {
      const cfg = aiProvider.getAIConfig();
      expect(cfg.temperature).toBe(0.7);
      expect(cfg.max_tokens).toBe(512);
      expect(cfg.language).toBe('Português Brasileiro');
      expect(cfg.system_prompt).toContain('Português Brasileiro');
    });

    it('getModel retorna o modelo GGUF configurado ou padrão', () => {
      expect(aiProvider.getModel()).toContain('gemma-4-E2B-it');
      localStorage.setItem('nexomente_embedded_model', 'custom-model.gguf');
      expect(aiProvider.getModel()).toBe('custom-model.gguf');
    });
  });

  describe('DomainEventBus (@core/events/eventBus)', () => {
    it('inscreve, emite eventos com metadados e permite unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on(DOMAIN_EVENTS.FLASHCARD_REVIEWED, handler);

      eventBus.emit(DOMAIN_EVENTS.FLASHCARD_REVIEWED, { cardId: 'c1', rating: 3, xpEarned: 15 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toMatchObject({
        cardId: 'c1',
        rating: 3,
        xpEarned: 15,
      });
      expect(handler.mock.calls[0][0]._meta.event).toBe(DOMAIN_EVENTS.FLASHCARD_REVIEWED);

      unsubscribe();
      eventBus.emit(DOMAIN_EVENTS.FLASHCARD_REVIEWED, { cardId: 'c2', rating: 4 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('isola falhas de um listener para não quebrar outros listeners do mesmo evento', () => {
      const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
      const badListener = () => { throw new Error('Falha isolada'); };
      const goodListener = vi.fn();

      eventBus.on(DOMAIN_EVENTS.STUDY_SESSION_COMPLETED, badListener);
      eventBus.on(DOMAIN_EVENTS.STUDY_SESSION_COMPLETED, goodListener);

      eventBus.emit(DOMAIN_EVENTS.STUDY_SESSION_COMPLETED, { minutos: 25 });

      expect(goodListener).toHaveBeenCalledTimes(1);
      spyConsole.mockRestore();
    });
  });
});

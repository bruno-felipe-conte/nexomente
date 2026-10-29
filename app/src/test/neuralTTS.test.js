import { describe, it, expect, vi, beforeEach } from 'vitest';
import { neuralTTS, NEURAL_VOICES } from '../lib/audio/neuralTTS.js';

describe('neuralTTS - Motor de Síntese de Voz Neural', () => {
  beforeEach(() => {
    neuralTTS.stop();
  });

  it('exporta a lista de vozes neurais com Francisca como recomendada HD', () => {
    expect(NEURAL_VOICES.length).toBeGreaterThanOrEqual(4);
    const francisca = NEURAL_VOICES.find((v) => v.id === 'pt-BR-FranciscaNeural');
    expect(francisca).toBeDefined();
    expect(francisca.recommended).toBe(true);

    const antonio = NEURAL_VOICES.find((v) => v.id === 'pt-BR-AntonioNeural');
    expect(antonio).toBeDefined();

    const system = NEURAL_VOICES.find((v) => v.id === 'system');
    expect(system).toBeDefined();
  });

  it('gerencia o ciclo de estado e notifica listeners', () => {
    const states = [];
    const unsubscribe = neuralTTS.subscribe((state) => {
      states.push(state);
    });

    neuralTTS.notify({ isPlaying: true, messageId: 'msg-123' });
    neuralTTS.stop();

    expect(states.length).toBeGreaterThanOrEqual(2);
    expect(states[0].isPlaying).toBe(true);
    expect(states[states.length - 1].isPlaying).toBe(false);

    unsubscribe();
  });

  it('interrompe áudio e zera messageId ao chamar stop()', () => {
    neuralTTS.isPlaying = true;
    neuralTTS.currentMessageId = 'teste-1';

    neuralTTS.stop();

    expect(neuralTTS.isPlaying).toBe(false);
    expect(neuralTTS.currentMessageId).toBeNull();
  });
});

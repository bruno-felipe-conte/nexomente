import { describe, it, expect, vi, beforeEach } from 'vitest';
import { neuralTTS, NEURAL_VOICES } from '../lib/audio/neuralTTS.js';

describe('neuralTTS - Motor de Síntese de Voz Neural', () => {
  beforeEach(() => {
    neuralTTS.stop();
  });

  it('exporta a lista de 3 vozes neurais HD com Francisca como padrão', () => {
    expect(NEURAL_VOICES.length).toBe(3);
    const francisca = NEURAL_VOICES.find((v) => v.id === 'pt-BR-FranciscaNeural');
    expect(francisca).toBeDefined();
    expect(francisca.recommended).toBe(true);

    const antonio = NEURAL_VOICES.find((v) => v.id === 'pt-BR-AntonioNeural');
    expect(antonio).toBeDefined();

    const thalita = NEURAL_VOICES.find((v) => v.id === 'pt-BR-ThalitaMultilingualNeural');
    expect(thalita).toBeDefined();
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

  it('interrompe áudio, remove listeners e zera messageId ao chamar stop()', () => {
    const mockAudio = {
      pause: vi.fn(),
      load: vi.fn(),
      removeAttribute: vi.fn(),
      currentTime: 10,
      onplay: vi.fn(),
      onended: vi.fn(),
      onerror: vi.fn(),
    };
    neuralTTS.currentAudio = mockAudio;
    neuralTTS.isPlaying = true;
    neuralTTS.currentMessageId = 'teste-1';

    neuralTTS.stop();

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.onplay).toBeNull();
    expect(mockAudio.onended).toBeNull();
    expect(mockAudio.onerror).toBeNull();
    expect(mockAudio.currentTime).toBe(0);
    expect(neuralTTS.isPlaying).toBe(false);
    expect(neuralTTS.currentMessageId).toBeNull();
  });
});

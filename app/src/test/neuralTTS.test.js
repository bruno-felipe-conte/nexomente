import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  neuralTTS,
  NEURAL_VOICES,
  VOICE_ALIAS_MAP,
  getAvailableVoices,
  getVoiceById
} from '../lib/audio/neuralTTS.js';

describe('neuralTTS - Motor de Síntese de Voz Neural', () => {
  beforeEach(() => {
    neuralTTS.stop();
  });

  it('exporta a lista de 3 vozes neurais HD brasileiras autênticas com Francisca como padrão', () => {
    expect(NEURAL_VOICES.length).toBe(3);

    const expectedVoiceIds = [
      'pt-BR-FranciscaNeural',
      'pt-BR-AntonioNeural',
      'pt-BR-ThalitaMultilingualNeural',
    ];

    expectedVoiceIds.forEach((id) => {
      const voice = NEURAL_VOICES.find((v) => v.id === id);
      expect(voice).toBeDefined();
      expect(voice.id).toBe(id);
      expect(typeof voice.name).toBe('string');
      expect(['Feminina', 'Masculino']).toContain(voice.gender);
      expect(typeof voice.sampleText).toBe('string');
      expect(voice.sampleText.length).toBeGreaterThan(10);
    });

    const francisca = NEURAL_VOICES.find((v) => v.id === 'pt-BR-FranciscaNeural');
    expect(francisca.recommended).toBe(true);

    expect(VOICE_ALIAS_MAP['pt-BR-AntonioNeural']).toBe('pt-BR-AntonioNeural');

    // Valida getAvailableVoices e getVoiceById
    expect(getAvailableVoices().length).toBe(3);
    expect(getVoiceById('pt-BR-AntonioNeural').id).toBe('pt-BR-AntonioNeural');
    expect(getVoiceById('pt-BR-ThalitaNeural').id).toBe('pt-BR-ThalitaMultilingualNeural');
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

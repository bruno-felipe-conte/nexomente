import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  neuralTTS,
  NEURAL_VOICES,
  VOICE_ALIAS_MAP,
  getAvailableVoices,
  getVoiceById
} from '../lib/audio/neuralTTS.js';

describe('Edge TTS Brazilian Neural Voices - Audit & Resolution Suite', () => {
  beforeEach(() => {
    neuralTTS.stop();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    neuralTTS.stop();
  });

  describe('Catálogo de Vozes Neurais Brasileiras', () => {
    it('contém exatamente 9 vozes brasileiras de alta fidelidade', () => {
      expect(NEURAL_VOICES).toHaveLength(9);
      expect(getAvailableVoices()).toHaveLength(9);
    });

    it('todas as 9 vozes possuem identificador pt-BR válido e metadados completos', () => {
      const allVoices = getAvailableVoices();
      const expectedIds = [
        'pt-BR-FranciscaNeural',
        'pt-BR-AntonioNeural',
        'pt-BR-ThalitaMultilingualNeural',
        'pt-BR-ManuelaNeural',
        'pt-BR-NicolauNeural',
        'pt-BR-BrendaNeural',
        'pt-BR-DonatoNeural',
        'pt-BR-ElzaNeural',
        'pt-BR-FabioNeural'
      ];

      expectedIds.forEach((id) => {
        const v = allVoices.find((voice) => voice.id === id);
        expect(v, `Voz ${id} deve existir no catálogo`).toBeDefined();
        expect(v.name).toBeTruthy();
        expect(v.gender).toMatch(/^(Feminina|Masculino)$/);
        expect(v.desc || v.description).toBeTruthy();
        expect(v.sampleText).toBeTruthy();
        expect(v.sampleText.length).toBeGreaterThan(15);
      });
    });

    it('FranciscaNeural é a voz recomendada (padrão) com flag recommended=true', () => {
      const francisca = getVoiceById('pt-BR-FranciscaNeural');
      expect(francisca).toBeDefined();
      expect(francisca.recommended).toBe(true);

      const others = NEURAL_VOICES.filter((v) => v.id !== 'pt-BR-FranciscaNeural');
      others.forEach((v) => {
        expect(v.recommended).toBe(false);
      });
    });
  });

  describe('Resolução de Vozes e VOICE_ALIAS_MAP', () => {
    it('garante que FabioNeural possui voz genuína e não aponta para Francisca', () => {
      expect(VOICE_ALIAS_MAP['pt-BR-FabioNeural']).toBe('pt-BR-FabioNeural');
      const voice = getVoiceById('pt-BR-FabioNeural');
      expect(voice.id).toBe('pt-BR-FabioNeural');
      expect(voice.name).toBe('Fabio Neural');
      expect(voice.gender).toBe('Masculino');
    });

    it('resolve corretamente o alias legado ThalitaNeural para ThalitaMultilingualNeural', () => {
      expect(VOICE_ALIAS_MAP['pt-BR-ThalitaNeural']).toBe('pt-BR-ThalitaMultilingualNeural');
      const voice = getVoiceById('pt-BR-ThalitaNeural');
      expect(voice.id).toBe('pt-BR-ThalitaMultilingualNeural');
    });

    it('resolve system para FranciscaNeural como padrão do ecossistema', () => {
      expect(VOICE_ALIAS_MAP['system']).toBe('pt-BR-FranciscaNeural');
      const voice = getVoiceById('system');
      expect(voice.id).toBe('pt-BR-FranciscaNeural');
    });

    it('aplica fallback gracioso para Francisca quando receber id nulo ou inexistente', () => {
      expect(getVoiceById(null).id).toBe('pt-BR-FranciscaNeural');
      expect(getVoiceById(undefined).id).toBe('pt-BR-FranciscaNeural');
      expect(getVoiceById('').id).toBe('pt-BR-FranciscaNeural');
      expect(getVoiceById('pt-BR-VozFantasmaNeural').id).toBe('pt-BR-FranciscaNeural');
    });
  });

  describe('Persistência e Seleção de Vozes no Copiloto', () => {
    it('todas as 9 vozes sobrevivem à validação de localStorage sem descarte', () => {
      const allVoices = getAvailableVoices();

      allVoices.forEach((v) => {
        // Simulação da lógica de inicialização de selectedVoice no AICopilotDrawer
        const saved = v.id;
        const resolved = VOICE_ALIAS_MAP[saved] || saved;
        const exists = NEURAL_VOICES.some((voice) => voice.id === resolved);
        const selected = exists ? resolved : 'pt-BR-FranciscaNeural';

        expect(selected, `Voz ${v.id} deve ser mantida ao recarregar`).toBe(v.id);
      });
    });

    it('converte alias legado armazenado no localStorage para ID canônico', () => {
      const saved = 'pt-BR-ThalitaNeural';
      const resolved = VOICE_ALIAS_MAP[saved] || saved;
      const exists = NEURAL_VOICES.some((voice) => voice.id === resolved);
      const selected = exists ? resolved : 'pt-BR-FranciscaNeural';

      expect(selected).toBe('pt-BR-ThalitaMultilingualNeural');
    });
  });

  describe('Execução de Pré-Escuta e Ciclo de Vida do Player', () => {
    it('dispara speak para amostra de voz e notifica estado loading/playing', async () => {
      const states = [];
      const unsub = neuralTTS.subscribe((s) => states.push(s));

      // Mock de fetchNeuralAudio retornando audio data URL
      const mockAudioBase64 = 'data:audio/mp3;base64,SUQzBAAAAAAA';
      const fetchSpy = vi.spyOn(neuralTTS, 'fetchNeuralAudio').mockResolvedValue(mockAudioBase64);

      // Mock da API Audio do navegador
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        onplay: null,
        onended: null,
        onerror: null
      };
      function MockAudio() {
        return mockAudio;
      }
      const audioConstructorSpy = vi.spyOn(globalThis, 'Audio').mockImplementation(MockAudio);

      const manuela = getVoiceById('pt-BR-ManuelaNeural');
      const speakPromise = neuralTTS.speak(manuela.sampleText, {
        voice: manuela.id,
        messageId: `preview-${manuela.id}`
      });

      await speakPromise;

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manuela'),
        'pt-BR-ManuelaNeural',
        expect.any(Number)
      );
      expect(audioConstructorSpy).toHaveBeenCalledWith(mockAudioBase64);
      expect(mockAudio.play).toHaveBeenCalled();

      // Simular evento onplay
      if (mockAudio.onplay) mockAudio.onplay();
      expect(states.some((s) => s.isPlaying && s.messageId === 'preview-pt-BR-ManuelaNeural')).toBe(true);

      unsub();
    });

    it('permite interromper amostra em reprodução via stop() ou segundo clique (toggle)', async () => {
      const mockAudio = {
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        load: vi.fn(),
        removeAttribute: vi.fn(),
        onplay: null,
        onended: null,
        onerror: null
      };
      function MockAudioToggle() {
        return mockAudio;
      }
      vi.spyOn(globalThis, 'Audio').mockImplementation(MockAudioToggle);
      vi.spyOn(neuralTTS, 'fetchNeuralAudio').mockResolvedValue('data:audio/mp3;base64,SUQz');

      // Primeiro clique: inicia reprodução da amostra
      await neuralTTS.speak('Amostra de teste', {
        voice: 'pt-BR-NicolauNeural',
        messageId: 'preview-pt-BR-NicolauNeural'
      });

      expect(neuralTTS.isPlaying).toBe(true);
      expect(neuralTTS.currentMessageId).toBe('preview-pt-BR-NicolauNeural');

      // Segundo clique com o mesmo messageId: toggle/stop
      await neuralTTS.speak('Amostra de teste', {
        voice: 'pt-BR-NicolauNeural',
        messageId: 'preview-pt-BR-NicolauNeural'
      });

      expect(neuralTTS.isPlaying).toBe(false);
      expect(neuralTTS.currentMessageId).toBeNull();
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('aciona fallback gracioso de Web Speech em caso de falha de rede/síntese', async () => {
      vi.spyOn(neuralTTS, 'fetchNeuralAudio').mockRejectedValue(new Error('Falha de conexão com TTS'));
      const fallbackSpy = vi.spyOn(neuralTTS, 'playWebSpeechFallback').mockImplementation(() => {});

      await neuralTTS.speak('Texto de teste', {
        voice: 'pt-BR-BrendaNeural',
        messageId: 'preview-pt-BR-BrendaNeural'
      });

      expect(fallbackSpy).toHaveBeenCalledWith(
        expect.stringContaining('Texto de teste'),
        expect.any(Number),
        'preview-pt-BR-BrendaNeural'
      );
    });
  });
});

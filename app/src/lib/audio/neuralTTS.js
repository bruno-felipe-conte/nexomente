/**
 * neuralTTS.js
 * Cliente unificado de síntese de voz neural ultra-realista para o NexoMente.
 * Suporta Electron IPC, Middleware Web Vite e Fallback local da Web Speech API.
 */

import { formatTextForSpeech, splitIntoSentences } from './speechFormatter.js';

export const NEURAL_VOICES = [
  {
    id: 'pt-BR-FranciscaNeural',
    name: 'Francisca Neural',
    gender: 'Feminina',
    desc: 'Natural, expressiva e acolhedora (Padrão)',
    recommended: true
  },
  {
    id: 'pt-BR-AntonioNeural',
    name: 'Antonio Neural',
    gender: 'Masculino',
    desc: 'Didático, formal e imponente para estudos',
    recommended: false
  },
  {
    id: 'pt-BR-ThalitaMultilingualNeural',
    name: 'Thalita Neural',
    gender: 'Feminina',
    desc: 'Jovem, dinâmica e ágil',
    recommended: false
  }
];

// Mapeamento de retrocompatibilidade para identificadores antigos
export const VOICE_ALIAS_MAP = {
  'pt-BR-ThalitaNeural': 'pt-BR-ThalitaMultilingualNeural',
  'pt-BR-ThalitaMultilingualNeural': 'pt-BR-ThalitaMultilingualNeural',
  'pt-BR-AntonioNeural': 'pt-BR-AntonioNeural',
  'pt-BR-FranciscaNeural': 'pt-BR-FranciscaNeural',
  'pt-BR-FabioNeural': 'pt-BR-FranciscaNeural',
  system: 'pt-BR-FranciscaNeural'
};

class NeuralTTSManager {
  constructor() {
    this.currentAudio = null;
    this.currentUtteranceQueue = [];
    this.isPlaying = false;
    this.currentMessageId = null;
    this.onStateChange = null;
  }

  /**
   * Registra listener para atualizações de estado (reproduzindo, pausado, parado)
   */
  subscribe(callback) {
    this.onStateChange = callback;
    return () => {
      this.onStateChange = null;
    };
  }

  notify(state) {
    if (this.onStateChange) {
      this.onStateChange(state);
    }
  }

  /**
   * Interrompe qualquer reprodução de áudio em andamento imediatamente
   */
  stop() {
    if (this.currentAudio) {
      try {
        // Desvincular todos os handlers para evitar disparo acidental de onerror ou onended ao resetar
        this.currentAudio.onplay = null;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
      } catch (e) {
        // Ignora erros ao parar áudio descartado
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // Ignora erros na Web Speech API
      }
    }

    this.currentUtteranceQueue = [];
    this.isPlaying = false;
    this.currentMessageId = null;
    this.notify({ isPlaying: false, messageId: null });
  }

  /**
   * Sintetiza áudio chamando o Electron IPC ou o endpoint HTTP do Vite
   */
  async fetchNeuralAudio(text, voice, rate) {
    const targetVoice = VOICE_ALIAS_MAP[voice] || 'pt-BR-FranciscaNeural';

    // 1. Tentar via Electron IPC (se estiver no app Desktop)
    if (typeof window !== 'undefined' && window.electronAPI?.synthesizeSpeech) {
      const res = await window.electronAPI.synthesizeSpeech({ text, voice: targetVoice, rate });
      if (res?.success && res.audioBase64) {
        return res.audioBase64;
      }
      throw new Error(res?.error || 'Falha no IPC de áudio');
    }

    // 2. Tentar via endpoint HTTP (se estiver no Vite Web Dev ou servidor web)
    const response = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: targetVoice, rate })
    });

    if (!response.ok) {
      throw new Error(`Servidor de TTS respondeu com status ${response.status}`);
    }

    const data = await response.json();
    if (data?.success && data.audioBase64) {
      return data.audioBase64;
    }

    throw new Error(data?.error || 'Erro inesperado na resposta de síntese');
  }

  /**
   * Fallback inteligente usando Web Speech API com chunking de sentenças
   */
  playWebSpeechFallback(cleanText, rate = 1.05, messageId = null) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.stop();
      return;
    }

    window.speechSynthesis.cancel();

    const sentences = splitIntoSentences(cleanText, 140);
    if (!sentences.length) {
      this.stop();
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const ptVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('pt') &&
          (v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Luciana') ||
            v.name.includes('Maria'))
      ) || voices.find((v) => v.lang.startsWith('pt'));

    let currentIndex = 0;
    this.isPlaying = true;
    this.currentMessageId = messageId;
    this.notify({ isPlaying: true, messageId });

    const speakNext = () => {
      if (currentIndex >= sentences.length || !this.isPlaying) {
        this.stop();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[currentIndex]);
      utterance.lang = 'pt-BR';
      utterance.rate = rate;
      if (ptVoice) utterance.voice = ptVoice;

      utterance.onend = () => {
        currentIndex++;
        // Pequena pausa humana de 120ms entre orações
        setTimeout(() => {
          if (this.isPlaying) speakNext();
        }, 120);
      };

      utterance.onerror = () => {
        this.stop();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }

  /**
   * Reproduz o texto usando voz neural de alta fidelidade com fallback transparente
   */
  async speak(rawText, options = {}) {
    const {
      messageId = null,
      voice = 'pt-BR-FranciscaNeural',
      rate = 1.05
    } = options;

    // Se já estiver falando a mesma mensagem, o clique funciona como Toggle (Pause / Stop)
    if (this.isPlaying && this.currentMessageId === messageId) {
      this.stop();
      return;
    }

    this.stop();

    const cleanText = formatTextForSpeech(rawText);
    if (!cleanText) return;

    const resolvedVoice = VOICE_ALIAS_MAP[voice] || 'pt-BR-FranciscaNeural';

    this.isPlaying = true;
    this.currentMessageId = messageId;
    this.notify({ isPlaying: true, messageId, loading: true });

    try {
      // [E5] Timeout de 5s via Promise.race acionando fallback Web Speech em caso de latência excessiva ou queda
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de 5000ms na obtenção de áudio neural')), 5000);
      });

      const audioBase64 = await Promise.race([
        this.fetchNeuralAudio(cleanText, resolvedVoice, rate),
        timeoutPromise
      ]);

      if (!this.isPlaying || this.currentMessageId !== messageId) {
        return; // Interrompido enquanto aguardava a requisição
      }

      const audio = new Audio(audioBase64);
      this.currentAudio = audio;
      let hasCompleted = false;

      audio.onplay = () => {
        this.notify({ isPlaying: true, messageId, loading: false });
      };

      audio.onended = () => {
        hasCompleted = true;
        this.stop();
      };

      audio.onerror = (e) => {
        // Se já concluiu normalmente ou foi interrompido, não dispara fallback
        if (hasCompleted || !this.isPlaying || this.currentMessageId !== messageId) {
          return;
        }
        console.warn('[NEURAL TTS] Erro no player de áudio MP3, usando fallback local:', e);
        this.playWebSpeechFallback(cleanText, rate, messageId);
      };

      await audio.play();
    } catch (err) {
      console.warn('[NEURAL TTS] Falha ao obter voz neural online, ativando fallback offline:', err.message);
      if (this.isPlaying && this.currentMessageId === messageId) {
        this.playWebSpeechFallback(cleanText, rate, messageId);
      }
    }
  }
}

export const neuralTTS = new NeuralTTSManager();

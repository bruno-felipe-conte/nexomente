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
    id: 'pt-BR-ThalitaNeural',
    name: 'Thalita Neural',
    gender: 'Feminina',
    desc: 'Jovem, dinâmica e ágil',
    recommended: false
  },
  {
    id: 'pt-BR-FabioNeural',
    name: 'Fabio Neural',
    gender: 'Masculino',
    desc: 'Coloquial e amigável',
    recommended: false
  },
  {
    id: 'system',
    name: 'Voz Local do Sistema',
    gender: 'Auto',
    desc: 'Síntese offline direta do sistema operacional',
    recommended: false
  }
];

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
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
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
    // 1. Tentar via Electron IPC (se estiver no app Desktop)
    if (typeof window !== 'undefined' && window.electronAPI?.synthesizeSpeech) {
      const res = await window.electronAPI.synthesizeSpeech({ text, voice, rate });
      if (res?.success && res.audioBase64) {
        return res.audioBase64;
      }
      throw new Error(res?.error || 'Falha no IPC de áudio');
    }

    // 2. Tentar via endpoint HTTP (se estiver no Vite Web Dev ou servidor web)
    const response = await fetch('/api/tts/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, rate })
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

    this.isPlaying = true;
    this.currentMessageId = messageId;
    this.notify({ isPlaying: true, messageId, loading: true });

    // Se o usuário selecionou expressamente a voz do sistema offline
    if (voice === 'system') {
      this.playWebSpeechFallback(cleanText, rate, messageId);
      return;
    }

    try {
      const audioBase64 = await this.fetchNeuralAudio(cleanText, voice, rate);

      if (!this.isPlaying || this.currentMessageId !== messageId) {
        return; // Interrompido enquanto aguardava
      }

      const audio = new Audio(audioBase64);
      this.currentAudio = audio;

      audio.onplay = () => {
        this.notify({ isPlaying: true, messageId, loading: false });
      };

      audio.onended = () => {
        this.stop();
      };

      audio.onerror = (e) => {
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

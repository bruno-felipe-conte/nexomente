import { useState, useRef, useEffect, useCallback } from 'react';

// Cache singleton do modelo Vosk WASM para evitar duplo carregamento entre Arena e Modal
let sharedVoskModel = null;
let sharedVoskPromise = null;

// Função de reamostragem (downsampling) por decimação para garantir 16000Hz exatos
function resampleTo16k(audioBuffer, sourceRate) {
  if (!audioBuffer || audioBuffer.length === 0 || sourceRate === 16000) {
    return audioBuffer;
  }
  const ratio = sourceRate / 16000;
  const newLength = Math.round(audioBuffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), audioBuffer.length);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += audioBuffer[j];
      count++;
    }
    result[i] = count > 0 ? sum / count : (audioBuffer[start] || 0);
  }
  return result;
}

/**
 * Hook para reconhecimento de voz OFFLINE usando Vosk-browser.
 * Versão 1.25: Downsampling 16kHz garantido, ciclo de vida seguro de recognizers e latência zero.
 */
export function useVosk({ onResult, onPartialResult, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [isReady, setIsReady] = useState(Boolean(sharedVoskModel));
  const [status, setStatus] = useState(sharedVoskModel ? 'ready' : 'loading');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const modelRef = useRef(sharedVoskModel);
  const recognizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const isListeningRef = useRef(false);
  const lastLevelUpdateRef = useRef(0);
  
  const onResultRef = useRef(onResult);
  const onPartialResultRef = useRef(onPartialResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { 
    onResultRef.current = onResult;
    onPartialResultRef.current = onPartialResult;
    onErrorRef.current = onError;
  }, [onResult, onPartialResult, onError]);

  const loadVoskModel = useCallback(async () => {
    if (sharedVoskModel) {
      modelRef.current = sharedVoskModel;
      setIsReady(true);
      setStatus((prev) => (prev === 'listening' ? 'listening' : 'ready'));
      return sharedVoskModel;
    }
    if (!sharedVoskPromise) {
      sharedVoskPromise = (async () => {
        const VoskModule = await import('vosk-browser');
        const Vosk = VoskModule?.createModel
          ? VoskModule
          : VoskModule?.default?.createModel
            ? VoskModule.default
            : window.Vosk;
        const model = await Vosk.createModel('/models/vosk/model.zip');
        sharedVoskModel = model;
        return model;
      })();
    }
    const model = await sharedVoskPromise;
    modelRef.current = model;
    setIsReady(true);
    setStatus((prev) => (prev === 'listening' ? 'listening' : 'ready'));
    return model;
  }, []);

  useEffect(() => {
    let mounted = true;
    loadVoskModel()
      .then((model) => {
        if (mounted && model) {
          modelRef.current = model;
          setIsReady(true);
          setStatus((prev) => (prev === 'listening' ? 'listening' : 'ready'));
        }
      })
      .catch((err) => {
        sharedVoskPromise = null;
        console.error('[VOSK] ❌ Erro Init:', err);
        if (mounted) {
          setStatus('error');
          onErrorRef.current?.('Falha ao carregar modelo de voz local.');
        }
      });
    return () => {
      mounted = false;
    };
  }, [loadVoskModel]);

  const cleanupRecognizer = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.remove?.();
      } catch (err) {
        console.warn('[VOSK] Falha ao desalocar recognizer antigo:', err);
      }
      recognizerRef.current = null;
    }
  }, []);

  const resetRecognizer = useCallback(() => {
    if (!modelRef.current) return;
    cleanupRecognizer();

    // O modelo Vosk Kaldi pt-BR opera estritamente a 16000Hz
    const rec = new modelRef.current.KaldiRecognizer(16000);
    
    rec.on('result', (m) => {
      const text = m?.result?.text || m?.text || '';
      if (text && isListeningRef.current) {
        console.log('[VOSK] 🟢 Final:', text);
        onResultRef.current?.(text);
      }
    });

    rec.on('partialresult', (m) => {
      const partial = m?.result?.partial || m?.partial || '';
      if (partial && isListeningRef.current) {
        onPartialResultRef.current?.(partial);
      }
    });

    recognizerRef.current = rec;
  }, [cleanupRecognizer]);

  const terminateAudio = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setAudioLevel(0);
    setStatus('ready');

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try {
        processorRef.current.disconnect();
      } catch (_) {}
      processorRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch (_) {}
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    cleanupRecognizer();
  }, [cleanupRecognizer]);

  // Transição rápida de verso: limpa buffers sem recriar objetos WASM
  const nextVerse = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.retrieveFinalResult?.();
      } catch (err) {
        console.warn('[VOSK] Erro ao recuperar resultado final no verso:', err);
      }
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      if (!modelRef.current) {
        await loadVoskModel();
      }
      if (!modelRef.current) return;

      terminateAudio();

      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      const targetMic = mics.find((m) => m.deviceId !== 'default' && m.deviceId !== 'communications') || mics[0];
      
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      let ctx;
      try {
        ctx = new AudioContextClass({ sampleRate: 16000 });
      } catch {
        ctx = new AudioContextClass();
      }

      if (ctx.state === 'suspended') await ctx.resume();
      audioContextRef.current = ctx;
      
      // Inicializa recognizer a 16000Hz fixo
      resetRecognizer();

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            deviceId: targetMic?.deviceId ? { ideal: targetMic.deviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 16000 }
          } 
        });
      } catch (audioErr) {
        console.warn('[useVosk] Fallback para microfone padrão:', audioErr?.message);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.85; // Calibração para evitar clipping em falas próximas
      
      // Buffer de 4096 amostras para janela acústica confiável
      processorRef.current = ctx.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        const currentRec = recognizerRef.current;
        if (!isListeningRef.current || !currentRec) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        // Garante 16000Hz exatos independente da placa de som
        const resampled = resampleTo16k(inputData, event.inputBuffer.sampleRate);
        currentRec.acceptWaveformFloat(resampled, 16000);

        // Medição RMS real para indicador e espectro
        const now = performance.now();
        if (now - lastLevelUpdateRef.current >= 75) {
          lastLevelUpdateRef.current = now;
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            const s = inputData[i];
            sumSquares += s * s;
          }
          const rms = Math.sqrt(sumSquares / inputData.length);
          const level = Math.min(100, Math.round(rms * 450));
          setAudioLevel(level);
        }
      };

      source.connect(gainNode);
      gainNode.connect(processorRef.current);
      processorRef.current.connect(ctx.destination);
      
      isListeningRef.current = true;
      setIsListening(true);
      setStatus('listening');

    } catch (err) {
      console.error('[VOSK] ❌ Erro Start:', err);
      terminateAudio();
      onErrorRef.current?.('Erro ao acessar o microfone.');
    }
  }, [loadVoskModel, resetRecognizer, terminateAudio]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setAudioLevel(0);
    setStatus('ready');
  }, []);

  useEffect(() => {
    return () => {
      terminateAudio();
    };
  }, [terminateAudio]);

  return {
    isListening,
    isReady,
    status,
    audioLevel,
    startListening,
    stopListening,
    nextVerse,
    resetRecognizer,
    terminateAudio,
  };
}

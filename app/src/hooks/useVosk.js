import { useState, useRef, useEffect, useCallback } from 'react';
import {
  createVoiceDSPChain,
  downmixAntiPhase,
  resampleAndGateAudio,
  RealtimeProsodyAnalyzer,
} from '../lib/audio/audioDecoder.js';

// Cache singleton do modelo Vosk WASM para evitar duplo carregamento entre Arena e Modal
let sharedVoskModel = null;
let sharedVoskPromise = null;

/**
 * Hook para reconhecimento de voz OFFLINE usando Vosk-browser.
 * Versão 2.0: Decodificador acústico completo, cadeia DSP vocal anti-ruído,
 * reamostragem anti-aliasing 16kHz, gramática dinâmica contextual Kaldi e
 * análise de prosódia em tempo real.
 */
export function useVosk({ onResult, onPartialResult, onError, grammar = null, autoLoad = false }) {
  const [isListening, setIsListening] = useState(false);
  const [isReady, setIsReady] = useState(Boolean(sharedVoskModel));
  const [status, setStatus] = useState(sharedVoskModel ? 'ready' : (autoLoad ? 'loading' : 'idle'));
  const [audioLevel, setAudioLevel] = useState(0);
  const [prosodyMetrics, setProsodyMetrics] = useState({
    syllableRateHz: 0,
    estimatedWpm: 0,
    voicedRatio: 0,
    cadenciaScore: 100,
  });
  
  const modelRef = useRef(sharedVoskModel);
  const recognizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const dspChainRef = useRef(null);
  const prosodyAnalyzerRef = useRef(new RealtimeProsodyAnalyzer(16000));
  const isListeningRef = useRef(false);
  const lastLevelUpdateRef = useRef(0);
  const grammarRef = useRef(grammar);
  
  const onResultRef = useRef(onResult);
  const onPartialResultRef = useRef(onPartialResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { 
    onResultRef.current = onResult;
    onPartialResultRef.current = onPartialResult;
    onErrorRef.current = onError;
    grammarRef.current = grammar;
  }, [onResult, onPartialResult, onError, grammar]);

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
    if (!autoLoad) return;
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
  }, [loadVoskModel, autoLoad]);

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

  const resetRecognizer = useCallback((customGrammar = null) => {
    if (!modelRef.current) return;
    cleanupRecognizer();

    const activeGrammar = customGrammar || grammarRef.current;
    let rec;

    // Se houver gramática contextual do poema (palavras + [unk]), KaldiRecognizer foca estritamente no vocabulário
    if (activeGrammar && Array.isArray(activeGrammar) && activeGrammar.length > 0) {
      try {
        const grammarJson = JSON.stringify(activeGrammar);
        rec = new modelRef.current.KaldiRecognizer(16000, grammarJson);
      } catch (grammarErr) {
        console.warn('[VOSK] Fallback para reconhecimento livre sem gramática restrita:', grammarErr);
        rec = new modelRef.current.KaldiRecognizer(16000);
      }
    } else {
      rec = new modelRef.current.KaldiRecognizer(16000);
    }
    
    try {
      rec.setWords?.(true);
    } catch {
      // ignora se a versão do vosk não suportar setWords
    }

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

    if (dspChainRef.current) {
      try {
        dspChainRef.current.disconnect();
      } catch {
        // ignora se dsp já foi desconectado
      }
      dspChainRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try {
        processorRef.current.disconnect();
      } catch {
        // ignora se nó já foi desconectado
      }
      processorRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {
        // ignora se tracks já foram paradas
      }
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
    prosodyAnalyzerRef.current?.reset();
  }, []);

  const startListening = useCallback(async () => {
    try {
      if (!modelRef.current) {
        await loadVoskModel();
      }
      if (!modelRef.current) return;

      terminateAudio();
      prosodyAnalyzerRef.current?.reset();

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
      
      // Inicializa recognizer a 16000Hz com suporte opcional a gramática
      resetRecognizer();

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            deviceId: targetMic?.deviceId ? { ideal: targetMic.deviceId } : undefined,
            channelCount: { ideal: 2 }, // Captura 2 canais para anti-cancelamento de fase
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
      
      // Conecta a cadeia DSP vocal completa (Highpass 85Hz + Boost de presença 2.8kHz + Anti-alias + Compressor)
      const dsp = createVoiceDSPChain(ctx, source);
      dspChainRef.current = dsp;

      // Buffer de 4096 amostras para janela acústica com processamento anti-fase e gate de silêncio
      processorRef.current = ctx.createScriptProcessor(4096, 2, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        const currentRec = recognizerRef.current;
        if (!isListeningRef.current || !currentRec) return;
        
        // 1. Anti-cancelamento de fase para microfones duplos de laptop
        const ch0 = event.inputBuffer.getChannelData(0);
        const ch1 = event.inputBuffer.numberOfChannels > 1 
          ? event.inputBuffer.getChannelData(1) 
          : null;
        const monoPcm = downmixAntiPhase(ch0, ch1);

        // 2. Reamostragem com Silence Gate (-50dBFS) para 16000Hz exatos
        const resampled = resampleAndGateAudio(monoPcm, event.inputBuffer.sampleRate, 16000);
        currentRec.acceptWaveformFloat(resampled, 16000);

        // 3. Telemetria Acústica de Prosódia & Cadência Poética Real
        const now = performance.now();
        if (now - lastLevelUpdateRef.current >= 75) {
          lastLevelUpdateRef.current = now;
          const telemetry = prosodyAnalyzerRef.current?.processFrame(resampled);
          if (telemetry) {
            setAudioLevel(telemetry.audioLevel);
            setProsodyMetrics({
              syllableRateHz: telemetry.syllableRateHz,
              estimatedWpm: telemetry.estimatedWpm,
              voicedRatio: telemetry.voicedRatio,
              cadenciaScore: telemetry.cadenciaScore,
            });
          }
        }
      };

      // Isola a saída com ganho zero para evitar vazamento do microfone / microfonia nos alto-falantes
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      dsp.outputNode.connect(processorRef.current);
      processorRef.current.connect(silentGain);
      silentGain.connect(ctx.destination);
      
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
    prosodyMetrics,
    startListening,
    stopListening,
    nextVerse,
    resetRecognizer,
    terminateAudio,
  };
}

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook para reconhecimento de voz OFFLINE usando Vosk-browser.
 * Versão 1.20: Amplificador de Software (GainNode 8x).
 */
export function useVosk({ onResult, onPartialResult, onError }) {
  const [isListening, setIsListening] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState('loading');
  
  const modelRef = useRef(null);
  const recognizerRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const isListeningRef = useRef(false);
  const currentSampleRateRef = useRef(16000);
  
  const onResultRef = useRef(onResult);
  const onPartialResultRef = useRef(onPartialResult);

  useEffect(() => { 
    onResultRef.current = onResult;
    onPartialResultRef.current = onPartialResult;
  }, [onResult, onPartialResult]);

  useEffect(() => {
    let cancelled = false;
    async function initVosk() {
      if (modelRef.current) return;
      try {
        const VoskModule = await import('vosk-browser');
        const Vosk = VoskModule.createModel ? VoskModule : window.Vosk;
        const model = await Vosk.createModel('/models/vosk/model.zip');
        if (cancelled) {
          if (model.terminate) model.terminate();
          return; 
        }
        modelRef.current = model;
        setIsReady(true);
        setStatus('ready');
      } catch (err) {
        console.error('[VOSK] ❌ Erro Init:', err);
        setStatus('error');
        if (onError) onError('Falha ao carregar modelo.');
      }
    }
    initVosk();
    return () => { cancelled = true; };
  }, []);

  const resetRecognizer = useCallback((sampleRate) => {
    if (!modelRef.current) return;
    const rate = sampleRate || currentSampleRateRef.current;
    currentSampleRateRef.current = rate;
    const rec = new modelRef.current.KaldiRecognizer(rate);
    
    rec.on('result', (m) => {
      if (m.result?.text && isListeningRef.current) {
        onResultRef.current?.(m.result.text);
      }
    });

    rec.on('partialresult', (m) => {
      if (m.result?.partial && isListeningRef.current) {
        onPartialResultRef.current?.(m.result.partial);
      }
    });

    recognizerRef.current = rec;
  }, []);

  const terminateAudio = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setStatus('ready');

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
      audioContextRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!isReady) return;

    try {
      terminateAudio();

      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(d => d.kind === 'audioinput');
      const targetMic = mics.find(m => m.deviceId !== 'default' && m.deviceId !== 'communications') || mics[0];
      
      console.log(`[VOSK] 🎯 Mic: ${targetMic.label}`);

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') await ctx.resume();
      audioContextRef.current = ctx;
      
      const rate = ctx.sampleRate;
      resetRecognizer(rate);

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          deviceId: { exact: targetMic.deviceId },
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true, // Reativado para compensar volume baixo
          sampleRate: 48000
        } 
      });
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      
      // NOVO: Amplificador de software (8x) para compensar o driver Intel SST
      const gainNode = ctx.createGain();
      gainNode.gain.value = 8.0; 
      
      processorRef.current = ctx.createScriptProcessor(4096, 1, 1);
      
      let pulseCount = 0;
      processorRef.current.onaudioprocess = (event) => {
        const currentRec = recognizerRef.current;
        if (!isListeningRef.current || !currentRec) return;
        
        const inputData = event.inputBuffer.getChannelData(0);
        const bufferCopy = new Float32Array(inputData);
        currentRec.acceptWaveformFloat(bufferCopy, event.inputBuffer.sampleRate);

        pulseCount++;
        if (pulseCount % 100 === 0) {
          let max = 0;
          for(let i=0; i<bufferCopy.length; i++) if(Math.abs(bufferCopy[i]) > max) max = Math.abs(bufferCopy[i]);
          console.log(`[VOSK] 🌊 Volume (Amplificado 8x): ${max.toFixed(4)}`);
        }
      };

      // Conecta a cadeia: Mic -> Ganho -> Processador -> Destino
      source.connect(gainNode);
      gainNode.connect(processorRef.current);
      processorRef.current.connect(ctx.destination);
      
      isListeningRef.current = true;
      setIsListening(true);
      setStatus('listening');

    } catch (err) {
      console.error('[VOSK] ❌ Erro Start:', err);
      terminateAudio();
      if (onError) onError('Erro no microfone.');
    }
  }, [isReady, resetRecognizer, terminateAudio, onError]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setStatus('ready');
  }, []);

  return { isListening, isReady, status, startListening, stopListening, nextVerse: resetRecognizer, terminateAudio };
}

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook de Reconhecimento de Fala via Web Speech API nativa.
 * Blindado com referências estáveis para evitar reinicializações e conflitos de áudio.
 */
export function useSpeechRecognition({ onResult, onEnd, onError, language = 'pt-BR' }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onResult, onEnd, onError]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setError(null);
      console.log('── SPEECH RECOGNITION STARTED ──');
    };

    recognition.onend = () => {
      console.log('── SPEECH RECOGNITION ENDED ──');
      if (isListeningRef.current) {
        try {
          recognition.start();
          console.log('── AUTO-RESTARTING SPEECH ──');
        } catch {
          isListeningRef.current = false;
          setIsListening(false);
          if (onEndRef.current) onEndRef.current();
        }
      } else {
        setIsListening(false);
        if (onEndRef.current) onEndRef.current();
      }
    };

    recognition.onerror = (event) => {
      console.warn('── SPEECH RECOGNITION ERROR ──', event.error);
      
      if (event.error === 'no-speech') return; // Silencioso em pausas normais de fala

      // Desativa auto-restart imediatamente em erros terminais (Brave/Electron bloqueiam Google Speech com 'aborted')
      isListeningRef.current = false;
      setIsListening(false);

      let friendlyMessage = 'Erro no reconhecimento de voz.';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        friendlyMessage = 'Microfone bloqueado. Permita o acesso ao microfone no navegador.';
      } else if (event.error === 'network' || event.error === 'aborted') {
        friendlyMessage = 'Reconhecimento online indisponível. Usando motor offline local.';
      }

      setError(friendlyMessage);
      if (onErrorRef.current) onErrorRef.current(friendlyMessage, event.error);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const text = (final || interim).trim();
      if (text && onResultRef.current) {
        onResultRef.current(text, Boolean(final));
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognition.onstart = null;
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;
        recognition.abort();
      } catch {
        // Silencioso no desmonte
      }
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
      } catch (err) {
        console.warn('[Speech] Error starting:', err.message);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('[Speech] Error stopping:', err.message);
      }
    }
  }, []);

  return {
    isListening,
    error,
    startListening,
    stopListening,
  };
}

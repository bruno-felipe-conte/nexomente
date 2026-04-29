import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechRecognition({ onResult, onEnd, onError, language = 'pt-BR' }) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech Recognition API not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      console.log('── SPEECH RECOGNITION STARTED ──');
    };
    recognition.onend = () => {
      console.log('── SPEECH RECOGNITION ENDED ──');
      // Tenta reiniciar automaticamente se ainda deveríamos estar ouvindo (ex: após silêncio)
      if (isListeningRef.current) {
        try {
          recognition.start();
          console.log('── AUTO-RESTARTING SPEECH ──');
        } catch (err) {
          setIsListening(false);
          if (onEnd) onEnd();
        }
      } else {
        setIsListening(false);
        if (onEnd) onEnd();
      }
    };
    recognition.onerror = (event) => {
      console.error('── SPEECH RECOGNITION ERROR ──');
      console.error('Error Code:', event.error);
      
      let friendlyMessage = 'Erro desconhecido no reconhecimento de voz.';
      if (event.error === 'not-allowed') friendlyMessage = 'Acesso ao microfone negado pelo navegador.';
      if (event.error === 'no-speech') friendlyMessage = 'Nenhuma voz detectada. Tente falar mais alto.';
      if (event.error === 'network') friendlyMessage = 'Erro de rede. Verifique sua conexão.';
      
      setError(friendlyMessage);
      if (onError) onError(friendlyMessage, event.error);
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (onResult) onResult(transcript, event.results[event.results.length - 1].isFinal);
    };

    recognitionRef.current = recognition;
  }, [language, onResult, onEnd, onError]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('[Speech] Error starting:', err.message);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return {
    isListening,
    error,
    startListening,
    stopListening
  };
}

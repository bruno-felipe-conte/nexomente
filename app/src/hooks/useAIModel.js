import { useEffect, useCallback } from 'react';
import { useAIStore } from '../store/useAIStore';

export function useAIModel() {
  const store = useAIStore();

  useEffect(() => {
    store.verificarStatus();
  }, [store.provider]); // Re-verifica sempre que o provedor mudar

  return {
    status: store.status,
    provider: store.provider,
    modelos: store.modelos,
    modeloAtual: store.modeloAtual,
    temperatura: store.temperatura,
    apiKey: store.apiKey,
    loading: store.loading,
    setProvider: store.setProvider,
    setModeloAtual: store.setModeloAtual,
    setTemperatura: store.setTemperatura,
    setApiKey: store.setApiKey,
    verificar: store.verificarStatus,
    // Compatibilidade com nomes antigos
    trocarProvedor: store.setProvider,
    trocarModelo: store.setModeloAtual,
    trocarTemperatura: store.setTemperatura
  };
}

const CHAT_KEY_PREFIX = 'nexomente_ai_chat_';

import { useState } from 'react';

export function useAIChat(notaId) {
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(false);
  const storageKey = notaId ? `${CHAT_KEY_PREFIX}${notaId}` : `${CHAT_KEY_PREFIX}livre`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMensagens(JSON.parse(stored));
      } catch {
         
        setMensagens([]);
      }
    } else {
       
      setMensagens([]);
    }
  }, [storageKey]);

  const persistir = useCallback((msgs) => {
    const trimmed = msgs.slice(-40);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
    setMensagens(trimmed);
  }, [storageKey]);

  const adicionar = useCallback((role, texto, errorCode = null) => {
    setMensagens(prev => {
      const updated = [...prev, { 
        role, 
        texto, 
        errorCode, 
        isError: !!errorCode,
        ts: Date.now() 
      }];
      persistir(updated);
      return updated;
    });
  }, [persistir]);

  const limpar = useCallback(() => {
    localStorage.removeItem(storageKey);
    setMensagens([]);
  }, [storageKey]);

  return { mensagens, adicionar, limpar, loading, setLoading };
}
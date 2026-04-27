import { useState, useEffect, useCallback } from 'react';
import * as aiProvider from '../lib/ai/aiProvider';
import { getTemperature, getModel } from '../lib/ai/lmStudioService';

export function useAIModel() {
  const [status, setStatus] = useState('checking');
  const [provider, setProvider] = useState(aiProvider.getActiveProvider());
  const [modelos, setModelos] = useState([]);
  const [modeloAtual, setModeloAtual] = useState(getModel());
  const [temperatura, setTemperatura] = useState(getTemperature());
  const [loading, setLoading] = useState(false);

  const verificar = useCallback(async () => {
    setLoading(true);
    setStatus('checking');
    try {
      const res = await aiProvider.checkStatus();
      if (res.status === 'online') {
        setStatus('online');
        const mods = res.models.length > 0
          ? res.models.map(m => typeof m === 'string' ? m : (m.id || m.name || 'unknown'))
          : [modeloAtual];
        setModelos(mods);
        
        // Auto-seleciona o primeiro se o atual não estiver na lista (ex: mudou de provedor)
        if (!mods.includes(modeloAtual)) {
          setModeloAtual(mods[0]);
          localStorage.setItem('nexomente_ai_model', mods[0]);
        }
      } else {
        setStatus('offline');
        setModelos([modeloAtual]);
      }
    } catch {
      setStatus('offline');
      setModelos([modeloAtual]);
    }
    setLoading(false);
  }, [modeloAtual]);

  useEffect(() => {
    verificar();
  }, [verificar, provider]);

  const trocarProvedor = useCallback((p) => {
    aiProvider.setActiveProvider(p);
    setProvider(p);
  }, []);

  const trocarModelo = useCallback((novoModelo) => {
    setModeloAtual(novoModelo);
    localStorage.setItem('nexomente_ai_model', novoModelo);
  }, []);

  const trocarTemperatura = useCallback((novaTemp) => {
    setTemperatura(novaTemp);
  }, []);

  return {
    status,
    provider,
    modelos,
    modeloAtual,
    temperatura,
    loading,
    trocarProvedor,
    trocarModelo,
    trocarTemperatura,
    verificar,
  };
}

const CHAT_KEY_PREFIX = 'nexomente_ai_chat_';

export function useAIChat(notaId) {
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(false);
  const storageKey = notaId ? `${CHAT_KEY_PREFIX}${notaId}` : `${CHAT_KEY_PREFIX}livre`;

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
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
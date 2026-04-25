import { useState, useEffect, useCallback } from 'react';
import { listModels, setModel as svcSetModel, setTemperature as svcSetTemp, getTemperature, getModel, checkLMStudioStatus } from '../lib/ai/lmStudioService';

export function useAIModel() {
  const [status, setStatus] = useState('checking');
  const [modelos, setModelos] = useState([]);
  const [modeloAtual, setModeloAtual] = useState(getModel());
  const [temperatura, setTemperatura] = useState(getTemperature());
  const [loading, setLoading] = useState(false);

  const verificar = useCallback(async () => {
    setLoading(true);
    setStatus('checking');
    try {
      const res = await checkLMStudioStatus();
      if (res.status === 'online') {
        setStatus('online');
        const mods = res.models.length > 0
          ? res.models.map(m => m.name || m)
          : [getModel()];
        setModelos(mods);
        if (!mods.includes(getModel())) {
          setModelos(prev => [...prev, getModel()]);
        }
      } else {
        setStatus('offline');
        setModelos([getModel()]);
      }
    } catch {
      setStatus('offline');
      setModelos([getModel()]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    verificar();
  }, [verificar]);

  const trocarModelo = useCallback((novoModelo) => {
    svcSetModel(novoModelo);
    setModeloAtual(novoModelo);
    localStorage.setItem('nexomente_ai_model', novoModelo);
  }, []);

  const trocarTemperatura = useCallback((novaTemp) => {
    svcSetTemp(novaTemp);
    setTemperatura(novaTemp);
  }, []);

  return {
    status,
    modelos,
    modeloAtual,
    temperatura,
    loading,
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

  const adicionar = useCallback((role, texto) => {
    setMensagens(prev => {
      const updated = [...prev, { role, texto, ts: Date.now() }];
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
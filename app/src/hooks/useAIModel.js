import { useState, useLayoutEffect, useCallback } from "react";
import { useAIStore } from "../store/useAIStore";
import { secureStorage } from "../lib/storage/secureStorage";

export function useAIModel() {
  const store = useAIStore();

  useLayoutEffect(() => {
    store.verificarStatus();
  }, [store.provider]);

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
    trocarProvedor: store.setProvider,
    trocarModelo: store.setModeloAtual,
    trocarTemperatura: store.setTemperatura,
  };
}

const CHAT_KEY_PREFIX = "nexomente_ai_chat_";

export function useAIChat(notaId) {
  const [mensagens, setMensagens] = useState(() => {
    if (typeof window === "undefined") return [];
    const storageKey = notaId ? `${CHAT_KEY_PREFIX}${notaId}` : `${CHAT_KEY_PREFIX}livre`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      return [];
    }
    return [];
  });

  const [loading, setLoading] = useState(false);
  const storageKey = notaId ? `${CHAT_KEY_PREFIX}${notaId}` : `${CHAT_KEY_PREFIX}livre`;

  // Sincroniza com secureStorage se a notaId mudar
  useLayoutEffect(() => {
    (async () => {
      try {
        const decrypted = await secureStorage.getItem(storageKey);
        if (decrypted) {
          setMensagens(decrypted);
        } else {
          setMensagens([]);
        }
      } catch {
        setMensagens([]);
      }
    })();
  }, [storageKey]);

  const persistir = useCallback(
    async (msgs) => {
      const trimmed = msgs.slice(-40);
      try {
        await secureStorage.setItem(storageKey, trimmed);
      } catch (error) {
        console.warn("[AIChat] Falha ao persistir mensagens criptografadas, fallback para localStorage:", error);
        localStorage.setItem(storageKey, JSON.stringify(trimmed));
      }
      setMensagens(trimmed);
    },
    [storageKey]
  );

  const adicionar = useCallback(
    (role, texto, errorCode = null) => {
      setMensagens((prev) => {
        const updated = [...prev, { role, texto, errorCode, isError: !!errorCode, ts: Date.now() }];
        persistir(updated);
        return updated;
      });
    },
    [persistir]
  );

  const limpar = useCallback(async () => {
    try {
      await secureStorage.removeItem(storageKey);
    } catch {
      localStorage.removeItem(storageKey);
    }
    setMensagens([]);
  }, [storageKey]);

  return { mensagens, adicionar, limpar, loading, setLoading };
}


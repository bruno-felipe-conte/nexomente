import { useState, useEffect, useCallback } from 'react';
import sm2, { isParaRevisao, isDominado, SM2_DEFAULTS } from './sm2';

const FLASHCARDS_KEY = 'nexomente_flashcards';

export function useFlashcards() {
  const [cards, setCards] = useState(() => {
    const stored = localStorage.getItem(FLASHCARDS_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((lista) => {
    localStorage.setItem(FLASHCARDS_KEY, JSON.stringify(lista));
    setCards(lista);
  }, []);

  const create = useCallback((cardData) => {
    const novoCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      frente: cardData.frente,
      verso: cardData.verso,
      materia: cardData.materia || 'geral',
      tags: cardData.tags || [],
      ...SM2_DEFAULTS,
      created_at: new Date().toISOString(),
    };

    setCards(prev => {
      const updated = [...prev, novoCard];
      persist(updated);
      return updated;
    });
    return novoCard.id;
  }, [persist]);

  const update = useCallback((id, updates) => {
    setCards(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const remove = useCallback((id) => {
    setCards(prev => {
      const updated = prev.filter(c => c.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const revisar = useCallback((id, qualidade) => {
    setCards(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      
      const novosDados = sm2(prev[idx], qualidade);
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...novosDados };
      persist(updated);
      return updated;
    });
  }, [persist]);

  const getParaRevisao = useCallback(() => {
    return cards.filter(isParaRevisao);
  }, [cards]);

  const getDominados = useCallback(() => {
    return cards.filter(isDominado);
  }, [cards]);

  const getById = useCallback((id) => {
    return cards.find(c => c.id === id);
  }, [cards]);

  const stats = {
    total: cards.length,
    paraRevisar: getParaRevisao().length,
    dominados: getDominados().length,
  };

  return {
    cards,
    loading,
    create,
    update,
    remove,
    revisar,
    getParaRevisao,
    getDominados,
    getById,
    stats,
  };
}
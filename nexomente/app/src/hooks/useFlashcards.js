import { useState, useEffect } from 'react';
import sm2, { isParaRevisao, isDominado, SM2_DEFAULTS } from './sm2';

export function useFlashcards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      const all = await window.electronAPI.dbFlashcardsGetAll();
      setCards(all || []);
    } catch (e) {
      console.error('Erro ao carregar flashcards:', e);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const create = async (cardData) => {
    const novoCard = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      frente: cardData.frente,
      verso: cardData.verso,
      materia: cardData.materia || 'geral',
      tags: cardData.tags || [],
      ...SM2_DEFAULTS,
      created_at: new Date().toISOString(),
    };

    try {
      await window.electronAPI.dbFlashcardsCreate(novoCard);
      setCards(prev => [...prev, novoCard]);
      return novoCard.id;
    } catch (e) {
      console.error('Erro ao criar card:', e);
      return null;
    }
  };

  const update = async (id, updates) => {
    try {
      await window.electronAPI.dbFlashcardsUpdate(id, updates);
      setCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (e) {
      console.error('Erro ao atualizar card:', e);
    }
  };

  const remove = async (id) => {
    try {
      await window.electronAPI.dbFlashcardsDelete(id);
      setCards(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error('Erro ao deletar card:', e);
    }
  };

  const revisar = async (id, qualidade) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const novosDados = sm2(card, qualidade);
    await update(id, novosDados);
  };

  const getParaRevisao = () => {
    return cards.filter(isParaRevisao);
  };

  const getDominados = () => {
    return cards.filter(isDominado);
  };

  const getById = (id) => {
    return cards.find(c => c.id === id);
  };

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
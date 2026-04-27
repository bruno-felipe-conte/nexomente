import { useCallback } from 'react';
import { useDBStore } from '../store/useDBStore';

export function useFlashcards() {
  const { Flashcards, loading } = useDBStore();
  const cards = Flashcards?.getAll() || [];

  const create = useCallback((cardData) => {
    return Flashcards.create({
      frente: cardData.frente,
      verso: cardData.verso,
      materia_id: cardData.materia_id || null,
      nota_id: cardData.nota_id || null,
    });
  }, [Flashcards]);

  const update = useCallback((id, updates) => {
    return Flashcards.update(id, updates);
  }, [Flashcards]);

  const remove = useCallback((id) => {
    return Flashcards.delete(id);
  }, [Flashcards]);

  const revisar = useCallback((id, qualidade) => {
    return Flashcards.revisar(id, qualidade);
  }, [Flashcards]);

  const getParaRevisao = useCallback(() => {
    return Flashcards?.getParaRevisao() || [];
  }, [Flashcards]);

  const getDominados = useCallback(() => {
    return cards.filter(c => c.repeticoes >= 3 && c.ease_factor >= 2.5);
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
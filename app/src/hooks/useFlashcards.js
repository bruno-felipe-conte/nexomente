import { useCallback, useMemo } from 'react';
import { useDBStore } from '../store/useDBStore';
import { eventBus, DOMAIN_EVENTS } from '@core/events/eventBus';

const selectCards = (repo, v) => (v >= 0 ? repo?.getAll() || [] : []);

export function useFlashcards() {
  const Flashcards = useDBStore(state => state.Flashcards);
  const loading = useDBStore(state => state.loading);
  const version = useDBStore(state => state.version);
  const cards = useMemo(() => selectCards(Flashcards, version), [Flashcards, version]);

  const create = useCallback((cardData) => {
    return Flashcards.create({
      frente: cardData.frente,
      verso: cardData.verso,
      materia_id: cardData.materia_id || cardData.materia || 'geral',
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
    const res = Flashcards.revisar(id, qualidade);
    // Concede XP proporcional ao rating do Anki (Again: 2 XP, Hard: 5 XP, Good: 10 XP, Easy: 15 XP)
    const xpMap = { 1: 2, 2: 5, 3: 10, 4: 15 };
    const xpEarned = xpMap[qualidade] ?? 10;

    eventBus.emit(DOMAIN_EVENTS.FLASHCARD_REVIEWED, {
      cardId: id,
      rating: qualidade,
      state: res?.state || 'review',
      lapses: res?.lapses || 0,
      isLeech: (res?.lapses || 0) >= 4,
      xpEarned,
    });
    return res;
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

  const contadoresAnki = useMemo(() => {
    let novos = 0;
    let aprendendo = 0;
    let devidos = 0;
    const now = new Date();

    cards.forEach(c => {
      const isDue = !c.next_review || new Date(c.next_review) <= now;
      if (!isDue) return;

      const state = c.state || (c.repeticoes === 0 && (!c.intervalo || c.intervalo === 0) ? 'new' : 'review');
      if (state === 'new') novos++;
      else if (state === 'learning' || state === 'relearning') aprendendo++;
      else devidos++;
    });

    return { novos, aprendendo, devidos };
  }, [cards]);

  const stats = {
    total: cards.length,
    paraRevisar: getParaRevisao().length,
    dominados: getDominados().length,
    novos: contadoresAnki.novos,
    aprendendo: contadoresAnki.aprendendo,
    devidos: contadoresAnki.devidos,
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
    contadoresAnki,
    stats,
  };
}
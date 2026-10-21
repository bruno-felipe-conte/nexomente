/**
 * Módulo puro SM-2 / Anki SRS para o NexoMente.
 * Exporta calculateNextReview e re-exporta o motor de domínio ankiSrsEngine.
 */

export {
  default,
  default as sm2,
  SM2_DEFAULTS,
  ANKI_DEFAULTS,
  LEARNING_STEPS_MINUTES,
  GRADUATING_INTERVAL_DAYS,
  EASY_INTERVAL_DAYS,
  HARD_INTERVAL_MULTIPLIER,
  EASY_BONUS,
  isParaRevisao,
  isDominado,
  previewIntervalo,
  parseCloze,
} from '../features/flashcards/domain/ankiSrsEngine.js';

export function calculateNextReview(card, qualidade) {
  let ef = Number(card.ease_factor || 2.5);
  let rep = Number(card.repeticoes || 0);
  let interval = Number(card.intervalo || 0);
  let falhas = Number(card.lapses || 0);
  let cardState = card.state || (rep === 0 && interval === 0 ? 'new' : 'review');
  let stepIdx = Number(card.step_index || 0);

  const nextDate = new Date();

  if (qualidade === 1) { // AGAIN
    if (cardState === 'review') {
      falhas += 1;
      ef = Math.max(1.3, ef - 0.20);
    }
    cardState = cardState === 'review' ? 'relearning' : 'learning';
    stepIdx = 0;
    interval = 0;
    rep = 0;
    nextDate.setMinutes(nextDate.getMinutes() + 1);
  } else if (cardState === 'new' || cardState === 'learning' || cardState === 'relearning') {
    if (qualidade === 2) { // HARD
      nextDate.setMinutes(nextDate.getMinutes() + 6);
    } else if (qualidade === 3) { // GOOD
      if (stepIdx === 0) {
        stepIdx = 1;
        nextDate.setMinutes(nextDate.getMinutes() + 10);
      } else {
        cardState = 'review';
        interval = 1;
        rep += 1;
        nextDate.setDate(nextDate.getDate() + 1);
      }
    } else if (qualidade === 4) { // EASY
      cardState = 'review';
      interval = 4;
      rep += 1;
      nextDate.setDate(nextDate.getDate() + 4);
    }
  } else { // REVIEW
    if (qualidade === 2) {
      interval = Math.max(interval + 1, Math.round(interval * 1.2));
      ef = Math.max(1.3, ef - 0.15);
    } else if (qualidade === 3) {
      interval = Math.max(interval + 1, Math.round(interval * ef));
    } else if (qualidade === 4) {
      interval = Math.max(interval + 1, Math.round(interval * ef * 1.3));
      ef = Math.min(3.5, ef + 0.15);
    }
    rep += 1;
    nextDate.setDate(nextDate.getDate() + interval);
  }

  return {
    intervalo: interval,
    repeticoes: rep,
    ease_factor: Number(ef.toFixed(2)),
    lapses: falhas,
    state: cardState,
    step_index: stepIdx,
    next_review: nextDate.toISOString(),
  };
}

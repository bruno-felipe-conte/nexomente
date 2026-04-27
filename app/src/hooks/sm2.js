// SM-2 Spaced Repetition Algorithm
// Based on SuperMemo 2 algorithm by Piotr Wozniak

export const SM2_DEFAULTS = {
  ef: 2.5,        // Easiness Factor (min 1.3)
  intervalo: 0,    // Days until next review
  repetitions: 0,  // Number of successful reviews
};

export default function sm2(card, qualidade) {
  // qualidade: 1 (fail), 3 (hard), 5 (easy)
  const ef = card.ef ?? card.ease_factor ?? 2.5;
  const intervalo = card.intervalo ?? 0;
  const repetitions = card.repetitions ?? card.repeticoes ?? 0;

  if (qualidade < 3) {
    return {
      ...SM2_DEFAULTS,
      ef: Math.max(1.3, ef - 0.2),
    };
  }

  const newEf = ef + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02));
  const adjustedEf = Math.max(1.3, newEf);

  let newInterval;
  if (repetitions === 0) {
    newInterval = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(intervalo * adjustedEf);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    ef: adjustedEf,
    intervalo: newInterval,
    repetitions: repetitions + 1,
    next_review: nextDate.toISOString(),
  };
}

export function isParaRevisao(card) {
  if (!card.next_review) return true;
  return new Date(card.next_review) <= new Date();
}

export function isDominado(card) {
  const ef = card.ef ?? card.ease_factor ?? 2.5;
  const reps = card.repetitions ?? card.repeticoes ?? 0;
  return ef >= 2.5 && reps >= 3;
}
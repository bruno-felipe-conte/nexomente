/**
 * Anki Spaced Repetition System (SRS) Engine
 * Fiel ao comportamento do algoritmo do Anki (SuperMemo-2 modificado com Learning Steps):
 * - 4 Botões: Again (Errei - 1), Hard (Difícil - 2), Good (Bom - 3), Easy (Fácil - 4)
 * - Fases: Learning / Relearning / Review
 * - Tracking de Lapses (falhas) e Leech detection (sanguessugas)
 * - Suporte a Cloze Deletion (Omissão de Palavras {{c1::termo::dica}})
 */

export const SM2_DEFAULTS = {
  ef: 2.5,        // Easiness Factor (min 1.3)
  intervalo: 0,    // Days until next review
  repetitions: 0,  // Number of successful reviews
};

export const ANKI_DEFAULTS = {
  easeFactor: 2.5,     // 2500 no Anki (mínimo 1.30)
  intervalo: 0,        // Intervalo em dias (ou minutos fracionados em learning)
  repeticoes: 0,
  lapses: 0,           // Quantas vezes falhou após ser graduado
  state: 'new',        // 'new' | 'learning' | 'review' | 'relearning'
  stepIndex: 0,        // Passo atual nos learning steps [1m, 10m]
};

// Passos de aprendizado padrão do Anki (em minutos)
export const LEARNING_STEPS_MINUTES = [1, 10]; // 1 min -> 10 min -> Gradua para 1 dia
export const GRADUATING_INTERVAL_DAYS = 1;     // Intervalo ao graduar com Good
export const EASY_INTERVAL_DAYS = 4;           // Intervalo ao responder Easy em card novo
export const HARD_INTERVAL_MULTIPLIER = 1.2;
export const EASY_BONUS = 1.3;

/**
 * Motor Híbrido: SuperMemo-2 (SM-2 Clássico) e Anki SRS
 */
export default function sm2(card = {}, rating) {
  // Se a nota é 5 (escala clássica SuperMemo) ou o card não possui estado Anki explícito
  if (rating === 5 || (card.state === undefined && (rating === 1 || rating === 3 || rating === 4))) {
    const ef = Number(card.ef ?? card.ease_factor ?? 2.5);
    const intervalo = Number(card.intervalo ?? 0);
    const repetitions = Number(card.repetitions ?? card.repeticoes ?? 0);

    if (rating < 3) {
      const now = new Date();
      return {
        ...SM2_DEFAULTS,
        ef: Number(Math.max(1.3, ef - 0.2).toFixed(2)),
        ease_factor: Number(Math.max(1.3, ef - 0.2).toFixed(2)),
        intervalo: 0,
        repetitions: 0,
        repeticoes: 0,
        lapses: Number(card.lapses ?? 0) + 1,
        state: 'relearning',
        stepIndex: 0,
        next_review: now.toISOString(),
      };
    }

    const newEf = ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    const adjustedEf = Number(Math.max(1.3, newEf).toFixed(2));

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
      ease_factor: adjustedEf,
      intervalo: newInterval,
      repetitions: repetitions + 1,
      repeticoes: repetitions + 1,
      lapses: Number(card.lapses ?? 0),
      state: 'review',
      stepIndex: 0,
      next_review: nextDate.toISOString(),
    };
  }

  return ankiSRS(card, rating);
}

export function ankiSRS(card = {}, rating) {
  let ef = Number(card.ef ?? card.ease_factor ?? ANKI_DEFAULTS.easeFactor);
  let rep = Number(card.repetitions ?? card.repeticoes ?? 0);
  let interval = Number(card.intervalo ?? 0);
  let lapses = Number(card.lapses ?? 0);
  let state = card.state || (rep === 0 && interval === 0 ? 'new' : 'review');
  let stepIdx = Number(card.stepIndex ?? 0);

  const now = new Date();
  let nextReview = new Date(now);

  // 1. AGAIN (Errei - 1)
  if (rating === 1) {
    if (state === 'review') {
      lapses += 1;
      ef = Math.max(1.3, ef - 0.20); // Penalidade de Ease no Anki (-20%)
    }
    state = state === 'review' ? 'relearning' : 'learning';
    nextReview.setMinutes(nextReview.getMinutes() + LEARNING_STEPS_MINUTES[0]);

    return {
      ef: Number(ef.toFixed(2)),
      ease_factor: Number(ef.toFixed(2)),
      intervalo: 0,
      repetitions: 0,
      repeticoes: 0,
      lapses,
      state,
      stepIndex: 0,
      next_review: nextReview.toISOString(),
    };
  }

  // 2. CARDS EM APRENDIZADO (New ou Learning)
  if (state === 'new' || state === 'learning' || state === 'relearning') {
    if (rating === 2) { // HARD: Repete o passo atual em 6 minutos (média)
      const hardMinutes = 6;
      nextReview.setMinutes(nextReview.getMinutes() + hardMinutes);
      return {
        ef: Number(ef.toFixed(2)),
        ease_factor: Number(ef.toFixed(2)),
        intervalo: 0,
        repetitions: rep,
        repeticoes: rep,
        lapses,
        state: 'learning',
        stepIndex: stepIdx,
        next_review: nextReview.toISOString(),
      };
    }

    if (rating === 3) { // GOOD: Avança para o próximo passo ou gradua
      if (stepIdx < LEARNING_STEPS_MINUTES.length - 1) {
        stepIdx += 1;
        nextReview.setMinutes(nextReview.getMinutes() + LEARNING_STEPS_MINUTES[stepIdx]);
        return {
          ef: Number(ef.toFixed(2)),
          ease_factor: Number(ef.toFixed(2)),
          intervalo: 0,
          repetitions: rep + 1,
          repeticoes: rep + 1,
          lapses,
          state: 'learning',
          stepIndex: stepIdx,
          next_review: nextReview.toISOString(),
        };
      } else {
        // Graduou!
        state = 'review';
        interval = GRADUATING_INTERVAL_DAYS;
        nextReview.setDate(nextReview.getDate() + interval);
        return {
          ef: Number(ef.toFixed(2)),
          ease_factor: Number(ef.toFixed(2)),
          intervalo: interval,
          repetitions: rep + 1,
          repeticoes: rep + 1,
          lapses,
          state,
          stepIndex: 0,
          next_review: nextReview.toISOString(),
        };
      }
    }

    if (rating === 4) { // EASY: Pula direto para graduação com bônus (4 dias)
      state = 'review';
      interval = EASY_INTERVAL_DAYS;
      nextReview.setDate(nextReview.getDate() + interval);
      return {
        ef: Number(ef.toFixed(2)),
        ease_factor: Number(ef.toFixed(2)),
        intervalo: interval,
        repetitions: rep + 1,
        repeticoes: rep + 1,
        lapses,
        state,
        stepIndex: 0,
        next_review: nextReview.toISOString(),
      };
    }
  }

  // 3. CARDS EM REVISÃO (Review graduados)
  if (rating === 2) { // HARD
    interval = Math.max(interval + 1, Math.round(interval * HARD_INTERVAL_MULTIPLIER));
    ef = Math.max(1.3, ef - 0.15); // Anki reduz 15% no Hard
  } else if (rating === 3) { // GOOD
    interval = Math.max(interval + 1, Math.round(interval * ef));
    // Good mantém o Ease inalterado no Anki
  } else if (rating === 4) { // EASY
    interval = Math.max(interval + 1, Math.round(interval * ef * EASY_BONUS));
    ef = Math.min(3.5, ef + 0.15); // Anki aumenta 15% no Easy
  }

  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ef: Number(ef.toFixed(2)),
    ease_factor: Number(ef.toFixed(2)),
    intervalo: interval,
    repetitions: rep + 1,
    repeticoes: rep + 1,
    lapses,
    state: 'review',
    stepIndex: 0,
    next_review: nextReview.toISOString(),
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

/**
 * Preview do tempo que aparecerá nos 4 botões (estilo Anki: "1 min", "10 min", "1 dia", "4 dias")
 */
export function previewIntervalo(card, rating) {
  if (!card) return '-';
  const rep = Number(card.repetitions ?? card.repeticoes ?? 0);
  const interval = Number(card.intervalo ?? 0);
  const ef = Number(card.ef ?? card.ease_factor ?? 2.5);
  const isLearning = (card.state && card.state !== 'review') || (rep === 0 && interval === 0);

  if (rating === 1) return '< 1 min';

  if (isLearning) {
    if (rating === 2) return '6 min';
    if (rating === 3) {
      const stepIdx = Number(card.stepIndex ?? 0);
      return stepIdx === 0 ? '10 min' : '1 dia';
    }
    if (rating === 4) return '4 dias';
  }

  // Card em revisão
  if (rating === 2) {
    const nextInt = Math.max(interval + 1, Math.round(interval * HARD_INTERVAL_MULTIPLIER));
    return nextInt === 1 ? '1 dia' : `${nextInt} dias`;
  }
  if (rating === 3) {
    const nextInt = Math.max(interval + 1, Math.round(interval * ef));
    return nextInt === 1 ? '1 dia' : `${nextInt} dias`;
  }
  if (rating === 4) {
    const nextInt = Math.max(interval + 1, Math.round(interval * ef * EASY_BONUS));
    return `${nextInt} dias`;
  }

  return '1 dia';
}

/**
 * Parser de Cloze Deletion padrão Anki:
 * Ex: "O Brasil foi descoberto em {{c1::1500::ano}} por Cabral."
 * Frente: "O Brasil foi descoberto em [...] por Cabral."
 * Verso: "O Brasil foi descoberto em [1500] por Cabral."
 */
export function parseCloze(texto, mostrandoFrente = true) {
  if (!texto || typeof texto !== 'string') return '';
  const regex = /\{\{c\d+::([^:]+?)(?:::([^}]+?))?\}\}/g;

  if (mostrandoFrente) {
    return texto.replace(regex, (_, textoOculto, dica) => {
      const hintText = dica ? ` (${dica})` : '';
      return `<span class="anki-cloze-hidden font-bold text-accent-main bg-accent-main/15 px-2 py-0.5 rounded border border-accent-main/30">[...${hintText}]</span>`;
    });
  }

  return texto.replace(regex, (_, textoOculto) => {
    return `<span class="anki-cloze-revealed font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">${textoOculto}</span>`;
  });
}
/**
 * Anki Spaced Repetition System (SRS) Engine — Camada de Domínio Puro (Clean Architecture)
 * Fiel ao comportamento do algoritmo do Anki (SuperMemo-2 modificado com Learning Steps):
 * - 4 Botões: Again (Errei - 1), Hard (Difícil - 2), Good (Bom - 3), Easy (Fácil - 4)
 * - Fases: Learning / Relearning / Review
 * - Tracking de Lapses (falhas) e Leech detection (sanguessugas)
 * - Suporte a Cloze Deletion (Omissão de Palavras {{c1::termo::dica}})
 */

export const ANKI_DEFAULTS = {
  easeFactor: 2.5,     // 2500 no Anki (mínimo 1.30)
  intervalo: 0,        // Intervalo em dias (ou minutos fracionados em learning)
  repeticoes: 0,
  lapses: 0,           // Quantas vezes falhou após ser graduado
  state: 'new',        // 'new' | 'learning' | 'review' | 'relearning'
  stepIndex: 0,        // Passo atual nos learning steps [1m, 10m]
};

export const SM2_DEFAULTS = {
  ef: 2.5,
  intervalo: 0,
  repetitions: 0,
};


// Passos de aprendizado padrão do Anki (em minutos)
export const LEARNING_STEPS_MINUTES = [1, 10]; // 1 min -> 10 min -> Gradua para 1 dia
export const GRADUATING_INTERVAL_DAYS = 1;     // Intervalo ao graduar com Good
export const EASY_INTERVAL_DAYS = 4;           // Intervalo ao responder Easy em card novo
export const HARD_INTERVAL_MULTIPLIER = 1.2;
export const EASY_BONUS = 1.3;

/**
 * Calcula o próximo estado do card com base nas 4 notas do Anki:
 * @param {object} card 
 * @param {number} rating - 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 */
export default function ankiSRS(card, rating) {
  // Normalização de notas legadas do SM-2 (0-5) para o padrão Anki (1-4):
  // 5 (Perfeito SM-2) -> 4 (Easy Anki)
  // 4 (Bom SM-2) -> 3 (Good Anki)
  // 3 (Difícil SM-2) -> 2 (Hard Anki)
  // <= 2 (Errei SM-2) -> 1 (Again Anki)
  let normalizedRating = Number(rating);
  if (normalizedRating === 5) normalizedRating = 4;
  else if (normalizedRating === 0) normalizedRating = 1;

  let ef = Number(card.ef ?? card.ease_factor ?? ANKI_DEFAULTS.easeFactor);
  let rep = Number(card.repetitions ?? card.repeticoes ?? 0);
  let interval = Number(card.intervalo ?? 0);
  let lapses = Number(card.lapses ?? 0);
  let state = card.state || (rep === 0 && interval === 0 ? 'new' : 'review');
  let stepIdx = Number(card.stepIndex ?? 0);

  const now = new Date();
  let nextReview = new Date(now);

  // 1. AGAIN (Errei - 1)
  if (normalizedRating === 1) {
    if (state === 'review') {
      lapses += 1;
      ef = Math.max(1.3, ef - 0.20); // Penalidade de Ease no Anki (-20%)
    }
    state = state === 'review' ? 'relearning' : 'learning';
    stepIdx = 0;
    interval = 0;
    rep = 0;
    // Agenda para o primeiro passo (1 minuto)
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
    if (normalizedRating === 2) { // HARD: Repete o passo atual em 6 minutos (média)
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

    if (normalizedRating === 3) { // GOOD: Avança para o próximo passo ou gradua
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

    if (normalizedRating === 4) { // EASY: Pula direto para graduação com bônus (4 dias)
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
  if (normalizedRating === 2) { // HARD
    interval = Math.max(interval + 1, Math.round(interval * HARD_INTERVAL_MULTIPLIER));
    ef = Math.max(1.3, ef - 0.15); // Anki reduz 15% no Hard
  } else if (normalizedRating === 3) { // GOOD
    interval = Math.max(interval + 1, Math.round(interval * ef));
    // Good mantém o Ease inalterado no Anki
  } else if (normalizedRating === 4) { // EASY
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

export const sm2 = ankiSRS;

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

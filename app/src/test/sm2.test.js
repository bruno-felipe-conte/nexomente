/**
 * Testes do motor Anki SRS (Spaced Repetition System).
 * Cobre os 4 botões de resposta, learning steps, lapses, leech, previews e Cloze Deletion.
 */
import { describe, it, expect } from 'vitest';
import ankiSRS, {
  ANKI_DEFAULTS,
  GRADUATING_INTERVAL_DAYS,
  EASY_INTERVAL_DAYS,
  isParaRevisao,
  isDominado,
  previewIntervalo,
  parseCloze
} from '../../src/hooks/sm2';

describe('Anki SRS — Defaults', () => {
  it('ANKI_DEFAULTS possui os valores padrão do Anki', () => {
    expect(ANKI_DEFAULTS.easeFactor).toBe(2.5);
    expect(ANKI_DEFAULTS.intervalo).toBe(0);
    expect(ANKI_DEFAULTS.repeticoes).toBe(0);
    expect(ANKI_DEFAULTS.lapses).toBe(0);
    expect(ANKI_DEFAULTS.state).toBe('new');
    expect(ANKI_DEFAULTS.stepIndex).toBe(0);
  });
});

describe('Anki SRS — Cards Novos e Learning Steps', () => {
  it('Rating 1 (Again) -> reseta para step 0 e agenda 1 minuto', () => {
    const card = { state: 'new', intervalo: 0, repetitions: 0, ef: 2.5 };
    const res = ankiSRS(card, 1);
    expect(res.state).toBe('learning');
    expect(res.stepIndex).toBe(0);
    expect(res.intervalo).toBe(0);
    expect(new Date(res.next_review) > new Date()).toBe(true);
  });

  it('Rating 2 (Hard) em novo/learning -> repete step atual em 6 min', () => {
    const card = { state: 'learning', stepIndex: 0, intervalo: 0 };
    const res = ankiSRS(card, 2);
    expect(res.state).toBe('learning');
    expect(res.stepIndex).toBe(0);
  });

  it('Rating 3 (Good) no primeiro step -> avança para step 1 (10 min)', () => {
    const card = { state: 'learning', stepIndex: 0, intervalo: 0, repetitions: 0 };
    const res = ankiSRS(card, 3);
    expect(res.state).toBe('learning');
    expect(res.stepIndex).toBe(1);
    expect(res.intervalo).toBe(0);
  });

  it('Rating 3 (Good) no último step -> gradua para review com 1 dia', () => {
    const card = { state: 'learning', stepIndex: 1, intervalo: 0, repetitions: 1 };
    const res = ankiSRS(card, 3);
    expect(res.state).toBe('review');
    expect(res.intervalo).toBe(GRADUATING_INTERVAL_DAYS);
    expect(res.stepIndex).toBe(0);
  });

  it('Rating 4 (Easy) em card novo -> gradua diretamente com 4 dias', () => {
    const card = { state: 'new', intervalo: 0, repetitions: 0 };
    const res = ankiSRS(card, 4);
    expect(res.state).toBe('review');
    expect(res.intervalo).toBe(EASY_INTERVAL_DAYS);
  });
});

describe('Anki SRS — Cards em Review (Graduados)', () => {
  const reviewCard = { state: 'review', intervalo: 10, repetitions: 5, ef: 2.5, lapses: 0 };

  it('Rating 1 (Again) -> conta lapse, reduz ease (-20%) e entra em relearning', () => {
    const res = ankiSRS(reviewCard, 1);
    expect(res.state).toBe('relearning');
    expect(res.lapses).toBe(1);
    expect(res.intervalo).toBe(0);
    expect(res.ef).toBe(2.3); // 2.5 - 0.20
  });

  it('Rating 2 (Hard) -> multiplica intervalo por 1.2 e reduz ease (-15%)', () => {
    const res = ankiSRS(reviewCard, 2);
    expect(res.state).toBe('review');
    expect(res.intervalo).toBe(12); // Math.round(10 * 1.2)
    expect(res.ef).toBe(2.35); // 2.5 - 0.15
  });

  it('Rating 3 (Good) -> multiplica intervalo pelo EF e mantém ease', () => {
    const res = ankiSRS(reviewCard, 3);
    expect(res.state).toBe('review');
    expect(res.intervalo).toBe(25); // Math.round(10 * 2.5)
    expect(res.ef).toBe(2.5);
  });

  it('Rating 4 (Easy) -> multiplica por EF * 1.3 e aumenta ease (+15%)', () => {
    const res = ankiSRS(reviewCard, 4);
    expect(res.state).toBe('review');
    expect(res.intervalo).toBe(33); // Math.round(10 * 2.5 * 1.3) = 32.5 -> 33
    expect(res.ef).toBe(2.65); // 2.5 + 0.15
  });

  it('Ease factor não cai abaixo de 1.3', () => {
    const lowCard = { state: 'review', intervalo: 5, ef: 1.35, lapses: 3 };
    const res = ankiSRS(lowCard, 1);
    expect(res.ef).toBe(1.3);
  });
});

describe('previewIntervalo()', () => {
  it('retorna previews fiéis para card em aprendizado', () => {
    const card = { state: 'learning', stepIndex: 0, intervalo: 0 };
    expect(previewIntervalo(card, 1)).toBe('< 1 min');
    expect(previewIntervalo(card, 2)).toBe('6 min');
    expect(previewIntervalo(card, 3)).toBe('10 min');
    expect(previewIntervalo(card, 4)).toBe('4 dias');
  });

  it('retorna previews fiéis para card em revisão', () => {
    const card = { state: 'review', intervalo: 10, ef: 2.5 };
    expect(previewIntervalo(card, 1)).toBe('< 1 min');
    expect(previewIntervalo(card, 2)).toBe('12 dias');
    expect(previewIntervalo(card, 3)).toBe('25 dias');
    expect(previewIntervalo(card, 4)).toBe('33 dias');
  });
});

describe('parseCloze()', () => {
  it('frente: substitui marcação por colchetes e preserva dica', () => {
    const texto = 'A capital da França é {{c1::Paris::cidade}}.';
    const frente = parseCloze(texto, true);
    expect(frente).toContain('[... (cidade)]');
    expect(frente).not.toContain('Paris');
  });

  it('frente: substitui marcação sem dica por [...]', () => {
    const texto = 'A capital da França é {{c1::Paris}}.';
    const frente = parseCloze(texto, true);
    expect(frente).toContain('[...]');
    expect(frente).not.toContain('Paris');
  });

  it('verso: revela o termo oculto destacado', () => {
    const texto = 'A capital da França é {{c1::Paris::cidade}}.';
    const verso = parseCloze(texto, false);
    expect(verso).toContain('Paris');
    expect(verso).not.toContain('[...');
  });

  it('retorna texto original se não houver cloze', () => {
    const texto = 'Pergunta simples sem omissão.';
    expect(parseCloze(texto, true)).toBe(texto);
    expect(parseCloze(texto, false)).toBe(texto);
  });
});

describe('isParaRevisao() e isDominado()', () => {
  it('isParaRevisao identifica corretamente datas vencidas', () => {
    expect(isParaRevisao({})).toBe(true);
    expect(isParaRevisao({ next_review: new Date(Date.now() - 1000).toISOString() })).toBe(true);
    expect(isParaRevisao({ next_review: new Date(Date.now() + 86400000).toISOString() })).toBe(false);
  });

  it('isDominado verifica ef >= 2.5 e repeticoes >= 3', () => {
    expect(isDominado({ ef: 2.5, repeticoes: 3 })).toBe(true);
    expect(isDominado({ ef: 2.0, repeticoes: 5 })).toBe(false);
    expect(isDominado({ ef: 2.5, repeticoes: 2 })).toBe(false);
  });
});

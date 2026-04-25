/**
 * Testes do algoritmo SM-2 (Spaced Repetition).
 * sm2.js é puro (zero deps de browser) — cobertura alta é fácil.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import sm2, { isParaRevisao, isDominado, SM2_DEFAULTS } from '../../src/hooks/sm2';

describe('SM-2 — defaults', () => {
  it('SM2_DEFAULTS tem ef=2.5, intervalo=0, repetitions=0', () => {
    expect(SM2_DEFAULTS.ef).toBe(2.5);
    expect(SM2_DEFAULTS.intervalo).toBe(0);
    expect(SM2_DEFAULTS.repetitions).toBe(0);
  });
});

describe('SM-2 — qualidade < 3 (errou)', () => {
  const card = { ef: 2.5, intervalo: 10, repetitions: 5 };

  it('reseta intervalo e repetitions para 0', () => {
    const resultado = sm2(card, 1);
    expect(resultado.intervalo).toBe(0);
    expect(resultado.repetitions).toBe(0);
  });

  it('reduz ef em 0.2', () => {
    const resultado = sm2(card, 1);
    expect(resultado.ef).toBeCloseTo(2.3, 5);
  });

  it('ef não cai abaixo de 1.3', () => {
    const cardBaixo = { ef: 1.3, intervalo: 0, repetitions: 0 };
    const resultado = sm2(cardBaixo, 1);
    expect(resultado.ef).toBe(1.3);
  });
});

describe('SM-2 — qualidade >= 3 (acertou)', () => {
  it('primeiro acerto → intervalo = 1 dia', () => {
    const card = { ef: 2.5, intervalo: 0, repetitions: 0 };
    const resultado = sm2(card, 5);
    expect(resultado.intervalo).toBe(1);
    expect(resultado.repetitions).toBe(1);
  });

  it('segundo acerto → intervalo = 6 dias', () => {
    const card = { ef: 2.5, intervalo: 1, repetitions: 1 };
    const resultado = sm2(card, 5);
    expect(resultado.intervalo).toBe(6);
    expect(resultado.repetitions).toBe(2);
  });

  it('acertos consecutivos aumentam intervalo', () => {
    const card = { ef: 2.5, intervalo: 6, repetitions: 2 };
    const resultado = sm2(card, 5);
    expect(resultado.intervalo).toBeGreaterThan(6);
    expect(resultado.repetitions).toBe(3);
  });

  it('qualidade 3 (quase) ajusta ef corretamente', () => {
    const card = { ef: 2.5, intervalo: 0, repetitions: 0 };
    const resultado = sm2(card, 3);
    // ef = 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + (0.1 - 0.24) = 2.36
    expect(resultado.ef).toBeCloseTo(2.36, 2);
  });

  it('define next_review como data futura', () => {
    const card = { ef: 2.5, intervalo: 0, repetitions: 0 };
    const resultado = sm2(card, 5);
    expect(new Date(resultado.next_review)).toBeInstanceOf(Date);
    expect(new Date(resultado.next_review) > new Date()).toBe(true);
  });

  it('usa ease_factor como fallback de ef', () => {
    const card = { ease_factor: 2.0, intervalo: 0, repeticoes: 0 };
    const resultado = sm2(card, 5);
    expect(resultado.ef).toBeGreaterThan(0);
  });
});

describe('isParaRevisao()', () => {
  it('card sem next_review → precisa revisar', () => {
    expect(isParaRevisao({ })).toBe(true);
  });

  it('card com next_review no passado → precisa revisar', () => {
    const card = { next_review: new Date(Date.now() - 86400_000).toISOString() };
    expect(isParaRevisao(card)).toBe(true);
  });

  it('card com next_review no futuro → não precisa revisar', () => {
    const card = { next_review: new Date(Date.now() + 86400_000).toISOString() };
    expect(isParaRevisao(card)).toBe(false);
  });
});

describe('isDominado()', () => {
  it('ef >= 2.5 e repetitions >= 3 → dominado', () => {
    expect(isDominado({ ef: 2.5, repetitions: 3 })).toBe(true);
    expect(isDominado({ ef: 3.0, repetitions: 5 })).toBe(true);
  });

  it('ef baixo → não dominado', () => {
    expect(isDominado({ ef: 2.0, repetitions: 5 })).toBe(false);
  });

  it('poucas repetições → não dominado', () => {
    expect(isDominado({ ef: 2.5, repetitions: 2 })).toBe(false);
  });

  it('usa ease_factor e repeticoes como fallback', () => {
    expect(isDominado({ ease_factor: 2.5, repeticoes: 3 })).toBe(true);
  });
});

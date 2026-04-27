/**
 * Testes de Integração (Tarefa 4.7).
 *
 * Verifica o fluxo completo entre múltiplos módulos:
 *  1. sm2 + isParaRevisao + isDominado (fluxo SM-2 end-to-end)
 *  2. getErrorMessage + ERROR_MESSAGES (pipeline erro→mensagem→usuário)
 *  3. formatarData + formatarTemporizador (pipeline data→exibição)
 *  4. toastSucesso/toastErro + react-hot-toast (pipeline feedback→UI)
 *  5. getErrorMessage + toastErro (integração error handling)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import sm2, { isParaRevisao, isDominado, SM2_DEFAULTS } from '../../src/hooks/sm2';
import { getErrorMessage, ERROR_MESSAGES } from '../../src/constants/errorMessages';
import { formatarData, formatarTemporizador } from '../../src/utils/dateUtils';

// Mock react-hot-toast para testes do pipeline de feedback
vi.mock('react-hot-toast', () => {
  const mockToast = vi.fn();
  mockToast.success = vi.fn();
  mockToast.error = vi.fn();
  mockToast.promise = vi.fn();
  return { default: mockToast };
});
import { toastErro, toastSucesso } from '../../src/utils/toast';
import toast from 'react-hot-toast';

beforeEach(() => vi.clearAllMocks());

// ────────────────────────────────────────────────────────────────
// 1. Fluxo SM-2 completo: card novo → 3 acertos → dominado
// ────────────────────────────────────────────────────────────────
describe('[Integração] Fluxo SM-2 end-to-end', () => {
  it('card novo começa para revisão (sem next_review)', () => {
    const card = { ...SM2_DEFAULTS };
    expect(isParaRevisao(card)).toBe(true);
    expect(isDominado(card)).toBe(false);
  });

  it('após 1 acerto: intervalo=1, repetitions=1, ainda não dominado', () => {
    const card = { ...SM2_DEFAULTS };
    const resultado = sm2(card, 5);

    expect(resultado.intervalo).toBe(1);
    expect(resultado.repetitions).toBe(1);
    expect(isDominado(resultado)).toBe(false);
  });

  it('após 2 acertos: intervalo=6, repetitions=2', () => {
    const card1 = sm2({ ...SM2_DEFAULTS }, 5);
    const card2 = sm2(card1, 5);

    expect(card2.intervalo).toBe(6);
    expect(card2.repetitions).toBe(2);
    expect(isDominado(card2)).toBe(false);
  });

  it('após 3 acertos com ef>=2.5: considerado dominado', () => {
    const card0 = { ...SM2_DEFAULTS };
    const card1 = sm2(card0, 5);
    const card2 = sm2(card1, 5);
    const card3 = sm2(card2, 5);

    expect(card3.repetitions).toBe(3);
    expect(card3.ef).toBeGreaterThanOrEqual(2.5);
    expect(isDominado(card3)).toBe(true);
  });

  it('erro reseta o progresso mas mantém ef mínimo de 1.3', () => {
    const cardAdiantado = { ef: 2.5, intervalo: 30, repetitions: 10 };
    const cardReset = sm2(cardAdiantado, 1);

    expect(cardReset.repetitions).toBe(0);
    expect(cardReset.intervalo).toBe(0);
    expect(cardReset.ef).toBeGreaterThanOrEqual(1.3);
    // Após reset, volta para lista de revisão
    const paraRevisar = isParaRevisao(cardReset);
    expect(paraRevisar).toBe(true);
  });

  it('qualidade "quase" (3) não reseta mas efacility diminui', () => {
    const card = { ef: 2.5, intervalo: 6, repetitions: 2 };
    const res = sm2(card, 3);
    // Deve manter progresso mas ef cai
    expect(res.repetitions).toBe(3);
    expect(res.ef).toBeLessThan(2.5);
  });
});

// ────────────────────────────────────────────────────────────────
// 2. Pipeline erro → mensagem → feedback visual
// ────────────────────────────────────────────────────────────────
describe('[Integração] Pipeline de erro: getErrorMessage → toastErro', () => {
  it('erro de rede dispara toast com mensagem correta', () => {
    const erro = new Error('ECONNREFUSED 127.0.0.1:1234');
    const mensagem = getErrorMessage(erro);
    toastErro(mensagem);

    expect(mensagem).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    expect(toast.error).toHaveBeenCalledWith(
      ERROR_MESSAGES.NETWORK_ERROR,
      expect.objectContaining({ duration: 5000 })
    );
  });

  it('timeout dispara toast correto', () => {
    const mensagem = getErrorMessage(new Error('request aborted'));
    toastErro(mensagem);
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES.TIMEOUT, expect.any(Object));
  });

  it('erro desconhecido dispara UNKNOWN', () => {
    const mensagem = getErrorMessage(new Error('algo completamente inesperado'));
    toastErro(mensagem);
    expect(toast.error).toHaveBeenCalledWith(ERROR_MESSAGES.UNKNOWN, expect.any(Object));
  });

  it('null não quebra o pipeline', () => {
    expect(() => {
      const msg = getErrorMessage(null);
      toastErro(msg);
    }).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────
// 3. Pipeline de formatação de dados para exibição
// ────────────────────────────────────────────────────────────────
describe('[Integração] Pipeline data → formatação', () => {
  it('data ISO → formato BR → exibição consistente', () => {
    const isoDate = '2024-06-15';
    const formatada = formatarData(isoDate);
    expect(formatada).toBe('15/06/2024');
    // Verificamos que a string gerada tem o formato esperado pelo usuário BR
    expect(formatada).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('temporizador Pomodoro 25min → exibição correta', () => {
    const pomodoro = 25 * 60;
    const display = formatarTemporizador(pomodoro);
    expect(display).toBe('25:00');
    // Confirma que é sempre de 5 caracteres (MM:SS)
    expect(display.length).toBe(5);
    expect(display[2]).toBe(':');
  });

  it('sequência decrescente do timer é exibida corretamente', () => {
    const tempos = [90, 60, 30, 10, 5, 0];
    const displays = tempos.map(formatarTemporizador);
    expect(displays).toEqual(['01:30', '01:00', '00:30', '00:10', '00:05', '00:00']);
  });
});

// ────────────────────────────────────────────────────────────────
// 4. Consistência entre SUCCESS e ERRO no sistema de feedback
// ────────────────────────────────────────────────────────────────
describe('[Integração] Sistema de feedback toast', () => {
  it('sucesso e erro usam diferentes funções do toast', () => {
    toastSucesso('Salvo!');
    toastErro('Falhou!');

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Salvo!', {});
    expect(toast.error).toHaveBeenCalledWith('Falhou!', expect.any(Object));
  });

  it('múltiplos toasts acumulam corretamente', () => {
    ['Nota 1', 'Nota 2', 'Nota 3'].forEach(msg => toastSucesso(msg));
    expect(toast.success).toHaveBeenCalledTimes(3);
  });
});

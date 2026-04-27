/**
 * Testes das constantes e funções de errorMessages.
 * Módulo puro — sem dependências de React ou browser.
 */
import { describe, it, expect } from 'vitest';
import { ERROR_MESSAGES, getErrorMessage } from '../../src/constants/errorMessages';

describe('ERROR_MESSAGES — constantes', () => {
  it('contém todas as chaves obrigatórias', () => {
    const obrigatorias = ['NETWORK_ERROR', 'LLM_OFFLINE', 'TIMEOUT', 'SAVE_FAILED',
      'LOAD_FAILED', 'DELETE_FAILED', 'DB_INIT_FAILED', 'FILE_READ_FAILED',
      'FILE_WRITE_FAILED', 'FILE_TOO_LARGE', 'INVALID_FORMAT',
      'PERMISSION_DENIED', 'NOT_FOUND', 'UNKNOWN', 'UNEXPECTED'];
    obrigatorias.forEach(k => {
      expect(ERROR_MESSAGES).toHaveProperty(k);
      expect(typeof ERROR_MESSAGES[k]).toBe('string');
      expect(ERROR_MESSAGES[k].length).toBeGreaterThan(0);
    });
  });

  it('mensagens estão em português (sem termos EN óbvios)', () => {
    // Verifica que não contêm termos de erro em inglês crus
    Object.values(ERROR_MESSAGES).forEach(msg => {
      expect(msg).not.toMatch(/\berror\b|\bfailed\b|\bnotFound\b/i);
    });
  });
});

describe('getErrorMessage() — mapeamento de erros', () => {
  it('erro de rede → NETWORK_ERROR', () => {
    expect(getErrorMessage(new Error('network error'))).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    expect(getErrorMessage(new Error('fetch failed'))).toBe(ERROR_MESSAGES.NETWORK_ERROR);
    expect(getErrorMessage(new Error('ECONNREFUSED'))).toBe(ERROR_MESSAGES.NETWORK_ERROR);
  });

  it('timeout → TIMEOUT', () => {
    expect(getErrorMessage(new Error('timeout exceeded'))).toBe(ERROR_MESSAGES.TIMEOUT);
    expect(getErrorMessage(new Error('aborted'))).toBe(ERROR_MESSAGES.TIMEOUT);
  });

  it('permissão → PERMISSION_DENIED', () => {
    expect(getErrorMessage(new Error('permission denied'))).toBe(ERROR_MESSAGES.PERMISSION_DENIED);
    expect(getErrorMessage(new Error('403 forbidden'))).toBe(ERROR_MESSAGES.PERMISSION_DENIED);
  });

  it('not found → NOT_FOUND', () => {
    expect(getErrorMessage(new Error('not found'))).toBe(ERROR_MESSAGES.NOT_FOUND);
    expect(getErrorMessage(new Error('404'))).toBe(ERROR_MESSAGES.NOT_FOUND);
  });

  it('erro desconhecido → UNKNOWN', () => {
    expect(getErrorMessage(new Error('algo genérico inesperado'))).toBe(ERROR_MESSAGES.UNKNOWN);
    expect(getErrorMessage(new Error(''))).toBe(ERROR_MESSAGES.UNKNOWN);
  });

  it('aceita null e undefined sem explodir', () => {
    expect(() => getErrorMessage(null)).not.toThrow();
    expect(() => getErrorMessage(undefined)).not.toThrow();
    expect(getErrorMessage(null)).toBe(ERROR_MESSAGES.UNKNOWN);
    expect(getErrorMessage(undefined)).toBe(ERROR_MESSAGES.UNKNOWN);
  });

  it('aceita string de erro como fallback', () => {
    // Error sem .message — testa o optional chaining
    const errSemMsg = { message: undefined };
    expect(() => getErrorMessage(errSemMsg)).not.toThrow();
  });
});

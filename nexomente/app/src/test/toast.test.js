/**
 * Testes para toast.js — wrappers semânticos de react-hot-toast.
 * Usa vi.mock para isolar a lib de toast sem exibição real.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de react-hot-toast antes do import
vi.mock('react-hot-toast', () => {
  const mockToast = vi.fn();
  mockToast.success = vi.fn();
  mockToast.error = vi.fn();
  mockToast.promise = vi.fn();
  return { default: mockToast };
});

import { toastSucesso, toastErro, toastInfo, toastDesfazer, toastPromise } from '../../src/utils/toast';
import toast from 'react-hot-toast';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toastSucesso()', () => {
  it('chama toast.success com a mensagem', () => {
    toastSucesso('Nota salva!');
    expect(toast.success).toHaveBeenCalledWith('Nota salva!', {});
  });

  it('passa opções extras ao toast', () => {
    toastSucesso('Ótimo!', { duration: 3000 });
    expect(toast.success).toHaveBeenCalledWith('Ótimo!', { duration: 3000 });
  });
});

describe('toastErro()', () => {
  it('chama toast.error com a mensagem', () => {
    toastErro('Erro ao salvar');
    expect(toast.error).toHaveBeenCalledWith('Erro ao salvar', expect.objectContaining({ duration: 5000 }));
  });

  it('duração padrão é 5000ms', () => {
    toastErro('ops');
    const [, opts] = toast.error.mock.calls[0];
    expect(opts.duration).toBe(5000);
  });

  it('opções extras sobrescrevem duration', () => {
    toastErro('ops', { duration: 2000 });
    const [, opts] = toast.error.mock.calls[0];
    expect(opts.duration).toBe(2000);
  });
});

describe('toastInfo()', () => {
  it('chama toast() base com a mensagem', () => {
    toastInfo('Info aqui');
    expect(toast).toHaveBeenCalledWith('Info aqui', {});
  });
});

describe('toastDesfazer()', () => {
  it('chama toast com ícone de lixeira', () => {
    const cb = vi.fn();
    toastDesfazer('Nota excluída', cb);
    expect(toast).toHaveBeenCalledWith('Nota excluída', expect.objectContaining({ icon: '🗑️' }));
  });

  it('duração é 5000ms', () => {
    toastDesfazer('Excluído', vi.fn());
    const [, opts] = toast.mock.calls[0];
    expect(opts.duration).toBe(5000);
  });
});

describe('toastPromise()', () => {
  it('chama toast.promise com a promise e mensagens', () => {
    const p = Promise.resolve('ok');
    toastPromise(p, { loading: 'Aguarde...', success: 'Feito!', error: 'Falhou' });
    expect(toast.promise).toHaveBeenCalledWith(p, {
      loading: 'Aguarde...',
      success: 'Feito!',
      error: 'Falhou',
    });
  });

  it('usa defaults quando mensagens não são passadas', () => {
    const p = Promise.resolve();
    toastPromise(p, {});
    const [, msgs] = toast.promise.mock.calls[0];
    expect(msgs.loading).toBe('Processando...');
    expect(msgs.success).toBe('Concluído!');
    expect(msgs.error).toBe('Algo deu errado.');
  });
});

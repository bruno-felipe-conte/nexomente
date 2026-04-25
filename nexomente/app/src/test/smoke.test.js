/**
 * Smoke tests — fluxos principais do NexoMente (Tarefa 3.6)
 * Verifica que os utilitários e hooks centrais não quebram em condições normais.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotes } from '../../src/hooks/useNotes';
import { getErrorMessage, ERROR_MESSAGES } from '../../src/constants/errorMessages';
import { formatarData, calcularTempoDecorrido } from '../../src/utils/dateUtils';

// ─── SMOKE 1: Hook de notas — ciclo CRUD completo ──────────────────────────
describe('SMOKE — useNotes CRUD', () => {
  beforeEach(() => localStorage.clear());

  it('cria → atualiza → remove nota sem erros', () => {
    const { result } = renderHook(() => useNotes());
    let id;

    act(() => { id = result.current.create({ titulo: 'Smoke Test', tipo: 'nota' }); });
    expect(result.current.notas).toHaveLength(1);

    act(() => { result.current.update(id, { titulo: 'Atualizado' }); });
    expect(result.current.getById(id).titulo).toBe('Atualizado');

    act(() => { result.current.remove(id); });
    expect(result.current.notas).toHaveLength(0);
  });

  it('busca retorna apenas notas correspondentes', () => {
    const { result } = renderHook(() => useNotes());
    act(() => {
      result.current.create({ titulo: 'React Hooks' });
      result.current.create({ titulo: 'Física Quântica' });
      result.current.create({ titulo: 'React Router' });
    });
    const encontradas = result.current.search('React');
    expect(encontradas).toHaveLength(2);
    expect(encontradas.every(n => n.titulo.includes('React'))).toBe(true);
  });

  it('tags: adicionar e remover', () => {
    const { result } = renderHook(() => useNotes());
    let id;
    act(() => { id = result.current.create({ titulo: 'Com tags' }); });
    act(() => { result.current.addTag(id, 'react'); });
    expect(result.current.getById(id).tags).toContain('react');
    act(() => { result.current.removeTag(id, 'react'); });
    expect(result.current.getById(id).tags).not.toContain('react');
  });

  it('getById retorna null para ID inexistente', () => {
    const { result } = renderHook(() => useNotes());
    expect(result.current.getById('nao-existe')).toBeNull();
  });
});

// ─── SMOKE 2: Mensagens de erro humanizadas ─────────────────────────────────
describe('SMOKE — errorMessages', () => {
  it('getErrorMessage mapeia erros de rede', () => {
    const msg = getErrorMessage(new Error('network error'));
    expect(msg).toBe(ERROR_MESSAGES.NETWORK_ERROR);
  });

  it('getErrorMessage retorna UNKNOWN para erros genéricos', () => {
    const msg = getErrorMessage(new Error('algo aleatório'));
    expect(msg).toBe(ERROR_MESSAGES.UNKNOWN);
  });

  it('getErrorMessage aceita string vazia sem explodir', () => {
    expect(() => getErrorMessage(null)).not.toThrow();
    expect(() => getErrorMessage(undefined)).not.toThrow();
  });
});

// ─── SMOKE 3: Utilitários de data ──────────────────────────────────────────
describe('SMOKE — dateUtils', () => {
  it('formatarData retorna formato DD/MM/AAAA', () => {
    const resultado = formatarData(new Date(2024, 0, 15));
    expect(resultado).toBe('15/01/2024');
  });

  it('calcularTempoDecorrido retorna string legível', () => {
    const agora = new Date();
    const resultado = calcularTempoDecorrido(agora.toISOString());
    expect(typeof resultado).toBe('string');
    expect(resultado.length).toBeGreaterThan(0);
  });
});

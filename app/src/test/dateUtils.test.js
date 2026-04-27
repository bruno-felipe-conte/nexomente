/**
 * Testes de dateUtils.js — utilitários de data/hora.
 * Módulo puro (date-fns) — sem deps de React/Electron.
 */
import { describe, it, expect } from 'vitest';
import {
  formatarData,
  formatarDataHora,
  calcularTempoDecorrido,
  formatarTemporizador,
} from '../../src/utils/dateUtils';

describe('formatarData()', () => {
  it('formata Date object para DD/MM/AAAA', () => {
    expect(formatarData(new Date(2024, 0, 15))).toBe('15/01/2024');
    expect(formatarData(new Date(2024, 11, 31))).toBe('31/12/2024');
  });

  it('formata string ISO para DD/MM/AAAA', () => {
    expect(formatarData('2024-03-20')).toBe('20/03/2024');
  });

  it('lida com mês e dia de um dígito com zero à esquerda', () => {
    const resultado = formatarData(new Date(2024, 0, 5));
    expect(resultado).toBe('05/01/2024');
  });
});

describe('formatarDataHora()', () => {
  it('inclui horário no formato HH:mm', () => {
    const d = new Date(2024, 5, 10, 14, 30);
    const resultado = formatarDataHora(d);
    expect(resultado).toMatch(/10\/06\/2024 14:30/);
  });

  it('aceita string ISO com horário', () => {
    const resultado = formatarDataHora('2024-06-10T14:30:00');
    expect(resultado).toMatch(/10\/06\/2024/);
    expect(resultado).toMatch(/14:30/);
  });
});

describe('calcularTempoDecorrido()', () => {
  it('retorna string não-vazia', () => {
    const agora = new Date().toISOString();
    const resultado = calcularTempoDecorrido(agora);
    expect(typeof resultado).toBe('string');
    expect(resultado.length).toBeGreaterThan(0);
  });

  it('data antiga retorna texto relativo', () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const resultado = calcularTempoDecorrido(ontem);
    // date-fns ptBR retorna algo como "há 1 dia" ou "há cerca de 24 horas"
    expect(resultado).toMatch(/há|dia|hora/i);
  });
});

describe('formatarTemporizador()', () => {
  it('25 minutos = 25:00', () => {
    expect(formatarTemporizador(25 * 60)).toBe('25:00');
  });

  it('90 segundos = 01:30', () => {
    expect(formatarTemporizador(90)).toBe('01:30');
  });

  it('0 segundos = 00:00', () => {
    expect(formatarTemporizador(0)).toBe('00:00');
  });

  it('valores negativos tratados com abs()', () => {
    expect(formatarTemporizador(-60)).toBe('01:00');
  });

  it('segundos < 10 têm zero à esquerda', () => {
    expect(formatarTemporizador(5)).toBe('00:05');
  });

  it('horas grandes formatam corretamente', () => {
    expect(formatarTemporizador(3600)).toBe('60:00'); // 60 minutos
  });
});

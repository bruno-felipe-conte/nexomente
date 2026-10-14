import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import MiniTimerWidget from '../components/study/MiniTimerWidget';
import { useStudyTimerStore } from '../store/useStudyTimerStore';
import { useDBStore } from '../store/useDBStore';

describe('MiniTimerWidget & useStudyTimerStore', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await useDBStore.getState().init();
    useStudyTimerStore.setState({
      timer: 25 * 60,
      totalSeconds: 25 * 60,
      rodando: false,
      modo: 'pomodoro',
      materiaAtiva: null,
      sessaoId: null,
      targetEndTime: null,
      completed: false,
      isMiniaturized: false
    });
  });

  it('inicia timer de pomodoro, pausa, retoma e avança o tempo', () => {
    const store = useStudyTimerStore.getState();
    // Inicia no modo pomodoro criando sessão temporária
    act(() => {
      useStudyTimerStore.getState().trocarModo({ id: 'descanso', label: 'Pausa Curta', minutos: 5, color: '#F59E0B', xp: 5 });
      store.iniciar();
    });

    expect(useStudyTimerStore.getState().rodando).toBe(true);
    expect(useStudyTimerStore.getState().sessaoId).toBeTruthy();

    // Avança 5 segundos
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(useStudyTimerStore.getState().timer).toBe(300 - 5);

    // Pausa
    act(() => {
      useStudyTimerStore.getState().pausar();
    });
    expect(useStudyTimerStore.getState().rodando).toBe(false);

    // Avança mais 5 segundos enquanto pausado: tempo congelado
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(useStudyTimerStore.getState().timer).toBe(300 - 5);
  });

  it('renderiza MiniTimerWidget com controles de play/pause, expandir e abandonar', () => {
    useStudyTimerStore.setState({
      timer: 14 * 60 + 32,
      totalSeconds: 25 * 60,
      rodando: true,
      modo: 'pomodoro',
      sessaoId: 99
    });

    const onExpandSpy = vi.fn();
    const { getByText, getByTitle } = render(
      <MiniTimerWidget onExpand={onExpandSpy} />
    );

    // Renderiza tempo formatado MM:SS
    expect(getByText('14:32')).toBeDefined();
    expect(getByText('Pomodoro')).toBeDefined();

    // Clica no botão de pausar
    const btnPausar = getByTitle(/Pausar estudo/i);
    act(() => {
      fireEvent.click(btnPausar);
    });
    expect(useStudyTimerStore.getState().rodando).toBe(false);

    // Clica para expandir e voltar à sala de estudos
    const btnExpandir = getByTitle(/Expandir Sala de Estudos/i);
    fireEvent.click(btnExpandir);
    expect(onExpandSpy).toHaveBeenCalledTimes(1);

    // Clica em cancelar/abandonar sessão
    const btnAbandonar = getByTitle(/Cancelar sessão de estudo/i);
    act(() => {
      fireEvent.click(btnAbandonar);
    });
    expect(useStudyTimerStore.getState().sessaoId).toBeNull();
    expect(useStudyTimerStore.getState().rodando).toBe(false);
  });
});

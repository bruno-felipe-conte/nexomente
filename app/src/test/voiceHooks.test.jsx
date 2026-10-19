import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { useWhisper } from '../hooks/useWhisper';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';
import PoemasPage from '../pages/Poemas';

let capturedOnResult = null;
let capturedOnPartialResult = null;

// Mock do hook useVosk para teste determinístico de interface e fluxo partialresult vs result
vi.mock('../hooks/useVosk', () => ({
  useVosk: ({ onResult, onPartialResult }) => {
    capturedOnResult = onResult;
    capturedOnPartialResult = onPartialResult;
    return {
      isListening: true,
      isReady: true,
      audioLevel: 42,
      prosodyMetrics: {
        syllableRateHz: 3.2,
        estimatedWpm: 120,
        voicedRatio: 85,
        cadenciaScore: 95,
      },
      startListening: vi.fn(),
      stopListening: vi.fn(),
      nextVerse: vi.fn(),
      terminateAudio: vi.fn(),
    };
  },
}));

describe('Voz — Testes de Interface e Hooks de Áudio', () => {
  it('useWhisper mantém contrato de status e objeto de progresso de download', () => {
    const onResultMock = vi.fn();
    const { result } = renderHook(() =>
      useWhisper({ language: 'portuguese', _onResult: onResultMock })
    );

    expect(result.current.status).toBe('ready');
    expect(result.current.downloadProgress).toBeDefined();
    expect(typeof result.current.startRecording).toBe('function');
    expect(typeof result.current.stopRecording).toBe('function');
  });

  it('PoemaRecitacao colore palavras de verde em partialresult sem avançar ponteiro e vermelho em result incorreto', () => {
    const poemaMock = {
      id: 'p1',
      titulo: 'Canção do Exílio',
      corpo: 'Minha terra tem palmeiras onde canta o sabiá',
      autor: 'Gonçalves Dias',
    };

    const utils = render(
      <PoemaRecitacao
        poema={poemaMock}
        onClose={vi.fn()}
        onFinish={vi.fn()}
      />
    );

    expect(utils.getByText('Canção do Exílio')).toBeDefined();

    // Emite 2 partialresults consecutivos para a mesma frase ("minha", depois "minha terra")
    act(() => {
      capturedOnPartialResult?.('minha');
      capturedOnPartialResult?.('minha terra');
    });

    const spanMinha = utils.getByText(/^Minha$/i);
    const spanTerra = utils.getByText(/^terra$/i);
    expect(spanMinha.className).toContain('palavra--correta');
    expect(spanTerra.className).toContain('palavra--correta');

    // Agora fecha a frase no Vosk com a 3ª palavra errada ("minha terra xpto")
    act(() => {
      capturedOnResult?.('minha terra xpto');
    });

    const spanTem = utils.getByText(/^tem$/i);
    expect(spanTem.className).toContain('palavra--errada');
  });

  it('PoemasPage (Estúdio de Oratória) colore verde/vermelho, exibe RMS e reseta ao clicar em Reiniciar Verso', () => {
    const utils = render(<PoemasPage />);

    // Emite resultado com "não sou erro" para o verso "Não sou nada."
    act(() => {
      capturedOnPartialResult?.('nao sou');
    });

    expect(utils.getAllByText('100%').length).toBeGreaterThanOrEqual(2);

    act(() => {
      capturedOnResult?.('nao sou xpto');
    });

    expect(utils.getByText('Erro')).toBeDefined();

    // Clica em Reiniciar Verso e verifica que limpou os tokens fonéticos
    const btnReiniciar = utils.getByText(/Reiniciar Verso/i);
    act(() => {
      fireEvent.click(btnReiniciar);
    });

    expect(utils.queryByText('Erro')).toBeNull();
  });
});


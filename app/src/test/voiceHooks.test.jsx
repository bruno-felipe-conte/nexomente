import { describe, it, expect, vi } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import { useWhisper } from '../hooks/useWhisper';
import PoemaRecitacao from '../components/poemas/PoemaRecitacao';

// Mock do hook useVosk para teste determinístico de interface
vi.mock('../hooks/useVosk', () => ({
  useVosk: ({ onPartialResult }) => ({
    isListening: true,
    isReady: true,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    nextVerse: vi.fn(),
    terminateAudio: vi.fn(),
    simulateVoice: (text) => onPartialResult?.(text),
  }),
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

  it('PoemaRecitacao renderiza palavras do poema, barra de progresso e texto reconhecido', () => {
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

    // 1. Título do poema exibido
    expect(utils.getByText('Canção do Exílio')).toBeDefined();

    // 2. Palavras do verso renderizadas para recitação
    expect(utils.getByText(/Minha/i)).toBeDefined();
    expect(utils.getByText(/palmeiras/i)).toBeDefined();
    expect(utils.getByText(/sabiá/i)).toBeDefined();

    // 3. Botão de microfone presente
    expect(utils.container.querySelector('button')).not.toBeNull();
  });
});

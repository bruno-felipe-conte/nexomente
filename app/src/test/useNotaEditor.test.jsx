import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNotaEditor } from '../hooks/useNotaEditor';

describe('useNotaEditor — Preservação de Digitação e Cursor durante Autosave', () => {
  it('não sobrescreve o conteúdo nem reseta a posição ao re-renderizar com autosave da mesma nota', () => {
    const updateMock = vi.fn();
    const initialNota = {
      id: 'nota_123',
      titulo: 'Minha Nota',
      conteudo: '<p>Texto inicial</p>',
    };

    const { result, rerender } = renderHook(
      ({ nota, editando }) =>
        useNotaEditor({
          notaSelecionada: nota,
          editando,
          update: updateMock,
        }),
      {
        initialProps: { nota: initialNota, editando: true },
      }
    );

    expect(result.current.editor).not.toBeNull();
    expect(result.current.editor.getText()).toContain('Texto inicial');

    // 1. Usuário digita conteúdo no editor
    act(() => {
      result.current.editor.commands.insertContent(' e continuação digitada');
    });

    const textoComDigitacao = result.current.editor.getText();
    expect(textoComDigitacao).toBe('Texto inicial e continuação digitada');
    const posAntesAutosave = result.current.editor.state.selection.from;

    // 2. Autosave roda: o componente pai re-renderiza com novo objeto da mesma nota
    // (mesmo id, mesmo se o conteudo salvo em disco ainda for o antigo ou atualizado)
    rerender({
      nota: {
        id: 'nota_123',
        titulo: 'Minha Nota',
        conteudo: '<p>Texto inicial</p>', // versão anterior ainda no backend
        atualizado_em: new Date().toISOString(),
      },
      editando: true,
    });

    // 3. O editor NÃO pode ter sido resetado para '<p>Texto inicial</p>'
    expect(result.current.editor.getText()).toBe('Texto inicial e continuação digitada');
    expect(result.current.editor.state.selection.from).toBe(posAntesAutosave);

    // 4. Usuário continua digitando imediatamente
    act(() => {
      result.current.editor.commands.insertContent(' mais um trecho');
    });

    expect(result.current.editor.getText()).toBe(
      'Texto inicial e continuação digitada mais um trecho'
    );

    // 5. Troca para outra nota (id diferente): o editor DEVE carregar o novo conteúdo
    rerender({
      nota: {
        id: 'nota_999',
        titulo: 'Outra Nota',
        conteudo: '<p>Conteúdo da nota dois</p>',
      },
      editando: true,
    });

    expect(result.current.editor.getText()).toBe('Conteúdo da nota dois');
  });

  it('reflete atualização externa da mesma nota (sync ou IA) quando não em foco ou com flag isExternalUpdate', () => {
    const updateMock = vi.fn();
    const initialNota = {
      id: 'nota_ext_1',
      titulo: 'Nota Sync',
      conteudo: '<p>Versão 1</p>',
    };

    const { result, rerender } = renderHook(
      ({ nota, editando }) =>
        useNotaEditor({
          notaSelecionada: nota,
          editando,
          update: updateMock,
        }),
      {
        initialProps: { nota: initialNota, editando: true },
      }
    );

    expect(result.current.editor.getText()).toBe('Versão 1');

    // Atualização externa recebida (ex: sincronização remota ou IA)
    rerender({
      nota: {
        id: 'nota_ext_1',
        titulo: 'Nota Sync',
        conteudo: '<p>Versão 2 gerada pela IA</p>',
        isExternalUpdate: true,
      },
      editando: true,
    });

    // O editor reflete a nova versão externa com sucesso
    expect(result.current.editor.getText()).toBe('Versão 2 gerada pela IA');
  });

  it('autosave com debounce: salva uma única vez após pausa na digitação e mantém o cursor', () => {
    vi.useFakeTimers();
    const updateMock = vi.fn();
    const nota = { id: 'nota_auto', titulo: 'Auto', conteudo: '<p>Base</p>' };

    const { result } = renderHook(() =>
      useNotaEditor({ notaSelecionada: nota, editando: true, update: updateMock })
    );

    act(() => { result.current.editor.commands.insertContent(' a'); });
    act(() => { vi.advanceTimersByTime(400); });
    act(() => { result.current.editor.commands.insertContent('b'); });
    expect(updateMock).not.toHaveBeenCalled();
    expect(result.current.saveStatus).toBe('saving');

    const pos = result.current.editor.state.selection.from;
    act(() => { vi.advanceTimersByTime(1100); });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][1].conteudo).toContain('Base ab');
    expect(result.current.saveStatus).toBe('saved');
    expect(result.current.editor.state.selection.from).toBe(pos);
    vi.useRealTimers();
  });
});

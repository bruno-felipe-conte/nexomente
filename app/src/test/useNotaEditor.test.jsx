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
});

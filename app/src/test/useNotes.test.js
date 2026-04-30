import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock useDBStore with in-memory Zustand store — SQL.js is unavailable in jsdom
vi.mock('../../src/store/useDBStore', async () => {
  const { create } = await import('zustand');
  let _notas = [];
  let _pastas = [];

  const useDBStore = create((set) => ({
    loading: false,
    version: 0,
    Notas: {
      getAll: () => [..._notas],
      getById: (id) => _notas.find(n => n.id === id) ?? null,
      create: (data) => {
        const id = `nota_${Date.now()}_${_notas.length}`;
        _notas.push({ id, tags: [], ...data, status: 'ativo' });
        set(s => ({ version: s.version + 1 }));
        return id;
      },
      update: (id, updates) => {
        const idx = _notas.findIndex(n => n.id === id);
        if (idx >= 0) _notas[idx] = { ..._notas[idx], ...updates };
        set(s => ({ version: s.version + 1 }));
      },
      delete: (id) => {
        _notas = _notas.filter(n => n.id !== id);
        set(s => ({ version: s.version + 1 }));
      },
      search: (query) => {
        if (!query) return [..._notas];
        const q = query.toLowerCase();
        return _notas.filter(n => (n.titulo || '').toLowerCase().includes(q));
      },
    },
    Pastas: {
      getAll: () => [..._pastas],
      create: (data) => {
        const id = `pasta_${Date.now()}_${_pastas.length}`;
        _pastas.push({ id, ...data });
        set(s => ({ version: s.version + 1 }));
        return id;
      },
    },
  }));

  useDBStore._reset = () => {
    _notas = [];
    _pastas = [];
    useDBStore.setState({ version: 0 });
  };

  return { useDBStore, initDB: async () => {}, saveDB: () => {}, getDB: () => null };
});

import { useNotes, usePastas } from '../../src/hooks/useNotes';
import { useDBStore } from '../../src/store/useDBStore';

describe('useNotes', () => {
  beforeEach(() => {
    useDBStore._reset();
    localStorage.clear();
  });

  it('inicia com array vazio', () => {
    const { result } = renderHook(() => useNotes());
    expect(result.current.notas).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('cria nota com dados default', () => {
    const { result } = renderHook(() => useNotes());
    act(() => {
      result.current.create({ titulo: 'Teste', tipo: 'nota' });
    });
    expect(result.current.notas.length).toBe(1);
    expect(result.current.notas[0].titulo).toBe('Teste');
    expect(result.current.notas[0].tipo).toBe('nota');
  });

  it('atualiza nota existente', () => {
    const { result } = renderHook(() => useNotes());
    let id;
    act(() => {
      id = result.current.create({ titulo: 'Original' });
    });
    act(() => {
      result.current.update(id, { titulo: 'Atualizado' });
    });
    expect(result.current.notas[0].titulo).toBe('Atualizado');
  });

  it('remove nota', () => {
    const { result } = renderHook(() => useNotes());
    let id;
    act(() => {
      id = result.current.create({ titulo: 'Para remover' });
    });
    expect(result.current.notas.length).toBe(1);
    act(() => {
      result.current.remove(id);
    });
    expect(result.current.notas.length).toBe(0);
  });

  it('adiciona e remove tags', () => {
    const { result } = renderHook(() => useNotes());
    let id;
    act(() => {
      id = result.current.create({ titulo: 'Com tags' });
    });
    act(() => {
      result.current.addTag(id, 'estudo');
    });
    expect(result.current.notas[0].tags).toContain('estudo');
    act(() => {
      result.current.removeTag(id, 'estudo');
    });
    expect(result.current.notas[0].tags).not.toContain('estudo');
  });

  it('busca por título', () => {
    const { result } = renderHook(() => useNotes());
    act(() => {
      result.current.create({ titulo: 'Livro sobre hábitos' });
      result.current.create({ titulo: 'Nota aleatória' });
    });
    const encontrados = result.current.search('hábitos');
    expect(encontrados.length).toBe(1);
    expect(encontrados[0].titulo).toBe('Livro sobre hábitos');
  });

  it('getById retorna nota ou null', () => {
    const { result } = renderHook(() => useNotes());
    let id;
    act(() => {
      id = result.current.create({ titulo: 'Encontrável' });
    });
    const encontrada = result.current.getById(id);
    expect(encontrada.titulo).toBe('Encontrável');
    const inexistente = result.current.getById('id-fake');
    expect(inexistente).toBeNull();
  });
});

describe('usePastas', () => {
  beforeEach(() => {
    useDBStore._reset();
    localStorage.clear();
  });

  it('cria pasta', () => {
    const { result } = renderHook(() => usePastas());
    act(() => {
      result.current.create({ nome: 'Projetos', tipo: 'projetos' });
    });
    expect(result.current.pastas.length).toBe(1);
    expect(result.current.pastas[0].nome).toBe('Projetos');
  });
});
